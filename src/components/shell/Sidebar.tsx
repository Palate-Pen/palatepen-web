'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavIcon, type NavIconName } from './NavIcons';

type NavItem = { href: string; label: string; icon: NavIconName };

const KITCHEN: NavItem[] = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/prep', label: 'Prep', icon: 'prep' },
  { href: '/recipes', label: 'Recipes', icon: 'recipes' },
  { href: '/menus', label: 'Menus', icon: 'menus' },
  { href: '/margins', label: 'Margins', icon: 'margins' },
  { href: '/stock-suppliers', label: 'Stock & Suppliers', icon: 'stock-suppliers' },
  { href: '/notebook', label: 'Notebook', icon: 'notebook' },
];

const INTELLIGENCE: NavItem[] = [{ href: '/inbox', label: 'Inbox', icon: 'inbox' }];

const ACCOUNT: NavItem[] = [
  { href: '/settings', label: 'Settings', icon: 'settings' },
  { href: '/connections', label: 'Connections', icon: 'connections' },
];

export function Sidebar({ kitchenName }: { kitchenName: string }) {
  return (
    <aside className="w-[252px] bg-paper-warm border-r border-rule h-screen sticky top-0 flex flex-col overflow-hidden flex-shrink-0">
      <div className="h-[76px] px-6 border-b border-rule flex items-center flex-shrink-0">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-[0.16em] uppercase text-ink"
        >
          <span>P</span>
          <span className="inline-block w-[6px] h-[6px] bg-gold rounded-full mx-1 relative -top-[3px]" />
          <span>alatable</span>
        </Link>
      </div>

      <div className="px-6 pt-3 pb-1">
        <div className="font-display text-xs font-medium tracking-[0.32em] uppercase text-muted truncate">
          {kitchenName}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        <Section label="Kitchen" items={KITCHEN} />
        <Section label="Intelligence" items={INTELLIGENCE} />
      </nav>

      <div className="border-t border-rule py-2">
        {ACCOUNT.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </div>
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

function NavLink({ href, label, icon }: NavItem) {
  const pathname = usePathname();
  const isActive =
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-6 py-2.5 border-l-2 transition-colors font-display text-xs font-semibold tracking-[0.18em] uppercase ${
        isActive
          ? 'border-l-gold bg-gold-bg text-ink'
          : 'border-l-transparent text-ink-soft hover:border-l-gold/40 hover:bg-gold-bg hover:text-ink'
      }`}
    >
      <NavIcon
        name={icon}
        className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${
          isActive ? 'text-gold' : 'text-muted'
        }`}
      />
      <span className="leading-tight">{label}</span>
    </Link>
  );
}
