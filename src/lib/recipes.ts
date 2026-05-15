import { createSupabaseServerClient } from '@/lib/supabase/server';
import { parseAllergens, type AllergenState } from '@/lib/allergens';
import { parseNutrition, type NutritionState } from '@/lib/nutrition';

export type DishType =
  | 'food'
  | 'cocktail'
  | 'wine'
  | 'beer'
  | 'soft'
  | 'spirit';

export type CocktailTechnique =
  | 'build'
  | 'stir'
  | 'shake'
  | 'throw'
  | 'rolled'
  | 'blended';

export type RecipeIngredient = {
  id: string;
  ingredient_id: string | null;
  name: string;
  qty: number;
  unit: string;
  position: number;
  current_price: number | null;
  /** Cost of this line. For ml/L/g/kg pours from packs, calculated as
   *  qty × (current_price / pack_volume_ml). For everything else,
   *  qty × current_price. Null when no FK / no price. */
  line_cost: number | null;
  /** Nutrition per 100g/ml, only populated when linked to The Bank. */
  nutrition: NutritionState | null;
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
  method: string[];
  /** Bar fields — meaningful when dish_type !== 'food'. */
  dish_type: DishType;
  glass_type: string | null;
  ice_type: string | null;
  technique: CocktailTechnique | null;
  pour_ml: number | null;
  garnish: string | null;
  ingredients: RecipeIngredient[];
  /** Sum of line_cost where present; free-text ingredients contribute 0. */
  total_cost: number;
  /** total_cost × portion_per_cover / serves, where both are present.
   *  For cocktail specs with serves=1, portion=1, this equals total_cost
   *  and represents cost-per-pour. */
  cost_per_cover: number | null;
  /** How many ingredients have an active Bank FK / live price. */
  matched_ingredient_count: number;
};

const RECIPE_COLUMNS =
  'id, site_id, name, menu_section, serves, portion_per_cover, sell_price, notes, cost_baseline, costed_at, allergens, locked, photo_url, method, dish_type, glass_type, ice_type, technique, pour_ml, garnish';
const RECIPE_LIST_COLUMNS =
  'id, name, menu_section, serves, portion_per_cover, sell_price, notes, cost_baseline, costed_at, allergens, locked, photo_url, method, dish_type, glass_type, ice_type, technique, pour_ml, garnish';

/**
 * For unit-aware costing. When the recipe ingredient is measured in
 * ml/L/g/kg against an ingredient with a pack_volume_ml that represents
 * the SAME dimension as the unit, divide. E.g. 25ml of a 700ml bottle
 * → cost × 25/700. Otherwise fall back to qty × current_price (which is
 * correct for "by-pack" ingredients like olives-per-jar).
 */
const ML_LIKE_UNITS = new Set(['ml', 'l']);

function lineCostFor(
  unit: string,
  qty: number,
  price: number,
  packVolumeMl: number | null,
): number {
  const u = unit.trim().toLowerCase();
  if (packVolumeMl != null && packVolumeMl > 0 && ML_LIKE_UNITS.has(u)) {
    const qtyMl = u === 'l' ? qty * 1000 : qty;
    return (price / packVolumeMl) * qtyMl;
  }
  return price * qty;
}

function parseMethod(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is string => typeof s === 'string');
}

export async function getRecipe(
  recipeId: string,
): Promise<Recipe | null> {
  const supabase = await createSupabaseServerClient();
  const { data: r } = await supabase
    .from('recipes')
    .select(RECIPE_COLUMNS)
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
    .select('id, current_price, nutrition, pack_volume_ml')
    .in('id', bankIds.length ? bankIds : ['00000000-0000-0000-0000-000000000000']);
  const priceById = new Map(
    (bankRows ?? []).map((b) => [
      b.id as string,
      b.current_price == null ? null : Number(b.current_price),
    ]),
  );
  const packVolumeById = new Map(
    (bankRows ?? []).map((b) => [
      b.id as string,
      b.pack_volume_ml == null ? null : Number(b.pack_volume_ml),
    ]),
  );
  const nutritionById = new Map<string, NutritionState>(
    (bankRows ?? []).map((b) => [b.id as string, parseNutrition(b.nutrition)]),
  );

  const rIngs: RecipeIngredient[] = (ingredients ?? []).map((i) => {
    const ingId = i.ingredient_id as string | null;
    const price = ingId ? priceById.get(ingId) ?? null : null;
    const pvml = ingId ? packVolumeById.get(ingId) ?? null : null;
    const qty = Number(i.qty);
    const unit = i.unit as string;
    return {
      id: i.id as string,
      ingredient_id: ingId,
      name: i.name as string,
      qty,
      unit,
      position: i.position as number,
      current_price: price,
      line_cost: price != null ? lineCostFor(unit, qty, price, pvml) : null,
      nutrition: ingId ? nutritionById.get(ingId) ?? null : null,
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
    method: parseMethod(r.method),
    dish_type: ((r.dish_type as string) ?? 'food') as DishType,
    glass_type: (r.glass_type as string | null) ?? null,
    ice_type: (r.ice_type as string | null) ?? null,
    technique: (r.technique as CocktailTechnique | null) ?? null,
    pour_ml: r.pour_ml == null ? null : Number(r.pour_ml),
    garnish: (r.garnish as string | null) ?? null,
    ingredients: rIngs,
    total_cost: totalCost,
    cost_per_cover: costPerCover,
    matched_ingredient_count: rIngs.filter((i) => i.ingredient_id != null).length,
  };
}

export async function getRecipes(
  siteId: string,
  options: { dishTypes?: DishType[] } = {},
): Promise<Recipe[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('recipes')
    .select(RECIPE_LIST_COLUMNS)
    .eq('site_id', siteId)
    .is('archived_at', null);
  if (options.dishTypes && options.dishTypes.length > 0) {
    query = query.in('dish_type', options.dishTypes);
  }
  const { data: recipes, error: recipesErr } = await query.order('name', {
    ascending: true,
  });
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
    .select('id, current_price, nutrition, pack_volume_ml')
    .in('id', bankIds.length ? bankIds : ['00000000-0000-0000-0000-000000000000']);
  if (bankErr) throw new Error(`recipes.getRecipes bank: ${bankErr.message}`);
  const priceById = new Map(
    (bankRows ?? []).map((b) => [
      b.id as string,
      b.current_price == null ? null : Number(b.current_price),
    ]),
  );
  const packVolumeById = new Map(
    (bankRows ?? []).map((b) => [
      b.id as string,
      b.pack_volume_ml == null ? null : Number(b.pack_volume_ml),
    ]),
  );
  const nutritionById = new Map<string, NutritionState>(
    (bankRows ?? []).map((b) => [b.id as string, parseNutrition(b.nutrition)]),
  );

  return recipes.map((r): Recipe => {
    const rIngs = (ingredients ?? [])
      .filter((i) => i.recipe_id === r.id)
      .map((i): RecipeIngredient => {
        const ingId = i.ingredient_id as string | null;
        const price = ingId ? priceById.get(ingId) ?? null : null;
        const pvml = ingId ? packVolumeById.get(ingId) ?? null : null;
        const qty = Number(i.qty);
        const unit = i.unit as string;
        const lineCost = price != null ? lineCostFor(unit, qty, price, pvml) : null;
        return {
          id: i.id as string,
          ingredient_id: ingId,
          name: i.name as string,
          qty,
          unit,
          position: i.position as number,
          current_price: price,
          line_cost: lineCost,
          nutrition: ingId ? nutritionById.get(ingId) ?? null : null,
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
      cost_baseline: r.cost_baseline == null ? null : Number(r.cost_baseline),
      costed_at: (r.costed_at as string | null) ?? null,
      allergens: parseAllergens(r.allergens),
      locked: Boolean(r.locked),
      photo_url: (r.photo_url as string | null) ?? null,
      method: parseMethod(r.method),
      dish_type: ((r.dish_type as string) ?? 'food') as DishType,
      glass_type: (r.glass_type as string | null) ?? null,
      ice_type: (r.ice_type as string | null) ?? null,
      technique: (r.technique as CocktailTechnique | null) ?? null,
      pour_ml: r.pour_ml == null ? null : Number(r.pour_ml),
      garnish: (r.garnish as string | null) ?? null,
      ingredients: rIngs,
      total_cost: totalCost,
      cost_per_cover: costPerCover,
      matched_ingredient_count: matched,
    };
  });
}
