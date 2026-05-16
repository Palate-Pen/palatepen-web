import Link from 'next/link';

/**
 * A single user's footprint across one-or-more sites. Owner team list
 * groups by user so jack@ on Kitchen + Cellar Bar shows as one row, not
 * two. Manager team list passes one membership per row but uses the
 * same shape (memberships.length === 1).
 */
export type TeamListUser = {
  user_id: string;
  email: string;
  /** Optional override for the row link. If omitted, no link rendered. */
  href?: string;
  memberships: Array<{
    membership_id: string;
    site_id: string;
    site_name: string;
    role: string;
    joined_at: string;
    features_on: number;
    features_total: number;
    has_override: boolean;
  }>;
};

import { ROLE_LABEL } from '@/lib/roles';

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/**
 * Read-only clickable list of team members, one row per *user* (not per
 * membership). Multi-site users show all their sites in one row.
 */
export function TeamList({
  users,
  showSiteColumn,
}: {
  users: TeamListUser[];
  /** True when the surface should call out which sites the user belongs
   *  to (owner view across multiple sites). Manager view hides this. */
  showSiteColumn: boolean;
}) {
  if (users.length === 0) {
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
          ? ['Member', 'Role', 'Sites', 'Permissions', 'Joined', '']
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
      {users.map((u, i) => {
        const roles = uniqueRoles(u);
        const onSum = u.memberships.reduce((acc, m) => acc + m.features_on, 0);
        const totalSum = u.memberships.reduce((acc, m) => acc + m.features_total, 0);
        const hasOverride = u.memberships.some((m) => m.has_override);
        const earliestJoined = u.memberships
          .map((m) => m.joined_at)
          .sort()[0];

        const body = (
          <div
            className={
              'grid grid-cols-1 gap-4 px-7 py-4 items-center transition-colors ' +
              (u.href ? 'hover:bg-paper-warm ' : '') +
              (showSiteColumn ? 'md:grid-cols-[1.5fr_1fr_1.3fr_1.1fr_140px_24px]' : 'md:grid-cols-[1.6fr_1fr_1.4fr_140px_24px]') +
              (i < users.length - 1 ? ' border-b border-rule-soft' : '')
            }
          >
            <div className="font-serif font-semibold text-base text-ink truncate">
              {u.email || u.user_id.slice(0, 8)}
            </div>
            <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
              {roles.map((r) => ROLE_LABEL[r] ?? r).join(' · ')}
            </div>
            {showSiteColumn && (
              <div className="font-serif italic text-sm text-muted truncate">
                {u.memberships.length === 1
                  ? u.memberships[0].site_name
                  : u.memberships.map((m) => m.site_name).join(' + ')}
              </div>
            )}
            <div className="font-serif text-sm text-ink-soft">
              <strong className="font-semibold text-ink not-italic">
                {onSum}
              </strong>
              <span className="text-muted-soft"> / {totalSum} on</span>
              {hasOverride && (
                <span className="ml-2 font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-gold">
                  custom
                </span>
              )}
            </div>
            <div className="font-serif italic text-xs text-muted">
              {dateFmt.format(new Date(earliestJoined))}
            </div>
            <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hidden md:block">
              {u.href ? '→' : ''}
            </div>
          </div>
        );

        return u.href ? (
          <Link key={u.user_id} href={u.href} className="block no-underline text-inherit">
            {body}
          </Link>
        ) : (
          <div key={u.user_id}>{body}</div>
        );
      })}
    </div>
  );
}

function uniqueRoles(u: TeamListUser): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of u.memberships) {
    if (seen.has(m.role)) continue;
    seen.add(m.role);
    out.push(m.role);
  }
  return out;
}

function headerCols(showSite: boolean): string {
  return showSite
    ? 'md:grid-cols-[1.5fr_1fr_1.3fr_1.1fr_140px_24px]'
    : 'md:grid-cols-[1.6fr_1fr_1.4fr_140px_24px]';
}
