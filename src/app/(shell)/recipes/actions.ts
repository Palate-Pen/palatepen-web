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
  // Legacy-parity additions — bread course, sauces, pastry, stocks etc.
  // These render as suggestions only; menu_section is free-text post-
  // 20260515_v2_drop_menu_section_check.
  'snacks',
  'sauces',
  'breads',
  'pastry',
  'stocks',
  'tasting menu',
  'brunch',
  'specials',
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
  tags: string[];
  photo_url: string | null;
  dish_type: DishType;
  glass_type: string | null;
  ice_type: string | null;
  technique: CocktailTechnique | null;
  pour_ml: number | null;
  garnish: string | null;
  /** When true, any ingredient row WITHOUT an ingredient_id will also
   *  be inserted into v2.ingredients on save and back-linked. Default
   *  ON for URL-imported recipes (lazy path); chef can untick. */
  sync_to_bank?: boolean;
  ingredients: Array<{
    name: string;
    qty: number;
    unit: string;
    ingredient_id: string | null;
    /** When set, this line is a sub-recipe (component / mother sauce /
     *  stock base) rather than a Bank ingredient. ingredient_id stays
     *  null in that case. Cost is computed at read time from the
     *  sub-recipe's per-portion cost × this line's qty. */
    sub_recipe_id?: string | null;
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
 * For each ingredient line without an ingredient_id, try to find a
 * Bank match by name (case-insensitive) first; if no match, insert a
 * new Bank ingredient and back-fill the FK on the line. Mutates the
 * input array in place. Used by both create + update flows when
 * sync_to_bank is true on the form input.
 */
async function syncIngredientsToBank(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  siteId: string,
  ingredients: RecipeFormInput['ingredients'],
): Promise<{ created: number; matched: number }> {
  const unmatched = ingredients.filter(
    (i) => !i.ingredient_id && !i.sub_recipe_id && i.name.trim() !== '',
  );
  if (unmatched.length === 0) return { created: 0, matched: 0 };

  // Try to match by name first (existing bank entries)
  const names = unmatched.map((i) => i.name.trim().toLowerCase());
  const { data: existing } = await supabase
    .from('ingredients')
    .select('id, name')
    .eq('site_id', siteId)
    .in('name', unmatched.map((i) => i.name.trim()));
  // Case-insensitive lookup table
  const byLower = new Map<string, string>();
  for (const e of existing ?? []) {
    byLower.set((e.name as string).toLowerCase(), e.id as string);
  }

  let matched = 0;
  const toCreate: Array<{ idx: number; name: string; unit: string }> = [];
  for (const ing of unmatched) {
    const lower = ing.name.trim().toLowerCase();
    const hit = byLower.get(lower);
    if (hit) {
      ing.ingredient_id = hit;
      matched += 1;
    } else {
      toCreate.push({
        idx: ingredients.indexOf(ing),
        name: ing.name.trim(),
        unit: ing.unit,
      });
    }
  }

  if (toCreate.length === 0) return { created: 0, matched };

  // Bulk-insert the new bank entries
  const { data: created } = await supabase
    .from('ingredients')
    .insert(
      toCreate.map((c) => ({
        site_id: siteId,
        name: c.name,
        unit: c.unit,
      })),
    )
    .select('id, name');

  // Back-fill ingredient_id on the form's lines
  const createdByName = new Map<string, string>();
  for (const row of created ?? []) {
    createdByName.set((row.name as string).toLowerCase(), row.id as string);
  }
  for (const c of toCreate) {
    const id = createdByName.get(c.name.toLowerCase());
    if (id) ingredients[c.idx].ingredient_id = id;
  }

  void names; // silence unused
  return { created: toCreate.length, matched };
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
      tags: (Array.isArray(input.tags) ? input.tags : [])
        .map((t) => t.trim())
        .filter((t) => t.length > 0) as unknown as object,
      photo_url: input.photo_url,
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

  if (input.sync_to_bank) {
    await syncIngredientsToBank(supabase, siteId, input.ingredients);
  }

  if (input.ingredients.length > 0) {
    const rows = input.ingredients.map((ing, i) => ({
      recipe_id: recipeId,
      ingredient_id: ing.sub_recipe_id ? null : ing.ingredient_id,
      sub_recipe_id: ing.sub_recipe_id ?? null,
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
      tags: (Array.isArray(input.tags) ? input.tags : [])
        .map((t) => t.trim())
        .filter((t) => t.length > 0) as unknown as object,
      photo_url: input.photo_url,
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

  if (input.sync_to_bank) {
    const { data: recipeRow } = await supabase
      .from('recipes')
      .select('site_id')
      .eq('id', recipeId)
      .single();
    const siteId = recipeRow?.site_id as string | undefined;
    if (siteId) {
      await syncIngredientsToBank(supabase, siteId, input.ingredients);
    }
  }

  if (input.ingredients.length > 0) {
    const rows = input.ingredients.map((ing, i) => ({
      recipe_id: recipeId,
      ingredient_id: ing.sub_recipe_id ? null : ing.ingredient_id,
      sub_recipe_id: ing.sub_recipe_id ?? null,
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
