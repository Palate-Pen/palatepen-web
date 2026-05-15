'use client';

import {
  NUTRITION_FIELDS,
  type NutritionKey,
  type NutritionState,
} from '@/lib/nutrition';

/**
 * Per-100g nutrition editor. Used on the Bank IngredientForm so the
 * chef can capture values from a supplier spec sheet — the recipe
 * detail page then aggregates them up via aggregateRecipeNutrition.
 *
 * Caller owns the value state; this is a controlled grid.
 */
export function NutritionPanel({
  value,
  onChange,
  readOnly,
}: {
  value: NutritionState;
  onChange: (next: NutritionState) => void;
  readOnly?: boolean;
}) {
  function update(key: NutritionKey, raw: string) {
    const next = { ...value };
    const trimmed = raw.trim();
    if (trimmed === '') {
      delete next[key];
    } else {
      const n = Number(trimmed);
      if (Number.isFinite(n) && n >= 0) {
        next[key] = n;
      } else {
        delete next[key];
      }
    }
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-serif italic text-xs text-muted leading-relaxed">
        Per 100g (for solids) or per 100ml (for liquids). Leave a field blank when unknown — recipes only count ingredients with declared values, and show a coverage % when partial.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2">
        {NUTRITION_FIELDS.map((f) => {
          const v = value[f.key];
          return (
            <label
              key={f.key}
              className={
                'flex items-center gap-3 py-1 ' +
                (f.indent ? 'md:pl-4' : '')
              }
            >
              <span
                className={
                  'font-serif text-sm min-w-0 flex-1 truncate ' +
                  (f.indent ? 'italic text-muted' : 'text-ink')
                }
              >
                {f.label}
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={v == null ? '' : String(v)}
                  onChange={(e) => update(f.key, e.target.value)}
                  disabled={readOnly}
                  placeholder="—"
                  className="w-[64px] px-2 py-1 border border-rule bg-card font-serif text-sm text-ink text-right focus:outline-none focus:border-gold disabled:opacity-50"
                />
                <span className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted-soft w-8">
                  {f.unit}
                </span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
