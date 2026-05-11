'use client';
import { useState, useEffect, useRef } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { dark, light } from '@/lib/theme';
import NotificationsPanel, { useNotificationsModel } from './NotificationsPanel';

export default function NotificationsTab({ collapsed, setTab }: { collapsed: boolean; setTab: (t: string) => void }) {
  const { settings } = useSettings();
  const C = settings.resolved === 'light' ? light : dark;
  const { unreadCount } = useNotificationsModel();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={collapsed ? 'Notifications' + (unreadCount > 0 ? ' (' + unreadCount + ' unread)' : '') : ''}
        style={{
          display: 'flex', alignItems: 'center',
          gap: collapsed ? 0 : '10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '10px 0' : '9px 12px',
          background: open ? C.gold + '18' : 'transparent',
          border: open ? '0.5px solid ' + C.gold + '30' : '0.5px solid transparent',
          color: open ? C.gold : C.dim,
          fontSize: '13px', cursor: 'pointer', width: '100%',
          borderRadius: '4px', textAlign: 'left', position: 'relative',
        }}
      >
        <span style={{ width: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <BellIcon C={C} active={open} />
        </span>
        {!collapsed && <span style={{ flex: 1 }}>Notifications</span>}
        {!collapsed && unreadCount > 0 && (
          <span style={{ fontSize: '9px', fontWeight: 700, color: '#fff', background: C.red, padding: '2px 6px', borderRadius: '8px', minWidth: '16px', textAlign: 'center' }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {collapsed && unreadCount > 0 && (
          <span style={{ position: 'absolute', top: 4, right: 8, minWidth: '14px', height: '14px', borderRadius: '7px', background: C.red, color: '#fff', fontSize: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '1.5px solid ' + C.surface }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: 0, left: '100%', marginLeft: '10px',
          width: '380px', maxHeight: '70vh',
          background: C.surface, border: '1px solid ' + C.border, borderRadius: '4px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'system-ui,sans-serif', zIndex: 50,
        }}>
          <NotificationsPanel onJump={t => { setTab(t); setOpen(false); }} />
        </div>
      )}
    </div>
  );
}

function BellIcon({ C, active }: { C: any; active: boolean }) {
  const stroke = active ? C.gold : C.dim;
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
