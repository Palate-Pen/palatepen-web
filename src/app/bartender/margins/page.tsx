import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getRecipes, type Recipe } from '@/lib/recipes';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { LookingAhead } from '@/components/shell/LookingAhead';
import { PrintButton } from '@/components/shell/PrintButton';
import { BAR_DISH_TYPES, POUR_COST_BANDS } from '@/lib/bar';
import { GPBenchmarkPanel } from '@/components/gp/GPBenchmarkPanel';

export const metadata = { title: 'Margins — Bar — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

export default async function BarMarginsPage() {
  const ctx = await getShellContext();
  const specs = await getRecipes(ctx.siteId, { dishTypes: BAR_DISH_TYPES });

  const costedWithPrice = specs.filter(
    (s) =>
      s.cost_per_cover != null && s.sell_price != null && s.sell_price > 0,
  );

  const withBands = costedWithPrice.map((s) => {
    const band = POUR_COST_BANDS[s.dish_type] ?? POUR_COST_BANDS.cocktail;
    const pourCostPct = s.cost_per_cover! / s.sell_price!;
    const tone =
      pourCostPct <= band.healthy_max
        ? 'healthy'
        : pourCostPct <= band.attention_max
          ? 'attention'
          : 'urgent';
    return { spec: s, band, pourCostPct, tone };
  });

  const healthyCount = withBands.filter((w) => w.tone === 'healthy').length;
  const attentionCount = withBands.filter(
    (w) => w.tone === 'attention',
  ).length;
  const urgentCount = withBands.filter((w) => w.tone === 'urgent').length;
  const avgGP =
    withBands.length > 0
      ? withBands.reduce((acc, w) => acc + (1 - w.pourCostPct), 0) /
        withBands.length
      : 0;

  // Drift detection — costed_at vs current cost
  const drifting = specs.filter((s) => {
    if (s.cost_baseline == null || s.cost_per_cover == null) return false;
    return (
      Math.abs(s.cost_per_cover - s.cost_baseline) / s.cost_baseline > 0.03
    );
  });

  // Group by type
  const byType: Record<string, typeof withBands> = {};
  for (const w of withBands) {
    const k = w.spec.dish_type;
    byType[k] ??= [];
    byType[k].push(w);
  }

  return (
    <div className="printable px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            The Pour-Cost Picture
          </div>
          <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] text-ink mb-3">
            <em className="text-gold font-semibold not-italic">Margins</em>
          </h1>
          <p className="font-serif italic text-lg text-muted">
            {subtitleFor(withBands, urgentCount, attentionCount, drifting.length)}
          </p>
        </div>
        <div className="print-hide">
          {specs.length > 0 && <PrintButton label="Print bar margins" />}
        </div>
      </div>

      {specs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
          <KpiCard
            label="Avg GP"
            value={
              withBands.length > 0 ? `${(avgGP * 100).toFixed(0)}%` : '—'
            }
            sub={`across ${withBands.length} priced specs`}
            tone={avgGP >= 0.75 ? 'healthy' : avgGP >= 0.65 ? undefined : 'attention'}
          />
          <KpiCard
            label="In Band"
            value={String(healthyCount)}
            sub="comfortable pour cost"
            tone={healthyCount > 0 ? 'healthy' : undefined}
          />
          <KpiCard
            label="At The Top"
            value={String(attentionCount)}
            sub="watching closely"
            tone={attentionCount > 0 ? 'attention' : undefined}
          />
          <KpiCard
            label="Out Of Band"
            value={String(urgentCount)}
            sub="margin leak"
            tone={urgentCount > 0 ? 'urgent' : undefined}
          />
        </div>
      )}

      {Object.keys(byType).length === 0 ? (
        <div className="bg-card border border-rule px-10 py-16 text-center">
          <div className="font-serif text-2xl text-ink mb-2">
            Margins waiting on data.
          </div>
          <p className="font-serif italic text-muted">
            Set sell prices on your specs so the system can compute pour cost against the industry bands.
          </p>
        </div>
      ) : (
        Object.entries(byType).map(([type, rows]) => (
          <section key={type} className="mb-12">
            <SectionHead
              title={typeHeader(type)}
              meta={
                POUR_COST_BANDS[type as keyof typeof POUR_COST_BANDS]
                  ? `band ${(POUR_COST_BANDS[type as keyof typeof POUR_COST_BANDS].healthy_max * 100).toFixed(0)}-${(POUR_COST_BANDS[type as keyof typeof POUR_COST_BANDS].attention_max * 100).toFixed(0)}%`
                  : undefined
              }
            />
            <SpecTable rows={rows} />
          </section>
        ))
      )}

      <section className="mt-12 mb-12">
        <GPBenchmarkPanel flavour="bar" />
      </section>

      <LookingAhead siteId={ctx.siteId} surface="bar_margins" />
    </div>
  );
}

function subtitleFor(
  rows: Array<{ spec: Recipe; pourCostPct: number; tone: string }>,
  urgent: number,
  attention: number,
  driftCount: number,
): string {
  if (rows.length === 0) {
    return 'Margins waiting on costed + priced specs. Set sell prices on your specs to begin.';
  }
  const parts: string[] = [];
  if (urgent > 0) parts.push(`${urgent} out of band`);
  if (attention > 0) parts.push(`${attention} watching`);
  if (driftCount > 0)
    parts.push(`${driftCount} ${driftCount === 1 ? 'spec' : 'specs'} drifting since costed`);
  if (parts.length === 0) return 'Every spec sits inside its band. Clean picture across the list.';
  return parts.join(', ') + '.';
}

function typeHeader(type: string): string {
  switch (type) {
    case 'cocktail':
      return 'Cocktails';
    case 'wine':
      return 'Wines';
    case 'beer':
      return 'Beers';
    case 'soft':
      return 'Softs';
    case 'spirit':
      return 'Spirits';
    default:
      return type;
  }
}

function SpecTable({
  rows,
}: {
  rows: Array<{
    spec: Recipe;
    band: { healthy_max: number; attention_max: number };
    pourCostPct: number;
    tone: string;
  }>;
}) {
  return (
    <div className="bg-card border border-rule">
      <div className="hidden md:grid grid-cols-[2fr_110px_110px_110px_110px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
        {['Spec', 'Cost / Pour', 'Sell', 'Pour Cost', 'GP'].map((h, i) => (
          <div
            key={i}
            className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
          >
            {h}
          </div>
        ))}
      </div>
      {rows
        .sort((a, b) => b.pourCostPct - a.pourCostPct)
        .map((r, i) => (
          <SpecRow key={r.spec.id} row={r} last={i === rows.length - 1} />
        ))}
    </div>
  );
}

function SpecRow({
  row,
  last,
}: {
  row: {
    spec: Recipe;
    band: { healthy_max: number; attention_max: number };
    pourCostPct: number;
    tone: string;
  };
  last: boolean;
}) {
  const toneColor =
    row.tone === 'healthy'
      ? 'text-healthy'
      : row.tone === 'attention'
        ? 'text-attention'
        : 'text-urgent';
  return (
    <Link
      href={`/bartender/specs/${row.spec.id}`}
      className={
        'grid grid-cols-1 md:grid-cols-[2fr_110px_110px_110px_110px] gap-4 px-7 py-4 items-center hover:bg-paper-warm transition-colors' +
        (last ? '' : ' border-b border-rule-soft')
      }
    >
      <div>
        <div className="font-serif font-semibold text-base text-ink">
          {row.spec.name}
        </div>
        {row.spec.menu_section && (
          <div className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted mt-0.5">
            {row.spec.menu_section}
          </div>
        )}
      </div>
      <div className="font-serif text-sm text-ink">
        {gbp.format(row.spec.cost_per_cover!)}
      </div>
      <div className="font-serif text-sm text-ink">
        {gbp.format(row.spec.sell_price!)}
      </div>
      <div className={'font-serif font-semibold text-sm ' + toneColor}>
        {(row.pourCostPct * 100).toFixed(0)}%
      </div>
      <div className="font-serif font-semibold text-sm text-ink">
        {((1 - row.pourCostPct) * 100).toFixed(0)}%
      </div>
    </Link>
  );
}
