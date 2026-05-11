'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useSettings } from '@/context/SettingsContext';
import { dark, light } from '@/lib/theme';

type Role = 'owner' | 'manager' | 'chef' | 'viewer';
const ROLE_LABEL: Record<Role, string> = { owner: 'Owner', manager: 'Manager', chef: 'Chef', viewer: 'Viewer' };

interface Member { userId: string; role: Role; addedAt: string; email: string | null; name: string | null; }
interface TeamApi { members: Member[]; account: { id: string; name: string; tier: string; owner_user_id: string }; }

async function authedFetch(url: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
  });
}

interface Counts {
  recipes: number;
  costings: number;
  menus: number;
  notes: number;
  bank: number;
  stock: number;
  waste: number;
  invoices: number;
  total: number;
}

function countContributions(state: any, userId: string): Counts {
  const has = (arr: any[] | undefined) => (arr || []).filter(i => i?.addedBy === userId).length;
  const c = {
    recipes:  has(state.recipes),
    costings: has(state.gpHistory),
    menus:    has(state.menus),
    notes:    has(state.notes),
    bank:     has(state.ingredientsBank),
    stock:    has(state.stockItems),
    waste:    has(state.wasteLog),
    invoices: has(state.invoices),
  };
  return { ...c, total: Object.values(c).reduce((a, b) => a + b, 0) };
}

export default function MyTeamView() {
  const { currentAccount, currentRole } = useAuth();
  const { state } = useApp();
  const { settings } = useSettings();
  const C = settings.resolved === 'light' ? light : dark;
  const [team, setTeam] = useState<TeamApi | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentAccount?.id) return;
    setLoading(true); setErr(null);
    try {
      const r = await authedFetch('/api/accounts/' + currentAccount.id + '/team');
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || 'Load failed');
      setTeam(json);
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally { setLoading(false); }
  }, [currentAccount?.id]);
  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => {
    if (!team) return null;
    const counts = team.members.map(m => ({ m, c: countContributions(state, m.userId) }));
    return counts;
  }, [team, state]);

  // Owner-only gating belongs at the route level too — handled in Sidebar +
  // page.tsx — but defensively bail here so it never renders for the wrong role.
  if (currentRole !== 'owner') {
    return (
      <div style={{ padding: '32px', color: C.faint, fontSize: '13px' }}>
        My Team is owner-only.
      </div>
    );
  }
  if (!['kitchen', 'group'].includes(currentAccount?.tier || '')) {
    return (
      <div style={{ padding: '32px', color: C.faint, fontSize: '13px' }}>
        My Team is available on Kitchen and Group plans.
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px', fontFamily: 'system-ui,sans-serif', color: C.text }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '28px', color: C.text, marginBottom: '4px' }}>My Team</h1>
          <p style={{ fontSize: '12px', color: C.faint }}>{team?.members.length || 0} member{team?.members.length === 1 ? '' : 's'} on <strong style={{ color: C.text, fontWeight: 600 }}>{currentAccount?.name}</strong></p>
        </div>
        {team && (
          <p style={{ fontSize: '11px', color: C.faint, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            Manage roles + invites in Settings → Team
          </p>
        )}
      </div>

      {err && <p style={{ fontSize: '12px', color: C.red, marginBottom: '12px' }}>{err}</p>}
      {loading && !team && <p style={{ fontSize: '12px', color: C.faint }}>Loading team…</p>}

      {totals && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {totals.map(({ m, c }) => {
            const isOpen = openId === m.userId;
            const isYou = m.userId === team!.account.owner_user_id; // owner viewing themselves
            return (
              <div key={m.userId} style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '4px', overflow: 'hidden' }}>
                <button
                  onClick={() => setOpenId(isOpen ? null : m.userId)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '14px 18px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                >
                  <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: C.gold + '22', color: C.gold, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, fontFamily: 'Georgia,serif', flexShrink: 0 }}>
                    {(m.name || m.email || '?').charAt(0).toUpperCase()}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                      <p style={{ fontSize: '14px', color: C.text, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.name || m.email || 'Unknown user'}
                        {isYou && <span style={{ fontSize: '10px', color: C.faint, fontWeight: 400, marginLeft: '6px' }}>(you)</span>}
                      </p>
                      <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: m.role === 'owner' ? C.gold : C.faint, background: (m.role === 'owner' ? C.gold : C.faint) + '14', border: '0.5px solid ' + (m.role === 'owner' ? C.gold : C.faint) + '40', padding: '1px 6px', borderRadius: '2px' }}>
                        {ROLE_LABEL[m.role]}
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: C.faint }}>
                      {m.name && m.email ? m.email + ' · ' : ''}
                      Joined {new Date(m.addedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}
                      <span style={{ color: c.total > 0 ? C.gold : C.faint, fontWeight: c.total > 0 ? 600 : 400 }}>
                        {c.total === 0 ? 'No contributions yet' : c.total + ' contribution' + (c.total === 1 ? '' : 's')}
                      </span>
                    </p>
                  </div>
                  <span style={{ fontSize: '12px', color: C.faint }}>{isOpen ? '▴' : '▾'}</span>
                </button>
                {isOpen && (
                  <div style={{ borderTop: '0.5px solid ' + C.border, padding: '14px 18px', background: C.surface2 }}>
                    {c.total === 0 ? (
                      <p style={{ fontSize: '12px', color: C.faint, padding: '8px 0' }}>
                        No tagged contributions yet. Items this member creates from now on will be attributed here automatically.
                      </p>
                    ) : (
                      <>
                        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.faint, marginBottom: '10px' }}>Contribution breakdown</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                          <Stat label="Recipes"  value={c.recipes}  C={C} />
                          <Stat label="Costings" value={c.costings} C={C} />
                          <Stat label="Menus"    value={c.menus}    C={C} />
                          <Stat label="Notes"    value={c.notes}    C={C} />
                          <Stat label="Bank"     value={c.bank}     C={C} />
                          <Stat label="Stock"    value={c.stock}    C={C} />
                          <Stat label="Waste"    value={c.waste}    C={C} />
                          <Stat label="Invoices" value={c.invoices} C={C} />
                        </div>
                        <RecentItems userId={m.userId} state={state} C={C} />
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, C }: { label: string; value: number; C: any }) {
  return (
    <div style={{ background: C.surface, border: '0.5px solid ' + C.border, borderRadius: '3px', padding: '10px 12px' }}>
      <p style={{ fontSize: '20px', fontFamily: 'Georgia,serif', fontWeight: 300, color: value > 0 ? C.text : C.faint, lineHeight: 1.1 }}>{value}</p>
      <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.faint, marginTop: '2px' }}>{label}</p>
    </div>
  );
}

function RecentItems({ userId, state, C }: { userId: string; state: any; C: any }) {
  const recent = useMemo(() => {
    const items: { type: string; title: string; when: number }[] = [];
    (state.recipes   || []).forEach((r: any) => r.addedBy === userId && items.push({ type: 'Recipe',  title: r.title || 'Untitled', when: r.createdAt || 0 }));
    (state.gpHistory || []).forEach((g: any) => g.addedBy === userId && items.push({ type: 'Costing', title: g.name  || 'Untitled', when: g.savedAt   || 0 }));
    (state.menus     || []).forEach((m: any) => m.addedBy === userId && items.push({ type: 'Menu',    title: m.name  || 'Untitled', when: m.createdAt || 0 }));
    (state.notes     || []).forEach((n: any) => n.addedBy === userId && items.push({ type: 'Note',    title: n.title || 'Untitled', when: n.createdAt || 0 }));
    return items.sort((a, b) => b.when - a.when).slice(0, 8);
  }, [userId, state]);

  if (recent.length === 0) return null;
  return (
    <div style={{ marginTop: '14px', borderTop: '0.5px solid ' + C.border, paddingTop: '12px' }}>
      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.faint, marginBottom: '8px' }}>Recent</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {recent.map((it, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: C.dim, padding: '4px 0' }}>
            <span><span style={{ color: C.faint, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: '8px' }}>{it.type}</span>{it.title}</span>
            <span style={{ fontSize: '10px', color: C.faint }}>{it.when ? new Date(it.when).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
