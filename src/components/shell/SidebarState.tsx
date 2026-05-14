'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const KEY = 'palatable_sidebar_collapsed';

type SidebarState = {
  collapsed: boolean;
  toggle: () => void;
  hydrated: boolean;
};

const Ctx = createContext<SidebarState>({
  collapsed: false,
  toggle: () => {},
  hydrated: false,
});

export function SidebarStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Read persisted state on mount. There is a brief frame where the
  // sidebar renders expanded then snaps to collapsed if the user has
  // it stored that way — acceptable for v1; a no-FOUC pre-hydration
  // script would be a follow-up if it becomes annoying.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored === '1') setCollapsed(true);
    } catch {
      // localStorage unavailable
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

  return (
    <Ctx.Provider value={{ collapsed, toggle, hydrated }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSidebarState() {
  return useContext(Ctx);
}
