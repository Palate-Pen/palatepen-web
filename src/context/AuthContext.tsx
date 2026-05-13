'use client';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

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
  signIn: (e: string, p: string) => Promise<void>;
  signUp: (e: string, p: string, n: string, opts?: { skipPersonal?: boolean }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthCtxType | null>(null);
const ACTIVE_ACCOUNT_KEY = 'palatable_active_account_id';

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

  // Re-read accounts on tab focus. Admin edits in the founder console mirror
  // to the accounts table, but the app loads accounts exactly once per
  // user.id change — so without a focus refresh, a user with the app open
  // wouldn't see a tier upgrade until they signed out. Cheap (one PostgREST
  // round-trip) and matches the React Query refetchOnFocus default.
  useEffect(() => {
    if (!user?.id) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadAccounts(user.id);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user?.id, loadAccounts]);

  const switchAccount = (id: string) => {
    if (!accounts.some(m => m.account.id === id)) return;
    setCurrentAccountId(id);
    try { window.localStorage.setItem(ACTIVE_ACCOUNT_KEY, id); } catch {}
  };

  const refreshAccounts = async () => {
    if (user?.id) await loadAccounts(user.id);
  };

  const currentMembership = accounts.find(m => m.account.id === currentAccountId) || null;
  const currentAccount = currentMembership?.account || null;
  const currentRole = currentMembership?.role || null;
  const tier = currentAccount?.tier || user?.user_metadata?.tier || 'free';

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
    try { window.localStorage.removeItem(ACTIVE_ACCOUNT_KEY); } catch {}
    await supabase.auth.signOut();
  }

  return (
    <AuthCtx.Provider value={{
      user, loading, tier,
      accounts, currentAccount, currentRole,
      switchAccount, refreshAccounts,
      signIn, signUp, signOut,
    }}>{children}</AuthCtx.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
};
