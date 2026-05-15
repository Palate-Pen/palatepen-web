'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateIngredientPrice } from './actions';

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

export function PriceUpdateForm({
  ingredientId,
  currentPrice,
  unit,
}: {
  ingredientId: string;
  currentPrice: number | null;
  unit: string | null;
}) {
  const router = useRouter();
  const [price, setPrice] = useState<string>(
    currentPrice != null ? String(currentPrice) : '',
  );
  const [reason, setReason] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const priceNum = price.trim() === '' ? NaN : Number(price);
  const dirty =
    Number.isFinite(priceNum) &&
    (currentPrice == null
      ? priceNum >= 0
      : Math.abs(priceNum - currentPrice) >= 0.005);

  function save() {
    if (!dirty || pending) return;
    setError(null);
    setJustSaved(false);

    startTransition(async () => {
      const res = await updateIngredientPrice({
        ingredientId,
        newPrice: priceNum,
        reason: reason.trim() || null,
      });
      if (!res.ok) {
        setError(humaniseError(res.error));
        return;
      }
      setJustSaved(true);
      setReason('');
      router.refresh();
    });
  }

  return (
    <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-6 flex flex-col gap-4">
      <div>
        <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-gold">
          Manual price update
        </div>
        <p className="font-serif italic text-sm text-muted mt-1.5">
          Bank prices auto-update from scanned invoices. Use this for the case
          when a supplier called, you bought from a different source for the
          day, or you spotted a price tag that doesn't match the last scan.
          Live cost across every recipe updates the moment you save.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-muted">
            New price (£)
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 border border-rule bg-card font-serif font-semibold text-lg text-ink focus:outline-none focus:border-gold"
            />
            {unit && (
              <span className="font-serif italic text-sm text-muted whitespace-nowrap">
                per {unit}
              </span>
            )}
          </div>
          {currentPrice != null && (
            <span className="font-serif italic text-xs text-muted">
              current: {gbp.format(currentPrice)}
              {unit ? ` per ${unit}` : ''}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-muted">
            Reason (optional)
          </span>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. supplier called, raised lamb 12%"
            maxLength={140}
            className="w-full px-3 py-2 border border-rule bg-card font-serif italic text-sm text-ink-soft focus:outline-none focus:border-gold"
          />
        </label>
      </div>

      {error && (
        <div className="font-serif italic text-sm text-urgent">{error}</div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-rule-soft">
        <div className="font-serif italic text-sm text-muted flex-1 min-w-0">
          {justSaved ? (
            <span className="text-healthy not-italic font-semibold">
              Saved. {gbp.format(priceNum)} is the new Bank price — every recipe using this ingredient just picked it up.
            </span>
          ) : dirty ? (
            <>The history table picks this up as a manual entry.</>
          ) : (
            <>Type a different price to enable saving.</>
          )}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending ? 'Saving…' : 'Save new price'}
        </button>
      </div>
    </div>
  );
}

function humaniseError(code: string): string {
  switch (code) {
    case 'invalid_price':
      return 'Price must be a positive number.';
    default:
      return code;
  }
}
