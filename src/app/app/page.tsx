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
import BankView from './components/BankView';
import WasteView from './components/WasteView';
import ReportsView from './components/ReportsView';
import RoleBanner from './components/RoleBanner';
import ProfileView from './components/ProfileView';
import SettingsView from './components/SettingsView';
import MyTeamView from './components/MyTeamView';
import UpgradeModal from './components/UpgradeModal';

export default function App() {
  const { user, loading, currentAccount } = useAuth();
  const { state, saveStatus } = useApp();
  const { settings } = useSettings();
  const [tab, setTab] = useState('dashboard');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  if (loading) return loader;
  if (!user) return <AuthPage />;
  if (!currentAccount || !state.ready) return loader;

  const views: Record<string, React.ReactNode> = {
    dashboard: <DashboardView setTab={setTab} />,
    recipes: <RecipesView />,
    notebook: <NotebookView />,
    costing: <CostingView />,
    menus: <MenuBuilderView />,
    invoices: <InvoicesView />,
    stock: <StockView />,
    bank: <BankView />,
    waste: <WasteView />,
    reports: <ReportsView setTab={setTab} />,
    team: <MyTeamView />,
    profile: <ProfileView />,
    settings: <SettingsView onUpgrade={() => setShowUpgrade(true)} />,
  };

  const saveStyles: Record<string, React.CSSProperties> = {
    saving: { color: C.faint, background: C.surface, border: '1px solid ' + C.border },
    saved:  { color: C.greenLight, background: C.greenLight + '14', border: '1px solid ' + C.greenLight + '40' },
    error:  { color: C.red, background: C.red + '14', border: '1px solid ' + C.red },
    idle:   { display: 'none' },
  };
  const saveText: Record<string, string> = { saving: 'Saving…', saved: '✓ Saved', error: '✗ Save failed', idle: '' };

  return (
    <div id="palatable-app-root" style={{ minHeight: '100vh', background: C.bg, display: 'flex', fontFamily: 'system-ui,sans-serif' }}>
      <Sidebar tab={tab} setTab={setTab} onUpgrade={() => setShowUpgrade(true)} collapsed={sidebarCollapsed} setCollapsed={toggleSidebar} />
      <main style={{ flex: 1, marginLeft: sidebarCollapsed ? '64px' : '224px', minHeight: '100vh', overflow: 'auto', color: C.text, transition: 'margin-left 0.18s ease' }}>
        <RoleBanner />
        {views[tab] || <DashboardView setTab={setTab} />}
      </main>
      <div style={{
        position: 'fixed', bottom: 16, right: 16, zIndex: 60,
        fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
        padding: '6px 12px', borderRadius: 4,
        ...saveStyles[saveStatus],
      }}>
        {saveText[saveStatus]}
      </div>
    {showUpgrade&&<UpgradeModal onClose={()=>setShowUpgrade(false)}/>}
    </div>
  );
}