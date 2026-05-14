import Link from 'next/link';

export const OWNER_TABS: Array<{
  slug: string;
  href: string;
  name: string;
  description: string;
  status: 'live' | 'soon';
}> = [
  {
    slug: 'home',
    href: '/owner',
    name: 'Home',
    description: 'Business pulse · cross-site rollup',
    status: 'live',
  },
  {
    slug: 'sites',
    href: '/owner/sites',
    name: 'Sites',
    description: 'Per-site drill-in · how each kitchen is doing',
    status: 'live',
  },
  {
    slug: 'revenue',
    href: '/owner/revenue',
    name: 'Revenue',
    description: 'Period trends · year-on-year · same-period growth',
    status: 'soon',
  },
  {
    slug: 'margins',
    href: '/owner/margins',
    name: 'Margins',
    description: 'Group-wide dish performance · the winners and the dogs',
    status: 'soon',
  },
  {
    slug: 'suppliers',
    href: '/owner/suppliers',
    name: 'Suppliers',
    description: 'Consolidated spend · contract terms · group leverage',
    status: 'soon',
  },
  {
    slug: 'cash',
    href: '/owner/cash',
    name: 'Cash',
    description: 'A/R · outstanding · payments · the cash flow lens',
    status: 'soon',
  },
  {
    slug: 'reports',
    href: '/owner/reports',
    name: 'Reports',
    description: 'Period reports · accountant exports · P&L bundles',
    status: 'soon',
  },
  {
    slug: 'settings',
    href: '/owner/settings',
    name: 'Settings',
    description: 'Account · billing · tier · users across the business',
    status: 'soon',
  },
];

/**
 * Shared eyebrow + title + horizontal tab nav for the owner shell.
 * Static scaffold — the body of each tab is built per-page below.
 */
export function OwnerPageHeader({
  eyebrow,
  title,
  italic,
  subtitle,
  activeSlug,
}: {
  eyebrow: string;
  title: string;
  italic?: string;
  subtitle: string;
  activeSlug: string;
}) {
  return (
    <>
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        {eyebrow}
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
        {italic ? (
          <>
            {title}{' '}
            <em className="text-gold font-semibold not-italic">{italic}</em>
          </>
        ) : (
          <em className="text-gold font-semibold not-italic">{title}</em>
        )}
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-8">
        {subtitle}
      </p>

      <nav className="flex gap-1 flex-wrap border-b border-rule pb-1 mb-10">
        {OWNER_TABS.map((tab) => {
          const isActive = tab.slug === activeSlug;
          return (
            <Link
              key={tab.slug}
              href={tab.href}
              className={
                'relative font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2.5 transition-colors ' +
                (isActive
                  ? 'text-ink'
                  : 'text-muted hover:text-ink') +
                (tab.status === 'soon' ? ' opacity-60' : '')
              }
            >
              {tab.name}
              {isActive && (
                <span className="absolute left-3 right-3 bottom-0 h-0.5 bg-gold" />
              )}
              {tab.status === 'soon' && (
                <span className="ml-1.5 font-display font-semibold text-[8px] tracking-[0.18em] text-gold align-top">
                  ●
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

/** Used by every "soon" tab to render a consistent placeholder body. */
export function OwnerComingSoon({
  surface,
  body,
  reads,
}: {
  surface: string;
  body: string;
  reads: string[];
}) {
  return (
    <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-7">
      <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-gold mb-3">
        {surface} · pending design
      </div>
      <p className="font-serif italic text-base text-ink-soft leading-relaxed mb-5">
        {body}
      </p>
      <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted mb-2">
        Will read from
      </div>
      <ul className="font-serif text-sm text-ink-soft leading-relaxed">
        {reads.map((r) => (
          <li key={r}>· {r}</li>
        ))}
      </ul>
    </div>
  );
}
