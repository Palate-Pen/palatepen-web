'use client';

import { useSidebarState } from './SidebarState';

/**
 * Topbar collapse toggle. Chevron flips with collapsed state. Lives in
 * the topbar (not the sidebar) so it stays accessible when the sidebar
 * collapses to a thin rail.
 */
export function CollapseToggle() {
  const { collapsed, toggle, hydrated } = useSidebarState();

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!hydrated}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className="w-9 h-9 flex items-center justify-center bg-transparent border border-rule text-muted hover:border-gold hover:text-gold transition-colors"
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
  );
}
