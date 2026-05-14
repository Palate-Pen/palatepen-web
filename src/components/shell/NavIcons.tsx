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
  | 'connections';

const PATHS: Record<NavIconName, React.ReactNode> = {
  home: (
    <>
      <path d="M3 11l9-8 9 8M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  prep: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M8 7h8M8 11h8M8 15h5" />
      <circle cx="20" cy="7" r="1.5" fill="currentColor" />
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
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
    </>
  ),
  connections: (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
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
