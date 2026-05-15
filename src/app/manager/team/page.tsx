import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { getShellContext } from '@/lib/shell/context';
import { SectionHead } from '@/components/shell/SectionHead';
import { KpiCard } from '@/components/shell/KpiCard';
import { TeamList, type TeamListMember } from '@/components/team/TeamList';
import {
  FEATURE_REGISTRY,
  isFeatureAvailableAtTier,
  isFeatureOnByDefault,
} from '@/lib/features';

export const metadata = { title: 'Team — Manager — Palatable' };

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

const KITCHEN_USER_CAP = 5;

export default async function ManagerTeamPage() {
  const ctx = await getShellContext();
  if (!ctx.userId) redirect('/signin');

  const supabase = await createSupabaseServerClient();
  const { data: site } = await supabase
    .from('sites')
    .select('account_id, name')
    .eq('id', ctx.siteId)
    .maybeSingle();
  let tier = 'free';
  if (site?.account_id) {
    const { data: acct } = await supabase
      .from('accounts')
      .select('tier')
      .eq('id', site.account_id)
      .maybeSingle();
    tier = (acct?.tier as string | undefined) ?? 'free';
  }

  const svc = createSupabaseServiceClient();
  const { data: members } = await svc
    .from('memberships')
    .select('id, user_id, role, site_id, created_at')
    .eq('site_id', ctx.siteId)
    .order('created_at', { ascending: true });
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
      site_name: (site?.name as string | undefined) ?? ctx.kitchenName,
      joined_at: m.created_at,
      features_on: on,
      features_total: availableFeatures.length,
      has_override: hasOverride,
    };
  });

  const atOrOverCap = allMembers.length >= KITCHEN_USER_CAP;

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            Site · Brigade
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
            <em className="text-gold font-semibold not-italic">Team</em>
          </h1>
          <p className="font-serif italic text-lg text-muted">
            {allMembers.length === 0
              ? 'No memberships on this site yet.'
              : allMembers.length +
                ' on the books at ' +
                ((site?.name as string | undefined) ?? ctx.kitchenName) +
                '. Kitchen tier caps at ' +
                KITCHEN_USER_CAP +
                ' users.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="On the books"
          value={String(allMembers.length) + ' / ' + KITCHEN_USER_CAP}
          sub={atOrOverCap ? 'cap reached' : 'seats free'}
          tone={atOrOverCap ? 'attention' : undefined}
        />
        <KpiCard
          label="Kitchen"
          value={String(
            allMembers.filter(
              (m) =>
                m.role === 'chef' ||
                m.role === 'sous_chef' ||
                m.role === 'commis',
            ).length,
          )}
          sub="chef + sous + commis"
        />
        <KpiCard
          label="Bar"
          value={String(
            allMembers.filter(
              (m) =>
                m.role === 'bartender' ||
                m.role === 'head_bartender' ||
                m.role === 'bar_back',
            ).length,
          )}
          sub="head + bartender + back"
        />
        <KpiCard
          label="Management"
          value={String(
            allMembers.filter(
              (m) => m.role === 'owner' || m.role === 'manager',
            ).length,
          )}
          sub="owner + manager"
        />
      </div>

      <SectionHead
        title="The brigade"
        meta={'roles set defaults · ' + availableFeatures.length + ' features per role'}
      />
      {allMembers.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-12 text-center">
          <p className="font-serif italic text-muted">
            No team on file. Invite kitchen + bar staff from Settings to start tracking the brigade.
          </p>
        </div>
      ) : (
        <TeamList
          members={listMembers}
          basePath="/manager/team"
          showSiteColumn={false}
        />
      )}

      <p className="font-serif italic text-sm text-muted mt-6">
        Invite + remove flow lands with the multi-user signup batch. Until then, memberships can be added by Founder Admin.
      </p>
    </div>
  );
}
