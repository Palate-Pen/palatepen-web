'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { dark, light } from '@/lib/theme';

interface Settings {
  theme: 'dark' | 'light' | 'system';
  fontSize: 'sm' | 'md' | 'lg';
  resolved: 'dark' | 'light';
}

const defaults: Settings = { theme: 'dark', fontSize: 'md', resolved: 'dark' };

const Ctx = createContext<{
  settings: Settings;
  update: (s: Partial<Settings>) => void;
}>({ settings: defaults, update: () => {} });

function resolveTheme(theme: string): 'dark' | 'light' {
  if (theme === 'system') {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme as 'dark' | 'light';
}

function applyToDOM(settings: Settings) {
  if (typeof document === 'undefined') return;
  const C = settings.resolved === 'light' ? light : dark;

  // Apply colours
  const vars: Record<string, string> = {
    '--mise-bg': C.bg, '--mise-surface': C.surface, '--mise-surface2': C.surface2,
    '--mise-surface3': C.surface3, '--mise-text': C.text, '--mise-dim': C.dim,
    '--mise-faint': C.faint, '--mise-gold': C.gold, '--mise-gold-light': C.goldLight,
    '--mise-gold-dim': C.goldDim, '--mise-border': C.border, '--mise-border-light': C.borderLight,
    '--mise-red': C.red, '--mise-green': C.green, '--mise-green-light': C.greenLight,
  };
  Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));

  // Apply background and text colour directly for instant feedback
  document.body.style.background = C.bg;
  document.body.style.color = C.text;

  // Apply font size via body class — this scales all relative font sizes
  document.body.classList.remove('font-sm', 'font-md', 'font-lg');
  document.body.classList.add('font-' + settings.fontSize);

  // Also set font-size directly on body for components that use em/rem
  const sizes = { sm: '12px', md: '14px', lg: '16px' };
  document.body.style.fontSize = sizes[settings.fontSize];
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaults);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mise_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        const resolved = resolveTheme(parsed.theme || 'dark');
        const next = { ...defaults, ...parsed, resolved };
        setSettings(next);
        applyToDOM(next);
      } else {
        applyToDOM(defaults);
      }
    } catch {
      applyToDOM(defaults);
    }
  }, []);

  function update(s: Partial<Settings>) {
    setSettings(prev => {
      const next = { ...prev, ...s };
      next.resolved = resolveTheme(next.theme);
      try { localStorage.setItem('mise_settings', JSON.stringify(next)); } catch {}
      applyToDOM(next);
      return next;
    });
  }

  return <Ctx.Provider value={{ settings, update }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);