/* eslint-disable no-console */
/*
 * setup-004-team-and-realtime.js
 *
 * Writes:
 *   - src/components/team/TeamMatrix.tsx (client component)
 *   - src/components/shell/LookingAheadLive.tsx (Realtime subscriber)
 *   - src/app/owner/team/page.tsx + actions.ts
 *   - Replaces src/app/manager/team/page.tsx (was a stub) + actions.ts
 *
 * Run with: node scripts/setup-004-team-and-realtime.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function write(rel, body) {
  const out = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, body, { encoding: 'utf8' });
  console.log('wrote', out);
}

// ---------------------------------------------------------------------
// TeamMatrix client component
// ---------------------------------------------------------------------
const teamMatrix = `'use client';

import { useState, useTransition } from 'react';
import type { FeatureKey } from '@/lib/features';

export type MatrixMember = {
  membership_id: string;
  user_id: string;
  email: string;
  role: ShellRole;
  site_id: string;
  site_name: string;
  /** Map of feature_key -> { enabled, source }. Computed server-side from
   *  resolveFeatureMatrix() then passed in. */
  features: Record<string, { enabled: boolean; source: 'role' | 'override' }>;
};

export type FeatureColumn = {
  key: FeatureKey;
  label: string;
  group: 'kitchen' | 'bar' | 'finance' | 'safety' | 'admin';
};

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

const ROLE_LABEL: Record<ShellRole, string> = {
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

const GROUP_LABEL: Record<FeatureColumn['group'], string> = {
  kitchen: 'Kitchen',
  bar: 'Bar',
  finance: 'Finance',
  safety: 'Safety',
  admin: 'Admin',
};

export function TeamMatrix({
  members,
  featureColumns,
  toggleAction,
  changeRoleAction,
  canChangeRole,
  showSiteColumn,
}: {
  members: MatrixMember[];
  featureColumns: FeatureColumn[];
  toggleAction: (
    membershipId: string,
    featureKey: string,
    enabled: boolean,
  ) => Promise<{ ok: boolean; error?: string }>;
  changeRoleAction: (
    membershipId: string,
    role: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  canChangeRole: boolean;
  showSiteColumn: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [groupFilter, setGroupFilter] = useState<string | null>(null);

  const visibleColumns = groupFilter
    ? featureColumns.filter((c) => c.group === groupFilter)
    : featureColumns;

  function toggle(membershipId: string, featureKey: string, current: boolean) {
    const next = !current;
    const errKey = membershipId + ':' + featureKey;
    startTransition(async () => {
      const res = await toggleAction(membershipId, featureKey, next);
      if (!res.ok) {
        setErrors((p) => ({ ...p, [errKey]: res.error ?? 'Failed' }));
      } else {
        setErrors((p) => {
          const next = { ...p };
          delete next[errKey];
          return next;
        });
      }
    });
  }

  function changeRole(membershipId: string, role: string) {
    startTransition(async () => {
      await changeRoleAction(membershipId, role);
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-6 print-hide">
        <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted">
          Filter:
        </span>
        {(['kitchen', 'bar', 'finance', 'safety', 'admin'] as const).map(
          (g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroupFilter(groupFilter === g ? null : g)}
              className={
                'font-display font-semibold text-xs tracking-[0.18em] uppercase px-3 py-1.5 border transition-colors ' +
                (groupFilter === g
                  ? 'bg-gold text-paper border-gold'
                  : 'bg-transparent text-muted border-rule hover:border-gold hover:text-gold')
              }
            >
              {GROUP_LABEL[g]}
            </button>
          ),
        )}
        {groupFilter && (
          <button
            type="button"
            onClick={() => setGroupFilter(null)}
            className="font-serif italic text-xs text-muted hover:text-ink ml-2"
          >
            clear
          </button>
        )}
      </div>

      <div className="bg-card border border-rule overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-paper-warm border-b border-rule">
              <th className="text-left px-5 py-3 font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted whitespace-nowrap sticky left-0 bg-paper-warm z-10">
                Member
              </th>
              <th className="text-left px-5 py-3 font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted whitespace-nowrap">
                Role
              </th>
              {showSiteColumn && (
                <th className="text-left px-5 py-3 font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted whitespace-nowrap">
                  Site
                </th>
              )}
              {visibleColumns.map((c) => (
                <th
                  key={c.key}
                  className="text-center px-3 py-3 font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted whitespace-nowrap"
                  title={c.label}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr
                key={m.membership_id}
                className={
                  i < members.length - 1 ? 'border-b border-rule-soft' : ''
                }
              >
                <td className="px-5 py-4 font-serif text-sm text-ink whitespace-nowrap sticky left-0 bg-card z-10">
                  {m.email || m.user_id.slice(0, 8)}
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  {canChangeRole ? (
                    <select
                      value={m.role}
                      onChange={(e) => changeRole(m.membership_id, e.target.value)}
                      disabled={pending}
                      className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-3 py-1.5 bg-paper border border-rule text-ink focus:border-gold focus:outline-none"
                    >
                      {(
                        Object.keys(ROLE_LABEL) as Array<keyof typeof ROLE_LABEL>
                      ).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
                      {ROLE_LABEL[m.role]}
                    </span>
                  )}
                </td>
                {showSiteColumn && (
                  <td className="px-5 py-4 font-serif italic text-sm text-muted whitespace-nowrap">
                    {m.site_name}
                  </td>
                )}
                {visibleColumns.map((c) => {
                  const cell = m.features[c.key];
                  if (!cell) {
                    return (
                      <td
                        key={c.key}
                        className="px-3 py-4 text-center font-serif italic text-xs text-muted-soft"
                      >
                        —
                      </td>
                    );
                  }
                  const errKey = m.membership_id + ':' + c.key;
                  const err = errors[errKey];
                  return (
                    <td key={c.key} className="px-3 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggle(m.membership_id, c.key, cell.enabled)}
                        disabled={pending}
                        title={
                          cell.source === 'override'
                            ? 'Override set'
                            : 'Inherits role default'
                        }
                        className={
                          'w-10 h-6 border transition-colors relative ' +
                          (cell.enabled
                            ? 'bg-healthy border-healthy'
                            : 'bg-paper border-rule')
                        }
                      >
                        <span
                          className={
                            'absolute top-0.5 w-4 h-4 transition-all ' +
                            (cell.enabled
                              ? 'left-5 bg-paper'
                              : 'left-1 bg-muted')
                          }
                        />
                      </button>
                      {cell.source === 'override' && (
                        <div className="font-serif italic text-[10px] text-gold mt-1">
                          override
                        </div>
                      )}
                      {err && (
                        <div className="font-serif italic text-[10px] text-urgent mt-1">
                          {err}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="font-serif italic text-sm text-muted mt-6">
        Default state comes from each member's role. Tap a toggle to override per user — the override sticks until you tap it back to role-default by toggling twice.
      </p>
    </div>
  );
}
`;

// ---------------------------------------------------------------------
// LookingAheadLive — Realtime subscriber wrapper
// ---------------------------------------------------------------------
const lookingAheadLive = `'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Client-side subscriber for the forward_signals table. When a new signal
 * lands (insert) or an existing one is dismissed/acted-on (update), the
 * component asks Next.js to re-fetch the server-rendered LookingAhead
 * tree so the user sees fresh state without a manual refresh.
 *
 * This pairs with the SSR-rendered LookingAhead — first paint is server,
 * subsequent updates are realtime-patched. No flicker since the data
 * is identical and the router refresh is incremental.
 *
 * The browser Supabase client is created here rather than imported from
 * a shared singleton because LookingAhead is rendered on many pages and
 * each instance needs its own subscription scoped to the site.
 */

export function LookingAheadLive({ siteId }: { siteId: string }) {
  const router = useRouter();

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return;

    const supabase = createBrowserClient(url, anonKey);
    const channel = supabase
      .channel('forward_signals:' + siteId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'v2',
          table: 'forward_signals',
          filter: 'site_id=eq.' + siteId,
        },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [siteId, router]);

  return null;
}
`;

// ---------------------------------------------------------------------
// owner/team page
// ---------------------------------------------------------------------
const ownerTeamPage = `import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { OwnerPageHeader } from '@/components/owner/OwnerScaffold';
import { KpiCard } from '@/components/shell/KpiCard';
import { TeamMatrix } from '@/components/team/TeamMatrix';
import type { MatrixMember, FeatureColumn } from '@/components/team/TeamMatrix';
import {
  FEATURE_REGISTRY,
  isFeatureAvailableAtTier,
  isFeatureOnByDefault,
  type FeatureKey,
} from '@/lib/features';
import { toggleFeatureFlagAction, changeRoleAction } from './actions';

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

  // Build the matrix.
  const featureColumns: FeatureColumn[] = Object.values(FEATURE_REGISTRY)
    .filter((f) => isFeatureAvailableAtTier(f.key, tier))
    .map((f) => ({ key: f.key, label: f.label, group: f.group }));

  const matrixMembers: MatrixMember[] = allMembers.map((m) => {
    const features: Record<string, { enabled: boolean; source: 'role' | 'override' }> = {};
    for (const col of featureColumns) {
      const override = overrideByMembership.get(m.id)?.get(col.key);
      if (override !== undefined) {
        features[col.key] = { enabled: override, source: 'override' };
      } else {
        features[col.key] = {
          enabled: isFeatureOnByDefault(col.key, m.role),
          source: 'role',
        };
      }
    }
    return {
      membership_id: m.id,
      user_id: m.user_id,
      email: emailById.get(m.user_id) ?? m.user_id.slice(0, 8),
      role: m.role,
      site_id: m.site_id,
      site_name: siteNameById.get(m.site_id) ?? 'Site',
      features,
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

      <TeamMatrix
        members={matrixMembers}
        featureColumns={featureColumns}
        toggleAction={toggleFeatureFlagAction}
        changeRoleAction={changeRoleAction}
        canChangeRole={true}
        showSiteColumn={siteIds.length > 1}
      />
    </div>
  );
}
`;

const ownerTeamActions = `'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

/** Set or update a feature flag override for a membership. */
export async function toggleFeatureFlagAction(
  membershipId: string,
  featureKey: string,
  enabled: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  // Authorisation: caller must be owner or manager at the target's site.
  const svc = createSupabaseServiceClient();
  const { data: target } = await svc
    .from('memberships')
    .select('id, site_id')
    .eq('id', membershipId)
    .maybeSingle();
  if (!target) return { ok: false, error: 'Member not found' };

  const { data: viewer } = await svc
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('site_id', target.site_id)
    .maybeSingle();
  if (!viewer || (viewer.role !== 'owner' && viewer.role !== 'manager')) {
    return { ok: false, error: 'Not authorised' };
  }

  const { error } = await svc
    .from('feature_flags')
    .upsert(
      {
        membership_id: membershipId,
        feature_key: featureKey,
        enabled,
        set_by: user.id,
        set_at: new Date().toISOString(),
      },
      { onConflict: 'membership_id,feature_key' },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath('/owner/team');
  revalidatePath('/manager/team');
  return { ok: true };
}

/** Change a member's role (owner-level only). */
export async function changeRoleAction(
  membershipId: string,
  role: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const svc = createSupabaseServiceClient();
  const { data: target } = await svc
    .from('memberships')
    .select('id, site_id')
    .eq('id', membershipId)
    .maybeSingle();
  if (!target) return { ok: false, error: 'Member not found' };

  const { data: viewer } = await svc
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('site_id', target.site_id)
    .maybeSingle();
  if (!viewer || viewer.role !== 'owner') {
    return { ok: false, error: 'Only owners can change roles' };
  }

  const allowed = new Set([
    'owner',
    'manager',
    'chef',
    'sous_chef',
    'commis',
    'bartender',
    'head_bartender',
    'bar_back',
    'viewer',
  ]);
  if (!allowed.has(role)) return { ok: false, error: 'Invalid role' };

  const { error } = await svc
    .from('memberships')
    .update({ role })
    .eq('id', membershipId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/owner/team');
  revalidatePath('/manager/team');
  return { ok: true };
}
`;

// ---------------------------------------------------------------------
// manager/team page — single-site team matrix, capped at 5 (Kitchen tier)
// ---------------------------------------------------------------------
const managerTeamPage = `import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { getShellContext } from '@/lib/shell/context';
import { SectionHead } from '@/components/shell/SectionHead';
import { KpiCard } from '@/components/shell/KpiCard';
import { TeamMatrix } from '@/components/team/TeamMatrix';
import type { MatrixMember, FeatureColumn } from '@/components/team/TeamMatrix';
import {
  FEATURE_REGISTRY,
  isFeatureAvailableAtTier,
  isFeatureOnByDefault,
} from '@/lib/features';
import {
  toggleFeatureFlagAction,
  changeRoleAction,
} from '@/app/owner/team/actions';

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

  const featureColumns: FeatureColumn[] = Object.values(FEATURE_REGISTRY)
    .filter((f) => isFeatureAvailableAtTier(f.key, tier))
    .map((f) => ({ key: f.key, label: f.label, group: f.group }));

  const matrixMembers: MatrixMember[] = allMembers.map((m) => {
    const features: Record<string, { enabled: boolean; source: 'role' | 'override' }> = {};
    for (const col of featureColumns) {
      const override = overrideByMembership.get(m.id)?.get(col.key);
      if (override !== undefined) {
        features[col.key] = { enabled: override, source: 'override' };
      } else {
        features[col.key] = {
          enabled: isFeatureOnByDefault(col.key, m.role),
          source: 'role',
        };
      }
    }
    return {
      membership_id: m.id,
      user_id: m.user_id,
      email: emailById.get(m.user_id) ?? m.user_id.slice(0, 8),
      role: m.role,
      site_id: m.site_id,
      site_name: (site?.name as string | undefined) ?? ctx.kitchenName,
      features,
    };
  });

  const atOrOverCap = allMembers.length >= KITCHEN_USER_CAP;
  const canChangeRole = ctx.role === 'owner';

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
        title="Feature matrix"
        meta={'roles set defaults · ' + featureColumns.length + ' features'}
      />
      {allMembers.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-12 text-center">
          <p className="font-serif italic text-muted">
            No team on file. Invite kitchen + bar staff from Settings to start tracking the brigade.
          </p>
        </div>
      ) : (
        <TeamMatrix
          members={matrixMembers}
          featureColumns={featureColumns}
          toggleAction={toggleFeatureFlagAction}
          changeRoleAction={changeRoleAction}
          canChangeRole={canChangeRole}
          showSiteColumn={false}
        />
      )}

      <p className="font-serif italic text-sm text-muted mt-6">
        Invite + remove flow lands with the multi-user signup batch. Until then, memberships can be added by Founder Admin.
      </p>
    </div>
  );
}
`;

write('src/components/team/TeamMatrix.tsx', teamMatrix);
write('src/components/shell/LookingAheadLive.tsx', lookingAheadLive);
write('src/app/owner/team/page.tsx', ownerTeamPage);
write('src/app/owner/team/actions.ts', ownerTeamActions);
write('src/app/manager/team/page.tsx', managerTeamPage);

console.log('\ndone');
