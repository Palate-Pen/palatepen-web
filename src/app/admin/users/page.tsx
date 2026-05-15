import Link from 'next/link';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';

export const metadata = { title: 'Admin · Users & Kitchens — Palatable' };

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

type AccountRow = {
  id: string;
  name: string | null;
  tier: string;
  is_founder: boolean;
  created_at: string;
  member_count: number;
  site_count: number;
  owner_email: string | null;
};

/**
 * Founder Admin · Users & Kitchens.
 *
 * Real data: every v2.accounts row + member count + site count +
 * owner's email. Founder can drill into the account from any row.
 * Per the locked admin discipline, write actions (suspend, change
 * tier, impersonate) are not exposed in v1 — those need careful
 * audit-log + RLS work first. Read-only directory now; impersonate +
 * tier-change ship in a follow-up batch.
 */
export default async function AdminUsersPage() {
  const svc = createSupabaseServiceClient();

  const { data: accounts } = await svc
    .from('accounts')
    .select(
      'id, name, tier, is_founder, created_at, owner_user_id',
    )
    .order('created_at', { ascending: false });

  const accountIds = (accounts ?? []).map((a) => a.id as string);

  const [
    { data: memberships },
    { data: sites },
    { data: ownerUsers },
  ] = await Promise.all([
    accountIds.length === 0
      ? Promise.resolve({ data: [] as unknown[] })
      : svc.from('memberships').select('account_id, user_id'),
    accountIds.length === 0
      ? Promise.resolve({ data: [] as unknown[] })
      : svc.from('sites').select('id, account_id'),
    svc.schema('auth').from('users').select('id, email'),
  ]);

  const emailById = new Map<string, string>(
    ((ownerUsers as { id: string; email: string }[] | null) ?? []).map((u) => [
      u.id,
      u.email,
    ]),
  );

  const memberCount = new Map<string, number>();
  for (const m of ((memberships as { account_id: string }[] | null) ?? [])) {
    memberCount.set(m.account_id, (memberCount.get(m.account_id) ?? 0) + 1);
  }
  const siteCount = new Map<string, number>();
  for (const s of ((sites as { account_id: string }[] | null) ?? [])) {
    siteCount.set(s.account_id, (siteCount.get(s.account_id) ?? 0) + 1);
  }

  const rows: AccountRow[] = (accounts ?? []).map((a) => ({
    id: a.id as string,
    name: (a.name as string | null) ?? null,
    tier: (a.tier as string) ?? 'free',
    is_founder: Boolean(a.is_founder),
    created_at: a.created_at as string,
    member_count: memberCount.get(a.id as string) ?? 0,
    site_count: siteCount.get(a.id as string) ?? 0,
    owner_email:
      a.owner_user_id != null
        ? emailById.get(a.owner_user_id as string) ?? null
        : null,
  }));

  const tierCounts = new Map<string, number>();
  for (const r of rows) tierCounts.set(r.tier, (tierCounts.get(r.tier) ?? 0) + 1);
  const founderCount = rows.filter((r) => r.is_founder).length;
  const last30d =
    rows.filter(
      (r) => Date.now() - new Date(r.created_at).getTime() < 30 * 86400_000,
    ).length;

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Founder Admin · Users
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
        Every <em className="text-gold font-semibold not-italic">kitchen</em>
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-8">
        {rows.length} {rows.length === 1 ? 'account' : 'accounts'} on file. Read-only directory — impersonation + tier-change ship in a follow-up.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Total Accounts"
          value={String(rows.length)}
          sub={`${founderCount} founder`}
        />
        <KpiCard
          label="New · 30d"
          value={String(last30d)}
          sub="last month"
        />
        <KpiCard
          label="Paid"
          value={String(rows.length - (tierCounts.get('free') ?? 0))}
          sub={`${tierCounts.get('free') ?? 0} on free`}
        />
        <KpiCard
          label="Enterprise"
          value={String(tierCounts.get('enterprise') ?? 0)}
          sub="manual onboarding"
        />
      </div>

      <SectionHead title="Tier breakdown" />
      <div className="bg-card border border-rule mb-10">
        {Array.from(tierCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([tier, count]) => (
            <div
              key={tier}
              className="px-7 py-4 flex items-center justify-between border-b border-rule-soft last:border-b-0"
            >
              <div className="font-serif text-base text-ink capitalize">
                {tier}
              </div>
              <div className="font-display font-semibold text-sm tracking-[0.08em] uppercase text-gold">
                {count}
              </div>
            </div>
          ))}
      </div>

      <SectionHead title="Accounts" meta={`${rows.length} total`} />
      <div className="bg-card border border-rule">
        <div className="hidden md:grid grid-cols-[2fr_1.5fr_100px_80px_80px_120px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
          {['Name', 'Owner email', 'Tier', 'Sites', 'Members', 'Created'].map((h) => (
            <div key={h} className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted">
              {h}
            </div>
          ))}
        </div>
        {rows.map((r, i) => (
          <div
            key={r.id}
            className={
              'grid grid-cols-1 md:grid-cols-[2fr_1.5fr_100px_80px_80px_120px] gap-4 px-7 py-4 items-center ' +
              (i === rows.length - 1 ? '' : 'border-b border-rule-soft')
            }
          >
            <div className="font-serif font-semibold text-base text-ink flex items-center gap-2">
              {r.name ?? 'Unnamed account'}
              {r.is_founder && (
                <span className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-gold border border-gold/40 px-1.5 py-0.5">
                  founder
                </span>
              )}
            </div>
            <div className="font-mono text-xs text-muted truncate">
              {r.owner_email ?? '—'}
            </div>
            <div className="font-display font-semibold text-xs tracking-[0.08em] uppercase text-gold">
              {r.tier}
            </div>
            <div className="font-serif text-sm text-muted">{r.site_count}</div>
            <div className="font-serif text-sm text-muted">{r.member_count}</div>
            <div className="font-serif text-xs text-muted">
              {dateFmt.format(new Date(r.created_at))}
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="px-10 py-16 text-center font-serif italic text-muted">
            No accounts yet. Sign up the first.
          </div>
        )}
      </div>

      <div className="mt-8">
        <Link
          href="/admin"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
        >
          ← Back to Admin home
        </Link>
      </div>
    </div>
  );
}
