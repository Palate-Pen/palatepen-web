'use client';

import { useMemo, useState, useTransition } from 'react';
import { updatePurchaseOrderLinesAction } from '../actions';

type LineDraft = {
  key: string;
  ingredient_id: string | null;
  raw_name: string;
  qty: string;
  qty_unit: string;
  unit_price: string;
  notes: string;
};

type BankIngredient = {
  id: string;
  name: string;
  unit: string | null;
  current_price: number | null;
};

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

function randomKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function newLine(): LineDraft {
  return {
    key: randomKey(),
    ingredient_id: null,
    raw_name: '',
    qty: '',
    qty_unit: 'each',
    unit_price: '',
    notes: '',
  };
}

export function PoLineEditor({
  poId,
  initial,
  initialExpectedAt,
  initialNotes,
  bankIngredients,
  readOnly,
}: {
  poId: string;
  initial: LineDraft[];
  initialExpectedAt: string | null;
  initialNotes: string;
  bankIngredients: BankIngredient[];
  readOnly?: boolean;
}) {
  const [lines, setLines] = useState<LineDraft[]>(
    initial.length === 0 ? [newLine()] : initial,
  );
  const [notes, setNotes] = useState(initialNotes);
  const [expectedAt, setExpectedAt] = useState(initialExpectedAt ?? '');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const total = useMemo(() => {
    return lines.reduce((s, l) => {
      const qty = Number(l.qty);
      const price = Number(l.unit_price);
      if (!Number.isFinite(qty) || !Number.isFinite(price)) return s;
      return s + qty * price;
    }, 0);
  }, [lines]);

  function patch(key: string, patch: Partial<LineDraft>) {
    setLines((cur) => cur.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    setSaved(false);
  }

  function remove(key: string) {
    setLines((cur) =>
      cur.length === 1 ? cur : cur.filter((l) => l.key !== key),
    );
    setSaved(false);
  }

  function pickIngredient(key: string, ingId: string) {
    const ing = bankIngredients.find((b) => b.id === ingId);
    if (!ing) return;
    patch(key, {
      ingredient_id: ing.id,
      raw_name: ing.name,
      qty_unit: ing.unit ?? 'each',
      unit_price:
        ing.current_price == null ? '' : String(ing.current_price),
    });
  }

  function save() {
    setError(null);
    setSaved(false);
    const cleaned = lines
      .filter((l) => l.raw_name.trim() !== '')
      .map((l) => ({
        ingredient_id: l.ingredient_id,
        raw_name: l.raw_name.trim(),
        qty: Number(l.qty) || 0,
        qty_unit: l.qty_unit.trim() || 'each',
        unit_price: l.unit_price === '' ? null : Number(l.unit_price),
        notes: l.notes.trim() === '' ? null : l.notes.trim(),
      }));
    if (cleaned.length === 0) {
      setError('Add at least one line, or cancel the draft instead.');
      return;
    }
    startTransition(async () => {
      const res = await updatePurchaseOrderLinesAction({
        id: poId,
        notes: notes.trim() === '' ? null : notes.trim(),
        expected_at: expectedAt === '' ? null : expectedAt,
        lines: cleaned,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
    });
  }

  if (readOnly) {
    return (
      <div className="bg-card border border-rule">
        <div className="hidden md:grid grid-cols-[2fr_90px_80px_110px_110px] gap-3 px-7 py-3.5 bg-paper-warm border-b border-rule">
          {['Item', 'Qty', 'Unit', 'Unit price', 'Line total'].map((h) => (
            <div
              key={h}
              className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
            >
              {h}
            </div>
          ))}
        </div>
        {initial.map((l, i) => {
          const qty = Number(l.qty);
          const price = Number(l.unit_price);
          const total =
            Number.isFinite(qty) && Number.isFinite(price)
              ? qty * price
              : null;
          return (
            <div
              key={l.key}
              className={
                'grid grid-cols-1 md:grid-cols-[2fr_90px_80px_110px_110px] gap-3 px-7 py-3 items-center ' +
                (i < initial.length - 1 ? 'border-b border-rule-soft' : '')
              }
            >
              <div className="font-serif font-semibold text-sm text-ink">
                {l.raw_name}
                {l.notes && (
                  <div className="font-serif italic text-xs text-muted mt-0.5">
                    {l.notes}
                  </div>
                )}
              </div>
              <div className="font-serif text-sm text-ink">{l.qty}</div>
              <div className="font-serif text-sm text-muted">{l.qty_unit}</div>
              <div className="font-serif text-sm text-ink">
                {l.unit_price ? gbp.format(Number(l.unit_price)) : '—'}
              </div>
              <div className="font-serif font-semibold text-sm text-ink">
                {total != null ? gbp.format(total) : '—'}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <div className="bg-card border border-rule mb-4">
        <div className="hidden md:grid grid-cols-[2fr_90px_80px_110px_60px] gap-3 px-5 py-3 bg-paper-warm border-b border-rule">
          {['Item', 'Qty', 'Unit', 'Unit price', ''].map((h, i) => (
            <div
              key={i}
              className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
            >
              {h}
            </div>
          ))}
        </div>
        {lines.map((l, i) => (
          <div
            key={l.key}
            className={
              'grid grid-cols-1 md:grid-cols-[2fr_90px_80px_110px_60px] gap-3 px-5 py-3 items-start ' +
              (i < lines.length - 1 ? 'border-b border-rule-soft' : '')
            }
          >
            <div className="flex flex-col gap-1.5">
              <select
                value={l.ingredient_id ?? ''}
                onChange={(e) =>
                  e.target.value === ''
                    ? patch(l.key, { ingredient_id: null })
                    : pickIngredient(l.key, e.target.value)
                }
                className="px-2 py-1.5 border border-rule bg-card font-serif text-sm text-ink focus:outline-none focus:border-gold"
              >
                <option value="">— pick from Bank or type below —</option>
                {bankIngredients.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={l.raw_name}
                onChange={(e) => patch(l.key, { raw_name: e.target.value })}
                placeholder="Item name"
                className="px-2 py-1.5 border border-rule bg-card font-serif text-sm text-ink focus:outline-none focus:border-gold"
              />
              <input
                type="text"
                value={l.notes}
                onChange={(e) => patch(l.key, { notes: e.target.value })}
                placeholder="Note (optional)"
                className="px-2 py-1.5 border border-rule bg-card font-serif text-xs italic text-muted focus:outline-none focus:border-gold"
              />
            </div>
            <input
              type="number"
              step="0.001"
              value={l.qty}
              onChange={(e) => patch(l.key, { qty: e.target.value })}
              placeholder="0"
              className="px-2 py-1.5 border border-rule bg-card font-serif text-sm text-ink focus:outline-none focus:border-gold"
            />
            <input
              type="text"
              value={l.qty_unit}
              onChange={(e) => patch(l.key, { qty_unit: e.target.value })}
              placeholder="each"
              className="px-2 py-1.5 border border-rule bg-card font-serif text-sm text-ink focus:outline-none focus:border-gold"
            />
            <input
              type="number"
              step="0.0001"
              value={l.unit_price}
              onChange={(e) => patch(l.key, { unit_price: e.target.value })}
              placeholder="0.00"
              className="px-2 py-1.5 border border-rule bg-card font-serif text-sm text-ink focus:outline-none focus:border-gold"
            />
            <button
              type="button"
              onClick={() => remove(l.key)}
              aria-label="Remove line"
              title="Remove"
              className="font-display font-semibold text-base text-muted-soft hover:text-urgent transition-colors leading-none px-2 py-2 justify-self-end"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setLines((cur) => [...cur, newLine()])}
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold hover:text-gold-dark transition-colors"
      >
        + Add line
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div>
          <label className="block font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-muted mb-2">
            Expected delivery
          </label>
          <input
            type="date"
            value={expectedAt}
            onChange={(e) => setExpectedAt(e.target.value)}
            className="w-full px-3 py-2 border border-rule bg-card font-serif text-sm text-ink focus:outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="block font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-muted mb-2">
            Notes for the supplier
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-rule bg-card font-serif text-sm text-ink focus:outline-none focus:border-gold resize-none"
            placeholder="Optional message to include with the email"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-6 pt-6 border-t border-rule flex-wrap">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark disabled:opacity-50 transition-colors"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        {saved && (
          <span className="font-serif italic text-sm text-healthy">
            ✓ Saved.
          </span>
        )}
        {error && (
          <span className="font-serif italic text-sm text-urgent">
            {error}
          </span>
        )}
        <span className="font-serif italic text-sm text-muted ml-auto">
          Total {gbp.format(total)} (est.)
        </span>
      </div>
    </div>
  );
}
