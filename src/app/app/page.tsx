'use client';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useSettings } from '@/context/SettingsContext';
import { useState, useEffect } from 'react';
import { dark, light } from '@/lib/theme';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import RecipesView from './components/RecipesView';
import NotebookView from './components/NotebookView';
import CostingView from './components/CostingView';
import InvoicesView from './components/InvoicesView';
import StockView from './components/StockView';
import ProfileView from './components/ProfileView';
import SettingsView from './components/SettingsView';

export default function App() {
  const { user, loading } = useAuth();
  const { state } = useApp();
  const { settings } = useSettings();
  const [tab, setTab] = useState('recipes');
  const C = settings.resolved === 'light' ? light : dark;

  if (loading || !state.ready) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontStyle: 'italic', color: C.text, fontSize: '36px', letterSpacing: '-2px' }}>M</span>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: C.gold, marginBottom: '12px' }}></div>
          <span style={{ fontFamily: 'Georgia,serif', fontWeight: 300, color: C.text, fontSize: '36px', letterSpacing: '8px' }}>ISE</span>
        </div>
      </div>
    </div>
  );

  if (!user) return <AuthPage />;

  const views: Record<string, React.ReactNode> = {
    recipes: <RecipesView />,
    notebook: <NotebookView />,
    costing: <CostingView />,
    invoices: <InvoicesView />,
    stock: <StockView />,
    profile: <ProfileView />,
    settings: <SettingsView />,
  };

  return (
    <div id="mise-app-root" style={{ minHeight: '100vh', background: C.bg, display: 'flex', fontFamily: 'system-ui,sans-serif' }}>
      <Sidebar tab={tab} setTab={setTab} />
      <main style={{ flex: 1, marginLeft: '224px', minHeight: '100vh', overflow: 'auto', color: C.text }}>
        {views[tab] || <RecipesView />}
      </main>
    </div>
  );
}