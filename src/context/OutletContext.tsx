'use client';
// Thin facade over AuthContext, which already manages the outlets list,
// activeOutletId, localStorage persistence, and cross-tab sync (see
// src/context/AuthContext.tsx). This file exists so view code can
// `import { useOutlet } from '@/context/OutletContext'` and get a
// focused API surface that's easy to grep for when wiring data scoping.
//
// IMPORTANT: AuthProvider must be higher in the React tree than this
// provider. OutletProvider takes no props — the data flows in from
// useAuth automatically. The accountId/tier props in the original spec
// were a way to seed state; here the auth context already has them, so
// duplicating state would just race against AuthContext's localStorage
// writer. One source of truth wins.

import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';
import type { Outlet } from '@/types/outlets';

interface OutletContextValue {
  activeOutletId: string | null;
  setActiveOutletId: (id: string | null) => void;
  outlets: Outlet[];
  refreshOutlets: () => Promise<void>;
  /** Convenience — true only when the current tier supports multi-outlet. */
  isMultiOutlet: boolean;
}

const OutletContext = createContext<OutletContextValue>({
  activeOutletId: null,
  setActiveOutletId: () => {},
  outlets: [],
  refreshOutlets: async () => {},
  isMultiOutlet: false,
});

export function OutletProvider({ children }: { children: React.ReactNode }) {
  const { outlets, activeOutletId, setActiveOutlet, refreshOutlets, tier } = useAuth();
  const isMultiOutlet = tier === 'group' || tier === 'enterprise';
  return (
    <OutletContext.Provider value={{
      activeOutletId,
      setActiveOutletId: setActiveOutlet,
      outlets,
      refreshOutlets,
      isMultiOutlet,
    }}>
      {children}
    </OutletContext.Provider>
  );
}

export const useOutlet = () => useContext(OutletContext);
