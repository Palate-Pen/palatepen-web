import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getPeriodSummary } from '@/lib/oversight';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { PrintButton } from '@/components/shell/PrintButton';

export const metadata = { title: 'P&L — Manager — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});
const gbp2 = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

export default async function ManagerPLPage() {
  const ctx = await getShellContext();
  const [d7, d30] = await Promise.all([
    getPeriodSummary(ctx.siteId, 7),
    getPeriodSummary(ctx.siteId, 30),
  ]);

  return (
    <div className="printable px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            Site · The Money
          </div>
          <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] text-ink mb-3">
            <em className="text-gold font-semibold not-italic">P&L</em>
          </h1>
          <p className="font-serif italic text-lg text-muted">
            The cost side is real — pulled from confirmed invoices + waste +
            recipe COGS. Revenue side waits on POS integration. Period view
            below shows where the money has gone.
          </p>
        </div>
        <div className="print-hide">
          <PrintButton label="Print P&L" />
        </div>
      </div>

      <SectionHead title="Last 30 Days" meta="confirmed invoices + waste" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Spend"
          value={gbp.format(d30.confirmed_total)}
          sub={`${d30.confirmed_count} invoices banked`}
        />
        <KpiCard
          label="Waste"
          value={gbp.format(d30.waste_value)}
          sub={`${d30.waste_count} entries`}
          tone={d30.waste_value > 200 ? 'attention' : undefined}
        />
        <KpiCard
          label="Flagged"
          value={String(d30.flagged_count)}
          sub={d30.flagged_count === 0 ? 'all clean' : 'invoices in dispute'}
          tone={d30.flagged_count > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Top Supplier"
          value={d30.top_supplier_name ?? '—'}
          sub={
            d30.top_supplier_spend > 0
              ? gbp.format(d30.top_supplier_spend) + ' spend'
              : ''
          }
        />
      </div>

      <SectionHead title="Last 7 Days" meta="this week" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard label="Spend" value={gbp.format(d7.confirmed_total)} sub={`${d7.confirmed_count} banked`} />
        <KpiCard label="Waste" value={gbp.format(d7.waste_value)} sub={`${d7.waste_count} entries`} />
        <KpiCard
          label="Flagged"
          value={String(d7.flagged_count)}
          sub=""
          tone={d7.flagged_count > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="COGS (est.)"
          value={gbp.format(d7.cogs_estimate)}
          sub="banked spend = COGS approx"
        />
      </div>

      <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-6 mb-10">
        <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-gold mb-2">
          Revenue side
        </div>
        <p className="font-serif italic text-base text-ink-soft leading-relaxed">
          Revenue input pending — currently we only see the spend side
          of the P&L. Once POS integration (Square, ePOSnow) lands in
          Connections, GP% and net margin land here automatically. In
          the meantime, manual revenue entry is on the roadmap as a
          fast-path.
        </p>
      </div>

      <div className="flex items-center gap-3 print-hide">
        <Link
          href="/stock-suppliers/invoices"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
        >
          Open Invoices →
        </Link>
        <Link
          href="/stock-suppliers/waste"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
        >
          Open Waste →
        </Link>
      </div>

      <p className="font-serif italic text-xs text-muted mt-6">
        Last 30d totals reflect {gbp2.format(d30.invoiced_total)} invoiced gross
        ({d30.invoiced_count} invoices, {d30.confirmed_count} confirmed,
        {' '}{d30.flagged_count} flagged).
      </p>
    </div>
  );
}
