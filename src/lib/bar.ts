import { createSupabaseServerClient } from '@/lib/supabase/server';

export type DishType = 'food' | 'cocktail' | 'wine' | 'beer' | 'soft' | 'spirit';

export const BAR_DISH_TYPES: DishType[] = [
  'cocktail',
  'wine',
  'beer',
  'soft',
  'spirit',
];

export type SpecListRow = {
  id: string;
  name: string;
  dish_type: DishType;
  glass_type: string | null;
  ice_type: string | null;
  technique: string | null;
  pour_ml: number | null;
  cost_baseline: number | null;
  margin_target_pct: number | null;
  archived: boolean;
};

export type CellarItem = {
  id: string;
  name: string;
  category: string | null;
  supplier_name: string | null;
  current_price: number | null;
  current_stock: number | null;
  par_level: number | null;
  reorder_point: number | null;
  unit_type: string | null;
  pack_volume_ml: number | null;
};

export type BarHomeRollup = {
  specs_total: number;
  specs_by_type: Partial<Record<DishType, number>>;
  par_breaches: number;
  par_breach_names: string[];
  cellar_stock_value: number;
  spillage_value_this_week: number;
  active_allocations: number;
};

/**
 * Roll-up for the Bartender Home KPI strip. Same shape as
 * getHomeRollup() on the chef side but reads bar-flavoured slices.
 */
export async function getBarHomeRollup(siteId: string): Promise<BarHomeRollup> {
  const supabase = await createSupabaseServerClient();

  // Spec counts — recipes filtered to bar dish types.
  const { data: specs } = await supabase
    .from('recipes')
    .select('id, dish_type, archived')
    .eq('site_id', siteId)
    .in('dish_type', BAR_DISH_TYPES);
  const liveSpecs = (specs ?? []).filter((s) => !s.archived);
  const specsByType: Partial<Record<DishType, number>> = {};
  for (const s of liveSpecs) {
    const t = s.dish_type as DishType;
    specsByType[t] = (specsByType[t] ?? 0) + 1;
  }

  // Par breaches — ingredients with current_stock <= reorder_point.
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name, current_price, current_stock, par_level, reorder_point')
    .eq('site_id', siteId)
    .not('reorder_point', 'is', null)
    .not('current_stock', 'is', null);
  const breaches = (ingredients ?? []).filter(
    (i) =>
      i.reorder_point != null &&
      i.current_stock != null &&
      Number(i.current_stock) <= Number(i.reorder_point),
  );

  // Cellar stock value — sum current_stock × current_price for bar-typed
  // ingredients (any with unit_type in cellar types).
  const { data: cellarRows } = await supabase
    .from('ingredients')
    .select('id, current_stock, current_price, unit_type')
    .eq('site_id', siteId)
    .in('unit_type', ['bottle', 'case', 'keg', 'cask', 'L', 'ml']);
  const stockValue = (cellarRows ?? []).reduce((sum, r) => {
    const stock = r.current_stock != null ? Number(r.current_stock) : 0;
    const price = r.current_price != null ? Number(r.current_price) : 0;
    return sum + stock * price;
  }, 0);

  // Spillage value this week — waste_entries with spillage_reason set.
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { data: spillage } = await supabase
    .from('waste_entries')
    .select('qty, ingredient_id, ingredients:ingredient_id (current_price), spillage_reason')
    .eq('site_id', siteId)
    .not('spillage_reason', 'is', null)
    .gte('logged_at', weekAgo.toISOString());
  const spillageValue = (spillage ?? []).reduce((sum, w) => {
    const qty = w.qty != null ? Number(w.qty) : 0;
    const price = (
      w.ingredients as unknown as { current_price?: number | null } | null
    )?.current_price;
    return sum + qty * (price ? Number(price) : 0);
  }, 0);

  // Active allocations — expected_date in future.
  const today = new Date().toISOString().slice(0, 10);
  const { count: allocCount } = await supabase
    .from('allocations')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', siteId)
    .gte('expected_date', today)
    .is('received_at', null);

  return {
    specs_total: liveSpecs.length,
    specs_by_type: specsByType,
    par_breaches: breaches.length,
    par_breach_names: breaches.slice(0, 4).map((b) => b.name as string),
    cellar_stock_value: stockValue,
    spillage_value_this_week: spillageValue,
    active_allocations: allocCount ?? 0,
  };
}

/**
 * Cost-per-pour for a cocktail spec. Computed live from ingredient
 * current_price + pack_volume_ml.
 */
export function costPerPour(
  ingredientPrice: number | null,
  packVolumeMl: number | null,
  pourMl: number | null,
): number | null {
  if (
    ingredientPrice == null ||
    packVolumeMl == null ||
    packVolumeMl <= 0 ||
    pourMl == null
  ) {
    return null;
  }
  return (ingredientPrice / packVolumeMl) * pourMl;
}

/**
 * Industry-standard pour-cost ranges. Used by Margins to colour-code
 * specs as healthy / attention / urgent.
 */
export const POUR_COST_BANDS: Record<
  DishType,
  { healthy_max: number; attention_max: number }
> = {
  food: { healthy_max: 0.35, attention_max: 0.45 },
  cocktail: { healthy_max: 0.22, attention_max: 0.28 },
  wine: { healthy_max: 0.32, attention_max: 0.4 },
  beer: { healthy_max: 0.22, attention_max: 0.3 },
  soft: { healthy_max: 0.15, attention_max: 0.22 },
  spirit: { healthy_max: 0.24, attention_max: 0.32 },
};
