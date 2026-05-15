/**
 * Plain constants + types for the Recipe form. Lives OUTSIDE
 * `actions.ts` because that file is 'use server' — Next 15 strips
 * non-function exports from server-action modules when building the
 * client bundle, so the constants would come through as non-array
 * placeholders and crash `.map()` on render.
 *
 * Anywhere a client component needs these values (RecipeForm,
 * NewRecipeClient, etc.), import from here. Server actions still
 * live in actions.ts and re-export the types as a convenience.
 */

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
