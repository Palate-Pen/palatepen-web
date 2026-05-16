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
  /** Primary account (most-recent owner membership, or first membership). */
  primary_account_id: string | null;
  primary_account_name: string | null;
  primary_account_tier: string | null;
  primary_role: string | null;
  primary_site_name: string | null;
  is_founder_account: boolean;
  is_self: boolean;
};

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  manager: 'Manager',
  chef: 'Head Chef',
  sous_chef: 'Sous Chef',
  commis: 'Commis',
  bartender: 'Bartender',
  head_bartender: 'Head Bartender',
  bar_back: 'Bar Back',
  viewer: 'Viewer',
};

/**
 * Founder Admin · Users & Kitchens.
 *
 * Top: every auth.users row with the primary account they belong to,
 * the role they hold there, and per-user actions (impersonate).
 *
 * Below: account directory with inline tier dropdown so the founder
 * can move a customer between tiers without leaving the page.
 *
 * Founder account is protected on both surfaces — tier locked,
 * impersonation refused (you're already that user).
 */
export default async function AdminUsersPage() {
  const svc = createSupabaseServiceClient();

  const [{ data: accounts }, { data: usersPage }] = await Promise.all([
    svc
      .from('accounts')
      .select('id, name, tier, is_founder, created_at, owner_user_id')
      .order('created_at', { ascending: false }),
    svc.auth.admin.listUsers({ page: 1, perPage: 500 }),
  ]);

  const accountIds = (accounts ?? []).map((a) => a.id as string);

  const [{ data: memberships }, { data: sites }] = await Promise.all([
    accountIds.length === 0
      ? Promise.resolve({ data: [] as unknown[] })
      : svc
          .from('memberships')
          .select('id, account_id, user_id, role, site_id, created_at'),
    accountIds.length === 0
      ? Promise.resolve({ data: [] as unknown[] })
      : svc.from('sites').select('id, name, account_id'),
  ]);

  type Membership = {
    id: string;
    account_id: string;
    user_id: string;
    role: string;
    site_id: string;
    created_at: string;
  };
  type Site = { id: string; name: string; account_id: string };

  const allMemberships = (memberships ?? []) as Membership[];
  const allSites = (sites ?? []) as Site[];

  const memberCount = new Map<string, number>();
  for (const m of allMemberships) {
    memberCount.set(m.account_id, (memberCount.get(m.account_id) ?? 0) + 1);
  }
  const siteCount = new Map<string, number>();
  for (const s of allSites) {
    siteCount.set(s.account_id, (siteCount.get(s.account_id) ?? 0) + 1);
  }
  const siteNameById = new Map<string, string>();
  for (const s of allSites) siteNameById.set(s.id, s.name);
  const accountById = new Map<string, { name: string | null; tier: string; is_founder: boolean }>();
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

  // ---------- Account rows ----------
  const accountRows: AccountRow[] = (accounts ?? []).map((a) => ({
    id: a.id as string,
    name: (a.name as string | null) ?? null,
    tier: (a.tier as string) ?? 'free',
    is_founder: Boolean(a.is_founder),
    created_at: a.created_at as string,
    member_count: memberCount.get(a.id as string) ?? 0,
    site_count: siteCount.get(a.id as string) ?? 0,
    owner_user_id: (a.owner_user_id as string | null) ?? null,
    owner_email:
      a.owner_user_id != null
        ? emailById.get(a.owner_user_id as string) ?? null
        : null,
  }));

  // ---------- User rows ----------
  // For each auth user, pick a "primary" membership to label the row.
  // Preference: owner role > earliest joined. This gives a stable
  // primary even when a user belongs to multiple accounts.
  const membershipsByUser = new Map<string, Membership[]>();
  for (const m of allMemberships) {
    if (!membershipsByUser.has(m.user_id)) membershipsByUser.set(m.user_id, []);
    membershipsByUser.get(m.user_id)!.push(m);
  }

  function pickPrimary(list: Membership[]): Membership | null {
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
    const account = primary ? accountById.get(primary.account_id) : null;
    return {
      user_id: u.id,
      email: u.email ?? '—',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      membership_count: mine.length,
      primary_account_id: primary?.account_id ?? null,
      primary_account_name: account?.name ?? null,
      primary_account_tier: account?.tier ?? null,
      primary_role: primary?.role ?? null,
      primary_site_name: primary ? siteNameById.get(primary.site_id) ?? null : null,
      is_founder_account: Boolean(account?.is_founder),
      is_self: (u.email ?? '').toLowerCase() === ADMIN_EMAIL.toLowerCase(),
    };
  });

  userRows.sort((a, b) => {
    // Recent sign-ins first, then by created.
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
        on the system
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-8">
        {totalUsers} {totalUsers === 1 ? 'user' : 'users'} across{' '}
        {accountRows.length}{' '}
        {accountRows.length === 1 ? 'account' : 'accounts'}. Change a tier
        inline or impersonate a user to step into their kitchen.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Users"
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

      {/* ---------- USERS ---------- */}
      <SectionHead title="People" meta={totalUsers + ' total'} />
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
                  'grid grid-cols-1 md:grid-cols-[1.6fr_1fr_1.2fr_90px_120px_130px_130px] gap-4 px-7 py-4 items-center ' +
                  (i === userRows.length - 1 ? '' : 'border-b border-rule-soft')
                }
              >
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
              'grid grid-cols-1 md:grid-cols-[2fr_1.5fr_140px_80px_80px_120px] gap-4 px-7 py-4 items-center ' +
              (i === accountRows.length - 1 ? '' : 'border-b border-rule-soft')
            }
          >
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
