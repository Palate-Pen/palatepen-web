import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { OwnerPageHeader } from '@/components/owner/OwnerScaffold';
import { getMarginRollup } from '@/lib/oversight';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { PrintButton } from '@/components/shell/PrintButton';

export const metadata = { title: 'Margins — Owner — Palatable' };

export default async function OwnerMarginsPage() {
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

  const rollups = await Promise.all(
    sites.map((s) =>
      getMarginRollup(s.site_id).then((r) => ({
        siteId: s.site_id,
        siteName: s.sites?.name ?? 'Site',
        ...r,
      })),
    ),
  );

  const totalCosted = rollups.reduce((a, r) => a + r.costed_count, 0);
  const totalPriced = rollups.reduce((a, r) => a + r.priced_count, 0);
  const totalDrift = rollups.reduce((a, r) => a + r.drift_count, 0);
  const weightedGp =
    totalPriced === 0
      ? 0
      : rollups.reduce(
          (acc, r) => acc + r.avg_gp_pct * r.priced_count,
          0,
        ) / totalPriced;
  const allDrifts = rollups
    .flatMap((r) =>
      r.drift_top.map((d) => ({ ...d, siteName: r.siteName })),
    )
    .sort((a, b) => Math.abs(b.drift_pct) - Math.abs(a.drift_pct))
    .slice(0, 8);

  return (
    <div className="printable px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-2">
        <div className="flex-1 min-w-[280px]">
          <OwnerPageHeader
            eyebrow="The Whole Menu, Across Every Site"
            title="Margins"
            subtitle="Group-wide dish performance. Where margins are slipping, where the kitchen is making money, where to look first."
            activeSlug="margins"
          />
        </div>
        <div className="print-hide pt-2">
          <PrintButton label="Print margins" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Costed"
          value={String(totalCosted)}
          sub="recipes with baseline"
        />
        <KpiCard
          label="Priced"
          value={String(totalPriced)}
          sub="costed + sell price set"
        />
        <KpiCard
          label="Avg GP"
          value={totalPriced === 0 ? '—' : weightedGp.toFixed(0) + '%'}
          sub="across all priced recipes"
          tone={
            weightedGp >= 70
              ? 'healthy'
              : weightedGp >= 60
                ? 'attention'
                : 'urgent'
          }
        />
        <KpiCard
          label="Drifting"
          value={String(totalDrift)}
          sub="moved >3% from baseline"
          tone={totalDrift > 0 ? 'attention' : 'healthy'}
        />
      </div>

      <SectionHead
        title="Top Drift"
        meta={
          allDrifts.length === 0
            ? 'no drift detected'
            : `${allDrifts.length} dishes flagged`
        }
      />
      {allDrifts.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-12 text-center">
          <p className="font-serif italic text-muted">
            Every priced recipe sits within 3% of its costed baseline.
            Clean picture across all sites.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-rule">
          <div className="hidden md:grid grid-cols-[2fr_1fr_110px_110px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
            {['Dish / Spec', 'Site', 'Type', 'Drift'].map((h) => (
              <div
                key={h}
                className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
              >
                {h}
              </div>
            ))}
          </div>
          {allDrifts.map((d, i) => (
            <Link
              key={d.id}
              href={`/recipes/${d.id}`}
              className={
                'grid grid-cols-1 md:grid-cols-[2fr_1fr_110px_110px] gap-4 px-7 py-4 items-center hover:bg-paper-warm transition-colors' +
                (i < allDrifts.length - 1
                  ? ' border-b border-rule-soft'
                  : '')
              }
            >
              <div className="font-serif font-semibold text-base text-ink">
                {d.name}
              </div>
              <div className="font-serif italic text-sm text-muted">
                {d.siteName}
              </div>
              <div className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted">
                {d.dish_type}
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
            </Link>
          ))}
        </div>
      )}

      {rollups.length > 1 && (
        <div className="mt-10">
          <SectionHead title="Per Site" />
          <div className="bg-card border border-rule">
            {rollups.map((r, i) => (
              <div
                key={r.siteId}
                className={
                  'grid grid-cols-1 md:grid-cols-[2fr_110px_110px_110px] gap-4 px-7 py-4 items-center' +
                  (i < rollups.length - 1
                    ? ' border-b border-rule-soft'
                    : '')
                }
              >
                <div className="font-serif font-semibold text-base text-ink">
                  {r.siteName}
                </div>
                <div className="font-serif text-sm text-ink">
                  {r.priced_count} priced
                </div>
                <div className="font-serif font-semibold text-sm text-ink">
                  {r.avg_gp_pct.toFixed(0)}% GP
                </div>
                <div className="font-serif text-sm text-attention">
                  {r.drift_count} drift
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 print-hide">
        <Link
          href="/margins"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
        >
          Per-site detail in chef Margins →
        </Link>
      </div>
    </div>
  );
}
