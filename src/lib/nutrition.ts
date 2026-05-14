/**
 * Nutrition + Front-of-Pack (FoP) traffic-light rules. Shared between
 * IngredientForm (chef edits per-100g values), Bank detail, and
 * recipe detail (aggregates from linked ingredients).
 *
 * Server-free — safe to import from client components.
 *
 * Stored shape per-ingredient (and optionally per-recipe override
 * later):
 *   {
 *     kcal: 380, kj: 1590,
 *     fat: 12, saturates: 4,
 *     carbs: 55, sugars: 6,
 *     protein: 11, salt: 0.8,
 *     fibre: 4
 *   }
 * All values per 100g (for solids) or per 100ml (for liquids); nulls
 * allowed where unknown.
 */

export type NutritionKey =
  | 'kcal'
  | 'kj'
  | 'fat'
  | 'saturates'
  | 'carbs'
  | 'sugars'
  | 'protein'
  | 'salt'
  | 'fibre';

export type NutritionState = Partial<Record<NutritionKey, number>>;

export const NUTRITION_FIELDS: Array<{
  key: NutritionKey;
  label: string;
  sub?: string;
  unit: string;
  /** Indent sub-fields ("of which sugars" under Carbohydrate, etc.) */
  indent?: boolean;
}> = [
  { key: 'kcal', label: 'Energy', unit: 'kcal' },
  { key: 'kj', label: 'Energy', unit: 'kJ' },
  { key: 'fat', label: 'Fat', unit: 'g' },
  { key: 'saturates', label: 'of which saturates', unit: 'g', indent: true },
  { key: 'carbs', label: 'Carbohydrate', unit: 'g' },
  { key: 'sugars', label: 'of which sugars', unit: 'g', indent: true },
  { key: 'fibre', label: 'Fibre', unit: 'g' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'salt', label: 'Salt', unit: 'g' },
];

// FoP traffic-light thresholds per 2013 UK DH guidance, per 100g of
// finished food. Format: [low/med boundary, med/high boundary].
const FOP_THRESHOLDS: Partial<Record<NutritionKey, [number, number]>> = {
  fat: [3.0, 17.5],
  saturates: [1.5, 5.0],
  sugars: [5.0, 22.5],
  salt: [0.3, 1.5],
};

export type FopLight = 'low' | 'med' | 'high';

export const FOP_LABEL: Record<FopLight, string> = {
  low: 'LOW',
  med: 'MED',
  high: 'HIGH',
};

export const FOP_LIGHT_CLASS: Record<FopLight, string> = {
  low: 'bg-healthy/10 text-healthy border-healthy/40',
  med: 'bg-attention/10 text-attention border-attention/40',
  high: 'bg-urgent/10 text-urgent border-urgent/40',
};

/** Traffic-light for a per-100g value, or null when no rule exists. */
export function trafficLight(
  key: NutritionKey,
  valuePer100g: number,
): FopLight | null {
  const t = FOP_THRESHOLDS[key];
  if (!t) return null;
  if (valuePer100g <= t[0]) return 'low';
  if (valuePer100g <= t[1]) return 'med';
  return 'high';
}

/** Normalise raw jsonb from Postgres to a usable shape. */
export function parseNutrition(raw: unknown): NutritionState {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  const out: NutritionState = {};
  for (const f of NUTRITION_FIELDS) {
    const v = r[f.key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      out[f.key] = v;
    } else if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v);
      if (Number.isFinite(n)) out[f.key] = n;
    }
  }
  return out;
}

/**
 * Convert (qty, unit) into grams/ml. Mirrors the legacy toGrams helper.
 * Returns null if the unit isn't weight/volume convertible (e.g. each,
 * dozen, case) — that ingredient can't contribute to nutrition.
 */
export function toGramsOrMl(qty: number, unit: string | null): number | null {
  if (!Number.isFinite(qty) || qty <= 0) return null;
  const u = (unit ?? '').toLowerCase().trim();
  if (u === 'g' || u === 'ml') return qty;
  if (u === 'kg' || u === 'l') return qty * 1000;
  return null;
}

/** True when the ingredient row has at least one numeric nutrition value. */
export function hasAnyNutrition(n: NutritionState): boolean {
  return NUTRITION_FIELDS.some(
    (f) => typeof n[f.key] === 'number' && Number.isFinite(n[f.key]),
  );
}

/**
 * Aggregate ingredient nutrition into a single recipe summary.
 *
 * Each ingredient brings:
 *   - per-100g values: ingredient.nutrition[key]
 *   - weight (g or ml): toGramsOrMl(qty, unit)
 *
 * We sum the absolute totals (value × weight / 100) across all
 * contributing ingredients, then normalise back to per-100g of the
 * total contributing weight. Coverage is the fraction of total
 * declared weight that had any nutrition data — chef sees a warning
 * when <100%.
 */
export type RecipeNutritionSummary = {
  per100g: NutritionState;
  perPortion: NutritionState;
  totalWeightG: number;
  coveredWeightG: number;
  coveragePct: number;
  hasData: boolean;
};

export function aggregateRecipeNutrition(
  ingredients: Array<{
    qty: number;
    unit: string | null;
    nutrition: NutritionState | null;
  }>,
  serves: number | null,
  portionPerCover: number | null,
): RecipeNutritionSummary {
  let totalWeight = 0;
  let coveredWeight = 0;
  const absoluteTotals: Partial<Record<NutritionKey, number>> = {};

  for (const ing of ingredients) {
    const w = toGramsOrMl(ing.qty, ing.unit);
    if (w == null) continue;
    totalWeight += w;
    const n = ing.nutrition;
    if (!n || !hasAnyNutrition(n)) continue;
    coveredWeight += w;
    for (const f of NUTRITION_FIELDS) {
      const v = n[f.key];
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      // value is per 100g → ingredient contribution = v × w / 100
      const contribution = (v * w) / 100;
      absoluteTotals[f.key] = (absoluteTotals[f.key] ?? 0) + contribution;
    }
  }

  const coveragePct =
    totalWeight === 0 ? 0 : (coveredWeight / totalWeight) * 100;

  // Per-100g of the COVERED weight (so values represent what's been
  // declared — not artificially diluted by unknown bits).
  const per100g: NutritionState = {};
  if (coveredWeight > 0) {
    for (const [k, v] of Object.entries(absoluteTotals)) {
      per100g[k as NutritionKey] = (v! * 100) / coveredWeight;
    }
  }

  // Per portion: take absolute totals (the whole recipe yield) and
  // divide by serves × portionPerCover. If portion/serves unknown,
  // fall back to "the whole batch" — chef sees the per-portion column
  // as null and adjusts the recipe to fill it.
  const perPortion: NutritionState = {};
  const portionDivisor =
    serves != null && serves > 0 && portionPerCover != null && portionPerCover > 0
      ? serves / portionPerCover
      : null;
  if (portionDivisor != null) {
    for (const [k, v] of Object.entries(absoluteTotals)) {
      perPortion[k as NutritionKey] = v! / portionDivisor;
    }
  }

  return {
    per100g,
    perPortion,
    totalWeightG: totalWeight,
    coveredWeightG: coveredWeight,
    coveragePct,
    hasData: coveredWeight > 0,
  };
}
