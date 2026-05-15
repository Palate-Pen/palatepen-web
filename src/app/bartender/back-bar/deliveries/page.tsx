import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getDeliveries, type DeliveryRow } from '@/lib/deliveries';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { PrintButton } from '@/components/shell/PrintButton';

export const metadata = { title: 'Deliveries — Bar — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});
const dateFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

/**
 * Bar-shell deliveries surface. Reads the same v2.deliveries the chef
 * shell does — suppliers/deliveries/invoices aren't kitchen-vs-bar at
 * the data layer, they're whatever the operator logs. The bar lens
 * here gives the bartender the relevant "what's arriving" frame.
 */
export default async function BarDeliveriesPage() {
  const ctx = await getShellContext();
  const data = await getDeliveries(ctx.siteId);
  const allRows = [...data.today, ...data.upcoming, ...data.recent];

  return (
    <div className="printable px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-start gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            Back Bar · Deliveries
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
            <em className="text-gold font-semibold not-italic">Arriving</em>
          </h1>
          <p className="font-serif italic text-lg text-muted mt-3">
            Spirits, wine, beer, soft, ice — what's on the way and when.
          </p>
        </div>
        <div className="print-hide">
          {allRows.length > 0 && <PrintButton label="Print delivery sheet" />}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Today"
          value={String(data.today.length)}
          sub="expected to land"
        />
        <KpiCard
          label="Upcoming"
          value={String(data.upcoming.length)}
          sub="scheduled this week"
        />
        <KpiCard
          label="7-Day Value"
          value={gbp.format(data.total_expected_value_7d)}
          sub="estimated"
        />
        <KpiCard
          label="Arrived · 30d"
          value={String(data.arrived_count_30d)}
          sub={`${data.missed_count_30d} missed`}
          tone={data.missed_count_30d > 0 ? 'attention' : 'healthy'}
        />
      </div>

      {data.today.length > 0 && (
        <section className="mb-10">
          <SectionHead title="Today" meta={`${data.today.length} expected`} />
          <DeliveriesTable rows={data.today} />
        </section>
      )}

      {data.upcoming.length > 0 && (
        <section className="mb-10">
          <SectionHead title="Upcoming" meta={`${data.upcoming.length} scheduled`} />
          <DeliveriesTable rows={data.upcoming} />
        </section>
      )}

      {data.recent.length > 0 && (
        <section className="mb-10">
          <SectionHead title="Recent" meta={`${data.recent.length} in last 30 days`} />
          <DeliveriesTable rows={data.recent.slice(0, 20)} />
        </section>
      )}

      {allRows.length === 0 && (
        <div className="bg-card border border-rule px-10 py-16 text-center mb-10">
          <p className="font-serif italic text-muted">
            No deliveries logged yet. Schedule one from chef Stock & Suppliers.
          </p>
        </div>
      )}

      <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-5">
        <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold mb-2">
          Note
        </div>
        <p className="font-serif italic text-sm text-ink-soft leading-relaxed">
          Deliveries are shared with the kitchen — what arrives gets logged once and feeds both surfaces. Scheduling new arrivals happens from chef Stock & Suppliers.
        </p>
        <Link
          href="/stock-suppliers/deliveries"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold hover:text-gold-dark transition-colors mt-3 inline-block"
        >
          Open chef Deliveries →
        </Link>
      </div>
    </div>
  );
}

function DeliveriesTable({ rows }: { rows: DeliveryRow[] }) {
  return (
    <div className="bg-card border border-rule">
      <div className="hidden md:grid grid-cols-[140px_2fr_120px_120px_120px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
        {['Expected', 'Supplier', 'Status', 'Est. value', 'Lines'].map((h) => (
          <div key={h} className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted">
            {h}
          </div>
        ))}
      </div>
      {rows.map((d, i) => {
        const tone =
          d.status === 'arrived'
            ? 'text-healthy'
            : d.status === 'missed'
              ? 'text-urgent'
              : 'text-muted';
        return (
          <div
            key={d.id}
            className={
              'grid grid-cols-1 md:grid-cols-[140px_2fr_120px_120px_120px] gap-4 px-7 py-4 items-center ' +
              (i === rows.length - 1 ? '' : 'border-b border-rule-soft')
            }
          >
            <div className="font-serif text-sm text-muted">
              {dateFmt.format(new Date(d.expected_at))}
            </div>
            <div className="font-serif font-semibold text-base text-ink">
              {d.supplier_name}
            </div>
            <div className={`font-display font-semibold text-xs tracking-[0.08em] uppercase ${tone}`}>
              {d.status}
            </div>
            <div className="font-serif text-sm text-ink">
              {d.value_estimate != null ? gbp.format(d.value_estimate) : '—'}
            </div>
            <div className="font-serif text-sm text-ink">
              {d.line_count_estimate ?? '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
