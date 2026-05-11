'use client';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { usePerms } from '@/lib/perms';
import { dark, light } from '@/lib/theme';

// Strip across the top of /app for non-owner / non-manager roles. Owner +
// Manager have unrestricted UI so they don't need a banner reminding them
// where they are. Viewer + Chef benefit from a constant cue about what's
// locked and on whose account they're working.
export default function RoleBanner() {
  const { currentAccount, currentRole } = useAuth();
  const { settings } = useSettings();
  const perms = usePerms();
  const C = settings.resolved === 'light' ? light : dark;

  if (!currentRole || !currentAccount) return null;
  if (currentRole === 'owner' || currentRole === 'manager') return null;

  const accent = perms.isReadOnly ? C.faint : C.gold;

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 30,
      background: accent + '12', borderBottom: '0.5px solid ' + accent + '40',
      padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '10px',
      fontSize: '11px', color: C.dim,
    }}>
      <span style={{
        fontSize: '9px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase',
        color: accent, background: accent + '22', border: '0.5px solid ' + accent + '40',
        padding: '2px 8px', borderRadius: '2px',
      }}>{currentRole}</span>
      <span>
        {perms.reason} on <strong style={{ color: C.text }}>{currentAccount.name}</strong>
      </span>
    </div>
  );
}
