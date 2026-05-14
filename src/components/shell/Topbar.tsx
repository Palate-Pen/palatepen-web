'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CollapseToggle } from './CollapseToggle';

const BREADCRUMBS: Array<{ prefix: string; label: string }> = [
  { prefix: '/prep', label: 'Prep' },
  { prefix: '/recipes', label: 'Recipes' },
  { prefix: '/menus', label: 'Menus' },
  { prefix: '/margins', label: 'Margins' },
  { prefix: '/stock-suppliers', label: 'Stock & Suppliers' },
  { prefix: '/notebook', label: 'Notebook' },
  { prefix: '/inbox', label: 'Inbox' },
  { prefix: '/settings', label: 'Settings' },
  { prefix: '/connections', label: 'Connections' },
];

// Named ancestors for the back link. When the chef is at a sub-route
// (e.g. /stock-suppliers/the-bank/some-id), the back arrow points to
// the closest named ancestor (/stock-suppliers/the-bank).
const NAMED_PATHS: Record<string, string> = {
  '/prep': 'Prep',
  '/recipes': 'Recipes',
  '/menus': 'Menus',
  '/margins': 'Margins',
  '/notebook': 'Notebook',
  '/inbox': 'Inbox',
  '/settings': 'Settings',
  '/connections': 'Connections',
  '/stock-suppliers': 'Stock & Suppliers',
  '/stock-suppliers/the-bank': 'The Bank',
  '/stock-suppliers/invoices': 'Invoices',
  '/stock-suppliers/deliveries': 'Deliveries',
  '/stock-suppliers/suppliers': 'Suppliers',
  '/stock-suppliers/waste': 'Waste',
};
const TAB_LANDINGS = new Set(['/', ...Object.keys(NAMED_PATHS)]);

function resolveBreadcrumb(pathname: string): string {
  if (pathname === '/') return 'Home';
  const match = BREADCRUMBS.find(
    (b) => pathname === b.prefix || pathname.startsWith(b.prefix + '/'),
  );
  return match?.label ?? 'Palatable';
}

function parentPathOf(pathname: string): string | null {
  const trimmed = pathname.replace(/\/+$/, '');
  if (!trimmed || trimmed === '/') return null;
  const last = trimmed.lastIndexOf('/');
  if (last <= 0) return '/';
  return trimmed.slice(0, last);
}

function resolveBackLink(pathname: string): { href: string; label: string } | null {
  if (TAB_LANDINGS.has(pathname)) return null;
  let target = parentPathOf(pathname);
  while (target && !NAMED_PATHS[target] && target !== '/') {
    const next = parentPathOf(target);
    if (!next || next === target) break;
    target = next;
  }
  if (!target) return null;
  if (target === '/') return { href: '/', label: 'Home' };
  const label = NAMED_PATHS[target];
  if (!label) return null;
  return { href: target, label };
}

function formatDate(now: Date): string {
  const day = now.toLocaleDateString('en-GB', { weekday: 'long' });
  const date = now.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const time = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${day}, ${date} · ${time}`;
}

export function Topbar() {
  const pathname = usePathname();
  const breadcrumb = resolveBreadcrumb(pathname);
  const back = resolveBackLink(pathname);
  const [dateLabel, setDateLabel] = useState('');

  useEffect(() => {
    const update = () => setDateLabel(formatDate(new Date()));
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-[76px] bg-paper border-b border-rule flex items-center justify-between px-6 md:px-10 sticky top-0 z-10 flex-shrink-0">
      <div className="flex items-center gap-4">
        <CollapseToggle />
        {back && (
          <Link
            href={back.href}
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors inline-flex items-center gap-1.5 flex-shrink-0"
            title={`Back to ${back.label}`}
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
            <span className="hidden md:inline">{back.label}</span>
          </Link>
        )}
        {back && <span className="text-muted-soft hidden md:inline">·</span>}
        <div className="font-serif text-lg font-medium tracking-[0.04em] text-ink">
          {breadcrumb}
        </div>
      </div>
      <div className="flex items-center gap-7">
        <div className="flex items-center gap-2 font-display text-xs font-semibold tracking-[0.3em] uppercase text-healthy">
          <span className="w-1.5 h-1.5 rounded-full bg-healthy animate-pulse" />
          Live
        </div>
        <div
          suppressHydrationWarning
          className="font-sans text-sm font-normal text-muted tracking-[0.02em]"
        >
          {dateLabel}
        </div>
      </div>
    </header>
  );
}
