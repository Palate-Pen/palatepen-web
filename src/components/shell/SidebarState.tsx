'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const KEY = 'palatable_sidebar_collapsed';

type SidebarState = {
  /** Desktop-only collapsed-to-rail state. Persisted to localStorage. */
  collapsed: boolean;
  toggle: () => void;
  /** Mobile-only drawer-open state. Not persisted. */
  mobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
  hydrated: boolean;
};

const Ctx = createContext<SidebarState>({
  collapsed: false,
  toggle: () => {},
  mobileOpen: false,
  openMobile: () => {},
  closeMobile: () => {},
  hydrated: false,
});

export function SidebarStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored === '1') setCollapsed(true);
    } catch {
      /* localStorage unavailable */
    }
    setHydrated(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(KEY, next ? '1' : '0');
      } catch {}
      return next;
    });
  }

  function openMobile() {
    setMobileOpen(true);
  }
  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <Ctx.Provider
      value={{
        collapsed,
        toggle,
        mobileOpen,
        openMobile,
        closeMobile,
        hydrated,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSidebarState() {
  return useContext(Ctx);
}
