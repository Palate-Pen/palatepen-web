// Sidebar nav icons. Paths lifted from the locked v8 chef-shell mockups
// (chef-stock-suppliers-hub-mockup-v3.html / chef-prep-mockup-v1.html);
// Settings and Connections were redrawn here to a simpler shape since the
// mockups embed elaborate Heroicons-style gears that don't read well at
// 20px nav size.

export type NavIconName =
  | 'home'
  | 'prep'
  | 'recipes'
  | 'menus'
  | 'margins'
  | 'stock-suppliers'
  | 'notebook'
  | 'inbox'
  | 'settings'
  | 'connections'
  | 'team'
  | 'pl'
  | 'service-notes'
  | 'compliance'
  | 'reports'
  | 'deliveries'
  | 'suppliers'
  | 'sites'
  | 'revenue'
  | 'cash'
  | 'menu-builder'
  | 'cocktail-shaker';

const PATHS: Record<NavIconName, React.ReactNode> = {
  home: (
    <>
      <path d="M3 11l9-8 9 8M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  prep: (
    // Herb leaf — almond-shape with a central vein
    <>
      <path d="M5 18C5 11 11 5 19 5c0 8-6 14-14 14z" />
      <path d="M5 18l9-9" />
    </>
  ),
  'cocktail-shaker': (
    // Martini glass — V bowl on a stem with a foot
    <>
      <path d="M4 5h16l-7 8v6" />
      <path d="M9 21h6" />
    </>
  ),
  recipes: (
    <>
      <path d="M3 5c3 0 6 1 9 3 3-2 6-3 9-3v14c-3 0-6 1-9 3-3-2-6-3-9-3V5z" />
      <path d="M12 8v14" />
    </>
  ),
  menus: (
    <>
      <path d="M6 3h10l4 4v14H6V3z" />
      <path d="M16 3v4h4" />
      <path d="M9 10h7M9 14h7M9 18h5" />
    </>
  ),
  margins: (
    <>
      <path d="M3 20h18" />
      <rect x="5" y="13" width="3" height="7" />
      <rect x="11" y="8" width="3" height="12" />
      <rect x="17" y="4" width="3" height="16" />
    </>
  ),
  'stock-suppliers': (
    <>
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </>
  ),
  notebook: (
    <>
      <path d="M6 3h13v18H6z" />
      <path d="M6 3v18" />
      <circle cx="4" cy="7" r="0.7" fill="currentColor" />
      <circle cx="4" cy="12" r="0.7" fill="currentColor" />
      <circle cx="4" cy="17" r="0.7" fill="currentColor" />
      <path d="M10 8h5M10 12h5M10 16h3" />
    </>
  ),
  inbox: (
    <>
      <path d="M3 8l9 6 9-6" />
      <rect x="3" y="6" width="18" height="13" />
      <path d="M3 13h5l1 2h6l1-2h5" />
    </>
  ),
  settings: (
    // Aperture — concentric circles per the chef-safety-mockup-v1.html sidebar.
    <>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="7" />
    </>
  ),
  connections: (
    // Globe with latitude lines per the chef-safety-mockup-v1.html sidebar.
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.6 9h16.8M3.6 15h16.8" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15 21v-1a4 4 0 0 1 4-4h1" />
    </>
  ),
  pl: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 3 3 5-6" />
      <path d="M14 7h5v5" />
    </>
  ),
  'service-notes': (
    <>
      <path d="M5 4h11l4 4v12H5z" />
      <path d="M9 12h7M9 16h5M9 8h4" />
    </>
  ),
  compliance: (
    // Shield + check per the chef-safety-mockup-v1.html sidebar. Reused by
    // the chef Safety nav entry and the manager Compliance nav entry.
    <>
      <path d="M12 2L4 7v7c0 5 4 8 8 8s8-3 8-8V7l-8-5z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  reports: (
    <>
      <rect x="4" y="3" width="16" height="18" />
      <path d="M8 8h8M8 12h8M8 16h5" />
      <circle cx="18" cy="17" r="1.5" fill="currentColor" />
    </>
  ),
  deliveries: (
    <>
      <path d="M3 7h13l3 4h2v6h-2" />
      <path d="M3 7v10h13V7" />
      <circle cx="7" cy="18" r="1.5" />
      <circle cx="17" cy="18" r="1.5" />
    </>
  ),
  suppliers: (
    <>
      <path d="M3 21V8l9-5 9 5v13" />
      <path d="M9 21V12h6v9" />
      <circle cx="12" cy="9" r="1.2" />
    </>
  ),
  sites: (
    <>
      <rect x="3" y="4" width="7" height="7" />
      <rect x="14" y="4" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </>
  ),
  revenue: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9.5a2.5 2.5 0 0 0-3-1.5c-1.5 0-2.5.5-2.5 2 0 1.2 1 1.7 2.5 2 1.5.3 2.5.8 2.5 2 0 1.5-1 2-2.5 2a2.5 2.5 0 0 1-3-1.5" />
      <path d="M12 6v1.5M12 16.5v1.5" />
    </>
  ),
  cash: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="1" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M5 9v6M19 9v6" />
    </>
  ),
  'menu-builder': (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M8 7h8M8 11h8M8 15h5" />
      <path d="M16 18l2-2-1-1-2 2v1z" />
    </>
  ),
};

export function NavIcon({
  name,
  className,
}: {
  name: NavIconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
