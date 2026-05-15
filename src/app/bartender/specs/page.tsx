import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getRecipes, type Recipe } from '@/lib/recipes';
import { KpiCard } from '@/components/shell/KpiCard';
import { LookingAhead } from '@/components/shell/LookingAhead';
import { BAR_DISH_TYPES, POUR_COST_BANDS } from '@/lib/bar';

export const metadata = { title: 'Specs — Bar — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

const TECHNIQUE_LABEL: Record<string, string> = {
  build: 'Build',
  stir: 'Stir',
  shake: 'Shake',
  throw: 'Throw',
  rolled: 'Rolled',
  blended: 'Blended',
};

export default async function BarSpecsPage() {
  const ctx = await getShellContext();
  const specs = await getRecipes(ctx.siteId, { dishTypes: BAR_DISH_TYPES });

  const costed = specs.filter((s) => s.cost_per_cover != null);
  const avgCost =
    costed.length > 0
      ? costed.reduce((s, r) => s + (r.cost_per_cover ?? 0), 0) /
        costed.length
      : 0;
  const fullyMatched = specs.filter(
    (s) =>
      s.ingredients.length > 0 &&
      s.matched_ingredient_count === s.ingredients.length,
  ).length;
  const matchPct =
    specs.length > 0 ? Math.round((fullyMatched / specs.length) * 100) : 0;

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-start gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            The Drinks Book
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
            <em className="text-gold font-semibold not-italic">Specs</em>
          </h1>
          <p className="font-serif italic text-lg text-muted">
            {specs.length === 0 ? (
              <>No specs yet. Add a drink and the cost-per-pour stays live as bottle prices move.</>
            ) : (
              <>
                {specs.length} {specs.length === 1 ? 'spec' : 'specs'}. Pour-cost computed live from the Cellar.
              </>
            )}
          </p>
        </div>
        <Link
          href="/recipes/new"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors whitespace-nowrap"
        >
          + Add spec
        </Link>
      </div>

      {specs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
          <KpiCard
            label="Drinks On The List"
            value={String(specs.length)}
            sub={costed.length === specs.length ? 'all costed' : `${costed.length} costed`}
          />
          <KpiCard
            label="Avg Cost / Pour"
            value={avgCost > 0 ? gbp.format(avgCost) : '—'}
            sub="live from Cellar"
          />
          <KpiCard
            label="Cellar Match"
            value={`${matchPct}%`}
            sub={`${fullyMatched}/${specs.length} fully linked`}
            tone={
              matchPct === 100
                ? 'healthy'
                : matchPct >= 70
                  ? undefined
                  : 'attention'
            }
          />
          <KpiCard
            label="Avg Margin"
            value={avgMarginLabel(specs)}
            sub="across costed specs"
          />
        </div>
      )}

      {specs.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-16 text-center">
          <div className="font-serif text-2xl text-ink mb-2">
            Nothing on the list yet.
          </div>
          <p className="font-serif italic text-muted">
            Add a spec — link its components to the Cellar — and the cost-per-pour stays current as bottle prices move.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {specs.map((s) => (
            <SpecCard key={s.id} spec={s} />
          ))}
        </div>
      )}

      <LookingAhead siteId={ctx.siteId} surface="specs" />
    </div>
  );
}

function avgMarginLabel(specs: Recipe[]): string {
  const withMargin = specs.filter(
    (s) =>
      s.cost_per_cover != null && s.sell_price != null && s.sell_price > 0,
  );
  if (withMargin.length === 0) return '—';
  const avg =
    withMargin.reduce(
      (acc, s) =>
        acc + (s.cost_per_cover! / s.sell_price!) * 100,
      0,
    ) / withMargin.length;
  return `${avg.toFixed(0)}%`;
}

function SpecCard({ spec }: { spec: Recipe }) {
  const allMatched =
    spec.ingredients.length > 0 &&
    spec.matched_ingredient_count === spec.ingredients.length;

  const band = POUR_COST_BANDS[spec.dish_type] ?? POUR_COST_BANDS.cocktail;
  const pourCostPct =
    spec.cost_per_cover != null && spec.sell_price && spec.sell_price > 0
      ? spec.cost_per_cover / spec.sell_price
      : null;
  const pourCostTone =
    pourCostPct == null
      ? 'muted'
      : pourCostPct <= band.healthy_max
        ? 'healthy'
        : pourCostPct <= band.attention_max
          ? 'attention'
          : 'urgent';
  const toneColor =
    pourCostTone === 'healthy'
      ? 'text-healthy'
      : pourCostTone === 'attention'
        ? 'text-attention'
        : pourCostTone === 'urgent'
          ? 'text-urgent'
          : 'text-muted';

  const meta = [
    spec.glass_type,
    spec.technique ? TECHNIQUE_LABEL[spec.technique] : null,
    spec.pour_ml != null ? `${spec.pour_ml}ml` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link
      href={`/bartender/specs/${spec.id}`}
      className="bg-card border border-rule cursor-pointer transition-all hover:border-gold hover:shadow-[0_4px_16px_rgba(26,22,18,0.08)] flex flex-col"
    >
      <div className="px-6 py-6 border-b border-rule">
        <div className="font-serif font-semibold text-2xl text-ink leading-tight">
          {spec.name}
        </div>
        {meta && (
          <div className="text-xs text-muted mt-2 tracking-[0.02em]">
            {meta}
          </div>
        )}
        {spec.menu_section && (
          <div className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-gold mt-2">
            {spec.menu_section}
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-b border-rule flex justify-between items-center bg-gradient-to-r from-[rgba(184,146,60,0.05)] to-transparent">
        <div>
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted mb-1">
            Cost per pour
          </div>
          {spec.cost_per_cover != null ? (
            <div
              className={
                'font-serif font-semibold text-xl ' +
                (allMatched ? 'text-ink' : 'text-ink-soft')
              }
            >
              {gbp.format(spec.cost_per_cover)}
            </div>
          ) : (
            <div className="font-serif italic text-sm text-muted">
              cost pending
            </div>
          )}
        </div>
        {pourCostPct != null && (
          <div className="text-right">
            <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted mb-1">
              Pour cost
            </div>
            <div className={'font-serif font-semibold text-xl ' + toneColor}>
              {(pourCostPct * 100).toFixed(0)}%
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-5 flex-1">
        {spec.ingredients.length === 0 ? (
          <div className="font-serif italic text-sm text-muted-soft">
            No build sheet yet.
          </div>
        ) : (
          spec.ingredients.slice(0, 5).map((ing, i) => (
            <div
              key={ing.id}
              className={
                'flex justify-between items-baseline gap-3 py-1.5' +
                (i < Math.min(4, spec.ingredients.length - 1)
                  ? ' border-b border-rule-soft'
                  : '')
              }
            >
              <div className="font-serif text-sm text-ink flex-1">
                {ing.name}
              </div>
              <div className="text-xs text-muted whitespace-nowrap">
                {ing.qty} {ing.unit}
              </div>
            </div>
          ))
        )}
        {spec.ingredients.length > 5 && (
          <div className="font-serif italic text-xs text-muted-soft pt-2">
            + {spec.ingredients.length - 5} more
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-rule bg-paper flex justify-between items-center">
        <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
          Open spec →
        </span>
        {spec.sell_price != null && (
          <span className="font-serif text-sm text-ink-soft">
            {gbp.format(spec.sell_price)}
          </span>
        )}
      </div>
    </Link>
  );
}
