'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveRecipeSellPrice } from './actions';

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

const TARGET_GP_PCT = 72;

export function WhatIfPanel({
  recipeId,
  costPerCover,
  initialSellPrice,
}: {
  recipeId: string;
  costPerCover: number;
  initialSellPrice: number;
}) {
  // Bounds: floor at 110% of cost (refuse to lose money), ceiling at 3× the
  // higher of cost or initial price so the slider has room to roam but doesn't
  // span absurd values that compress the meaningful range visually.
  const min = Math.max(0.01, Math.round(costPerCover * 1.1 * 100) / 100);
  const max =
    Math.ceil(Math.max(costPerCover, initialSellPrice) * 3 * 100) / 100;

  const router = useRouter();
  const [price, setPrice] = useState<number>(initialSellPrice);
  const [pending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const gp = useMemo(() => {
    if (price <= 0) return null;
    return ((price - costPerCover) / price) * 100;
  }, [price, costPerCover]);

  const marginCash = price - costPerCover;
  const gpTone =
    gp == null
      ? 'muted'
      : gp >= TARGET_GP_PCT
        ? 'healthy'
        : gp >= TARGET_GP_PCT - 7
          ? 'attention'
          : 'urgent';

  // Target-hit suggested price: sell × (1 - cost/sell) = gp → sell = cost / (1 - gp)
  const suggestedPrice =
    costPerCover > 0 ? costPerCover / (1 - TARGET_GP_PCT / 100) : null;

  const delta = price - initialSellPrice;
  const dirty = Math.abs(delta) >= 0.005;

  function save() {
    if (pending || !dirty) return;
    setSaveError(null);
    setJustSaved(false);
    startTransition(async () => {
      const res = await saveRecipeSellPrice({
        recipeId,
        sellPrice: price,
        costPerCoverNow: costPerCover,
      });
      if (!res.ok) {
        setSaveError(humaniseError(res.error));
        return;
      }
      setJustSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-6 mb-10">
      <div className="flex items-baseline justify-between mb-1 gap-4 flex-wrap">
        <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-gold">
          What-if pricing
        </div>
        <button
          type="button"
          onClick={() => {
            setPrice(initialSellPrice);
            setSaveError(null);
            setJustSaved(false);
          }}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors bg-transparent border-0 p-0 cursor-pointer disabled:opacity-30"
          disabled={!dirty || pending}
        >
          Reset
        </button>
      </div>
      <p className="font-serif italic text-sm text-muted mb-5">
        Drag the price. The system holds cost steady (live from The Bank) and
        recomputes the margin so you can find a price that hits target without
        leaving the page.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-5">
        <Tile label="Sell price" value={gbp.format(price)} accent />
        <Tile label="Cost / cover" value={gbp.format(costPerCover)} />
        <Tile
          label="GP %"
          value={gp == null ? '—' : `${gp.toFixed(1)}%`}
          tone={gpTone}
        />
        <Tile label="Margin £" value={gbp.format(marginCash)} />
      </div>

      <div className="mb-4">
        <input
          type="range"
          min={min}
          max={max}
          step={0.25}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="w-full accent-gold cursor-pointer"
          aria-label="Sell price slider"
        />
        <div className="flex justify-between font-sans text-[11px] text-muted-soft mt-1">
          <span>{gbp.format(min)}</span>
          <span>{gbp.format(max)}</span>
        </div>
      </div>

      {Math.abs(delta) >= 0.01 && (
        <div className="font-serif italic text-sm text-ink-soft leading-relaxed mb-3">
          {delta > 0 ? 'Lifting' : 'Dropping'} the price by{' '}
          <strong className="not-italic font-semibold text-ink">
            {gbp.format(Math.abs(delta))}
          </strong>{' '}
          per cover moves the GP from{' '}
          <strong className="not-italic font-semibold text-ink">
            {(((initialSellPrice - costPerCover) / initialSellPrice) * 100).toFixed(0)}%
          </strong>{' '}
          to{' '}
          <strong className={`not-italic font-semibold ${toneTextClass(gpTone)}`}>
            {gp == null ? '—' : `${gp.toFixed(0)}%`}
          </strong>
          .
        </div>
      )}

      {suggestedPrice != null && Math.abs(suggestedPrice - price) > 0.5 && (
        <div className="flex items-center justify-between gap-4 pt-3 border-t border-rule-soft">
          <div className="font-serif italic text-sm text-muted">
            Hit the {TARGET_GP_PCT}% target by pricing at{' '}
            <strong className="not-italic font-semibold text-ink">
              {gbp.format(Math.round(suggestedPrice * 4) / 4)}
            </strong>
          </div>
          <button
            type="button"
            onClick={() => setPrice(Math.round(suggestedPrice * 4) / 4)}
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold hover:text-gold-dark transition-colors bg-transparent border-0 p-0 cursor-pointer whitespace-nowrap"
            disabled={pending}
          >
            Try it →
          </button>
        </div>
      )}

      <div className="mt-5 pt-5 border-t border-rule flex items-center justify-between gap-4 flex-wrap">
        <div className="font-serif italic text-sm text-muted flex-1 min-w-0">
          {justSaved ? (
            <span className="text-healthy not-italic font-semibold">
              Saved. Menu price is now {gbp.format(price)} · baseline re-anchored.
            </span>
          ) : saveError ? (
            <span className="text-urgent not-italic font-semibold">
              {saveError}
            </span>
          ) : dirty ? (
            <>
              Saving updates the menu price + re-anchors the cost baseline. The
              drift detector starts fresh from here.
            </>
          ) : (
            <>Drag the slider to find a new price.</>
          )}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending ? 'Saving…' : 'Save this price'}
        </button>
      </div>
    </div>
  );
}

function humaniseError(code: string): string {
  switch (code) {
    case 'invalid_price':
      return 'That price isn’t valid — set a positive number.';
    case 'invalid_cost':
      return 'The live cost is missing — can’t save against an unknown baseline.';
    case 'price_below_cost':
      return 'Price has to be above the cost. Drag the slider up.';
    default:
      return code;
  }
}

function Tile({
  label,
  value,
  tone,
  accent,
}: {
  label: string;
  value: string;
  tone?: 'healthy' | 'attention' | 'urgent' | 'muted';
  accent?: boolean;
}) {
  return (
    <div className={'bg-card px-5 py-4 ' + (accent ? 'bg-gold-bg' : '')}>
      <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted mb-2">
        {label}
      </div>
      <div
        className={`font-serif font-medium text-xl leading-none ${toneTextClass(
          tone,
        )}`}
      >
        {value}
      </div>
    </div>
  );
}

function toneTextClass(tone: string | undefined): string {
  switch (tone) {
    case 'healthy':
      return 'text-healthy';
    case 'attention':
      return 'text-attention';
    case 'urgent':
      return 'text-urgent';
    case 'muted':
      return 'text-muted-soft';
    default:
      return 'text-ink';
  }
}
