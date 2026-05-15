import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { OwnerPageHeader } from '@/components/owner/OwnerScaffold';
import { getPeriodSummary } from '@/lib/oversight';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';

export const metadata = { title: 'Revenue — Owner — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});

export default async function OwnerRevenuePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id, sites:site_id (name)')
    .eq('user_id', user.id)
    .eq('role', 'owner');

  const sites = (memberships ?? []) as unknown as Array<{
    site_id: string;
    sites: { name: string | null } | null;
  }>;

  const summaries = await Promise.all(
    sites.map((s) =>
      getPeriodSummary(s.site_id, 30).then((sum) => ({
        siteId: s.site_id,
        siteName: s.sites?.name ?? 'Site',
        ...sum,
      })),
    ),
  );

  const totalSpend = summaries.reduce((a, s) => a + s.confirmed_total, 0);
  const totalWaste = summaries.reduce((a, s) => a + s.waste_value, 0);

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1200px] mx-auto">
      <OwnerPageHeader
        eyebrow="The Money In"
        title="Revenue"
        subtitle="Where the income side stands. POS integration pending — the cost-side view below is the inverse picture, showing the rhythm of money out."
        activeSlug="revenue"
      />

      <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-6 mb-10">
        <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-gold mb-2">
          Revenue side pending
        </div>
        <p className="font-serif italic text-base text-ink-soft leading-relaxed">
          Income figures land when POS integration (Square, ePOSnow) is
          wired into Connections — manual revenue entry as a fast-path
          is on the roadmap. In the meantime, the cost-side numbers
          below show what's flowing OUT.
        </p>
      </div>

      <SectionHead
        title="Cost-Side (Last 30 Days)"
        meta="across owned sites"
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Spend (banked)"
          value={gbp.format(totalSpend)}
          sub="confirmed invoices"
        />
        <KpiCard
          label="Waste"
          value={gbp.format(totalWaste)}
          sub="across all sites"
          tone={totalWaste > 500 ? 'attention' : undefined}
        />
        <KpiCard
          label="Sites"
          value={String(sites.length)}
          sub="owned + active"
        />
        <KpiCard
          label="COGS (est.)"
          value={gbp.format(totalSpend)}
          sub="banked spend ≈ COGS"
        />
      </div>

      {summaries.length > 1 && (
        <>
          <SectionHead title="Per Site" />
          <div className="bg-card border border-rule">
            <div className="hidden md:grid grid-cols-[2fr_120px_120px_120px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
              {['Site', 'Spend', 'Waste', 'Invoices'].map((h) => (
                <div
                  key={h}
                  className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
                >
                  {h}
                </div>
              ))}
            </div>
            {summaries.map((s, i) => (
              <div
                key={s.siteId}
                className={
                  'grid grid-cols-1 md:grid-cols-[2fr_120px_120px_120px] gap-4 px-7 py-4 items-center' +
                  (i < summaries.length - 1
                    ? ' border-b border-rule-soft'
                    : '')
                }
              >
                <div className="font-serif font-semibold text-base text-ink">
                  {s.siteName}
                </div>
                <div className="font-serif text-sm text-ink">
                  {gbp.format(s.confirmed_total)}
                </div>
                <div className="font-serif text-sm text-ink">
                  {gbp.format(s.waste_value)}
                </div>
                <div className="font-serif italic text-xs text-muted">
                  {s.confirmed_count} banked
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="font-serif italic text-sm text-muted mt-6">
        <Link
          href="/connections"
          className="text-gold hover:text-gold-dark transition-colors"
        >
          Wire up POS in Connections
        </Link>{' '}
        when integrations land to flip this surface to real revenue.
      </p>
    </div>
  );
}
