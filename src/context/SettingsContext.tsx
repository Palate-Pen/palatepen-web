'use client';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { dark, light } from '@/lib/theme';

export interface Settings {
  theme: 'dark' | 'light' | 'system';
  fontSize: 'sm' | 'md' | 'lg';
  resolved: 'dark' | 'light';
}

const STORAGE_KEY = 'mise_settings_v2';
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
    '--mise-bg': C.bg, '--mise-surface': C.surface, '--mise-surface2': C.surface2,
    '--mise-surface3': C.surface3, '--mise-text': C.text, '--mise-dim': C.dim,
    '--mise-faint': C.faint, '--mise-gold': C.gold, '--mise-gold-light': C.goldLight,
    '--mise-gold-dim': C.goldDim, '--mise-border': C.border,
    '--mise-border-light': C.borderLight, '--mise-red': C.red,
    '--mise-green': C.green, '--mise-green-light': C.greenLight,
  };
  Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  document.body.style.background = C.bg;
  document.body.style.color = C.text;
  const sizes: Record<string, string> = { sm: '12px', md: '14px', lg: '16px' };
  document.body.style.fontSize = sizes[s.fontSize] || '14px';
}

function loadFromStorage(): Settings {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    const resolved = resolveTheme(parsed.theme || 'dark');
    return { ...defaults, ...parsed, resolved };
  } catch {
    return defaults;
  }
}

function saveToStorage(s: Settings) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // Initialise synchronously from localStorage to avoid flash
  const [settings, setSettings] = useState<Settings>(() => {
    const loaded = loadFromStorage();
    return loaded;
  });
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      const loaded = loadFromStorage();
      setSettings(loaded);
      applyToDOM(loaded);
    }
  }, []);

  function update(partial: Partial<Settings>) {
    setSettings(prev => {
      const next: Settings = { ...prev, ...partial };
      next.resolved = resolveTheme(next.theme);
      saveToStorage(next);
      applyToDOM(next);
      return next;
    });
  }

  return <Ctx.Provider value={{ settings, update }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);