import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { OwnerPageHeader } from '@/components/owner/OwnerScaffold';
import {
  listTransfers,
  TRANSFER_STATUS_LABEL,
  TRANSFER_POOL_LABEL,
  type TransferStatus,
} from '@/lib/stock-transfers';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';

export const metadata = { title: 'Transfers — Owner — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});
const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
});

const STATUS_TONE: Record<TransferStatus, 'healthy' | 'attention' | 'urgent' | 'muted'> = {
  draft: 'attention',
  sent: 'attention',
  received: 'healthy',
  cancelled: 'muted',
};

export default async function OwnerTransfersPage() {
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
  const ownedSiteIds = new Set(sites.map((s) => s.site_id));

  // Fan across every site this owner has, and dedupe — RLS returns the
  // same transfer from both source and dest if owner has both.
  type Row = Awaited<ReturnType<typeof listTransfers>>[number];
  const perSite = await Promise.all(
    sites.map((s) => listTransfers(s.site_id, 'all')),
  );
  const byId = new Map<string, Row>();
  for (const list of perSite) {
    for (const r of list) byId.set(r.id, r);
  }
  const all = Array.from(byId.values()).sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const totalCount = all.length;
  const inTransit = all.filter((r) => r.status === 'sent').length;
  const last30dValue = all
    .filter(
      (r) =>
        r.status !== 'cancelled' &&
        Date.now() - new Date(r.created_at).getTime() <
          30 * 24 * 60 * 60 * 1000,
    )
    .reduce((s, r) => s + r.total_value, 0);

  const crossSiteCount = all.filter(
    (r) =>
      r.source_site_id !== r.dest_site_id &&
      ownedSiteIds.has(r.source_site_id) &&
      ownedSiteIds.has(r.dest_site_id),
  ).length;

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <OwnerPageHeader
        eyebrow="Stock On The Move"
        title="Transfers"
        subtitle="Movement across every owned site. Kitchen ↔ bar at one address, or stock travelling between addresses."
        activeSlug="transfers"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Total"
          value={String(totalCount)}
          sub="across all sites"
        />
        <KpiCard
          label="In Transit"
          value={String(inTransit)}
          sub={inTransit === 0 ? 'all settled' : 'sent, awaiting receive'}
          tone={inTransit > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Cross-Site"
          value={String(crossSiteCount)}
          sub="between owned addresses"
        />
        <KpiCard
          label="Value · 30d"
          value={gbp.format(last30dValue)}
          sub="stock moved · last 30 days"
        />
      </div>

      <SectionHead
        title="Movement Log"
        meta={totalCount === 0 ? 'nothing yet' : `${totalCount} on record`}
      />
      {totalCount === 0 ? (
        <div className="bg-card border border-rule px-10 py-12 text-center">
          <p className="font-serif italic text-muted">
            No transfers logged yet across any owned site. Chefs + bartenders draft transfers from their own shells; this view rolls up the group picture.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-rule">
          <div className="hidden md:grid grid-cols-[110px_1.6fr_1fr_100px_90px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
            {['Reference', 'Route', 'Lines / Value', 'Status', 'When'].map(
              (h) => (
                <div
                  key={h}
                  className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
                >
                  {h}
                </div>
              ),
            )}
          </div>
          {all.map((r, i) => {
            const tone = STATUS_TONE[r.status];
            const isCross = r.source_site_id !== r.dest_site_id;
            return (
              <div
                key={r.id}
                className={
                  'grid grid-cols-1 md:grid-cols-[110px_1.6fr_1fr_100px_90px] gap-4 px-7 py-4 items-center' +
                  (i < all.length - 1 ? ' border-b border-rule-soft' : '')
                }
              >
                <div className="font-mono text-xs text-ink">{r.reference}</div>
                <div>
                  <div className="font-serif text-sm text-ink">
                    {r.source_site_name ?? 'Site'} · {TRANSFER_POOL_LABEL[r.source_pool]}
                    <span className="mx-2 text-muted">→</span>
                    {r.dest_site_name ?? 'Site'} · {TRANSFER_POOL_LABEL[r.dest_pool]}
                  </div>
                  <div className="font-serif italic text-xs text-muted mt-0.5">
                    {isCross ? 'Cross-site' : 'Intra-site'}
                  </div>
                </div>
                <div className="font-serif text-sm text-ink">
                  {r.line_count} {r.line_count === 1 ? 'line' : 'lines'}
                  {r.total_value > 0 && (
                    <span className="text-muted ml-2">
                      · {gbp.format(r.total_value)}
                    </span>
                  )}
                </div>
                <div
                  className={
                    'font-display font-semibold text-xs tracking-[0.18em] uppercase ' +
                    (tone === 'healthy'
                      ? 'text-healthy'
                      : tone === 'attention'
                        ? 'text-attention'
                        : tone === 'urgent'
                          ? 'text-urgent'
                          : 'text-muted')
                  }
                >
                  {TRANSFER_STATUS_LABEL[r.status]}
                </div>
                <div className="font-serif italic text-xs text-muted">
                  {dateFmt.format(new Date(r.created_at))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="font-serif italic text-sm text-muted mt-6">
        Drafting + sending happens in the chef + bar shells.{' '}
        <Link
          href="/stock-suppliers/transfers"
          className="text-gold hover:text-gold-dark transition-colors"
        >
          Open the chef view →
        </Link>
      </p>
    </div>
  );
}
