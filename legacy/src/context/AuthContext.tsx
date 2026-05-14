'use client';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { isAdminEmail } from '@/lib/adminEmails';
import { getOutlets } from '@/lib/outlets';
import type { Outlet } from '@/types/outlets';

export type Role = 'owner' | 'manager' | 'chef' | 'viewer';
export interface Account {
  id: string;
  name: string;
  owner_user_id: string;
  tier: 'free' | 'pro' | 'kitchen' | 'group' | 'enterprise';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}
export interface Membership { account: Account; role: Role; }

interface AuthCtxType {
  user: User | null;
  loading: boolean;
  tier: string;
  accounts: Membership[];
  currentAccount: Account | null;
  currentRole: Role | null;
  switchAccount: (id: string) => void;
  refreshAccounts: () => Promise<void>;
  // Phase 3 multi-outlet — only relevant on Group/Enterprise tiers.
  // On other tiers `outlets` stays empty and `activeOutletId` is null.
  outlets: Outlet[];
  activeOutletId: string | null;
  setActiveOutlet: (id: string | null) => void;
  refreshOutlets: () => Promise<void>;
  signIn: (e: string, p: string) => Promise<void>;
  signUp: (e: string, p: string, n: string, opts?: { skipPersonal?: boolean }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthCtxType | null>(null);
const ACTIVE_ACCOUNT_KEY = 'palatable_active_account_id';
const ACTIVE_OUTLET_KEY = 'palatable_active_outlet';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Membership[]>([]);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);

  // Auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load accounts when the user_id changes (NOT on every auth event — token
  // refresh swaps the user object reference, which would otherwise re-run).
  const loadAccounts = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('account_members')
      .select('role, account:accounts(*)')
      .eq('user_id', uid);
    if (error) {
      console.error('[accounts load]', error.code, error.message);
      return;
    }
    const list: Membership[] = (data || [])
      .map((r: any) => ({ role: r.role as Role, account: r.account as Account }))
      .filter((m: Membership) => !!m.account);
    setAccounts(list);

    // Pick current: stored if still a member, else first owned, else first.
    let pick: string | null = null;
    try {
      const stored = window.localStorage.getItem(ACTIVE_ACCOUNT_KEY);
      if (stored && list.some(m => m.account.id === stored)) pick = stored;
    } catch {}
    if (!pick) pick = list.find(m => m.role === 'owner')?.account.id || list[0]?.account.id || null;
    setCurrentAccountId(pick);
  }, []);

  useEffect(() => {
    if (!user?.id) { setAccounts([]); setCurrentAccountId(null); return; }
    loadAccounts(user.id);
  }, [user?.id, loadAccounts]);

  // Ref that always points at the latest currentAccountId — read by the
  // visibility listener below so it can pick up the active id at fire time
  // without re-binding every account switch.
  const currentAccountIdRef = useRef<string | null>(null);
  useEffect(() => { currentAccountIdRef.current = currentAccountId; }, [currentAccountId]);

  const switchAccount = (id: string) => {
    if (!accounts.some(m => m.account.id === id)) return;
    setCurrentAccountId(id);
    try { window.localStorage.setItem(ACTIVE_ACCOUNT_KEY, id); } catch {}
  };

  const refreshAccounts = async () => {
    if (user?.id) await loadAccounts(user.id);
  };

  // ── Phase 3 multi-outlet ──────────────────────────────────
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [activeOutletId, setActiveOutletIdState] = useState<string | null>(null);

  const loadOutlets = useCallback(async (accountId: string) => {
    const list = await getOutlets(accountId);
    setOutlets(list);
    // Reconcile active outlet against the new list — if the persisted id
    // isn't in this account's outlets, fall back to the first one.
    let pick: string | null = null;
    try {
      const stored = window.localStorage.getItem(ACTIVE_OUTLET_KEY);
      if (stored && list.some(o => o.id === stored)) pick = stored;
    } catch {}
    if (!pick && list.length > 0) pick = list[0].id;
    setActiveOutletIdState(pick);
    if (pick) {
      try { window.localStorage.setItem(ACTIVE_OUTLET_KEY, pick); } catch {}
    }
  }, []);

  // (Re)load outlets whenever currentAccount changes. Skipped for tiers
  // that don't use multi-outlet — saves a network round-trip per account
  // switch for the 90% of users on Pro / Kitchen.
  const currentMembershipPre = accounts.find(m => m.account.id === currentAccountId) || null;
  const currentAccountPre = currentMembershipPre?.account || null;
  const tierForOutlets = isAdminEmail(user?.email)
    ? 'enterprise'
    : (currentAccountPre?.tier || user?.user_metadata?.tier || 'free');

  useEffect(() => {
    if (!currentAccountId) { setOutlets([]); setActiveOutletIdState(null); return; }
    if (tierForOutlets !== 'group' && tierForOutlets !== 'enterprise') {
      setOutlets([]); setActiveOutletIdState(null); return;
    }
    loadOutlets(currentAccountId);
  }, [currentAccountId, tierForOutlets, loadOutlets]);

  const setActiveOutlet = (id: string | null) => {
    if (id && !outlets.some(o => o.id === id)) return;
    setActiveOutletIdState(id);
    try {
      if (id) window.localStorage.setItem(ACTIVE_OUTLET_KEY, id);
      else window.localStorage.removeItem(ACTIVE_OUTLET_KEY);
    } catch {}
  };

  const refreshOutlets = async () => {
    if (currentAccountId && (tierForOutlets === 'group' || tierForOutlets === 'enterprise')) {
      await loadOutlets(currentAccountId);
    }
  };

  // Cross-tab sync — when another tab writes to localStorage we want this
  // tab's active outlet to follow along so the user sees the same scoping
  // everywhere.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== ACTIVE_OUTLET_KEY) return;
      const next = e.newValue;
      if (next === null) { setActiveOutletIdState(null); return; }
      if (outlets.some(o => o.id === next)) setActiveOutletIdState(next);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [outlets]);

  // Re-read accounts AND outlets on tab focus. Admin edits in the founder
  // console (tier changes, Seed Showcase) and outlet edits from Settings
  // need to be visible as soon as the user tabs back to the app, without
  // requiring a sign-out / full reload. Cheap (two PostgREST round-trips)
  // and matches the React Query refetchOnFocus default.
  useEffect(() => {
    if (!user?.id) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      loadAccounts(user.id);
      const acct = currentAccountIdRef.current;
      if (acct) loadOutlets(acct);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user?.id, loadAccounts, loadOutlets]);

  const currentMembership = accounts.find(m => m.account.id === currentAccountId) || null;
  const currentAccount = currentMembership?.account || null;
  const currentRole = currentMembership?.role || null;
  // Admin/operator emails get an enterprise tier read regardless of what
  // their stored account.tier or user_metadata.tier says — see
  // src/lib/adminEmails.ts. Everywhere downstream that reads useAuth().tier
  // sees the override automatically (canAccess, useTierAndFlag, sidebar
  // badges, etc).
  const tier = isAdminEmail(user?.email)
    ? 'enterprise'
    : (currentAccount?.tier || user?.user_metadata?.tier || 'free');

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }
  async function signUp(email: string, password: string, name: string, opts?: { skipPersonal?: boolean }) {
    const meta: Record<string, string> = { name, tier: 'free' };
    if (opts?.skipPersonal) meta.skipPersonal = 'true';
    const { error } = await supabase.auth.signUp({ email, password, options: { data: meta } });
    if (error) throw error;
  }
  async function signOut() {
    try {
      window.localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
      window.localStorage.removeItem(ACTIVE_OUTLET_KEY);
    } catch {}
    await supabase.auth.signOut();
  }

  return (
    <AuthCtx.Provider value={{
      user, loading, tier,
      accounts, currentAccount, currentRole,
      switchAccount, refreshAccounts,
      outlets, activeOutletId, setActiveOutlet, refreshOutlets,
      signIn, signUp, signOut,
    }}>{children}</AuthCtx.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
};
