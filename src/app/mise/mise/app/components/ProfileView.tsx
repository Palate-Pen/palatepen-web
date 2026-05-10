'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';

export default function ProfileView() {
  const { user, tier, signOut } = useAuth();
  const { state, actions } = useApp();
  const profile = state.profile||{};
  const [name, setName] = useState(profile.name||user?.user_metadata?.name||'');
  const [location, setLocation] = useState(profile.location||'');
  const [gpTarget, setGpTarget] = useState(String(profile.gpTarget||70));
  const [saved, setSaved] = useState(false);

  function save() {
    actions.updProfile({ name:name.trim(), location:location.trim(), gpTarget:parseFloat(gpTarget)||70 });
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  }

  const stats = [
    { label:'Recipes', val:state.recipes.length },
    { label:'Notes', val:state.notes.length },
    { label:'GP Calcs', val:state.gpHistory.length },
    { label:'Stock Items', val:(state.stockItems||[]).length },
  ];

  const avgGP = state.gpHistory.length>0 ? (state.gpHistory.reduce((a:number,b:any)=>a+(b.pct||0),0)/state.gpHistory.length).toFixed(1) : null;

  return (
    <div className="p-8 font-epilogue max-w-3xl">
      <div className="flex justify-between items-start mb-8">
        <h1 className="font-fraunces font-light text-3xl text-mise-text">My Profile</h1>
        <button onClick={save} className={`text-xs font-medium tracking-widest uppercase px-5 py-2.5 border transition-colors ${saved?'border-mise-green text-mise-green bg-mise-green/10':'border-mise-border text-mise-dim hover:border-mise-border-light'}`}>
          {saved?'✓ Saved':'Save Changes'}
        </button>
      </div>

      {/* Upgrade banner */}
      {tier!=='pro'&&(
        <div className="bg-mise-gold border border-mise-gold p-5 mb-6 flex justify-between items-center">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-mise-bg mb-1">Upgrade to Pro</p>
            <p className="text-sm text-mise-bg/70">£9.99/month or £99/year — unlock all features</p>
          </div>
          <button className="text-xs font-semibold tracking-widest uppercase bg-mise-bg text-mise-gold px-4 py-2 hover:bg-mise-surface transition-colors">Upgrade</button>
        </div>
      )}

      {/* Profile card */}
      <div className="bg-mise-surface border border-mise-border p-6 mb-6 flex items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-mise-gold/10 border-2 border-mise-gold flex items-center justify-center">
          <span className="text-2xl font-bold text-mise-gold">{(name||'C')[0].toUpperCase()}</span>
        </div>
        <div>
          <p className="text-xl text-mise-text font-medium mb-1">{name||'Your Name'}</p>
          <p className="text-sm text-mise-faint mb-2">{user?.email}</p>
          <span className={`text-xs font-bold tracking-widest uppercase px-2 py-1 border ${tier==='pro'?'border-mise-gold text-mise-gold bg-mise-gold/10':'border-mise-faint text-mise-faint'}`}>{tier==='pro'?'Pro':'Free'}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {stats.map(st=>(
          <div key={st.label} className="bg-mise-surface border border-mise-border p-4 text-center">
            <p className="font-fraunces font-light text-3xl text-mise-gold mb-1">{st.val}</p>
            <p className="text-xs text-mise-faint">{st.label}</p>
          </div>
        ))}
      </div>

      {avgGP&&(
        <div className="flex justify-between items-center bg-mise-surface border border-mise-border p-4 mb-6">
          <span className="text-sm text-mise-dim">Average GP across saved dishes</span>
          <span className="font-fraunces font-light text-2xl text-mise-gold">{avgGP}%</span>
        </div>
      )}

      {/* Form */}
      <div className="space-y-4 mb-6">
        {[['Your Name',name,setName,'e.g. Jack Harrison'],['Location',location,setLocation,'e.g. London, UK']].map(([label,val,setter,ph]:any)=>(
          <div key={label}>
            <label className="text-xs font-bold tracking-widest uppercase text-mise-faint block mb-2">{label}</label>
            <input value={val} onChange={e=>setter(e.target.value)} placeholder={ph}
              className="w-full bg-mise-surface border border-mise-border text-mise-text text-sm px-4 py-3 focus:outline-none focus:border-mise-gold transition-colors placeholder-mise-faint" />
          </div>
        ))}
        <div>
          <label className="text-xs font-bold tracking-widest uppercase text-mise-faint block mb-2">Default GP Target %</label>
          <input type="number" value={gpTarget} onChange={e=>setGpTarget(e.target.value)} placeholder="70"
            className="w-full bg-mise-surface border border-mise-border text-mise-text text-sm px-4 py-3 focus:outline-none focus:border-mise-gold transition-colors placeholder-mise-faint" />
          <p className="text-xs text-mise-faint mt-2">Industry benchmark: 65–75% depending on venue type</p>
        </div>
      </div>

      <div className="border-t border-mise-border pt-6">
        <p className="text-xs text-mise-faint mb-4">All data is stored securely on EU servers. Your data syncs across all devices when signed in.</p>
        <button onClick={()=>{ if(confirm('Sign out?')) signOut(); }}
          className="text-xs font-bold tracking-widests uppercase text-mise-red border border-mise-red px-6 py-2.5 hover:bg-red-900/20 transition-colors tracking-widest">
          Sign Out
        </button>
      </div>
    </div>
  );
}