'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { logWaste } from './actions';
import type { WasteCategory } from '@/lib/waste';

export type BankIngredientOption = {
  id: string;
  name: string;
  unit: string | null;
  current_price: number | null;
};

const CATEGORY_OPTIONS: Array<{ value: WasteCategory; label: string; sub: string }> = [
  { value: 'over_prep', label: 'Over-prep', sub: 'too much made for the day' },
  { value: 'spoilage', label: 'Spoilage', sub: 'went off in storage' },
  { value: 'trim', label: 'Trim', sub: 'unavoidable from prep' },
  { value: 'accident', label: 'Accident', sub: 'dropped, overcooked, fired wrong' },
  { value: 'customer_return', label: 'Returned', sub: 'came back from the pass' },
  { value: 'other', label: 'Other', sub: 'with a reason note' },
];

const UNIT_OPTIONS = ['g', 'kg', 'ml', 'L', 'each', 'portions', 'bunch', 'punnet'];

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

export function LogWasteDialog({
  bankIngredients,
}: {
  bankIngredients: BankIngredientOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [ingredientId, setIngredientId] = useState<string | null>(null);
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('g');
  const [category, setCategory] = useState<WasteCategory>('over_prep');
  const [reason, setReason] = useState('');
  const [valueOverride, setValueOverride] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const bankByName = useMemo(
    () =>
      new Map<string, BankIngredientOption>(
        bankIngredients.map((b) => [b.name.toLowerCase().trim(), b]),
      ),
    [bankIngredients],
  );

  const matchedIngredient =
    ingredientId != null
      ? bankIngredients.find((b) => b.id === ingredientId) ?? null
      : null;

  const qtyNum = Number(qty);
  const previewValue =
    matchedIngredient?.current_price != null && Number.isFinite(qtyNum) && qtyNum > 0
      ? Math.round(matchedIngredient.current_price * qtyNum * 100) / 100
      : null;

  function onNameChange(next: string) {
    setName(next);
    const match = bankByName.get(next.toLowerCase().trim());
    if (match) {
      setIngredientId(match.id);
      if (match.unit) setUnit(match.unit);
    } else {
      setIngredientId(null);
    }
  }

  function close() {
    setOpen(false);
    setName('');
    setIngredientId(null);
    setQty('');
    setUnit('g');
    setCategory('over_prep');
    setReason('');
    setValueOverride('');
    setError(null);
  }

  function submit() {
    if (pending) return;
    setError(null);

    if (!name.trim()) {
      setError('What got binned?');
      return;
    }
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      setError('Quantity must be a positive number.');
      return;
    }
    if (!unit.trim()) {
      setError('Pick a unit.');
      return;
    }
    const valueNum =
      valueOverride.trim() === '' ? null : Number(valueOverride);
    if (valueNum != null && (!Number.isFinite(valueNum) || valueNum < 0)) {
      setError('Value must be a non-negative number, or leave blank.');
      return;
    }

    startTransition(async () => {
      const res = await logWaste({
        ingredient_id: ingredientId,
        name: name.trim(),
        qty: qtyNum,
        qty_unit: unit,
        category,
        reason_md: reason.trim() || null,
        value: valueNum,
      });
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
      <datalist id="bank-ingredient-names-waste">
        {bankIngredients.map((b) => (
          <option key={b.id} value={b.name} />
        ))}
      </datalist>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors whitespace-nowrap"
      >
        + Log waste
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink/40">
          <div
            className="absolute inset-0"
            onClick={close}
            aria-hidden="true"
          />
          <div className="relative bg-paper border border-rule shadow-[0_24px_60px_rgba(26,22,18,0.18)] max-w-[560px] w-full max-h-[90vh] overflow-y-auto">
            <div className="px-7 pt-6 pb-3 border-b border-rule">
              <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold mb-2">
                Log waste
              </div>
              <h2 className="font-display text-2xl font-semibold uppercase tracking-[0.04em] text-ink">
                What got binned?
              </h2>
            </div>

            <div className="px-7 py-6 flex flex-col gap-4">
              <Field label="Ingredient or item">
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  list="bank-ingredient-names-waste"
                  placeholder="e.g. Lamb shoulder, herbs, trim"
                  maxLength={120}
                  className={
                    'w-full px-3 py-2 border bg-card font-serif font-semibold text-base text-ink focus:outline-none focus:border-gold ' +
                    (matchedIngredient ? 'border-healthy/40' : 'border-rule')
                  }
                />
                <span className="font-serif italic text-[11px] min-h-[14px]">
                  {matchedIngredient ? (
                    <span className="text-healthy">
                      ● linked to The Bank · value will snapshot from current price
                    </span>
                  ) : name.trim() ? (
                    <span className="text-muted-soft">
                      ○ free-text · enter the £ value yourself below
                    </span>
                  ) : (
                    <span>&nbsp;</span>
                  )}
                </span>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    placeholder="e.g. 250"
                    className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
                  />
                </Field>
                <Field label="Unit">
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-rule bg-card font-sans text-sm text-ink focus:outline-none focus:border-gold"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Category">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {CATEGORY_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      className={
                        'flex flex-col items-start gap-0.5 px-3 py-2 border transition-colors text-left ' +
                        (category === c.value
                          ? 'bg-gold-bg border-gold text-ink'
                          : 'bg-card border-rule text-ink-soft hover:border-gold')
                      }
                    >
                      <span className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase">
                        {c.label}
                      </span>
                      <span className="font-serif italic text-[11px] text-muted leading-tight">
                        {c.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </Field>

              <Field
                label={
                  matchedIngredient
                    ? 'Value override (optional)'
                    : 'Value £ (optional)'
                }
              >
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valueOverride}
                  onChange={(e) => setValueOverride(e.target.value)}
                  placeholder={
                    previewValue != null
                      ? `auto: ${gbp.format(previewValue)} — type to override`
                      : 'leave blank if unknown'
                  }
                  className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
                />
                {previewValue != null && valueOverride.trim() === '' && (
                  <span className="font-serif italic text-xs text-muted">
                    Will snapshot {gbp.format(previewValue)} from The Bank
                  </span>
                )}
              </Field>

              <Field label="Reason (optional)">
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="What happened?"
                  className="w-full px-3 py-2 border border-rule bg-card font-serif italic text-sm text-ink-soft resize-none focus:outline-none focus:border-gold"
                  maxLength={400}
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
                {pending ? 'Logging…' : 'Log waste'}
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
      return 'What got binned?';
    case 'invalid_qty':
      return 'Quantity must be a positive number.';
    case 'unit_required':
      return 'Pick a unit.';
    case 'invalid_category':
      return 'Pick a category.';
    case 'invalid_value':
      return 'Value must be a non-negative number.';
    case 'no_membership':
      return 'No site membership — try signing back in.';
    default:
      return code;
  }
}
