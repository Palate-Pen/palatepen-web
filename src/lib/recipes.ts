import { createSupabaseServerClient } from '@/lib/supabase/server';
import { parseAllergens, type AllergenState } from '@/lib/allergens';

export type RecipeIngredient = {
  id: string;
  ingredient_id: string | null;
  name: string;
  qty: number;
  unit: string;
  position: number;
  current_price: number | null;
  /** qty × current_price for FK-linked ingredients, null when free-text. */
  line_cost: number | null;
};

export type Recipe = {
  id: string;
  name: string;
  menu_section: string | null;
  serves: number | null;
  portion_per_cover: number | null;
  sell_price: number | null;
  notes: string | null;
  /** Cost-per-cover at the time sell_price was last set. Drives the
   *  recipe-staleness detector + Margins page drift calc. */
  cost_baseline: number | null;
  costed_at: string | null;
  allergens: AllergenState;
  locked: boolean;
  photo_url: string | null;
  ingredients: RecipeIngredient[];
  /** Sum of line_cost where present; free-text ingredients contribute 0. */
  total_cost: number;
  /** total_cost × portion_per_cover / serves, where both are present. */
  cost_per_cover: number | null;
  /** How many ingredients have an active Bank FK / live price. */
  matched_ingredient_count: number;
};

export async function getRecipe(
  recipeId: string,
): Promise<Recipe | null> {
  const supabase = await createSupabaseServerClient();
  const { data: r } = await supabase
    .from('recipes')
    .select(
      'id, site_id, name, menu_section, serves, portion_per_cover, sell_price, notes, cost_baseline, costed_at, allergens, locked, photo_url',
    )
    .eq('id', recipeId)
    .is('archived_at', null)
    .single();
  if (!r) return null;

  const { data: ingredients } = await supabase
    .from('recipe_ingredients')
    .select('id, ingredient_id, name, qty, unit, position')
    .eq('recipe_id', recipeId)
    .order('position', { ascending: true });

  const bankIds = Array.from(
    new Set(
      (ingredients ?? [])
        .map((i) => i.ingredient_id as string | null)
        .filter((id): id is string => !!id),
    ),
  );
  const { data: bankRows } = await supabase
    .from('ingredients')
    .select('id, current_price')
    .in('id', bankIds.length ? bankIds : ['00000000-0000-0000-0000-000000000000']);
  const priceById = new Map(
    (bankRows ?? []).map((b) => [
      b.id as string,
      b.current_price == null ? null : Number(b.current_price),
    ]),
  );

  const rIngs: RecipeIngredient[] = (ingredients ?? []).map((i) => {
    const ingId = i.ingredient_id as string | null;
    const price = ingId ? priceById.get(ingId) ?? null : null;
    const qty = Number(i.qty);
    return {
      id: i.id as string,
      ingredient_id: ingId,
      name: i.name as string,
      qty,
      unit: i.unit as string,
      position: i.position as number,
      current_price: price,
      line_cost: price != null ? price * qty : null,
    };
  });

  const totalCost = rIngs.reduce((s, i) => s + (i.line_cost ?? 0), 0);
  const serves = r.serves as number | null;
  const portion = r.portion_per_cover == null ? null : Number(r.portion_per_cover);
  const costPerCover =
    serves != null && serves > 0 && portion != null
      ? (totalCost * portion) / serves
      : null;

  return {
    id: r.id as string,
    name: r.name as string,
    menu_section: (r.menu_section as string | null) ?? null,
    serves,
    portion_per_cover: portion,
    sell_price: r.sell_price == null ? null : Number(r.sell_price),
    notes: (r.notes as string | null) ?? null,
    cost_baseline: r.cost_baseline == null ? null : Number(r.cost_baseline),
    costed_at: (r.costed_at as string | null) ?? null,
    allergens: parseAllergens(r.allergens),
    locked: Boolean(r.locked),
    photo_url: (r.photo_url as string | null) ?? null,
    ingredients: rIngs,
    total_cost: totalCost,
    cost_per_cover: costPerCover,
    matched_ingredient_count: rIngs.filter((i) => i.ingredient_id != null).length,
  };
}

export async function getRecipes(siteId: string): Promise<Recipe[]> {
  const supabase = await createSupabaseServerClient();

  const { data: recipes, error: recipesErr } = await supabase
    .from('recipes')
    .select(
      'id, name, menu_section, serves, portion_per_cover, sell_price, notes, cost_baseline, costed_at, allergens, locked, photo_url',
    )
    .eq('site_id', siteId)
    .is('archived_at', null)
    .order('name', { ascending: true });
  if (recipesErr) throw new Error(`recipes.getRecipes: ${recipesErr.message}`);
  if (!recipes || recipes.length === 0) return [];

  const recipeIds = recipes.map((r) => r.id as string);

  const { data: ingredients, error: ingErr } = await supabase
    .from('recipe_ingredients')
    .select('id, recipe_id, ingredient_id, name, qty, unit, position')
    .in('recipe_id', recipeIds)
    .order('position', { ascending: true });
  if (ingErr) throw new Error(`recipes.getRecipes ingredients: ${ingErr.message}`);

  const bankIds = Array.from(
    new Set(
      (ingredients ?? [])
        .map((i) => i.ingredient_id as string | null)
        .filter((id): id is string => !!id),
    ),
  );

  const { data: bankRows, error: bankErr } = await supabase
    .from('ingredients')
    .select('id, current_price')
    .in('id', bankIds.length ? bankIds : ['00000000-0000-0000-0000-000000000000']);
  if (bankErr) throw new Error(`recipes.getRecipes bank: ${bankErr.message}`);
  const priceById = new Map(
    (bankRows ?? []).map((b) => [
      b.id as string,
      b.current_price == null ? null : Number(b.current_price),
    ]),
  );

  return recipes.map((r): Recipe => {
    const rIngs = (ingredients ?? [])
      .filter((i) => i.recipe_id === r.id)
      .map((i): RecipeIngredient => {
        const ingId = i.ingredient_id as string | null;
        const price = ingId ? priceById.get(ingId) ?? null : null;
        const qty = Number(i.qty);
        const lineCost = price != null ? price * qty : null;
        return {
          id: i.id as string,
          ingredient_id: ingId,
          name: i.name as string,
          qty,
          unit: i.unit as string,
          position: i.position as number,
          current_price: price,
          line_cost: lineCost,
        };
      });

    const totalCost = rIngs.reduce(
      (sum, i) => sum + (i.line_cost ?? 0),
      0,
    );
    const serves = r.serves as number | null;
    const portion = r.portion_per_cover == null ? null : Number(r.portion_per_cover);
    const costPerCover =
      serves != null && serves > 0 && portion != null
        ? (totalCost * portion) / serves
        : null;
    const matched = rIngs.filter((i) => i.ingredient_id != null).length;

    return {
      id: r.id as string,
      name: r.name as string,
      menu_section: (r.menu_section as string | null) ?? null,
      serves,
      portion_per_cover: portion,
      sell_price: r.sell_price == null ? null : Number(r.sell_price),
      notes: (r.notes as string | null) ?? null,
      cost_baseline:
        r.cost_baseline == null ? null : Number(r.cost_baseline),
      costed_at: (r.costed_at as string | null) ?? null,
      allergens: parseAllergens(r.allergens),
      locked: Boolean(r.locked),
      photo_url: (r.photo_url as string | null) ?? null,
      ingredients: rIngs,
      total_cost: totalCost,
      cost_per_cover: costPerCover,
      matched_ingredient_count: matched,
    };
  });
}
