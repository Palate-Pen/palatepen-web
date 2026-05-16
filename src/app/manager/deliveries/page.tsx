import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getShellContext } from '@/lib/shell/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { PrintButton } from '@/components/shell/PrintButton';

export const metadata = { title: 'Deliveries — Manager — Palatable' };

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
});

export default async function ManagerDeliveriesPage() {
  const ctx = await getShellContext();
  if (!ctx.siteId) redirect('/onboarding');
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data } = await supabase
    .from('deliveries')
    .select(
      'id, expected_at, status, value_estimate, suppliers:supplier_id (name)',
    )
    .eq('site_id', ctx.siteId)
    .gte('expected_at', today)
    .lte('expected_at', horizon)
    .order('expected_at', { ascending: true });

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    expected_at: string;
    status: string;
    value_estimate: number | null;
    suppliers: { name: string | null } | null;
  }>;

  const todayCount = rows.filter((r) => r.expected_at === today).length;
  const totalValue = rows.reduce(
    (s, r) => s + (r.value_estimate != null ? Number(r.value_estimate) : 0),
    0,
  );

  return (
    <div className="printable px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            Site · Coming In
          </div>
          <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] text-ink mb-3">
            <em className="text-gold font-semibold not-italic">Deliveries</em>
          </h1>
          <p className="font-serif italic text-lg text-muted">
            Manager oversight of the next 7 days. Placing orders + full
            delivery history live on the chef The Walk-in surface.
          </p>
        </div>
        <div className="print-hide">
          {rows.length > 0 && <PrintButton label="Print delivery sheet" />}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Today"
          value={String(todayCount)}
          sub={todayCount === 0 ? 'nothing expected' : 'arrivals'}
          tone={todayCount > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Next 7 Days"
          value={String(rows.length)}
          sub="all scheduled"
        />
        <KpiCard
          label="Value (Est.)"
          value={
            totalValue > 0
              ? '£' + totalValue.toFixed(0)
              : '—'
          }
          sub="across the week"
        />
      </div>

      <SectionHead
        title="On The Books This Week"
        meta={rows.length === 0 ? 'nothing scheduled' : `${rows.length} deliveries`}
      />
      {rows.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-12 text-center">
          <p className="font-serif italic text-muted">
            No deliveries scheduled for the next 7 days. Chefs place orders from{' '}
            <Link href="/stock-suppliers/deliveries" className="text-gold hover:text-gold-dark transition-colors">
              The Walk-in → Deliveries
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="bg-card border border-rule">
          <div className="hidden md:grid grid-cols-[100px_1fr_120px_110px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
            {['Date', 'Supplier', 'Status', 'Value (est.)'].map((h) => (
              <div
                key={h}
                className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
              >
                {h}
              </div>
            ))}
          </div>
          {rows.map((r, i) => (
            <div
              key={r.id}
              className={
                'grid grid-cols-1 md:grid-cols-[100px_1fr_120px_110px] gap-4 px-7 py-4 items-center' +
                (i < rows.length - 1 ? ' border-b border-rule-soft' : '')
              }
            >
              <div className="font-serif text-sm text-ink">
                {dateFmt.format(new Date(r.expected_at))}
              </div>
              <div className="font-serif font-semibold text-base text-ink">
                {r.suppliers?.name ?? 'Unknown supplier'}
              </div>
              <div className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted">
                {r.status}
              </div>
              <div className="font-serif font-semibold text-sm text-ink">
                {r.value_estimate != null ? '£' + Number(r.value_estimate).toFixed(0) : '—'}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/stock-suppliers/deliveries"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-transparent text-ink border border-rule hover:border-gold hover:text-gold transition-colors"
        >
          Open full Deliveries →
        </Link>
      </div>
    </div>
  );
}
