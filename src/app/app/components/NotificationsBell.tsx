'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useSettings } from '@/context/SettingsContext';
import { dark, light } from '@/lib/theme';

type NotificationKind = 'price' | 'stock-critical' | 'stock-low' | 'recipe' | 'menu';
interface Notif {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  ts: number;
  goTo: string;
}

function fmtRel(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h';
  const d = Math.floor(h / 24);
  if (d < 30) return d + 'd';
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const KIND_META: Record<NotificationKind, { icon: string; color: (C: any) => string }> = {
  'price':          { icon: '£',  color: C => C.red },
  'stock-critical': { icon: '⚠',  color: C => C.red },
  'stock-low':      { icon: '◑',  color: C => C.gold },
  'recipe':         { icon: '+',  color: C => C.greenLight },
  'menu':           { icon: '+',  color: C => C.greenLight },
};

export default function NotificationsBell({ setTab }: { setTab: (t: string) => void }) {
  const { state, actions } = useApp();
  const { settings } = useSettings();
  const C = settings.resolved === 'light' ? light : dark;
  const sym = (state.profile || {}).currencySymbol || '£';
  const lastSeen: number = (state.profile || {}).notificationsLastSeen || 0;

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const notifications = useMemo<Notif[]>(() => {
    const out: Notif[] = [];
    const now = Date.now();
    const days30 = now - 30 * 86400000;
    const days7  = now - 7 * 86400000;

    // Price changes (last 30d)
    for (const a of (state.priceAlerts || [])) {
      const ts = a.detectedAt || 0;
      if (ts < days30) continue;
      const pct = typeof a.pct === 'number' ? a.pct : null;
      const dir = pct && pct > 0 ? 'up' : 'down';
      const detail = a.oldPrice != null && a.newPrice != null
        ? `${sym}${a.oldPrice.toFixed(2)} → ${sym}${a.newPrice.toFixed(2)}${pct != null ? ` (${pct > 0 ? '+' : ''}${pct.toFixed(1)}%)` : ''}`
        : (pct != null ? `${pct > 0 ? '+' : ''}${pct.toFixed(1)}% change` : 'price changed');
      out.push({
        id: 'price-' + (a.id || ts + '-' + a.name),
        kind: 'price',
        title: `${a.name} ${dir === 'up' ? 'price up' : 'price down'}`,
        detail,
        ts,
        goTo: 'invoices',
      });
    }

    // Stock alerts (no time component — current state). Use a stable id derived
    // from item id + level, "ts" = updated_at or 0 so we sort against everything.
    for (const s of (state.stockItems || [])) {
      const cur = parseFloat(s.currentQty);
      const min = parseFloat(s.minLevel);
      const par = parseFloat(s.parLevel);
      if (isNaN(cur)) continue;
      const ts = s.updatedAt || s.createdAt || now;
      if (!isNaN(min) && cur <= min) {
        out.push({
          id: 'stock-crit-' + s.id,
          kind: 'stock-critical',
          title: `${s.name} below minimum`,
          detail: `${cur}${s.unit || ''} on hand · min ${min}${s.unit || ''}`,
          ts,
          goTo: 'stock',
        });
      } else if (!isNaN(par) && cur < par) {
        out.push({
          id: 'stock-low-' + s.id,
          kind: 'stock-low',
          title: `${s.name} below par`,
          detail: `${cur}${s.unit || ''} on hand · par ${par}${s.unit || ''}`,
          ts,
          goTo: 'stock',
        });
      }
    }

    // New recipes (last 7d)
    for (const r of (state.recipes || [])) {
      const ts = r.createdAt || 0;
      if (ts < days7) continue;
      out.push({
        id: 'recipe-' + r.id,
        kind: 'recipe',
        title: `New recipe: ${r.title}`,
        detail: r.category || 'Other',
        ts,
        goTo: 'recipes',
      });
    }

    // New menus (last 7d)
    for (const m of (state.menus || [])) {
      const ts = m.createdAt || 0;
      if (ts < days7) continue;
      out.push({
        id: 'menu-' + m.id,
        kind: 'menu',
        title: `New menu: ${m.name}`,
        detail: `${(m.recipeIds || []).length} dish${(m.recipeIds || []).length === 1 ? '' : 'es'}`,
        ts,
        goTo: 'menus',
      });
    }

    return out.sort((a, b) => b.ts - a.ts).slice(0, 30);
  }, [state, sym]);

  const unread = notifications.filter(n => n.ts > lastSeen);
  const unreadCount = unread.length;

  function markAllRead() {
    if (notifications.length === 0) return;
    const newest = Math.max(...notifications.map(n => n.ts));
    actions.updProfile({ notificationsLastSeen: newest });
  }

  function jump(n: Notif) {
    setTab(n.goTo);
    setOpen(false);
    // Mark this one as read by bumping lastSeen at least to its ts
    if (n.ts > lastSeen) actions.updProfile({ notificationsLastSeen: n.ts });
  }

  function toggle() {
    const willOpen = !open;
    setOpen(willOpen);
  }

  return (
    <div ref={wrapRef} style={{ position: 'fixed', top: 16, right: 16, zIndex: 60 }}>
      <button onClick={toggle}
        title="Notifications"
        style={{
          position: 'relative',
          background: open ? C.gold + '18' : C.surface,
          border: '1px solid ' + (open ? C.gold + '50' : C.border),
          color: C.text, fontSize: '16px',
          width: '38px', height: '38px',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        <BellIcon C={C} active={open} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            minWidth: '16px', height: '16px',
            borderRadius: '8px',
            background: C.red, color: '#fff',
            fontSize: '9px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px',
            border: '1.5px solid ' + C.bg,
          }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '6px',
          width: '380px', maxHeight: '70vh',
          background: C.surface,
          border: '1px solid ' + C.border,
          borderRadius: '4px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'system-ui,sans-serif',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', borderBottom: '1px solid ' + C.border,
          }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.faint }}>
              Notifications {notifications.length > 0 && <span style={{ color: C.dim, marginLeft: '4px', fontWeight: 400 }}>({notifications.length})</span>}
            </p>
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                style={{ fontSize: '11px', color: C.gold, background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: '13px', color: C.faint }}>You&apos;re all caught up</p>
                <p style={{ fontSize: '11px', color: C.faint, marginTop: '4px' }}>Price changes and stock alerts will appear here</p>
              </div>
            ) : (
              notifications.map(n => {
                const meta = KIND_META[n.kind];
                const isUnread = n.ts > lastSeen;
                return (
                  <button key={n.id} onClick={() => jump(n)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                      width: '100%', textAlign: 'left',
                      background: isUnread ? C.gold + '08' : 'transparent',
                      border: 'none', borderBottom: '0.5px solid ' + C.border,
                      padding: '12px 16px', cursor: 'pointer',
                      borderLeft: '3px solid ' + (isUnread ? meta.color(C) : 'transparent'),
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = isUnread ? C.gold + '14' : C.surface2)}
                    onMouseLeave={e => (e.currentTarget.style.background = isUnread ? C.gold + '08' : 'transparent')}
                  >
                    <span style={{
                      width: '24px', height: '24px', borderRadius: '4px',
                      background: meta.color(C) + '20',
                      border: '0.5px solid ' + meta.color(C) + '40',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', color: meta.color(C),
                      flexShrink: 0, fontFamily: 'Georgia,serif', fontWeight: 700,
                    }}>{meta.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', color: C.text, fontWeight: isUnread ? 600 : 400, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.title}
                      </p>
                      <p style={{ fontSize: '11px', color: C.faint }}>{n.detail}</p>
                    </div>
                    <span style={{ fontSize: '10px', color: C.faint, flexShrink: 0, marginTop: '3px' }}>{fmtRel(n.ts)}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon({ C, active }: { C: any; active: boolean }) {
  const stroke = active ? C.gold : C.dim;
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
