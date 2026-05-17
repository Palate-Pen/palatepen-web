import { createSupabaseServerClient } from '@/lib/supabase/server';

export type HaccpStatus =
  | 'draft'
  | 'in_progress'
  | 'review'
  | 'signed'
  | 'active'
  | 'archived';

export const HACCP_STATUS_LABEL: Record<HaccpStatus, string> = {
  draft: 'Draft',
  in_progress: 'In progress',
  review: 'Review',
  signed: 'Signed',
  active: 'Active',
  archived: 'Archived',
};

export const HACCP_STATUS_TONE: Record<HaccpStatus, string> = {
  draft: 'bg-paper-warm text-muted border-rule',
  in_progress: 'bg-attention/10 text-attention border-attention/40',
  review: 'bg-gold-bg text-gold-dark border-gold/40',
  signed: 'bg-healthy/10 text-healthy border-healthy/40',
  active: 'bg-healthy/10 text-healthy border-healthy/40',
  archived: 'bg-rule text-muted-soft border-rule',
};

// ---------------------------------------------------------------------
// Step body shapes
// ---------------------------------------------------------------------
export type HaccpStep1 = {
  trading_name: string;
  fsa_registration: string;
  kitchen_type: string;
  team_size: number | null;
  services: string[];
  notes_md: string;
};

export type HaccpHazardKind = 'biological' | 'chemical' | 'physical' | 'allergen';

export type HaccpHazard = {
  id: string;
  kind: HaccpHazardKind;
  description: string;
  source: string;
};

export type HaccpFlowStep = {
  id: string;
  name: string;
  description: string;
};

export type HaccpStep2 = {
  flow_steps: HaccpFlowStep[];
  hazards: HaccpHazard[];
};

export type HaccpCcp = {
  id: string;
  name: string;
  hazard_ref: string; // id of the hazard from step_2
  critical_limit: string;
  justification: string;
  recipe_ids: string[];
};

export type HaccpStep3 = {
  ccps: HaccpCcp[];
};

export type HaccpStep4 = {
  critical_limits: Array<{
    ccp_id: string;
    parameter: string;
    min_value: string;
    max_value: string;
    unit: string;
    reference: string;
  }>;
};

export type HaccpStep5 = {
  monitoring: Array<{
    ccp_id: string;
    what: string;
    who: string;
    how: string;
    frequency: string;
    record_where: string;
  }>;
};

export type HaccpStep6 = {
  corrective_actions: Array<{
    ccp_id: string;
    action_md: string;
    who_decides: string;
  }>;
};

export type HaccpStep7 = {
  verification: {
    schedule: string;
    who: string;
    last_review: string | null;
    next_review: string | null;
  };
};

export type HaccpBody = {
  step_1?: Partial<HaccpStep1>;
  step_2?: Partial<HaccpStep2>;
  step_3?: Partial<HaccpStep3>;
  step_4?: Partial<HaccpStep4>;
  step_5?: Partial<HaccpStep5>;
  step_6?: Partial<HaccpStep6>;
  step_7?: Partial<HaccpStep7>;
};

export type HaccpPlan = {
  id: string;
  site_id: string;
  status: HaccpStatus;
  body: HaccpBody;
  current_step: number;
  signed_off_at: string | null;
  signed_off_by: string | null;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------

/** Returns the active (non-archived) plan for the site, or null. */
export async function getHaccpPlan(siteId: string): Promise<HaccpPlan | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('safety_haccp_plans')
    .select(
      'id, site_id, status, body, current_step, signed_off_at, signed_off_by, created_at, updated_at',
    )
    .eq('site_id', siteId)
    .neq('status', 'archived')
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id as string,
    site_id: data.site_id as string,
    status: data.status as HaccpStatus,
    body: (data.body as HaccpBody) ?? {},
    current_step: (data.current_step as number) ?? 1,
    signed_off_at: (data.signed_off_at as string | null) ?? null,
    signed_off_by: (data.signed_off_by as string | null) ?? null,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  };
}

// ---------------------------------------------------------------------
// Auto-population helpers
// ---------------------------------------------------------------------

export type HaccpPrefill = {
  trading_name: string;
  team_size: number;
  kitchen_type_hint: string;
  services_hint: string[];
  recipe_count: number;
  has_bar: boolean;
  allergens: string[];
  protein_categories: string[];
};

/**
 * Pull a best-effort pre-fill bundle for Step 1 + 2 from existing
 * Palatable data. Trading name from sites.name, team size from
 * memberships count, kitchen type / services inferred from recipe
 * categories.
 */
export async function getHaccpPrefill(siteId: string): Promise<HaccpPrefill> {
  const supabase = await createSupabaseServerClient();

  const [siteResp, membershipsResp, recipesResp] = await Promise.all([
    supabase.from('sites').select('name, kind').eq('id', siteId).maybeSingle(),
    supabase
      .from('memberships')
      .select('user_id', { count: 'exact', head: true })
      .eq('site_id', siteId),
    supabase
      .from('recipes')
      .select('id, dish_type, category, recipe_ingredients(allergens, ingredients:ingredient_id(category))')
      .eq('site_id', siteId)
      .is('archived_at', null)
      .limit(200),
  ]);

  const siteName = (siteResp.data?.name as string | null) ?? '';
  const siteKind = (siteResp.data?.kind as string | null) ?? '';
  const teamSize = membershipsResp.count ?? 1;

  type RecipeRow = {
    id: string;
    dish_type: string | null;
    category: string | null;
    recipe_ingredients: Array<{
      allergens: string[] | null;
      ingredients: { category: string | null } | null;
    }> | null;
  };
  const recipes = (recipesResp.data ?? []) as unknown as RecipeRow[];

  const allergens = new Set<string>();
  const proteinCats = new Set<string>();
  let hasBar = siteKind === 'bar';
  for (const r of recipes) {
    if (r.dish_type === 'bar') hasBar = true;
    for (const ri of r.recipe_ingredients ?? []) {
      for (const a of ri.allergens ?? []) allergens.add(a);
      const cat = ri.ingredients?.category?.toLowerCase() ?? '';
      if (
        cat.includes('meat') ||
        cat.includes('fish') ||
        cat.includes('poultry') ||
        cat.includes('dairy') ||
        cat.includes('shellfish') ||
        cat.includes('seafood')
      ) {
        proteinCats.add(cat);
      }
    }
  }

  // Naive services inference: most kitchens serve lunch + dinner.
  // Refined later from POS / menu_plans launch windows.
  const services = ['lunch', 'dinner'];

  return {
    trading_name: siteName,
    team_size: teamSize,
    kitchen_type_hint: hasBar ? 'restaurant_with_bar' : 'restaurant',
    services_hint: services,
    recipe_count: recipes.length,
    has_bar: hasBar,
    allergens: Array.from(allergens).sort(),
    protein_categories: Array.from(proteinCats).sort(),
  };
}

// ---------------------------------------------------------------------
// Step list (used by sidebar + page)
// ---------------------------------------------------------------------

export const HACCP_STEPS: Array<{
  num: number;
  name: string;
  meta: string;
}> = [
  { num: 1, name: 'Business profile', meta: '5 min · pre-filled' },
  { num: 2, name: 'Menu & hazard analysis', meta: 'Auto-populated from menu · 10 min' },
  { num: 3, name: 'Critical Control Points', meta: 'Per high-risk dish · 8 min' },
  { num: 4, name: 'Critical limits', meta: 'FSA defaults pre-filled · 4 min' },
  { num: 5, name: 'Monitoring procedures', meta: 'Maps to Safety tab · 5 min' },
  { num: 6, name: 'Corrective actions', meta: 'From the library · 5 min' },
  { num: 7, name: 'Verification & review', meta: 'Schedule + sign-offs · 3 min' },
  { num: 8, name: 'Document generation', meta: 'Auto-formatted PDF · 2 min' },
  { num: 9, name: 'Annual review', meta: 'Reminder for next year · 3 min' },
];

/** Estimate plan completeness as a 0-100 percentage based on which steps
 *  have any user content in body. */
export function planCompletePct(plan: HaccpPlan | null): number {
  if (!plan) return 0;
  const stepKeys: Array<keyof HaccpBody> = [
    'step_1',
    'step_2',
    'step_3',
    'step_4',
    'step_5',
    'step_6',
    'step_7',
  ];
  let done = 0;
  for (const k of stepKeys) {
    const v = plan.body[k];
    if (v && Object.keys(v as object).length > 0) done += 1;
  }
  return Math.round((done / stepKeys.length) * 100);
}
