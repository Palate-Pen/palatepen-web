import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getPeriodSummary, getMarginRollup } from '@/lib/oversight';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { PrintButton } from '@/components/shell/PrintButton';

export const metadata = { title: 'Reports — Manager — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});

export default async function ManagerReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string }>;
}) {
  const ctx = await getShellContext();
  const sp = searchParams ? await searchParams : undefined;
  const days =
    sp?.period === '90'
      ? 90
      : sp?.period === '7'
        ? 7
        : 30;
  const [period, margins] = await Promise.all([
    getPeriodSummary(ctx.siteId, days),
    getMarginRollup(ctx.siteId),
  ]);

  return (
    <div className="printable px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1200px] mx-auto">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            Site · Period Picture
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
            <em className="text-gold font-semibold not-italic">Reports</em>
          </h1>
          <p className="font-serif italic text-lg text-muted">
            Last {days} days of operational state — spend, waste, margin
            drift. Export bundles for accountants land with the Phase 5
            reporting build.
          </p>
        </div>
        <div className="print-hide">
          <PrintButton label="Print report" />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-8 print-hide">
        {[7, 30, 90].map((d) => (
          <Link
            key={d}
            href={`/manager/reports?period=${d}`}
            className={
              'font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 border transition-colors ' +
              (days === d
                ? 'bg-gold text-paper border-gold'
                : 'bg-transparent text-muted border-rule hover:border-gold hover:text-gold')
            }
          >
            Last {d} days
          </Link>
        ))}
      </div>

      <SectionHead title="Operational" meta={`last ${days} days`} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Spend"
          value={gbp.format(period.confirmed_total)}
          sub={`${period.confirmed_count} invoices banked`}
        />
        <KpiCard
          label="Waste"
          value={gbp.format(period.waste_value)}
          sub={`${period.waste_count} entries`}
          tone={period.waste_value > 200 ? 'attention' : undefined}
        />
        <KpiCard
          label="Flagged Invoices"
          value={String(period.flagged_count)}
          sub={period.flagged_count === 0 ? 'all clean' : 'awaiting credit notes'}
          tone={period.flagged_count > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Top Supplier"
          value={period.top_supplier_name ?? '—'}
          sub={
            period.top_supplier_spend > 0
              ? gbp.format(period.top_supplier_spend) + ' spend'
              : ''
          }
        />
      </div>

      <SectionHead title="Margins" meta="recipe drift snapshot" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Costed"
          value={String(margins.costed_count)}
          sub="recipes with baseline"
        />
        <KpiCard
          label="Priced"
          value={String(margins.priced_count)}
          sub="costed + sell price set"
        />
        <KpiCard
          label="Avg GP"
          value={
            margins.priced_count === 0
              ? '—'
              : margins.avg_gp_pct.toFixed(0) + '%'
          }
          sub="across priced recipes"
        />
        <KpiCard
          label="Drifting"
          value={String(margins.drift_count)}
          sub="moved >3% from baseline"
          tone={margins.drift_count > 0 ? 'attention' : 'healthy'}
        />
      </div>

      {margins.drift_top.length > 0 && (
        <div className="bg-card border border-rule">
          <div className="px-7 py-3 bg-paper-warm border-b border-rule font-display font-semibold text-xs tracking-[0.3em] uppercase text-muted">
            Top Drift
          </div>
          {margins.drift_top.map((d, i) => (
            <Link
              key={d.id}
              href={`/recipes/${d.id}`}
              className={
                'block px-7 py-4 hover:bg-paper-warm transition-colors' +
                (i < margins.drift_top.length - 1
                  ? ' border-b border-rule-soft'
                  : '')
              }
            >
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <div className="font-serif font-semibold text-base text-ink">
                  {d.name}
                </div>
                <div
                  className={
                    'font-serif font-semibold text-sm ' +
                    (Math.abs(d.drift_pct) > 8
                      ? 'text-urgent'
                      : 'text-attention')
                  }
                >
                  {d.drift_pct > 0 ? '+' : ''}
                  {d.drift_pct.toFixed(0)}%
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
