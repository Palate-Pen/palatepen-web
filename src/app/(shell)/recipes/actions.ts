'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AllergenState } from '@/lib/allergens';

export type DishType =
  | 'food'
  | 'cocktail'
  | 'wine'
  | 'beer'
  | 'soft'
  | 'spirit';

export const DISH_TYPES: DishType[] = [
  'food',
  'cocktail',
  'wine',
  'beer',
  'soft',
  'spirit',
];

export type CocktailTechnique =
  | 'build'
  | 'stir'
  | 'shake'
  | 'throw'
  | 'rolled'
  | 'blended';

export const COCKTAIL_TECHNIQUES: CocktailTechnique[] = [
  'build',
  'stir',
  'shake',
  'throw',
  'rolled',
  'blended',
];

/**
 * menu_section is free-text in v2 (the DB CHECK was dropped 2026-05-15).
 * These are the suggested values rendered as a dropdown for chefs +
 * bartenders. Free text input always wins.
 */
export const FOOD_MENU_SECTIONS = [
  'starters',
  'mains',
  'grill',
  'sides',
  'desserts',
  'drinks',
];

export const BAR_MENU_SECTIONS = [
  'Classics',
  'Signatures',
  'Tonight Only',
  'Lower-ABV',
  'Non-Alc',
  'Wines By Glass',
  'On Draught',
  'Bottled Beer',
];

/** Legacy alias kept for any chef-side imports still expecting this name. */
export type MenuSection = string;
export const MENU_SECTIONS: string[] = FOOD_MENU_SECTIONS;

export type RecipeFormInput = {
  name: string;
  menu_section: string | null;
  serves: number | null;
  portion_per_cover: number | null;
  sell_price: number | null;
  notes: string | null;
  allergens: AllergenState;
  locked: boolean;
  method: string[];
  dish_type: DishType;
  glass_type: string | null;
  ice_type: string | null;
  technique: CocktailTechnique | null;
  pour_ml: number | null;
  garnish: string | null;
  ingredients: Array<{
    name: string;
    qty: number;
    unit: string;
    ingredient_id: string | null;
  }>;
};

type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; field?: string };

function validate(input: RecipeFormInput): string | null {
  if (!input.name.trim()) return 'name_required';
  if (!DISH_TYPES.includes(input.dish_type)) {
    return 'invalid_dish_type';
  }
  if (
    input.technique != null &&
    !COCKTAIL_TECHNIQUES.includes(input.technique)
  ) {
    return 'invalid_technique';
  }
  if (
    input.pour_ml != null &&
    (!Number.isFinite(input.pour_ml) || input.pour_ml <= 0)
  ) {
    return 'invalid_pour_ml';
  }
  if (input.serves != null && (input.serves <= 0 || !Number.isFinite(input.serves))) {
    return 'invalid_serves';
  }
  if (
    input.portion_per_cover != null &&
    (input.portion_per_cover <= 0 || !Number.isFinite(input.portion_per_cover))
  ) {
    return 'invalid_portion';
  }
  if (
    input.sell_price != null &&
    (input.sell_price < 0 || !Number.isFinite(input.sell_price))
  ) {
    return 'invalid_sell_price';
  }
  for (let i = 0; i < input.ingredients.length; i++) {
    const ing = input.ingredients[i];
    if (!ing.name.trim()) return `ingredient_${i}_name_required`;
    if (!Number.isFinite(ing.qty) || ing.qty < 0) {
      return `ingredient_${i}_invalid_qty`;
    }
    if (!ing.unit.trim()) return `ingredient_${i}_unit_required`;
  }
  return null;
}

/**
 * Create a new recipe + its recipe_ingredients in one server action.
 * Two-step insert (recipe then ingredients) because the FK requires
 * the recipe row to exist first. If the ingredients insert fails we
 * leave the (empty) recipe in place rather than rolling back — the
 * chef can edit and re-add lines. A failed action surfaces the error
 * in the form.
 */
export async function createRecipe(
  input: RecipeFormInput,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const validation = validate(input);
  if (validation) return { ok: false, error: validation };

  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id, role')
    .eq('user_id', user.id)
    .limit(1);
  const membership = memberships?.[0];
  if (!membership) return { ok: false, error: 'no_membership' };
  const siteId = membership.site_id as string;

  const { data: newRow, error: recipeErr } = await supabase
    .from('recipes')
    .insert({
      site_id: siteId,
      name: input.name.trim(),
      menu_section: input.menu_section,
      serves: input.serves,
      portion_per_cover: input.portion_per_cover,
      sell_price: input.sell_price,
      notes: input.notes?.trim() || null,
      allergens: input.allergens as unknown as object,
      locked: input.locked,
      method: input.method
        .map((s) => s.trim())
        .filter((s) => s.length > 0) as unknown as object,
      dish_type: input.dish_type,
      glass_type: input.glass_type?.trim() || null,
      ice_type: input.ice_type?.trim() || null,
      technique: input.technique,
      pour_ml: input.pour_ml,
      garnish: input.garnish?.trim() || null,
    })
    .select('id')
    .single();
  if (recipeErr || !newRow) {
    return { ok: false, error: recipeErr?.message ?? 'insert_failed' };
  }
  const recipeId = newRow.id as string;

  if (input.ingredients.length > 0) {
    const rows = input.ingredients.map((ing, i) => ({
      recipe_id: recipeId,
      ingredient_id: ing.ingredient_id,
      name: ing.name.trim(),
      qty: ing.qty,
      unit: ing.unit.trim(),
      position: i + 1,
    }));
    const { error: ingErr } = await supabase
      .from('recipe_ingredients')
      .insert(rows);
    if (ingErr) {
      return {
        ok: false,
        error: `recipe saved but ingredients failed: ${ingErr.message}`,
      };
    }
  }

  revalidatePath('/recipes');
  revalidatePath('/margins');
  revalidatePath('/bartender/specs');
  revalidatePath('/bartender/margins');
  return { ok: true, id: recipeId };
}

/**
 * Update a recipe + replace its ingredients in one server action.
 * Uses delete-all-then-insert on recipe_ingredients rather than diffing —
 * cheap (<30 rows typically) and avoids diff complexity. Recipe FKs are
 * preserved since recipe_id stays the same.
 */
export async function updateRecipe(
  recipeId: string,
  input: RecipeFormInput,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const validation = validate(input);
  if (validation) return { ok: false, error: validation };

  const { error: updErr } = await supabase
    .from('recipes')
    .update({
      name: input.name.trim(),
      menu_section: input.menu_section,
      serves: input.serves,
      portion_per_cover: input.portion_per_cover,
      sell_price: input.sell_price,
      notes: input.notes?.trim() || null,
      allergens: input.allergens as unknown as object,
      locked: input.locked,
      method: input.method
        .map((s) => s.trim())
        .filter((s) => s.length > 0) as unknown as object,
      dish_type: input.dish_type,
      glass_type: input.glass_type?.trim() || null,
      ice_type: input.ice_type?.trim() || null,
      technique: input.technique,
      pour_ml: input.pour_ml,
      garnish: input.garnish?.trim() || null,
    })
    .eq('id', recipeId);
  if (updErr) return { ok: false, error: updErr.message };

  const { error: delErr } = await supabase
    .from('recipe_ingredients')
    .delete()
    .eq('recipe_id', recipeId);
  if (delErr) return { ok: false, error: delErr.message };

  if (input.ingredients.length > 0) {
    const rows = input.ingredients.map((ing, i) => ({
      recipe_id: recipeId,
      ingredient_id: ing.ingredient_id,
      name: ing.name.trim(),
      qty: ing.qty,
      unit: ing.unit.trim(),
      position: i + 1,
    }));
    const { error: ingErr } = await supabase
      .from('recipe_ingredients')
      .insert(rows);
    if (ingErr) return { ok: false, error: ingErr.message };
  }

  revalidatePath('/recipes');
  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath('/margins');
  revalidatePath(`/margins/${recipeId}`);
  revalidatePath('/bartender/specs');
  revalidatePath(`/bartender/specs/${recipeId}`);
  revalidatePath('/bartender/margins');
  return { ok: true, id: recipeId };
}

export async function archiveRecipe(recipeId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { error } = await supabase
    .from('recipes')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', recipeId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/recipes');
  revalidatePath('/margins');
  revalidatePath('/bartender/specs');
  revalidatePath('/bartender/margins');
  return { ok: true, id: recipeId };
}
