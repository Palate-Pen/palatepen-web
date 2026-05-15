'use client';

import { useEffect, useMemo, useState } from 'react';

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});
const qtyFmt = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 3 });

export type CostSimLine = {
  /** Stable React key. */
  id: string;
  name: string;
  qty: number;
  unit: string;
  /** Calculated line cost from the recipe — already accounts for
   *  pack-volume conversions, sub-recipes, etc. Null if uncosted. */
  lineCost: number | null;
};

export type CostSimSeed = {
  dishName: string;
  /** Current sell price. Sim respects this; doesn't touch it. */
  sellPrice: number | null;
  /** Portions the recipe yields. Used to per-cover the totals. */
  serves: number;
  lines: CostSimLine[];
};

const SLIDER_MIN = -50;
const SLIDER_MAX = 100;
const SLIDER_STEP = 1;

/**
 * Per-ingredient % slider simulator for an EXISTING recipe.
 *
 * Pattern: a slider per costed ingredient (-50% to +100%) drives a
 * what-if line cost. Live recompute of cost, cost-per-cover, GP%.
 * No persistence — pure modelling tool ("what if olive oil goes up
 * 30%?"). Distinct from the ad-hoc GP Calculator which takes free-
 * form input; this one is anchored to the recipe's actual lines.
 *
 * Operates on `line_cost` (already adjusted for pack-volume, sub-
 * recipes, etc.), since a % change on the pack price scales the
 * line cost linearly. Uncosted lines render as locked rows.
 */
export function CostSimulatorModal({
  open,
  onClose,
  seed,
  targetGpPct = 70,
}: {
  open: boolean;
  onClose: () => void;
  seed: CostSimSeed;
  targetGpPct?: number;
}) {
  // deltaPct[lineId] = percent change vs current line cost
  const [deltas, setDeltas] = useState<Record<string, number>>({});

  // Reset when the modal reopens with a new seed
  useEffect(() => {
    if (open) setDeltas({});
  }, [open, seed]);

  const totals = useMemo(() => {
    let currentTotal = 0;
    let simTotal = 0;
    let costedLines = 0;
    for (const l of seed.lines) {
      if (l.lineCost == null) continue;
      costedLines++;
      const delta = deltas[l.id] ?? 0;
      currentTotal += l.lineCost;
      simTotal += l.lineCost * (1 + delta / 100);
    }
    const serves = seed.serves > 0 ? seed.serves : 1;
    const currentPerCover = currentTotal / serves;
    const simPerCover = simTotal / serves;
    const sell = seed.sellPrice ?? null;
    const currentGpPct =
      sell != null && sell > 0
        ? ((sell - currentPerCover) / sell) * 100
        : null;
    const simGpPct =
      sell != null && sell > 0 ? ((sell - simPerCover) / sell) * 100 : null;
    const deltaGpPt =
      currentGpPct != null && simGpPct != null
        ? simGpPct - currentGpPct
        : null;
    return {
      currentTotal,
      simTotal,
      currentPerCover,
      simPerCover,
      currentGpPct,
      simGpPct,
      deltaGpPt,
      costedLines,
    };
  }, [seed, deltas]);

  if (!open) return null;

  const tone =
    totals.simGpPct == null
      ? 'muted'
      : totals.simGpPct >= targetGpPct
        ? 'healthy'
        : totals.simGpPct >= targetGpPct - 5
          ? 'attention'
          : 'urgent';
  const toneClass =
    tone === 'healthy'
      ? 'text-healthy'
      : tone === 'attention'
        ? 'text-attention'
        : tone === 'urgent'
          ? 'text-urgent'
          : 'text-muted';

  function bulkApply(pct: number) {
    const next: Record<string, number> = {};
    for (const l of seed.lines) {
      if (l.lineCost != null) next[l.id] = pct;
    }
    setDeltas(next);
  }

  function resetAll() {
    setDeltas({});
  }

  const dirty = Object.values(deltas).some((d) => d !== 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/60 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-paper border border-rule shadow-[0_24px_48px_rgba(26,22,18,0.24)] w-full max-w-[920px] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-7 py-5 border-b border-rule">
          <div>
            <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold mb-1">
              Cost Simulator
            </div>
            <h2 className="font-display text-2xl font-semibold uppercase tracking-[0.04em] text-ink">
              <em className="text-gold font-semibold not-italic">{seed.dishName}</em>
            </h2>
            <p className="font-serif italic text-sm text-muted mt-1">
              Drag a slider to model a price change on that ingredient.
              GP recomputes live. Nothing is saved.
            </p>
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
          {/* Scenario presets */}
          <div className="flex items-center gap-2 flex-wrap mb-5">
            <span className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted mr-1">
              Scenarios
            </span>
            <PresetChip
              label="Today"
              active={!dirty}
              onClick={resetAll}
              tone="muted"
            />
            <PresetChip label="All +5%" onClick={() => bulkApply(5)} />
            <PresetChip label="All +10%" onClick={() => bulkApply(10)} />
            <PresetChip label="All +15%" onClick={() => bulkApply(15)} />
            <PresetChip label="All −10%" onClick={() => bulkApply(-10)} />
            {dirty && (
              <button
                type="button"
                onClick={resetAll}
                className="ml-auto font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-muted-soft hover:text-ink transition-colors"
              >
                Reset all
              </button>
            )}
          </div>

          {/* Ingredient rows */}
          {totals.costedLines === 0 ? (
            <div className="bg-card border border-rule border-l-4 border-l-attention px-6 py-5">
              <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-attention mb-2">
                Nothing to simulate
              </div>
              <p className="font-serif italic text-sm text-ink-soft">
                None of this dish's ingredients have prices in the Bank.
                Match them up first, then come back.
              </p>
            </div>
          ) : (
            <div className="bg-card border border-rule">
              {seed.lines.map((l, i) => (
                <LineRow
                  key={l.id}
                  line={l}
                  delta={deltas[l.id] ?? 0}
                  onDelta={(v) =>
                    setDeltas((cur) => ({ ...cur, [l.id]: v }))
                  }
                  last={i === seed.lines.length - 1}
                />
              ))}
            </div>
          )}

          {/* Results */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule">
            <ResultTile
              label="Cost / cover"
              current={gbp.format(totals.currentPerCover)}
              simulated={gbp.format(totals.simPerCover)}
              changed={dirty}
            />
            <ResultTile
              label="Total cost"
              current={gbp.format(totals.currentTotal)}
              simulated={gbp.format(totals.simTotal)}
              changed={dirty}
            />
            <ResultTile
              label="Sell price"
              current={
                seed.sellPrice != null ? gbp.format(seed.sellPrice) : '—'
              }
              simulated={
                seed.sellPrice != null ? gbp.format(seed.sellPrice) : '—'
              }
              changed={false}
            />
            <ResultTile
              label="GP"
              current={
                totals.currentGpPct != null
                  ? `${totals.currentGpPct.toFixed(0)}%`
                  : '—'
              }
              simulated={
                totals.simGpPct != null
                  ? `${totals.simGpPct.toFixed(0)}%`
                  : '—'
              }
              simulatedClass={dirty ? toneClass : undefined}
              changed={dirty}
              sub={
                totals.deltaGpPt != null && dirty
                  ? `${totals.deltaGpPt > 0 ? '+' : ''}${totals.deltaGpPt.toFixed(1)}pt vs today`
                  : totals.currentGpPct != null
                    ? `target ${targetGpPct}%`
                    : 'set a sell price'
              }
            />
          </div>

          <p className="mt-5 font-serif italic text-xs text-muted">
            Simulation only — your recipe and Bank stay untouched. Save a
            real price change in The Bank when you want to lock it in.
          </p>
        </div>
      </div>
    </div>
  );
}

function PresetChip({
  label,
  onClick,
  active = false,
  tone,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  tone?: 'muted';
}) {
  const base =
    'font-display font-semibold text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 border transition-colors';
  const cls = active
    ? tone === 'muted'
      ? 'bg-paper-warm text-ink border-rule'
      : 'bg-gold text-paper border-gold'
    : 'bg-transparent text-ink-soft border-rule hover:border-gold hover:text-gold';
  return (
    <button type="button" onClick={onClick} className={`${base} ${cls}`}>
      {label}
    </button>
  );
}

function LineRow({
  line,
  delta,
  onDelta,
  last,
}: {
  line: CostSimLine;
  delta: number;
  onDelta: (v: number) => void;
  last: boolean;
}) {
  const locked = line.lineCost == null;
  const simCost =
    line.lineCost == null ? null : line.lineCost * (1 + delta / 100);
  const deltaCost =
    line.lineCost != null && simCost != null ? simCost - line.lineCost : null;

  return (
    <div
      className={
        'grid grid-cols-1 md:grid-cols-[1.5fr_110px_2fr_110px] gap-4 px-5 py-4 items-center' +
        (last ? '' : ' border-b border-rule-soft') +
        (locked ? ' opacity-60' : '')
      }
    >
      <div>
        <div className="font-serif font-semibold text-sm text-ink">
          {line.name}
        </div>
        <div className="font-serif italic text-xs text-muted">
          {qtyFmt.format(line.qty)} {line.unit}
        </div>
      </div>

      <div>
        <div className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-muted">
          Today
        </div>
        <div className="font-serif text-sm text-ink">
          {line.lineCost == null ? '—' : gbp.format(line.lineCost)}
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1">
          <span className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-muted">
            Change
          </span>
          <span
            className={
              'font-serif font-semibold text-sm ' +
              (delta > 0
                ? 'text-attention'
                : delta < 0
                  ? 'text-healthy'
                  : 'text-muted')
            }
          >
            {delta > 0 ? '+' : ''}
            {delta}%
          </span>
        </div>
        <input
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={SLIDER_STEP}
          value={delta}
          disabled={locked}
          onChange={(e) => onDelta(Number(e.target.value))}
          className="w-full accent-gold disabled:opacity-30"
        />
      </div>

      <div className="text-right">
        <div className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-muted">
          What-if
        </div>
        <div
          className={
            'font-serif font-semibold text-sm ' +
            (deltaCost == null
              ? 'text-muted'
              : deltaCost > 0
                ? 'text-attention'
                : deltaCost < 0
                  ? 'text-healthy'
                  : 'text-ink')
          }
        >
          {simCost == null ? '—' : gbp.format(simCost)}
        </div>
        {deltaCost != null && deltaCost !== 0 && (
          <div className="font-serif italic text-[10px] text-muted">
            {deltaCost > 0 ? '+' : ''}
            {gbp.format(deltaCost)}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultTile({
  label,
  current,
  simulated,
  changed,
  simulatedClass,
  sub,
}: {
  label: string;
  current: string;
  simulated: string;
  changed: boolean;
  simulatedClass?: string;
  sub?: string;
}) {
  return (
    <div className="bg-card px-5 py-4">
      <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-muted mb-2">
        {label}
      </div>
      {changed ? (
        <>
          <div className="font-serif italic text-xs text-muted-soft line-through mb-1">
            {current}
          </div>
          <div
            className={`font-serif font-medium text-2xl leading-none ${simulatedClass ?? 'text-ink'}`}
          >
            {simulated}
          </div>
        </>
      ) : (
        <div className={`font-serif font-medium text-2xl leading-none ${simulatedClass ?? 'text-ink'}`}>
          {current}
        </div>
      )}
      {sub && (
        <div className="font-serif italic text-xs text-muted mt-1">{sub}</div>
      )}
    </div>
  );
}
