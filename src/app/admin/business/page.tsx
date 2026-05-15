import Link from 'next/link';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';

export const metadata = { title: 'Admin · Business — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});
const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

// Tier prices per CLAUDE.md. Enterprise is sales-led (price on
// request), treated as £0 in MRR computation until per-account
// override lands.
const TIER_PRICE: Record<string, number> = {
  free: 0,
  pro: 25,
  kitchen: 59,
  group: 129,
  enterprise: 0,
};

const TIER_ORDER = ['free', 'pro', 'kitchen', 'group', 'enterprise'];

/**
 * Founder Admin · Business.
 *
 * Real read-only rollup: MRR by tier × paying-customer count + recent
 * paid-tier movements. Enterprise contributes nothing to MRR by
 * design — sales sets the contract value manually outside Palatable.
 *
 * The Stripe-side reconciliation (real-time invoice/payment events)
 * lives in /api/stripe/webhook. This page reads what the webhook has
 * already persisted to v2.accounts.
 */
export default async function AdminBusinessPage() {
  const svc = createSupabaseServiceClient();

  const { data: accounts } = await svc
    .from('accounts')
    .select(
      'id, name, tier, is_founder, created_at, stripe_subscription_id',
    );

  const rows = (accounts ?? []) as Array<{
    id: string;
    name: string | null;
    tier: string;
    is_founder: boolean;
    created_at: string;
    stripe_subscription_id: string | null;
  }>;

  const byTier = new Map<string, typeof rows>();
  for (const r of rows) {
    const cur = byTier.get(r.tier) ?? [];
    cur.push(r);
    byTier.set(r.tier, cur);
  }

  // MRR excludes founder accounts (zero-cost by contract) and
  // enterprise (sales-led contract value, not tier-priced).
  const mrrRows = rows.filter(
    (r) => !r.is_founder && r.tier !== 'free' && r.tier !== 'enterprise',
  );
  const mrr = mrrRows.reduce((s, r) => s + (TIER_PRICE[r.tier] ?? 0), 0);
  const arr = mrr * 12;
  const payingCount = mrrRows.length;
  const enterpriseCount = (byTier.get('enterprise') ?? []).filter(
    (r) => !r.is_founder,
  ).length;

  const last30d = rows.filter(
    (r) =>
      r.tier !== 'free' &&
      !r.is_founder &&
      Date.now() - new Date(r.created_at).getTime() < 30 * 86400_000,
  );
  const lastMRR30d = last30d.reduce(
    (s, r) => s + (TIER_PRICE[r.tier] ?? 0),
    0,
  );

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Founder Admin · Business
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
        <em className="text-gold font-semibold not-italic">Money in</em>
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-8">
        MRR from paid tiers, tier distribution, recent paid signups. Enterprise contracts not in MRR — sales sets value manually.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="MRR"
          value={gbp.format(mrr)}
          sub={`${payingCount} paying`}
          tone="healthy"
        />
        <KpiCard label="ARR" value={gbp.format(arr)} sub="annualised" />
        <KpiCard
          label="New MRR · 30d"
          value={gbp.format(lastMRR30d)}
          sub={`${last30d.length} new paid`}
        />
        <KpiCard
          label="Enterprise"
          value={String(enterpriseCount)}
          sub="manual contracts"
        />
      </div>

      <SectionHead title="Tier distribution" />
      <div className="bg-card border border-rule mb-10">
        {TIER_ORDER.filter((t) => (byTier.get(t)?.length ?? 0) > 0).map((tier) => {
          const accs = byTier.get(tier) ?? [];
          const paying = accs.filter(
            (a) => !a.is_founder && tier !== 'free' && tier !== 'enterprise',
          );
          return (
            <div
              key={tier}
              className="px-7 py-4 grid grid-cols-[1fr_100px_120px_120px] gap-4 items-center border-b border-rule-soft last:border-b-0"
            >
              <div className="font-display font-semibold text-sm tracking-[0.04em] uppercase text-ink">
                {tier}
              </div>
              <div className="font-serif text-base text-ink">
                {accs.length}
              </div>
              <div className="font-serif text-base text-ink">
                {tier === 'free' || tier === 'enterprise'
                  ? '—'
                  : `${gbp.format(TIER_PRICE[tier])}/mo`}
              </div>
              <div className="font-serif font-semibold text-base text-gold">
                {gbp.format(paying.length * (TIER_PRICE[tier] ?? 0))}
              </div>
            </div>
          );
        })}
      </div>

      <SectionHead
        title="Recent paid signups"
        meta={`${last30d.length} in last 30 days`}
      />
      <div className="bg-card border border-rule mb-10">
        {last30d.length === 0 ? (
          <div className="px-10 py-10 text-center font-serif italic text-muted">
            No paid signups in the last 30 days.
          </div>
        ) : (
          last30d
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            )
            .map((r, i) => (
              <div
                key={r.id}
                className={
                  'px-7 py-4 grid grid-cols-[2fr_100px_100px_140px] gap-4 items-center ' +
                  (i === last30d.length - 1 ? '' : 'border-b border-rule-soft')
                }
              >
                <div className="font-serif font-semibold text-base text-ink truncate">
                  {r.name ?? 'Unnamed account'}
                </div>
                <div className="font-display font-semibold text-xs tracking-[0.08em] uppercase text-gold">
                  {r.tier}
                </div>
                <div className="font-serif text-sm text-ink">
                  {gbp.format(TIER_PRICE[r.tier] ?? 0)}/mo
                </div>
                <div className="font-serif text-xs text-muted">
                  {dateFmt.format(new Date(r.created_at))}
                </div>
              </div>
            ))
        )}
      </div>

      <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-5 mb-8">
        <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold mb-2">
          Honest about source
        </div>
        <p className="font-serif italic text-sm text-ink-soft leading-relaxed">
          MRR is computed from `accounts.tier` × the tier price table in CLAUDE.md. Real-time Stripe sync lives in `/api/stripe/webhook` — every tier change there lands in this view. Per-account MRR overrides (annual prepay, custom enterprise contracts) need a separate column when sales asks for it.
        </p>
      </div>

      <Link
        href="/admin"
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
      >
        ← Back to Admin home
      </Link>
    </div>
  );
}
