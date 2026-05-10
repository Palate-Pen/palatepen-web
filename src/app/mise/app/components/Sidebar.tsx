'use client';
import { useAuth } from '@/context/AuthContext';

const NAV = [
  { id:'recipes', label:'Recipes', icon:'📋' },
  { id:'notebook', label:'Notebook', icon:'📓' },
  { id:'gp', label:'GP Calc', icon:'📊' },
  { id:'invoices', label:'Invoices', icon:'🧾' },
  { id:'stock', label:'Stock', icon:'📦' },
  { id:'profile', label:'Profile', icon:'👤' },
];

export default function Sidebar({ tab, setTab }: { tab: string; setTab: (t: string) => void }) {
  const { tier } = useAuth();
  const PRO_ONLY = ['invoices','stock'];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-mise-surface border-r border-mise-border flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-mise-border">
        <div className="flex items-center gap-1">
          <span className="font-fraunces font-bold italic text-mise-text text-2xl" style={{letterSpacing:'-1px'}}>M</span>
          <div className="w-2 h-2 rounded-full bg-mise-gold" style={{marginBottom:'7px'}}></div>
          <span className="font-fraunces font-light text-mise-text text-2xl" style={{letterSpacing:'5px'}}>ISE</span>
        </div>
        <p className="text-xs text-mise-faint mt-1">By Palate & Pen</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(item => {
          const isPro = PRO_ONLY.includes(item.id) && tier !== 'pro';
          const active = tab === item.id;
          return (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-left transition-colors ${
                active
                  ? 'bg-mise-gold/10 text-mise-gold border border-mise-gold/20'
                  : 'text-mise-dim hover:text-mise-text hover:bg-mise-surface2'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-sm flex-1">{item.label}</span>
              {isPro && <span className="text-xs text-mise-gold bg-mise-gold/10 border border-mise-gold/20 px-1.5 py-0.5 rounded">Pro</span>}
            </button>
          );
        })}
      </nav>

      {/* Tier badge */}
      <div className="px-3 pb-4">
        {tier === 'pro' ? (
          <div className="bg-mise-gold/10 border border-mise-gold/20 rounded px-3 py-2">
            <p className="text-xs font-bold text-mise-gold tracking-widest uppercase">Pro</p>
            <p className="text-xs text-mise-dim mt-0.5">All features unlocked</p>
          </div>
        ) : (
          <div className="bg-mise-surface2 border border-mise-border rounded px-3 py-2">
            <p className="text-xs font-bold text-mise-faint tracking-widest uppercase">Free</p>
            <p className="text-xs text-mise-faint mt-0.5 mb-2">Upgrade to unlock all features</p>
            <button className="w-full text-xs font-semibold tracking-widest uppercase bg-mise-gold text-mise-bg py-1.5 rounded hover:bg-yellow-400 transition-colors">
              Upgrade — £9.99/mo
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}