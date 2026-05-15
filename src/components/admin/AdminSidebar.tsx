'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebarState } from '@/components/shell/SidebarState';

type NavItem = {
  href: string;
  label: string;
  badge?: string;
  icon: React.ReactNode;
};

// Inline admin-specific icons. Separate from chef NavIcons since the
// vocabulary doesn't overlap (Users / Business / System / Content / Ops
// don't have chef-shell analogues). Same 24x24 viewBox + 1.5 stroke as
// chef NavIcons so they render at identical visual weight.
const ICON_HOME = (
  <>
    <path d="M3 11l9-8 9 8M5 10v10h14V10" />
    <path d="M10 20v-6h4v6" />
  </>
);
const ICON_USERS = (
  <>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 21v-1a6 6 0 0 1 12 0v1" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M15 21v-1a4 4 0 0 1 7 0v1" />
  </>
);
const ICON_BUSINESS = (
  <>
    <path d="M3 20h18" />
    <rect x="5" y="13" width="3" height="7" />
    <rect x="11" y="8" width="3" height="12" />
    <rect x="17" y="4" width="3" height="16" />
  </>
);
const ICON_SYSTEM = (
  <>
    <path d="M3 12h4l2-6 4 12 2-6h6" />
  </>
);
const ICON_CONTENT = (
  <>
    <path d="M4 19V5l9 4 9-4v14" />
    <path d="M13 9v10" />
  </>
);
const ICON_OPS = (
  <>
    <path d="M5 4v17" />
    <path d="M5 4h11l3 5-3 5H5" />
  </>
);

const OVERVIEW: NavItem[] = [{ href: '/admin', label: 'Home', icon: ICON_HOME }];

function buildDomains(
  kitchenBadge?: string,
  opsBadge?: string,
): NavItem[] {
  return [
    { href: '/admin/users', label: 'Users & Kitchens', icon: ICON_USERS, badge: kitchenBadge },
    { href: '/admin/business', label: 'Business', icon: ICON_BUSINESS },
    { href: '/admin/system', label: 'System Health', icon: ICON_SYSTEM },
    { href: '/admin/content', label: 'Content & Comms', icon: ICON_CONTENT },
    { href: '/admin/ops', label: 'Founder Ops', icon: ICON_OPS, badge: opsBadge },
  ];
}

export function AdminSidebar({
  kitchenBadge,
  opsBadge,
}: {
  kitchenBadge?: string;
  opsBadge?: string;
}) {
  const { collapsed, mobileOpen, closeMobile } = useSidebarState();
  const pathname = usePathname();
  const domains = buildDomains(kitchenBadge, opsBadge);

  // Close the mobile drawer whenever the route changes (chef clicks a link).
  useEffect(() => {
    if (mobileOpen) closeMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Sidebar widths scale with --font-scale so labels don't crush at
  // Large → XL → XXL.
  const widthClass = collapsed
    ? 'lg:w-[calc(72px*var(--font-scale))]'
    : 'lg:w-[calc(252px*var(--font-scale))]';
  const mobilePositioning = mobileOpen
    ? 'translate-x-0'
    : '-translate-x-full lg:translate-x-0';

  return (
    <>
      {/* Mobile backdrop — tap-to-close. */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={closeMobile}
        className={
          'fixed inset-0 z-30 bg-ink/40 lg:hidden transition-opacity duration-200 ' +
          (mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none')
        }
      />

      <aside
        className={
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-[calc(260px*var(--font-scale))] ' +
          widthClass +
          ' ' +
          mobilePositioning +
          ' bg-paper-warm border-r border-rule flex flex-col overflow-hidden flex-shrink-0 transition-[transform,width] duration-200'
        }
      >
        <div
          className={`h-[76px] border-b border-rule flex items-center flex-shrink-0 ${
            collapsed ? 'lg:px-0 lg:justify-center px-6' : 'px-6'
          }`}
        >
          <Link
            href="/admin"
            // Logo locked at 24px — does NOT scale with --font-scale.
            className="font-display font-semibold tracking-[0.16em] uppercase text-ink"
            style={{ fontSize: '24px' }}
            aria-label="Palatable Founder Admin"
          >
            <span>P</span>
            <span className="inline-block w-[6px] h-[6px] bg-gold rounded-full mx-1 relative -top-[3px]" />
            {!collapsed && <span>alatable</span>}
            {collapsed && <span className="lg:hidden">alatable</span>}
          </Link>
        </div>

        <div className={'px-6 pt-3 pb-1 ' + (collapsed ? 'lg:hidden' : '')}>
          <div className="font-display text-xs font-medium tracking-[0.32em] uppercase text-muted truncate">
            Founder Admin
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          <Section label="Overview" items={OVERVIEW} collapsed={collapsed} />
          <Section label="Domains" items={domains} collapsed={collapsed} />
        </nav>
      </aside>
    </>
  );
}

function Section({
  label,
  items,
  collapsed,
}: {
  label: string;
  items: NavItem[];
  collapsed: boolean;
}) {
  return (
    <div>
      {!collapsed && (
        <div className="font-display text-xs font-semibold tracking-[0.4em] uppercase text-muted-soft pt-3.5 pb-1.5 px-6">
          {label}
        </div>
      )}
      {items.map((item) => (
        <NavLink key={item.href} {...item} collapsed={collapsed} />
      ))}
    </div>
  );
}

function NavLink({
  href,
  label,
  icon,
  badge,
  collapsed,
}: NavItem & { collapsed: boolean }) {
  const pathname = usePathname();
  const isActive =
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`flex items-center transition-colors font-display text-xs font-semibold tracking-[0.18em] uppercase border-l-2 relative ${
        collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-6 py-2.5'
      } ${
        isActive
          ? 'border-l-gold bg-gold-bg text-ink'
          : 'border-l-transparent text-ink-soft hover:border-l-gold/40 hover:bg-gold-bg hover:text-ink'
      }`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`flex-shrink-0 transition-colors ${
          isActive ? 'text-gold' : 'text-muted'
        }`}
      >
        {icon}
      </svg>
      {!collapsed && (
        <span className="leading-tight flex-1">{label}</span>
      )}
      {badge && !collapsed && (
        <span
          className={`font-display text-xs font-semibold px-1.5 py-0.5 min-w-[20px] text-center leading-none ${
            isActive
              ? 'bg-gold text-paper'
              : 'bg-transparent border border-rule text-muted'
          }`}
        >
          {badge}
        </span>
      )}
      {badge && collapsed && (
        <span
          className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-gold"
          aria-label={`${badge} new`}
        />
      )}
    </Link>
  );
}
