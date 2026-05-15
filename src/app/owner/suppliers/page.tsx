import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { OwnerPageHeader } from '@/components/owner/OwnerScaffold';
import { getSuppliers } from '@/lib/suppliers';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';

export const metadata = { title: 'Suppliers — Owner — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});

export default async function OwnerSuppliersPage() {
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

  const perSite = await Promise.all(
    sites.map((s) =>
      getSuppliers(s.site_id).then((data) => ({
        siteName: s.sites?.name ?? 'Site',
        data,
      })),
    ),
  );

  // Flatten all suppliers across sites
  const all = perSite.flatMap(({ siteName, data }) =>
    data.suppliers.map((s) => ({ ...s, siteName })),
  );
  const totalCount = all.length;
  const activeCount = all.filter((s) => s.active_in_30d).length;
  const lowReliability = all.filter(
    (s) => s.reliability_score != null && s.reliability_score < 8,
  ).length;
  const totalOwed = all.reduce((acc, s) => acc + (s.account_balance ?? 0), 0);

  // Sort by balance descending
  const byBalance = [...all]
    .filter((s) => (s.account_balance ?? 0) > 0)
    .sort((a, b) => (b.account_balance ?? 0) - (a.account_balance ?? 0))
    .slice(0, 10);

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1200px] mx-auto">
      <OwnerPageHeader
        eyebrow="Group Spend, Group Leverage"
        title="Suppliers"
        subtitle="Consolidated supplier picture across every site. Top balances, reliability watch, where the credit limits are stretched."
        activeSlug="suppliers"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="On The Books"
          value={String(totalCount)}
          sub={`${activeCount} active in 30d`}
        />
        <KpiCard
          label="Reliability Watch"
          value={String(lowReliability)}
          sub={lowReliability === 0 ? 'all solid' : 'score < 8/10'}
          tone={lowReliability > 0 ? 'attention' : 'healthy'}
        />
        <KpiCard
          label="Total Owed"
          value={gbp.format(totalOwed)}
          sub="across all sites"
        />
        <KpiCard
          label="Sites"
          value={String(sites.length)}
          sub="owned + active"
        />
      </div>

      <SectionHead
        title="Top Open Balances"
        meta={
          byBalance.length === 0
            ? 'nothing outstanding'
            : `${byBalance.length} suppliers · ${gbp.format(byBalance.reduce((s, r) => s + (r.account_balance ?? 0), 0))} on account`
        }
      />
      {byBalance.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-12 text-center">
          <p className="font-serif italic text-muted">
            All supplier accounts settled. Nothing outstanding across the
            business.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-rule">
          <div className="hidden md:grid grid-cols-[1.6fr_1fr_110px_110px_110px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
            {[
              'Supplier',
              'Site',
              'Payment',
              'Balance',
              'Credit usage',
            ].map((h) => (
              <div
                key={h}
                className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
              >
                {h}
              </div>
            ))}
          </div>
          {byBalance.map((s, i) => {
            const usage =
              s.credit_limit != null &&
              s.credit_limit > 0 &&
              s.account_balance != null
                ? Math.round((s.account_balance / s.credit_limit) * 100)
                : null;
            const tone =
              usage == null
                ? 'muted'
                : usage >= 85
                  ? 'urgent'
                  : usage >= 70
                    ? 'attention'
                    : 'healthy';
            return (
              <Link
                key={`${s.id}-${i}`}
                href={`/stock-suppliers/suppliers/${s.id}`}
                className={
                  'grid grid-cols-1 md:grid-cols-[1.6fr_1fr_110px_110px_110px] gap-4 px-7 py-4 items-center hover:bg-paper-warm transition-colors' +
                  (i < byBalance.length - 1
                    ? ' border-b border-rule-soft'
                    : '')
                }
              >
                <div className="font-serif font-semibold text-base text-ink">
                  {s.name}
                </div>
                <div className="font-serif italic text-sm text-muted">
                  {s.siteName}
                </div>
                <div className="font-serif text-sm text-ink-soft">
                  {s.payment_terms ?? '—'}
                </div>
                <div className="font-serif font-semibold text-sm text-ink">
                  {s.account_balance != null
                    ? gbp.format(s.account_balance)
                    : '—'}
                </div>
                <div
                  className={
                    'font-serif font-semibold text-sm ' +
                    (tone === 'urgent'
                      ? 'text-urgent'
                      : tone === 'attention'
                        ? 'text-attention'
                        : tone === 'healthy'
                          ? 'text-healthy'
                          : 'text-muted')
                  }
                >
                  {usage != null ? `${usage}%` : '—'}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/stock-suppliers/suppliers"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
        >
          Per-site detail →
        </Link>
      </div>
    </div>
  );
}
