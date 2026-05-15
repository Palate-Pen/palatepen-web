'use client';

import { useEffect, useMemo, useState } from 'react';

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

export type GPCalcLine = {
  key: string;
  name: string;
  qty: string;
  unit: string;
  unitPrice: string; // cost per UNIT (per gram, per ml, per each — chef enters whatever)
};

export type GPCalcSeed = {
  dishName?: string;
  sellPrice?: number | null;
  lines?: Array<{
    name: string;
    qty: number;
    unit: string;
    unitPrice: number | null;
  }>;
};

function randomKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function newLine(): GPCalcLine {
  return { key: randomKey(), name: '', qty: '', unit: 'g', unitPrice: '' };
}

/**
 * Ad-hoc GP calculator. Lives as a modal so it can launch from
 * /recipes/[id] and /bartender/specs/[id] without leaving context.
 *
 * Computes:
 *   total_cost = sum(qty * unit_price)
 *   gp_pct = (sell - total_cost) / sell
 *   pour_cost_pct = total_cost / sell (industry inverse)
 *
 * Colour-codes against the chef's target GP from account prefs
 * (passed in via prop, defaults to 70%). No persistence in v1 —
 * pure costing aid. Optional preset via `seed` so we can pre-fill
 * from the current recipe.
 */
export function GPCalculatorModal({
  open,
  onClose,
  targetGpPct = 70,
  seed,
}: {
  open: boolean;
  onClose: () => void;
  /** Account-preferences gp_target_pct as 0-100. Default 70. */
  targetGpPct?: number;
  /** Pre-fill from an existing recipe / spec. */
  seed?: GPCalcSeed;
}) {
  const [dishName, setDishName] = useState(seed?.dishName ?? '');
  const [sellPrice, setSellPrice] = useState<string>(
    seed?.sellPrice != null ? String(seed.sellPrice) : '',
  );
  const [lines, setLines] = useState<GPCalcLine[]>(() =>
    seed?.lines && seed.lines.length > 0
      ? seed.lines.map((l) => ({
          key: randomKey(),
          name: l.name,
          qty: String(l.qty),
          unit: l.unit,
          unitPrice: l.unitPrice != null ? String(l.unitPrice) : '',
        }))
      : [newLine()],
  );

  // Reseed when the modal reopens with a new seed
  useEffect(() => {
    if (open && seed) {
      setDishName(seed.dishName ?? '');
      setSellPrice(seed.sellPrice != null ? String(seed.sellPrice) : '');
      setLines(
        seed.lines && seed.lines.length > 0
          ? seed.lines.map((l) => ({
              key: randomKey(),
              name: l.name,
              qty: String(l.qty),
              unit: l.unit,
              unitPrice: l.unitPrice != null ? String(l.unitPrice) : '',
            }))
          : [newLine()],
      );
    }
  }, [open, seed]);

  const totals = useMemo(() => {
    const totalCost = lines.reduce((sum, l) => {
      const qty = Number(l.qty);
      const price = Number(l.unitPrice);
      if (!Number.isFinite(qty) || !Number.isFinite(price)) return sum;
      return sum + qty * price;
    }, 0);
    const sellNum = Number(sellPrice);
    const gpPct =
      Number.isFinite(sellNum) && sellNum > 0
        ? ((sellNum - totalCost) / sellNum) * 100
        : null;
    const pourCostPct =
      Number.isFinite(sellNum) && sellNum > 0
        ? (totalCost / sellNum) * 100
        : null;
    return { totalCost, gpPct, pourCostPct };
  }, [lines, sellPrice]);

  if (!open) return null;

  const tone =
    totals.gpPct == null
      ? 'muted'
      : totals.gpPct >= targetGpPct
        ? 'healthy'
        : totals.gpPct >= targetGpPct - 5
          ? 'attention'
          : 'urgent';
  const toneColor =
    tone === 'healthy'
      ? 'text-healthy'
      : tone === 'attention'
        ? 'text-attention'
        : tone === 'urgent'
          ? 'text-urgent'
          : 'text-muted';

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/60 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-paper border border-rule shadow-[0_24px_48px_rgba(26,22,18,0.24)] w-full max-w-[820px] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-7 py-5 border-b border-rule">
          <div>
            <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold mb-1">
              Ad-Hoc GP Calculator
            </div>
            <h2 className="font-display text-2xl font-semibold uppercase tracking-[0.04em] text-ink">
              Cost A Dish
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-ink transition-colors"
          >
            Close ×
          </button>
        </div>

        <div className="px-7 py-6">
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 mb-6">
            <div>
              <label className="block font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2">
                Dish / Spec
              </label>
              <input
                type="text"
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                placeholder="What are you costing?"
                className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2">
                Sell price (£)
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder="e.g. 18.50"
                className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div className="mb-2 font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted">
            Components
          </div>
          <div className="bg-card border border-rule">
            <div className="hidden md:grid grid-cols-[2fr_90px_80px_110px_110px_40px] gap-3 px-4 py-2.5 bg-paper-warm border-b border-rule">
              {['Name', 'Qty', 'Unit', 'Unit price', 'Line cost', ''].map(
                (h, i) => (
                  <div
                    key={i}
                    className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
                  >
                    {h}
                  </div>
                ),
              )}
            </div>
            {lines.map((l, idx) => {
              const qty = Number(l.qty);
              const price = Number(l.unitPrice);
              const lineCost =
                Number.isFinite(qty) && Number.isFinite(price)
                  ? qty * price
                  : null;
              return (
                <div
                  key={l.key}
                  className={
                    'grid grid-cols-1 md:grid-cols-[2fr_90px_80px_110px_110px_40px] gap-3 px-4 py-3 items-center' +
                    (idx < lines.length - 1 ? ' border-b border-rule-soft' : '')
                  }
                >
                  <input
                    type="text"
                    value={l.name}
                    onChange={(e) =>
                      setLines((cur) =>
                        cur.map((c) =>
                          c.key === l.key ? { ...c, name: e.target.value } : c,
                        ),
                      )
                    }
                    placeholder="Ingredient"
                    className="px-2 py-1.5 border border-rule bg-card font-serif text-sm text-ink focus:outline-none focus:border-gold"
                  />
                  <input
                    type="number"
                    step="0.001"
                    value={l.qty}
                    onChange={(e) =>
                      setLines((cur) =>
                        cur.map((c) =>
                          c.key === l.key ? { ...c, qty: e.target.value } : c,
                        ),
                      )
                    }
                    placeholder="0"
                    className="px-2 py-1.5 border border-rule bg-card font-serif text-sm text-ink focus:outline-none focus:border-gold"
                  />
                  <input
                    type="text"
                    value={l.unit}
                    onChange={(e) =>
                      setLines((cur) =>
                        cur.map((c) =>
                          c.key === l.key ? { ...c, unit: e.target.value } : c,
                        ),
                      )
                    }
                    placeholder="g"
                    className="px-2 py-1.5 border border-rule bg-card font-serif text-sm text-ink focus:outline-none focus:border-gold"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={l.unitPrice}
                    onChange={(e) =>
                      setLines((cur) =>
                        cur.map((c) =>
                          c.key === l.key
                            ? { ...c, unitPrice: e.target.value }
                            : c,
                        ),
                      )
                    }
                    placeholder="0.00"
                    className="px-2 py-1.5 border border-rule bg-card font-serif text-sm text-ink focus:outline-none focus:border-gold"
                  />
                  <div className="font-serif font-semibold text-sm text-ink">
                    {lineCost != null ? gbp.format(lineCost) : '—'}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setLines((cur) =>
                        cur.length === 1
                          ? cur
                          : cur.filter((c) => c.key !== l.key),
                      )
                    }
                    aria-label="Remove line"
                    title="Remove"
                    className="font-display font-semibold text-[14px] text-muted-soft hover:text-urgent transition-colors leading-none"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setLines((cur) => [...cur, newLine()])}
            className="mt-3 font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold hover:text-gold-dark transition-colors"
          >
            + Add component
          </button>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule">
            <Tile
              label="Total cost"
              value={gbp.format(totals.totalCost)}
            />
            <Tile
              label="Sell"
              value={
                Number.isFinite(Number(sellPrice)) && Number(sellPrice) > 0
                  ? gbp.format(Number(sellPrice))
                  : '—'
              }
            />
            <Tile
              label="Pour cost"
              value={
                totals.pourCostPct != null
                  ? `${totals.pourCostPct.toFixed(0)}%`
                  : '—'
              }
            />
            <Tile
              label="GP"
              value={totals.gpPct != null ? `${totals.gpPct.toFixed(0)}%` : '—'}
              valueColor={toneColor}
              sub={
                totals.gpPct != null
                  ? totals.gpPct >= targetGpPct
                    ? `target ${targetGpPct}% · clear`
                    : totals.gpPct >= targetGpPct - 5
                      ? `target ${targetGpPct}% · close`
                      : `target ${targetGpPct}% · under`
                  : 'set a sell price'
              }
            />
          </div>

          <p className="font-serif italic text-sm text-muted mt-6">
            Not saved — this is a calculator. To set a real margin baseline,{' '}
            <span className="not-italic font-semibold text-ink">
              edit the recipe directly
            </span>{' '}
            and update the sell price there.
          </p>
        </div>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  valueColor = 'text-ink',
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-card px-5 py-4">
      <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-muted mb-2">
        {label}
      </div>
      <div
        className={`font-serif font-medium text-2xl leading-none ${valueColor}`}
      >
        {value}
      </div>
      {sub && (
        <div className="font-serif italic text-xs text-muted mt-1">{sub}</div>
      )}
    </div>
  );
}
