import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Role ranking for the per-account hierarchy. Higher = more powerful.
 * The "top role on the account" is whichever role with the highest rank
 * exists among that account's memberships — almost always Owner, but
 * the lookup degrades gracefully if Owner is absent.
 *
 * Settings gates use this to decide who sees Tier & Billing,
 * write-access to Kitchen/Bar info, and the cross-viewer Switch
 * Surface block. See palatable-role-surfaces.md memory entry for the
 * canonical role list.
 */

export type RoleKey =
  | 'owner'
  | 'manager'
  | 'deputy_manager'
  | 'head_chef'
  | 'sous_chef'
  | 'chef'
  | 'head_bartender'
  | 'bartender'
  | 'supervisor'
  // Legacy role keys still present in production data until the role
  // migration ships — kept in the rank table so existing memberships
  // resolve cleanly. Mapped to their nearest current equivalent.
  | 'commis'
  | 'bar_back'
  | 'viewer';

const RANK: Record<RoleKey, number> = {
  owner: 100,
  manager: 80,
  deputy_manager: 80,
  head_chef: 60,
  head_bartender: 60,
  sous_chef: 50,
  supervisor: 40,
  // Legacy keys (will go away once the role-list migration ships)
  commis: 20,
  bar_back: 20,
  // The new spec's "Chef" and "Bartender" are read+prep-only tier
  chef: 30,
  bartender: 30,
  viewer: 10,
};

export function roleRank(role: string | null | undefined): number {
  if (!role) return 0;
  return RANK[role as RoleKey] ?? 0;
}

/**
 * Single source of truth for role display names. Replaces nine
 * scattered ROLE_LABEL maps across team / admin / safety components.
 * Legacy keys (commis / bar_back / viewer) map to their original
 * labels so historical memberships still render until they're edited.
 */
// Typed as Record<string, string> (not Record<RoleKey, string>) so
// callers can index with arbitrary strings without TS friction. The
// initializer still spans every RoleKey for completeness.
export const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  manager: 'Manager',
  deputy_manager: 'Deputy Manager',
  head_chef: 'Head Chef',
  sous_chef: 'Sous Chef',
  chef: 'Chef',
  head_bartender: 'Head Bartender',
  bartender: 'Bartender',
  supervisor: 'Supervisor',
  // Legacy — kept so historical memberships render with their original
  // label until edited via the role picker.
  commis: 'Commis (legacy)',
  bar_back: 'Bar Back (legacy)',
  viewer: 'Viewer (legacy)',
};

/**
 * Short blurb shown under each role in the role-picker. Reflects the
 * locked spec:
 *   - Manager / Deputy Manager: same power, different title
 *   - Chef / Bartender: read + prep-list changes only (junior tier)
 *   - Supervisor: cross-domain read+write but never settings
 */
export const ROLE_DESCRIPTION: Record<string, string> = {
  owner: 'Top access — whole account, every site, every team.',
  manager: 'Site access — full controls within this site.',
  deputy_manager: 'Site access — same powers as Manager, different title.',
  head_chef: 'Kitchen access — full write.',
  sous_chef: 'Kitchen access — full write.',
  chef: 'Kitchen access — read + prep-list changes only.',
  head_bartender: 'Bar access — full write.',
  bartender: 'Bar access — read + prep-list changes only.',
  supervisor: 'Kitchen + Bar read + write. No settings changes.',
  commis: 'Legacy — mapped to Chef (read + prep-list) in code.',
  bar_back: 'Legacy — mapped to Bartender (read + prep-list) in code.',
  viewer: 'Legacy — read-only, retired role.',
};

/**
 * Roles a user is allowed to assign via the role picker, in hierarchy
 * order. Excludes legacy keys (commis / bar_back / viewer) — they're
 * still valid in the DB enum for historical data but the UI never
 * offers them as a new assignment.
 */
export const ASSIGNABLE_ROLES: RoleKey[] = [
  'owner',
  'manager',
  'deputy_manager',
  'head_chef',
  'sous_chef',
  'chef',
  'head_bartender',
  'bartender',
  'supervisor',
];

/** Includes legacy keys — use when validating server-side input against
 *  the full enum (so old assignments don't fail validation). */
export const ALL_VALID_ROLES: RoleKey[] = [
  ...ASSIGNABLE_ROLES,
  'commis',
  'bar_back',
  'viewer',
];

export function roleLabel(role: string | null | undefined): string {
  if (!role) return '—';
  return ROLE_LABEL[role as RoleKey] ?? role;
}

/**
 * Returns true when the given user holds the highest-ranked role
 * present on the account. For multi-user accounts that's typically
 * the Owner. For Pro-tier (single user, single site) it's that
 * solitary user regardless of their role label.
 *
 * Uses the passed-in supabase client (server or service-role both
 * fine) so callers can opt into RLS or bypass as appropriate. The
 * settings pages all use the cookie-bound server client.
 */
export async function isTopRoleOnAccount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'v2', any>,
  userId: string,
  accountId: string,
): Promise<boolean> {
  if (!userId || !accountId) return false;

  // Pull every membership for sites under this account along with the
  // member's role. We can't filter by account_id directly on memberships
  // (no such column in v2 — account is reached via sites), so join.
  const { data: sites } = await supabase
    .from('sites')
    .select('id')
    .eq('account_id', accountId);
  const siteIds = ((sites ?? []) as Array<{ id: string }>).map((s) => s.id);
  if (siteIds.length === 0) return false;

  const { data: memberships } = await supabase
    .from('memberships')
    .select('user_id, role')
    .in('site_id', siteIds);
  const rows = (memberships ?? []) as Array<{ user_id: string; role: string }>;

  let topRank = 0;
  const ranksByUser = new Map<string, number>();
  for (const m of rows) {
    const r = roleRank(m.role);
    if (r > topRank) topRank = r;
    const prev = ranksByUser.get(m.user_id) ?? 0;
    if (r > prev) ranksByUser.set(m.user_id, r);
  }

  return (ranksByUser.get(userId) ?? 0) === topRank && topRank > 0;
}
