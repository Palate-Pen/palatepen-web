'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { dark, light } from '@/lib/theme';

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

  // Apply zoom to scale all hardcoded pixel values proportionally
  const zooms: Record<string, string> = { sm: '0.9', md: '1', lg: '1.12' };
  const appEl = document.getElementById('palatable-app-root');
  if (appEl) {
    (appEl.style as any).zoom = zooms[s.fontSize] || '1';
  }
}

function loadFromStorage(): Settings {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    const resolved = resolveTheme(parsed.theme || 'dark');
    return { ...defaults, ...parsed, resolved };
  } catch { return defaults; }
}

function saveToStorage(s: Settings) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaults);

  useEffect(() => {
    const loaded = loadFromStorage();
    setSettings(loaded);
    applyToDOM(loaded);
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