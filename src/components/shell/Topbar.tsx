'use client';

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

function resolveBreadcrumb(pathname: string): string {
  if (pathname === '/') return 'Home';
  const match = BREADCRUMBS.find(
    (b) => pathname === b.prefix || pathname.startsWith(b.prefix + '/'),
  );
  return match?.label ?? 'Palatable';
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
