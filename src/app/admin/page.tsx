'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_PASSWORD = 'PalatePen2026!';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('user_data').select('*').order('created_at', { ascending:false });
    setUsers(data || []);
    setLoading(false);
  }

  async function saveUser() {
    if (!sel) return;
    setSaving(true);
    await supabase.from('user_data').update({ profile: sel.profile }).eq('user_id', sel.user_id);
    setMsg('Saved successfully');
    setTimeout(() => setMsg(''), 3000);
    setSaving(false);
    load();
  }

  const filtered = users.filter(u =>
    (u.profile?.name||'').toLowerCase().includes(search.toLowerCase()) ||
    (u.user_id||'').toLowerCase().includes(search.toLowerCase())
  );

  if (!authed) return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10">
          <span className="font-fraunces font-bold italic text-cream text-3xl" style={{letterSpacing:'-1px'}}>M</span>
          <div className="w-2 h-2 rounded-full bg-mustard" style={{marginBottom:'8px'}}></div>
          <span className="font-fraunces font-light text-cream text-3xl" style={{letterSpacing:'6px'}}>ISE</span>
        </div>
        <h1 className="font-fraunces font-light text-2xl text-cream mb-2">Admin Access</h1>
        <p className="font-epilogue text-sm text-white/40 mb-8">Palate &amp; Pen internal tool</p>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Admin password"
          className="w-full bg-white/5 border border-white/10 text-cream text-sm px-4 py-3 focus:outline-none focus:border-mustard transition-colors mb-4 placeholder-white/20"
          onKeyDown={e => e.key==='Enter' && pw===ADMIN_PASSWORD && (setAuthed(true), load())} />
        <button onClick={() => { if(pw===ADMIN_PASSWORD) { setAuthed(true); load(); } else alert('Incorrect password'); }}
          className="w-full bg-mustard text-ink text-xs font-semibold tracking-widest uppercase py-3 hover:bg-yellow-400 transition-colors">
          Enter
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink font-epilogue">
      {/* Header */}
      <div className="bg-ink border-b border-white/10 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-fraunces font-bold italic text-cream text-xl" style={{letterSpacing:'-0.5px'}}>M</span>
            <div className="w-1.5 h-1.5 rounded-full bg-mustard" style={{marginBottom:'6px'}}></div>
            <span className="font-fraunces font-light text-cream text-xl" style={{letterSpacing:'4px'}}>ISE</span>
          </div>
          <span className="text-white/20 text-sm">|</span>
          <span className="text-xs font-bold tracking-widest uppercase text-white/40">Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/30">{users.length} total users</span>
          <button onClick={load} className="text-xs text-mustard hover:text-yellow-400 transition-colors tracking-widest uppercase">Refresh</button>
        </div>
      </div>

      <div className="flex h-screen">
        {/* User list */}
        <div className="w-80 border-r border-white/10 flex flex-col">
          <div className="p-4 border-b border-white/10">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
              className="w-full bg-white/5 border border-white/10 text-cream text-sm px-3 py-2 focus:outline-none focus:border-mustard transition-colors placeholder-white/20" />
          </div>
          <div className="overflow-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-white/30 text-sm">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-white/30 text-sm">No users found</div>
            ) : filtered.map(u => (
              <button key={u.user_id} onClick={() => setSel({...u, profile:{...u.profile}})}
                className={`w-full text-left px-4 py-4 border-b border-white/5 hover:bg-white/5 transition-colors ${sel?.user_id===u.user_id?'bg-white/10 border-l-2 border-l-mustard':''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-mustard/20 border border-mustard/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-mustard">{(u.profile?.name||'?')[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-cream truncate">{u.profile?.name||'No name'}</div>
                    <div className="text-xs text-white/30 truncate">{u.user_id}</div>
                  </div>
                  <span className={`text-xs font-bold tracking-widest uppercase px-2 py-0.5 ${u.profile?.tier==='pro'?'text-mustard bg-mustard/10 border border-mustard/20':'text-white/30 bg-white/5 border border-white/10'}`}>
                    {u.profile?.tier||'free'}
                  </span>
                </div>
                <div className="mt-2 flex gap-3 text-xs text-white/20 pl-11">
                  <span>{(u.recipes||[]).length} recipes</span>
                  <span>{(u.notes||[]).length} notes</span>
                  <span>{(u.gpHistory||[]).length} GP calcs</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* User detail */}
        <div className="flex-1 overflow-auto p-8">
          {!sel ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-4xl mb-4">&#x1F464;</p>
                <p className="text-white/30 text-sm">Select a user to view their account</p>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="font-fraunces font-light text-3xl text-cream mb-1">{sel.profile?.name||'No name'}</h2>
                  <p className="text-xs text-white/30">{sel.user_id}</p>
                </div>
                <div className="flex items-center gap-3">
                  {msg && <span className="text-xs text-green-400">{msg}</span>}
                  <button onClick={saveUser} disabled={saving}
                    className="text-xs font-semibold tracking-widest uppercase bg-mustard text-ink px-5 py-2 hover:bg-yellow-400 transition-colors disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3 mb-8">
                {[{l:'Recipes',v:(sel.recipes||[]).length},{l:'Notes',v:(sel.notes||[]).length},{l:'GP Calcs',v:(sel.gpHistory||[]).length},{l:'Stock',v:(sel.stockItems||[]).length}].map(s=>(
                  <div key={s.l} className="bg-white/5 border border-white/10 p-4 text-center">
                    <div className="font-fraunces font-light text-2xl text-mustard mb-1">{s.v}</div>
                    <div className="text-xs text-white/30">{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Editable profile */}
              <div className="bg-white/5 border border-white/10 p-6 mb-6">
                <h3 className="text-xs font-bold tracking-widest uppercase text-white/40 mb-6">Account Details</h3>
                <div className="space-y-4">
                  {[['Name','name'],['Location','location'],['Currency','currency']].map(([label,key]) => (
                    <div key={key}>
                      <label className="text-xs font-bold tracking-widest uppercase text-white/30 block mb-2">{label}</label>
                      <input value={sel.profile?.[key]||''} onChange={e => setSel({...sel, profile:{...sel.profile, [key]:e.target.value}})}
                        className="w-full bg-white/5 border border-white/10 text-cream text-sm px-3 py-2 focus:outline-none focus:border-mustard transition-colors" />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-bold tracking-widest uppercase text-white/30 block mb-2">Subscription Tier</label>
                    <select value={sel.profile?.tier||'free'} onChange={e => setSel({...sel, profile:{...sel.profile, tier:e.target.value}})}
                      className="w-full bg-white/5 border border-white/10 text-cream text-sm px-3 py-2 focus:outline-none focus:border-mustard">
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold tracking-widest uppercase text-white/30 block mb-2">GP Target %</label>
                    <input type="number" value={sel.profile?.gpTarget||70} onChange={e => setSel({...sel, profile:{...sel.profile, gpTarget:parseInt(e.target.value)}})}
                      className="w-full bg-white/5 border border-white/10 text-cream text-sm px-3 py-2 focus:outline-none focus:border-mustard" />
                  </div>
                </div>
              </div>

              {/* Recipes list */}
              {(sel.recipes||[]).length > 0 && (
                <div className="bg-white/5 border border-white/10 p-6 mb-6">
                  <h3 className="text-xs font-bold tracking-widest uppercase text-white/40 mb-4">Recipes ({sel.recipes.length})</h3>
                  <div className="space-y-2">
                    {sel.recipes.slice(0,10).map((r:any) => (
                      <div key={r.id} className="flex items-center gap-3 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-mustard/50 flex-shrink-0"></div>
                        <span className="text-cream/70 flex-1">{r.title}</span>
                        <span className="text-white/30 text-xs">{r.category}</span>
                      </div>
                    ))}
                    {sel.recipes.length > 10 && <p className="text-xs text-white/20">+{sel.recipes.length-10} more</p>}
                  </div>
                </div>
              )}

              {/* Ingredients bank */}
              {(sel.ingredientsBank||[]).length > 0 && (
                <div className="bg-white/5 border border-white/10 p-6">
                  <h3 className="text-xs font-bold tracking-widest uppercase text-white/40 mb-4">Ingredients Bank ({sel.ingredientsBank.length})</h3>
                  <div className="space-y-2">
                    {sel.ingredientsBank.slice(0,8).map((ing:any) => (
                      <div key={ing.id} className="flex items-center gap-3 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal/50 flex-shrink-0"></div>
                        <span className="text-cream/70 flex-1">{ing.name}</span>
                        <span className="text-mustard text-xs">£{(ing.unitPrice||0).toFixed(2)}/{ing.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}