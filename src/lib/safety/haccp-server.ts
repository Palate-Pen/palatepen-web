import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  HaccpBody,
  HaccpPlan,
  HaccpPrefill,
  HaccpStatus,
} from './haccp';

/**
 * Server-only HACCP reads + auto-population.
 *
 * Lives in its own file so the shared types + constants in haccp.ts
 * (used by client components) don't drag the next/headers cookie
 * dependency through the client bundle.
 */

function bandFromTeamSize(n: number): HaccpPrefill['team_size_band'] {
  if (n <= 3) return '1-3';
  if (n <= 10) return '4-10';
  if (n <= 25) return '11-25';
  return '26+';
}

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

/**
 * Pull a best-effort pre-fill bundle for Step 1 + 2 from existing
 * Palatable data. Trading name from sites.name, team size from
 * memberships count, kitchen type / services inferred from recipe
 * categories, Person Responsible from safety_training (highest cert).
 */
export async function getHaccpPrefill(siteId: string): Promise<HaccpPrefill> {
  const supabase = await createSupabaseServerClient();

  const [siteResp, membershipsResp, recipesResp, trainingResp] = await Promise.all([
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
    supabase
      .from('safety_training')
      .select('staff_name, kind, certificate_name, expires_on')
      .eq('site_id', siteId)
      .is('archived_at', null),
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

  const services: string[] = ['a_la_carte'];
  if (hasBar) services.push('bar_cocktails');

  type TR = { staff_name: string; kind: string; certificate_name: string | null; expires_on: string | null };
  const trainings = (trainingResp.data ?? []) as unknown as TR[];
  const certPriority = ['haccp', 'food_hygiene_l3', 'food_hygiene_l2', 'food_hygiene_l1'];
  const valid = trainings.filter((t) => {
    if (!t.expires_on) return true;
    return new Date(t.expires_on).getTime() >= Date.now();
  });
  let personResponsible = '';
  for (const kind of certPriority) {
    const hit = valid.find((t) => t.kind === kind);
    if (hit) {
      const certLabel = hit.certificate_name ?? kind.replace(/_/g, ' ');
      const expiry = hit.expires_on
        ? ` (valid to ${new Date(hit.expires_on).toLocaleDateString('en-GB', {
            month: 'short',
            year: 'numeric',
          })})`
        : '';
      personResponsible = `${hit.staff_name} · ${certLabel}${expiry}`;
      break;
    }
  }

  return {
    trading_name: siteName,
    team_size: teamSize,
    team_size_band: bandFromTeamSize(teamSize),
    kitchen_type_hint: hasBar ? 'gastropub' : 'restaurant',
    services_hint: services,
    recipe_count: recipes.length,
    has_bar: hasBar,
    allergens: Array.from(allergens).sort(),
    protein_categories: Array.from(proteinCats).sort(),
    person_responsible: personResponsible,
  };
}
