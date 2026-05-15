'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateIngredientPar } from './actions';

export function ParLevelForm({
  ingredientId,
  initialPar,
  initialReorder,
  initialStock,
  unit,
}: {
  ingredientId: string;
  initialPar: number | null;
  initialReorder: number | null;
  initialStock: number | null;
  unit: string | null;
}) {
  const router = useRouter();
  const [par, setPar] = useState(initialPar != null ? String(initialPar) : '');
  const [reorder, setReorder] = useState(
    initialReorder != null ? String(initialReorder) : '',
  );
  const [stock, setStock] = useState(
    initialStock != null ? String(initialStock) : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState(0);
  const [pending, startTransition] = useTransition();

  function save() {
    if (pending) return;
    setError(null);
    const toNum = (s: string) =>
      s.trim() === '' ? null : Number.isFinite(Number(s)) ? Number(s) : NaN;
    const p = toNum(par);
    const r = toNum(reorder);
    const cs = toNum(stock);
    if (
      (p != null && Number.isNaN(p)) ||
      (r != null && Number.isNaN(r)) ||
      (cs != null && Number.isNaN(cs))
    ) {
      setError('Use plain numbers (or leave blank).');
      return;
    }
    startTransition(async () => {
      const res = await updateIngredientPar({
        ingredientId,
        parLevel: p,
        reorderPoint: r,
        currentStock: cs,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedTick((n) => n + 1);
      router.refresh();
    });
  }

  const unitLabel = unit ?? '';
  const ratio =
    initialPar != null && initialPar > 0 && initialStock != null
      ? Math.max(0, Math.min(1.3, initialStock / initialPar))
      : null;
  const tone =
    initialStock != null && initialReorder != null
      ? initialStock <= initialReorder
        ? 'breach'
        : initialPar != null && initialStock < initialPar * 0.75
          ? 'low'
          : 'healthy'
      : 'unknown';
  const barColor =
    tone === 'breach'
      ? 'bg-urgent'
      : tone === 'low'
        ? 'bg-attention'
        : tone === 'healthy'
          ? 'bg-healthy'
          : 'bg-muted-soft';

  return (
    <div className="bg-card border border-rule px-7 py-6">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-ink">
          Stock & Par
        </h3>
        {ratio != null && (
          <span
            className={
              'font-display font-semibold text-[10px] tracking-[0.18em] uppercase ' +
              (tone === 'breach'
                ? 'text-urgent'
                : tone === 'low'
                  ? 'text-attention'
                  : 'text-healthy')
            }
          >
            {tone === 'breach'
              ? 'Under reorder'
              : tone === 'low'
                ? 'Low'
                : 'Healthy'}
          </span>
        )}
      </div>

      {ratio != null && (
        <div className="h-1.5 bg-paper-warm border border-rule rounded-sm overflow-hidden mb-5">
          <div
            className={`h-full transition-all ${barColor}`}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <FieldRow
          label="Par level"
          unit={unitLabel}
          value={par}
          onChange={setPar}
          placeholder="ideal"
        />
        <FieldRow
          label="Reorder point"
          unit={unitLabel}
          value={reorder}
          onChange={setReorder}
          placeholder="trigger"
        />
        <FieldRow
          label="Current stock"
          unit={unitLabel}
          value={stock}
          onChange={setStock}
          placeholder="counted"
        />
      </div>

      <p className="font-serif italic text-xs text-muted mb-4 leading-relaxed">
        Par is your ideal. Reorder is the trigger. Current stock updates
        every time you complete a stock count — set it here to seed the
        first one.
      </p>

      {error && (
        <div className="bg-card border border-l-4 border-l-urgent border-rule px-4 py-2 font-serif italic text-sm text-ink-soft mb-3">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2 bg-transparent text-ink border border-rule hover:border-gold hover:text-gold transition-colors disabled:opacity-40"
        >
          {pending ? 'Saving…' : 'Save stock'}
        </button>
        {savedTick > 0 && !pending && (
          <span className="font-serif italic text-sm text-healthy">
            Saved.
          </span>
        )}
      </div>
    </div>
  );
}

function FieldRow({
  label,
  unit,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
        />
        {unit && (
          <span className="font-serif italic text-xs text-muted whitespace-nowrap">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
