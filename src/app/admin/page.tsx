'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_PASSWORD = 'PalatePen2026!';

function parseProfile(raw: any) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw;
}

function parseArr(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [editProfile, setEditProfile] = useState<any>({});

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_data')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error(error); setLoading(false); return; }
    setUsers(data || []);
    setLoading(false);
  }

  async function saveUser() {
    if (!sel) return;
    setSaving(true);
    const { error } = await supabase
      .from('user_data')
      .update({ profile: editProfile })
      .eq('user_id', sel.user_id);
    if (error) { setMsg('Error: ' + error.message); }
    else { setMsg('Saved successfully'); setSel({ ...sel, profile: editProfile }); load(); }
    setTimeout(() => setMsg(''), 3000);
    setSaving(false);
  }

  function selectUser(u: any) {
    setSel(u);
    setEditProfile(parseProfile(u.profile));
  }

  const filtered = users.filter(u => {
    const p = parseProfile(u.profile);
    return (
      (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.user_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.tier || '').toLowerCase().includes(search.toLowerCase())
    );
  });

  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#141210', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '360px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '40px' }}>
          <span style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontStyle: 'italic', color: '#F0E8DC', fontSize: '28px' }}>M</span>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#C8960A', marginBottom: '10px' }}></div>
          <span style={{ fontFamily: 'Georgia,serif', fontWeight: 300, color: '#F0E8DC', fontSize: '28px', letterSpacing: '5px' }}>ALATABLE</span>
          <span style={{ marginLeft: '12px', fontSize: '11px', color: '#7A7470', letterSpacing: '1px', textTransform: 'uppercase' }}>Admin</span>
        </div>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)}
          placeholder="Admin password"
          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0E8DC', fontSize: '14px', padding: '12px 14px', outline: 'none', fontFamily: 'system-ui,sans-serif', boxSizing: 'border-box', marginBottom: '12px', borderRadius: '3px' }}
          onKeyDown={e => { if (e.key === 'Enter' && pw === ADMIN_PASSWORD) { setAuthed(true); load(); } }} />
        <button onClick={() => { if (pw === ADMIN_PASSWORD) { setAuthed(true); load(); } else { alert('Incorrect password'); } }}
          style={{ width: '100%', background: '#C8960A', color: '#141210', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', padding: '13px', border: 'none', cursor: 'pointer', borderRadius: '3px' }}>
          Enter
        </button>
      </div>
    </div>
  );

  const selProfile = sel ? parseProfile(sel.profile) : {};
  const selRecipes = sel ? parseArr(sel.recipes) : [];
  const selNotes = sel ? parseArr(sel.notes) : [];
  const selGP = sel ? parseArr(sel.gp_history) : [];
  const selStock = sel ? parseArr(sel.stock_items) : [];
  const selBank = sel ? parseArr(sel.ingredients_bank) : [];
  const selInvoices = sel ? parseArr(sel.invoices) : [];

  return (
    <div style={{ minHeight: '100vh', background: '#141210', fontFamily: 'system-ui,sans-serif', color: '#F0E8DC' }}>
      {/* Header */}
      <div style={{ background: '#1C1A17', borderBottom: '1px solid #35302A', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontStyle: 'italic', color: '#F0E8DC', fontSize: '20px' }}>M</span>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#C8960A', marginBottom: '7px' }}></div>
            <span style={{ fontFamily: 'Georgia,serif', fontWeight: 300, color: '#F0E8DC', fontSize: '20px', letterSpacing: '4px' }}>ALATABLE</span>
          </div>
          <span style={{ color: '#35302A' }}>|</span>
          <span style={{ fontSize: '11px', color: '#7A7470', letterSpacing: '1px', textTransform: 'uppercase' }}>Admin Dashboard</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '12px', color: '#7A7470' }}>{users.length} users</span>
          <button onClick={load} style={{ fontSize: '11px', color: '#C8960A', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.5px' }}>Refresh</button>
        </div>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 53px)' }}>
        {/* User list */}
        <div style={{ width: '300px', borderRight: '1px solid #35302A', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '12px' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid #35302A', color: '#F0E8DC', fontSize: '13px', padding: '9px 12px', outline: 'none', boxSizing: 'border-box', borderRadius: '3px' }} />
          </div>
          <div style={{ overflow: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#7A7470', fontSize: '13px' }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#7A7470', fontSize: '13px' }}>
                {users.length === 0 ? 'No users found in database.' : 'No matches for "' + search + '"'}
              </div>
            ) : filtered.map(u => {
              const p = parseProfile(u.profile);
              const recipes = parseArr(u.recipes);
              const isSelected = sel?.user_id === u.user_id;
              return (
                <button key={u.user_id} onClick={() => selectUser(u)}
                  style={{ width: '100%', padding: '14px 16px', background: isSelected ? 'rgba(200,150,10,0.08)' : 'transparent', borderLeft: isSelected ? '2px solid #C8960A' : '2px solid transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #35302A' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(200,150,10,0.15)', border: '1px solid rgba(200,150,10,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#C8960A' }}>{(p.name || p.email || '?')[0].toUpperCase()}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', color: isSelected ? '#C8960A' : '#F0E8DC', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name || 'No name set'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#7A7470', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.user_id.slice(0, 16)}...
                      </div>
                    </div>
                    <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: p.tier === 'pro' ? '#C8960A' : '#7A7470', background: p.tier === 'pro' ? 'rgba(200,150,10,0.12)' : 'rgba(255,255,255,0.05)', border: '0.5px solid ' + (p.tier === 'pro' ? 'rgba(200,150,10,0.3)' : '#35302A'), padding: '2px 6px', borderRadius: '2px', flexShrink: 0 }}>
                      {p.tier || 'free'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px', paddingLeft: '42px' }}>
                    <span style={{ fontSize: '10px', color: '#7A7470' }}>{recipes.length} recipes</span>
                    <span style={{ fontSize: '10px', color: '#7A7470' }}>{parseArr(u.notes).length} notes</span>
                    <span style={{ fontSize: '10px', color: '#7A7470' }}>{parseArr(u.gp_history).length} costings</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div style={{ flex: 1, overflow: 'auto', padding: '28px' }}>
          {!sel ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>👤</p>
                <p style={{ fontSize: '13px', color: '#7A7470' }}>Select a user to view their account</p>
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: '760px' }}>
              {/* User header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(200,150,10,0.15)', border: '2px solid #C8960A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '20px', fontWeight: 700, color: '#C8960A' }}>{(selProfile.name || '?')[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <h2 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '24px', color: '#F0E8DC', marginBottom: '4px' }}>{selProfile.name || 'No name'}</h2>
                    <p style={{ fontSize: '12px', color: '#7A7470', marginBottom: '4px' }}>ID: {sel.user_id}</p>
                    <p style={{ fontSize: '11px', color: '#7A7470' }}>Created: {new Date(sel.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {msg && <span style={{ fontSize: '12px', color: msg.startsWith('Error') ? '#C84040' : '#5AAA6A' }}>{msg}</span>}
                  <button onClick={saveUser} disabled={saving}
                    style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', background: '#C8960A', color: '#141210', border: 'none', padding: '10px 20px', cursor: 'pointer', borderRadius: '2px', opacity: saving ? 0.6 : 1 }}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '20px' }}>
                {[
                  { l: 'Recipes', v: selRecipes.length },
                  { l: 'Notes', v: selNotes.length },
                  { l: 'Costings', v: selGP.length },
                  { l: 'Stock Items', v: selStock.length },
                  { l: 'Bank Items', v: selBank.length },
                  { l: 'Invoices', v: selInvoices.length },
                ].map(s => (
                  <div key={s.l} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #35302A', borderRadius: '4px', padding: '12px', textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '24px', color: '#C8960A', marginBottom: '4px' }}>{s.v}</p>
                    <p style={{ fontSize: '10px', color: '#7A7470', letterSpacing: '0.5px' }}>{s.l}</p>
                  </div>
                ))}
              </div>

              {/* Editable profile */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #35302A', borderRadius: '4px', padding: '20px', marginBottom: '16px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#7A7470', marginBottom: '16px' }}>Account Details</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { label: 'Name', key: 'name', ph: 'Full name' },
                    { label: 'Location', key: 'location', ph: 'City, Country' },
                    { label: 'Currency', key: 'currency', ph: 'GBP' },
                  ].map(({ label, key, ph }) => (
                    <div key={key}>
                      <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#7A7470', display: 'block', marginBottom: '6px' }}>{label}</label>
                      <input value={editProfile[key] || ''} onChange={e => setEditProfile({ ...editProfile, [key]: e.target.value })} placeholder={ph}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid #35302A', color: '#F0E8DC', fontSize: '13px', padding: '9px 12px', outline: 'none', boxSizing: 'border-box', borderRadius: '3px' }} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#7A7470', display: 'block', marginBottom: '6px' }}>GP Target %</label>
                    <input type="number" value={editProfile.gpTarget || 72} onChange={e => setEditProfile({ ...editProfile, gpTarget: parseInt(e.target.value) || 72 })}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid #35302A', color: '#F0E8DC', fontSize: '13px', padding: '9px 12px', outline: 'none', boxSizing: 'border-box', borderRadius: '3px' }} />
                  </div>
                </div>
                <div style={{ marginTop: '12px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#7A7470', display: 'block', marginBottom: '6px' }}>Subscription Tier</label>
                  <select value={editProfile.tier || 'free'} onChange={e => setEditProfile({ ...editProfile, tier: e.target.value })}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #35302A', color: '#F0E8DC', fontSize: '13px', padding: '9px 12px', outline: 'none', cursor: 'pointer', borderRadius: '3px', minWidth: '160px' }}>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>
              </div>

              {/* Recipes list */}
              {selRecipes.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #35302A', borderRadius: '4px', padding: '20px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#7A7470', marginBottom: '12px' }}>Recipes ({selRecipes.length})</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selRecipes.slice(0, 10).map((r: any) => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#C8960A', flexShrink: 0 }}></div>
                        <span style={{ fontSize: '13px', color: '#C0B8AC', flex: 1 }}>{r.title}</span>
                        <span style={{ fontSize: '10px', color: '#7A7470' }}>{r.category}</span>
                      </div>
                    ))}
                    {selRecipes.length > 10 && <p style={{ fontSize: '11px', color: '#7A7470' }}>+{selRecipes.length - 10} more</p>}
                  </div>
                </div>
              )}

              {/* Ingredients bank */}
              {selBank.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #35302A', borderRadius: '4px', padding: '20px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#7A7470', marginBottom: '12px' }}>Ingredients Bank ({selBank.length})</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selBank.slice(0, 8).map((ing: any) => (
                      <div key={ing.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#2A7D6F', flexShrink: 0 }}></div>
                        <span style={{ fontSize: '13px', color: '#C0B8AC', flex: 1 }}>{ing.name}</span>
                        <span style={{ fontSize: '12px', color: '#C8960A' }}>£{(ing.unitPrice || 0).toFixed(2)}/{ing.unit}</span>
                      </div>
                    ))}
                    {selBank.length > 8 && <p style={{ fontSize: '11px', color: '#7A7470' }}>+{selBank.length - 8} more</p>}
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