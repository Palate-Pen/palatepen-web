'use client';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { dark, light } from '@/lib/theme';
import { useApp } from './AppContext';

export interface Settings {
  theme: 'dark' | 'light' | 'system';
  fontSize: 'sm' | 'md' | 'lg';
  resolved: 'dark' | 'light';
}

const STORAGE_KEY = 'palatable_settings_v2';
const defaults: Settings = { theme: 'dark', fontSize: 'md', resolved: 'dark' };

const Ctx = createContext<{
  settings: Settings;
  update: (s: Partial<Settings>) => void;
}>({ settings: defaults, update: () => {} });

function resolveTheme(theme: string): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme as 'dark' | 'light';
}

function applyToDOM(s: Settings) {
  if (typeof document === 'undefined') return;
  const C = s.resolved === 'light' ? light : dark;

  const vars: Record<string, string> = {
    '--palatable-bg': C.bg, '--palatable-surface': C.surface, '--palatable-surface2': C.surface2,
    '--palatable-surface3': C.surface3, '--palatable-text': C.text, '--palatable-dim': C.dim,
    '--palatable-faint': C.faint, '--palatable-gold': C.gold, '--palatable-gold-light': C.goldLight,
    '--palatable-gold-dim': C.goldDim, '--palatable-border': C.border,
    '--palatable-border-light': C.borderLight, '--palatable-red': C.red,
    '--palatable-green': C.green, '--palatable-green-light': C.greenLight,
  };
  Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  document.body.style.background = C.bg;
  document.body.style.color = C.text;

  const zooms: Record<string, string> = { sm: '0.9', md: '1', lg: '1.12' };
  const appEl = document.getElementById('palatable-app-root');
  if (appEl) {
    (appEl.style as any).zoom = zooms[s.fontSize] || '1';
  }
}

function loadFromStorage(): Partial<Settings> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveToStorage(s: Settings) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { state, actions } = useApp();
  const [settings, setSettings] = useState<Settings>(defaults);
  const hasAppliedProfileRef = useRef(false);

  // 1. On mount: read from localStorage (instant, per-origin cache).
  useEffect(() => {
    const cached = loadFromStorage();
    if (cached) {
      const next: Settings = { ...defaults, ...cached, resolved: resolveTheme(cached.theme || 'dark') };
      setSettings(next);
      applyToDOM(next);
    } else {
      applyToDOM(defaults);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. When the user's profile loads from Supabase, prefer profile.uiSettings
  //    over the local cache. This makes settings roam across devices/origins.
  //    Only apply once per app load to avoid overwriting in-flight edits.
  useEffect(() => {
    if (!state.ready || hasAppliedProfileRef.current) return;
    const cloud = state.profile?.uiSettings;
    if (cloud && (cloud.theme || cloud.fontSize)) {
      const next: Settings = {
        theme: cloud.theme || settings.theme,
        fontSize: cloud.fontSize || settings.fontSize,
        resolved: resolveTheme(cloud.theme || settings.theme),
      };
      setSettings(next);
      applyToDOM(next);
      saveToStorage(next);
    }
    hasAppliedProfileRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ready, state.profile?.uiSettings]);

  function update(partial: Partial<Settings>) {
    setSettings(prev => {
      const next: Settings = { ...prev, ...partial };
      next.resolved = resolveTheme(next.theme);
      saveToStorage(next);
      applyToDOM(next);
      // Persist to user_data.profile.uiSettings so it roams across devices.
      if (state.ready && actions?.updProfile) {
        actions.updProfile({ uiSettings: { theme: next.theme, fontSize: next.fontSize } });
      }
      return next;
    });
  }

  return <Ctx.Provider value={{ settings, update }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
