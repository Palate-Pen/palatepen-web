'use client';
import { useState, useEffect, useMemo } from 'react';
import { ADMIN_PASSWORD } from '@/lib/admin';

// ── Admin control desk ─────────────────────────────────────────────
// Always light theme — independent from the user's chosen app theme.
// Founder-only platform controls: users, revenue, feature flags,
// announcements, audit, system health.

const C = {
  bg: '#F8F8F6',
  panel: '#FFFFFF',
  text: '#1A1A18',
  dim: '#555',
  faint: '#888',
  border: '#E0DDD8',
  gold: '#C8960A',
  goldSoft: '#FAF5E8',
  green: '#2A8A2A',
  greenSoft: '#E8F4E8',
  amber: '#C8960A',
  amberSoft: '#FAF5E8',
  red: '#CC3030',
  redSoft: '#FCEFEF',
  blue: '#3A6EA8',
  blueSoft: '#E8F0F8',
  purple: '#7A4FA0',
  purpleSoft: '#F0E8FA',
};

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

const TIER_BADGE: Record<string, { fg: string; bg: string; bd: string }> = {
  free:       { fg: '#666',     bg: '#EFEEEC',     bd: '#DDD' },
  pro:        { fg: C.gold,     bg: C.goldSoft,    bd: C.gold + '60' },
  kitchen:    { fg: C.blue,     bg: C.blueSoft,    bd: C.blue + '60' },
  group:      { fg: C.purple,   bg: C.purpleSoft,  bd: C.purple + '60' },
  enterprise: { fg: C.text,     bg: C.bg,          bd: C.text + '60' },
  admin:      { fg: C.red,      bg: C.redSoft,     bd: C.red + '60' },
};

// Internal/operator accounts. These users are excluded from Free + paid
// tier counts in the admin dashboard and contribute £0 to the variable
// infrastructure cost calculation in Revenue. They're real auth users
// (so they still show in the Supabase auth-user count on Infrastructure)
// but they don't represent customer demand or cost-of-serve.
const ADMIN_EMAILS = new Set([
  'hello@palateandpen.co.uk',
  'jack@palateandpen.co.uk',
]);
function isAdminUser(u: any): boolean {
  const email = (u?.profile?.email || u?.email || '').toLowerCase();
  return ADMIN_EMAILS.has(email);
}
function tierForUser(u: any): { tier: string; comp: boolean } {
  if (isAdminUser(u)) return { tier: 'admin', comp: false };
  return { tier: u?.profile?.tier || 'free', comp: !!u?.profile?.comp };
}

type Section = 'overview' | 'users' | 'revenue' | 'infra' | 'expenses' | 'platform' | 'audit' | 'system';

// ── Icon set ─────────────────────────────────────────────────
function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const s = { width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'dashboard': return (<svg xmlns="http://www.w3.org/2000/svg" {...s} viewBox="0 0 24 24"><rect x="3" y="3"  width="7" height="9"  rx="1.5" /><rect x="14" y="3" width="7" height="5"  rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>);
    case 'users':     return (<svg xmlns="http://www.w3.org/2000/svg" {...s} viewBox="0 0 24 24"><circle cx="9" cy="7" r="3.5" /><path d="M3 21c0-3.5 2.7-6 6-6s6 2.5 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M21 19c0-2.5-1.5-4-3.5-4.5" /></svg>);
    case 'chart':     return (<svg xmlns="http://www.w3.org/2000/svg" {...s} viewBox="0 0 24 24"><line x1="4" y1="20" x2="20" y2="20" /><rect x="6"  y="12" width="3" height="8" rx="0.5" /><rect x="11" y="8"  width="3" height="12" rx="0.5" /><rect x="16" y="4"  width="3" height="16" rx="0.5" /></svg>);
    case 'toggle':    return (<svg xmlns="http://www.w3.org/2000/svg" {...s} viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="5" /><circle cx="16" cy="12" r="3" fill="currentColor" stroke="none" /></svg>);
    case 'list':      return (<svg xmlns="http://www.w3.org/2000/svg" {...s} viewBox="0 0 24 24"><line x1="8" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="20" y2="12" /><line x1="8" y1="18" x2="20" y2="18" /><circle cx="4" cy="6" r="0.8" fill="currentColor" /><circle cx="4" cy="12" r="0.8" fill="currentColor" /><circle cx="4" cy="18" r="0.8" fill="currentColor" /></svg>);
    case 'activity':  return (<svg xmlns="http://www.w3.org/2000/svg" {...s} viewBox="0 0 24 24"><polyline points="3,12 7,12 10,5 14,19 17,12 21,12" /></svg>);
    case 'close':     return (<svg xmlns="http://www.w3.org/2000/svg" {...s} viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>);
    case 'check':     return (<svg xmlns="http://www.w3.org/2000/svg" {...s} viewBox="0 0 24 24"><polyline points="5,12 10,17 19,7" /></svg>);
    case 'external':  return (<svg xmlns="http://www.w3.org/2000/svg" {...s} viewBox="0 0 24 24"><path d="M14 4h6v6" /><line x1="20" y1="4" x2="11" y2="13" /><path d="M20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5" /></svg>);
    case 'plus':      return (<svg xmlns="http://www.w3.org/2000/svg" {...s} viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>);
    case 'refresh':   return (<svg xmlns="http://www.w3.org/2000/svg" {...s} viewBox="0 0 24 24"><polyline points="4,4 4,10 10,10" /><polyline points="20,20 20,14 14,14" /><path d="M4 10a8 8 0 0 1 14.5-3" /><path d="M20 14a8 8 0 0 1-14.5 3" /></svg>);
    case 'search':    return (<svg xmlns="http://www.w3.org/2000/svg" {...s} viewBox="0 0 24 24"><circle cx="11" cy="11" r="6" /><line x1="20" y1="20" x2="16" y2="16" /></svg>);
    case 'eye':       return (<svg xmlns="http://www.w3.org/2000/svg" {...s} viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>);
    case 'mail':      return (<svg xmlns="http://www.w3.org/2000/svg" {...s} viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><polyline points="3,7 12,13 21,7" /></svg>);
    case 'key':       return (<svg xmlns="http://www.w3.org/2000/svg" {...s} viewBox="0 0 24 24"><circle cx="8" cy="15" r="4" /><line x1="11" y1="12" x2="21" y2="2" /><line x1="17" y1="6" x2="20" y2="9" /></svg>);
    case 'message':   return (<svg xmlns="http://www.w3.org/2000/svg" {...s} viewBox="0 0 24 24"><path d="M21 12c0 4-4 7-9 7-1.4 0-2.7-.2-3.9-.6L3 20l1.5-4C3.5 14.8 3 13.4 3 12c0-4 4-7 9-7s9 3 9 7Z" /></svg>);
    case 'trash':     return (<svg xmlns="http://www.w3.org/2000/svg" {...s} viewBox="0 0 24 24"><polyline points="4,7 20,7" /><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" /><path d="M10 11v6M14 11v6" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></svg>);
    case 'download':  return (<svg xmlns="http://www.w3.org/2000/svg" {...s} viewBox="0 0 24 24"><path d="M12 3v12" /><polyline points="7,10 12,15 17,10" /><line x1="4" y1="21" x2="20" y2="21" /></svg>);
    case 'server':    return (<svg xmlns="http://www.w3.org/2000/svg" {...s} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="6" rx="1.5" /><rect x="3" y="14" width="18" height="6" rx="1.5" /><line x1="7" y1="7" x2="7.01" y2="7" /><line x1="7" y1="17" x2="7.01" y2="17" /></svg>);
    case 'calendar':  return (<svg xmlns="http://www.w3.org/2000/svg" {...s} viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="3" x2="8" y2="7" /><line x1="16" y1="3" x2="16" y2="7" /></svg>);
    default: return null;
  }
}

// Small Palatable wordmark used in the topbar + sidebar
function Wordmark({ size = 18, hideText = false }: { size?: number; hideText?: boolean }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <span style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontStyle: 'italic', color: C.text, fontSize: size, lineHeight: 1, letterSpacing: '-1px' }}>P</span>
      <div style={{ width: Math.round(size * 0.22), height: Math.round(size * 0.22), borderRadius: '50%', background: C.gold, marginTop: Math.round(size * 0.35) }} />
      {!hideText && <span style={{ fontFamily: 'Georgia, serif', fontWeight: 300, color: C.text, fontSize: size, lineHeight: 1, letterSpacing: `${Math.max(2, Math.round(size * 0.18))}px` }}>ALATABLE</span>}
    </div>
  );
}

// ── Layout primitives ────────────────────────────────────────
function Topbar({ section }: { section: Section }) {
  const labels: Record<Section, string> = {
    overview: 'Overview', users: 'Users', revenue: 'Revenue',
    infra: 'Infrastructure', expenses: 'Expenses Timeline',
    platform: 'Platform', audit: 'Audit', system: 'System',
  };
  const now = new Date();
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 48, background: C.panel, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', zIndex: 40, gap: 14 }}>
      <Wordmark size={16} />
      <span style={{ color: C.faint, fontSize: 14 }}>/</span>
      <span style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>{labels[section]}</span>
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 12, color: C.faint }}>{now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.gold, background: C.goldSoft, border: `1px solid ${C.gold}40`, padding: '4px 10px', borderRadius: 2 }}>Control desk</span>
    </div>
  );
}

function Sidebar({ section, onChange }: { section: Section; onChange: (s: Section) => void }) {
  const items: { id: Section; icon: string; label: string }[] = [
    { id: 'overview', icon: 'dashboard', label: 'Overview' },
    { id: 'users',    icon: 'users',     label: 'Users' },
    { id: 'revenue',  icon: 'chart',     label: 'Revenue' },
    { id: 'infra',    icon: 'server',    label: 'Infrastructure' },
    { id: 'expenses', icon: 'calendar',  label: 'Expenses Timeline' },
    { id: 'platform', icon: 'toggle',    label: 'Platform' },
    { id: 'audit',    icon: 'list',      label: 'Audit' },
    { id: 'system',   icon: 'activity',  label: 'System' },
  ];
  return (
    <aside style={{ position: 'fixed', top: 48, bottom: 0, left: 0, width: 56, background: C.panel, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 4, zIndex: 30 }}>
      <div style={{ marginBottom: 6 }}><Wordmark size={20} hideText /></div>
      {items.map(it => {
        const active = section === it.id;
        return (
          <button key={it.id} onClick={() => onChange(it.id)}
            title={it.label}
            style={{
              width: 40, height: 40, borderRadius: 6,
              background: active ? C.gold + '20' : 'transparent',
              border: 'none',
              color: active ? C.gold : C.dim,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.12s',
            }}>
            <Icon name={it.icon} size={20} />
          </button>
        );
      })}
    </aside>
  );
}

// ── Common primitives ────────────────────────────────────────
function StatTile({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '16px 18px', borderRadius: 6 }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: C.faint, marginBottom: 8 }}>{label}</p>
      <p style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 26, color: accent || C.text, lineHeight: 1, marginBottom: sub ? 6 : 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: C.faint }}>{sub}</p>}
    </div>
  );
}

function TierBadge({ tier, comp }: { tier: string; comp?: boolean }) {
  const t = TIER_BADGE[tier] || TIER_BADGE.free;
  return (
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: t.fg, background: t.bg, border: `1px solid ${t.bd}`, padding: '2px 7px', borderRadius: 2, whiteSpace: 'nowrap' }}>
      {tier || 'free'}{comp ? ' · comp' : ''}
    </span>
  );
}

function StatusDot({ status }: { status: 'green' | 'amber' | 'red' }) {
  const colours = { green: C.green, amber: C.amber, red: C.red };
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: colours[status], display: 'inline-block', flexShrink: 0 }} />;
}

function Switch({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ width: 40, height: 22, borderRadius: 11, background: on ? C.gold : C.border, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative', flexShrink: 0, padding: 0, opacity: disabled ? 0.5 : 1, transition: 'background 0.15s' }}>
      <div style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transition: 'left 0.15s' }} />
    </button>
  );
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: C.faint }}>{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: C.goldSoft, color: C.gold, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: Math.round(size * 0.4), flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// ── Greeting ───────────────────────────────────────────────
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// Pretty-print a Unix-ish timestamp as "5m ago" / "3h ago" etc.
function fmtRel(ts: string | number | null): string {
  if (!ts) return '—';
  const t = typeof ts === 'string' ? new Date(ts).getTime() : ts;
  if (!t) return '—';
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h';
  const d = Math.floor(h / 24);
  if (d < 30) return d + 'd';
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// Compute MRR from user list (tier × price per tier).
// Admin/operator emails are bucketed into counts.admin and contribute £0
// to MRR — they're not customer-shaped usage. Enterprise users are
// custom-priced (POA) so their count is tracked, but they don't auto-add
// to MRR — actual ACV is tracked separately per deal.
function computeMrr(users: any[]): { mrr: number; counts: Record<string, number> } {
  const counts: Record<string, number> = { free: 0, pro: 0, kitchen: 0, group: 0, enterprise: 0, admin: 0 };
  for (const u of users) {
    if (isAdminUser(u)) { counts.admin++; continue; }
    const t = u.profile?.tier || 'free';
    const isComp = !!u.profile?.comp;
    if (isComp) { counts.free++; continue; } // comped users don't contribute to MRR
    if (counts[t] != null) counts[t]++; else counts.free++;
  }
  const mrr = counts.pro * 25 + counts.kitchen * 59 + counts.group * 129;
  return { mrr, counts };
}

// Aggregate the most common recipe title across all user_data rows
function topRecipe(users: any[]): { title: string; count: number } | null {
  const tally: Record<string, number> = {};
  for (const u of users) {
    for (const r of (u.recipes || []) as any[]) {
      const t = (r.title || '').trim();
      if (t) tally[t] = (tally[t] || 0) + 1;
    }
  }
  const entries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  return { title: entries[0][0], count: entries[0][1] };
}

// ──────────────────────────────────────────────────────────
// Top-level admin page
// ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [section, setSection] = useState<Section>('overview');

  const [users, setUsers] = useState<any[]>([]);
  const [authUsers, setAuthUsers] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState('');

  const [sel, setSel] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'recipes' | 'costings'>('newest');

  function authHeaders() {
    return { 'Authorization': `Bearer ${ADMIN_PASSWORD}`, 'Content-Type': 'application/json' };
  }

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('palatable_admin_auth') : null;
    if (stored === ADMIN_PASSWORD) setAuthed(true);
  }, []);

  async function load() {
    setLoading(true);
    setLoadErr('');
    try {
      const [usersRes, authRes, auditRes] = await Promise.all([
        fetch('/api/admin/users', { headers: authHeaders() }),
        fetch('/api/admin/auth-users', { headers: authHeaders() }),
        fetch('/api/admin/audit', { headers: authHeaders() }),
      ]);
      const usersJson = await usersRes.json();
      const authJson = await authRes.json();
      const auditJson = await auditRes.json();
      if (!usersRes.ok) throw new Error(usersJson.error || 'users failed');
      setUsers(usersJson.users || []);
      setAuthUsers(authJson.users || []);
      setAudit(auditJson.entries || []);
    } catch (e: any) {
      setLoadErr(e?.message || 'Load failed');
    }
    setLoading(false);
  }

  useEffect(() => { if (authed) load(); }, [authed]);

  // ── Filtered + sorted users list (declared above the auth early-return so
  //    hook order stays consistent across re-renders — Rules of Hooks). ────
  const filteredSorted = useMemo(() => {
    let list = users;
    const q = search.toLowerCase().trim();
    if (q) list = list.filter((u: any) =>
      (u.profile?.name || '').toLowerCase().includes(q) ||
      (u.profile?.email || '').toLowerCase().includes(q)
    );
    if (tierFilter !== 'all') {
      if (tierFilter === 'comp') list = list.filter(u => !isAdminUser(u) && u.profile?.comp);
      else if (tierFilter === 'admin') list = list.filter(isAdminUser);
      else list = list.filter(u => !isAdminUser(u) && (u.profile?.tier || 'free') === tierFilter && !u.profile?.comp);
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'recipes') return ((b.recipes || []).length) - ((a.recipes || []).length);
      if (sortBy === 'costings') return ((b.gp_history || []).length) - ((a.gp_history || []).length);
      return 0;
    });
    return sorted;
  }, [users, search, tierFilter, sortBy]);

  // ── Auth screen ────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, padding: 16 }}>
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 32, width: '100%', maxWidth: 380 }}>
          <div style={{ marginBottom: 20, textAlign: 'center' }}><Wordmark size={22} /></div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: C.faint, textAlign: 'center', marginBottom: 22 }}>Control desk · Founder access</p>
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') {
              if (pw === ADMIN_PASSWORD) { window.localStorage.setItem('palatable_admin_auth', pw); setAuthed(true); }
              else setPwErr('Wrong password');
            }}}
            placeholder="Password"
            autoFocus
            style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 14, padding: '10px 14px', outline: 'none', borderRadius: 4, fontFamily: FONT, boxSizing: 'border-box', marginBottom: 12 }}
          />
          <button
            onClick={() => {
              if (pw === ADMIN_PASSWORD) { window.localStorage.setItem('palatable_admin_auth', pw); setAuthed(true); }
              else setPwErr('Wrong password');
            }}
            style={{ width: '100%', background: C.gold, color: '#fff', border: 'none', padding: '10px 14px', fontSize: 13, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', cursor: 'pointer', borderRadius: 4 }}>
            Sign in
          </button>
          {pwErr && <p style={{ color: C.red, fontSize: 12, marginTop: 12, textAlign: 'center' }}>{pwErr}</p>}
        </div>
      </div>
    );
  }

  // ── Layout shell ─────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: FONT }}>
      <Topbar section={section} />
      <Sidebar section={section} onChange={s => { setSection(s); setSel(null); }} />
      <main style={{ marginLeft: 56, marginTop: 48, padding: 24, minHeight: 'calc(100vh - 48px)' }}>
        {loadErr && (
          <div style={{ background: C.redSoft, border: `1px solid ${C.red}40`, color: C.red, padding: '10px 14px', borderRadius: 4, marginBottom: 16, fontSize: 12 }}>
            {loadErr}
          </div>
        )}
        {section === 'overview' && (
          <Overview users={users} authUsers={authUsers} loading={loading} onRefresh={load} setSection={setSection} />
        )}
        {section === 'users' && (
          <Users
            users={filteredSorted}
            allUsers={users}
            search={search} setSearch={setSearch}
            tierFilter={tierFilter} setTierFilter={setTierFilter}
            sortBy={sortBy} setSortBy={setSortBy}
            onSelect={setSel}
            sel={sel}
            onCloseSel={() => setSel(null)}
            onChanged={load}
          />
        )}
        {section === 'revenue' && (<Revenue users={users} />)}
        {section === 'infra' && (<Infrastructure authUserCount={authUsers.length} users={users} />)}
        {section === 'expenses' && (<ExpensesTimeline users={users} />)}
        {section === 'platform' && (<Platform />)}
        {section === 'audit' && (<Audit entries={audit} users={users} />)}
        {section === 'system' && (<System />)}
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Overview
// ──────────────────────────────────────────────────────────
function Overview({ users, authUsers, loading, onRefresh, setSection }: { users: any[]; authUsers: any[]; loading: boolean; onRefresh: () => void; setSection: (s: Section) => void; }) {
  const total = users.length;
  const paid = users.filter(u => !isAdminUser(u) && ['pro', 'kitchen', 'group', 'enterprise'].includes(u.profile?.tier) && !u.profile?.comp).length;
  const { mrr, counts } = useMemo(() => computeMrr(users), [users]);
  const active7d = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000;
    return users.filter(u => new Date(u.updated_at || u.created_at).getTime() >= cutoff).length;
  }, [users]);

  const recentSignups = useMemo(() => [...users].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 8), [users]);

  const orphans = useMemo(() => {
    const dataIds = new Set(users.map(u => u.user_id));
    return authUsers.filter(a => !dataIds.has(a.id));
  }, [users, authUsers]);

  const churnRisk = useMemo(() => {
    const cutoff = Date.now() - 14 * 86400000;
    return users.filter(u => !isAdminUser(u) && ['pro', 'kitchen', 'group', 'enterprise'].includes(u.profile?.tier) && !u.profile?.comp && new Date(u.updated_at || u.created_at).getTime() < cutoff);
  }, [users]);

  const compExpiring = useMemo(() => {
    const soon = Date.now() + 7 * 86400000;
    return users.filter(u => !isAdminUser(u) && u.profile?.comp && u.profile?.compExpiresAt && new Date(u.profile.compExpiresAt).getTime() < soon);
  }, [users]);

  const top = useMemo(() => topRecipe(users), [users]);

  const [health, setHealth] = useState<any>(null);
  useEffect(() => {
    fetch('/api/admin/health', { headers: { Authorization: `Bearer ${ADMIN_PASSWORD}` } })
      .then(r => r.json()).then(setHealth).catch(() => {});
  }, []);

  // Orphan action state — track which row is busy + which is awaiting delete confirm
  const [orphanBusy, setOrphanBusy] = useState<string | null>(null);
  const [orphanConfirm, setOrphanConfirm] = useState<string | null>(null);
  const [orphanError, setOrphanError] = useState('');

  async function initOrphan(o: any) {
    setOrphanBusy(o.id);
    setOrphanError('');
    try {
      const name = o.user_metadata?.name || (o.email ? o.email.split('@')[0] : '');
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { Authorization: `Bearer ${ADMIN_PASSWORD}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: o.id, name, email: o.email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'initialize failed');
      onRefresh();
    } catch (e: any) {
      setOrphanError(`${o.email}: ${e?.message || 'failed'}`);
    }
    setOrphanBusy(null);
  }

  async function hardDeleteOrphan(o: any) {
    setOrphanBusy(o.id);
    setOrphanError('');
    try {
      const res = await fetch(`/api/admin/auth-users/${o.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ADMIN_PASSWORD}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'delete failed');
      setOrphanConfirm(null);
      onRefresh();
    } catch (e: any) {
      setOrphanError(`${o.email}: ${e?.message || 'failed'}`);
    }
    setOrphanBusy(null);
  }

  const healthRows: { id: string; label: string; status: 'green' | 'amber' | 'red'; detail: string }[] = [
    { id: 'vercel',    label: 'Vercel deploy',   status: 'green' as const, detail: 'site live' },
    { id: 'db',        label: 'Supabase DB',     status: (health?.db?.status as any) || 'amber', detail: health?.db?.detail || '…' },
    { id: 'anthropic', label: 'Anthropic API',   status: (health?.anthropic?.status as any) || 'amber', detail: health?.anthropic?.detail || '…' },
    { id: 'stripe',    label: 'Stripe payments', status: (health?.stripe?.status as any) || 'amber', detail: health?.stripe?.detail || '…' },
    { id: 'webhook',   label: 'Webhook secret',  status: (health?.stripeWebhook?.status as any) || 'amber', detail: health?.stripeWebhook?.detail || '…' },
    { id: 'trigger',   label: 'Signup trigger',  status: (health?.signupTrigger?.status as any) || 'amber', detail: health?.signupTrigger?.detail || '…' },
  ];
  const greenCount = healthRows.filter(r => r.status === 'green').length;
  const amberCount = healthRows.filter(r => r.status === 'amber').length;
  const redCount = healthRows.filter(r => r.status === 'red').length;
  const overall = redCount > 0 ? { dot: 'red' as const, text: 'System issue' }
                : amberCount > 0 ? { dot: 'amber' as const, text: `${amberCount} warning${amberCount === 1 ? '' : 's'}` }
                : { dot: 'green' as const, text: 'All systems operational' };

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 30, color: C.text, marginBottom: 4 }}>
            {greeting()}, Jack
          </h1>
          <p style={{ fontSize: 12, color: C.faint }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <button onClick={onRefresh} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: C.dim, background: C.panel, border: `1px solid ${C.border}`, padding: '8px 12px', cursor: loading ? 'wait' : 'pointer', borderRadius: 4 }}>
          <Icon name="refresh" size={14} /> {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatTile label="Total users" value={total} sub={`${authUsers.length} auth · ${total} profiles`} />
        <StatTile label="Paid users" value={paid} sub={`${total > 0 ? ((paid / total) * 100).toFixed(0) : 0}% conversion`} accent={paid > 0 ? C.gold : C.text} />
        <StatTile label="MRR" value={`£${mrr}`} sub={`ARR £${(mrr * 12).toLocaleString()}`} accent={C.gold} />
        <StatTile label="Active · 7 days" value={active7d} sub={top ? `top recipe: ${top.title}` : 'no recipes yet'} />
      </div>

      {/* System health panel */}
      <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 18, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: C.faint }}>System health</p>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: overall.dot === 'green' ? C.green : overall.dot === 'amber' ? C.amber : C.red }}>
            <StatusDot status={overall.dot} /> {overall.text}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          {healthRows.map(r => (
            <div key={r.id} style={{ padding: '12px 14px', background: r.status === 'green' ? C.greenSoft : r.status === 'amber' ? C.amberSoft : C.redSoft, border: `1px solid ${r.status === 'green' ? C.green + '40' : r.status === 'amber' ? C.amber + '40' : C.red + '40'}`, borderRadius: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <StatusDot status={r.status} />
                <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{r.label}</span>
              </div>
              <p style={{ fontSize: 10, color: C.dim, lineHeight: 1.4 }}>{r.detail}</p>
            </div>
          ))}
        </div>

        {/* Warnings list — surfaces any amber/red rows in full detail below
            the tile grid so the chef can see what needs attention without
            squinting at the small tiles above. */}
        {(amberCount + redCount) > 0 && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: C.faint, marginBottom: 8 }}>
              {amberCount + redCount} item{amberCount + redCount === 1 ? '' : 's'} need{amberCount + redCount === 1 ? 's' : ''} attention
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {healthRows.filter(r => r.status !== 'green').map(r => (
                <div key={'warn-' + r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: r.status === 'red' ? C.redSoft : C.amberSoft, border: `1px solid ${r.status === 'red' ? C.red + '40' : C.amber + '40'}`, borderRadius: 4 }}>
                  <StatusDot status={r.status} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text, flexShrink: 0 }}>{r.label}</span>
                  <span style={{ fontSize: 11, color: C.dim, flex: 1, minWidth: 0 }}>{r.detail}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: r.status === 'red' ? C.red : C.amber, flexShrink: 0 }}>
                    {r.status === 'red' ? 'Issue' : 'Warning'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Orphaned auth users — auth.users rows without a matching user_data row.
          Inline actions: Initialise (creates user_data + lets them sign in
          normally) or Delete fully (hard-removes the auth row too). */}
      {orphans.length > 0 && (
        <div style={{ background: C.panel, border: `1px solid ${C.amber}60`, borderLeft: `3px solid ${C.amber}`, borderRadius: 6, padding: 18, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: C.amber }}>⚠ {orphans.length} orphaned auth user{orphans.length === 1 ? '' : 's'}</p>
              <p style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>Auth row exists but no user_data — usually the signup trigger failed at registration. Initialise to seed the missing row, or remove fully if the account shouldn't exist.</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {orphans.map((o: any) => {
              const busy = orphanBusy === o.id;
              const awaiting = orphanConfirm === o.id;
              return (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4 }}>
                  <Avatar name={o.email || ''} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: C.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.email}</p>
                    <p style={{ fontSize: 11, color: C.faint }}>
                      Joined {fmtRel(o.created_at)}
                      {o.last_sign_in_at ? ` · last sign-in ${fmtRel(o.last_sign_in_at)}` : ' · never signed in'}
                      {o.email_confirmed_at ? ' · confirmed' : ' · unconfirmed'}
                    </p>
                  </div>
                  {awaiting ? (
                    <>
                      <span style={{ fontSize: 11, color: C.red, fontWeight: 600 }}>Delete permanently?</span>
                      <button onClick={() => hardDeleteOrphan(o)} disabled={busy}
                        style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#fff', background: C.red, border: 'none', padding: '7px 12px', cursor: busy ? 'wait' : 'pointer', borderRadius: 3 }}>
                        {busy ? '…' : 'Confirm'}
                      </button>
                      <button onClick={() => setOrphanConfirm(null)} disabled={busy}
                        style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: C.dim, background: 'transparent', border: `1px solid ${C.border}`, padding: '7px 10px', cursor: busy ? 'wait' : 'pointer', borderRadius: 3 }}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => initOrphan(o)} disabled={busy}
                        title="Create the missing user_data row so they can sign in normally"
                        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: C.green, background: C.greenSoft, border: `1px solid ${C.green}40`, padding: '7px 12px', cursor: busy ? 'wait' : 'pointer', borderRadius: 3 }}>
                        {busy ? '…' : <><Icon name="check" size={12} /> Initialise</>}
                      </button>
                      <button onClick={() => setOrphanConfirm(o.id)} disabled={busy}
                        title="Permanently delete the auth user — they will not be able to sign in"
                        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: C.red, background: 'transparent', border: `1px solid ${C.red}40`, padding: '7px 12px', cursor: busy ? 'wait' : 'pointer', borderRadius: 3 }}>
                        <Icon name="trash" size={12} /> Delete fully
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {orphanError && (
            <p style={{ fontSize: 11, color: C.red, marginTop: 10, padding: '8px 10px', background: C.redSoft, border: `1px solid ${C.red}40`, borderRadius: 3 }}>⚠ {orphanError}</p>
          )}
        </div>
      )}

      {/* Two-column: recent signups + needs attention */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card title="Recent signups">
          {recentSignups.length === 0 ? (
            <p style={{ fontSize: 12, color: C.faint, fontStyle: 'italic' }}>No signups yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentSignups.map((u: any) => (
                <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderBottom: `0.5px solid ${C.border}` }}>
                  <Avatar name={u.profile?.name || u.profile?.email || ''} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: C.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.profile?.name || '—'}</p>
                    <p style={{ fontSize: 10, color: C.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.profile?.email}</p>
                  </div>
                  {(() => { const t = tierForUser(u); return <TierBadge tier={t.tier} comp={t.comp} />; })()}
                  <span style={{ fontSize: 10, color: C.faint, width: 38, textAlign: 'right' }}>{fmtRel(u.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card title="Needs attention">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {churnRisk.length === 0 && compExpiring.length === 0 && (
                <p style={{ fontSize: 12, color: C.faint, fontStyle: 'italic' }}>Nothing flagged · all clear</p>
              )}
              {/* Orphans flag intentionally omitted here — they get their own
                  dedicated panel above with inline Initialise / Delete actions. */}
              {churnRisk.length > 0 && (
                <div style={{ padding: '10px 12px', background: C.redSoft, border: `1px solid ${C.red}40`, borderRadius: 4 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.red, marginBottom: 4 }}>⚠ {churnRisk.length} paid user{churnRisk.length === 1 ? '' : 's'} inactive 14+ days</p>
                  <p style={{ fontSize: 11, color: C.dim, marginBottom: 8 }}>Churn risk — these accounts haven't touched the app in over two weeks.</p>
                  <button disabled title="Bulk email infra not yet built"
                    style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: C.faint, background: 'transparent', border: `1px solid ${C.border}`, padding: '5px 10px', cursor: 'not-allowed', borderRadius: 3 }}>
                    Send nudge emails (soon)
                  </button>
                </div>
              )}
              {compExpiring.length > 0 && (
                <div style={{ padding: '10px 12px', background: C.amberSoft, border: `1px solid ${C.amber}40`, borderRadius: 4 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.amber, marginBottom: 4 }}>⏳ {compExpiring.length} comp tier expiring within 7 days</p>
                </div>
              )}
            </div>
          </Card>

          <Card title="Tier breakdown">
            {(() => {
              const max = Math.max(counts.free, counts.pro, counts.kitchen, counts.group, counts.enterprise, counts.admin, 1);
              const rows: { tier: string; value: number; color: string }[] = [
                { tier: 'Free',       value: counts.free,       color: '#999' },
                { tier: 'Pro',        value: counts.pro,        color: C.gold },
                { tier: 'Kitchen',    value: counts.kitchen,    color: C.blue },
                { tier: 'Group',      value: counts.group,      color: C.purple },
                { tier: 'Enterprise', value: counts.enterprise, color: C.text },
                { tier: 'Admin',      value: counts.admin,      color: C.red },
              ];
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {rows.map(r => (
                    <div key={r.tier}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.dim, marginBottom: 3 }}>
                        <span>{r.tier}</span><span style={{ color: r.color, fontWeight: 600 }}>{r.value}</span>
                      </div>
                      <div style={{ height: 6, background: C.bg, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(r.value / max) * 100}%`, background: r.color, borderRadius: 3, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Users
// ──────────────────────────────────────────────────────────
function Users({ users, allUsers, search, setSearch, tierFilter, setTierFilter, sortBy, setSortBy, onSelect, sel, onCloseSel, onChanged }: {
  users: any[]; allUsers: any[]; search: string; setSearch: (s: string) => void;
  tierFilter: string; setTierFilter: (s: string) => void;
  sortBy: any; setSortBy: (s: any) => void;
  onSelect: (u: any) => void; sel: any; onCloseSel: () => void; onChanged: () => void;
}) {
  const [showBulk, setShowBulk] = useState(false);

  function exportCSV() {
    const headers = ['Name', 'Email', 'Tier', 'Comp', 'Created', 'Recipes', 'Costings', 'Stock', 'Menus'];
    const rows = users.map(u => [
      u.profile?.name || '', u.profile?.email || '', u.profile?.tier || 'free',
      u.profile?.comp ? 'Yes' : 'No', u.created_at,
      (u.recipes || []).length, (u.gp_history || []).length, (u.stock_items || []).length, (u.menus || []).length,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `palatable-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filterChips = [
    { id: 'all', label: 'All' },
    { id: 'free', label: 'Free' },
    { id: 'pro', label: 'Pro' },
    { id: 'kitchen', label: 'Kitchen' },
    { id: 'group', label: 'Group' },
    { id: 'enterprise', label: 'Enterprise' },
    { id: 'comp', label: 'Comp' },
    { id: 'admin', label: 'Admin' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Icon name="search" size={14} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email"
            style={{ width: '100%', background: C.panel, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, padding: '9px 12px', outline: 'none', borderRadius: 4, fontFamily: FONT, boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {filterChips.map(f => (
            <button key={f.id} onClick={() => setTierFilter(f.id)}
              style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', padding: '7px 11px', border: `1px solid ${tierFilter === f.id ? C.gold + '60' : C.border}`, background: tierFilter === f.id ? C.goldSoft : C.panel, color: tierFilter === f.id ? C.gold : C.dim, cursor: 'pointer', borderRadius: 3 }}>
              {f.label}
            </button>
          ))}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          style={{ background: C.panel, border: `1px solid ${C.border}`, color: C.dim, fontSize: 12, padding: '8px 10px', outline: 'none', borderRadius: 4, fontFamily: FONT, cursor: 'pointer' }}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="recipes">Most recipes</option>
          <option value="costings">Most costings</option>
        </select>
        <button onClick={() => setShowBulk(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: C.gold, background: C.goldSoft, border: `1px solid ${C.gold}40`, padding: '8px 12px', cursor: 'pointer', borderRadius: 3 }}>
          <Icon name="mail" size={14} /> Bulk email
        </button>
        <button onClick={exportCSV}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: C.dim, background: C.panel, border: `1px solid ${C.border}`, padding: '8px 12px', cursor: 'pointer', borderRadius: 3 }}>
          <Icon name="download" size={14} /> CSV
        </button>
      </div>

      {/* Results table */}
      <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '40px 2fr 2.5fr 90px 80px 100px', gap: 10, padding: '10px 16px', background: C.bg, borderBottom: `1px solid ${C.border}` }}>
          {['', 'Name', 'Email', 'Tier', 'Recipes', 'Joined'].map(h => (
            <p key={h || 'spacer'} style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: C.faint }}>{h}</p>
          ))}
        </div>
        {users.length === 0 ? (
          <p style={{ fontSize: 12, color: C.faint, padding: 20, textAlign: 'center', fontStyle: 'italic' }}>No users match</p>
        ) : users.map((u: any) => (
          <button key={u.user_id} onClick={() => onSelect(u)}
            style={{ display: 'grid', gridTemplateColumns: '40px 2fr 2.5fr 90px 80px 100px', gap: 10, padding: '10px 16px', alignItems: 'center', borderBottom: `0.5px solid ${C.border}`, background: sel?.user_id === u.user_id ? C.goldSoft : C.panel, border: 'none', borderLeft: sel?.user_id === u.user_id ? `3px solid ${C.gold}` : '3px solid transparent', cursor: 'pointer', width: '100%', textAlign: 'left', borderRight: 'none' }}>
            <Avatar name={u.profile?.name || u.profile?.email || ''} size={28} />
            <span style={{ fontSize: 13, color: C.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.profile?.name || '—'}</span>
            <span style={{ fontSize: 12, color: C.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.profile?.email}</span>
            {(() => { const t = tierForUser(u); return <TierBadge tier={t.tier} comp={t.comp} />; })()}
            <span style={{ fontSize: 12, color: C.dim }}>{(u.recipes || []).length}</span>
            <span style={{ fontSize: 11, color: C.faint }}>{fmtRel(u.created_at)}</span>
          </button>
        ))}
      </div>

      {sel && <UserDetail user={sel} onClose={onCloseSel} onChanged={onChanged} />}
      {showBulk && <BulkEmail users={allUsers} onClose={() => setShowBulk(false)} />}
    </div>
  );
}

// ── User detail slideout ────────────────────────────────
function UserDetail({ user, onClose, onChanged }: { user: any; onClose: () => void; onChanged: () => void }) {
  const [tier, setTier] = useState(user.profile?.tier || 'free');
  const [comp, setComp] = useState(!!user.profile?.comp);
  const [expiry, setExpiry] = useState(user.profile?.compExpiresAt || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showSnap, setShowSnap] = useState(false);

  // Per-user feature flag overrides — stored on profile
  const userFlags = user.profile?.featureOverrides || {};
  const [flags, setFlags] = useState<Record<string, boolean | null>>(userFlags);

  // Demo tools — seed showcase data
  const [seedConfirm, setSeedConfirm] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [seedSummary, setSeedSummary] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    fetch('/api/admin/seed-showcase', { headers: { Authorization: `Bearer ${ADMIN_PASSWORD}` } })
      .then(r => r.json()).then(j => setSeedSummary(j.summary || null)).catch(() => {});
  }, []);

  async function seedShowcase() {
    setSeeding(true);
    setSeedMsg(null);
    try {
      const res = await fetch('/api/admin/seed-showcase', {
        method: 'POST',
        headers: { Authorization: `Bearer ${ADMIN_PASSWORD}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.user_id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'seed failed');
      setSeedMsg({ kind: 'ok', text: 'Seeded — refresh the app to see it.' });
      setSeedConfirm(false);
      onChanged();
    } catch (e: any) {
      setSeedMsg({ kind: 'err', text: e?.message || 'failed' });
    }
    setSeeding(false);
  }

  async function saveTier() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${user.user_id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${ADMIN_PASSWORD}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, comp, compExpiresAt: expiry || null, featureOverrides: flags }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'save failed');
      setMsg({ kind: 'ok', text: 'Saved' });
      onChanged();
    } catch (e: any) { setMsg({ kind: 'err', text: e?.message || 'failed' }); }
    setSaving(false);
  }

  async function doDelete() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.user_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ADMIN_PASSWORD}` },
      });
      if (res.ok) { onClose(); onChanged(); }
      else setMsg({ kind: 'err', text: 'Delete failed' });
    } catch (e: any) { setMsg({ kind: 'err', text: e?.message || 'failed' }); }
    setSaving(false);
  }

  const stats = [
    { label: 'Recipes',   value: (user.recipes || []).length },
    { label: 'Costings',  value: (user.gp_history || []).length },
    { label: 'Stock',     value: (user.stock_items || []).length },
    { label: 'Invoices',  value: (user.invoices || []).length },
    { label: 'Menus',     value: (user.menus || []).length },
    { label: 'Notes',     value: (user.notes || []).length },
    { label: 'Waste',     value: (user.waste_log || []).length },
  ];

  const PER_USER_FLAGS = [
    { key: 'aiInvoiceScan', label: 'AI invoice scan' },
    { key: 'aiSpecSheet',   label: 'AI spec-sheet scan' },
    { key: 'csvExport',     label: 'CSV export' },
    { key: 'publicMenus',   label: 'Public menus' },
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.18)', zIndex: 50 }} />
      <aside style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, background: C.panel, borderLeft: `1px solid ${C.border}`, boxShadow: '-8px 0 30px rgba(0,0,0,0.08)', zIndex: 51, overflow: 'auto', fontFamily: FONT }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: C.faint }}>User detail</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.faint, cursor: 'pointer', display: 'flex' }}><Icon name="close" size={18} /></button>
        </div>

        <div style={{ padding: 18 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
            <Avatar name={user.profile?.name || user.profile?.email || ''} size={48} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 20, color: C.text, lineHeight: 1.2 }}>{user.profile?.name || '—'}</p>
              <p style={{ fontSize: 11, color: C.faint, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.profile?.email}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                {(() => { const t = tierForUser(user); return <TierBadge tier={t.tier} comp={t.comp} />; })()}
                <span style={{ fontSize: 10, color: C.faint }}>· last active {fmtRel(user.updated_at)}</span>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 16 }}>
            {stats.slice(0, 4).map(s => (
              <div key={s.label} style={{ padding: '8px 10px', background: C.bg, borderRadius: 4, textAlign: 'center' }}>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 300, color: C.text }}>{s.value}</p>
                <p style={{ fontSize: 9, color: C.faint, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</p>
              </div>
            ))}
            {stats.slice(4).map(s => (
              <div key={s.label} style={{ padding: '8px 10px', background: C.bg, borderRadius: 4, textAlign: 'center' }}>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 300, color: C.text }}>{s.value}</p>
                <p style={{ fontSize: 9, color: C.faint, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: C.faint, marginBottom: 6, marginTop: 12 }}>Quick actions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
            <ActionRow icon="eye"     label="View as this user"   onClick={() => alert('Impersonate flow not yet wired — would set a viewingAs cookie and redirect to /app')} />
            <ActionRow icon="key"     label="Send password reset" onClick={() => alert('Password reset endpoint not yet wired — would call supabase.auth.admin.generateLink')} />
            <ActionRow icon="message" label="Send in-app message" onClick={() => alert('In-app message store not yet wired — would persist to user_data.adminMessages')} />
            <ActionRow icon="external" label="Open in Stripe"
              onClick={() => {
                const cust = user.profile?.stripe_customer || (user as any).user_metadata?.stripe_customer;
                if (cust) window.open(`https://dashboard.stripe.com/customers/${cust}`, '_blank');
                else alert('No Stripe customer ID on file');
              }} />
            <ActionRow icon="eye" label="View data snapshot" onClick={() => setShowSnap(true)} />
          </div>

          {/* Tier override */}
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: C.faint, marginBottom: 6 }}>Tier override</p>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            <select value={tier} onChange={e => setTier(e.target.value)}
              style={{ background: C.panel, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, padding: '8px 10px', outline: 'none', borderRadius: 4, fontFamily: FONT, cursor: 'pointer', flex: 1 }}>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="kitchen">Kitchen</option>
              <option value="group">Group</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.dim, cursor: 'pointer' }}>
              <input type="checkbox" checked={comp} onChange={e => setComp(e.target.checked)} /> Comp
            </label>
          </div>
          {comp && (
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, color: C.faint, display: 'block', marginBottom: 4 }}>Comp expires (optional)</label>
              <input type="date" value={(expiry || '').slice(0, 10)} onChange={e => setExpiry(e.target.value)}
                style={{ width: '100%', background: C.panel, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, padding: '8px 10px', outline: 'none', borderRadius: 4, fontFamily: FONT, boxSizing: 'border-box' }} />
            </div>
          )}

          {/* Per-user feature flag overrides */}
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: C.faint, marginBottom: 6, marginTop: 14 }}>Feature overrides</p>
          <p style={{ fontSize: 10, color: C.faint, marginBottom: 8 }}>Override global flags for this user only — leave unset to follow global default.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
            {PER_USER_FLAGS.map(f => {
              const v = flags[f.key];
              return (
                <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 4px' }}>
                  <span style={{ fontSize: 12, color: C.text }}>{f.label}</span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {(['on', 'off', 'auto'] as const).map(o => {
                      const onSel = (o === 'on' && v === true) || (o === 'off' && v === false) || (o === 'auto' && (v === undefined || v === null));
                      return (
                        <button key={o}
                          onClick={() => setFlags({ ...flags, [f.key]: o === 'on' ? true : o === 'off' ? false : null })}
                          style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', padding: '3px 6px', border: `1px solid ${onSel ? C.gold + '60' : C.border}`, background: onSel ? C.goldSoft : 'transparent', color: onSel ? C.gold : C.faint, cursor: 'pointer', borderRadius: 2 }}>
                          {o}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={saveTier} disabled={saving}
            style={{ width: '100%', background: C.gold, color: '#fff', border: 'none', padding: '9px 14px', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', cursor: saving ? 'wait' : 'pointer', borderRadius: 3, marginBottom: 8 }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {msg && (
            <p style={{ fontSize: 11, color: msg.kind === 'ok' ? C.green : C.red, marginBottom: 8, textAlign: 'center' }}>{msg.text}</p>
          )}

          {/* Demo tools — seed showcase data into this user's account so the
              live app demos with every feature populated. Destructive (replaces
              all entity arrays) so gated behind a confirm step. */}
          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 14, paddingTop: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: C.gold, marginBottom: 6 }}>Demo tools</p>
            <p style={{ fontSize: 11, color: C.faint, marginBottom: 8, lineHeight: 1.5 }}>
              Replace this user&apos;s data with the canonical showcase set
              {seedSummary && (
                <>
                  {' '}({seedSummary.recipes} recipes · {seedSummary.costings} costings · {seedSummary.bank} bank · {seedSummary.stock} stock · {seedSummary.invoices} invoices · {seedSummary.menus} menus · {seedSummary.notes} notes · {seedSummary.waste} waste)
                </>
              )}.
            </p>
            {seedConfirm ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={seedShowcase} disabled={seeding}
                  style={{ flex: 1, background: C.gold, color: '#fff', border: 'none', padding: '8px 10px', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', cursor: seeding ? 'wait' : 'pointer', borderRadius: 3 }}>
                  {seeding ? 'Seeding…' : 'Replace data — confirm'}
                </button>
                <button onClick={() => { setSeedConfirm(false); setSeedMsg(null); }} disabled={seeding}
                  style={{ background: 'transparent', color: C.dim, border: `1px solid ${C.border}`, padding: '8px 10px', fontSize: 11, cursor: seeding ? 'wait' : 'pointer', borderRadius: 3 }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setSeedConfirm(true)}
                style={{ width: '100%', background: C.goldSoft, color: C.gold, border: `1px solid ${C.gold}40`, padding: '8px 10px', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', cursor: 'pointer', borderRadius: 3 }}>
                ✨ Seed showcase data
              </button>
            )}
            {seedMsg && (
              <p style={{ fontSize: 11, color: seedMsg.kind === 'ok' ? C.green : C.red, marginTop: 8, textAlign: 'center' }}>{seedMsg.text}</p>
            )}
          </div>

          {/* Danger zone */}
          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 14, paddingTop: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: C.red, marginBottom: 6 }}>Danger zone</p>
            {confirmDelete ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={doDelete} disabled={saving}
                  style={{ flex: 1, background: C.red, color: '#fff', border: 'none', padding: '8px 10px', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', cursor: 'pointer', borderRadius: 3 }}>
                  Confirm delete
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  style={{ background: 'transparent', color: C.dim, border: `1px solid ${C.border}`, padding: '8px 10px', fontSize: 11, cursor: 'pointer', borderRadius: 3 }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                style={{ width: '100%', background: 'transparent', color: C.red, border: `1px solid ${C.red}40`, padding: '8px 10px', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', cursor: 'pointer', borderRadius: 3 }}>
                <Icon name="trash" size={12} /> Delete account
              </button>
            )}
          </div>
        </div>
      </aside>

      {showSnap && <SnapshotModal user={user} onClose={() => setShowSnap(false)} />}
    </>
  );
}

function ActionRow({ icon, label, onClick, disabled }: { icon: string; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'transparent', border: `1px solid ${C.border}`, color: disabled ? C.faint : C.text, fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer', borderRadius: 3, width: '100%', textAlign: 'left', opacity: disabled ? 0.5 : 1 }}>
      <Icon name={icon} size={14} /> {label}
    </button>
  );
}

function SnapshotModal({ user, onClose }: { user: any; onClose: () => void }) {
  const json = JSON.stringify({
    user_id: user.user_id,
    account_id: user.account_id,
    profile: user.profile,
    counts: {
      recipes: (user.recipes || []).length,
      costings: (user.gp_history || []).length,
      stockItems: (user.stock_items || []).length,
      invoices: (user.invoices || []).length,
      menus: (user.menus || []).length,
      notes: (user.notes || []).length,
      waste: (user.waste_log || []).length,
    },
  }, null, 2);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.panel, borderRadius: 6, width: '100%', maxWidth: 700, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 600 }}>Data snapshot · {user.profile?.email}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Icon name="close" /></button>
        </div>
        <pre style={{ flex: 1, overflow: 'auto', padding: 18, fontSize: 12, fontFamily: 'monospace', color: C.text, background: C.bg }}>{json}</pre>
      </div>
    </div>
  );
}

function BulkEmail({ users, onClose }: { users: any[]; onClose: () => void }) {
  const [aud, setAud] = useState<'all' | 'free' | 'pro' | 'kitchen' | 'group' | 'enterprise'>('all');
  const filtered = useMemo(() => {
    if (aud === 'all') return users.filter(u => !isAdminUser(u));
    return users.filter(u => !isAdminUser(u) && (u.profile?.tier || 'free') === aud);
  }, [users, aud]);
  const emails = filtered.map(u => u.profile?.email).filter(Boolean).join(',');

  function openMailto() {
    const subject = encodeURIComponent('Palatable · update');
    window.location.href = `mailto:?bcc=${encodeURIComponent(emails)}&subject=${subject}`;
  }
  function copyEmails() {
    try { navigator.clipboard?.writeText(emails); } catch {}
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.panel, borderRadius: 6, width: '100%', maxWidth: 480, padding: 22 }}>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 300, marginBottom: 4 }}>Bulk email</p>
        <p style={{ fontSize: 12, color: C.faint, marginBottom: 14 }}>Pick an audience — opens your mail client with the addresses in BCC.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginBottom: 14 }}>
          {(['all', 'free', 'pro', 'kitchen', 'group', 'enterprise'] as const).map(o => (
            <button key={o} onClick={() => setAud(o)}
              style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', padding: '8px 6px', border: `1px solid ${aud === o ? C.gold + '60' : C.border}`, background: aud === o ? C.goldSoft : 'transparent', color: aud === o ? C.gold : C.dim, cursor: 'pointer', borderRadius: 3 }}>
              {o}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: C.dim, marginBottom: 14 }}>{filtered.length} recipient{filtered.length === 1 ? '' : 's'} selected</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'transparent', color: C.dim, border: `1px solid ${C.border}`, padding: '8px 14px', fontSize: 12, cursor: 'pointer', borderRadius: 3 }}>Cancel</button>
          <button onClick={copyEmails} disabled={filtered.length === 0} style={{ background: 'transparent', color: C.dim, border: `1px solid ${C.border}`, padding: '8px 14px', fontSize: 12, cursor: filtered.length === 0 ? 'not-allowed' : 'pointer', borderRadius: 3, opacity: filtered.length === 0 ? 0.5 : 1 }}>Copy addresses</button>
          <button onClick={openMailto} disabled={filtered.length === 0} style={{ background: C.gold, color: '#fff', border: 'none', padding: '8px 14px', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', cursor: filtered.length === 0 ? 'not-allowed' : 'pointer', borderRadius: 3, opacity: filtered.length === 0 ? 0.5 : 1 }}>Open mail client</button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Revenue
// ──────────────────────────────────────────────────────────
// Per-tier cost-of-serve assumptions used by the unit economics table + the
// MRR cost subtraction. Calibrated against the Infrastructure dashboard's
// £0.74/paid-user/mo Anthropic estimate (from the £74/100 paid users scale
// row). Free users incur ~no variable cost since AI is gated to Pro+; the
// step-up at Kitchen/Group reflects more scans per user as team activity
// rises. Revise once real Anthropic-usage actuals from the metering table
// give us per-tier numbers to anchor against.
const TIER_COST_PER_USER: Record<'free' | 'pro' | 'kitchen' | 'group', number> = {
  free: 0.05,
  pro: 0.74,
  kitchen: 1.50,
  group: 3.50,
};
const TIER_PRICE: Record<'pro' | 'kitchen' | 'group', number> = {
  pro: 25,
  kitchen: 59,
  group: 129,
};
// Real fixed cost today is M365 Business Basic at £5.75/mo. Vercel, Supabase
// and Cloudflare are on free tier. Bumps to £25.75 after the Vercel Pro
// upgrade in July 2026, and again when Supabase Pro kicks in around 500
// paid users. See the Infrastructure dashboard for the full breakdown.
const FIXED_INFRA_COST = 5.75;

function Revenue({ users }: { users: any[] }) {
  const { mrr, counts } = useMemo(() => computeMrr(users), [users]);
  const arr = mrr * 12;
  const paid = counts.pro + counts.kitchen + counts.group + counts.enterprise;

  // Variable per-user infra. Free users incur ~no variable cost (AI gated
  // to Pro+); paid users contribute Anthropic spend scaled per tier.
  // Enterprise is custom-priced and tracked outside this estimator, so
  // contributes £0 to the cost side here — match it manually against the
  // ACV stored per deal.
  const variableCost = counts.free * TIER_COST_PER_USER.free
                     + counts.pro * TIER_COST_PER_USER.pro
                     + counts.kitchen * TIER_COST_PER_USER.kitchen
                     + counts.group * TIER_COST_PER_USER.group;
  const totalCost = FIXED_INFRA_COST + variableCost;
  const grossMargin = mrr - totalCost;
  // Margin % is undefined when there's no revenue — keep it null and the
  // tile renders an em-dash rather than a misleading 0.0%.
  const marginPct: number | null = mrr > 0 ? (grossMargin / mrr) * 100 : null;

  // Per-tier table filter — defaults to All. Changing this scopes which
  // rows the table shows; the bottom total row stays as the overall total.
  const [revenueFilter, setRevenueFilter] = useState<'all' | 'free' | 'pro' | 'kitchen' | 'group' | 'enterprise' | 'admin'>('all');

  // ── Enterprise quote calculator ──
  const [outlets, setOutlets] = useState(10);
  const [usersPerOutlet, setUsersPerOutlet] = useState(5);
  const [invoicesPerMonth, setInvoicesPerMonth] = useState(100);
  const [aiScansPerMonth, setAiScansPerMonth] = useState(80);
  const [supportTier, setSupportTier] = useState<'standard' | 'priority' | 'dam'>('standard');
  const supportCost = supportTier === 'priority' ? 200 : supportTier === 'dam' ? 500 : 0;
  const supportLabel = supportTier === 'priority' ? 'Priority (+£200/mo)' : supportTier === 'dam' ? 'Dedicated AM (+£500/mo)' : 'Standard (included)';

  const totalUsers = outlets * usersPerOutlet;
  const infraCost = 45 + outlets * 2.5 + outlets * usersPerOutlet * 0.10 + aiScansPerMonth * 0.80 + supportCost;
  const minViablePrice = infraCost * 4;
  const suggestedPrice = infraCost * 6;
  const annualValue = suggestedPrice * 12;
  const quoteMarginPct = suggestedPrice > 0 ? ((suggestedPrice - infraCost) / suggestedPrice) * 100 : 0;
  const pricePerUser = totalUsers > 0 ? suggestedPrice / totalUsers : 0;

  // Per-tier breakdown row. Admins sit alongside the customer tiers but
  // contribute £0 on both axes — internal accounts, no cost-of-serve count.
  // Enterprise is custom-priced (POA) and ACV tracked outside this dashboard,
  // so we show its count but flag the £ columns as 'custom'.
  const tierRows: {
    key: 'free' | 'pro' | 'kitchen' | 'group' | 'enterprise' | 'admin';
    name: string;
    count: number;
    unitPrice: number;
    unitCost: number;
    custom?: boolean;
  }[] = [
    { key: 'free',       name: 'Free',       count: counts.free,       unitPrice: 0,                  unitCost: TIER_COST_PER_USER.free },
    { key: 'pro',        name: 'Pro',        count: counts.pro,        unitPrice: TIER_PRICE.pro,     unitCost: TIER_COST_PER_USER.pro },
    { key: 'kitchen',    name: 'Kitchen',    count: counts.kitchen,    unitPrice: TIER_PRICE.kitchen, unitCost: TIER_COST_PER_USER.kitchen },
    { key: 'group',      name: 'Group',      count: counts.group,      unitPrice: TIER_PRICE.group,   unitCost: TIER_COST_PER_USER.group },
    { key: 'enterprise', name: 'Enterprise', count: counts.enterprise, unitPrice: 0,                  unitCost: 0,                          custom: true },
    { key: 'admin',      name: 'Admin',      count: counts.admin,      unitPrice: 0,                  unitCost: 0 },
  ];

  function SliderRow({ label, value, setValue, min, max, step = 1, unit = '' }: {
    label: string; value: number; setValue: (n: number) => void; min: number; max: number; step?: number; unit?: string;
  }) {
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.dim }}>{label}</span>
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={e => {
              const n = Number(e.target.value);
              if (!Number.isFinite(n)) return;
              setValue(Math.max(min, Math.min(max, n)));
            }}
            style={{ width: 80, padding: '4px 8px', fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 3, textAlign: 'right', background: C.panel, color: C.text, fontFamily: FONT }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => setValue(Number(e.target.value))}
          style={{ width: '100%', accentColor: C.gold }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.faint, marginTop: 2 }}>
          <span>{min}{unit}</span>
          <span>{max}{unit}</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 26, marginBottom: 6 }}>Revenue</h1>
      <p style={{ fontSize: 12, color: C.faint, marginBottom: 18 }}>Unit economics + enterprise quote calculator. Cost assumptions are estimates — revise once real invoice data is in.</p>

      {/* Part A — Unit economics overview */}
      <div style={{ marginBottom: 22 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: C.faint, marginBottom: 10 }}>Unit economics</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
          <StatTile label="MRR"            value={`£${mrr.toLocaleString()}`} sub="per month" accent={C.gold} />
          <StatTile label="ARR"            value={`£${arr.toLocaleString()}`} sub="annualised" accent={C.gold} />
          <StatTile label="Paid users"     value={paid} sub={`${counts.pro} pro · ${counts.kitchen} kit · ${counts.group} grp · ${counts.enterprise} ent`} />
          <StatTile
            label="Gross margin (est.)"
            value={`£${Math.round(grossMargin).toLocaleString()}`}
            sub={`${marginPct == null ? '—' : marginPct.toFixed(1) + '%'} · MRR less ~£${totalCost.toFixed(2)} infra`}
            accent={grossMargin >= 0 ? C.green : C.red}
          />
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
          {([
            { id: 'all',        label: 'All' },
            { id: 'free',       label: 'Free' },
            { id: 'pro',        label: 'Pro' },
            { id: 'kitchen',    label: 'Kitchen' },
            { id: 'group',      label: 'Group' },
            { id: 'enterprise', label: 'Enterprise' },
            { id: 'admin',      label: 'Admin' },
          ] as const).map(f => {
            const active = revenueFilter === f.id;
            return (
              <button key={f.id} onClick={() => setRevenueFilter(f.id)}
                style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', padding: '7px 11px', border: `1px solid ${active ? C.gold + '60' : C.border}`, background: active ? C.goldSoft : C.panel, color: active ? C.gold : C.dim, cursor: 'pointer', borderRadius: 3 }}>
                {f.label}
              </button>
            );
          })}
        </div>

        <Card title="Per-tier cost & margin">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ color: C.faint, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                <th style={{ textAlign: 'left',  padding: '6px 8px', fontWeight: 700 }}>Tier</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700 }}>Users</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700 }}>Monthly £</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700 }}>Cost / user</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700 }}>Tier cost</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700 }}>Margin £</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700 }}>Margin %</th>
              </tr>
            </thead>
            <tbody>
              {tierRows.filter(r => revenueFilter === 'all' || r.key === revenueFilter).map(r => {
                const rev = r.count * r.unitPrice;
                const cost = r.count * r.unitCost;
                const margin = rev - cost;
                const pct = rev > 0 ? (margin / rev) * 100 : null;
                if (r.custom) {
                  return (
                    <tr key={r.key} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: '8px', color: C.text, fontWeight: 500 }}>{r.name}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: C.dim }}>{r.count}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: C.faint, fontStyle: 'italic' }} colSpan={5}>
                        Custom — ACV tracked per deal
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={r.key} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '8px', color: C.text, fontWeight: 500 }}>{r.name}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: C.dim }}>{r.count}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: C.text }}>£{rev.toLocaleString()}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: C.faint }}>£{r.unitCost.toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: C.faint }}>£{cost.toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: margin >= 0 ? C.green : C.red, fontWeight: 600 }}>£{margin.toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: pct == null ? C.faint : pct >= 70 ? C.green : pct >= 0 ? C.amber : C.red, fontWeight: 600 }}>
                      {pct == null ? '—' : `${pct.toFixed(1)}%`}
                    </td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: `2px solid ${C.border}`, background: C.bg }}>
                <td style={{ padding: '8px', color: C.text, fontWeight: 700 }}>Total + fixed</td>
                <td style={{ padding: '8px', textAlign: 'right', color: C.text, fontWeight: 700 }}>{users.length}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: C.gold, fontWeight: 700 }}>£{mrr.toLocaleString()}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: C.faint }}>—</td>
                <td style={{ padding: '8px', textAlign: 'right', color: C.faint }}>£{totalCost.toFixed(2)}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: grossMargin >= 0 ? C.green : C.red, fontWeight: 700 }}>£{Math.round(grossMargin).toLocaleString()}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: marginPct == null ? C.faint : marginPct >= 70 ? C.green : marginPct >= 0 ? C.amber : C.red, fontWeight: 700 }}>
                  {marginPct == null ? '—' : `${marginPct.toFixed(1)}%`}
                </td>
              </tr>
            </tbody>
          </table>
          <p style={{ fontSize: 10, color: C.faint, marginTop: 10, fontStyle: 'italic' }}>
            Fixed infra cost £{FIXED_INFRA_COST.toFixed(2)}/mo (M365 only — Vercel, Supabase and Cloudflare are free tier). Variable cost per user as shown — calibrated against the Infrastructure dashboard&apos;s £0.74/paid-user Anthropic estimate. Margin % shown as &mdash; when MRR is zero (ratio undefined).
          </p>
        </Card>
      </div>

      {/* Part B — Enterprise quote calculator */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: C.faint, marginBottom: 10 }}>Enterprise quote calculator</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Card title="Deal inputs">
            <SliderRow label="Number of outlets"        value={outlets}          setValue={setOutlets}          min={1}  max={100} />
            <SliderRow label="Users per outlet"          value={usersPerOutlet}   setValue={setUsersPerOutlet}   min={1}  max={50} />
            <SliderRow label="Invoices per month total"  value={invoicesPerMonth} setValue={setInvoicesPerMonth} min={10} max={1000} step={10} />
            <SliderRow label="AI scans per month total"  value={aiScansPerMonth}  setValue={setAiScansPerMonth}  min={0}  max={500} step={5} />
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: C.dim, marginBottom: 6 }}>Support tier</p>
              <select value={supportTier} onChange={e => setSupportTier(e.target.value as any)}
                style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 3, background: C.panel, color: C.text, fontFamily: FONT }}>
                <option value="standard">Standard (included)</option>
                <option value="priority">Priority (+£200/mo)</option>
                <option value="dam">Dedicated account manager (+£500/mo)</option>
              </select>
            </div>
            <div style={{ marginTop: 14, padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3, fontSize: 11, color: C.dim }}>
              <p style={{ marginBottom: 4 }}><strong style={{ color: C.text }}>Total users:</strong> {totalUsers}</p>
              <p><strong style={{ color: C.text }}>Support:</strong> {supportLabel}</p>
            </div>
          </Card>

          <Card title="Quote">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
              <StatTile label="Infra cost / mo" value={`£${Math.round(infraCost).toLocaleString()}`} sub="estimated" />
              <StatTile label="Min viable" value={`£${Math.round(minViablePrice).toLocaleString()}`} sub="4× cost" />
              <StatTile label="Suggested quote / mo" value={`£${Math.round(suggestedPrice).toLocaleString()}`} sub="6× cost" accent={C.gold} />
              <StatTile label="Annual contract value" value={`£${Math.round(annualValue).toLocaleString()}`} sub="suggested × 12" accent={C.gold} />
              <StatTile label="Gross margin %" value={`${quoteMarginPct.toFixed(1)}%`} sub="at suggested price" accent={quoteMarginPct >= 70 ? C.green : C.amber} />
              <StatTile label="Price / user / mo" value={`£${pricePerUser.toFixed(2)}`} sub={`${totalUsers} users total`} />
            </div>
            <div style={{ padding: '10px 12px', background: C.goldSoft, border: `1px solid ${C.gold}40`, borderRadius: 3, fontSize: 11, color: C.dim, lineHeight: 1.5 }}>
              <p><strong style={{ color: C.gold }}>Pricing rule:</strong> Min viable = 4× infrastructure cost. Suggested quote = 6× cost (83% gross margin target).</p>
              <p style={{ marginTop: 4 }}>Formula: base £45 + outlets × £2.50 + users × £0.10 + AI scans × £0.80 + support tier.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Infrastructure
// ──────────────────────────────────────────────────────────
// Snapshot of every paid + free service the platform runs on. All numbers
// are hardcoded estimates EXCEPT the Supabase auth-user count (passed in
// from the live admin load). Per the brief — do not query any application
// data tables to keep the dashboard honest about cost, not seeded demos.

function ProgressBar({ value, max, color, est }: { value: number; max: number; color: string; est?: boolean }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.dim, marginBottom: 3 }}>
        <span>{value.toLocaleString()}{est ? ' est.' : ''} / {max.toLocaleString()}</span>
        <span style={{ color, fontWeight: 600 }}>{pct.toFixed(pct < 1 ? 2 : 1)}%</span>
      </div>
      <div style={{ height: 6, background: C.bg, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function StatusChip({ label, tone }: { label: string; tone: 'green' | 'amber' | 'blue' | 'red' }) {
  const map = {
    green: { fg: C.green, bg: C.greenSoft, bd: C.green + '40' },
    amber: { fg: C.amber, bg: C.amberSoft, bd: C.amber + '40' },
    blue:  { fg: C.blue,  bg: C.blueSoft,  bd: C.blue + '40' },
    red:   { fg: C.red,   bg: C.redSoft,   bd: C.red + '40' },
  };
  const t = map[tone];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: t.fg, background: t.bg, border: `1px solid ${t.bd}`, padding: '3px 9px', borderRadius: 2, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function ServiceCard({ title, plan, cost, costColor, status, statusTone, progress, warning, note, fullWidth }: {
  title: string;
  plan: string;
  cost: string;
  costColor?: string;
  status: string;
  statusTone: 'green' | 'amber' | 'blue' | 'red';
  progress?: React.ReactNode;
  warning?: string;
  note?: string;
  fullWidth?: boolean;
}) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 18, gridColumn: fullWidth ? '1 / -1' : 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>{title}</p>
          <p style={{ fontSize: 11, color: C.faint, lineHeight: 1.5 }}>{plan}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <p style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 22, color: costColor || C.text, lineHeight: 1 }}>{cost}</p>
          <StatusChip label={status} tone={statusTone} />
        </div>
      </div>
      {progress && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {progress}
        </div>
      )}
      {warning && (
        <div style={{ marginTop: 12, padding: '8px 12px', background: C.amberSoft, border: `1px solid ${C.amber}40`, borderLeft: `3px solid ${C.amber}`, borderRadius: 3, fontSize: 11, color: C.dim, lineHeight: 1.5 }}>
          ⚠ {warning}
        </div>
      )}
      {note && (
        <p style={{ fontSize: 11, color: C.faint, marginTop: 12, fontStyle: 'italic', lineHeight: 1.5 }}>{note}</p>
      )}
    </div>
  );
}

function Infrastructure({ authUserCount, users }: { authUserCount: number; users: any[] }) {
  const SUPABASE_AUTH_LIMIT = 50000;
  const supabaseAuthPct = (authUserCount / SUPABASE_AUTH_LIMIT) * 100;

  // Live paid-user count drives the baseline Anthropic estimate. Free users
  // generate £0 (AI is gated to Pro+); admins and comp users are excluded.
  const paidUsers = useMemo(() => users.filter(u =>
    !isAdminUser(u)
    && ['pro', 'kitchen', 'group', 'enterprise'].includes(u.profile?.tier)
    && !u.profile?.comp
  ).length, [users]);

  // Estimate: £0.74/paid-user/mo (extrapolated from 100 paid users → £74/mo).
  const ANTHROPIC_PER_PAID_USER = 0.74;
  const estimatedMonthlyAnthropic = paidUsers * ANTHROPIC_PER_PAID_USER;

  // Actual usage — fetched live from /api/admin/anthropic-usage, falls back
  // to zeros until the migration runs and traffic flows. last7Days and
  // last30Days are pence totals; we convert to £ for display.
  const [usage, setUsage] = useState<{ last7Days: { totalPence: number; count: number; byKind: Record<string, { count: number; pence: number }> }; last30Days: { totalPence: number; count: number; byKind: Record<string, { count: number; pence: number }> }; tableMissing?: boolean } | null>(null);
  useEffect(() => {
    fetch('/api/admin/anthropic-usage', { headers: { Authorization: `Bearer ${ADMIN_PASSWORD}` } })
      .then(r => r.json())
      .then(setUsage)
      .catch(() => setUsage({ last7Days: { totalPence: 0, count: 0, byKind: {} }, last30Days: { totalPence: 0, count: 0, byKind: {} } }));
  }, []);
  const last7Pounds  = (usage?.last7Days.totalPence  ?? 0) / 100;
  const last30Pounds = (usage?.last30Days.totalPence ?? 0) / 100;
  // Project last 7 days × 52/12 to get a 30-day-equivalent comparison number.
  const projected30FromWeekly = last7Pounds * (30 / 7);

  // Total monthly cost — fixed M365 + variable Anthropic. Variable is shown
  // as the rolling-7-day projection if we have data, else the estimate.
  const fixedCost = 5.75;
  const variableCost = last7Pounds > 0 ? projected30FromWeekly : estimatedMonthlyAnthropic;
  const totalMonthlyCost = fixedCost + variableCost;

  const breakdown = [
    { service: 'Supabase',      plan: 'Free',           type: 'Fixed',    cost: '£0',     trigger: '~500 users storage', upgrade: '£25/mo Pro' },
    { service: 'Vercel',        plan: 'Hobby',          type: 'Fixed',    cost: '£0 (warning)', trigger: 'July 2026 ToS', upgrade: '£20/mo Pro', warn: true },
    { service: 'Cloudflare',    plan: 'Free',           type: 'Fixed',    cost: '£0',     trigger: '100k req/day',       upgrade: '£20/mo Pro' },
    { service: 'Microsoft 365', plan: 'Business Basic', type: 'Fixed',    cost: '£5.75',  trigger: 'More mailboxes',     upgrade: '£4.50/user/mo' },
    { service: 'Anthropic API', plan: 'Pay per use',    type: 'Variable', cost: `£${variableCost.toFixed(2)}`, trigger: 'Scales with scans',  upgrade: '~£0.80/scan' },
    { service: 'GitHub',        plan: 'Free',           type: 'Fixed',    cost: '£0',     trigger: 'Never for 1 org',    upgrade: '—' },
  ];

  // Anthropic scale projections. First row is live (current paid users);
  // remaining rows stay as fixed projections to give a sense of headroom.
  const anthropicScale = [
    { users: paidUsers === 0
        ? 'No paid users yet (baseline)'
        : `${paidUsers} paid user${paidUsers === 1 ? '' : 's'} today`,
      cost: paidUsers === 0 ? '£0/mo' : `~£${estimatedMonthlyAnthropic.toFixed(0)}/mo est.`,
      live: true },
    { users: '100 paid users',   cost: '~£74/mo est.'  },
    { users: '250 paid users',   cost: '~£185/mo est.' },
    { users: '500 paid users',   cost: '~£370/mo est.' },
    { users: '1,000 paid users', cost: '~£740/mo est.' },
  ];

  return (
    <div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 26, marginBottom: 6 }}>Infrastructure</h1>
      <p style={{ fontSize: 12, color: C.faint, marginBottom: 18 }}>What we run on, what it costs, and where the next upgrade trigger sits. All figures are hardcoded estimates except the live Supabase auth-user count.</p>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
        <StatTile label="Fixed infrastructure" value={`£${fixedCost.toFixed(2)}/mo`} sub="M365 only — rest free tier" />
        <StatTile
          label="Variable cost (Anthropic)"
          value={`£${variableCost.toFixed(2)}/mo`}
          sub={last7Pounds > 0
            ? `actual · ${usage?.last7Days.count ?? 0} calls last 7d, projected`
            : `estimate · ${paidUsers} paid user${paidUsers === 1 ? '' : 's'}`}
          accent={C.amber}
        />
        <StatTile label="Total monthly cost" value={`£${totalMonthlyCost.toFixed(2)}/mo`} sub="fixed + variable" accent={C.gold} />
        <StatTile label="Services on free tier" value="3 of 4" sub="Supabase · Vercel · Cloudflare" accent={C.green} />
      </div>

      {/* Amber warning banner */}
      <div style={{ background: C.amberSoft, border: `1px solid ${C.amber}40`, borderLeft: `3px solid ${C.amber}`, borderRadius: 6, padding: 16, marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: C.amber, marginBottom: 10 }}>⚠ Action required</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5 }}>
            <strong style={{ color: C.text }}>1. Vercel Hobby commercial-use ToS.</strong> Vercel Hobby plan prohibits commercial use per their Terms of Service. Upgrade to Vercel Pro (£20/mo) in July before accepting paying customers.
          </div>
          <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5 }}>
            <strong style={{ color: C.text }}>2. Microsoft 365 price rise.</strong> Microsoft 365 Business Basic prices rise ~17% on 1 July 2026. Renew your annual subscription before 30 June 2026 to lock in current £5.75 rate for 12 months.
          </div>
        </div>
      </div>

      {/* Service cards 2-col grid (Anthropic spans full width as the 5th row) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <ServiceCard
          title="Supabase"
          plan="Free tier · EU West London · project xbnsytrcvyayzdxezpha"
          cost="£0/month"
          status="Free"
          statusTone="green"
          progress={(
            <>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: C.faint, marginBottom: 4 }}>Auth users (live)</p>
                <ProgressBar value={authUserCount} max={SUPABASE_AUTH_LIMIT} color={supabaseAuthPct > 80 ? C.red : supabaseAuthPct > 50 ? C.amber : C.green} />
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: C.faint, marginBottom: 4 }}>Database storage</p>
                <ProgressBar value={50} max={500} color={C.green} est />
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: C.faint, marginBottom: 4 }}>Bandwidth</p>
                <ProgressBar value={1.5} max={5} color={C.green} est />
              </div>
            </>
          )}
          note="Upgrade to Pro (£25/mo) when approaching 500MB storage or 5GB bandwidth."
        />

        <ServiceCard
          title="Vercel"
          plan="Hobby (free) — flagged"
          cost="£0/month"
          costColor={C.amber}
          status="Needs upgrade"
          statusTone="amber"
          progress={(
            <>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: C.faint, marginBottom: 4 }}>Bandwidth</p>
                <ProgressBar value={10} max={100} color={C.green} est />
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: C.faint, marginBottom: 4 }}>Serverless executions / mo</p>
                <ProgressBar value={50000} max={1000000} color={C.green} est />
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: C.faint, marginBottom: 4 }}>Build minutes / mo</p>
                <ProgressBar value={300} max={6000} color={C.green} est />
              </div>
            </>
          )}
          warning="Hobby plan ToS prohibits commercial use. Upgrade to Vercel Pro (£20/mo) in July before launch."
        />

        <ServiceCard
          title="Cloudflare"
          plan="Free · DNS + Email Routing + Workers"
          cost="£0/month"
          status="Free — no upgrade needed"
          statusTone="green"
          progress={(
            <>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: C.faint, marginBottom: 4 }}>Workers requests / day</p>
                <ProgressBar value={500} max={100000} color={C.green} est />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.dim, padding: '6px 0' }}>
                <span>Email routing</span><span style={{ color: C.green, fontWeight: 600 }}>Unlimited</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.dim, padding: '6px 0' }}>
                <span>DNS queries</span><span style={{ color: C.green, fontWeight: 600 }}>Unlimited</span>
              </div>
            </>
          )}
          note="Cloudflare free tier is extremely generous. No upgrade needed at current or projected scale."
        />

        <ServiceCard
          title="Microsoft 365"
          plan="Business Basic · 1 user · jack@palateandpen.co.uk"
          cost="£5.75/month"
          status="Paid"
          statusTone="blue"
          note="Excl. VAT. Pre-existing Palate and Pen business cost, not specific to Palatable infrastructure."
          warning="Trial ends 6 September 2026 then converts to paid subscription. Price increases ~17% to approximately £6.72/mo on 1 July 2026. Renew annual subscription before 30 June 2026 to lock in current £5.75 rate."
        />

        <ServiceCard
          fullWidth
          title="Anthropic API"
          plan="Pay per use · server-side only · Pro+ tier users only"
          cost="Variable"
          costColor={C.amber}
          status="Variable"
          statusTone="amber"
          progress={(
            <>
              <p style={{ fontSize: 12, color: C.dim, lineHeight: 1.6, marginBottom: 12 }}>
                Pricing: ~£0.80 per invoice scan, ~£0.20 per recipe URL import, ~£0.40 per spec sheet scan.
              </p>

              {/* Actual vs estimate panel — rolling-window real spend
                  from the anthropic_usage table next to the formula
                  projection. Updated every time the admin page loads. */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                <div style={{ padding: '12px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: C.faint, marginBottom: 4 }}>Actual · last 7 days</p>
                  <p style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 22, color: C.text, lineHeight: 1 }}>£{last7Pounds.toFixed(2)}</p>
                  <p style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>{usage?.last7Days.count ?? 0} call{(usage?.last7Days.count ?? 0) === 1 ? '' : 's'} · projected ~£{projected30FromWeekly.toFixed(2)}/30d</p>
                </div>
                <div style={{ padding: '12px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: C.faint, marginBottom: 4 }}>Actual · last 30 days</p>
                  <p style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 22, color: C.text, lineHeight: 1 }}>£{last30Pounds.toFixed(2)}</p>
                  <p style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>{usage?.last30Days.count ?? 0} call{(usage?.last30Days.count ?? 0) === 1 ? '' : 's'} total</p>
                </div>
                <div style={{ padding: '12px 14px', background: C.amberSoft, border: `1px solid ${C.amber}40`, borderRadius: 4 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: C.amber, marginBottom: 4 }}>Estimate · this month</p>
                  <p style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 22, color: C.amber, lineHeight: 1 }}>£{estimatedMonthlyAnthropic.toFixed(2)}</p>
                  <p style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>{paidUsers} paid user{paidUsers === 1 ? '' : 's'} × £0.74</p>
                </div>
              </div>

              {usage?.tableMissing && (
                <div style={{ padding: '8px 12px', background: C.amberSoft, border: `1px solid ${C.amber}40`, borderLeft: `3px solid ${C.amber}`, borderRadius: 3, fontSize: 11, color: C.dim, marginBottom: 12 }}>
                  ⚠ Migration 010 hasn&apos;t been applied. Run <code style={{ fontFamily: 'monospace' }}>supabase/migrations/010_anthropic_usage.sql</code> in the Supabase SQL editor to start collecting actuals.
                </div>
              )}

              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: C.faint, marginBottom: 4 }}>Cost scaling projection</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {anthropicScale.map(row => (
                  <div key={row.users} style={{
                    padding: '10px 12px',
                    background: row.live ? C.goldSoft : C.bg,
                    border: `1px solid ${row.live ? C.gold + '40' : C.border}`,
                    borderRadius: 4,
                  }}>
                    <p style={{ fontSize: 10, color: row.live ? C.gold : C.faint, fontWeight: 600, marginBottom: 4 }}>{row.users}{row.live ? ' · LIVE' : ''}</p>
                    <p style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 18, color: row.live ? C.gold : C.amber }}>{row.cost}</p>
                  </div>
                ))}
              </div>
            </>
          )}
          note="Free tier users generate zero Anthropic cost — invoice scanning and AI import are gated to Pro+ only. Actual spend is logged per call to the anthropic_usage table; weekly rolling totals refresh whenever the admin opens this page."
        />
      </div>

      {/* Full cost breakdown table */}
      <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 18, marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: C.faint, marginBottom: 12 }}>Full cost breakdown</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ color: C.faint, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              <th style={{ textAlign: 'left',  padding: '6px 8px', fontWeight: 700 }}>Service</th>
              <th style={{ textAlign: 'left',  padding: '6px 8px', fontWeight: 700 }}>Plan</th>
              <th style={{ textAlign: 'left',  padding: '6px 8px', fontWeight: 700 }}>Type</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700 }}>Current cost</th>
              <th style={{ textAlign: 'left',  padding: '6px 8px', fontWeight: 700 }}>Upgrade trigger</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700 }}>Upgrade cost</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map(r => (
              <tr key={r.service} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: '8px', color: C.text, fontWeight: 500 }}>{r.service}</td>
                <td style={{ padding: '8px', color: C.dim }}>{r.plan}</td>
                <td style={{ padding: '8px', color: C.dim }}>{r.type}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: r.warn ? C.amber : C.text, fontWeight: 600 }}>{r.cost}</td>
                <td style={{ padding: '8px', color: C.faint }}>{r.trigger}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: C.dim }}>{r.upgrade}</td>
              </tr>
            ))}
            <tr style={{ borderTop: `2px solid ${C.border}`, background: C.bg }}>
              <td style={{ padding: '10px 8px', color: C.text, fontWeight: 700 }} colSpan={3}>Total</td>
              <td style={{ padding: '10px 8px', textAlign: 'right', color: C.gold, fontWeight: 700 }}>£{totalMonthlyCost.toFixed(2)}/mo</td>
              <td style={{ padding: '10px 8px', color: C.dim, fontSize: 11 }} colSpan={2}>£{(totalMonthlyCost + 20).toFixed(2)}/mo after Vercel Pro upgrade in July</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Scale milestones */}
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: C.faint, marginBottom: 10 }}>Scale milestones</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 10 }}>
        <div style={{ background: C.panel, border: `1px solid ${C.green}40`, borderLeft: `3px solid ${C.green}`, borderRadius: 6, padding: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: C.green, marginBottom: 6 }}>Today · 0 → ~500 paid users</p>
          <p style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 24, color: C.text, marginBottom: 6 }}>£{totalMonthlyCost.toFixed(2)}–£375/mo</p>
          <p style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>M365 £5.75 + Anthropic £{variableCost.toFixed(2)} ({paidUsers} paid) scaling to ~£370 at 500 paid. Upgrade Vercel Pro £20 in July.</p>
        </div>
        <div style={{ background: C.panel, border: `1px solid ${C.amber}40`, borderLeft: `3px solid ${C.amber}`, borderRadius: 6, padding: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: C.amber, marginBottom: 6 }}>500–2,000 paid users</p>
          <p style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 24, color: C.text, marginBottom: 6 }}>~£140/mo</p>
          <p style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>Add Supabase Pro £25 + Vercel Pro £20 + Anthropic scaling.</p>
        </div>
        <div style={{ background: C.panel, border: `1px solid ${C.gold}40`, borderLeft: `3px solid ${C.gold}`, borderRadius: 6, padding: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: C.gold, marginBottom: 6 }}>2,000+ paid users</p>
          <p style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 24, color: C.text, marginBottom: 6 }}>~£350–550/mo</p>
          <p style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>All services on paid plans + Anthropic at full scale. Still under 3% of MRR.</p>
        </div>
      </div>
      <p style={{ fontSize: 11, color: C.faint, fontStyle: 'italic', textAlign: 'center', marginBottom: 6 }}>
        Infrastructure cost stays under 3% of MRR at all projected scale points. The business is extremely capital efficient.
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Expenses Timeline
// ──────────────────────────────────────────────────────────
// Visual chronological timeline of upcoming infrastructure cost events.
// Hardcoded — these are the dates/triggers we already know about.

type TimelineTone = 'green' | 'amber' | 'red' | 'blue' | 'grey';

function TimelineDot({ tone }: { tone: TimelineTone }) {
  const colour = tone === 'green' ? C.green
               : tone === 'amber' ? C.amber
               : tone === 'red'   ? C.red
               : tone === 'blue'  ? C.blue
               : '#9A9A95';
  return (
    <div style={{
      width: 14, height: 14, borderRadius: '50%',
      background: colour,
      border: `3px solid ${C.panel}`,
      boxShadow: `0 0 0 2px ${colour}50`,
      flexShrink: 0,
      marginTop: 4,
    }} />
  );
}

function ExpensesTimeline({ users }: { users: any[] }) {
  // Live current-spend banner — drops £0 variable when there are no paid
  // users, just like the Infrastructure dashboard. Matches the no-user
  // baseline we now use everywhere.
  const paidUsers = useMemo(() => users.filter(u =>
    !isAdminUser(u)
    && ['pro', 'kitchen', 'group', 'enterprise'].includes(u.profile?.tier)
    && !u.profile?.comp
  ).length, [users]);
  const estimatedVariable = paidUsers * 0.74;
  const liveTotal = 5.75 + estimatedVariable;

  const events: {
    when: string;
    monthlyAt: string;
    tone: TimelineTone;
    cards: { title: string; body: string; cost: string }[];
  }[] = [
    {
      when: 'June 2026',
      monthlyAt: '~£34/mo',
      tone: 'amber',
      cards: [{
        title: 'Renew M365 Business Basic before 30 June',
        body: 'Microsoft raises Business Basic prices ~17% on 1 July 2026. Renewing your annual subscription before 30 June locks in £5.75/user/mo for 12 months. If missed, cost rises to ~£6.72/mo at the September trial conversion.',
        cost: 'Lock in £5.75',
      }],
    },
    {
      when: 'July 2026',
      monthlyAt: '~£54/mo',
      tone: 'red',
      cards: [{
        title: 'Upgrade Vercel Hobby to Pro',
        body: 'Vercel Hobby plan ToS prohibits commercial use. Must be on Pro before accepting paying customers. Upgrade in July ahead of launch. Also the point Microsoft new pricing kicks in — if you missed the June renewal window your M365 cost rises to ~£6.72/mo.',
        cost: '+£20/mo',
      }],
    },
    {
      when: 'September 2026',
      monthlyAt: '~£54/mo',
      tone: 'blue',
      cards: [
        {
          title: 'M365 trial ends — paid subscription starts',
          body: 'Trial ends 6 September 2026. Paid subscription auto-starts. If renewed before June: £5.75/mo. If missed window: ~£6.72/mo. Billing is monthly as per current plan settings.',
          cost: '£5.75/mo',
        },
        {
          title: 'Switch Stripe from sandbox to live keys',
          body: 'No cost — just a config change in Vercel env vars. Stripe charges 1.5% + £0.99 per UK card transaction only when payments process. No monthly fee.',
          cost: '£0 fixed',
        },
      ],
    },
    {
      when: '~200 paid users',
      monthlyAt: '~£79/mo',
      tone: 'grey',
      cards: [{
        title: 'Supabase free tier limit approaching',
        body: 'Free tier covers 500MB storage and 5GB bandwidth. At ~200–300 active paid users generating invoices and recipes you will approach these limits. Upgrade to Supabase Pro when storage exceeds 400MB.',
        cost: '+£25/mo',
      }],
    },
    {
      when: '~500 paid users',
      monthlyAt: '~£200/mo',
      tone: 'grey',
      cards: [{
        title: 'Anthropic API cost scaling',
        body: 'At 500 paid users scanning roughly 3 invoices per month each, Anthropic API costs ~£120/mo. At £25 Pro times 500 users equals £12,500 MRR, API is under 1% of revenue.',
        cost: '~£120/mo',
      }],
    },
    {
      when: 'September 2027',
      monthlyAt: 'TBC',
      tone: 'grey',
      cards: [{
        title: 'M365 annual renewal if locked in June 2026',
        body: 'If you renewed before 30 June 2026 your locked rate expires September 2027. At next renewal you will pay the post-July 2026 rate ~£6.72/mo. Set a calendar reminder for August 2027.',
        cost: '~£6.72/mo',
      }],
    },
  ];

  return (
    <div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 26, marginBottom: 6 }}>Expenses Timeline</h1>
      <p style={{ fontSize: 12, color: C.faint, marginBottom: 14 }}>Every known upcoming infrastructure cost event in chronological order.</p>

      {/* Current spend banner */}
      <div style={{ background: C.goldSoft, border: `1px solid ${C.gold}40`, borderLeft: `3px solid ${C.gold}`, borderRadius: 6, padding: 14, marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: C.gold, marginBottom: 3 }}>Current spend</p>
          <p style={{ fontSize: 13, color: C.text }}>£5.75/mo fixed + £{estimatedVariable.toFixed(2)}/mo variable Anthropic ({paidUsers} paid user{paidUsers === 1 ? '' : 's'})</p>
        </div>
        <p style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 26, color: C.gold }}>£{liveTotal.toFixed(2)}/mo</p>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: 28, marginBottom: 22 }}>
        {/* Vertical track */}
        <div style={{ position: 'absolute', left: 6, top: 4, bottom: 4, width: 2, background: C.border }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {events.map((e, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: -28, top: 0 }}>
                <TimelineDot tone={e.tone} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{e.when}</p>
                <span style={{ fontSize: 11, color: C.faint }}>·</span>
                <p style={{ fontSize: 12, color: C.gold, fontWeight: 600 }}>{e.monthlyAt}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {e.cards.map((c, j) => {
                  const borderColour = e.tone === 'green' ? C.green
                                     : e.tone === 'amber' ? C.amber
                                     : e.tone === 'red'   ? C.red
                                     : e.tone === 'blue'  ? C.blue
                                     : '#B5B3AC';
                  return (
                    <div key={j} style={{ background: C.panel, border: `1px solid ${C.border}`, borderLeft: `3px solid ${borderColour}`, borderRadius: 6, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.title}</p>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: borderColour, background: borderColour + '14', border: `1px solid ${borderColour}40`, padding: '3px 8px', borderRadius: 2, whiteSpace: 'nowrap' }}>{c.cost}</span>
                      </div>
                      <p style={{ fontSize: 12, color: C.dim, lineHeight: 1.6 }}>{c.body}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost summary */}
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: C.faint, marginBottom: 10 }}>Cost summary</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <StatTile label="Now · Jun 2026" value="~£34/mo" sub="current spend" />
        <StatTile label="Jul 2026 · after Vercel Pro" value="~£54/mo" sub="commercial-use compliant" accent={C.amber} />
        <StatTile label="At ~200 paid users" value="~£100/mo" sub="Supabase Pro added" />
        <StatTile label="Infra as % of MRR at scale" value="< 3%" sub="extremely efficient" accent={C.green} />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Platform — feature flags + announcement
// ──────────────────────────────────────────────────────────
const FEATURE_FLAGS_DEF = [
  { key: 'aiRecipeImport',   label: 'AI recipe import',     desc: 'URL/file → recipe extraction via Claude' },
  { key: 'aiInvoiceScan',    label: 'AI invoice scan',      desc: 'Invoice PDF/image → structured line items' },
  { key: 'aiSpecSheet',      label: 'AI spec-sheet scan',   desc: 'Spec sheet → recipe + costing in one shot' },
  { key: 'emailForwarding',  label: 'Email invoice forwarding', desc: 'Inbound /api/inbound-email webhook' },
  { key: 'publicMenus',      label: 'Public menus + QR',    desc: 'Live /m/[slug] pages (Kitchen/Group)' },
  { key: 'apiAccess',        label: 'Public API access',    desc: '/api/v1/* endpoints (Kitchen/Group)' },
  { key: 'csvImport',        label: 'CSV import',           desc: 'User Settings → Import Data' },
  { key: 'csvExport',        label: 'CSV export',           desc: 'User Settings → Export Data' },
  { key: 'wasteTracking',    label: 'Waste tracking',       desc: 'Waste tab + cost dashboard' },
  { key: 'menuBuilder',      label: 'Menu builder',         desc: 'Menus tab + designer + engineering' },
];

// Default funny holding-page message — used when the admin hasn't customised it
const DEFAULT_MAINTENANCE_MSG = "Just stepped out for a smoke. Be right back — your data is fine, the chef just needed a minute.";

function Platform() {
  const [settings, setSettings] = useState<any>(null);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [annDraft, setAnnDraft] = useState({ active: false, text: '', level: 'info', dismissible: true });
  // Maintenance mode — password-confirmed before flip. `pendingAction` tracks
  // which way we're going through the modal: 'on' = about to activate,
  // 'off' = about to deactivate. Both require password re-entry to avoid
  // an accidental click taking the site down (or putting it up too early).
  const [maintDraft, setMaintDraft] = useState({ active: false, message: '' });
  const [pendingMaint, setPendingMaint] = useState<'on' | 'off' | null>(null);
  const [confirmPw, setConfirmPw] = useState('');
  const [confirmErr, setConfirmErr] = useState('');

  async function load() {
    setErr('');
    try {
      const res = await fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${ADMIN_PASSWORD}` } });
      const json = await res.json();
      if (!res.ok) { setErr(json.error || 'load failed'); return; }
      const s = json.settings || {};
      setSettings(s);
      setAnnDraft({
        active: !!s.announcement?.active,
        text: s.announcement?.text || '',
        level: s.announcement?.level || 'info',
        dismissible: s.announcement?.dismissible !== false,
      });
      setMaintDraft({
        active: !!s.maintenance?.active,
        message: s.maintenance?.message || '',
      });
    } catch (e: any) { setErr(e?.message || 'network error'); }
  }
  useEffect(() => { load(); }, []);

  async function patch(body: any) {
    setSaving(true);
    setErr('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${ADMIN_PASSWORD}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'save failed');
      setSettings(json.settings || {});
    } catch (e: any) { setErr(e?.message || 'save failed'); }
    setSaving(false);
  }

  if (err && !settings) return (
    <div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 26, marginBottom: 12 }}>Platform</h1>
      <div style={{ background: C.redSoft, color: C.red, border: `1px solid ${C.red}40`, padding: 14, borderRadius: 4, fontSize: 12 }}>
        {err.includes('schema cache') || err.includes('app_settings')
          ? <>Migration 009 hasn't been applied yet. Run <code>supabase/migrations/009_app_settings.sql</code> in the Supabase SQL editor, then refresh.</>
          : err}
      </div>
    </div>
  );

  const flags = settings?.featureFlags || {};
  const charCount = (annDraft.text || '').length;
  const annLevelColor = annDraft.level === 'critical' ? C.red : annDraft.level === 'warning' ? C.amber : C.blue;
  const annLevelSoft = annDraft.level === 'critical' ? C.redSoft : annDraft.level === 'warning' ? C.amberSoft : C.blueSoft;

  function attemptConfirm() {
    if (confirmPw !== ADMIN_PASSWORD) {
      setConfirmErr('Wrong password');
      return;
    }
    const wantActive = pendingMaint === 'on';
    patch({ maintenance: { active: wantActive, message: maintDraft.message.trim() || DEFAULT_MAINTENANCE_MSG } });
    setPendingMaint(null);
    setConfirmPw('');
    setConfirmErr('');
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 26, marginBottom: 6 }}>Platform</h1>
      <p style={{ fontSize: 12, color: C.faint, marginBottom: 18 }}>Founder-only controls. Changes propagate within ~60 seconds via CDN.</p>

      {/* Maintenance mode — red card so it's visually distinct from the
          softer feature flags / announcement cards below. Requires a
          password re-entry before flipping in either direction. */}
      <div style={{ background: C.panel, border: `1px solid ${maintDraft.active ? C.red : C.border}`, borderLeft: `3px solid ${maintDraft.active ? C.red : C.amber}`, borderRadius: 6, padding: 18, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: maintDraft.active ? C.red : C.amber, marginBottom: 4 }}>
              {maintDraft.active ? '● Maintenance mode active' : 'Maintenance mode'}
            </p>
            <p style={{ fontSize: 12, color: C.dim, marginBottom: 10 }}>
              Takes the entire <code style={{ fontFamily: 'monospace' }}>/app</code> down for users and shows a holding page. Their data is untouched — Postgres keeps running, this is purely a render-time gate. Admin and public menus stay reachable.
            </p>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: 6 }}>Holding-page message</label>
            <textarea value={maintDraft.message} onChange={e => setMaintDraft({ ...maintDraft, message: e.target.value })}
              placeholder={DEFAULT_MAINTENANCE_MSG}
              rows={2}
              style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, padding: '9px 12px', outline: 'none', borderRadius: 4, fontFamily: FONT, boxSizing: 'border-box', resize: 'vertical' }} />
            <p style={{ fontSize: 10, color: C.faint, marginTop: 4 }}>Make it funny — chefs forgive funny. Leave blank to use the default.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', minWidth: 180 }}>
            {maintDraft.active ? (
              <button onClick={() => { setPendingMaint('off'); setConfirmPw(''); setConfirmErr(''); }}
                style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#fff', background: C.green, border: 'none', padding: '10px 16px', cursor: 'pointer', borderRadius: 3, whiteSpace: 'nowrap' }}>
                Bring site back up
              </button>
            ) : (
              <button onClick={() => { setPendingMaint('on'); setConfirmPw(''); setConfirmErr(''); }}
                style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#fff', background: C.red, border: 'none', padding: '10px 16px', cursor: 'pointer', borderRadius: 3, whiteSpace: 'nowrap' }}>
                Activate maintenance
              </button>
            )}
            <p style={{ fontSize: 10, color: C.faint, textAlign: 'right' }}>Password re-entry required</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Feature flags */}
        <Card title="Feature flags">
          <p style={{ fontSize: 11, color: C.faint, marginBottom: 12 }}>Kill switches for risky or expensive features. Toggle affects every user on every tier.</p>
          {settings ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {FEATURE_FLAGS_DEF.map(f => {
                const on = flags[f.key] !== false;
                return (
                  <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: C.bg, borderRadius: 4 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{f.label}</p>
                      <p style={{ fontSize: 10, color: C.faint }}>{f.desc}</p>
                    </div>
                    <Switch on={on} onClick={() => patch({ featureFlags: { [f.key]: !on } })} disabled={saving} />
                  </div>
                );
              })}
            </div>
          ) : <p style={{ fontSize: 12, color: C.faint, fontStyle: 'italic' }}>Loading…</p>}
        </Card>

        {/* Announcement editor */}
        <Card title="Platform announcement">
          <p style={{ fontSize: 11, color: C.faint, marginBottom: 10 }}>Banner shown at the top of the app for every user.</p>
          <textarea value={annDraft.text} onChange={e => setAnnDraft({ ...annDraft, text: e.target.value })}
            placeholder="e.g. Scheduled maintenance Sunday 2am — back in ~10 minutes."
            rows={3}
            style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, padding: '9px 12px', outline: 'none', borderRadius: 4, fontFamily: FONT, boxSizing: 'border-box', resize: 'vertical', marginBottom: 6 }} />
          <p style={{ fontSize: 10, color: C.faint, textAlign: 'right', marginBottom: 10 }}>{charCount} characters</p>

          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            {(['info', 'warning', 'critical'] as const).map(lv => {
              const active = annDraft.level === lv;
              const color = lv === 'critical' ? C.red : lv === 'warning' ? C.amber : C.blue;
              return (
                <button key={lv} onClick={() => setAnnDraft({ ...annDraft, level: lv })}
                  style={{ flex: 1, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', padding: '8px 6px', border: `1px solid ${active ? color + '80' : C.border}`, background: active ? color + '14' : C.panel, color: active ? color : C.dim, cursor: 'pointer', borderRadius: 3 }}>
                  {lv}
                </button>
              );
            })}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.dim, marginBottom: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={annDraft.dismissible} onChange={e => setAnnDraft({ ...annDraft, dismissible: e.target.checked })} />
            Dismissible by users
          </label>

          {/* Preview */}
          {annDraft.text && (
            <div style={{ padding: '10px 12px', background: annLevelSoft, border: `1px solid ${annLevelColor}40`, borderRadius: 4, marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: annLevelColor, marginBottom: 4 }}>PREVIEW</p>
              <p style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{annDraft.text}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => patch({ announcement: { ...annDraft, active: true } })} disabled={saving || !annDraft.text.trim()}
              style={{ flex: 1, background: C.gold, color: '#fff', border: 'none', padding: '9px 14px', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', cursor: (saving || !annDraft.text.trim()) ? 'not-allowed' : 'pointer', borderRadius: 3, opacity: (saving || !annDraft.text.trim()) ? 0.5 : 1 }}>
              Activate
            </button>
            <button onClick={() => patch({ announcement: { ...annDraft, active: false } })} disabled={saving}
              style={{ background: 'transparent', color: C.dim, border: `1px solid ${C.border}`, padding: '9px 14px', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', cursor: 'pointer', borderRadius: 3 }}>
              Deactivate
            </button>
            <button onClick={() => { setAnnDraft({ active: false, text: '', level: 'info', dismissible: true }); patch({ announcement: { active: false, text: '', level: 'info', dismissible: true } }); }} disabled={saving}
              style={{ background: 'transparent', color: C.red, border: `1px solid ${C.red}40`, padding: '9px 14px', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', cursor: 'pointer', borderRadius: 3 }}>
              Clear
            </button>
          </div>
          {settings?.announcement?.active && (
            <p style={{ fontSize: 11, color: C.green, marginTop: 8, fontWeight: 600 }}>● Currently live</p>
          )}
        </Card>
      </div>

      {/* Password re-confirm modal — second gate before flipping maintenance */}
      {pendingMaint && (
        <div onClick={() => { setPendingMaint(null); setConfirmPw(''); setConfirmErr(''); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.panel, border: `1px solid ${pendingMaint === 'on' ? C.red : C.green}40`, borderTop: `3px solid ${pendingMaint === 'on' ? C.red : C.green}`, borderRadius: 6, width: '100%', maxWidth: 420, padding: 24 }}>
            <p style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 22, color: C.text, marginBottom: 6 }}>
              {pendingMaint === 'on' ? 'Take the site down?' : 'Bring the site back up?'}
            </p>
            <p style={{ fontSize: 12, color: C.dim, marginBottom: 16, lineHeight: 1.6 }}>
              {pendingMaint === 'on'
                ? 'Every user currently using the app will see the holding page on their next request. Re-enter your admin password to confirm.'
                : 'The holding page goes away and users can use the app normally again. Re-enter your password to confirm.'}
            </p>
            <input type="password" value={confirmPw} autoFocus
              onChange={e => { setConfirmPw(e.target.value); setConfirmErr(''); }}
              onKeyDown={e => { if (e.key === 'Enter') attemptConfirm(); }}
              placeholder="Admin password"
              style={{ width: '100%', background: C.bg, border: `1px solid ${confirmErr ? C.red : C.border}`, color: C.text, fontSize: 14, padding: '10px 14px', outline: 'none', borderRadius: 4, fontFamily: FONT, boxSizing: 'border-box', marginBottom: 8 }} />
            {confirmErr && <p style={{ fontSize: 11, color: C.red, marginBottom: 8 }}>⚠ {confirmErr}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setPendingMaint(null); setConfirmPw(''); setConfirmErr(''); }}
                style={{ background: 'transparent', color: C.dim, border: `1px solid ${C.border}`, padding: '9px 16px', fontSize: 12, cursor: 'pointer', borderRadius: 3 }}>
                Cancel
              </button>
              <button onClick={attemptConfirm} disabled={!confirmPw || saving}
                style={{ background: pendingMaint === 'on' ? C.red : C.green, color: '#fff', border: 'none', padding: '9px 18px', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', cursor: (!confirmPw || saving) ? 'not-allowed' : 'pointer', borderRadius: 3, opacity: (!confirmPw || saving) ? 0.5 : 1 }}>
                {saving ? 'Working…' : pendingMaint === 'on' ? 'Take site down' : 'Bring site back'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Audit
// ──────────────────────────────────────────────────────────
function Audit({ entries, users }: { entries: any[]; users: any[] }) {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchEmail, setSearchEmail] = useState('');

  const actionTypes = Array.from(new Set(entries.map((e: any) => e.action))).sort();
  const filtered = useMemo(() => {
    let list = entries;
    if (actionFilter !== 'all') list = list.filter((e: any) => e.action === actionFilter);
    if (searchEmail.trim()) {
      const q = searchEmail.toLowerCase();
      list = list.filter((e: any) => {
        const u = users.find((x: any) => x.user_id === e.target_user_id);
        return (u?.profile?.email || '').toLowerCase().includes(q);
      });
    }
    return list;
  }, [entries, actionFilter, searchEmail, users]);

  return (
    <div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 26, marginBottom: 18 }}>Audit log</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={searchEmail} onChange={e => setSearchEmail(e.target.value)} placeholder="Filter by target email"
          style={{ flex: 1, minWidth: 200, background: C.panel, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, padding: '8px 12px', outline: 'none', borderRadius: 4, fontFamily: FONT, boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button onClick={() => setActionFilter('all')}
            style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', padding: '7px 11px', border: `1px solid ${actionFilter === 'all' ? C.gold + '60' : C.border}`, background: actionFilter === 'all' ? C.goldSoft : C.panel, color: actionFilter === 'all' ? C.gold : C.dim, cursor: 'pointer', borderRadius: 3 }}>
            All
          </button>
          {actionTypes.map(a => (
            <button key={a} onClick={() => setActionFilter(a)}
              style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', padding: '7px 11px', border: `1px solid ${actionFilter === a ? C.gold + '60' : C.border}`, background: actionFilter === a ? C.goldSoft : C.panel, color: actionFilter === a ? C.gold : C.dim, cursor: 'pointer', borderRadius: 3 }}>
              {a.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card title="No entries"><p style={{ fontSize: 12, color: C.faint, fontStyle: 'italic' }}>Nothing logged in this view.</p></Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((e: any) => {
            const target = users.find((x: any) => x.user_id === e.target_user_id);
            return (
              <div key={e.id} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: C.gold, background: C.goldSoft, border: `1px solid ${C.gold}40`, padding: '2px 8px', borderRadius: 2 }}>{e.action.replace(/_/g, ' ')}</span>
                  <span style={{ fontSize: 11, color: C.faint }}>{fmtRel(e.created_at)}</span>
                  {target && (
                    <span style={{ fontSize: 11, color: C.dim }}>
                      → <span style={{ color: C.text, fontWeight: 500 }}>{target.profile?.email || 'unknown'}</span>
                    </span>
                  )}
                  <span style={{ flex: 1 }} />
                  {e.ip && <span style={{ fontSize: 10, color: C.faint }}>{e.ip}</span>}
                </div>
                {e.details && Object.keys(e.details).length > 0 && (
                  <pre style={{ fontSize: 11, color: C.dim, background: C.bg, padding: 10, borderRadius: 3, marginTop: 6, overflow: 'auto', fontFamily: 'monospace', maxHeight: 200 }}>
                    {JSON.stringify(e.details, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// System
// ──────────────────────────────────────────────────────────
function System() {
  const [health, setHealth] = useState<any>(null);
  const [dbStats, setDbStats] = useState<any>(null);
  const [diag, setDiag] = useState<any>(null);
  const [diagRunning, setDiagRunning] = useState(false);

  async function loadHealth() {
    const res = await fetch('/api/admin/health', { headers: { Authorization: `Bearer ${ADMIN_PASSWORD}` } });
    setHealth(await res.json());
  }
  async function loadDbStats() {
    const res = await fetch('/api/admin/db-stats', { headers: { Authorization: `Bearer ${ADMIN_PASSWORD}` } });
    setDbStats(await res.json());
  }
  useEffect(() => { loadHealth(); loadDbStats(); }, []);

  async function runDiag() {
    setDiagRunning(true);
    setDiag(null);
    try {
      const res = await fetch('/api/admin/diagnostics/test-signup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${ADMIN_PASSWORD}`, 'Content-Type': 'application/json' },
      });
      setDiag(await res.json());
    } catch (e: any) {
      setDiag({ ok: false, error: e?.message });
    }
    setDiagRunning(false);
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 26, marginBottom: 18 }}>System</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

        <Card title="Database stats" action={
          <button onClick={loadDbStats} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: C.dim, background: 'transparent', border: `1px solid ${C.border}`, padding: '5px 10px', cursor: 'pointer', borderRadius: 3 }}>
            <Icon name="refresh" size={12} /> Refresh
          </button>
        }>
          {!dbStats ? <p style={{ fontSize: 12, color: C.faint, fontStyle: 'italic' }}>Loading…</p> : (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: C.faint, marginBottom: 6 }}>Tables</p>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginBottom: 14 }}>
                <tbody>
                  {Object.entries(dbStats.platformTables || {}).map(([k, v]: any) => (
                    <tr key={k} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                      <td style={{ padding: '6px 0', color: C.dim, fontFamily: 'monospace' }}>{k}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right', color: C.text, fontWeight: 600 }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: C.faint, marginBottom: 6 }}>Entities (across all users)</p>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.entries(dbStats.entities || {}).map(([k, v]: any) => (
                    <tr key={k} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                      <td style={{ padding: '6px 0', color: C.dim }}>{k}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right', color: C.text, fontWeight: 600 }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Environment checks" action={
          <button onClick={loadHealth} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: C.dim, background: 'transparent', border: `1px solid ${C.border}`, padding: '5px 10px', cursor: 'pointer', borderRadius: 3 }}>
            <Icon name="refresh" size={12} /> Re-check
          </button>
        }>
          {!health ? <p style={{ fontSize: 12, color: C.faint, fontStyle: 'italic' }}>Loading…</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { l: 'Supabase DB', s: health.db },
                { l: 'Anthropic API key', s: health.anthropic },
                { l: 'Stripe key', s: health.stripe },
                { l: 'Stripe webhook secret', s: health.stripeWebhook },
                { l: 'Inbound email secret', s: health.inboundEmail },
                { l: 'Signup trigger', s: health.signupTrigger },
              ].map(r => (
                <div key={r.l} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: C.bg, borderRadius: 3 }}>
                  <StatusDot status={(r.s?.status as any) || 'amber'} />
                  <p style={{ fontSize: 12, color: C.text, fontWeight: 500, flex: 1 }}>{r.l}</p>
                  <p style={{ fontSize: 10, color: C.faint }}>{r.s?.detail || '—'}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>

      <Card title="Signup trigger diagnostic">
        <p style={{ fontSize: 12, color: C.dim, marginBottom: 10 }}>
          Creates a fake auth user, waits for the <code style={{ fontFamily: 'monospace' }}>on_auth_user_created</code> trigger to seed a user_data row, then deletes both. Confirms the signup pipeline end-to-end.
        </p>
        <button onClick={runDiag} disabled={diagRunning}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: C.gold, background: C.goldSoft, border: `1px solid ${C.gold}40`, padding: '8px 14px', cursor: diagRunning ? 'wait' : 'pointer', borderRadius: 3 }}>
          {diagRunning ? 'Running…' : 'Run diagnostic'}
        </button>
        {diag && (
          <div style={{ marginTop: 12, padding: 12, background: diag.ok ? C.greenSoft : C.redSoft, border: `1px solid ${diag.ok ? C.green : C.red}40`, borderRadius: 4, fontSize: 12, color: diag.ok ? C.green : C.red }}>
            {diag.ok ? <><strong>✓ Trigger fired</strong> in {diag.elapsedMs}ms</> : <><strong>✗ Failed</strong> · {diag.error || 'trigger did not fire within 3s'}</>}
          </div>
        )}
      </Card>

      <div style={{ marginTop: 12 }}>
        <Card title="Cache & sessions">
          <p style={{ fontSize: 12, color: C.dim, marginBottom: 10 }}>Clear admin localStorage cache (re-prompts password on next visit).</p>
          <button onClick={() => { window.localStorage.removeItem('palatable_admin_auth'); window.location.reload(); }}
            style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: C.red, background: 'transparent', border: `1px solid ${C.red}40`, padding: '8px 14px', cursor: 'pointer', borderRadius: 3 }}>
            Clear admin session
          </button>
        </Card>
      </div>
    </div>
  );
}
