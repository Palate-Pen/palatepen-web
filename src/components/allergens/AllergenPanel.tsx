'use client';

import {
  ALLERGENS,
  GLUTEN_TYPES,
  NUT_TYPES,
  allergenTriFor,
  setAllergenTri,
  toggleSubType,
  type AllergenKey,
  type AllergenState,
  type AllergenTri,
} from '@/lib/allergens';

const TRI_LABEL: Record<AllergenTri, string> = {
  none: 'None',
  may: 'May',
  contains: 'Contains',
};

const TRI_CLASS: Record<AllergenTri, { active: string; inactive: string }> = {
  none: {
    active: 'bg-paper-warm border-rule text-ink',
    inactive: 'bg-transparent border-rule text-muted-soft',
  },
  may: {
    active: 'bg-attention/10 border-attention/40 text-attention',
    inactive: 'bg-transparent border-rule text-muted-soft',
  },
  contains: {
    active: 'bg-urgent/10 border-urgent/40 text-urgent',
    inactive: 'bg-transparent border-rule text-muted-soft',
  },
};

/**
 * UK FIR 14-allergen tri-state grid. Used inside RecipeForm + IngredientForm.
 * Caller owns the `value` state and gets `onChange` whenever the chef
 * flips a row or toggles a sub-type.
 *
 * Renders compactly — two-column allergen list, then conditional
 * nut-type and gluten-type sub-panels when the parent allergen is
 * declared as Contains.
 */
export function AllergenPanel({
  value,
  onChange,
  readOnly,
}: {
  value: AllergenState;
  onChange: (next: AllergenState) => void;
  readOnly?: boolean;
}) {
  const nutsContained = value.contains.includes('nuts');
  const glutenContained = value.contains.includes('gluten');

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted mb-2">
          UK FIR 14 mandatory allergens
        </div>
        <p className="font-serif italic text-xs text-muted leading-relaxed mb-3">
          Tri-state per allergen — None, May (cross-contamination risk), Contains. Sub-types appear below when nuts or gluten is in Contains.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
          {ALLERGENS.map((a) => (
            <AllergenRow
              key={a.key}
              allergen={a}
              tri={allergenTriFor(value, a.key)}
              readOnly={readOnly}
              onChange={(tri) => onChange(setAllergenTri(value, a.key, tri))}
            />
          ))}
        </div>
      </div>

      {nutsContained && (
        <SubTypePanel
          title="Specific tree nuts (FIR requirement)"
          options={NUT_TYPES}
          selected={value.nutTypes}
          readOnly={readOnly}
          onToggle={(v) => onChange(toggleSubType(value, 'nutTypes', v))}
        />
      )}

      {glutenContained && (
        <SubTypePanel
          title="Specific cereals (FIR requirement)"
          options={GLUTEN_TYPES}
          selected={value.glutenTypes}
          readOnly={readOnly}
          onToggle={(v) => onChange(toggleSubType(value, 'glutenTypes', v))}
        />
      )}
    </div>
  );
}

function AllergenRow({
  allergen,
  tri,
  readOnly,
  onChange,
}: {
  allergen: { key: AllergenKey; label: string; short: string };
  tri: AllergenTri;
  readOnly?: boolean;
  onChange: (tri: AllergenTri) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-rule-soft last:border-b-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-muted-soft w-7 text-center">
          {allergen.short}
        </span>
        <span className="font-serif text-sm text-ink">{allergen.label}</span>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        {(['none', 'may', 'contains'] as AllergenTri[]).map((option) => {
          const isActive = tri === option;
          const klass = TRI_CLASS[option];
          return (
            <button
              key={option}
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && onChange(option)}
              className={
                'font-display font-semibold text-[10px] tracking-[0.18em] uppercase px-2 py-1 border transition-colors disabled:cursor-not-allowed ' +
                (isActive ? klass.active : klass.inactive) +
                (!readOnly ? ' hover:border-gold cursor-pointer' : '')
              }
            >
              {TRI_LABEL[option]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SubTypePanel({
  title,
  options,
  selected,
  readOnly,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: string[];
  readOnly?: boolean;
  onToggle: (value: string) => void;
}) {
  return (
    <div className="bg-card border border-rule border-l-4 border-l-urgent px-4 py-3">
      <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-urgent mb-2">
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const isActive = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && onToggle(option)}
              className={
                'font-display font-semibold text-[10px] tracking-[0.18em] uppercase px-2.5 py-1 border transition-colors disabled:cursor-not-allowed ' +
                (isActive
                  ? 'bg-urgent/10 border-urgent/40 text-urgent'
                  : 'bg-transparent border-rule text-muted hover:border-urgent/40 cursor-pointer')
              }
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Read-only render of allergens as chips for detail pages / cards. */
export function AllergenChips({
  value,
  size = 'sm',
}: {
  value: AllergenState;
  size?: 'sm' | 'md';
}) {
  const sizeClass =
    size === 'md' ? 'text-xs px-2.5 py-1' : 'text-[10px] px-2 py-0.5';
  if (
    value.contains.length === 0 &&
    value.mayContain.length === 0
  ) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {value.contains.map((k) => (
        <span
          key={'c-' + k}
          className={
            'font-display font-semibold tracking-[0.18em] uppercase bg-urgent/10 text-urgent border border-urgent/40 ' +
            sizeClass
          }
          title={`Contains ${k}`}
        >
          {ALLERGENS.find((a) => a.key === k)?.short ?? k.toUpperCase()}
        </span>
      ))}
      {value.mayContain.map((k) => (
        <span
          key={'m-' + k}
          className={
            'font-display font-semibold tracking-[0.18em] uppercase bg-attention/10 text-attention border border-attention/40 border-dashed ' +
            sizeClass
          }
          title={`May contain ${k}`}
        >
          {ALLERGENS.find((a) => a.key === k)?.short ?? k.toUpperCase()}
        </span>
      ))}
    </div>
  );
}
