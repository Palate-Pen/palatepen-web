'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
type FontSize = 'lg' | 'xl' | 'xxl';

const THEME_KEY = 'palatable_theme';
const FONT_KEY = 'palatable_font_size';

// Three-step accessibility scale. "Large" is the new floor (was the
// previous top end before the 2026-05-15 readability push); xl + xxl
// keep adding ~12.5% each, useful for service-floor reading at
// arm's length or older eyes. The html base is 17px, so effective
// pixel sizes are lg≈19px / xl≈21px / xxl≈24px for body copy.
const SCALE: Record<FontSize, string> = {
  lg: '1.12',
  xl: '1.26',
  xxl: '1.4',
};

const LEGACY_FONT_SIZE_MAP: Record<string, FontSize> = {
  sm: 'lg',
  md: 'lg',
  lg: 'lg',
  xl: 'xl',
  xxl: 'xxl',
};

function migrateFontSize(raw: string | null): FontSize {
  if (!raw) return 'lg';
  return LEGACY_FONT_SIZE_MAP[raw] ?? 'lg';
}

function resolveTheme(t: Theme): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  if (t === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return t;
}

function applyTheme(t: Theme) {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(t);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

function applyFontSize(f: FontSize) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--font-scale', SCALE[f]);
}

export function AccessibilitySettings() {
  const [theme, setTheme] = useState<Theme>('light');
  const [fontSize, setFontSize] = useState<FontSize>('lg');
  const [ready, setReady] = useState(false);

  // Read persisted values on mount (the boot script already applied them
  // pre-hydration; this just syncs our React state). Legacy 'sm' / 'md'
  // values from before the 2026-05-15 readability floor migrate to 'lg'.
  useEffect(() => {
    try {
      const t = (localStorage.getItem(THEME_KEY) as Theme) || 'light';
      const f = migrateFontSize(localStorage.getItem(FONT_KEY));
      setTheme(t);
      setFontSize(f);
      // Persist migration if the stored value was legacy
      const stored = localStorage.getItem(FONT_KEY);
      if (stored !== f) localStorage.setItem(FONT_KEY, f);
    } catch {
      // localStorage unavailable; defaults stay
    }
    setReady(true);
  }, []);

  // Re-evaluate system theme when the OS preference changes.
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  function chooseTheme(next: Theme) {
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
    applyTheme(next);
  }

  function chooseFontSize(next: FontSize) {
    setFontSize(next);
    try {
      localStorage.setItem(FONT_KEY, next);
    } catch {}
    applyFontSize(next);
  }

  const themes: { id: Theme; label: string }[] = [
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
    { id: 'system', label: 'System' },
  ];

  const sizes: { id: FontSize; label: string; previewPx: number }[] = [
    { id: 'lg', label: 'Large', previewPx: 19 },
    { id: 'xl', label: 'XL', previewPx: 22 },
    { id: 'xxl', label: 'XXL', previewPx: 26 },
  ];

  return (
    <div className="bg-card border border-rule mb-6">
      <div className="px-7 py-5 border-b border-rule font-display font-semibold text-xs tracking-[0.3em] uppercase text-ink">
        Accessibility
      </div>

      <div className="px-7 py-5 border-b border-rule">
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted mb-3">
          Theme
        </div>
        <div className="flex gap-2">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => chooseTheme(t.id)}
              disabled={!ready}
              className={
                'flex-1 py-3 font-sans font-semibold text-xs tracking-[0.08em] uppercase border transition-colors ' +
                (theme === t.id
                  ? 'bg-gold/15 border-gold text-gold'
                  : 'bg-transparent border-rule text-ink-soft hover:border-gold hover:text-ink')
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="font-serif italic text-xs text-muted mt-3">
          {theme === 'system'
            ? "Tracks your device's preference. Switches automatically when you change OS settings."
            : `Locked to ${theme}.`}
        </p>
      </div>

      <div className="px-7 py-5">
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted mb-3">
          Text Size
        </div>
        <div className="flex gap-2">
          {sizes.map((s) => (
            <button
              key={s.id}
              onClick={() => chooseFontSize(s.id)}
              disabled={!ready}
              className={
                'flex-1 py-3 flex flex-col items-center gap-1 border transition-colors ' +
                (fontSize === s.id
                  ? 'bg-gold/15 border-gold text-gold'
                  : 'bg-transparent border-rule text-ink-soft hover:border-gold hover:text-ink')
              }
            >
              <span
                className="font-serif"
                style={{ fontSize: `${s.previewPx}px` }}
              >
                Aa
              </span>
              <span className="font-sans font-semibold text-xs tracking-[0.08em] uppercase">
                {s.label}
              </span>
            </button>
          ))}
        </div>
        <p className="font-serif italic text-xs text-muted mt-3">
          Scales every text on every surface. Useful for service-floor reading at arm's length.
        </p>
      </div>
    </div>
  );
}
