'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useSettings } from '@/context/SettingsContext';
import { dark, light } from '@/lib/theme';
import { useIsMobile } from '@/lib/useIsMobile';
import NotificationsTab from './NotificationsTab';
import { Icon } from './icons/PalatableIcons';
import { useTierAndFlag } from '@/lib/usePlatformConfig';
import { canAccess } from '@/lib/tierGate';

// Map a sidebar nav id to the custom-icon name. Most align 1:1 — the
// exception is `bank`, which renders the `ingredients` icon since the
// Bank tab is the ingredient bank.
function iconNameFor(navId: string): string {
  if (navId === 'bank') return 'ingredients';
  return navId;
}

interface NavItem { id: string; label: string; icon: string; comingSoon?: boolean; isProfile?: boolean; }

// Profile sits just above Settings — renders a gold-circle avatar with
// the user's initials instead of an icon. Otherwise inherits all the
// same nav-button styling (active state, collapse behaviour, etc).
const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '⌂' },
  { id: 'recipes',   label: 'Recipes',   icon: '📖' },
  { id: 'notebook',  label: 'Notebook',  icon: '📝' },
  { id: 'costing',   label: 'Costing',   icon: '£' },
  { id: 'menus',     label: 'Menus',     icon: '🍽' },
  { id: 'invoices',  label: 'Invoices',  icon: '🧾' },
  { id: 'stock',     label: 'Stock',     icon: '📦' },
  { id: 'suppliers', label: 'Suppliers', icon: '🏬' },
  { id: 'bank',      label: 'Bank',      icon: '🏦' },
  { id: 'waste',     label: 'Waste',     icon: '🗑' },
  { id: 'reports',   label: 'Reports',   icon: '📊' },
  { id: 'team',      label: 'My Team',   icon: '◎' },  // owner-only, Kitchen/Group — filtered below
  { id: 'profile',   label: 'Profile',   icon: '',     isProfile: true },
  { id: 'settings',  label: 'Settings',  icon: '⚙' },
];

const PRO_GATED = ['invoices', 'stock'];

export default function Sidebar({ tab, setTab, onUpgrade, collapsed, setCollapsed }: {
  tab: string;
  setTab: (t: string) => void;
  onUpgrade: () => void;
  collapsed: boolean;
  setCollapsed: (b: boolean) => void;
}) {
  const { tier, accounts, currentAccount, currentRole, switchAccount } = useAuth();
  const { state } = useApp();
  const canBill = currentRole === 'owner';
  const flagOverrides = (state.profile as any)?.featureOverrides;
  const flagWasteTracking = useTierAndFlag('stock_waste_tracking', 'wasteTracking', flagOverrides);
  const flagMenuBuilder = useTierAndFlag('menus_builder', 'menuBuilder', flagOverrides);
  const isMobile = useIsMobile();
  const { settings } = useSettings();
  const C = settings.resolved === 'light' ? light : dark;
  const businessName = (state.profile?.businessName || '').trim();
  const logoUrl = state.profile?.logoUrl as string | undefined;
  // Initials for the Profile avatar — fall back to '?' if name is blank.
  const profileName = (state.profile?.name || '').trim();
  const initials = profileName
    ? profileName.split(/\s+/).filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join('')
    : '?';
  // canAccess routes through the tier-gate map and includes Enterprise.
  const isPaid = canAccess(tier, 'invoices_view');
  const tierLabel = tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : 'Free';
  const width = collapsed ? 64 : 224;
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountMenuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) setAccountMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [accountMenuOpen]);

  const showSwitcher = accounts.length > 1 && currentAccount;
  const roleLabel = currentRole ? currentRole.charAt(0).toUpperCase() + currentRole.slice(1) : '';

  // Defend against direct mount on mobile — page.tsx already gates this.
  // Hooks above always run regardless so rules of hooks stay intact.
  if (isMobile) return null;

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0,
      width: width + 'px', background: C.surface, borderRight: '1px solid ' + C.border,
      display: 'flex', flexDirection: 'column', zIndex: 40,
      transition: 'width 0.18s ease',
    }}>
      {/* Brand → home. Click takes the user to the dashboard tab. */}
      <button onClick={() => setTab('dashboard')}
        title="Back to dashboard"
        style={{
          padding: collapsed ? '20px 0 16px' : '20px 16px 16px',
          borderBottom: '1px solid ' + C.border,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '4px', width: '100%',
          background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        {collapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '6px' }}>
            {/* Palatable wordmark sits on top — primary platform brand. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <span style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontStyle: 'italic', color: C.text, fontSize: '22px', letterSpacing: '-1px' }}>P</span>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.gold, marginBottom: '7px' }}></div>
            </div>
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={businessName || 'Logo'} style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
            )}
          </div>
        ) : (
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Palatable wordmark stays full size on top */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: logoUrl ? '8px' : '4px' }}>
              <span style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontStyle: 'italic', color: C.text, fontSize: '22px', letterSpacing: '-1px' }}>P</span>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.gold, marginBottom: '7px' }}></div>
              <span style={{ fontFamily: 'Georgia,serif', fontWeight: 300, color: C.text, fontSize: '22px', letterSpacing: '5px' }}>ALATABLE</span>
            </div>
            {/* User's business logo sits below as the secondary brand */}
            {logoUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt={businessName || 'Logo'} style={{ height: '24px', maxWidth: '110px', objectFit: 'contain', flexShrink: 0 }} />
              </div>
            )}
            {businessName ? (
              <p title={businessName} style={{ fontSize: '11px', color: C.gold, letterSpacing: '0.5px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{businessName}</p>
            ) : (
              <p style={{ fontSize: '10px', color: C.faint, letterSpacing: '1px', textTransform: 'uppercase' }}>By Palate &amp; Pen</p>
            )}
          </div>
        )}
      </button>

      {/* Account switcher — visible when user is in >1 account */}
      {showSwitcher && (
        <div ref={accountMenuRef} style={{ position: 'relative', borderBottom: '1px solid ' + C.border }}>
          <button onClick={() => setAccountMenuOpen(o => !o)}
            title={collapsed ? currentAccount!.name + ' · ' + roleLabel : ''}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              gap: collapsed ? 0 : '8px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '10px 0' : '10px 14px',
              background: accountMenuOpen ? C.surface2 : 'transparent',
              border: 'none', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span style={{
              width: '20px', height: '20px', borderRadius: '50%',
              background: C.gold + '22', color: C.gold,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700, fontFamily: 'Georgia,serif', flexShrink: 0,
            }}>{(currentAccount!.name || '?').charAt(0).toUpperCase()}</span>
            {!collapsed && (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '12px', color: C.text, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentAccount!.name}</p>
                  <p style={{ fontSize: '9px', color: C.faint, letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 700 }}>{roleLabel}</p>
                </div>
                <span style={{ fontSize: '10px', color: C.faint }}>{accountMenuOpen ? '▴' : '▾'}</span>
              </>
            )}
          </button>
          {accountMenuOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: collapsed ? '64px' : 0, right: collapsed ? 'auto' : 0,
              minWidth: collapsed ? '220px' : 'auto',
              background: C.surface, border: '1px solid ' + C.border, borderRadius: '3px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)', zIndex: 50, overflow: 'hidden',
            }}>
              <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.faint, padding: '8px 12px 4px' }}>Switch account</p>
              {accounts.map(m => {
                const active = m.account.id === currentAccount!.id;
                return (
                  <button key={m.account.id}
                    onClick={() => { switchAccount(m.account.id); setAccountMenuOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      width: '100%', padding: '8px 12px', background: active ? C.gold + '12' : 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: C.gold + '22', color: C.gold,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: 700, fontFamily: 'Georgia,serif', flexShrink: 0,
                    }}>{(m.account.name || '?').charAt(0).toUpperCase()}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '12px', color: C.text, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.account.name}</p>
                      <p style={{ fontSize: '9px', color: C.faint, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{m.role}</p>
                    </div>
                    {active && <span style={{ fontSize: '12px', color: C.gold }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Collapse toggle — gold dot + label */}
      <button onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-end',
          gap: '8px',
          background: 'transparent', border: 'none', borderBottom: '1px solid ' + C.border,
          color: C.faint, fontSize: '10px',
          cursor: 'pointer',
          padding: collapsed ? '10px 0' : '8px 14px',
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          fontWeight: 700,
          width: '100%',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = C.gold)}
        onMouseLeave={e => (e.currentTarget.style.color = C.faint)}
      >
        {!collapsed && <span>Collapse</span>}
        <span style={{
          width: '9px', height: '9px', borderRadius: '50%',
          background: C.gold, display: 'inline-block', flexShrink: 0,
          boxShadow: '0 0 0 3px ' + C.gold + '20',
        }} />
      </button>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {NAV.filter(item => {
          // My Team for Owner + Manager on Kitchen/Group tiers (Chef + Viewer don't see it)
          if (item.id === 'team') return (currentRole === 'owner' || currentRole === 'manager') && (tier === 'kitchen' || tier === 'group');
          if (item.id === 'waste') return flagWasteTracking;
          if (item.id === 'menus') return flagMenuBuilder;
          return true;
        }).map(item => {
          const proGate = PRO_GATED.includes(item.id) && !isPaid;
          const active = tab === item.id;
          const disabled = !!item.comingSoon;
          return (
            <button
              key={item.id}
              onClick={() => { if (!disabled) setTab(item.id); }}
              disabled={disabled}
              title={collapsed ? (disabled ? item.label + ' (coming soon)' : item.label) : (disabled ? 'Coming soon' : '')}
              style={{
                display: 'flex', alignItems: 'center',
                gap: collapsed ? 0 : '10px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '10px 0' : '9px 12px',
                borderRadius: '4px', textAlign: 'left',
                background: active ? C.gold + '18' : 'transparent',
                border: active ? '0.5px solid ' + C.gold + '30' : '0.5px solid transparent',
                color: active ? C.gold : (disabled ? C.faint : C.dim),
                fontSize: '13px',
                cursor: disabled ? 'default' : 'pointer',
                width: '100%',
                opacity: disabled ? 0.55 : 1,
                position: 'relative',
              }}
            >
              {item.isProfile ? (
                // Gold-circle avatar with the user's initials — visually
                // distinct from the line-icon family so Profile reads as
                // "the person using the app" rather than another feature.
                <span title={profileName || 'Your profile'} style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: C.gold, color: C.bg,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: '11px',
                  flexShrink: 0, letterSpacing: '0.3px',
                }}>{initials}</span>
              ) : (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  color: active ? C.gold : (disabled ? C.faint : C.dim),
                }}>
                  <Icon name={iconNameFor(item.id)} size={20} />
                </span>
              )}
              {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
              {!collapsed && disabled && (
                <span style={{ fontSize: '9px', fontWeight: 700, color: C.faint, background: C.surface2, border: '0.5px solid ' + C.border, padding: '1px 5px', borderRadius: '2px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Soon
                </span>
              )}
              {!collapsed && !disabled && proGate && (
                <span style={{ fontSize: '9px', fontWeight: 700, color: C.gold, background: C.gold + '18', border: '0.5px solid ' + C.gold + '30', padding: '1px 5px', borderRadius: '2px' }}>
                  Pro
                </span>
              )}
              {/* Tiny dot indicator on collapsed gated/coming-soon items */}
              {collapsed && (disabled || proGate) && (
                <span style={{
                  position: 'absolute', top: 6, right: 8,
                  width: 5, height: 5, borderRadius: '50%',
                  background: disabled ? C.faint : C.gold,
                }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Notifications — sits above the tier card so unread badge is always
          near the brand without crowding nav items. Pops out to the right. */}
      <div style={{ padding: collapsed ? '0 6px 4px' : '0 8px 4px', borderTop: '1px solid ' + C.border, paddingTop: '8px' }}>
        <NotificationsTab collapsed={collapsed} setTab={setTab} />
      </div>

      {/* Tier card */}
      <div style={{ padding: collapsed ? '10px 6px 14px' : '12px 8px 16px' }}>
        {isPaid ? (
          <div style={{
            background: C.gold + '12', border: '0.5px solid ' + C.gold + '30',
            borderRadius: '4px',
            padding: collapsed ? '8px 4px' : '10px 12px',
            textAlign: collapsed ? 'center' : 'left',
          }}>
            <p style={{ fontSize: collapsed ? '9px' : '10px', fontWeight: 700, color: C.gold, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: collapsed ? 0 : '2px' }}>
              {collapsed ? tierLabel.slice(0, 3) : tierLabel}
            </p>
            {!collapsed && <p style={{ fontSize: '11px', color: C.faint }}>All features active</p>}
          </div>
        ) : (
          <div style={{
            background: C.surface2, border: '0.5px solid ' + C.border,
            borderRadius: '4px',
            padding: collapsed ? '8px 4px' : '10px 12px',
            textAlign: collapsed ? 'center' : 'left',
          }}>
            <p style={{ fontSize: collapsed ? '9px' : '10px', fontWeight: 700, color: C.faint, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: collapsed ? 0 : '4px' }}>Free</p>
            {!collapsed && canBill && (
              <button onClick={onUpgrade} style={{ width: '100%', background: C.gold, color: C.bg, fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', padding: '6px', border: 'none', cursor: 'pointer', borderRadius: '2px' }}>
                Upgrade — from £25/mo
              </button>
            )}
            {collapsed && canBill && (
              <button onClick={onUpgrade} title="Upgrade — from £25/mo"
                style={{ width: '100%', background: C.gold, color: C.bg, fontSize: '11px', fontWeight: 700, padding: '4px 0', border: 'none', cursor: 'pointer', borderRadius: '2px', marginTop: '4px' }}>
                ↑
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
