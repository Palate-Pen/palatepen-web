/**
 * UK FIR 2014 + Natasha's Law allergen taxonomy. Shared between
 * Recipe form / Bank ingredient form / detail-page chip rendering.
 *
 * Server-free — safe to import from client components.
 */

export type AllergenKey =
  | 'gluten'
  | 'crustaceans'
  | 'eggs'
  | 'fish'
  | 'peanuts'
  | 'soybeans'
  | 'milk'
  | 'nuts'
  | 'celery'
  | 'mustard'
  | 'sesame'
  | 'sulphites'
  | 'lupin'
  | 'molluscs';

export type AllergenState = {
  contains: AllergenKey[];
  mayContain: AllergenKey[];
  nutTypes: string[];
  glutenTypes: string[];
};

export const EMPTY_ALLERGENS: AllergenState = {
  contains: [],
  mayContain: [],
  nutTypes: [],
  glutenTypes: [],
};

export const ALLERGENS: Array<{
  key: AllergenKey;
  label: string;
  short: string;
}> = [
  { key: 'gluten', label: 'Gluten', short: 'GL' },
  { key: 'crustaceans', label: 'Crustaceans', short: 'CR' },
  { key: 'eggs', label: 'Eggs', short: 'EG' },
  { key: 'fish', label: 'Fish', short: 'FI' },
  { key: 'peanuts', label: 'Peanuts', short: 'PE' },
  { key: 'soybeans', label: 'Soybeans', short: 'SO' },
  { key: 'milk', label: 'Milk', short: 'MI' },
  { key: 'nuts', label: 'Nuts', short: 'NU' },
  { key: 'celery', label: 'Celery', short: 'CE' },
  { key: 'mustard', label: 'Mustard', short: 'MU' },
  { key: 'sesame', label: 'Sesame', short: 'SE' },
  { key: 'sulphites', label: 'Sulphites', short: 'SU' },
  { key: 'lupin', label: 'Lupin', short: 'LU' },
  { key: 'molluscs', label: 'Molluscs', short: 'MO' },
];

export const NUT_TYPES = [
  'Almond',
  'Hazelnut',
  'Walnut',
  'Cashew',
  'Pecan',
  'Brazil nut',
  'Pistachio',
  'Macadamia',
];

export const GLUTEN_TYPES = ['Wheat', 'Rye', 'Barley', 'Oats', 'Spelt', 'Kamut'];

const SHORT_BY_KEY: Record<AllergenKey, string> = Object.fromEntries(
  ALLERGENS.map((a) => [a.key, a.short]),
) as Record<AllergenKey, string>;

const LABEL_BY_KEY: Record<AllergenKey, string> = Object.fromEntries(
  ALLERGENS.map((a) => [a.key, a.label]),
) as Record<AllergenKey, string>;

export function allergenShort(key: AllergenKey): string {
  return SHORT_BY_KEY[key] ?? key.toUpperCase().slice(0, 2);
}

export function allergenLabel(key: AllergenKey): string {
  return LABEL_BY_KEY[key] ?? key;
}

/** Normalise a raw jsonb blob coming back from Postgres into a usable shape. */
export function parseAllergens(raw: unknown): AllergenState {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_ALLERGENS };
  const r = raw as Partial<AllergenState>;
  return {
    contains: Array.isArray(r.contains)
      ? (r.contains.filter(Boolean) as AllergenKey[])
      : [],
    mayContain: Array.isArray(r.mayContain)
      ? (r.mayContain.filter(Boolean) as AllergenKey[])
      : [],
    nutTypes: Array.isArray(r.nutTypes)
      ? (r.nutTypes.filter(Boolean) as string[])
      : [],
    glutenTypes: Array.isArray(r.glutenTypes)
      ? (r.glutenTypes.filter(Boolean) as string[])
      : [],
  };
}

export type AllergenTri = 'none' | 'may' | 'contains';

export function allergenTriFor(
  state: AllergenState,
  key: AllergenKey,
): AllergenTri {
  if (state.contains.includes(key)) return 'contains';
  if (state.mayContain.includes(key)) return 'may';
  return 'none';
}

export function setAllergenTri(
  state: AllergenState,
  key: AllergenKey,
  tri: AllergenTri,
): AllergenState {
  const contains = state.contains.filter((k) => k !== key);
  const mayContain = state.mayContain.filter((k) => k !== key);
  if (tri === 'contains') contains.push(key);
  if (tri === 'may') mayContain.push(key);
  // If we cleared the only "contains" that justified a sub-type, also
  // clear the sub-type arrays so the recipe doesn't carry orphaned
  // declarations the chef can't see (FIR requires the sub-type only
  // when the parent allergen is declared).
  let nutTypes = state.nutTypes;
  let glutenTypes = state.glutenTypes;
  if (key === 'nuts' && tri !== 'contains') nutTypes = [];
  if (key === 'gluten' && tri !== 'contains') glutenTypes = [];
  return { contains, mayContain, nutTypes, glutenTypes };
}

export function toggleSubType(
  state: AllergenState,
  field: 'nutTypes' | 'glutenTypes',
  value: string,
): AllergenState {
  const cur = state[field];
  const next = cur.includes(value)
    ? cur.filter((x) => x !== value)
    : [...cur, value];
  return { ...state, [field]: next };
}
