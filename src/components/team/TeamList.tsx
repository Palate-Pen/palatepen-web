import Link from 'next/link';

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
 * `{basePath}/[membership_id]` where the per-member detail page renders
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
