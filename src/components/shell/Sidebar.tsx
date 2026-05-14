'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { NavIcon, type NavIconName } from './NavIcons';
import { useSidebarState } from './SidebarState';

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  /** Pending tabs render muted and disabled. */
  pending?: boolean;
};

export type NavSection = { label: string; items: NavItem[] };

/**
 * Generic sidebar used by every shell. Chef / Manager / Owner each pass
 * their own section configuration. Visual treatment + mobile drawer +
 * desktop collapse-to-rail all stay consistent.
 */
export function Sidebar({
  brand,
  surfaceTag,
  homeHref = '/',
  sections,
  accountItems = [],
}: {
  /** Kitchen name or business name shown under the brand mark. */
  brand: string;
  /** Optional eyebrow above the brand — e.g. "Manager", "Owner". */
  surfaceTag?: string;
  /** Where the Palatable brand mark links to (defaults to chef Home). */
  homeHref?: string;
  sections: NavSection[];
  accountItems?: NavItem[];
}) {
  const { collapsed, mobileOpen, closeMobile } = useSidebarState();
  const pathname = usePathname();

  useEffect(() => {
    if (mobileOpen) closeMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const widthClass = collapsed ? 'lg:w-[72px]' : 'lg:w-[252px]';
  const mobilePositioning = mobileOpen
    ? 'translate-x-0'
    : '-translate-x-full lg:translate-x-0';

  return (
    <>
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
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-[260px] ' +
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
            href={homeHref}
            className="font-display text-xl font-semibold tracking-[0.16em] uppercase text-ink"
            aria-label="Palatable"
          >
            <span>P</span>
            <span className="inline-block w-[6px] h-[6px] bg-gold rounded-full mx-1 relative -top-[3px]" />
            {!collapsed && <span>alatable</span>}
            {collapsed && <span className="lg:hidden">alatable</span>}
          </Link>
        </div>

        <div
          className={'px-6 pt-3 pb-1 ' + (collapsed ? 'lg:hidden' : '')}
        >
          {surfaceTag && (
            <div className="font-display text-[10px] font-semibold tracking-[0.4em] uppercase text-gold mb-1">
              {surfaceTag}
            </div>
          )}
          <div className="font-display text-xs font-medium tracking-[0.32em] uppercase text-muted truncate">
            {brand}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {sections.map((s) => (
            <Section key={s.label} section={s} collapsed={collapsed} />
          ))}
        </nav>

        {accountItems.length > 0 && (
          <div className="border-t border-rule py-2">
            {accountItems.map((item) => (
              <NavLink key={item.href} item={item} collapsed={collapsed} />
            ))}
          </div>
        )}
      </aside>
    </>
  );
}

function Section({
  section,
  collapsed,
}: {
  section: NavSection;
  collapsed: boolean;
}) {
  return (
    <div>
      <div
        className={
          'font-display text-xs font-semibold tracking-[0.4em] uppercase text-muted-soft pt-3.5 pb-1.5 px-6 ' +
          (collapsed ? 'lg:hidden' : '')
        }
      >
        {section.label}
      </div>
      {section.items.map((item) => (
        <NavLink key={item.href} item={item} collapsed={collapsed} />
      ))}
    </div>
  );
}

function NavLink({
  item,
  collapsed,
}: {
  item: NavItem;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const isActive =
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

  if (item.pending) {
    return (
      <div
        title={collapsed ? `${item.label} (pending)` : 'Pending design'}
        aria-disabled="true"
        className={
          'flex items-center font-display text-xs font-semibold tracking-[0.18em] uppercase border-l-2 border-l-transparent text-muted-soft cursor-not-allowed opacity-60 ' +
          (collapsed
            ? 'lg:justify-center lg:px-0 lg:py-3 gap-3 px-6 py-2.5'
            : 'gap-3 px-6 py-2.5')
        }
      >
        <NavIcon
          name={item.icon}
          className="w-[18px] h-[18px] flex-shrink-0 text-muted-soft"
        />
        <span className={'leading-tight ' + (collapsed ? 'lg:hidden' : '')}>
          {item.label}
        </span>
        <span
          className={
            'font-display text-[8px] tracking-[0.18em] uppercase text-muted-soft ml-auto ' +
            (collapsed ? 'lg:hidden' : '')
          }
        >
          soon
        </span>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={`flex items-center transition-colors font-display text-xs font-semibold tracking-[0.18em] uppercase border-l-2 group relative ${
        collapsed
          ? 'lg:justify-center lg:px-0 lg:py-3 gap-3 px-6 py-2.5'
          : 'gap-3 px-6 py-2.5'
      } ${
        isActive
          ? 'border-l-gold bg-gold-bg text-ink'
          : 'border-l-transparent text-ink-soft hover:border-l-gold/40 hover:bg-gold-bg hover:text-ink'
      }`}
    >
      <NavIcon
        name={item.icon}
        className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${
          isActive ? 'text-gold' : 'text-muted'
        }`}
      />
      <span className={'leading-tight ' + (collapsed ? 'lg:hidden' : '')}>
        {item.label}
      </span>
    </Link>
  );
}
