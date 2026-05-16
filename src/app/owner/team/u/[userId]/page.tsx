import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { OwnerPageHeader } from '@/components/owner/OwnerScaffold';
import { roleLabel } from '@/lib/roles';
import { MemberHeader, type MemberHeaderData } from '@/components/team/MemberHeader';
import {
  MemberPermissions,
  type PermissionCell,
} from '@/components/team/MemberPermissions';
import { MemberActions } from '@/components/team/MemberActions';
import {
  FEATURE_REGISTRY,
  isFeatureAvailableAtTier,
  isFeatureOnByDefault,
} from '@/lib/features';

export const metadata = { title: 'Member — Team — Owner — Palatable' };

type ShellRole =
  | 'owner'
  | 'manager'
  | 'chef'
  | 'sous_chef'
  | 'commis'
  | 'bartender'
  | 'head_bartender'
  | 'bar_back'
  | 'viewer';

export default async function OwnerUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();
  if (!viewer) redirect('/signin');

  const svc = createSupabaseServiceClient();

  // Caller's owned site_ids — defines the scope of what they're allowed
  // to see on this page.
  const { data: ownedRows } = await svc
    .from('memberships')
    .select('site_id')
    .eq('user_id', viewer.id)
    .eq('role', 'owner');
  const ownedIds = ((ownedRows ?? []) as Array<{ site_id: string }>).map(
    (r) => r.site_id,
  );
  if (ownedIds.length === 0) notFound();

  // Target's memberships, scoped to the caller's owned sites.
  const { data: theirRows } = await svc
    .from('memberships')
    .select('id, site_id, role, created_at, sites:site_id (name, account_id)')
    .eq('user_id', userId)
    .in('site_id', ownedIds);
  const myScopeMemberships = ((theirRows ?? []) as unknown as Array<{
    id: string;
    site_id: string;
    role: ShellRole;
    created_at: string;
    sites: { name: string | null; account_id: string } | null;
  }>);
  if (myScopeMemberships.length === 0) notFound();

  // Out-of-scope memberships (memberships at sites the caller does NOT
  // own). If any exist, full account deletion is blocked.
  const { data: allTheirRows } = await svc
    .from('memberships')
    .select('site_id')
    .eq('user_id', userId);
  const allSiteIds = ((allTheirRows ?? []) as Array<{ site_id: string }>).map(
    (r) => r.site_id,
  );
  const ownedSet = new Set(ownedIds);
  const outOfScopeCount = allSiteIds.filter((id) => !ownedSet.has(id)).length;

  // User email + last sign-in
  const { data: authData } = await svc.auth.admin.getUserById(userId);
  const email = authData?.user?.email ?? '';
  const lastSignInAt =
    (authData?.user?.last_sign_in_at as string | null) ?? null;
  const userLabel = email || userId.slice(0, 8);

  // Founder protection — derive from any owned account being is_founder.
  const ownedAccountIds = Array.from(
    new Set(
      myScopeMemberships
        .map((m) => m.sites?.account_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  let targetIsFounder = false;
  if (ownedAccountIds.length > 0) {
    const { data: targetAccts } = await svc
      .from('accounts')
      .select('id, is_founder')
      .in('id', ownedAccountIds);
    targetIsFounder = (targetAccts ?? []).some((a) => Boolean(a.is_founder));
  }

  const isSelf = userId === viewer.id;

  // Build per-site permission panels.
  type Panel = {
    membership_id: string;
    site_name: string;
    role: ShellRole;
    joined_at: string;
    cells: PermissionCell[];
    tier: string;
  };

  const panels: Panel[] = [];
  for (const m of myScopeMemberships) {
    let tier = 'free';
    if (m.sites?.account_id) {
      const { data: acct } = await svc
        .from('accounts')
        .select('tier')
        .eq('id', m.sites.account_id)
        .maybeSingle();
      tier = (acct?.tier as string | undefined) ?? 'free';
    }

    const { data: overrides } = await svc
      .from('feature_flags')
      .select('feature_key, enabled')
      .eq('membership_id', m.id);
    const overrideMap = new Map<string, boolean>();
    for (const o of overrides ?? []) {
      overrideMap.set(o.feature_key as string, Boolean(o.enabled));
    }

    const cells: PermissionCell[] = Object.values(FEATURE_REGISTRY)
      .filter((def) => isFeatureAvailableAtTier(def.key, tier))
      .map((def) => {
        const override = overrideMap.get(def.key);
        const enabled =
          override !== undefined ? override : isFeatureOnByDefault(def.key, m.role);
        return {
          feature_key: def.key,
          label: def.label,
          description: def.description,
          group: def.group,
          enabled,
          source: override !== undefined ? ('override' as const) : ('role' as const),
        };
      });

    panels.push({
      membership_id: m.id,
      site_name: m.sites?.name ?? 'Site',
      role: m.role,
      joined_at: m.created_at,
      cells,
      tier,
    });
  }

  // The MemberHeader card shows "primary" membership info (earliest
  // joined). The per-site role chip lives inside each panel.
  const primary = panels.slice().sort((a, b) => a.joined_at.localeCompare(b.joined_at))[0];
  const headerData: MemberHeaderData = {
    membership_id: primary.membership_id,
    user_id: userId,
    email,
    role: primary.role,
    site_name:
      panels.length === 1
        ? primary.site_name
        : panels.length + ' sites',
    joined_at: primary.joined_at,
    last_sign_in_at: lastSignInAt,
  };

  // Delete-account guard: blocked if out-of-scope memberships exist, if
  // the target is the founder, or if the caller is looking at themself.
  const canDeleteAccount = !targetIsFounder && !isSelf && outOfScopeCount === 0;
  const deleteBlockedReason = isSelf
    ? "You can't delete your own account from here."
    : targetIsFounder
      ? 'The founder account is protected.'
      : outOfScopeCount > 0
        ? 'This user has ' +
          outOfScopeCount +
          ' membership' +
          (outOfScopeCount === 1 ? '' : 's') +
          ' on sites outside your ownership. Coordinate with their other owner first.'
        : undefined;

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <OwnerPageHeader
        eyebrow="Who Has The Keys"
        title="Team"
        subtitle={
          isSelf
            ? 'This is your own account — destructive actions are disabled to keep you locked out of locking yourself out.'
            : 'One person, every site you share with them, and exactly what they can do at each.'
        }
        activeSlug="team"
      />

      <Link
        href="/owner/team"
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors inline-block mb-6"
      >
        ← All members
      </Link>

      <MemberHeader
        member={headerData}
        canChangeRole={false}
      />

      {panels.length > 1 && (
        <p className="font-serif italic text-sm text-muted mb-6 -mt-4">
          {userLabel} has access to {panels.length} of your sites. Each panel
          below shows their role and permissions at that specific site.
        </p>
      )}

      <div className="space-y-8">
        {panels.map((p) => (
          <div key={p.membership_id}>
            {panels.length > 1 && (
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-gold">
                  {p.site_name}
                </div>
                <span className="font-display font-semibold text-[10px] tracking-[0.2em] uppercase text-muted">
                  {roleLabel(p.role)}
                </span>
              </div>
            )}
            <MemberPermissions
              membershipId={p.membership_id}
              cells={p.cells}
            />
          </div>
        ))}
      </div>

      {!isSelf && !targetIsFounder && (
        <MemberActions
          userId={userId}
          userLabel={userLabel}
          sites={panels.map((p) => ({
            membership_id: p.membership_id,
            site_name: p.site_name,
            role: p.role,
          }))}
          canDeleteAccount={canDeleteAccount}
          deleteBlockedReason={deleteBlockedReason}
        />
      )}

      {targetIsFounder && (
        <div className="bg-paper-warm border-l-[3px] border-gold px-6 py-5 mt-10">
          <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-2">
            Protected account
          </div>
          <p className="font-serif text-[15px] text-ink-soft leading-relaxed">
            {userLabel} is a founder account. Removal and deletion controls
            are intentionally disabled — this account is part of the demo
            infrastructure and must remain in place.
          </p>
        </div>
      )}

      {isSelf && (
        <div className="bg-paper-warm border-l-[3px] border-attention px-6 py-5 mt-10">
          <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-attention mb-2">
            This is you
          </div>
          <p className="font-serif text-[15px] text-ink-soft leading-relaxed">
            You can&apos;t remove yourself from your own sites from this surface.
            If you genuinely need to hand off ownership, do it from Founder
            Admin so a replacement owner is in place first.
          </p>
        </div>
      )}
    </div>
  );
}

