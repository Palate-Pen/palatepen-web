import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { OwnerPageHeader } from '@/components/owner/OwnerScaffold';
import { getPeriodSummary, getMarginRollup } from '@/lib/oversight';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { PrintButton } from '@/components/shell/PrintButton';

export const metadata = { title: 'Reports — Owner — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});

export default async function OwnerReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const sp = searchParams ? await searchParams : undefined;
  const days = sp?.period === '90' ? 90 : sp?.period === '7' ? 7 : 30;

  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id, sites:site_id (name)')
    .eq('user_id', user.id)
    .eq('role', 'owner');
  const sites = (memberships ?? []) as unknown as Array<{
    site_id: string;
    sites: { name: string | null } | null;
  }>;

  const perSite = await Promise.all(
    sites.map((s) =>
      Promise.all([
        getPeriodSummary(s.site_id, days),
        getMarginRollup(s.site_id),
      ]).then(([sum, m]) => ({
        siteName: s.sites?.name ?? 'Site',
        summary: sum,
        margins: m,
      })),
    ),
  );

  const grandSpend = perSite.reduce(
    (a, s) => a + s.summary.confirmed_total,
    0,
  );
  const grandWaste = perSite.reduce((a, s) => a + s.summary.waste_value, 0);
  const grandDrift = perSite.reduce((a, s) => a + s.margins.drift_count, 0);
  const grandFlagged = perSite.reduce(
    (a, s) => a + s.summary.flagged_count,
    0,
  );

  return (
    <div className="printable px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1200px] mx-auto">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-2">
        <div className="flex-1 min-w-[280px]">
          <OwnerPageHeader
            eyebrow="The Period Picture"
            title="Reports"
            subtitle="Period rollup across every site. PDF + CSV export bundles for the accountant land with the Phase 5 reporting build."
            activeSlug="reports"
          />
        </div>
        <div className="print-hide pt-2">
          <PrintButton label="Print report" />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-8 print-hide">
        {[7, 30, 90].map((d) => (
          <Link
            key={d}
            href={`/owner/reports?period=${d}`}
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard label="Spend" value={gbp.format(grandSpend)} sub="banked" />
        <KpiCard
          label="Waste"
          value={gbp.format(grandWaste)}
          sub="across sites"
          tone={grandWaste > 500 ? 'attention' : undefined}
        />
        <KpiCard
          label="Margin Drift"
          value={String(grandDrift)}
          sub="dishes >3% from baseline"
          tone={grandDrift > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Flagged Invoices"
          value={String(grandFlagged)}
          sub={grandFlagged === 0 ? 'all clean' : 'awaiting credit notes'}
          tone={grandFlagged > 0 ? 'attention' : undefined}
        />
      </div>

      <SectionHead title="Per Site" />
      <div className="bg-card border border-rule mb-10">
        <div className="hidden md:grid grid-cols-[2fr_120px_120px_110px_90px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
          {['Site', 'Spend', 'Waste', 'Avg GP', 'Drift'].map((h) => (
            <div
              key={h}
              className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
            >
              {h}
            </div>
          ))}
        </div>
        {perSite.map((s, i) => (
          <div
            key={s.siteName}
            className={
              'grid grid-cols-1 md:grid-cols-[2fr_120px_120px_110px_90px] gap-4 px-7 py-4 items-center' +
              (i < perSite.length - 1 ? ' border-b border-rule-soft' : '')
            }
          >
            <div className="font-serif font-semibold text-base text-ink">
              {s.siteName}
            </div>
            <div className="font-serif text-sm text-ink">
              {gbp.format(s.summary.confirmed_total)}
            </div>
            <div className="font-serif text-sm text-ink">
              {gbp.format(s.summary.waste_value)}
            </div>
            <div className="font-serif text-sm text-ink">
              {s.margins.priced_count > 0
                ? s.margins.avg_gp_pct.toFixed(0) + '%'
                : '—'}
            </div>
            <div className="font-serif text-sm text-attention">
              {s.margins.drift_count}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-5 print-hide">
        <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-gold mb-2">
          Export bundles pending
        </div>
        <p className="font-serif italic text-base text-ink-soft leading-relaxed">
          PDF + CSV downloads for the accountant ship with the Phase 5
          reporting build. Until then, the manager / owner shells
          surface the numbers live.
        </p>
      </div>
    </div>
  );
}
