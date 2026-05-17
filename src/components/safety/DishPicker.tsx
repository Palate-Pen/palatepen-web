'use client';

import { useMemo, useState } from 'react';
import type {
  DishOption,
  DishPickerBands,
} from '@/lib/safety/dish-picker';

type Band = 'todays_menu' | 'prep_items' | 'library';

const BAND_LABEL: Record<Band, string> = {
  todays_menu: "Today's menu",
  prep_items: 'Prep items',
  library: 'Recipe library',
};

export type DishPickerValue = {
  recipe_id: string | null;
  text: string;
};

export function DishPicker({
  bands,
  value,
  onChange,
  label = 'Dish involved',
  meta = 'pick from the menu, or type one',
  placeholder = 'e.g. Knafeh · Slow-cooked lamb shoulder · staff bread',
  required = false,
}: {
  bands: DishPickerBands;
  value: DishPickerValue;
  onChange: (next: DishPickerValue) => void;
  label?: string;
  meta?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const initialBand: Band =
    bands.todays_menu.length > 0
      ? 'todays_menu'
      : bands.prep_items.length > 0
        ? 'prep_items'
        : 'library';
  const [band, setBand] = useState<Band>(initialBand);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filteredOptions = useMemo<DishOption[]>(() => {
    const list =
      band === 'todays_menu'
        ? bands.todays_menu
        : band === 'prep_items'
          ? bands.prep_items
          : bands.library;
    if (!search.trim()) return list.slice(0, 30);
    const q = search.toLowerCase();
    return list.filter((d) => d.name.toLowerCase().includes(q)).slice(0, 30);
  }, [band, search, bands]);

  function pick(opt: DishOption) {
    onChange({ recipe_id: opt.recipe_id, text: opt.name });
    setOpen(false);
    setSearch('');
  }

  function clear() {
    onChange({ recipe_id: null, text: '' });
  }

  const linked = value.recipe_id != null;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
        <label className="font-display font-semibold text-[12px] tracking-[0.25em] uppercase text-ink">
          {label}
          {required && <span className="text-urgent ml-1">*</span>}
        </label>
        <span className="font-serif italic text-xs text-muted">{meta}</span>
      </div>

      <div className="flex gap-2 mb-2 flex-wrap">
        <input
          type="text"
          value={value.text}
          onChange={(e) =>
            onChange({ recipe_id: null, text: e.target.value })
          }
          placeholder={placeholder}
          className="flex-1 min-w-[200px] px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={
            'font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-4 py-2.5 border transition-colors ' +
            (open
              ? 'bg-gold text-paper border-gold'
              : 'bg-transparent text-gold border-gold hover:bg-gold hover:text-paper')
          }
        >
          {open ? 'Close' : 'Pick from menu'}
        </button>
      </div>

      {linked && (
        <div className="inline-flex items-center gap-2 bg-gold-bg border border-gold/40 px-3 py-1.5 mb-2">
          <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold-dark">
            Linked recipe
          </span>
          <button
            type="button"
            onClick={clear}
            aria-label="Unlink recipe"
            className="font-display text-xs text-gold-dark hover:text-urgent leading-none"
          >
            {String.fromCharCode(0xd7)}
          </button>
        </div>
      )}

      {open && (
        <div className="border border-rule bg-card mt-2">
          <div className="flex border-b border-rule">
            {(Object.keys(BAND_LABEL) as Band[]).map((b) => {
              const active = band === b;
              const count =
                b === 'todays_menu'
                  ? bands.todays_menu.length
                  : b === 'prep_items'
                    ? bands.prep_items.length
                    : bands.library.length;
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => {
                    setBand(b);
                    setSearch('');
                  }}
                  className={
                    'flex-1 px-4 py-3 font-display font-semibold text-[11px] tracking-[0.18em] uppercase border-b-2 transition-colors ' +
                    (active
                      ? 'border-gold text-gold bg-gold-bg'
                      : 'border-transparent text-muted hover:text-ink')
                  }
                >
                  {BAND_LABEL[b]}
                  <span className="ml-1.5 text-muted-soft font-mono text-[10px]">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="px-4 py-3 border-b border-rule">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              placeholder={`search ${BAND_LABEL[band].toLowerCase()}...`}
              className="w-full px-3 py-2 border border-rule bg-paper font-serif text-sm text-ink focus:border-gold focus:outline-none"
            />
          </div>

          <div className="max-h-[280px] overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-4 font-serif italic text-sm text-muted">
                {band === 'todays_menu'
                  ? 'Nothing on the live menu yet. Try the Recipe library tab, or type the dish above.'
                  : band === 'prep_items'
                    ? "Nothing on today's prep board with a linked recipe."
                    : 'No recipes match. Try a different search or type the dish above.'}
              </div>
            ) : (
              filteredOptions.map((opt, i) => (
                <button
                  key={opt.recipe_id}
                  type="button"
                  onClick={() => pick(opt)}
                  className={
                    'w-full text-left px-4 py-3 hover:bg-paper-warm flex items-center justify-between gap-3 ' +
                    (i < filteredOptions.length - 1
                      ? 'border-b border-rule-soft'
                      : '')
                  }
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-serif font-semibold text-sm text-ink truncate">
                      {opt.name}
                    </div>
                    {opt.context && (
                      <div className="font-sans text-xs text-muted mt-0.5 truncate">
                        {opt.context}
                      </div>
                    )}
                  </div>
                  <span className="font-display font-semibold text-[9px] tracking-[0.18em] uppercase text-muted-soft flex-shrink-0">
                    {opt.dish_type === 'bar' ? 'Bar' : 'Food'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
