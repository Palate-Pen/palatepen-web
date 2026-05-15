import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getRecipes, type Recipe } from '@/lib/recipes';
import { BAR_DISH_TYPES, FOOD_DISH_TYPES } from '@/lib/bar';
import { gpToneFor, DEFAULT_GP_TARGET, type GpTone } from '@/lib/margins';

export type MenuPlanSurface = 'kitchen' | 'bar';
export type MenuPlanStatus = 'draft' | 'finalised' | 'archived';
export type MenuPlanAction = 'add' | 'keep' | 'remove' | 'revise';

/**
 * Menu engineering quadrant — derived from popularity (1-5) and GP%
 * vs the site's GP target. Stars sit top-right (high pop + high GP),
 * Plowhorses bottom-right (high pop + low GP), Puzzles top-left
 * (low pop + high GP), Dogs bottom-left (low pop + low GP). Items
 * without enough data sit in the "unrated" bucket and don't get a
 * quadrant.
 */
export type Quadrant = 'star' | 'plowhorse' | 'puzzle' | 'dog' | 'unrated';

export type MenuPlanItem = {
  id: string;
  recipe_id: string | null;
  recipe: Recipe | null;
  placeholder_name: string | null;
  action: MenuPlanAction;
  popularity_rating: number | null;
  notes: string | null;
  position: number;
  /** Effective display name — recipe.name when linked, placeholder_name
   *  otherwise. Never null at the type level (callers can render). */
  display_name: string;
  gp_pct: number | null;
  gp_tone: GpTone;
  quadrant: Quadrant;
};

export type MenuPlan = {
  id: string;
  site_id: string;
  surface: MenuPlanSurface;
  name: string;
  target_launch: string | null;
  status: MenuPlanStatus;
  notes: string | null;
  created_at: string;
  finalised_at: string | null;
  items: MenuPlanItem[];
};

const POP_THRESHOLD = 3; // 4-5 = "popular"; 1-3 = "less popular"

function gpPctFromRecipe(r: Recipe): number | null {
  if (r.sell_price == null || r.cost_per_cover == null) return null;
  if (r.sell_price <= 0) return null;
  return ((r.sell_price - r.cost_per_cover) / r.sell_price) * 100;
}

export function quadrantFor(
  rating: number | null,
  gpPct: number | null,
  target: number = DEFAULT_GP_TARGET,
): Quadrant {
  if (rating == null || gpPct == null) return 'unrated';
  const popular = rating >= POP_THRESHOLD + 1;
  const healthy = gpPct >= target;
  if (popular && healthy) return 'star';
  if (popular && !healthy) return 'plowhorse';
  if (!popular && healthy) return 'puzzle';
  return 'dog';
}

export const QUADRANT_LABEL: Record<Quadrant, string> = {
  star: 'Stars',
  plowhorse: 'Plowhorses',
  puzzle: 'Puzzles',
  dog: 'Dogs',
  unrated: 'Unrated',
};

export const QUADRANT_DESCRIPTION: Record<Quadrant, string> = {
  star: 'High popularity, healthy GP — feature these.',
  plowhorse: 'Popular but margin-thin — revise or reprice.',
  puzzle: 'Healthy GP but slow — reposition on the menu.',
  dog: 'Low pop, low GP — drop or rework.',
  unrated: 'Rate these to slot them on the matrix.',
};

export const ACTION_LABEL: Record<MenuPlanAction, string> = {
  keep: 'Keep',
  add: 'Add',
  remove: 'Remove',
  revise: 'Revise',
};

/**
 * Get the active draft plan for a site + surface, or null if none yet.
 * "Active" = status='draft' or 'finalised' but with the latest
 * target_launch in the future. We surface the most-recently-touched.
 */
export async function getActiveMenuPlan(
  siteId: string,
  surface: MenuPlanSurface,
): Promise<MenuPlan | null> {
  const supabase = await createSupabaseServerClient();
  const { data: plan } = await supabase
    .from('menu_plans')
    .select('id, site_id, surface, name, target_launch, status, notes, created_at, finalised_at, archived_at')
    .eq('site_id', siteId)
    .eq('surface', surface)
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!plan) return null;

  const { data: itemRows } = await supabase
    .from('menu_plan_items')
    .select('id, recipe_id, placeholder_name, action, popularity_rating, notes, position')
    .eq('plan_id', plan.id)
    .order('position', { ascending: true });

  // Fetch all recipes for the surface in one shot so we can decorate
  // each item with its current cost / GP without N+1 lookups.
  const dishTypes =
    surface === 'bar' ? BAR_DISH_TYPES : FOOD_DISH_TYPES;
  const recipes = await getRecipes(siteId, { dishTypes });
  const recipeById = new Map<string, Recipe>(recipes.map((r) => [r.id, r]));

  const items: MenuPlanItem[] = (itemRows ?? []).map((row) => {
    const recipe = row.recipe_id ? recipeById.get(row.recipe_id as string) ?? null : null;
    const gp = recipe ? gpPctFromRecipe(recipe) : null;
    const rating = (row.popularity_rating as number | null) ?? null;
    return {
      id: row.id as string,
      recipe_id: (row.recipe_id as string | null) ?? null,
      recipe,
      placeholder_name: (row.placeholder_name as string | null) ?? null,
      action: row.action as MenuPlanAction,
      popularity_rating: rating,
      notes: (row.notes as string | null) ?? null,
      position: row.position as number,
      display_name:
        recipe?.name ?? (row.placeholder_name as string | null) ?? 'Untitled',
      gp_pct: gp,
      gp_tone: gpToneFor(gp),
      quadrant: quadrantFor(rating, gp),
    };
  });

  return {
    id: plan.id as string,
    site_id: plan.site_id as string,
    surface: plan.surface as MenuPlanSurface,
    name: plan.name as string,
    target_launch: (plan.target_launch as string | null) ?? null,
    status: plan.status as MenuPlanStatus,
    notes: (plan.notes as string | null) ?? null,
    created_at: plan.created_at as string,
    finalised_at: (plan.finalised_at as string | null) ?? null,
    items,
  };
}

export type MenuPlanKpis = {
  total_items: number;
  net_change: number; // +adds -removes
  planned_gp_pct: number | null;
  current_menu_gp_pct: number | null;
  target_launch_days: number | null;
};

export function computePlanKpis(plan: MenuPlan): MenuPlanKpis {
  const adds = plan.items.filter((i) => i.action === 'add').length;
  const removes = plan.items.filter((i) => i.action === 'remove').length;

  // Planned menu = items with action keep/add/revise — what will be
  // live after the launch. We weight by recipe.cost_per_cover and
  // recipe.sell_price to compute a blended GP%.
  const planned = plan.items.filter(
    (i) => i.action !== 'remove' && i.recipe,
  );
  const plannedSell = planned.reduce(
    (s, i) => s + (i.recipe?.sell_price ?? 0),
    0,
  );
  const plannedCost = planned.reduce(
    (s, i) => s + (i.recipe?.cost_per_cover ?? 0),
    0,
  );
  const plannedGp =
    plannedSell > 0 ? ((plannedSell - plannedCost) / plannedSell) * 100 : null;

  // Current = keep + remove + revise (everything that exists today).
  const current = plan.items.filter(
    (i) => i.action !== 'add' && i.recipe,
  );
  const currentSell = current.reduce(
    (s, i) => s + (i.recipe?.sell_price ?? 0),
    0,
  );
  const currentCost = current.reduce(
    (s, i) => s + (i.recipe?.cost_per_cover ?? 0),
    0,
  );
  const currentGp =
    currentSell > 0 ? ((currentSell - currentCost) / currentSell) * 100 : null;

  let daysToLaunch: number | null = null;
  if (plan.target_launch) {
    const t = new Date(plan.target_launch).getTime();
    const now = Date.now();
    daysToLaunch = Math.round((t - now) / (1000 * 60 * 60 * 24));
  }

  return {
    total_items: plan.items.length,
    net_change: adds - removes,
    planned_gp_pct: plannedGp,
    current_menu_gp_pct: currentGp,
    target_launch_days: daysToLaunch,
  };
}

export type QuadrantBucket = {
  quadrant: Quadrant;
  items: MenuPlanItem[];
};

export function bucketByQuadrant(plan: MenuPlan): QuadrantBucket[] {
  const buckets: Record<Quadrant, MenuPlanItem[]> = {
    star: [],
    plowhorse: [],
    puzzle: [],
    dog: [],
    unrated: [],
  };
  for (const item of plan.items) {
    // Items being removed don't go on the matrix — they're already
    // off the path forward.
    if (item.action === 'remove') continue;
    buckets[item.quadrant].push(item);
  }
  const order: Quadrant[] = ['star', 'plowhorse', 'puzzle', 'dog', 'unrated'];
  return order.map((q) => ({ quadrant: q, items: buckets[q] }));
}

/**
 * Forward-looking risks specific to the plan. These slot into the
 * Looking Ahead frame at the bottom of the planner.
 *
 * Pure read computation — no detector row written. The signals on the
 * site-wide Looking Ahead remain authoritative for cost spikes; what
 * we surface here is plan-specific (which planned dish touches a
 * volatile ingredient, which dietary tag stops appearing in the next
 * menu, which recipes share sub-bases for prep efficiency).
 */
export type PlanLookingAheadCard = {
  id: string;
  headline: string;
  body: string;
  tone: 'attention' | 'urgent' | 'healthy' | 'muted';
};

export function planLookingAhead(plan: MenuPlan): PlanLookingAheadCard[] {
  const cards: PlanLookingAheadCard[] = [];

  // 1. Plowhorse alert — high-pop low-GP needing intervention before
  //    launch.
  const plowhorses = plan.items.filter((i) => i.quadrant === 'plowhorse');
  if (plowhorses.length > 0) {
    const top = plowhorses[0];
    cards.push({
      id: 'plowhorse',
      headline: `${plowhorses.length} plowhorse${plowhorses.length === 1 ? '' : 's'} on the next menu`,
      body: `${top.display_name} sells well but the GP isn't there. Revise the spec or lift the price before launch — every cover compounds the gap.`,
      tone: 'attention',
    });
  }

  // 2. Unrated count — chef hasn't done the engineering work yet.
  const unrated = plan.items.filter(
    (i) => i.action !== 'remove' && i.popularity_rating == null && i.recipe_id,
  );
  if (unrated.length >= 3) {
    cards.push({
      id: 'unrated',
      headline: `${unrated.length} dishes still unrated`,
      body: `Drop a 1–5 popularity rating on each so the engineering matrix can do its work. Two minutes per dish, gut feel is fine — POS sync will refine it later.`,
      tone: 'muted',
    });
  }

  // 3. Dog still on the menu — flag everything tagged dog that's
  //    being kept (not removed).
  const keptDogs = plan.items.filter(
    (i) => i.quadrant === 'dog' && i.action !== 'remove',
  );
  if (keptDogs.length > 0) {
    cards.push({
      id: 'kept-dogs',
      headline: `${keptDogs.length} dog${keptDogs.length === 1 ? '' : 's'} surviving the rewrite`,
      body: `Low pop, low GP — these dishes are taking up real estate without earning it. Mark them remove or revise.`,
      tone: 'urgent',
    });
  }

  // 4. Adds without a target launch date.
  const adds = plan.items.filter((i) => i.action === 'add');
  if (adds.length > 0 && !plan.target_launch) {
    cards.push({
      id: 'no-launch-date',
      headline: 'No target launch date set',
      body: 'A target date pulls the rest of the plan into focus — prep load, supplier conversations, photography. Set one to anchor the work.',
      tone: 'muted',
    });
  }

  // 5. Healthy frame — if nothing else is flagging, name the wins.
  const stars = plan.items.filter((i) => i.quadrant === 'star');
  if (cards.length === 0 && stars.length > 0) {
    cards.push({
      id: 'stars',
      headline: `${stars.length} star${stars.length === 1 ? '' : 's'} carrying the menu`,
      body: 'These dishes earn their place — popular and the GP holds up. Don\'t touch them in the rewrite.',
      tone: 'healthy',
    });
  }

  return cards;
}
