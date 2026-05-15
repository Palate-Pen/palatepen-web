'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { SignOutButton } from './SignOutButton';
import { CollapseToggle } from '@/components/shell/CollapseToggle';

const BREADCRUMBS: Record<string, string> = {
  '/admin': 'Founder Admin · Home',
  '/admin/users': 'Founder Admin · Users & Kitchens',
  '/admin/business': 'Founder Admin · Business',
  '/admin/system': 'Founder Admin · System Health',
  '/admin/content': 'Founder Admin · Content & Comms',
  '/admin/ops': 'Founder Admin · Founder Ops',
};

const VIEW_OPTIONS: Array<{
  key: 'chef' | 'bartender' | 'manager' | 'owner' | 'admin';
  label: string;
  href: string;
}> = [
  { key: 'chef', label: 'Chef view', href: '/' },
  { key: 'bartender', label: 'Bartender view', href: '/bartender' },
  { key: 'manager', label: 'Manager view', href: '/manager' },
  { key: 'owner', label: 'Owner view', href: '/owner' },
  { key: 'admin', label: 'Founder', href: '/admin' },
];

export function AdminTopbar({ email }: { email: string }) {
  const pathname = usePathname();
  const breadcrumb = BREADCRUMBS[pathname] ?? 'Founder Admin';
  const [viewMenuOpen, setViewMenuOpen] = useState(false);

  return (
    <header className="h-[76px] bg-paper border-b border-rule flex items-center justify-between px-6 md:px-10 sticky top-0 z-10 flex-shrink-0">
      <div className="flex items-center gap-4">
        <CollapseToggle />
        <div className="font-serif text-lg font-medium tracking-[0.04em] text-ink">
          {breadcrumb}
        </div>
      </div>
      <div className="flex items-center gap-5">
        <div className="hidden md:flex items-center gap-2 relative">
          <span
            className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-2 py-1 border bg-gold-bg text-gold-dark border-gold/40"
            title="Founder demo account · zero cost · not billable"
          >
            Founder
          </span>
          <button
            type="button"
            onClick={() => setViewMenuOpen((v) => !v)}
            onBlur={() => setTimeout(() => setViewMenuOpen(false), 120)}
            className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-2 py-1 bg-ink text-paper hover:bg-ink-soft transition-colors inline-flex items-center gap-1"
            title="Switch surface"
            aria-haspopup="menu"
            aria-expanded={viewMenuOpen}
          >
            Founder
            <span className="text-paper/60">▾</span>
          </button>
          {viewMenuOpen && (
            <div className="absolute top-full right-0 mt-2 bg-card border border-rule shadow-[0_8px_24px_rgba(26,22,18,0.12)] min-w-[180px] z-20">
              {VIEW_OPTIONS.map((v) => (
                <Link
                  key={v.key}
                  href={v.href}
                  className={
                    'block px-4 py-2.5 font-display font-semibold text-[11px] tracking-[0.18em] uppercase transition-colors ' +
                    (v.key === 'admin'
                      ? 'bg-gold-bg text-gold-dark'
                      : 'text-ink-soft hover:bg-paper-warm hover:text-ink')
                  }
                >
                  {v.label}
                  {v.key === 'admin' && (
                    <span className="ml-2 text-gold">✓</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="font-sans text-sm text-muted hidden lg:block">
          Signed in as{' '}
          <strong className="font-semibold text-ink">{email}</strong>
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
