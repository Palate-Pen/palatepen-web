import Link from 'next/link';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { TierSelect } from '@/components/admin/TierSelect';
import { ImpersonateButton } from '@/components/admin/ImpersonateButton';
import { ADMIN_EMAIL } from '@/lib/admin';

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
  owner_user_id: string | null;
};

type UserRow = {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  membership_count: number;
  primary_account_id: string | null;
  primary_account_name: string | null;
  primary_account_tier: string | null;
  primary_role: string | null;
  primary_site_name: string | null;
  is_founder_account: boolean;
  is_self: boolean;
};

import { ROLE_LABEL } from '@/lib/roles';

/**
 * Founder Admin · Users & Kitchens.
 *
 * Two complementary directories on one page:
 *
 *   People   → every auth.users row. Click a person to manage that
 *              individual's memberships, impersonate, change tier on
 *              accounts they own, or delete the auth login.
 *
 *   Accounts → every v2.accounts row (the businesses). Click an
 *              account to manage tier, see every site under it, every
 *              person on it, and the Stripe IDs.
 *
 * One person can sit on multiple accounts; one account can host many
 * people. The two views give different entry points to the same
 * underlying data — pick whichever fits the task at hand.
 *
 * Schema note: v2.memberships does NOT have account_id. Account is
 * always derived via site_id → v2.sites.account_id.
 */
export default async function AdminUsersPage() {
  const svc = createSupabaseServiceClient();

  const [{ data: accounts }, { data: usersPage }, { data: sites }] =
    await Promise.all([
      svc
        .from('accounts')
        .select('id, name, tier, is_founder, created_at')
        .order('created_at', { ascending: false }),
      svc.auth.admin.listUsers({ page: 1, perPage: 500 }),
      svc.from('sites').select('id, name, account_id'),
    ]);

  const sRows = (sites ?? []) as Array<{
    id: string;
    name: string;
    account_id: string;
  }>;
  const accountIdBySiteId = new Map(sRows.map((s) => [s.id, s.account_id]));
  const siteNameById = new Map(sRows.map((s) => [s.id, s.name]));

  // Pull every membership (need cross-account totals + per-user
  // primary lookup). Filter null site_ids defensively.
  const { data: memberships } = await svc
    .from('memberships')
    .select('id, user_id, role, site_id, created_at');
  const allMemberships = ((memberships ?? []) as Array<{
    id: string;
    user_id: string;
    role: string;
    site_id: string;
    created_at: string;
  }>).filter((m) => accountIdBySiteId.has(m.site_id));

  // Per-account counts via site lookup.
  const memberCount = new Map<string, number>();
  const siteCount = new Map<string, number>();
  for (const s of sRows) {
    siteCount.set(s.account_id, (siteCount.get(s.account_id) ?? 0) + 1);
  }
  for (const m of allMemberships) {
    const aid = accountIdBySiteId.get(m.site_id);
    if (!aid) continue;
    memberCount.set(aid, (memberCount.get(aid) ?? 0) + 1);
  }

  const accountById = new Map<
    string,
    { name: string | null; tier: string; is_founder: boolean }
  >();
  for (const a of accounts ?? []) {
    accountById.set(a.id as string, {
      name: (a.name as string | null) ?? null,
      tier: (a.tier as string) ?? 'free',
      is_founder: Boolean(a.is_founder),
    });
  }

  const emailById = new Map<string, string>();
  for (const u of usersPage?.users ?? []) {
    if (u.email) emailById.set(u.id, u.email);
  }

  // "Owner" of an account = earliest user with role='owner' on any
  // site belonging to that account.
  const ownerByAccount = new Map<string, { user_id: string; email: string | null }>();
  const ownerCandidates = allMemberships
    .filter((m) => m.role === 'owner')
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const m of ownerCandidates) {
    const aid = accountIdBySiteId.get(m.site_id);
    if (!aid || ownerByAccount.has(aid)) continue;
    ownerByAccount.set(aid, {
      user_id: m.user_id,
      email: emailById.get(m.user_id) ?? null,
    });
  }

  // ---------- Account rows ----------
  const accountRows: AccountRow[] = (accounts ?? []).map((a) => {
    const owner = ownerByAccount.get(a.id as string);
    return {
      id: a.id as string,
      name: (a.name as string | null) ?? null,
      tier: (a.tier as string) ?? 'free',
      is_founder: Boolean(a.is_founder),
      created_at: a.created_at as string,
      member_count: memberCount.get(a.id as string) ?? 0,
      site_count: siteCount.get(a.id as string) ?? 0,
      owner_user_id: owner?.user_id ?? null,
      owner_email: owner?.email ?? null,
    };
  });

  // ---------- User rows ----------
  const membershipsByUser = new Map<string, typeof allMemberships>();
  for (const m of allMemberships) {
    if (!membershipsByUser.has(m.user_id)) membershipsByUser.set(m.user_id, []);
    membershipsByUser.get(m.user_id)!.push(m);
  }

  function pickPrimary(list: typeof allMemberships) {
    if (list.length === 0) return null;
    const sorted = [...list].sort((a, b) => {
      const aOwner = a.role === 'owner' ? 0 : 1;
      const bOwner = b.role === 'owner' ? 0 : 1;
      if (aOwner !== bOwner) return aOwner - bOwner;
      return a.created_at.localeCompare(b.created_at);
    });
    return sorted[0];
  }

  const userRows: UserRow[] = (usersPage?.users ?? []).map((u) => {
    const mine = membershipsByUser.get(u.id) ?? [];
    const primary = pickPrimary(mine);
    const primaryAccountId = primary
      ? accountIdBySiteId.get(primary.site_id) ?? null
      : null;
    const account = primaryAccountId ? accountById.get(primaryAccountId) : null;
    return {
      user_id: u.id,
      email: u.email ?? '—',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      membership_count: mine.length,
      primary_account_id: primaryAccountId,
      primary_account_name: account?.name ?? null,
      primary_account_tier: account?.tier ?? null,
      primary_role: primary?.role ?? null,
      primary_site_name: primary ? siteNameById.get(primary.site_id) ?? null : null,
      is_founder_account: Boolean(account?.is_founder),
      is_self: (u.email ?? '').toLowerCase() === ADMIN_EMAIL.toLowerCase(),
    };
  });

  userRows.sort((a, b) => {
    const aSign = a.last_sign_in_at ?? a.created_at;
    const bSign = b.last_sign_in_at ?? b.created_at;
    return bSign.localeCompare(aSign);
  });

  // ---------- KPIs ----------
  const tierCounts = new Map<string, number>();
  for (const r of accountRows) tierCounts.set(r.tier, (tierCounts.get(r.tier) ?? 0) + 1);
  const founderCount = accountRows.filter((r) => r.is_founder).length;
  const totalUsers = userRows.length;
  const orphanUsers = userRows.filter((u) => u.membership_count === 0).length;
  const sevenDayActive = userRows.filter((u) => {
    if (!u.last_sign_in_at) return false;
    return Date.now() - new Date(u.last_sign_in_at).getTime() < 7 * 86400_000;
  }).length;

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Founder Admin · Users
      </div>
      <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] text-ink">
        Every <em className="text-gold font-semibold not-italic">person</em>{' '}
        &amp; every{' '}
        <em className="text-gold font-semibold not-italic">account</em>
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-8">
        {totalUsers} {totalUsers === 1 ? 'person' : 'people'} across{' '}
        {accountRows.length}{' '}
        {accountRows.length === 1 ? 'account' : 'accounts'}. Click into either
        to manage tiers, memberships, impersonation, or to delete.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="People"
          value={String(totalUsers)}
          sub={orphanUsers > 0 ? orphanUsers + ' with no membership' : 'all on a site'}
          tone={orphanUsers > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Active · 7d"
          value={String(sevenDayActive)}
          sub="signed in this week"
        />
        <KpiCard
          label="Accounts"
          value={String(accountRows.length)}
          sub={founderCount + ' founder · ' + (accountRows.length - founderCount) + ' real'}
        />
        <KpiCard
          label="Paid"
          value={String(accountRows.length - (tierCounts.get('free') ?? 0))}
          sub={(tierCounts.get('free') ?? 0) + ' on free'}
        />
      </div>

      {/* ---------- PEOPLE ---------- */}
      <SectionHead title="People" meta={totalUsers + ' total'} />
      <p className="font-serif italic text-sm text-muted -mt-2 mb-3 max-w-[700px]">
        Every individual <strong className="not-italic font-semibold text-ink">login</strong> on the system —
        owners, managers, chefs, bar staff. Click a row to open that person&apos;s
        page: their memberships, role across each site, tier on any account
        they own, and the destructive actions (remove from sites, delete login).
      </p>
      <div className="bg-card border border-rule mb-12">
        <div className="hidden md:grid grid-cols-[1.6fr_1fr_1.2fr_90px_120px_130px_130px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
          {['Email', 'Role', 'Primary site / account', 'Tier', 'Last sign-in', 'Joined', 'Action'].map((h) => (
            <div key={h} className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted">
              {h}
            </div>
          ))}
        </div>
        {userRows.length === 0 ? (
          <div className="px-10 py-16 text-center font-serif italic text-muted">
            No users yet.
          </div>
        ) : (
          userRows.map((u, i) => {
            const impersonateDisabled = u.is_self || u.is_founder_account;
            const reason = u.is_self
              ? "That's your own account."
              : u.is_founder_account
                ? 'Founder accounts cannot be impersonated.'
                : undefined;
            return (
              <div
                key={u.user_id}
                className={
                  'grid grid-cols-1 md:grid-cols-[1.6fr_1fr_1.2fr_90px_120px_130px_130px] gap-4 px-7 py-4 items-center hover:bg-paper-warm transition-colors ' +
                  (i === userRows.length - 1 ? '' : 'border-b border-rule-soft')
                }
              >
                <Link
                  href={'/admin/users/' + u.user_id}
                  className="min-w-0 no-underline text-inherit md:col-span-3"
                >
                  <div className="grid grid-cols-[1.6fr_1fr_1.2fr] gap-4">
                    <div className="min-w-0">
                      <div className="font-serif font-semibold text-base text-ink truncate flex items-center gap-2 flex-wrap">
                        {u.email}
                        {u.is_self && (
                          <span className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-gold border border-gold/40 px-1.5 py-0.5">
                            you
                          </span>
                        )}
                        {u.is_founder_account && !u.is_self && (
                          <span className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-gold border border-gold/40 px-1.5 py-0.5">
                            founder
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[11px] text-muted-soft truncate">
                        {u.user_id.slice(0, 8)}
                      </div>
                    </div>
                    <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
                      {u.primary_role ? ROLE_LABEL[u.primary_role] ?? u.primary_role : '—'}
                      {u.membership_count > 1 && (
                        <span className="ml-1 text-muted-soft font-normal">
                          +{u.membership_count - 1}
                        </span>
                      )}
                    </div>
                    <div className="font-serif text-sm text-ink truncate">
                      {u.primary_site_name ?? '—'}
                      {u.primary_account_name && u.primary_account_name !== u.primary_site_name && (
                        <span className="text-muted italic">
                          {' · '}
                          {u.primary_account_name}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
                <div className="font-display font-semibold text-xs tracking-[0.08em] uppercase text-gold">
                  {u.primary_account_tier ?? '—'}
                </div>
                <div className="font-serif text-xs text-muted">
                  {u.last_sign_in_at
                    ? dateFmt.format(new Date(u.last_sign_in_at))
                    : 'never'}
                </div>
                <div className="font-serif text-xs text-muted">
                  {dateFmt.format(new Date(u.created_at))}
                </div>
                <div>
                  <ImpersonateButton
                    userId={u.user_id}
                    userLabel={u.email}
                    disabled={impersonateDisabled}
                    disabledReason={reason}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ---------- ACCOUNTS ---------- */}
      <SectionHead title="Accounts" meta={accountRows.length + ' total'} />
      <p className="font-serif italic text-sm text-muted -mt-2 mb-3 max-w-[700px]">
        Every <strong className="not-italic font-semibold text-ink">business</strong> on the system. One account
        can have many people (managers, chefs, bar staff). Tier &amp; billing live
        here — change tier inline below or click an account to see its full
        member list, sites, and Stripe IDs.
      </p>
      <div className="bg-card border border-rule">
        <div className="hidden md:grid grid-cols-[2fr_1.5fr_140px_80px_80px_120px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
          {['Name', 'Owner email', 'Tier', 'Sites', 'Members', 'Created'].map((h) => (
            <div key={h} className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted">
              {h}
            </div>
          ))}
        </div>
        {accountRows.map((r, i) => (
          <div
            key={r.id}
            className={
              'grid grid-cols-1 md:grid-cols-[2fr_1.5fr_140px_80px_80px_120px] gap-4 px-7 py-4 items-center hover:bg-paper-warm transition-colors ' +
              (i === accountRows.length - 1 ? '' : 'border-b border-rule-soft')
            }
          >
            <Link
              href={'/admin/accounts/' + r.id}
              className="no-underline text-inherit md:col-span-2"
            >
              <div className="grid grid-cols-[2fr_1.5fr] gap-4">
                <div className="font-serif font-semibold text-base text-ink flex items-center gap-2 flex-wrap">
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
              </div>
            </Link>
            <div>
              <TierSelect
                accountId={r.id}
                current={r.tier}
                isFounder={r.is_founder}
              />
            </div>
            <div className="font-serif text-sm text-muted">{r.site_count}</div>
            <div className="font-serif text-sm text-muted">{r.member_count}</div>
            <div className="font-serif text-xs text-muted">
              {dateFmt.format(new Date(r.created_at))}
            </div>
          </div>
        ))}
        {accountRows.length === 0 && (
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
