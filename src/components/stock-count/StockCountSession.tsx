'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateStockCountLineAction,
  completeStockCountAction,
} from '@/app/(shell)/stock-suppliers/stock-count/actions';
import type {
  StockTakeDetail,
  StockTakeLine,
} from '@/lib/stock-takes';

type LineDraft = {
  id: string;
  ingredient_name: string;
  category: string | null;
  unit: string | null;
  expected_quantity: number | null;
  counted_quantity: string;
  reason: string;
  current_price: number | null;
  dirty: boolean;
  saving: boolean;
};

function toDraft(l: StockTakeLine): LineDraft {
  return {
    id: l.id,
    ingredient_name: l.ingredient_name,
    category: l.category,
    unit: l.unit,
    expected_quantity: l.expected_quantity,
    counted_quantity:
      l.counted_quantity != null ? String(l.counted_quantity) : '',
    reason: l.reason ?? '',
    current_price: l.current_price,
    dirty: false,
    saving: false,
  };
}

/**
 * Interactive session for an in-progress stock take. Each row updates
 * eagerly to the server on blur (debounced via React transition). Live
 * variance + £ value renders client-side from the draft state so the
 * chef gets instant feedback.
 *
 * Read-only view rendered when status != 'in_progress'.
 */
export function StockCountSession({
  detail,
  readOnly,
  onCompleteRedirect,
}: {
  detail: StockTakeDetail;
  readOnly: boolean;
  onCompleteRedirect: string;
}) {
  const router = useRouter();
  const [lines, setLines] = useState<LineDraft[]>(() =>
    detail.lines.map(toDraft),
  );
  const [notes, setNotes] = useState(detail.notes ?? '');
  const [completing, startComplete] = useTransition();

  const totals = useMemo(() => {
    let varianceQty = 0;
    let varianceVal = 0;
    let counted = 0;
    for (const l of lines) {
      const c = Number(l.counted_quantity);
      if (!Number.isFinite(c)) continue;
      counted += 1;
      const expected = l.expected_quantity ?? 0;
      const v = c - expected;
      varianceQty += v;
      if (l.current_price != null) varianceVal += v * l.current_price;
    }
    return {
      counted,
      remaining: lines.length - counted,
      varianceQty,
      varianceValue: Math.round(varianceVal * 100) / 100,
    };
  }, [lines]);

  function updateLine(id: string, patch: Partial<LineDraft>) {
    setLines((cur) =>
      cur.map((l) => (l.id === id ? { ...l, ...patch, dirty: true } : l)),
    );
  }

  function saveLine(id: string) {
    const l = lines.find((x) => x.id === id);
    if (!l || !l.dirty) return;
    const counted = l.counted_quantity.trim() === '' ? null : Number(l.counted_quantity);
    if (counted != null && !Number.isFinite(counted)) return;
    setLines((cur) =>
      cur.map((x) => (x.id === id ? { ...x, saving: true } : x)),
    );
    updateStockCountLineAction({
      takeId: detail.id,
      lineId: id,
      countedQuantity: counted,
      reason: l.reason,
    }).then(() => {
      setLines((cur) =>
        cur.map((x) =>
          x.id === id ? { ...x, dirty: false, saving: false } : x,
        ),
      );
    });
  }

  function completeAll() {
    if (completing) return;
    if (
      !confirm(
        `Complete this count? Counted quantities will overwrite current stock for ${totals.counted} ${
          totals.counted === 1 ? 'item' : 'items'
        }. ${totals.remaining > 0 ? `${totals.remaining} uncounted will be skipped.` : ''}`,
      )
    ) {
      return;
    }
    startComplete(async () => {
      await completeStockCountAction(detail.id, notes);
      router.push(onCompleteRedirect + '?completed=1');
    });
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-8">
        <Tile label="Counted" value={`${totals.counted}/${lines.length}`} />
        <Tile
          label="Remaining"
          value={String(totals.remaining)}
          tone={totals.remaining === 0 ? 'healthy' : undefined}
        />
        <Tile
          label="Variance qty"
          value={
            Number.isFinite(totals.varianceQty)
              ? (totals.varianceQty >= 0 ? '+' : '') +
                totals.varianceQty.toFixed(2)
              : '—'
          }
          tone={Math.abs(totals.varianceQty) > 0 ? 'attention' : undefined}
        />
        <Tile
          label="Variance £"
          value={
            totals.varianceValue >= 0
              ? `+£${totals.varianceValue.toFixed(2)}`
              : `−£${Math.abs(totals.varianceValue).toFixed(2)}`
          }
          tone={
            Math.abs(totals.varianceValue) > 50
              ? 'urgent'
              : Math.abs(totals.varianceValue) > 10
                ? 'attention'
                : undefined
          }
        />
      </div>

      <div className="bg-card border border-rule">
        <div className="hidden md:grid grid-cols-[2fr_110px_110px_110px_110px_2fr] gap-3 px-5 py-3 bg-paper-warm border-b border-rule">
          {[
            'Ingredient',
            'Expected',
            'Counted',
            'Variance',
            'Value',
            'Reason (optional)',
          ].map((h, i) => (
            <div
              key={i}
              className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
            >
              {h}
            </div>
          ))}
        </div>
        {lines.length === 0 ? (
          <div className="px-10 py-12 text-center font-serif italic text-muted">
            No lines on this take.
          </div>
        ) : (
          lines.map((l, idx) => {
            const counted =
              l.counted_quantity.trim() === ''
                ? null
                : Number(l.counted_quantity);
            const variance =
              counted != null && Number.isFinite(counted) && l.expected_quantity != null
                ? counted - l.expected_quantity
                : null;
            const varianceVal =
              variance != null && l.current_price != null
                ? variance * l.current_price
                : null;
            const tone =
              variance == null
                ? 'muted'
                : variance === 0
                  ? 'healthy'
                  : Math.abs(variance) > 0 && Math.abs(varianceVal ?? 0) > 20
                    ? 'urgent'
                    : 'attention';
            const toneColor =
              tone === 'healthy'
                ? 'text-healthy'
                : tone === 'attention'
                  ? 'text-attention'
                  : tone === 'urgent'
                    ? 'text-urgent'
                    : 'text-muted-soft';
            return (
              <div
                key={l.id}
                className={
                  'grid grid-cols-1 md:grid-cols-[2fr_110px_110px_110px_110px_2fr] gap-3 px-5 py-3 items-center' +
                  (idx < lines.length - 1
                    ? ' border-b border-rule-soft'
                    : '')
                }
              >
                <div>
                  <div className="font-serif font-semibold text-base text-ink">
                    {l.ingredient_name}
                  </div>
                  {l.category && (
                    <div className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted-soft mt-0.5">
                      {l.category}
                    </div>
                  )}
                </div>
                <div className="font-serif text-sm text-muted">
                  {l.expected_quantity != null
                    ? `${l.expected_quantity} ${l.unit ?? ''}`
                    : '—'}
                </div>
                <div>
                  {readOnly ? (
                    <div className="font-serif text-sm text-ink">
                      {l.counted_quantity || '—'} {l.unit ?? ''}
                    </div>
                  ) : (
                    <input
                      type="number"
                      step="0.001"
                      value={l.counted_quantity}
                      onChange={(e) =>
                        updateLine(l.id, {
                          counted_quantity: e.target.value,
                        })
                      }
                      onBlur={() => saveLine(l.id)}
                      placeholder="—"
                      className="w-24 px-2 py-1.5 border border-rule bg-card font-serif text-sm text-ink focus:outline-none focus:border-gold"
                    />
                  )}
                </div>
                <div className={'font-serif font-semibold text-sm ' + toneColor}>
                  {variance != null
                    ? (variance >= 0 ? '+' : '') + variance.toFixed(2)
                    : '—'}
                </div>
                <div className={'font-serif font-semibold text-sm ' + toneColor}>
                  {varianceVal != null
                    ? (varianceVal >= 0 ? '+£' : '−£') +
                      Math.abs(varianceVal).toFixed(2)
                    : '—'}
                </div>
                <div>
                  {readOnly ? (
                    <div className="font-serif italic text-sm text-muted">
                      {l.reason || '—'}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={l.reason}
                      onChange={(e) =>
                        updateLine(l.id, { reason: e.target.value })
                      }
                      onBlur={() => saveLine(l.id)}
                      placeholder="why's it off?"
                      className="w-full px-2 py-1.5 border border-rule bg-card font-serif text-sm text-ink focus:outline-none focus:border-gold"
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-8">
        <label className="block font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2">
          Take notes
        </label>
        {readOnly ? (
          notes ? (
            <p className="font-serif italic text-base text-ink-soft bg-card border border-rule px-3 py-2.5">
              {notes}
            </p>
          ) : (
            <p className="font-serif italic text-sm text-muted">
              No notes left.
            </p>
          )
        ) : (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="What did the count surface? Anything to chase up."
            className="w-full font-serif text-base text-ink bg-card border border-rule px-3 py-2.5 focus:outline-none focus:border-gold"
          />
        )}
      </div>

      {!readOnly && (
        <div className="mt-8 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={completeAll}
            disabled={completing || totals.counted === 0}
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {completing
              ? 'Completing…'
              : `Complete count (${totals.counted} ${totals.counted === 1 ? 'item' : 'items'})`}
          </button>
          {totals.counted === 0 && (
            <span className="font-serif italic text-sm text-muted">
              Enter at least one counted quantity to complete.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'healthy' | 'attention' | 'urgent';
}) {
  const valueColor =
    tone === 'healthy'
      ? 'text-healthy'
      : tone === 'attention'
        ? 'text-attention'
        : tone === 'urgent'
          ? 'text-urgent'
          : 'text-ink';
  return (
    <div className="bg-card px-5 py-4">
      <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-muted mb-2">
        {label}
      </div>
      <div className={`font-serif font-medium text-2xl leading-none ${valueColor}`}>
        {value}
      </div>
    </div>
  );
}
