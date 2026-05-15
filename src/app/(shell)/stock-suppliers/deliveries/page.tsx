import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getDeliveries, type DeliveryRow } from '@/lib/deliveries';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { PrintButton } from '@/components/shell/PrintButton';
import {
  ScheduleDeliveryDialog,
  type SupplierOption,
} from './ScheduleDeliveryDialog';

export const metadata = { title: 'Deliveries — Palatable' };

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

export default async function DeliveriesPage() {
  const ctx = await getShellContext();
  const supabase = await createSupabaseServerClient();
  const [data, suppliersResp] = await Promise.all([
    getDeliveries(ctx.siteId),
    supabase
      .from('suppliers')
      .select('id, name')
      .eq('site_id', ctx.siteId)
      .order('name', { ascending: true }),
  ]);
  const suppliers: SupplierOption[] = (suppliersResp.data ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
  }));

  return (
    <div className="printable px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-start gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            The Walk-in · Deliveries
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
            <em className="text-gold font-semibold not-italic">Deliveries</em>
          </h1>
          <p className="font-serif italic text-lg text-muted mt-3">
            {subtitle(data)}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap print-hide">
          {(data.today.length + data.upcoming.length) > 0 && (
            <PrintButton label="Print delivery sheet" />
          )}
          <ScheduleDeliveryDialog suppliers={suppliers} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Today"
          value={String(data.today.length)}
          sub={data.today.length === 0 ? 'nothing expected today' : pluralize(data.today.length, 'delivery', 'deliveries')}
          tone={data.today.length > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Next 7 Days"
          value={String(data.upcoming.length)}
          sub={
            data.total_expected_value_7d > 0
              ? `${gbp.format(data.total_expected_value_7d)} expected`
              : 'on the books'
          }
        />
        <KpiCard
          label="Arrived (30d)"
          value={String(data.arrived_count_30d)}
          sub="confirmed in"
          tone="healthy"
        />
        <KpiCard
          label="Missed (30d)"
          value={String(data.missed_count_30d)}
          sub={data.missed_count_30d === 0 ? 'clean record' : 'didn’t show'}
          tone={data.missed_count_30d > 0 ? 'urgent' : 'healthy'}
        />
      </div>

      <section className="mt-12">
        <SectionHead
          title="Today"
          meta={
            data.today.length === 0
              ? 'nothing in today'
              : pluralize(data.today.length, 'arrival', 'arrivals')
          }
        />
        {data.today.length === 0 ? (
          <EmptyState text="No expected deliveries for today. A quiet morning." />
        ) : (
          <DeliveriesTable rows={data.today} highlight="today" />
        )}
      </section>

      <section className="mt-12">
        <SectionHead
          title="Next 7 Days"
          meta={
            data.upcoming.length === 0
              ? 'all clear'
              : pluralize(data.upcoming.length, 'expected', 'expected')
          }
        />
        {data.upcoming.length === 0 ? (
          <EmptyState text="Nothing scheduled in the next week." />
        ) : (
          <DeliveriesTable rows={data.upcoming} />
        )}
      </section>

      <section className="mt-12">
        <SectionHead
          title="Recent (30 days)"
          meta={
            data.recent.length === 0
              ? 'no history yet'
              : pluralize(data.recent.length, 'past delivery', 'past deliveries')
          }
        />
        {data.recent.length === 0 ? (
          <EmptyState text="As deliveries land, they show up here." />
        ) : (
          <DeliveriesTable rows={data.recent} muted />
        )}
      </section>
    </div>
  );
}

function subtitle(data: Awaited<ReturnType<typeof getDeliveries>>): string {
  if (data.today.length === 0 && data.upcoming.length === 0) {
    return 'Nothing expected this week. The week is quiet.';
  }
  if (data.today.length > 0) {
    return `${data.today.length} ${data.today.length === 1 ? 'delivery' : 'deliveries'} today, ${data.upcoming.length} more in the coming days. The kitchen is restocking.`;
  }
  return `${data.upcoming.length} ${data.upcoming.length === 1 ? 'delivery' : 'deliveries'} coming up in the next week.`;
}

function pluralize(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-card border border-rule px-10 py-10 text-center">
      <p className="font-serif italic text-muted">{text}</p>
    </div>
  );
}

function DeliveriesTable({
  rows,
  muted,
  highlight,
}: {
  rows: DeliveryRow[];
  muted?: boolean;
  highlight?: 'today';
}) {
  return (
    <div className={`bg-card border border-rule ${muted ? 'opacity-75' : ''}`}>
      <div className="hidden md:grid grid-cols-[110px_2fr_90px_110px_110px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
        {['Date', 'Supplier', 'Lines', 'Value', 'Status'].map((h) => (
          <div
            key={h}
            className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
          >
            {h}
          </div>
        ))}
      </div>
      {rows.map((row, i) => (
        <DeliveryRowView
          key={row.id}
          row={row}
          last={i === rows.length - 1}
          highlight={highlight}
        />
      ))}
    </div>
  );
}

function DeliveryRowView({
  row,
  last,
  highlight,
}: {
  row: DeliveryRow;
  last: boolean;
  highlight?: 'today';
}) {
  return (
    <div
      className={
        'grid grid-cols-1 md:grid-cols-[110px_2fr_90px_110px_110px] gap-4 px-7 py-4 items-center ' +
        (last ? '' : 'border-b border-rule-soft') +
        (highlight === 'today' ? ' bg-gold-bg/30' : '')
      }
    >
      <div className="font-serif text-sm text-ink">
        {dateFmt.format(new Date(row.expected_at))}
      </div>
      <div className="font-serif font-semibold text-base text-ink">
        {row.supplier_name}
        {row.notes && (
          <div className="font-serif italic text-xs text-muted mt-0.5">
            {row.notes}
          </div>
        )}
      </div>
      <div className="font-serif text-sm text-ink">
        {row.line_count_estimate ?? '—'}
      </div>
      <div className="font-serif font-semibold text-sm text-ink">
        {row.value_estimate != null ? gbp.format(row.value_estimate) : '—'}
      </div>
      <div>
        <StatusPill status={row.status} arrivedAt={row.arrived_at} />
      </div>
    </div>
  );
}

function StatusPill({
  status,
  arrivedAt,
}: {
  status: DeliveryRow['status'];
  arrivedAt: string | null;
}) {
  const map = {
    expected: { label: 'Expected', classes: 'text-gold bg-gold-bg border-gold/40' },
    arrived: { label: arrivedAt ? 'Arrived' : 'Arrived', classes: 'text-healthy bg-healthy/10 border-healthy/40' },
    missed: { label: 'Missed', classes: 'text-urgent bg-urgent/10 border-urgent/40' },
    cancelled: { label: 'Cancelled', classes: 'text-muted bg-paper-warm border-rule' },
  } as const;
  const { label, classes } = map[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 border font-display font-semibold text-[10px] tracking-[0.18em] uppercase rounded-sm ${classes}`}
    >
      {label}
    </span>
  );
}

function _BackLink() {
  return (
    <Link
      href="/stock-suppliers"
      className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
    >
      ← Back to The Walk-in
    </Link>
  );
}
