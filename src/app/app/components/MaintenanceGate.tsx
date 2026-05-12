'use client';
import { useEffect, useState } from 'react';

// Wraps the entire /app surface and gates rendering when platform maintenance
// mode is active. Fetches /api/platform-config on mount. Fail-OPEN — if the
// fetch errors we render the children rather than locking everyone out.

interface MaintenanceState { active: boolean; message?: string; }

const DEFAULT_FUNNY = "We're in the kitchen — back shortly.";

export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<'loading' | 'open' | 'maintenance'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch('/api/platform-config', { cache: 'no-store' });
        if (!res.ok) throw new Error('config fetch failed');
        const json = await res.json();
        if (cancelled) return;
        const m: MaintenanceState = json.maintenance || { active: false };
        if (m.active) {
          setMessage((m.message || '').trim() || DEFAULT_FUNNY);
          setPhase('maintenance');
        } else {
          setPhase('open');
        }
      } catch {
        // Fail open — better to let the app run than to lock everyone out on a
        // transient config-fetch error.
        if (!cancelled) setPhase('open');
      }
    }
    check();
    // Re-check periodically — if maintenance is lifted, users get back in
    // without a manual refresh. Every 30s.
    const t = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  if (phase === 'loading') {
    // Brief blank to avoid flashing the app then immediately replacing it
    return <div style={{ minHeight: '100vh', background: '#0E0C0A' }} />;
  }
  if (phase === 'maintenance') return <MaintenancePage message={message} />;
  return <>{children}</>;
}

function MaintenancePage({ message }: { message: string }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#FAF7F2', color: '#1A1A18',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 520, width: '100%' }}>
        {/* Palatable wordmark */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 36 }}>
          <span style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontStyle: 'italic', color: '#1A1A18', fontSize: 36 }}>P</span>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#C8960A', marginBottom: 14 }} />
          <span style={{ fontFamily: 'Georgia, serif', fontWeight: 300, color: '#1A1A18', fontSize: 36, letterSpacing: 7 }}>ALATABLE</span>
        </div>

        {/* Spinning whisk emoji as the focal art — cheap + on-theme */}
        <div style={{ fontSize: 72, marginBottom: 24, animation: 'spin 2.6s linear infinite', display: 'inline-block' }}>🥄</div>

        <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 36, color: '#1A1A18', marginBottom: 18, lineHeight: 1.15 }}>
          Just stepped out for a smoke
        </h1>

        <p style={{ fontSize: 16, color: '#555', lineHeight: 1.6, marginBottom: 8 }}>
          {message}
        </p>
        <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 28, fontStyle: 'italic' }}>
          Your recipes, costings and stock counts are exactly where you left them. The chef just needed a minute.
        </p>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: '#fff', border: '1px solid #E0DDD8', borderRadius: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#C8960A', animation: 'pulse 1.4s ease-in-out infinite' }} />
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: '#888' }}>
            This page auto-refreshes when we&apos;re back
          </p>
        </div>

        <p style={{ fontSize: 11, color: '#999', marginTop: 32 }}>
          If this drags on, email <a href="mailto:jack@palateandpen.co.uk" style={{ color: '#C8960A', textDecoration: 'none' }}>jack@palateandpen.co.uk</a>.
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
