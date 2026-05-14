'use client';

import { useSidebarState } from './SidebarState';

/**
 * Header sidebar toggle. Two modes:
 *   - Desktop (lg+): flips between full-width sidebar and thin rail.
 *     Persisted via localStorage in SidebarStateProvider.
 *   - Mobile (< lg): opens the sidebar as an overlay drawer. The drawer
 *     itself handles closing on backdrop tap.
 *
 * One button, two breakpoint-conditional behaviours. The icon stays
 * consistent so the chef doesn't have to learn two affordances; the
 * label/title adapts.
 */
export function CollapseToggle() {
  const { collapsed, toggle, mobileOpen, openMobile, hydrated } =
    useSidebarState();

  return (
    <>
      {/* Mobile: hamburger that opens the drawer. */}
      <button
        type="button"
        onClick={openMobile}
        disabled={!hydrated}
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
        title="Open navigation"
        className="lg:hidden w-9 h-9 flex items-center justify-center bg-transparent border border-rule text-muted hover:border-gold hover:text-gold transition-colors"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      {/* Desktop: collapse to rail. */}
      <button
        type="button"
        onClick={toggle}
        disabled={!hydrated}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="hidden lg:flex w-9 h-9 items-center justify-center bg-transparent border border-rule text-muted hover:border-gold hover:text-gold transition-colors"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${
            collapsed ? 'rotate-180' : ''
          }`}
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
    </>
  );
}
