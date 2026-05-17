import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Three lists of dish options the safety probe + incident forms can
 * link a reading or issue against. Each entry resolves back to a real
 * v2.recipes.id so the FK on safety_probe_readings.recipe_id and
 * safety_incidents.recipe_id is honest.
 *
 * Bands:
 *   - todays_menu: recipes on the currently-active menu plan, or with
 *     a sell_price (live on the menu derivable from recipes alone).
 *   - prep_items: items on the prep board with prep_date = today and a
 *     resolved recipe_id.
 *   - library: every non-archived recipe on the site (search fallback).
 *
 * A dish can appear in more than one band — the picker shows the
 * band-of-first-discovery and de-dupes the library section.
 */

export type DishOption = {
  recipe_id: string;
  name: string;
  dish_type: string;
  category: string | null;
  /** Subline shown in the picker — e.g. "On tonight's prep" */
  context: string | null;
};

export type DishPickerBands = {
  todays_menu: DishOption[];
  prep_items: DishOption[];
  library: DishOption[];
};

export type DishTypeFilter = 'food' | 'bar' | 'all';

export async function getDishPickerBands(
  siteId: string,
  dishType: DishTypeFilter = 'all',
): Promise<DishPickerBands> {
  const supabase = await createSupabaseServerClient();

  // --- Library: every non-archived recipe for the site ---
  let recipesQuery = supabase
    .from('recipes')
    .select('id, name, dish_type, category, sell_price')
    .eq('site_id', siteId)
    .is('archived_at', null)
    .order('name', { ascending: true });
  if (dishType === 'food') recipesQuery = recipesQuery.eq('dish_type', 'food');
  else if (dishType === 'bar') recipesQuery = recipesQuery.eq('dish_type', 'bar');
  const { data: recipes } = await recipesQuery;

  type R = {
    id: string;
    name: string;
    dish_type: string;
    category: string | null;
    sell_price: number | null;
  };
  const recipeList = ((recipes ?? []) as unknown as R[]).map((r) => ({
    recipe_id: r.id,
    name: r.name,
    dish_type: r.dish_type ?? 'food',
    category: r.category ?? null,
    sell_price: r.sell_price != null ? Number(r.sell_price) : null,
  }));

  // --- Today's Menu: recipes carried by the most recent active plan,
  //     OR any priced recipe (live menu is derived from sell_price). ---
  const { data: plans } = await supabase
    .from('menu_plans')
    .select('id, status, launch_date')
    .eq('site_id', siteId)
    .neq('status', 'archived')
    .order('launch_date', { ascending: false, nullsFirst: false })
    .limit(1);
  const planId = (plans?.[0]?.id as string | undefined) ?? null;
  const plannedIds = new Set<string>();
  if (planId) {
    const { data: items } = await supabase
      .from('menu_plan_items')
      .select('recipe_id')
      .eq('plan_id', planId);
    for (const it of items ?? []) {
      const rid = it.recipe_id as string | null;
      if (rid) plannedIds.add(rid);
    }
  }
  const todaysMenu: DishOption[] = [];
  for (const r of recipeList) {
    const onPlan = plannedIds.has(r.recipe_id);
    const priced = r.sell_price != null && r.sell_price > 0;
    if (!onPlan && !priced) continue;
    todaysMenu.push({
      recipe_id: r.recipe_id,
      name: r.name,
      dish_type: r.dish_type,
      category: r.category,
      context: onPlan ? 'On the live plan' : 'On the menu',
    });
  }

  // --- Prep Items: today's prep board joined to recipes ---
  const today = new Date().toISOString().slice(0, 10);
  const { data: preps } = await supabase
    .from('prep_items')
    .select('recipe_id, name, station, status')
    .eq('site_id', siteId)
    .eq('prep_date', today)
    .not('recipe_id', 'is', null);
  const prepByRecipe = new Map<
    string,
    { name: string; station: string | null; status: string | null }
  >();
  for (const p of preps ?? []) {
    const rid = (p.recipe_id as string | null) ?? null;
    if (!rid || prepByRecipe.has(rid)) continue;
    prepByRecipe.set(rid, {
      name: (p.name as string) ?? '',
      station: (p.station as string | null) ?? null,
      status: (p.status as string | null) ?? null,
    });
  }
  const recipeById = new Map(recipeList.map((r) => [r.recipe_id, r]));
  const prepItems: DishOption[] = [];
  for (const [rid, p] of prepByRecipe.entries()) {
    const r = recipeById.get(rid);
    if (!r) continue;
    const stationLabel = p.station ? p.station : 'prep board';
    prepItems.push({
      recipe_id: rid,
      name: r.name,
      dish_type: r.dish_type,
      category: r.category,
      context: `On today's ${stationLabel}`,
    });
  }

  return {
    todays_menu: todaysMenu,
    prep_items: prepItems,
    library: recipeList.map((r) => ({
      recipe_id: r.recipe_id,
      name: r.name,
      dish_type: r.dish_type,
      category: r.category,
      context: r.category,
    })),
  };
}
