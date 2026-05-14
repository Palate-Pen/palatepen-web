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

const VIEW_LABEL: Record<string, string> = {
  chef: 'Chef view',
  manager: 'Manager view',
  owner: 'Owner view',
  admin: 'Founder',
};

function tierLabel(tier: string): string {
  if (!tier) return 'Free';
  return tier[0].toUpperCase() + tier.slice(1).toLowerCase();
}

export function Topbar({
  tier = 'free',
  view = 'chef',
  isFounder = false,
  role = 'chef',
  email = '',
}: {
  tier?: string;
  view?: 'chef' | 'manager' | 'owner' | 'admin';
  isFounder?: boolean;
  role?: 'owner' | 'manager' | 'chef' | 'viewer';
  email?: string;
} = {}) {
  const pathname = usePathname();
  const breadcrumb = resolveBreadcrumb(pathname);
  const back = resolveBackLink(pathname);
  const [dateLabel, setDateLabel] = useState('');
  const [viewMenuOpen, setViewMenuOpen] = useState(false);

  const accessibleViews: Array<{
    key: 'chef' | 'manager' | 'owner' | 'admin';
    label: string;
    href: string;
  }> = [{ key: 'chef', label: VIEW_LABEL.chef, href: '/' }];
  if (role === 'manager' || role === 'owner') {
    accessibleViews.push({
      key: 'manager',
      label: VIEW_LABEL.manager,
      href: '/manager',
    });
  }
  if (role === 'owner') {
    accessibleViews.push({
      key: 'owner',
      label: VIEW_LABEL.owner,
      href: '/owner',
    });
  }
  if (isFounder || email === 'jack@palateandpen.co.uk') {
    accessibleViews.push({
      key: 'admin',
      label: VIEW_LABEL.admin,
      href: '/admin',
    });
  }
  const canSwitchView = accessibleViews.length > 1;

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
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2 font-display text-xs font-semibold tracking-[0.3em] uppercase text-healthy">
          <span className="w-1.5 h-1.5 rounded-full bg-healthy animate-pulse" />
          Live
        </div>
        <div className="hidden md:flex items-center gap-2 relative">
          {isFounder ? (
            <span
              className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase px-2 py-1 border bg-gold-bg text-gold-dark border-gold/40"
              title="Founder demo account · zero cost · not billable"
            >
              Founder
            </span>
          ) : (
            <Link
              href="/settings#tier"
              className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase px-2 py-1 border bg-paper-warm text-ink-soft border-rule hover:border-gold hover:text-gold transition-colors"
              title={`${tierLabel(tier)} tier · click to manage`}
            >
              {tierLabel(tier)}
              <span className="ml-1 text-muted-soft">↑</span>
            </Link>
          )}

          {canSwitchView ? (
            <button
              type="button"
              onClick={() => setViewMenuOpen((v) => !v)}
              onBlur={() => setTimeout(() => setViewMenuOpen(false), 120)}
              className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase px-2 py-1 bg-ink text-paper hover:bg-ink-soft transition-colors inline-flex items-center gap-1"
              title="Switch surface"
              aria-haspopup="menu"
              aria-expanded={viewMenuOpen}
            >
              {VIEW_LABEL[view] ?? 'View'}
              <span className="text-paper/60">▾</span>
            </button>
          ) : (
            <span
              className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase px-2 py-1 bg-ink text-paper"
              title={`Viewing as ${VIEW_LABEL[view]}`}
            >
              {VIEW_LABEL[view] ?? 'View'}
            </span>
          )}

          {canSwitchView && viewMenuOpen && (
            <div className="absolute top-full right-0 mt-2 bg-card border border-rule shadow-[0_8px_24px_rgba(26,22,18,0.12)] min-w-[180px] z-20">
              {accessibleViews.map((v) => (
                <Link
                  key={v.key}
                  href={v.href}
                  className={
                    'block px-4 py-2.5 font-display font-semibold text-[10px] tracking-[0.18em] uppercase transition-colors ' +
                    (v.key === view
                      ? 'bg-gold-bg text-gold-dark'
                      : 'text-ink-soft hover:bg-paper-warm hover:text-ink')
                  }
                >
                  {v.label}
                  {v.key === view && (
                    <span className="ml-2 text-gold">✓</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
        <div
          suppressHydrationWarning
          className="font-sans text-sm font-normal text-muted tracking-[0.02em] hidden lg:block"
        >
          {dateLabel}
        </div>
      </div>
    </header>
  );
}
