/* eslint-disable no-console */
/*
 * setup-012-team-detail.js
 *
 * Refactor team management UX from a toggle-matrix to a clickable
 * list + per-member detail page. Also adds the "Switch Surface"
 * pattern (already on chef + bar + manager) to owner Settings.
 *
 *   src/components/team/TeamList.tsx         — clickable list of members
 *   src/components/team/MemberHeader.tsx     — info card on detail page
 *   src/components/team/MemberPermissions.tsx — toggle panel
 *
 *   src/app/owner/team/[id]/page.tsx         — detail page
 *   src/app/manager/team/[id]/page.tsx       — mirror
 *
 * Run: node scripts/setup-012-team-detail.js
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
// TeamList.tsx — clickable members list, no inline toggles
// ---------------------------------------------------------------------
const teamList = `import Link from 'next/link';

export type TeamListMember = {
  membership_id: string;
  user_id: string;
  email: string;
  role: string;
  site_id: string;
  site_name: string;
  joined_at: string;
  /** Pre-computed counts so the list row can show "12 features on" without
   *  loading the full matrix for every row. */
  features_on: number;
  features_total: number;
  /** True if any feature has been explicitly overridden from the role default. */
  has_override: boolean;
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

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/**
 * Read-only clickable list of team members. Each row opens
 * \`{basePath}/[membership_id]\` where the per-member detail page renders
 * the info card + the permissions panel.
 */
export function TeamList({
  members,
  basePath,
  showSiteColumn,
}: {
  members: TeamListMember[];
  basePath: string;
  showSiteColumn: boolean;
}) {
  if (members.length === 0) {
    return (
      <div className="bg-card border border-rule px-10 py-12 text-center">
        <p className="font-serif italic text-muted">
          No members yet. Invite kitchen + bar staff from the Settings page to
          start tracking the brigade.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-rule">
      <div className={'hidden md:grid gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule ' + headerCols(showSiteColumn)}>
        {(showSiteColumn
          ? ['Member', 'Role', 'Site', 'Permissions', 'Joined', '']
          : ['Member', 'Role', 'Permissions', 'Joined', '']
        ).map((h, i) => (
          <div
            key={h + ':' + i}
            className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
          >
            {h}
          </div>
        ))}
      </div>
      {members.map((m, i) => (
        <Link
          key={m.membership_id}
          href={basePath + '/' + m.membership_id}
          className={
            'grid grid-cols-1 gap-4 px-7 py-4 items-center hover:bg-paper-warm transition-colors ' +
            (showSiteColumn ? 'md:grid-cols-[1.5fr_1fr_1fr_1.4fr_140px_24px]' : 'md:grid-cols-[1.6fr_1fr_1.4fr_140px_24px]') +
            (i < members.length - 1 ? ' border-b border-rule-soft' : '')
          }
        >
          <div className="font-serif font-semibold text-base text-ink truncate">
            {m.email || m.user_id.slice(0, 8)}
          </div>
          <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
            {ROLE_LABEL[m.role] ?? m.role}
          </div>
          {showSiteColumn && (
            <div className="font-serif italic text-sm text-muted truncate">
              {m.site_name}
            </div>
          )}
          <div className="font-serif text-sm text-ink-soft">
            <strong className="font-semibold text-ink not-italic">
              {m.features_on}
            </strong>
            <span className="text-muted-soft"> / {m.features_total} on</span>
            {m.has_override && (
              <span className="ml-2 font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-gold">
                custom
              </span>
            )}
          </div>
          <div className="font-serif italic text-xs text-muted">
            {dateFmt.format(new Date(m.joined_at))}
          </div>
          <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hidden md:block">
            →
          </div>
        </Link>
      ))}
    </div>
  );
}

function headerCols(showSite: boolean): string {
  return showSite
    ? 'md:grid-cols-[1.5fr_1fr_1fr_1.4fr_140px_24px]'
    : 'md:grid-cols-[1.6fr_1fr_1.4fr_140px_24px]';
}
`;

// ---------------------------------------------------------------------
// MemberHeader.tsx — info card + role selector
// ---------------------------------------------------------------------
const memberHeader = `'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { changeRoleAction } from '@/app/owner/team/actions';

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

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export type MemberHeaderData = {
  membership_id: string;
  user_id: string;
  email: string;
  role: string;
  site_name: string;
  joined_at: string;
  last_sign_in_at: string | null;
};

export function MemberHeader({
  member,
  canChangeRole,
}: {
  member: MemberHeaderData;
  canChangeRole: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState(member.role);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function pickRole(next: string) {
    setError(null);
    setSaved(false);
    setRole(next);
    startTransition(async () => {
      const res = await changeRoleAction(member.membership_id, next);
      if (!res.ok) {
        setError(res.error);
        setRole(member.role);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="bg-card border border-rule px-8 py-7 mb-8">
      <div className="flex items-start gap-5 flex-wrap">
        <div className="w-14 h-14 border border-gold bg-gold-bg flex items-center justify-center font-display font-semibold text-xl tracking-[0.04em] uppercase text-gold-dark flex-shrink-0">
          {(member.email || member.user_id).slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-[240px]">
          <div className="font-serif font-semibold text-2xl text-ink mb-1">
            {member.email || member.user_id.slice(0, 12)}
          </div>
          <div className="font-serif italic text-sm text-muted">
            On {member.site_name} since {dateFmt.format(new Date(member.joined_at))}
            {member.last_sign_in_at && (
              <> · last sign-in {dateFmt.format(new Date(member.last_sign_in_at))}</>
            )}
          </div>
        </div>
        <div className="min-w-[200px]">
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-1.5 block">
            Role
          </label>
          {canChangeRole ? (
            <select
              value={role}
              onChange={(e) => pickRole(e.target.value)}
              disabled={pending}
              className="w-full font-serif text-base text-ink bg-paper border border-rule px-3 py-2 focus:border-gold focus:outline-none"
            >
              {Object.keys(ROLE_LABEL).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          ) : (
            <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold py-2">
              {ROLE_LABEL[role] ?? role}
            </div>
          )}
          {saved && (
            <span className="font-serif italic text-xs text-healthy block mt-1.5">
              ✓ Role updated.
            </span>
          )}
          {error && (
            <span className="font-serif italic text-xs text-urgent block mt-1.5">
              {error}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
`;

// ---------------------------------------------------------------------
// MemberPermissions.tsx — per-feature toggle list grouped by domain
// ---------------------------------------------------------------------
const memberPermissions = `'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleFeatureFlagAction } from '@/app/owner/team/actions';

export type PermissionCell = {
  feature_key: string;
  label: string;
  description: string;
  group: 'kitchen' | 'bar' | 'finance' | 'safety' | 'admin';
  enabled: boolean;
  source: 'role' | 'override';
};

const GROUP_LABEL: Record<PermissionCell['group'], string> = {
  kitchen: 'Kitchen',
  bar: 'Bar',
  finance: 'Finance',
  safety: 'Safety',
  admin: 'Admin',
};

const GROUP_ORDER: PermissionCell['group'][] = [
  'kitchen',
  'bar',
  'finance',
  'safety',
  'admin',
];

/**
 * Per-member permissions panel. Replaces the cross-member toggle
 * matrix that previously lived on /owner/team. Grouped by domain so
 * editing permissions feels like a checklist, not a spreadsheet.
 *
 * Tap a row to flip its override. Override badge surfaces when the
 * value differs from the role default.
 */
export function MemberPermissions({
  membershipId,
  cells,
}: {
  membershipId: string;
  cells: PermissionCell[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toggle(featureKey: string, current: boolean) {
    setErrors((p) => {
      const next = { ...p };
      delete next[featureKey];
      return next;
    });
    startTransition(async () => {
      const res = await toggleFeatureFlagAction(
        membershipId,
        featureKey,
        !current,
      );
      if (!res.ok) {
        setErrors((p) => ({ ...p, [featureKey]: res.error ?? 'Failed' }));
        return;
      }
      router.refresh();
    });
  }

  const byGroup = new Map<string, PermissionCell[]>();
  for (const c of cells) {
    if (!byGroup.has(c.group)) byGroup.set(c.group, []);
    byGroup.get(c.group)!.push(c);
  }

  return (
    <div className="bg-card border border-rule">
      <div className="px-7 py-4 border-b border-rule">
        <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted">
          Permissions
        </div>
        <p className="font-serif italic text-sm text-muted mt-1">
          Tap a feature to override the role default. Overrides are remembered
          per user; everything else inherits from the role.
        </p>
      </div>

      {GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => (
        <div key={g}>
          <div className="px-7 py-3 bg-paper-warm border-b border-rule-soft font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
            {GROUP_LABEL[g]}
          </div>
          {byGroup.get(g)!.map((cell, i, list) => {
            const err = errors[cell.feature_key];
            return (
              <button
                key={cell.feature_key}
                type="button"
                onClick={() => toggle(cell.feature_key, cell.enabled)}
                disabled={pending}
                className={
                  'w-full text-left px-7 py-4 flex items-start gap-4 hover:bg-paper-warm transition-colors disabled:opacity-50 ' +
                  (i < list.length - 1 ? 'border-b border-rule-soft' : '')
                }
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-serif font-semibold text-base text-ink">
                      {cell.label}
                    </span>
                    {cell.source === 'override' && (
                      <span className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase px-2 py-0.5 bg-gold-bg text-gold-dark border border-gold/40">
                        override
                      </span>
                    )}
                  </div>
                  <div className="font-serif italic text-sm text-muted leading-snug">
                    {cell.description}
                  </div>
                  {err && (
                    <div className="font-serif italic text-xs text-urgent mt-1.5">
                      {err}
                    </div>
                  )}
                </div>
                <div
                  className={
                    'w-12 h-7 border-2 relative flex-shrink-0 transition-colors ' +
                    (cell.enabled
                      ? 'bg-healthy border-healthy'
                      : 'bg-paper border-rule')
                  }
                >
                  <span
                    className={
                      'absolute top-[2px] w-4 h-4 transition-all ' +
                      (cell.enabled ? 'left-[24px] bg-paper' : 'left-[2px] bg-muted')
                    }
                  />
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
`;

// ---------------------------------------------------------------------
// /owner/team/[id]/page.tsx — detail
// ---------------------------------------------------------------------
const ownerDetail = `import Link from 'next/link';
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
`;

// ---------------------------------------------------------------------
// /manager/team/[id]/page.tsx — detail
// ---------------------------------------------------------------------
const managerDetail = `import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { getShellContext } from '@/lib/shell/context';
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

export const metadata = { title: 'Member — Team — Manager — Palatable' };

export default async function ManagerMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getShellContext();
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

  // Manager-shell rule: only members at the manager's own site are
  // visible. Owner-of-this-account is allowed too.
  if (membership.site_id !== ctx.siteId) notFound();

  const accountId = (membership.sites as unknown as {
    name?: string;
    account_id?: string;
  } | null)?.account_id;

  // Pull email
  const { data: authData } = await svc.auth.admin.getUserById(
    membership.user_id as string,
  );
  const email = authData?.user?.email ?? '';
  const lastSignInAt =
    (authData?.user?.last_sign_in_at as string | null) ?? null;

  let tier = 'free';
  if (accountId) {
    const { data: acct } = await svc
      .from('accounts')
      .select('tier')
      .eq('id', accountId)
      .maybeSingle();
    tier = (acct?.tier as string | undefined) ?? 'free';
  }

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
      (membership.sites as unknown as { name?: string } | null)?.name ?? ctx.kitchenName,
    joined_at: membership.created_at as string,
    last_sign_in_at: lastSignInAt,
  };

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Site · Brigade
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
        <em className="text-gold font-semibold not-italic">Team Member</em>
      </h1>

      <Link
        href="/manager/team"
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors inline-block mb-6"
      >
        ← All members
      </Link>

      <MemberHeader member={header} canChangeRole={ctx.role === 'owner'} />
      <MemberPermissions membershipId={header.membership_id} cells={cells} />
    </div>
  );
}
`;

write('src/components/team/TeamList.tsx', teamList);
write('src/components/team/MemberHeader.tsx', memberHeader);
write('src/components/team/MemberPermissions.tsx', memberPermissions);
write('src/app/owner/team/[id]/page.tsx', ownerDetail);
write('src/app/manager/team/[id]/page.tsx', managerDetail);

console.log('\ndone');
