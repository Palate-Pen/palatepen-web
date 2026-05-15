import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { OwnerPageHeader } from '@/components/owner/OwnerScaffold';
import { KpiCard } from '@/components/shell/KpiCard';
import { TeamList, type TeamListMember } from '@/components/team/TeamList';
import {
  FEATURE_REGISTRY,
  isFeatureAvailableAtTier,
  isFeatureOnByDefault,
} from '@/lib/features';

export const metadata = { title: 'Team — Owner — Palatable' };

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

export default async function OwnerTeamPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  // Owner sees every member at every site they own.
  const { data: ownedMemberships } = await supabase
    .from('memberships')
    .select('site_id, sites:site_id (name, account_id)')
    .eq('user_id', user.id)
    .eq('role', 'owner');
  const ownedSiteIds = ((ownedMemberships ?? []) as unknown as Array<{
    site_id: string;
    sites: { name: string | null; account_id: string } | null;
  }>);
  const siteIds = ownedSiteIds.map((m) => m.site_id);
  const siteNameById = new Map(
    ownedSiteIds.map((m) => [m.site_id, m.sites?.name ?? 'Site']),
  );

  if (siteIds.length === 0) {
    return (
      <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
        <OwnerPageHeader
          eyebrow="Who Has The Keys"
          title="Team"
          subtitle="No owned sites on file yet — team management lights up once a site is in place."
          activeSlug="team"
        />
      </div>
    );
  }

  // Pull all memberships across owned sites, plus their user emails.
  const svc = createSupabaseServiceClient();
  const { data: members } = await svc
    .from('memberships')
    .select('id, user_id, role, site_id, created_at')
    .in('site_id', siteIds);
  const allMembers = ((members ?? []) as unknown as Array<{
    id: string;
    user_id: string;
    role: ShellRole;
    site_id: string;
    created_at: string;
  }>);

  const userIds = Array.from(new Set(allMembers.map((m) => m.user_id)));
  const { data: authUsers } = await svc.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const emailById = new Map<string, string>();
  for (const u of authUsers.users ?? []) {
    if (u.email && userIds.includes(u.id)) emailById.set(u.id, u.email);
  }

  // Determine tier from the first owned site's account (all owned sites
  // share an account in v1).
  const firstAccountId = ownedSiteIds[0].sites?.account_id;
  let tier = 'free';
  if (firstAccountId) {
    const { data: acct } = await supabase
      .from('accounts')
      .select('tier')
      .eq('id', firstAccountId)
      .maybeSingle();
    tier = (acct?.tier as string | undefined) ?? 'free';
  }

  // Pull all feature_flag rows for the owned memberships in one shot.
  const membershipIds = allMembers.map((m) => m.id);
  const { data: overrides } = await svc
    .from('feature_flags')
    .select('membership_id, feature_key, enabled')
    .in('membership_id', membershipIds);
  const overrideByMembership = new Map<string, Map<string, boolean>>();
  for (const o of overrides ?? []) {
    const mid = o.membership_id as string;
    if (!overrideByMembership.has(mid)) overrideByMembership.set(mid, new Map());
    overrideByMembership.get(mid)!.set(o.feature_key as string, Boolean(o.enabled));
  }

  // Precompute features-on counts for the list row.
  const availableFeatures = Object.values(FEATURE_REGISTRY).filter((f) =>
    isFeatureAvailableAtTier(f.key, tier),
  );

  const listMembers: TeamListMember[] = allMembers.map((m) => {
    const overrides = overrideByMembership.get(m.id);
    let on = 0;
    let hasOverride = false;
    for (const def of availableFeatures) {
      const override = overrides?.get(def.key);
      if (override !== undefined) {
        hasOverride = true;
        if (override) on++;
      } else if (isFeatureOnByDefault(def.key, m.role)) {
        on++;
      }
    }
    return {
      membership_id: m.id,
      user_id: m.user_id,
      email: emailById.get(m.user_id) ?? m.user_id.slice(0, 8),
      role: m.role,
      site_id: m.site_id,
      site_name: siteNameById.get(m.site_id) ?? 'Site',
      joined_at: m.created_at,
      features_on: on,
      features_total: availableFeatures.length,
      has_override: hasOverride,
    };
  });

  // KPIs
  const totalMembers = allMembers.length;
  const ownerCount = allMembers.filter((m) => m.role === 'owner').length;
  const managerCount = allMembers.filter((m) => m.role === 'manager').length;
  const kitchenCount = allMembers.filter(
    (m) => m.role === 'chef' || m.role === 'sous_chef' || m.role === 'commis',
  ).length;
  const barCount = allMembers.filter(
    (m) =>
      m.role === 'bartender' ||
      m.role === 'head_bartender' ||
      m.role === 'bar_back',
  ).length;

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <OwnerPageHeader
        eyebrow="Who Has The Keys"
        title="Team"
        subtitle="Every member across every site you own. Roles set the defaults; per-feature overrides give you precise control over who can do what."
        activeSlug="team"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Total"
          value={String(totalMembers)}
          sub={'across ' + siteIds.length + ' site' + (siteIds.length === 1 ? '' : 's')}
        />
        <KpiCard
          label="Management"
          value={String(ownerCount + managerCount)}
          sub="owner + manager"
        />
        <KpiCard label="Kitchen" value={String(kitchenCount)} sub="chef + sous + commis" />
        <KpiCard label="Bar" value={String(barCount)} sub="head + bartender + back" />
      </div>

      <TeamList
        members={listMembers}
        basePath="/owner/team"
        showSiteColumn={siteIds.length > 1}
      />
    </div>
  );
}
