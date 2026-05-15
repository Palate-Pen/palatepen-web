'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addPrepItems } from './actions';

type RecipeOption = { id: string; name: string };
type SavedItem = {
  name: string;
  station: string;
  recipe_id: string | null;
  qty: number | null;
  qty_unit: string | null;
  last_prepped_on: string;
};

const DEFAULT_STATIONS = ['Garde Manger', 'Grill', 'Pass', 'Pastry'];
const DEFAULT_UNITS = ['kg', 'g', 'L', 'each', 'portions', 'batch'];

type DraftRow = {
  key: string;
  name: string;
  station: string;
  qty: string;
  qty_unit: string;
  recipe_id: string;
  notes: string;
};

function newRow(defaultStation: string): DraftRow {
  return {
    key:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    name: '',
    station: defaultStation,
    qty: '',
    qty_unit: 'kg',
    recipe_id: '',
    notes: '',
  };
}

export function AddPrepItemDialog({
  prepDate,
  recipes,
  knownStations,
  savedItems = [],
}: {
  prepDate: string;
  recipes: RecipeOption[];
  knownStations: string[];
  savedItems?: SavedItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const defaultStation = knownStations[0] ?? DEFAULT_STATIONS[0];
  const [rows, setRows] = useState<DraftRow[]>([newRow(defaultStation)]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const stations = Array.from(
    new Set([...knownStations, ...DEFAULT_STATIONS]),
  );

  function reset() {
    setRows([newRow(defaultStation)]);
    setError(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function updateRow(key: string, patch: Partial<DraftRow>) {
    setRows((cur) => cur.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setRows((cur) => (cur.length <= 1 ? cur : cur.filter((r) => r.key !== key)));
  }

  function addBlank() {
    setRows((cur) => [...cur, newRow(defaultStation)]);
  }

  /** Pre-fill a row from a saved-bank item. Always lands at the end. */
  function addFromSaved(s: SavedItem) {
    setRows((cur) => [
      ...cur,
      {
        ...newRow(s.station),
        name: s.name,
        station: s.station,
        qty: s.qty != null ? String(s.qty) : '',
        qty_unit: s.qty_unit ?? 'kg',
        recipe_id: s.recipe_id ?? '',
      },
    ]);
  }

  function submit() {
    if (pending) return;
    setError(null);

    const filled = rows.filter((r) => r.name.trim() !== '');
    if (filled.length === 0) {
      setError('Add at least one row with a name.');
      return;
    }

    const inputs = filled.map((r) => {
      const qtyNum = r.qty.trim() === '' ? null : Number(r.qty);
      return {
        name: r.name.trim(),
        station: r.station,
        qty: qtyNum != null && !Number.isNaN(qtyNum) ? qtyNum : null,
        qty_unit: qtyNum != null ? r.qty_unit : null,
        recipe_id: r.recipe_id || null,
        notes: r.notes.trim() || null,
        prep_date: prepDate,
      };
    });

    startTransition(async () => {
      const res = await addPrepItems(inputs);
      if (!res.ok) {
        setError(humaniseError(res.error));
        return;
      }
      close();
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-card border border-rule px-5 py-4 min-w-[240px] flex items-center gap-3.5 cursor-pointer transition-all hover:border-rule-gold hover:-translate-y-px"
      >
        <div className="w-10 h-10 border border-gold rounded-sm flex items-center justify-center text-gold bg-gold-bg flex-shrink-0">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <div className="text-left">
          <div className="font-serif font-semibold text-base text-ink leading-tight">
            Add prep items
          </div>
          <div className="font-serif italic text-xs text-muted mt-0.5">
            one row or many · recipe-linked or one-off
          </div>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink/40">
          <div
            className="absolute inset-0"
            onClick={close}
            aria-hidden="true"
          />
          <div className="relative bg-paper border border-rule shadow-[0_24px_60px_rgba(26,22,18,0.18)] max-w-[920px] w-full max-h-[90vh] overflow-y-auto">
            <div className="px-7 pt-6 pb-3 border-b border-rule">
              <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold mb-2">
                New prep items
              </div>
              <h2 className="font-display text-2xl font-semibold uppercase tracking-[0.04em] text-ink">
                Add to the board
              </h2>
              <p className="font-serif italic text-sm text-muted mt-1.5">
                Add as many rows as you need. Pick from the bank below to skip the typing.
              </p>
            </div>

            {savedItems.length > 0 && (
              <div className="px-7 py-4 border-b border-rule bg-paper-warm">
                <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted mb-2.5">
                  Saved Prep · pick to add
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
                  {savedItems.map((s) => (
                    <button
                      key={`${s.name}|${s.station}`}
                      type="button"
                      onClick={() => addFromSaved(s)}
                      className="font-serif text-xs text-ink bg-card border border-rule px-2.5 py-1 hover:border-gold hover:text-gold transition-colors"
                      title={`Last prepped ${s.last_prepped_on}`}
                    >
                      {s.name}
                      <span className="font-display font-semibold text-[9px] tracking-[0.18em] uppercase text-muted-soft ml-1.5">
                        {s.station}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="px-7 py-5 flex flex-col gap-2">
              <div className="hidden md:grid grid-cols-[minmax(220px,2fr)_130px_130px_140px_minmax(140px,1fr)_28px] gap-2 px-2 py-1">
                {['Name', 'Station', 'Quantity', 'Recipe', 'Notes', ''].map((h) => (
                  <div
                    key={h}
                    className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-muted"
                  >
                    {h}
                  </div>
                ))}
              </div>

              {rows.map((r, i) => (
                <div
                  key={r.key}
                  className="grid grid-cols-1 md:grid-cols-[minmax(220px,2fr)_130px_130px_140px_minmax(140px,1fr)_28px] gap-2 items-start"
                >
                  <input
                    type="text"
                    value={r.name}
                    onChange={(e) => updateRow(r.key, { name: e.target.value })}
                    placeholder={i === 0 ? 'e.g. Hummus base' : 'next item'}
                    className="w-full px-3 py-2 border border-rule bg-card font-serif text-sm text-ink focus:outline-none focus:border-gold"
                    autoFocus={i === 0}
                  />
                  <select
                    value={r.station}
                    onChange={(e) => updateRow(r.key, { station: e.target.value })}
                    className="w-full px-2 py-2 border border-rule bg-card font-serif text-sm text-ink focus:outline-none focus:border-gold"
                  >
                    {stations.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      step="0.1"
                      value={r.qty}
                      onChange={(e) => updateRow(r.key, { qty: e.target.value })}
                      placeholder="qty"
                      className="flex-1 min-w-0 px-2 py-2 border border-rule bg-card font-serif text-sm text-ink focus:outline-none focus:border-gold"
                    />
                    <select
                      value={r.qty_unit}
                      onChange={(e) => updateRow(r.key, { qty_unit: e.target.value })}
                      className="px-1.5 py-2 border border-rule bg-card font-sans text-xs text-ink focus:outline-none focus:border-gold"
                    >
                      {DEFAULT_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                  <select
                    value={r.recipe_id}
                    onChange={(e) => updateRow(r.key, { recipe_id: e.target.value })}
                    className="w-full px-2 py-2 border border-rule bg-card font-serif text-sm text-ink focus:outline-none focus:border-gold"
                  >
                    <option value="">one-off</option>
                    {recipes.map((rec) => (
                      <option key={rec.id} value={rec.id}>
                        {rec.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={r.notes}
                    onChange={(e) => updateRow(r.key, { notes: e.target.value })}
                    placeholder="optional"
                    className="w-full px-2 py-2 border border-rule bg-card font-serif italic text-xs text-ink focus:outline-none focus:border-gold"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(r.key)}
                    disabled={rows.length === 1}
                    className="w-7 h-9 flex items-center justify-center text-muted-soft hover:text-urgent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Remove row"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addBlank}
                className="self-start mt-2 font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold hover:text-gold-dark transition-colors bg-transparent border-0 p-0 cursor-pointer"
              >
                + Add another row
              </button>

              {error && (
                <div className="mt-2 bg-card border border-l-4 border-l-urgent border-rule px-4 py-3 font-serif italic text-sm text-ink-soft">
                  {error}
                </div>
              )}
            </div>

            <div className="px-7 pb-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-transparent text-muted border border-rule hover:border-gold hover:text-gold transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {pending
                  ? 'Adding…'
                  : `Add ${rows.filter((r) => r.name.trim()).length || ''} to board`.trim()}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function humaniseError(code: string): string {
  if (code.endsWith('_name_required')) return 'Every row needs a name. Drop any blank ones.';
  if (code.endsWith('_station_required')) return 'Every row needs a station.';
  switch (code) {
    case 'no_membership':
      return 'No site membership — try signing back in.';
    default:
      return code;
  }
}
