'use client';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useSettings } from '@/context/SettingsContext';
import { useState, useEffect } from 'react';
import { dark, light } from '@/lib/theme';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import RecipesView from './components/RecipesView';
import NotebookView from './components/NotebookView';
import CostingView from './components/CostingView';
import MenuBuilderView from './components/MenuBuilderView';
import InvoicesView from './components/InvoicesView';
import StockView from './components/StockView';
import SuppliersView from './components/SuppliersView';
import BankView from './components/BankView';
import WasteView from './components/WasteView';
import ReportsView from './components/ReportsView';
import RoleBanner from './components/RoleBanner';
import NotificationsPanel, { useNotificationsModel } from './components/NotificationsPanel';
import { useIsMobile } from '@/lib/useIsMobile';
import ProfileView from './components/ProfileView';
import SettingsView from './components/SettingsView';
import MyTeamView from './components/MyTeamView';
import UpgradeModal from './components/UpgradeModal';
import QuickStartGuide from './components/QuickStartGuide';
import AnnouncementBanner from './components/AnnouncementBanner';
import MaintenanceGate from './components/MaintenanceGate';
import { useTierAndFlag } from '@/lib/usePlatformConfig';

export default function App() {
  const { user, loading, currentAccount, currentRole } = useAuth();
  const { state, saveStatus, actions } = useApp();
  const { settings } = useSettings();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState('dashboard');
  const [mobileSheet, setMobileSheet] = useState<'more' | 'notifications' | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // First-login auto-trigger: once state is loaded (state.ready) and the
  // user hasn't dismissed the tutorial yet, open the guide. Subsequent logins
  // pass through silently — they can replay from Settings.
  useEffect(() => {
    if (!state.ready) return;
    if (state.profile?.tutorialDismissed) return;
    // Small delay so the dashboard renders behind the modal first — feels less abrupt
    const t = setTimeout(() => setShowGuide(true), 600);
    return () => clearTimeout(t);
  }, [state.ready, state.profile?.tutorialDismissed]);

  // Restore sidebar collapsed state from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const v = window.localStorage.getItem('palatable_sidebar_collapsed');
      if (v === '1') setSidebarCollapsed(true);
    } catch {}
  }, []);
  function toggleSidebar(b: boolean) {
    setSidebarCollapsed(b);
    try { window.localStorage.setItem('palatable_sidebar_collapsed', b ? '1' : '0'); } catch {}
  }

  // Pending invite token: redirect to /invite/[token] so the acceptance page
  // can show the merge prompt (when the user has a personal Free-tier
  // account that could be folded into the team). The page handles the
  // accept POST + accountswitch + redirect back to /app after.
  useEffect(() => {
    if (!user) return;
    const url = new URLSearchParams(window.location.search);
    let token = url.get('invite');
    try { token = token || window.sessionStorage.getItem('palatable_pending_invite'); } catch {}
    if (!token) return;
    if (url.has('invite')) {
      url.delete('invite');
      const qs = url.toString();
      window.history.replaceState({}, '', window.location.pathname + (qs ? '?' + qs : ''));
    }
    window.location.href = '/invite/' + token;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Auto-refresh session after Stripe payment
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === 'true') {
      // Remove the query param from URL
      window.history.replaceState({}, '', window.location.pathname);
      // Refresh the session to pick up new tier from Supabase
      supabase.auth.refreshSession().then(({ data }) => {
        if (data?.session) {
          // Force a reload of user data
          window.location.reload();
        }
      });
    }
  }, []);

  const C = settings.resolved === 'light' ? light : dark;

  const loader = (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontStyle: 'italic', color: C.text, fontSize: '36px', letterSpacing: '-2px' }}>P</span>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: C.gold, marginBottom: '12px' }}></div>
          <span style={{ fontFamily: 'Georgia,serif', fontWeight: 300, color: C.text, fontSize: '36px', letterSpacing: '8px' }}>ALATABLE</span>
        </div>
      </div>
    </div>
  );

  // Hooks must come before any conditional return — Rules of Hooks. These
  // were previously below the early-return guards and triggered React #310
  // (rendered more hooks than during the previous render) every time the app
  // transitioned from loading → loaded.
  const flagWasteTracking = useTierAndFlag('stock_waste_tracking', 'wasteTracking', (state.profile as any)?.featureOverrides);
  const flagMenuBuilder = useTierAndFlag('menus_builder', 'menuBuilder', (state.profile as any)?.featureOverrides);

  if (loading) return loader;
  if (!user) return <AuthPage />;
  if (!currentAccount || !state.ready) return loader;

  const views: Record<string, React.ReactNode> = {
    dashboard: <DashboardView setTab={setTab} />,
    recipes: <RecipesView />,
    notebook: <NotebookView />,
    costing: <CostingView />,
    menus: flagMenuBuilder ? <MenuBuilderView /> : <DashboardView setTab={setTab} />,
    invoices: <InvoicesView />,
    stock: <StockView />,
    suppliers: <SuppliersView setTab={setTab} />,
    bank: <BankView />,
    waste: flagWasteTracking ? <WasteView /> : <DashboardView setTab={setTab} />,
    reports: <ReportsView setTab={setTab} />,
    team: <MyTeamView />,
    profile: <ProfileView onUpgrade={() => setShowUpgrade(true)} />,
    settings: <SettingsView onUpgrade={() => setShowUpgrade(true)} onShowGuide={() => setShowGuide(true)} />,
  };

  const saveStyles: Record<string, React.CSSProperties> = {
    saving: { color: C.faint, background: C.surface, border: '1px solid ' + C.border },
    saved:  { color: C.greenLight, background: C.greenLight + '14', border: '1px solid ' + C.greenLight + '40' },
    error:  { color: C.red, background: C.red + '14', border: '1px solid ' + C.red },
    idle:   { display: 'none' },
  };
  const saveText: Record<string, string> = { saving: 'Saving…', saved: '✓ Saved', error: '✗ Save failed', idle: '' };

  // Bottom tab bar — mobile only. 5 primary + More. Alerts/notifications live
  // inside the More sheet (with the unread badge); not in the main bar.
  const MOBILE_PRIMARY = [
    { id: 'dashboard', label: 'Home',     icon: <IconHome /> },
    { id: 'recipes',   label: 'Recipes',  icon: <IconBook /> },
    { id: 'costing',   label: 'Costing',  icon: <IconCalc /> },
    { id: 'stock',     label: 'Stock',    icon: <IconBox /> },
    { id: 'invoices',  label: 'Invoices', icon: <IconScan /> },
  ] as const;

  const teamTabAvailable = (currentRole === 'owner' || currentRole === 'manager')
    && (currentAccount?.tier === 'kitchen' || currentAccount?.tier === 'group');

  const MOBILE_MORE_ITEMS = [
    { id: 'notebook', label: 'Notebook', icon: <IconNote /> },
    ...(flagMenuBuilder ? [{ id: 'menus', label: 'Menus', icon: <IconMenu /> }] : []),
    { id: 'bank',     label: 'Bank',     icon: <IconBank /> },
    ...(flagWasteTracking ? [{ id: 'waste', label: 'Waste', icon: <IconBin /> }] : []),
    { id: 'reports',  label: 'Reports',  icon: <IconChart /> },
    ...(teamTabAvailable ? [{ id: 'team', label: 'My Team', icon: <IconUsers /> }] : []),
    { id: 'settings', label: 'Settings', icon: <IconCog /> },
  ];

  return (
    <MaintenanceGate>
    <div id="palatable-app-root" style={{ minHeight: '100vh', background: C.bg, display: 'flex', fontFamily: 'system-ui,sans-serif' }}>
      {!isMobile && (
        <Sidebar tab={tab} setTab={setTab} onUpgrade={() => setShowUpgrade(true)} collapsed={sidebarCollapsed} setCollapsed={toggleSidebar} />
      )}
      <main style={{
        flex: 1,
        marginLeft: isMobile ? 0 : (sidebarCollapsed ? '64px' : '224px'),
        minHeight: '100vh', overflow: 'auto', color: C.text,
        transition: 'margin-left 0.18s ease',
        paddingBottom: isMobile ? '80px' : 0,
      }}>
        <AnnouncementBanner />
        <RoleBanner />
        {views[tab] || <DashboardView setTab={setTab} />}
      </main>
      {isMobile && (
        <MobileBottomBar
          tab={tab}
          setTab={setTab}
          primary={MOBILE_PRIMARY as any}
          unreadCount={0 /* set by inner consumer below */}
          onMore={() => setMobileSheet('more')}
          onNotifications={() => setMobileSheet('notifications')}
        />
      )}
      {isMobile && mobileSheet === 'more' && (
        <BottomSheet title="More" onClose={() => setMobileSheet(null)}>
          <AlertsSheetRow onOpen={() => setMobileSheet('notifications')} />
          {MOBILE_MORE_ITEMS.map(item => (
            <SheetRow key={item.id}
              icon={item.icon}
              label={item.label}
              active={tab === item.id}
              onClick={() => { setTab(item.id); setMobileSheet(null); }}
            />
          ))}
        </BottomSheet>
      )}
      {isMobile && mobileSheet === 'notifications' && (
        <BottomSheet title="Notifications" onClose={() => setMobileSheet(null)}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <NotificationsPanel onJump={t => { setTab(t); setMobileSheet(null); }} />
          </div>
        </BottomSheet>
      )}
      <div style={{
        position: 'fixed',
        bottom: isMobile ? 80 : 16,
        right: 16, zIndex: 60,
        fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
        padding: '6px 12px', borderRadius: 4,
        ...saveStyles[saveStatus],
      }}>
        {saveText[saveStatus]}
      </div>
    {showUpgrade&&<UpgradeModal onClose={()=>setShowUpgrade(false)}/>}
    <QuickStartGuide
      open={showGuide}
      onClose={() => setShowGuide(false)}
      setTab={setTab}
      onDismissForever={() => actions.updProfile({ tutorialDismissed: true })}
    />
    </div>
    </MaintenanceGate>
  );
}

// Bottom bar reads its own unread count so the badge stays live without the
// parent component subscribing to AppContext.
function MobileBottomBar({ tab, setTab, primary, onMore, onNotifications }: {
  tab: string; setTab: (t: string) => void;
  primary: { id: string; label: string; icon: React.ReactNode }[];
  unreadCount: number;
  onMore: () => void;
  onNotifications: () => void;
}) {
  const { unreadCount } = useNotificationsModel();
  return (
    <nav style={{
      position: 'fixed', left: 0, right: 0, bottom: 0,
      background: '#1C1A17', borderTop: '1px solid #35302A',
      display: 'flex', justifyContent: 'space-around', alignItems: 'stretch',
      height: '64px', zIndex: 50,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {primary.map(t => {
        const active = tab === t.id;
        return (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '3px', padding: '6px 4px',
              background: 'transparent', border: 'none',
              color: active ? '#C8960A' : '#9A8E7A',
              cursor: 'pointer', fontSize: '10px',
              fontWeight: active ? 700 : 500, letterSpacing: '0.3px',
            }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px' }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        );
      })}
      <button onClick={onMore}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', padding: '6px 4px', background: 'transparent', border: 'none', color: '#9A8E7A', cursor: 'pointer', fontSize: '10px', fontWeight: 500, letterSpacing: '0.3px', position: 'relative' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px' }}><IconMore /></span>
        <span>More</span>
        {/* Unread badge bubbles up from the More button so users still see new
            alerts without a dedicated tab slot. */}
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: 4, right: 'calc(50% - 18px)', minWidth: '14px', height: '14px', borderRadius: '7px', background: '#B85A3A', color: '#fff', fontSize: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '1.5px solid #1C1A17' }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </nav>
  );
}

// Special first row inside the More sheet — opens the notifications panel
// instead of switching tab, and carries the unread-count badge.
function AlertsSheetRow({ onOpen }: { onOpen: () => void }) {
  const { unreadCount } = useNotificationsModel();
  return (
    <button onClick={onOpen}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        width: '100%', padding: '14px 16px',
        background: 'transparent', border: 'none',
        borderBottom: '1px solid #2A241D',
        color: '#F0E8DC', cursor: 'pointer', textAlign: 'left',
      }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', color: '#C8960A', position: 'relative' }}>
        <IconBell />
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -6, minWidth: '14px', height: '14px', borderRadius: '7px', background: '#B85A3A', color: '#fff', fontSize: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '1.5px solid #1C1A17' }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </span>
      <span style={{ flex: 1, fontSize: '14px' }}>Alerts</span>
      {unreadCount > 0 && (
        <span style={{ fontSize: '11px', color: '#B85A3A', fontWeight: 700 }}>{unreadCount} new</span>
      )}
    </button>
  );
}

function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      zIndex: 70, display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxHeight: '85vh',
        background: '#1C1A17', borderTop: '1px solid #35302A',
        borderRadius: '12px 12px 0 0',
        display: 'flex', flexDirection: 'column',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <span style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#35302A' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 16px 12px', borderBottom: '1px solid #2A241D' }}>
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#F0E8DC', fontFamily: 'system-ui,sans-serif' }}>{title}</p>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#9A8E7A', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function SheetRow({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '14px 18px', background: active ? '#C8960A14' : 'transparent',
      border: 'none', borderBottom: '0.5px solid #2A241D',
      color: active ? '#C8960A' : '#F0E8DC',
      fontSize: '14px', fontWeight: active ? 600 : 400,
      cursor: 'pointer', textAlign: 'left', width: '100%',
      fontFamily: 'system-ui,sans-serif',
    }}>
      <span style={{ width: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: active ? '#C8960A' : '#9A8E7A' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// Inline SVG tab icons — kept here so the file is self-contained.
function IconHome()  { return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12L12 4l9 8" /><path d="M5 10v10h14V10" /></svg>); }
function IconBook()  { return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h11a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z" /><path d="M4 4v12" /></svg>); }
function IconCalc()  { return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M16 15h0M8 19h2M12 19h2M16 19h0" /></svg>); }
function IconScan()  { return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M21 7V5a2 2 0 0 0-2-2h-2M3 17v2a2 2 0 0 0 2 2h2M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 12h10" /></svg>); }
function IconBox()   { return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l9-4 9 4-9 4z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></svg>); }
function IconNote()  { return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h11l4 4v14H5z" /><path d="M16 3v5h4" /><path d="M9 13h6M9 17h6" /></svg>); }
function IconMenu()  { return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18M3 12h18M3 19h18" /></svg>); }
function IconBank()  { return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9l10-5 10 5" /><path d="M4 9v9M20 9v9M4 21h16" /><path d="M8 13v4M12 13v4M16 13v4" /></svg>); }
function IconBin()   { return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>); }
function IconChart() { return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 14l3-3 4 4 5-7" /></svg>); }
function IconUsers() { return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>); }
function IconCog()   { return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>); }
function IconBell()  { return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>); }
function IconMore()  { return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>); }