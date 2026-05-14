/**
 * Derive customer-facing dietary tags (V / VG / DF / GF / NF) from a
 * recipe's UK FIR allergen state. These are the badges restaurants
 * print on menus — Vegetarian, Vegan, Dairy-Free, Gluten-Free, Nut-
 * Free. They aren't legal declarations on their own; they're a
 * shorthand for the front-of-house team and the diner.
 *
 * Logic is conservative: a recipe is GF only when we're SURE gluten is
 * absent (allergens.contains doesn't include gluten AND mayContain
 * doesn't either). Same for the rest. A free-text ingredient row that
 * isn't linked to The Bank can't contribute, so the chef who hasn't
 * declared allergens gets a clean slate — no false-positive dietary
 * tags.
 *
 * Server-free; safe to import from client components.
 */

import type { AllergenState, AllergenKey } from '@/lib/allergens';

export type DietaryTag = 'V' | 'VG' | 'DF' | 'GF' | 'NF';

const DIETARY_META: Record<
  DietaryTag,
  {
    label: string;
    full: string;
    /** Allergens that EXCLUDE this dietary tag — if any of these appear in
     *  contains OR mayContain, the tag doesn't apply. */
    excludes: AllergenKey[];
  }
> = {
  GF: {
    label: 'GF',
    full: 'Gluten-free',
    excludes: ['gluten'],
  },
  DF: {
    label: 'DF',
    full: 'Dairy-free',
    excludes: ['milk'],
  },
  NF: {
    label: 'NF',
    full: 'Nut-free',
    excludes: ['nuts', 'peanuts'],
  },
  V: {
    label: 'V',
    full: 'Vegetarian',
    // Vegetarian rules out fish, crustaceans, molluscs (no meat
    // allergen exists in FIR — meat isn't an allergen; chef declares
    // veg/vegan via a separate flag in legacy. For v1 we approximate
    // from FIR allergens: no fish/crustaceans/molluscs/etc.).
    excludes: ['fish', 'crustaceans', 'molluscs'],
  },
  VG: {
    label: 'VG',
    full: 'Vegan',
    excludes: [
      'milk',
      'eggs',
      'fish',
      'crustaceans',
      'molluscs',
    ],
  },
};

const DIETARY_ORDER: DietaryTag[] = ['V', 'VG', 'GF', 'DF', 'NF'];

export function dietaryTagsFor(allergens: AllergenState): DietaryTag[] {
  const out: DietaryTag[] = [];
  const allDeclared = new Set<AllergenKey>([
    ...allergens.contains,
    ...allergens.mayContain,
  ]);

  for (const tag of DIETARY_ORDER) {
    const meta = DIETARY_META[tag];
    const blocked = meta.excludes.some((k) => allDeclared.has(k));
    if (!blocked) out.push(tag);
  }
  return out;
}

export function dietaryTagFull(tag: DietaryTag): string {
  return DIETARY_META[tag].full;
}

/**
 * Render the chips. Returns null when nothing applies (e.g. a recipe
 * with no allergens declared at all — we don't want to claim "GF / DF
 * / NF" for an undocumented dish; the chef hasn't done the work).
 *
 * Only renders when at LEAST one allergen is declared (contains OR
 * mayContain), so a fully-blank recipe doesn't get a "this is suitable
 * for everyone" implication.
 */
export function shouldRenderDietary(allergens: AllergenState): boolean {
  return (
    allergens.contains.length > 0 || allergens.mayContain.length > 0
  );
}
