'use client';

import { useState, useTransition } from 'react';
import { addPrepItem } from './actions';

type RecipeOption = { id: string; name: string };

const DEFAULT_STATIONS = ['Garde Manger', 'Grill', 'Pass', 'Pastry'];
const DEFAULT_UNITS = ['kg', 'g', 'L', 'each', 'portions', 'batch'];

export function AddPrepItemDialog({
  prepDate,
  recipes,
  knownStations,
}: {
  prepDate: string;
  recipes: RecipeOption[];
  knownStations: string[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [station, setStation] = useState(knownStations[0] ?? DEFAULT_STATIONS[0]);
  const [qty, setQty] = useState('');
  const [qtyUnit, setQtyUnit] = useState('kg');
  const [recipeId, setRecipeId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const stations = Array.from(
    new Set([...knownStations, ...DEFAULT_STATIONS]),
  );

  function reset() {
    setName('');
    setQty('');
    setQtyUnit('kg');
    setRecipeId('');
    setNotes('');
    setError(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function submit() {
    if (pending) return;
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give the prep item a name.');
      return;
    }

    const qtyNum = qty.trim() === '' ? null : Number(qty);
    if (qtyNum != null && Number.isNaN(qtyNum)) {
      setError('Quantity must be a number.');
      return;
    }

    startTransition(async () => {
      const res = await addPrepItem({
        name: trimmed,
        station,
        qty: qtyNum,
        qty_unit: qtyNum != null ? qtyUnit : null,
        recipe_id: recipeId || null,
        notes: notes.trim() || null,
        prep_date: prepDate,
      });
      if (!res.ok) {
        setError(humaniseError(res.error));
        return;
      }
      close();
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
            Add prep item
          </div>
          <div className="font-serif italic text-xs text-muted mt-0.5">
            recipe-linked or one-off
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
          <div className="relative bg-paper border border-rule shadow-[0_24px_60px_rgba(26,22,18,0.18)] max-w-[520px] w-full max-h-[90vh] overflow-y-auto">
            <div className="px-7 pt-6 pb-3 border-b border-rule">
              <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold mb-2">
                New prep item
              </div>
              <h2 className="font-display text-2xl font-semibold uppercase tracking-[0.04em] text-ink">
                Add to today's board
              </h2>
            </div>

            <div className="px-7 py-6 flex flex-col gap-4">
              <Field label="Name">
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Hummus base, Lamb brine, Brunoise carrot"
                  className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Station">
                  <select
                    value={station}
                    onChange={(e) => setStation(e.target.value)}
                    className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
                  >
                    {stations.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Quantity (optional)">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      placeholder="2"
                      className="flex-1 min-w-0 px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
                    />
                    <select
                      value={qtyUnit}
                      onChange={(e) => setQtyUnit(e.target.value)}
                      className="px-2 py-2 border border-rule bg-card font-sans text-sm text-ink focus:outline-none focus:border-gold"
                    >
                      {DEFAULT_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </Field>
              </div>

              <Field label="Link to recipe (optional)">
                <select
                  value={recipeId}
                  onChange={(e) => setRecipeId(e.target.value)}
                  className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
                >
                  <option value="">— one-off, not from a recipe —</option>
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Notes (optional)">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="anything the chef should know"
                  className="w-full px-3 py-2 border border-rule bg-card font-serif italic text-sm text-ink resize-none focus:outline-none focus:border-gold"
                />
              </Field>

              {error && (
                <div className="bg-card border border-l-4 border-l-urgent border-rule px-4 py-3 font-serif italic text-sm text-ink-soft">
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
                {pending ? 'Adding…' : 'Add to board'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function humaniseError(code: string): string {
  switch (code) {
    case 'name_required':
      return 'Give the prep item a name.';
    case 'station_required':
      return 'Pick a station for this item.';
    case 'no_membership':
      return 'No site membership — try signing back in.';
    case 'insert_failed':
      return "The system couldn't save that. Try again.";
    default:
      return code;
  }
}
