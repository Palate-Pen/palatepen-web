'use client';
import { useState, useEffect, useMemo } from 'react';
import { ADMIN_PASSWORD } from '@/lib/admin';

const PRO_PRICE = 9;

function authHeaders(): HeadersInit {
  return { 'Authorization': `Bearer ${ADMIN_PASSWORD}`, 'Content-Type': 'application/json' };
}

const C = {
  bg: '#F8F8F6',
  panel: '#FFFFFF',
  panel2: '#F1EFE9',
  border: '#E5E2DA',
  borderStrong: '#C8C2B4',
  text: '#1A1A18',
  dim: '#5A5A55',
  faint: '#888880',
  gold: '#C8960A',
  goldHover: '#B8870A',
  goldSoft: 'rgba(200,150,10,0.10)',
  goldBorder: 'rgba(200,150,10,0.35)',
  green: '#3A7A4A',
  greenSoft: 'rgba(58,122,74,0.10)',
  red: '#B83030',
  redSoft: 'rgba(184,48,48,0.10)',
};

type Section = 'overview' | 'users' | 'settings';
type TierFilter = 'all' | 'free' | 'pro';
type SortBy = 'newest' | 'oldest' | 'recipes' | 'updated';

function parseProfile(raw: any): any {
  if (!raw) return {};
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return {}; } }
  return raw;
}
function parseArr(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return []; } }
  return [];
}
function fmtDate(s: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', opts ?? { day: 'numeric', month: 'short', year: 'numeric' });
}
function relTime(s: string | null | undefined): string {
  if (!s) return '—';
  const diff = Date.now() - new Date(s).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return fmtDate(s, { day: 'numeric', month: 'short' });
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwErr, setPwErr] = useState('');

  const [section, setSection] = useState<Section>('overview');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState('');

  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');

  const [sel, setSel] = useState<any>(null);
  const [editProfile, setEditProfile] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function load() {
    setLoading(true);
    setLoadErr('');
    try {
      const res = await fetch('/api/admin/users', { headers: authHeaders(), cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        setLoadErr(json.error || `HTTP ${res.status}`);
      } else {
        setUsers(json.users || []);
      }
    } catch (e: any) {
      setLoadErr(e?.message || 'Network error');
    }
    setLoading(false);
  }

  function tryLogin() {
    if (pw === ADMIN_PASSWORD) {
      setAuthed(true);
      setPwErr('');
      load();
    } else {
      setPwErr('Incorrect password');
    }
  }

  function selectUser(u: any) {
    setSel(u);
    setEditProfile(parseProfile(u.profile));
    setConfirmDelete(false);
  }

  async function patchUser(userId: string, profile: any): Promise<{ ok: boolean; user?: any; error?: string }> {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ profile }),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error || `HTTP ${res.status}` };
      return { ok: true, user: json.user };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Network error' };
    }
  }

  async function saveUser() {
    if (!sel) return;
    setSaving(true);
    const r = await patchUser(sel.user_id, editProfile);
    if (!r.ok) {
      setMsg({ kind: 'err', text: r.error || 'Failed' });
    } else {
      setMsg({ kind: 'ok', text: 'Saved' });
      const updated = r.user || { ...sel, profile: editProfile };
      setSel(updated);
      setUsers(users.map(u => u.user_id === sel.user_id ? updated : u));
    }
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  }

  async function quickSetTier(u: any, tier: string) {
    const profile = { ...parseProfile(u.profile), tier };
    const r = await patchUser(u.user_id, profile);
    if (!r.ok) {
      setMsg({ kind: 'err', text: r.error || 'Failed' });
    } else {
      const updated = r.user || { ...u, profile };
      setUsers(users.map(x => x.user_id === u.user_id ? updated : x));
      if (sel?.user_id === u.user_id) {
        setSel(updated);
        setEditProfile(profile);
      }
      setMsg({ kind: 'ok', text: `Set ${tier}` });
    }
    setTimeout(() => setMsg(null), 2000);
  }

  async function deleteUser() {
    if (!sel) return;
    try {
      const res = await fetch(`/api/admin/users/${sel.user_id}`, {
        method: 'DELETE', headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg({ kind: 'err', text: json.error || `HTTP ${res.status}` });
      } else {
        setUsers(users.filter(u => u.user_id !== sel.user_id));
        setSel(null);
        setEditProfile({});
        setConfirmDelete(false);
        setMsg({ kind: 'ok', text: 'User data deleted' });
      }
    } catch (e: any) {
      setMsg({ kind: 'err', text: e?.message || 'Network error' });
    }
    setTimeout(() => setMsg(null), 3000);
  }

  function exportCSV() {
    const rows = [
      ['user_id', 'name', 'email', 'tier', 'location', 'currency', 'gp_target', 'recipes', 'notes', 'costings', 'stock', 'invoices', 'created_at', 'updated_at'],
      ...users.map(u => {
        const p = parseProfile(u.profile);
        return [
          u.user_id,
          p.name || '',
          p.email || '',
          p.tier || 'free',
          p.location || '',
          p.currency || '',
          p.gpTarget ?? '',
          parseArr(u.recipes).length,
          parseArr(u.notes).length,
          parseArr(u.gp_history).length,
          parseArr(u.stock_items).length,
          parseArr(u.invoices).length,
          u.created_at || '',
          u.updated_at || '',
        ];
      }),
    ];
    const csv = rows.map(r => r.map(c => {
      const s = String(c ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `palatable-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- derived ----------
  const stats = useMemo(() => {
    const total = users.length;
    const pro = users.filter(u => parseProfile(u.profile).tier === 'pro').length;
    const free = total - pro;
    let recipes = 0, notes = 0, costings = 0, invoices = 0;
    for (const u of users) {
      recipes += parseArr(u.recipes).length;
      notes += parseArr(u.notes).length;
      costings += parseArr(u.gp_history).length;
      invoices += parseArr(u.invoices).length;
    }
    return { total, pro, free, recipes, notes, costings, invoices, mrr: pro * PRO_PRICE };
  }, [users]);

  const signupSeries = useMemo(() => {
    const days = 30;
    const buckets: number[] = Array(days).fill(0);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    for (const u of users) {
      if (!u.created_at) continue;
      const d = new Date(u.created_at); d.setHours(0, 0, 0, 0);
      const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
      if (diff >= 0 && diff < days) buckets[days - 1 - diff] += 1;
    }
    return buckets;
  }, [users]);

  const recentSignups = useMemo(
    () => [...users].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
    [users]
  );

  const topByRecipes = useMemo(
    () => [...users].sort((a, b) => parseArr(b.recipes).length - parseArr(a.recipes).length).slice(0, 5),
    [users]
  );

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = users.filter(u => {
      const p = parseProfile(u.profile);
      const tier = p.tier || 'free';
      if (tierFilter !== 'all' && tier !== tierFilter) return false;
      if (!q) return true;
      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.location || '').toLowerCase().includes(q) ||
        (u.user_id || '').toLowerCase().includes(q)
      );
    });
    if (sortBy === 'newest') list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else if (sortBy === 'oldest') list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    else if (sortBy === 'recipes') list.sort((a, b) => parseArr(b.recipes).length - parseArr(a.recipes).length);
    else if (sortBy === 'updated') list.sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
    return list;
  }, [users, search, tierFilter, sortBy]);

  // ---------- login ----------
  if (!authed) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif', color: C.text }}>
      <div style={{ width: '100%', maxWidth: 360, padding: 24 }}>
        <Brand size={28} sub="Admin" />
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={e => { setPw(e.target.value); setPwErr(''); }}
          placeholder="Admin password"
          style={{ width: '100%', background: C.panel, border: `1px solid ${C.border}`, color: C.text, fontSize: 14, padding: '12px 14px', outline: 'none', boxSizing: 'border-box', marginTop: 32, marginBottom: 12, borderRadius: 4 }}
          onKeyDown={e => { if (e.key === 'Enter') tryLogin(); }}
        />
        {pwErr && <p style={{ color: C.red, fontSize: 12, marginTop: -6, marginBottom: 12 }}>{pwErr}</p>}
        <button
          onClick={tryLogin}
          style={{ width: '100%', background: C.gold, color: '#FFFFFF', fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: 13, border: 'none', cursor: 'pointer', borderRadius: 4 }}
        >Enter</button>
      </div>
    </div>
  );

  // ---------- main ----------
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui,sans-serif', color: C.text }}>
      <header style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Brand size={18} sub="Admin Console" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {msg && (
            <span style={{ fontSize: 12, color: msg.kind === 'err' ? C.red : C.green, background: msg.kind === 'err' ? C.redSoft : C.greenSoft, padding: '4px 10px', borderRadius: 4 }}>{msg.text}</span>
          )}
          <span style={{ fontSize: 12, color: C.faint }}>{users.length} users</span>
          <button onClick={load} disabled={loading} style={btnGhost(loading)}>{loading ? 'Loading…' : 'Refresh'}</button>
          <button onClick={() => { setAuthed(false); setPw(''); setSel(null); }} style={btnGhost(false)}>Logout</button>
        </div>
      </header>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 49px)' }}>
        {/* sidebar */}
        <aside style={{ width: 200, background: C.panel, borderRight: `1px solid ${C.border}`, padding: '16px 12px', flexShrink: 0 }}>
          {([
            { id: 'overview', label: 'Overview', count: '' },
            { id: 'users', label: 'Users', count: String(users.length) },
            { id: 'settings', label: 'Settings', count: '' },
          ] as { id: Section; label: string; count: string }[]).map(item => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              style={{
                width: '100%', textAlign: 'left', background: section === item.id ? C.goldSoft : 'transparent',
                borderLeft: `3px solid ${section === item.id ? C.gold : 'transparent'}`,
                color: section === item.id ? C.gold : C.dim,
                fontSize: 13, fontWeight: section === item.id ? 600 : 500,
                padding: '10px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', border: 'none', borderRadius: 0, marginBottom: 2,
              }}
            >
              <span>{item.label}</span>
              {item.count && <span style={{ fontSize: 11, color: C.faint }}>{item.count}</span>}
            </button>
          ))}
          {loadErr && (
            <div style={{ marginTop: 16, padding: 10, background: C.redSoft, border: `1px solid ${C.red}`, borderRadius: 4, fontSize: 11, color: C.red }}>
              <strong>Load error</strong><br />{loadErr}
            </div>
          )}
        </aside>

        {/* content */}
        <main style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          {section === 'overview' && (
            <Overview stats={stats} signupSeries={signupSeries} recentSignups={recentSignups} topByRecipes={topByRecipes} onJump={(u) => { setSection('users'); selectUser(u); }} />
          )}
          {section === 'users' && (
            <Users
              users={filteredSorted}
              total={users.length}
              search={search} setSearch={setSearch}
              tierFilter={tierFilter} setTierFilter={setTierFilter}
              sortBy={sortBy} setSortBy={setSortBy}
              loading={loading}
              onSelect={selectUser}
              onQuickTier={quickSetTier}
              onExport={exportCSV}
              sel={sel}
              editProfile={editProfile}
              setEditProfile={setEditProfile}
              onSave={saveUser}
              saving={saving}
              confirmDelete={confirmDelete}
              setConfirmDelete={setConfirmDelete}
              onDelete={deleteUser}
            />
          )}
          {section === 'settings' && (
            <Settings stats={stats} onRefresh={load} loading={loading} />
          )}
        </main>
      </div>
    </div>
  );
}

// ---------- subcomponents ----------

function Brand({ size, sub }: { size: number; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size > 22 ? 5 : 3 }}>
      <span style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontStyle: 'italic', color: C.text, fontSize: size }}>P</span>
      <div style={{ width: size / 4, height: size / 4, borderRadius: '50%', background: C.gold, marginBottom: size / 4 }} />
      <span style={{ fontFamily: 'Georgia,serif', fontWeight: 300, color: C.text, fontSize: size, letterSpacing: size > 22 ? 5 : 3 }}>ALATABLE</span>
      {sub && <span style={{ marginLeft: 12, fontSize: 11, color: C.faint, letterSpacing: 1, textTransform: 'uppercase' }}>{sub}</span>}
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, padding: '16px 18px' }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: C.faint, marginBottom: 8 }}>{label}</p>
      <p style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: 30, color: accent ? C.gold : C.text, lineHeight: 1, marginBottom: sub ? 6 : 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: C.faint }}>{sub}</p>}
    </div>
  );
}

function Tier({ tier, large }: { tier: string; large?: boolean }) {
  const isPro = tier === 'pro';
  return (
    <span style={{
      fontSize: large ? 11 : 9, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase',
      color: isPro ? C.gold : C.faint,
      background: isPro ? C.goldSoft : C.panel2,
      border: `1px solid ${isPro ? C.goldBorder : C.border}`,
      padding: large ? '4px 9px' : '2px 7px', borderRadius: 3,
    }}>{tier || 'free'}</span>
  );
}

function Overview({
  stats, signupSeries, recentSignups, topByRecipes, onJump,
}: {
  stats: { total: number; pro: number; free: number; recipes: number; notes: number; costings: number; invoices: number; mrr: number };
  signupSeries: number[];
  recentSignups: any[];
  topByRecipes: any[];
  onJump: (u: any) => void;
}) {
  const max = Math.max(1, ...signupSeries);
  const last7 = signupSeries.slice(-7).reduce((a, b) => a + b, 0);
  const last30 = signupSeries.reduce((a, b) => a + b, 0);

  return (
    <div style={{ maxWidth: 1100 }}>
      <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: 26, marginBottom: 20 }}>Overview</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Users" value={stats.total} accent />
        <StatCard label="Pro" value={stats.pro} sub={`${stats.total ? Math.round(stats.pro / stats.total * 100) : 0}% conversion`} />
        <StatCard label="Free" value={stats.free} />
        <StatCard label="MRR (est.)" value={`£${stats.mrr}`} sub={`@ £${PRO_PRICE}/mo per Pro`} accent />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Recipes" value={stats.recipes} />
        <StatCard label="Total Notes" value={stats.notes} />
        <StatCard label="Total Costings" value={stats.costings} />
        <StatCard label="Total Invoices" value={stats.invoices} />
      </div>

      <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: C.faint }}>Signups — Last 30 Days</p>
          <p style={{ fontSize: 12, color: C.dim }}>
            <span style={{ color: C.gold, fontWeight: 600 }}>{last7}</span> in 7d &middot;{' '}
            <span style={{ color: C.text, fontWeight: 600 }}>{last30}</span> in 30d
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
          {signupSeries.map((n, i) => (
            <div key={i} title={`Day ${i + 1}: ${n} signup${n === 1 ? '' : 's'}`}
              style={{ flex: 1, height: `${Math.max(2, (n / max) * 100)}%`, background: n > 0 ? C.gold : C.panel2, borderRadius: 1, opacity: n > 0 ? 1 : 0.5 }} />
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <ListCard title="Recent Signups" empty="No signups yet">
          {recentSignups.map(u => {
            const p = parseProfile(u.profile);
            return (
              <button key={u.user_id} onClick={() => onJump(u)} style={rowBtn}>
                <Avatar name={p.name || p.email || u.user_id} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: C.text, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name || 'No name'}</div>
                  <div style={{ fontSize: 11, color: C.faint }}>{relTime(u.created_at)}</div>
                </div>
                <Tier tier={p.tier || 'free'} />
              </button>
            );
          })}
        </ListCard>

        <ListCard title="Top Users by Recipes" empty="No recipe activity">
          {topByRecipes.filter(u => parseArr(u.recipes).length > 0).map(u => {
            const p = parseProfile(u.profile);
            const n = parseArr(u.recipes).length;
            return (
              <button key={u.user_id} onClick={() => onJump(u)} style={rowBtn}>
                <Avatar name={p.name || p.email || u.user_id} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: C.text, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name || 'No name'}</div>
                  <div style={{ fontSize: 11, color: C.faint }}>{n} recipe{n === 1 ? '' : 's'}</div>
                </div>
                <Tier tier={p.tier || 'free'} />
              </button>
            );
          })}
        </ListCard>
      </div>
    </div>
  );
}

function Users(props: {
  users: any[]; total: number;
  search: string; setSearch: (s: string) => void;
  tierFilter: TierFilter; setTierFilter: (t: TierFilter) => void;
  sortBy: SortBy; setSortBy: (s: SortBy) => void;
  loading: boolean;
  onSelect: (u: any) => void;
  onQuickTier: (u: any, tier: string) => void;
  onExport: () => void;
  sel: any;
  editProfile: any;
  setEditProfile: (p: any) => void;
  onSave: () => void;
  saving: boolean;
  confirmDelete: boolean;
  setConfirmDelete: (b: boolean) => void;
  onDelete: () => void;
}) {
  const { users, total, search, setSearch, tierFilter, setTierFilter, sortBy, setSortBy, loading,
    onSelect, onQuickTier, onExport, sel, editProfile, setEditProfile, onSave, saving,
    confirmDelete, setConfirmDelete, onDelete } = props;

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 97px)' }}>
      {/* list */}
      <div style={{ flex: '0 0 380px', display: 'flex', flexDirection: 'column', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ padding: 14, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, location, ID…"
              style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, padding: '8px 12px', outline: 'none', boxSizing: 'border-box', borderRadius: 4 }}
            />
            <button onClick={onExport} style={btnGhost(false)} title="Export users to CSV">CSV</button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {(['all', 'free', 'pro'] as TierFilter[]).map(t => (
              <button key={t} onClick={() => setTierFilter(t)} style={chip(tierFilter === t)}>
                {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)}
            style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, padding: '7px 10px', outline: 'none', cursor: 'pointer', borderRadius: 4 }}>
            <option value="newest">Sort: Newest first</option>
            <option value="oldest">Sort: Oldest first</option>
            <option value="recipes">Sort: Most recipes</option>
            <option value="updated">Sort: Recently active</option>
          </select>
        </div>
        <div style={{ overflow: 'auto', flex: 1 }}>
          {loading ? (
            <div style={empty}>Loading…</div>
          ) : users.length === 0 ? (
            <div style={empty}>{total === 0 ? 'No users in database.' : 'No users match the filter.'}</div>
          ) : users.map(u => {
            const p = parseProfile(u.profile);
            const isSel = sel?.user_id === u.user_id;
            const recipes = parseArr(u.recipes).length;
            const notes = parseArr(u.notes).length;
            return (
              <button key={u.user_id} onClick={() => onSelect(u)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: isSel ? C.goldSoft : 'transparent',
                  borderLeft: `3px solid ${isSel ? C.gold : 'transparent'}`,
                  borderBottom: `1px solid ${C.border}`,
                  border: 'none', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: C.border,
                  padding: '12px 16px', cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={p.name || p.email || u.user_id} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: isSel ? C.gold : C.text, fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name || 'No name set'}
                    </div>
                    <div style={{ fontSize: 11, color: C.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.email || u.user_id.slice(0, 24) + '…'}
                    </div>
                  </div>
                  <Tier tier={p.tier || 'free'} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingLeft: 42, fontSize: 11, color: C.faint }}>
                  <span>{recipes} recipe{recipes === 1 ? '' : 's'} &middot; {notes} note{notes === 1 ? '' : 's'}</span>
                  <span>{fmtDate(u.created_at)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* detail */}
      <div style={{ flex: 1, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'auto' }}>
        {!sel ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.faint, fontSize: 13 }}>
            Select a user to view their account
          </div>
        ) : (
          <UserDetail
            user={sel}
            editProfile={editProfile}
            setEditProfile={setEditProfile}
            onSave={onSave}
            saving={saving}
            onQuickTier={(t) => onQuickTier(sel, t)}
            confirmDelete={confirmDelete}
            setConfirmDelete={setConfirmDelete}
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
  );
}

function UserDetail({
  user, editProfile, setEditProfile, onSave, saving, onQuickTier, confirmDelete, setConfirmDelete, onDelete,
}: {
  user: any;
  editProfile: any;
  setEditProfile: (p: any) => void;
  onSave: () => void;
  saving: boolean;
  onQuickTier: (t: string) => void;
  confirmDelete: boolean;
  setConfirmDelete: (b: boolean) => void;
  onDelete: () => void;
}) {
  const recipes = parseArr(user.recipes);
  const notes = parseArr(user.notes);
  const costings = parseArr(user.gp_history);
  const stock = parseArr(user.stock_items);
  const bank = parseArr(user.ingredients_bank);
  const invoices = parseArr(user.invoices);

  const sectionStat = [
    { l: 'Recipes', v: recipes.length },
    { l: 'Notes', v: notes.length },
    { l: 'Costings', v: costings.length },
    { l: 'Stock', v: stock.length },
    { l: 'Bank', v: bank.length },
    { l: 'Invoices', v: invoices.length },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* head */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Avatar name={editProfile.name || editProfile.email || user.user_id} large />
          <div>
            <h2 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: 22, marginBottom: 4 }}>{editProfile.name || 'No name'}</h2>
            <div style={{ fontSize: 12, color: C.faint, fontFamily: 'monospace', marginBottom: 4 }}>{user.user_id}</div>
            <div style={{ fontSize: 11, color: C.faint }}>
              Joined {fmtDate(user.created_at)} &middot; Updated {relTime(user.updated_at)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {editProfile.email && (
            <a href={`mailto:${editProfile.email}`} style={btnGhost(false)} title={`Email ${editProfile.email}`}>Email</a>
          )}
          <button
            onClick={() => onQuickTier(editProfile.tier === 'pro' ? 'free' : 'pro')}
            style={{ ...btnGhost(false), color: C.gold, borderColor: C.goldBorder }}
          >
            {editProfile.tier === 'pro' ? 'Downgrade' : 'Upgrade'}
          </button>
          <button onClick={onSave} disabled={saving}
            style={{ background: C.gold, color: '#FFFFFF', border: 'none', fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', padding: '8px 18px', cursor: 'pointer', borderRadius: 4, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* per-user stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8, marginBottom: 20 }}>
        {sectionStat.map(s => (
          <div key={s.l} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: 22, color: s.v > 0 ? C.gold : C.faint, lineHeight: 1, marginBottom: 4 }}>{s.v}</div>
            <div style={{ fontSize: 10, color: C.faint, letterSpacing: 0.5, textTransform: 'uppercase' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* editable fields */}
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: 20, marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: C.faint, marginBottom: 14 }}>Account Details</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Name" value={editProfile.name || ''} onChange={v => setEditProfile({ ...editProfile, name: v })} placeholder="Full name" />
          <Field label="Email" value={editProfile.email || ''} onChange={v => setEditProfile({ ...editProfile, email: v })} placeholder="user@example.com" type="email" />
          <Field label="Location" value={editProfile.location || ''} onChange={v => setEditProfile({ ...editProfile, location: v })} placeholder="City, Country" />
          <Field label="Currency" value={editProfile.currency || ''} onChange={v => setEditProfile({ ...editProfile, currency: v })} placeholder="GBP" />
          <Field label="GP Target %" value={String(editProfile.gpTarget ?? 72)} onChange={v => setEditProfile({ ...editProfile, gpTarget: parseInt(v) || 0 })} type="number" />
          <div>
            <label style={lbl}>Subscription Tier</label>
            <select value={editProfile.tier || 'free'} onChange={e => setEditProfile({ ...editProfile, tier: e.target.value })} style={input}>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
            </select>
          </div>
        </div>
      </div>

      {/* preview lists */}
      {recipes.length > 0 && (
        <PreviewList title={`Recipes (${recipes.length})`} items={recipes.slice(0, 10)} render={(r: any) => (
          <>
            <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{r.title || 'Untitled'}</span>
            {r.category && <span style={{ fontSize: 11, color: C.faint }}>{r.category}</span>}
          </>
        )} more={recipes.length - 10} />
      )}

      {bank.length > 0 && (
        <PreviewList title={`Ingredients Bank (${bank.length})`} items={bank.slice(0, 8)} render={(ing: any) => (
          <>
            <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{ing.name}</span>
            <span style={{ fontSize: 12, color: C.gold, fontWeight: 500 }}>£{(ing.unitPrice || 0).toFixed(2)}/{ing.unit || 'unit'}</span>
          </>
        )} more={bank.length - 8} />
      )}

      {/* danger zone */}
      <div style={{ marginTop: 24, padding: 20, background: C.panel, border: `1px solid ${C.red}`, borderRadius: 6 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: C.red, marginBottom: 8 }}>Danger Zone</p>
        <p style={{ fontSize: 12, color: C.dim, marginBottom: 12 }}>
          Permanently delete this user&apos;s data row from <code style={{ fontFamily: 'monospace', fontSize: 11, background: C.panel2, padding: '1px 5px', borderRadius: 2 }}>user_data</code>.
          The auth account in <code style={{ fontFamily: 'monospace', fontSize: 11, background: C.panel2, padding: '1px 5px', borderRadius: 2 }}>auth.users</code> must be removed via the Supabase dashboard.
        </p>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} style={{ ...btnGhost(false), color: C.red, borderColor: C.red }}>Delete user data</button>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.red }}>Are you sure?</span>
            <button onClick={onDelete} style={{ background: C.red, color: '#FFFFFF', border: 'none', fontSize: 12, fontWeight: 700, padding: '7px 14px', cursor: 'pointer', borderRadius: 4 }}>Yes, delete</button>
            <button onClick={() => setConfirmDelete(false)} style={btnGhost(false)}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Settings({ stats, onRefresh, loading }: { stats: any; onRefresh: () => void; loading: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: 26, marginBottom: 20 }}>Settings</h1>

      <SettingCard title="Admin password">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <code style={{ fontFamily: 'monospace', fontSize: 13, background: C.bg, border: `1px solid ${C.border}`, padding: '6px 10px', borderRadius: 4, color: C.text }}>
            {show ? ADMIN_PASSWORD : '•'.repeat(ADMIN_PASSWORD.length)}
          </code>
          <button onClick={() => setShow(s => !s)} style={btnGhost(false)}>{show ? 'Hide' : 'Show'}</button>
        </div>
        <p style={{ fontSize: 12, color: C.faint, marginTop: 8 }}>To change, edit <code style={{ fontFamily: 'monospace', fontSize: 11 }}>ADMIN_PASSWORD</code> in <code style={{ fontFamily: 'monospace', fontSize: 11 }}>src/app/admin/page.tsx</code>.</p>
      </SettingCard>

      <SettingCard title="Database">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 12 }}>
          <Mini label="Rows in user_data" value={stats.total} />
          <Mini label="Total recipes" value={stats.recipes} />
          <Mini label="Total invoices" value={stats.invoices} />
        </div>
        <button onClick={onRefresh} disabled={loading} style={btnGhost(loading)}>{loading ? 'Refreshing…' : 'Refresh now'}</button>
      </SettingCard>

      <SettingCard title="Environment">
        <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.7 }}>
          <div>Supabase URL: <code style={{ fontFamily: 'monospace', fontSize: 11 }}>{process.env.NEXT_PUBLIC_SUPABASE_URL}</code></div>
          <div>Pro price (used for MRR): <code style={{ fontFamily: 'monospace', fontSize: 11 }}>£{PRO_PRICE}/mo</code></div>
        </div>
      </SettingCard>
    </div>
  );
}

// ---------- small helpers ----------

function ListCard({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children : [children];
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: C.faint, marginBottom: 12 }}>{title}</p>
      {arr.length === 0 ? <p style={{ fontSize: 13, color: C.faint }}>{empty}</p> : <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>}
    </div>
  );
}

function PreviewList({ title, items, render, more }: { title: string; items: any[]; render: (item: any) => React.ReactNode; more: number }) {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: 18, marginBottom: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: C.faint, marginBottom: 10 }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, i) => (
          <div key={item.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.gold, flexShrink: 0 }} />
            {render(item)}
          </div>
        ))}
        {more > 0 && <p style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>+{more} more</p>}
      </div>
    </div>
  );
}

function Avatar({ name, large }: { name: string; large?: boolean }) {
  const ch = ((name || '?')[0] || '?').toUpperCase();
  const size = large ? 52 : 32;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontSize: large ? 20 : 12, fontWeight: 700, color: C.gold }}>{ch}</span>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={input} />
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: '10px 12px' }}>
      <div style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: 22, color: C.text, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 10, color: C.faint, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

function SettingCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 20, marginBottom: 14 }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: C.faint, marginBottom: 14 }}>{title}</p>
      {children}
    </div>
  );
}

// ---------- styles ----------

const lbl: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
  color: C.faint, display: 'block', marginBottom: 6,
};

const input: React.CSSProperties = {
  width: '100%', background: C.panel, border: `1px solid ${C.border}`, color: C.text,
  fontSize: 13, padding: '9px 12px', outline: 'none', boxSizing: 'border-box', borderRadius: 4,
};

const empty: React.CSSProperties = { padding: 24, textAlign: 'center', color: C.faint, fontSize: 13 };

const rowBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
  background: 'transparent', border: 'none', padding: '10px 4px', cursor: 'pointer',
  borderBottom: `1px solid ${C.border}`,
};

function btnGhost(disabled: boolean): React.CSSProperties {
  return {
    fontSize: 12, color: C.dim, background: C.panel, border: `1px solid ${C.border}`,
    padding: '7px 14px', cursor: disabled ? 'default' : 'pointer', borderRadius: 4,
    fontWeight: 500, letterSpacing: 0.3, textDecoration: 'none', display: 'inline-block',
    opacity: disabled ? 0.6 : 1,
  };
}

function chip(active: boolean): React.CSSProperties {
  return {
    fontSize: 11, fontWeight: 600, padding: '5px 11px', borderRadius: 999, cursor: 'pointer',
    background: active ? C.gold : C.bg,
    color: active ? '#FFFFFF' : C.dim,
    border: `1px solid ${active ? C.gold : C.border}`,
  };
}
