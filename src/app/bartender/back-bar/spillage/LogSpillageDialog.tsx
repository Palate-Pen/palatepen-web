'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { logSpillage, type SpillageReason } from './actions';
import { DishPicker, type DishPickerValue } from '@/components/safety/DishPicker';
import type { DishPickerBands } from '@/lib/safety/dish-picker';

export type CellarIngredientOption = {
  id: string;
  name: string;
  unit: string | null;
  pack_volume_ml: number | null;
  current_price: number | null;
};

const REASON_OPTIONS: Array<{ value: SpillageReason; label: string; sub: string; tone: 'attention' | 'urgent' | 'muted' }> = [
  {
    value: 'over_pour',
    label: 'Over-pour',
    sub: 'free hand, no jigger',
    tone: 'attention',
  },
  {
    value: 'breakage',
    label: 'Breakage',
    sub: 'bottle / glass dropped',
    tone: 'urgent',
  },
  {
    value: 'spillage',
    label: 'Spillage',
    sub: 'knocked over the well',
    tone: 'attention',
  },
  {
    value: 'comp',
    label: 'Comped',
    sub: 'on the house',
    tone: 'muted',
  },
  {
    value: 'returned',
    label: 'Returned',
    sub: 'guest sent it back',
    tone: 'muted',
  },
  {
    value: 'expired',
    label: 'Expired',
    sub: 'past best — vermouth, etc.',
    tone: 'attention',
  },
];

const UNIT_OPTIONS = ['ml', 'cl', 'glass', 'bottle', 'each'];

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

export function LogSpillageDialog({
  cellar,
  dishBands,
}: {
  cellar: CellarIngredientOption[];
  dishBands: DishPickerBands;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [ingredientId, setIngredientId] = useState<string | null>(null);
  const [dish, setDish] = useState<DishPickerValue>({ recipe_id: null, text: '' });
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('ml');
  const [reason, setReason] = useState<SpillageReason>('over_pour');
  const [reasonMd, setReasonMd] = useState('');
  const [valueOverride, setValueOverride] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cellarByName = useMemo(
    () =>
      new Map(cellar.map((b) => [b.name.toLowerCase().trim(), b])),
    [cellar],
  );

  const matched =
    ingredientId != null
      ? cellar.find((b) => b.id === ingredientId) ?? null
      : null;

  const qtyNum = Number(qty);
  const previewValue = useMemo(() => {
    if (!matched || !matched.current_price) return null;
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) return null;
    const u = unit.toLowerCase();
    const packMl = matched.pack_volume_ml;
    if (packMl && packMl > 0 && (u === 'ml' || u === 'cl')) {
      const ml = u === 'cl' ? qtyNum * 10 : qtyNum;
      return Math.round((Number(matched.current_price) * ml * 100) / packMl) / 100;
    }
    return Math.round(Number(matched.current_price) * qtyNum * 100) / 100;
  }, [matched, qtyNum, unit]);

  function onNameChange(next: string) {
    setName(next);
    const m = cellarByName.get(next.toLowerCase().trim());
    if (m) {
      setIngredientId(m.id);
      if (m.unit) setUnit(m.unit);
    } else {
      setIngredientId(null);
    }
  }

  function close() {
    setOpen(false);
    setName('');
    setIngredientId(null);
    setDish({ recipe_id: null, text: '' });
    setQty('');
    setUnit('ml');
    setReason('over_pour');
    setReasonMd('');
    setValueOverride('');
    setError(null);
  }

  function submit() {
    if (pending) return;
    setError(null);
    if (!name.trim()) {
      setError('What got spilled?');
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
      const res = await logSpillage({
        ingredient_id: ingredientId,
        recipe_id: dish.recipe_id,
        name: name.trim(),
        qty: qtyNum,
        qty_unit: unit,
        spillage_reason: reason,
        reason_md: reasonMd.trim() || null,
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
      <datalist id="cellar-ingredient-names-spillage">
        {cellar.map((b) => (
          <option key={b.id} value={b.name} />
        ))}
      </datalist>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors whitespace-nowrap"
      >
        + Log spillage
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink/40">
          <div
            className="absolute inset-0"
            onClick={close}
            aria-hidden="true"
          />
          <div className="relative bg-paper border border-rule shadow-[0_24px_60px_rgba(26,22,18,0.18)] max-w-[600px] w-full max-h-[90vh] overflow-y-auto">
            <div className="px-7 pt-6 pb-3 border-b border-rule">
              <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold mb-2">
                Log spillage
              </div>
              <h2 className="font-serif text-2xl font-normal leading-[1.1] tracking-[-0.015em] text-ink">
                What didn&apos;t make it into a glass?
              </h2>
            </div>

            <div className="px-7 py-6 flex flex-col gap-5">
              <Field label="Bottle, spirit, ingredient">
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  list="cellar-ingredient-names-spillage"
                  placeholder="e.g. Tanqueray, Lillet, fresh lemon, cocktail mix"
                  maxLength={120}
                  className={
                    'w-full px-3 py-2 border bg-card font-serif font-semibold text-base text-ink focus:outline-none focus:border-gold ' +
                    (matched ? 'border-healthy/40' : 'border-rule')
                  }
                />
                <span className="font-serif italic text-[11px] min-h-[14px]">
                  {matched ? (
                    <span className="text-healthy">
                      ● linked to Cellar · value will snapshot from current price
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
                    step="0.1"
                    min="0"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    placeholder="e.g. 25"
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

              <Field label="What happened">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {REASON_OPTIONS.map((r) => {
                    const active = reason === r.value;
                    const activeRing =
                      r.tone === 'urgent'
                        ? 'border-urgent bg-urgent/10'
                        : r.tone === 'attention'
                          ? 'border-attention bg-attention/10'
                          : 'border-gold bg-gold-bg';
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setReason(r.value)}
                        className={
                          'flex flex-col items-start gap-0.5 px-3 py-2 border transition-colors text-left ' +
                          (active
                            ? activeRing
                            : 'bg-card border-rule text-ink-soft hover:border-gold')
                        }
                      >
                        <span className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase">
                          {r.label}
                        </span>
                        <span className="font-serif italic text-[11px] text-muted leading-tight">
                          {r.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div>
                <DishPicker
                  bands={dishBands}
                  value={dish}
                  onChange={setDish}
                  label="Linked drink (optional)"
                  meta="if the spillage happened making a specific spec — link it"
                  placeholder="e.g. Negroni, Aperol Spritz, house G&T"
                />
              </div>

              <Field
                label={matched ? 'Value override (optional)' : 'Value £ (optional)'}
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
                    Will snapshot {gbp.format(previewValue)} from the Cellar
                  </span>
                )}
              </Field>

              <Field label="Reason note (optional)">
                <textarea
                  value={reasonMd}
                  onChange={(e) => setReasonMd(e.target.value)}
                  rows={2}
                  placeholder="Detail — speed pourer broken, guest changed mind, etc."
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
                {pending ? 'Logging' + String.fromCharCode(0x2026) : 'Log spillage'}
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
      <span className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function humaniseError(code: string): string {
  switch (code) {
    case 'name_required':
      return 'What got spilled?';
    case 'invalid_qty':
      return 'Quantity must be a positive number.';
    case 'unit_required':
      return 'Pick a unit.';
    case 'invalid_reason':
      return 'Pick what happened.';
    case 'invalid_value':
      return 'Value must be a non-negative number.';
    case 'no_membership':
      return 'No site membership — try signing back in.';
    default:
      return code;
  }
}
