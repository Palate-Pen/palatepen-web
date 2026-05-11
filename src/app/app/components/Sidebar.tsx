'use client';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { dark, light } from '@/lib/theme';

interface NavItem { id: string; label: string; icon: string; comingSoon?: boolean; }

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '⌂' },
  { id: 'recipes',   label: 'Recipes',   icon: '📖' },
  { id: 'notebook',  label: 'Notebook',  icon: '📝' },
  { id: 'costing',   label: 'Costing',   icon: '£' },
  { id: 'menus',     label: 'Menus',     icon: '🍽' },
  { id: 'invoices',  label: 'Invoices',  icon: '🧾' },
  { id: 'stock',     label: 'Stock',     icon: '📦' },
  { id: 'bank',      label: 'Bank',      icon: '🏦' },
  { id: 'waste',     label: 'Waste',     icon: '🗑', comingSoon: true },
  { id: 'settings',  label: 'Settings',  icon: '⚙' },
];

const PAID_TIERS = ['pro', 'kitchen', 'group'];
const PRO_GATED = ['invoices', 'stock'];

export default function Sidebar({ tab, setTab, onUpgrade }: { tab: string; setTab: (t: string) => void; onUpgrade: () => void }) {
  const { tier } = useAuth();
  const { settings } = useSettings();
  const C = settings.resolved === 'light' ? light : dark;
  const isPaid = PAID_TIERS.includes(tier);
  const tierLabel = tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : 'Free';

  return (
    <aside style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '224px', background: C.surface, borderRight: '1px solid ' + C.border, display: 'flex', flexDirection: 'column', zIndex: 40 }}>
      {/* Brand */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid ' + C.border }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
          <span style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontStyle: 'italic', color: C.text, fontSize: '22px', letterSpacing: '-1px' }}>P</span>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.gold, marginBottom: '7px' }}></div>
          <span style={{ fontFamily: 'Georgia,serif', fontWeight: 300, color: C.text, fontSize: '22px', letterSpacing: '5px' }}>ALATABLE</span>
        </div>
        <p style={{ fontSize: '10px', color: C.faint, letterSpacing: '1px', textTransform: 'uppercase' }}>By Palate &amp; Pen</p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {NAV.map(item => {
          const proGate = PRO_GATED.includes(item.id) && !isPaid;
          const active = tab === item.id;
          const disabled = !!item.comingSoon;
          return (
            <button
              key={item.id}
              onClick={() => { if (!disabled) setTab(item.id); }}
              disabled={disabled}
              title={disabled ? 'Coming soon' : ''}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', borderRadius: '4px', textAlign: 'left',
                background: active ? C.gold + '18' : 'transparent',
                border: active ? '0.5px solid ' + C.gold + '30' : '0.5px solid transparent',
                color: active ? C.gold : (disabled ? C.faint : C.dim),
                fontSize: '13px',
                cursor: disabled ? 'default' : 'pointer',
                width: '100%',
                opacity: disabled ? 0.55 : 1,
              }}
            >
              <span style={{ width: '18px', display: 'inline-block', textAlign: 'center', fontSize: '13px', color: active ? C.gold : C.faint, fontFamily: 'Georgia,serif' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {disabled && (
                <span style={{ fontSize: '9px', fontWeight: 700, color: C.faint, background: C.surface2, border: '0.5px solid ' + C.border, padding: '1px 5px', borderRadius: '2px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Soon
                </span>
              )}
              {!disabled && proGate && (
                <span style={{ fontSize: '9px', fontWeight: 700, color: C.gold, background: C.gold + '18', border: '0.5px solid ' + C.gold + '30', padding: '1px 5px', borderRadius: '2px' }}>
                  Pro
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Tier card */}
      <div style={{ padding: '12px 8px 16px' }}>
        {isPaid ? (
          <div style={{ background: C.gold + '12', border: '0.5px solid ' + C.gold + '30', borderRadius: '4px', padding: '10px 12px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: C.gold, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>{tierLabel}</p>
            <p style={{ fontSize: '11px', color: C.faint }}>All features active</p>
          </div>
        ) : (
          <div style={{ background: C.surface2, border: '0.5px solid ' + C.border, borderRadius: '4px', padding: '10px 12px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: C.faint, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>Free</p>
            <button onClick={onUpgrade} style={{ width: '100%', background: C.gold, color: C.bg, fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', padding: '6px', border: 'none', cursor: 'pointer', borderRadius: '2px' }}>
              Upgrade — from £25/mo
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
