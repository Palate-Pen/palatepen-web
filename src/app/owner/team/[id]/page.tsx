import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { OwnerPageHeader } from '@/components/owner/OwnerScaffold';
import { MemberHeader, type MemberHeaderData } from '@/components/team/MemberHeader';
import {
  MemberPermissions,
  type PermissionCell,
} from '@/components/team/MemberPermissions';
import {
  FEATURE_REGISTRY,
  isFeatureAvailableAtTier,
  isFeatureOnByDefault,
} from '@/lib/features';

export const metadata = { title: 'Member — Team — Owner — Palatable' };

export default async function OwnerMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const svc = createSupabaseServiceClient();
  const { data: membership } = await svc
    .from('memberships')
    .select('id, user_id, role, site_id, created_at, sites:site_id (name, account_id)')
    .eq('id', id)
    .maybeSingle();
  if (!membership) notFound();

  const accountId = (membership.sites as unknown as {
    name?: string;
    account_id?: string;
  } | null)?.account_id;

  // Authorise: viewer must be owner of an account that owns this site
  const { data: viewerMembership } = await svc
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('site_id', membership.site_id)
    .maybeSingle();
  const viewerRole = viewerMembership?.role as string | undefined;
  if (viewerRole !== 'owner' && viewerRole !== 'manager') notFound();

  // Pull email
  const { data: authData } = await svc.auth.admin.getUserById(
    membership.user_id as string,
  );
  const email = authData?.user?.email ?? '';
  const lastSignInAt =
    (authData?.user?.last_sign_in_at as string | null) ?? null;

  // Tier for this account
  let tier = 'free';
  if (accountId) {
    const { data: acct } = await svc
      .from('accounts')
      .select('tier')
      .eq('id', accountId)
      .maybeSingle();
    tier = (acct?.tier as string | undefined) ?? 'free';
  }

  // Feature override overlay
  const { data: overrides } = await svc
    .from('feature_flags')
    .select('feature_key, enabled')
    .eq('membership_id', membership.id);
  const overrideMap = new Map<string, boolean>();
  for (const o of overrides ?? []) {
    overrideMap.set(o.feature_key as string, Boolean(o.enabled));
  }

  type Role =
    | 'owner'
    | 'manager'
    | 'chef'
    | 'sous_chef'
    | 'commis'
    | 'bartender'
    | 'head_bartender'
    | 'bar_back'
    | 'viewer';
  const memberRole = membership.role as Role;

  const cells: PermissionCell[] = Object.values(FEATURE_REGISTRY)
    .filter((def) => isFeatureAvailableAtTier(def.key, tier))
    .map((def) => {
      const override = overrideMap.get(def.key);
      const enabled =
        override !== undefined ? override : isFeatureOnByDefault(def.key, memberRole);
      return {
        feature_key: def.key,
        label: def.label,
        description: def.description,
        group: def.group,
        enabled,
        source: override !== undefined ? ('override' as const) : ('role' as const),
      };
    });

  const header: MemberHeaderData = {
    membership_id: membership.id as string,
    user_id: membership.user_id as string,
    email,
    role: memberRole,
    site_name:
      (membership.sites as unknown as { name?: string } | null)?.name ?? 'Site',
    joined_at: membership.created_at as string,
    last_sign_in_at: lastSignInAt,
  };

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <OwnerPageHeader
        eyebrow="Who Has The Keys"
        title="Team"
        subtitle="One member, their role, and exactly what they can do across the kitchen."
        activeSlug="team"
      />

      <Link
        href="/owner/team"
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors inline-block mb-6"
      >
        ← All members
      </Link>

      <MemberHeader member={header} canChangeRole={viewerRole === 'owner'} />
      <MemberPermissions membershipId={header.membership_id} cells={cells} />
    </div>
  );
}
