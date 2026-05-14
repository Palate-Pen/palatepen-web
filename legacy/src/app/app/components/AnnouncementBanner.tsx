'use client';
import { useEffect, useState } from 'react';

// Fetches the platform-wide announcement from /api/platform-config and renders
// it as a sticky banner at the top of the app. Dismissible state is kept in
// localStorage keyed by the announcement text — when the founder changes the
// text, the dismiss resets and the user sees it again.

type Level = 'info' | 'warning' | 'critical';
interface Announcement { active: boolean; text: string; level?: Level; dismissible?: boolean; }

const PALETTES: Record<Level, { bg: string; fg: string; border: string }> = {
  info:     { bg: '#1F2A3A', fg: '#D4E4FF', border: '#3A5A8A' },
  warning:  { bg: '#3A2814', fg: '#FFD89A', border: '#A07020' },
  critical: { bg: '#3A1414', fg: '#FFB0B0', border: '#A03030' },
};

export default function AnnouncementBanner() {
  const [ann, setAnn] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/platform-config', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        const a = json.announcement as Announcement | undefined;
        if (a && a.active && a.text) {
          setAnn(a);
          // Each text gets its own dismiss key — new message = fresh banner
          const key = `palatable_ann_dismissed_${hashText(a.text)}`;
          if (typeof window !== 'undefined' && a.dismissible !== false) {
            setDismissed(window.localStorage.getItem(key) === '1');
          }
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  if (!ann || !ann.active || !ann.text || dismissed) return null;
  const palette = PALETTES[ann.level || 'info'];

  function dismiss() {
    setDismissed(true);
    try {
      const key = `palatable_ann_dismissed_${hashText(ann!.text)}`;
      window.localStorage.setItem(key, '1');
    } catch {}
  }

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 35,
      background: palette.bg, color: palette.fg,
      borderBottom: '1px solid ' + palette.border,
      padding: '10px 16px',
      display: 'flex', alignItems: 'center', gap: '12px',
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', lineHeight: 1.5,
    }}>
      <span style={{ flexShrink: 0, fontWeight: 700 }}>
        {ann.level === 'critical' ? '⚠' : ann.level === 'warning' ? '!' : 'ℹ'}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>{ann.text}</span>
      {ann.dismissible !== false && (
        <button onClick={dismiss}
          aria-label="Dismiss"
          style={{ flexShrink: 0, background: 'transparent', border: 'none', color: palette.fg, fontSize: '18px', cursor: 'pointer', padding: '0 4px', opacity: 0.7 }}>
          ×
        </button>
      )}
    </div>
  );
}

// Small non-crypto hash for namespacing the dismiss flag per message text
function hashText(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
