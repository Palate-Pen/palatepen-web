import type { Recipe } from '@/lib/recipes';
import { gpToneFor, DEFAULT_GP_TARGET, type GpTone } from '@/lib/gp';

/**
 * Pure types + utilities for the menu planner. No server imports, so
 * client components can pull from this file safely. The async fetcher
 * `getActiveMenuPlan` and seed/write actions live in menu-plan.ts +
 * menu-plan-actions.ts respectively.
 */

export type MenuPlanSurface = 'kitchen' | 'bar';
export type MenuPlanStatus = 'draft' | 'finalised' | 'archived';
export type MenuPlanAction = 'add' | 'keep' | 'remove' | 'revise';

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

export function gpPctFromRecipe(r: Recipe): number | null {
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

export type MenuPlanKpis = {
  total_items: number;
  net_change: number;
  planned_gp_pct: number | null;
  current_menu_gp_pct: number | null;
  target_launch_days: number | null;
};

export function computePlanKpis(plan: MenuPlan): MenuPlanKpis {
  const adds = plan.items.filter((i) => i.action === 'add').length;
  const removes = plan.items.filter((i) => i.action === 'remove').length;

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
    if (item.action === 'remove') continue;
    buckets[item.quadrant].push(item);
  }
  const order: Quadrant[] = ['star', 'plowhorse', 'puzzle', 'dog', 'unrated'];
  return order.map((q) => ({ quadrant: q, items: buckets[q] }));
}

export type PlanLookingAheadCard = {
  id: string;
  headline: string;
  body: string;
  tone: 'attention' | 'urgent' | 'healthy' | 'muted';
};

export function planLookingAhead(plan: MenuPlan): PlanLookingAheadCard[] {
  const cards: PlanLookingAheadCard[] = [];

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

  const adds = plan.items.filter((i) => i.action === 'add');
  if (adds.length > 0 && !plan.target_launch) {
    cards.push({
      id: 'no-launch-date',
      headline: 'No target launch date set',
      body: 'A target date pulls the rest of the plan into focus — prep load, supplier conversations, photography. Set one to anchor the work.',
      tone: 'muted',
    });
  }

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

export function quadrantToneClass(quadrant: Quadrant): {
  card: string;
  label: string;
  chip: string;
} {
  switch (quadrant) {
    case 'star':
      return {
        card: 'border-healthy/40 bg-healthy/5',
        label: 'text-healthy',
        chip: 'bg-healthy/10 text-healthy border-healthy/40',
      };
    case 'plowhorse':
      return {
        card: 'border-attention/40 bg-attention/5',
        label: 'text-attention',
        chip: 'bg-attention/10 text-attention border-attention/40',
      };
    case 'puzzle':
      return {
        card: 'border-gold/40 bg-gold-bg',
        label: 'text-gold-dark',
        chip: 'bg-gold-bg text-gold-dark border-gold/40',
      };
    case 'dog':
      return {
        card: 'border-urgent/40 bg-urgent/5',
        label: 'text-urgent',
        chip: 'bg-urgent/10 text-urgent border-urgent/40',
      };
    default:
      return {
        card: 'border-rule bg-paper-warm/30',
        label: 'text-muted',
        chip: 'bg-paper-warm text-muted border-rule',
      };
  }
}

export { gpToneFor };
