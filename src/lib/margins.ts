import { getRecipes, type Recipe } from './recipes';

export type GpTone = 'healthy' | 'attention' | 'urgent' | null;

/** Target GP per CLAUDE.md profile.gpTarget default: 72%. The thresholds
 *  for tone classification are: ≥ target = healthy, target-7 to target-1
 *  = attention, < target-7 = urgent. */
export const DEFAULT_GP_TARGET = 72;
const ATTENTION_BAND = 7;

export function gpToneFor(
  gpPct: number | null,
  target: number = DEFAULT_GP_TARGET,
): GpTone {
  if (gpPct == null) return null;
  if (gpPct >= target) return 'healthy';
  if (gpPct >= target - ATTENTION_BAND) return 'attention';
  return 'urgent';
}

export type DishRow = {
  recipe: Recipe;
  gp_pct: number | null;
  gp_tone: GpTone;
  /** Cost change vs cost_baseline, when both are present. */
  drift_pct: number | null;
  /** Top ingredient by line cost — "what this dish is exposed to". */
  driver: { name: string; line_cost: number | null } | null;
};

export type SectionRollup = {
  name: string;
  display_name: string;
  dishes: DishRow[];
  avg_gp_pct: number | null;
  flagged_count: number;
};

export type MarginsData = {
  recipes: Recipe[];
  sections: SectionRollup[];
  /** Weighted-average GP across all costed dishes. */
  menu_gp_pct: number | null;
  dishes_total: number;
  dishes_healthy: number;
  dishes_attention: number;
  dishes_urgent: number;
  /** Largest negative drift (current cost-per-cover up vs baseline)
   *  among recipes that have both. */
  worst_drift_pct: number | null;
  worst_drift_recipe: Recipe | null;
};

const SECTION_ORDER = [
  'starters',
  'mains',
  'grill',
  'sides',
  'desserts',
  'drinks',
];

const SECTION_LABEL: Record<string, string> = {
  starters: 'Starters',
  mains: 'Mains',
  grill: 'Grill',
  sides: 'Sides',
  desserts: 'Desserts',
  drinks: 'Drinks',
};

function gpPctFor(recipe: Recipe): number | null {
  const sell = recipe.sell_price;
  const cost = recipe.cost_per_cover;
  if (sell == null || sell <= 0 || cost == null) return null;
  return ((sell - cost) / sell) * 100;
}

function driverFor(recipe: Recipe): DishRow['driver'] {
  if (recipe.ingredients.length === 0) return null;
  const sorted = [...recipe.ingredients]
    .filter((i) => i.line_cost != null)
    .sort((a, b) => (b.line_cost ?? 0) - (a.line_cost ?? 0));
  if (sorted.length === 0) return { name: recipe.ingredients[0].name, line_cost: null };
  return { name: sorted[0].name, line_cost: sorted[0].line_cost };
}

function driftPctFor(recipe: Recipe): number | null {
  // Margins reuses recipes.cost_baseline — same source the staleness
  // detector keys off. Positive drift = cost is now higher than when
  // sell_price was set (bad for margin).
  if (recipe.cost_baseline == null || recipe.cost_per_cover == null) return null;
  if (recipe.cost_baseline <= 0) return null;
  return ((recipe.cost_per_cover - recipe.cost_baseline) / recipe.cost_baseline) * 100;
}

export async function getMarginsData(siteId: string): Promise<MarginsData> {
  const recipes = await getRecipes(siteId);

  const dishRows: DishRow[] = recipes.map((r) => {
    const gp = gpPctFor(r);
    return {
      recipe: r,
      gp_pct: gp,
      gp_tone: gpToneFor(gp),
      drift_pct: driftPctFor(r),
      driver: driverFor(r),
    };
  });

  // Group by menu_section
  const byName = new Map<string, DishRow[]>();
  for (const row of dishRows) {
    const key = row.recipe.menu_section ?? 'mains';
    const arr = byName.get(key) ?? [];
    arr.push(row);
    byName.set(key, arr);
  }

  const sections: SectionRollup[] = Array.from(byName.entries())
    .sort(
      ([a], [b]) =>
        (SECTION_ORDER.indexOf(a) === -1 ? 999 : SECTION_ORDER.indexOf(a)) -
        (SECTION_ORDER.indexOf(b) === -1 ? 999 : SECTION_ORDER.indexOf(b)),
    )
    .map(([name, dishes]) => {
      const costed = dishes.filter((d) => d.gp_pct != null);
      const avg =
        costed.length === 0
          ? null
          : costed.reduce((s, d) => s + (d.gp_pct ?? 0), 0) / costed.length;
      const flagged = dishes.filter(
        (d) => d.gp_tone === 'attention' || d.gp_tone === 'urgent',
      ).length;
      return {
        name,
        display_name: SECTION_LABEL[name] ?? name,
        dishes,
        avg_gp_pct: avg,
        flagged_count: flagged,
      };
    });

  // Overall KPIs
  const costed = dishRows.filter((d) => d.gp_pct != null);
  const menuGp =
    costed.length === 0
      ? null
      : costed.reduce((s, d) => s + (d.gp_pct ?? 0), 0) / costed.length;

  let dishesHealthy = 0;
  let dishesAttention = 0;
  let dishesUrgent = 0;
  for (const d of dishRows) {
    if (d.gp_tone === 'healthy') dishesHealthy += 1;
    else if (d.gp_tone === 'attention') dishesAttention += 1;
    else if (d.gp_tone === 'urgent') dishesUrgent += 1;
  }

  // Worst drift = largest positive drift (cost up the most since pricing)
  const drifted = dishRows
    .filter((d) => d.drift_pct != null)
    .sort((a, b) => (b.drift_pct ?? 0) - (a.drift_pct ?? 0));
  const worstDrift = drifted[0];

  return {
    recipes,
    sections,
    menu_gp_pct: menuGp,
    dishes_total: dishRows.length,
    dishes_healthy: dishesHealthy,
    dishes_attention: dishesAttention,
    dishes_urgent: dishesUrgent,
    worst_drift_pct: worstDrift?.drift_pct ?? null,
    worst_drift_recipe: worstDrift?.recipe ?? null,
  };
}
