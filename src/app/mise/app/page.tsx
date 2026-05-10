'use client';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useState } from 'react';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import RecipesView from './components/RecipesView';
import NotebookView from './components/NotebookView';
import GPView from './components/GPView';
import InvoicesView from './components/InvoicesView';
import StockView from './components/StockView';
import ProfileView from './components/ProfileView';

export default function MiseApp() {
  const { user, loading } = useAuth();
  const { state } = useApp();
  const [tab, setTab] = useState('recipes');

  if (loading || !state.ready) return (
    <div className="min-h-screen bg-mise-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="font-fraunces font-bold italic text-mise-text text-4xl" style={{letterSpacing:'-2px'}}>M</span>
          <div className="w-2.5 h-2.5 rounded-full bg-mise-gold" style={{marginBottom:'10px'}}></div>
          <span className="font-fraunces font-light text-mise-text text-4xl" style={{letterSpacing:'8px'}}>ISE</span>
        </div>
        <div className="w-8 h-0.5 bg-mise-gold animate-pulse"></div>
      </div>
    </div>
  );

  if (!user) return <AuthPage />;

  const views: Record<string, React.ReactNode> = {
    recipes: <RecipesView />,
    notebook: <NotebookView />,
    gp: <GPView />,
    invoices: <InvoicesView />,
    stock: <StockView />,
    profile: <ProfileView />,
  };

  return (
    <div className="min-h-screen bg-mise-bg flex font-epilogue">
      <Sidebar tab={tab} setTab={setTab} />
      <main className="flex-1 ml-56 min-h-screen overflow-auto">
        {views[tab]}
      </main>
    </div>
  );
}