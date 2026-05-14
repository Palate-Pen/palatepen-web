import { createSupabaseServiceClient } from '@/lib/supabase/service';

export const ADMIN_EMAIL = 'jack@palateandpen.co.uk';

/** Tier prices per CLAUDE.md. Enterprise is sales-led (price on request),
 *  treated as £0 in MRR computation until per-account override lands. */
const TIER_PRICE: Record<string, number> = {
  free: 0,
  pro: 25,
  kitchen: 59,
  group: 129,
  enterprise: 0,
};

export type AdminTier = 'free' | 'pro' | 'kitchen' | 'group' | 'enterprise';

export type RecentSignup = {
  user_id: string;
  email: string;
  display_name: string;
  kitchen_name: string;
  tier: AdminTier;
  created_at: string;
  last_sign_in_at: string | null;
};

export type AdminHomeData = {
  mrr: number;
  active_kitchens: number;
  tier_counts: Record<AdminTier, number>;
  dau_this_week: number;
  total_users: number;
  recent_signups: RecentSignup[];
  /** Mock until a real source exists. */
  open_issues: { count: number; urgent: number; normal: number };
};

function tierOf(value: unknown): AdminTier {
  const v = String(value ?? '').toLowerCase();
  if (v === 'pro' || v === 'kitchen' || v === 'group' || v === 'enterprise') {
    return v;
  }
  return 'free';
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

export async function getAdminHomeData(): Promise<AdminHomeData> {
  const supabase = createSupabaseServiceClient();

  // 1. Accounts → tier breakdown + MRR + active kitchens.
  //    legacy_archive is where the seed data lives (kept there
  //    deliberately per "keep seed logic in legacy" direction).
  const { data: accounts, error: accountsErr } = await supabase
    .schema('legacy_archive')
    .from('accounts')
    .select('id, tier, name, owner_user_id, created_at');
  if (accountsErr) {
    console.error('[admin] accounts fetch failed:', accountsErr);
  }

  const tierCounts: Record<AdminTier, number> = {
    free: 0,
    pro: 0,
    kitchen: 0,
    group: 0,
    enterprise: 0,
  };
  let mrr = 0;
  for (const a of accounts ?? []) {
    const t = tierOf(a.tier);
    tierCounts[t] += 1;
    mrr += TIER_PRICE[t] ?? 0;
  }
  const activeKitchens = accounts?.length ?? 0;

  // 2. auth.users → DAU + total + most-recent signups.
  //    admin.listUsers paginates; for v1 we read the first page (100).
  const { data: usersPage, error: usersErr } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (usersErr) {
    console.error('[admin] auth.users fetch failed:', usersErr);
  }
  const users = usersPage?.users ?? [];

  const weekAgo = daysAgo(7);
  const dauThisWeek = users.filter(
    (u) => u.last_sign_in_at && u.last_sign_in_at >= weekAgo,
  ).length;

  // 3. Recent signups — top 5 by created_at desc, joined to legacy_archive
  //    user_data + accounts for kitchen name + tier.
  const recentUsers = [...users]
    .sort((a, b) =>
      (b.created_at ?? '').localeCompare(a.created_at ?? ''),
    )
    .slice(0, 5);

  const accountByUserId = new Map(
    (accounts ?? []).map((a) => [
      a.owner_user_id as string,
      a as { id: string; tier: unknown; name: string },
    ]),
  );

  const recentUserIds = recentUsers.map((u) => u.id);
  const { data: userDataRows, error: userDataErr } =
    recentUserIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .schema('legacy_archive')
          .from('user_data')
          .select('user_id, profile')
          .in('user_id', recentUserIds);
  if (userDataErr) {
    console.error('[admin] user_data fetch failed:', userDataErr);
  }
  const profileByUserId = new Map(
    (userDataRows ?? []).map((row) => [
      row.user_id as string,
      (row.profile as { name?: string } | null) ?? null,
    ]),
  );

  const recent: RecentSignup[] = recentUsers.map((u) => {
    const acct = accountByUserId.get(u.id);
    const tier = acct ? tierOf(acct.tier) : 'free';
    const profile = profileByUserId.get(u.id);
    const displayName = profile?.name?.trim() || displayFromEmail(u.email ?? '');
    return {
      user_id: u.id,
      email: u.email ?? '—',
      display_name: displayName,
      kitchen_name: acct?.name ?? '—',
      tier,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
    };
  });

  return {
    mrr,
    active_kitchens: activeKitchens,
    tier_counts: tierCounts,
    dau_this_week: dauThisWeek,
    total_users: users.length,
    recent_signups: recent,
    // Pending wiring — no v2 source exists for support inbox / system health yet.
    open_issues: { count: 3, urgent: 1, normal: 2 },
  };
}

function displayFromEmail(email: string): string {
  const local = email.split('@')[0] ?? '';
  const candidate = local.split(/[._-]/)[0] ?? local;
  if (!candidate) return 'Chef';
  return candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
}

export function tierPrice(tier: AdminTier): number {
  return TIER_PRICE[tier] ?? 0;
}

export function formatRelativeDay(iso: string | null, now: Date): string {
  if (!iso) return '—';
  const t = new Date(iso);
  const diffMs = now.getTime() - t.getTime();
  const diffH = diffMs / (1000 * 60 * 60);
  if (diffH < 24) return 'today';
  if (diffH < 48) return 'yesterday';
  const days = Math.floor(diffH / 24);
  return `${days} days ago`;
}
