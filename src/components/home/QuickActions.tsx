import Link from 'next/link';

export type QuickActionDef = {
  href: string;
  label: string;
  sub: string;
  /** SVG path content. Rendered inside a 24x24 viewBox, stroke currentColor. */
  iconPath: React.ReactNode;
  /** Optional badge for counts (e.g. '3 open'). Renders top-right. */
  badge?: string;
  /** Tone for the badge */
  tone?: 'attention' | 'urgent' | 'healthy';
};

/**
 * Role-tuned quick action grid. Lives right after "Today & The Week
 * Ahead" on every home screen so the chef / bar / manager / owner can
 * start any common task in one tap.
 *
 * Columns default to 4 on wide screens; pass cols=3 for a denser strip
 * on shells with only a handful of actions.
 */
export function QuickActions({
  actions,
  cols = 4,
}: {
  actions: QuickActionDef[];
  cols?: 3 | 4;
}) {
  const gridCols =
    cols === 3
      ? 'md:grid-cols-2 lg:grid-cols-3'
      : 'md:grid-cols-2 lg:grid-cols-4';

  return (
    <div className={'grid grid-cols-1 ' + gridCols + ' gap-4'}>
      {actions.map((a) => (
        <QuickActionTile key={a.href + ':' + a.label} action={a} />
      ))}
    </div>
  );
}

function QuickActionTile({ action: a }: { action: QuickActionDef }) {
  const toneClass =
    a.tone === 'urgent'
      ? 'bg-urgent text-paper'
      : a.tone === 'attention'
        ? 'bg-attention text-paper'
        : a.tone === 'healthy'
          ? 'bg-healthy text-paper'
          : 'bg-gold-bg text-gold-dark';

  return (
    <Link
      href={a.href}
      className="bg-card border border-rule px-6 py-5 flex items-center gap-4 hover:border-gold hover:-translate-y-px hover:shadow-[0_2px_8px_rgba(26,22,18,0.04)] transition-all relative"
    >
      <div className="w-9 h-9 border border-gold text-gold flex items-center justify-center flex-shrink-0">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {a.iconPath}
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-serif font-semibold text-lg tracking-[0.02em] text-ink leading-tight">
          {a.label}
        </div>
        <div className="text-xs text-muted tracking-[0.02em] mt-0.5">
          {a.sub}
        </div>
      </div>
      {a.badge && (
        <span
          className={
            'font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-2 py-1 ' +
            toneClass
          }
        >
          {a.badge}
        </span>
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------
// Reusable icon path snippets so the per-role action lists stay terse.
// ---------------------------------------------------------------------
export const QUICK_ICONS = {
  scan: (
    <>
      <rect x="4" y="3" width="16" height="18" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  prep: (
    <>
      {/* Herb leaf — almond shape with central vein */}
      <path d="M5 18C5 11 11 5 19 5c0 8-6 14-14 14z" />
      <path d="M5 18l9-9" />
    </>
  ),
  cocktail_shaker: (
    <>
      {/* Martini glass — V bowl on a stem with a foot */}
      <path d="M4 5h16l-7 8v6" />
      <path d="M9 21h6" />
    </>
  ),
  recipe: (
    <path d="M3 5c3 0 6 1 9 3 3-2 6-3 9-3v14c-3 0-6 1-9 3-3-2-6-3-9-3V5z" />
  ),
  waste: (
    <>
      <path d="M4 7h16" />
      <path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7" />
      <path d="M9 7V4h6v3" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  bank: (
    <>
      <ellipse cx="12" cy="6" rx="9" ry="3" />
      <path d="M3 6v12c0 1.7 4 3 9 3s9-1.3 9-3V6" />
      <path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
    </>
  ),
  notebook: (
    <>
      <path d="M6 3h12v18H6V3z" />
      <path d="M6 7h12M6 11h12M6 15h8" />
    </>
  ),
  safety: (
    <>
      <path d="M12 3l8 4v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7l8-4z" />
    </>
  ),
  margins: (
    <>
      <path d="M4 20V8M10 20V4M16 20V12M22 20V6" />
    </>
  ),
  cellar: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="1" />
      <path d="M6 8h12M9 12h6M9 15h6" />
    </>
  ),
  spillage: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="9" r="3" />
      <path d="M3 19c0-3 3-5 6-5s6 2 6 5" />
      <circle cx="17" cy="11" r="2" />
      <path d="M14 17c0-2 2-3 3-3s3 1 3 3" />
    </>
  ),
  report: (
    <>
      <path d="M5 3h11l4 4v14H5V3z" />
      <path d="M16 3v4h4" />
      <path d="M9 14l3-3 3 3 4-4" />
    </>
  ),
  invoice: (
    <>
      <path d="M6 3h10l4 4v14H6V3z" />
      <path d="M16 3v4h4" />
      <path d="M9 11h7M9 14h7M9 17h5" />
    </>
  ),
  menu: (
    <>
      <rect x="5" y="3" width="14" height="18" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </>
  ),
  alerts: (
    <>
      <path d="M12 3a6 6 0 0 0-6 6c0 4-2 6-2 6h16s-2-2-2-6a6 6 0 0 0-6-6z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  connections: (
    <>
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="18" r="3" />
      <path d="M9 6h6M9 18h6M6 9v6M18 9v6" />
    </>
  ),
  sites: (
    <>
      <path d="M3 21V8l9-5 9 5v13" />
      <path d="M9 21V12h6v9" />
    </>
  ),
  probe: (
    <>
      <path d="M12 3v12" />
      <circle cx="12" cy="18" r="3" />
      <path d="M8 7h8M8 11h8" />
    </>
  ),
  incident: (
    <>
      <path d="M12 3l10 18H2L12 3z" />
      <path d="M12 10v5" />
      <circle cx="12" cy="17" r=".5" />
    </>
  ),
  cleaning: (
    <>
      <path d="M14 3l-9 9 5 5 9-9-5-5z" />
      <path d="M7 14l-4 4 2 3 4-4" />
    </>
  ),
  training: (
    <>
      <path d="M3 9l9-5 9 5-9 5-9-5z" />
      <path d="M7 11v5l5 3 5-3v-5" />
    </>
  ),
  inbox: (
    <>
      <path d="M3 13l3-9h12l3 9v7H3v-7z" />
      <path d="M3 13h5l1 3h6l1-3h5" />
    </>
  ),
  cash: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="1" />
      <circle cx="12" cy="12" r="3" />
      <path d="M5 9h.01M19 15h.01" />
    </>
  ),
  transfer: (
    <>
      <path d="M3 12h13" />
      <path d="M12 6l6 6-6 6" />
      <path d="M21 6v12" />
    </>
  ),
} as const;
