'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Top-of-page back link for any sub-route under a chef-shell tab.
 *
 * Derives its destination from the current pathname — chops the last
 * segment off and uses that as the back href. The label maps the
 * resulting parent path to a friendly name ("The Walk-in", "The Bank",
 * "Recipes", etc.).
 *
 * Returns null on top-level tab landings (e.g. /recipes, /prep) since
 * the sidebar already handles that nav. Only renders when we're on a
 * sub-route.
 */
const LABELS: Record<string, string> = {
  '/': 'Home',
  '/prep': 'Prep',
  '/recipes': 'Recipes',
  '/menus': 'Menus',
  '/margins': 'Margins',
  '/notebook': 'Notebook',
  '/inbox': 'Inbox',
  '/settings': 'Settings',
  '/connections': 'Connections',
  '/stock-suppliers': 'The Walk-in',
  '/stock-suppliers/the-bank': 'The Bank',
  '/stock-suppliers/invoices': 'Invoices',
  '/stock-suppliers/deliveries': 'Deliveries',
  '/stock-suppliers/suppliers': 'Suppliers',
  '/stock-suppliers/waste': 'Waste',
  '/manager': 'Manager Home',
  '/owner': 'Owner Home',
};

// Top-level tabs that should NOT render a back link (the sidebar
// handles them already).
const TOP_LEVEL = new Set<string>(Object.keys(LABELS));

function parentPathOf(pathname: string): string | null {
  // Strip trailing slash, then drop the last segment.
  const trimmed = pathname.replace(/\/+$/, '');
  if (!trimmed || trimmed === '/') return null;
  const lastSlash = trimmed.lastIndexOf('/');
  if (lastSlash <= 0) return '/';
  return trimmed.slice(0, lastSlash);
}

export function BackLink() {
  const pathname = usePathname();
  if (!pathname || TOP_LEVEL.has(pathname)) return null;

  const parent = parentPathOf(pathname);
  if (!parent || TOP_LEVEL.has(pathname)) return null;

  // Resolve the closest named ancestor. The pathname could be
  // /stock-suppliers/the-bank/some-id — parent is
  // /stock-suppliers/the-bank, which IS in the map. If the parent
  // isn't in the map, walk up until something matches; fall back to
  // the root tab.
  let target = parent;
  while (target && !LABELS[target] && target !== '/') {
    const next = parentPathOf(target);
    if (!next || next === target) break;
    target = next;
  }
  const label = LABELS[target] ?? 'Back';

  return (
    <Link
      href={target}
      className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors inline-flex items-center gap-1.5 mb-5"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      Back to {label}
    </Link>
  );
}
