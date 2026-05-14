'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = { href: string; label: string; badge?: string };

const OVERVIEW: NavItem[] = [{ href: '/admin', label: 'Home' }];

const DOMAINS: NavItem[] = [
  { href: '/admin/users', label: 'Users & Kitchens' },
  { href: '/admin/business', label: 'Business' },
  { href: '/admin/system', label: 'System Health' },
  { href: '/admin/content', label: 'Content & Comms' },
  { href: '/admin/ops', label: 'Founder Ops' },
];

export function AdminSidebar({
  kitchenBadge,
  opsBadge,
}: {
  kitchenBadge?: string;
  opsBadge?: string;
}) {
  return (
    <aside className="w-[252px] bg-paper-warm border-r border-rule h-screen sticky top-0 flex flex-col overflow-hidden flex-shrink-0">
      <div className="h-[76px] px-6 border-b border-rule flex flex-col justify-center flex-shrink-0">
        <Link
          href="/admin"
          className="font-display text-xl font-semibold tracking-[0.16em] uppercase text-ink"
        >
          <span>P</span>
          <span className="inline-block w-[6px] h-[6px] bg-gold rounded-full mx-1 relative -top-[3px]" />
          <span>alatable</span>
        </Link>
        <div className="font-display text-xs font-medium tracking-[0.32em] uppercase text-muted mt-1">
          Founder Admin
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        <Section label="Overview" items={OVERVIEW} />
        <Section
          label="Domains"
          items={DOMAINS.map((d) =>
            d.href === '/admin/users' && kitchenBadge
              ? { ...d, badge: kitchenBadge }
              : d.href === '/admin/ops' && opsBadge
                ? { ...d, badge: opsBadge }
                : d,
          )}
        />
      </nav>
    </aside>
  );
}

function Section({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <div>
      <div className="font-display text-xs font-semibold tracking-[0.4em] uppercase text-muted-soft pt-3.5 pb-1.5 px-6">
        {label}
      </div>
      {items.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
    </div>
  );
}

function NavLink({ href, label, badge }: NavItem) {
  const pathname = usePathname();
  const isActive =
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-3 px-6 py-2.5 border-l-2 transition-colors font-display text-xs font-semibold tracking-[0.18em] uppercase ${
        isActive
          ? 'border-l-gold bg-gold-bg text-ink'
          : 'border-l-transparent text-ink-soft hover:border-l-gold/40 hover:bg-gold-bg hover:text-ink'
      }`}
    >
      <span className="leading-tight">{label}</span>
      {badge && (
        <span
          className={`font-display text-xs font-semibold px-1.5 py-0.5 min-w-[20px] text-center leading-none ${
            isActive ? 'bg-gold text-paper' : 'bg-transparent border border-rule text-muted'
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
