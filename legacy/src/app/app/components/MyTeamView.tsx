'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useSettings } from '@/context/SettingsContext';
import { dark, light } from '@/lib/theme';

type Role = 'owner' | 'manager' | 'chef' | 'viewer';
const ROLE_LABEL: Record<Role, string> = { owner: 'Owner', manager: 'Manager', chef: 'Chef', viewer: 'Viewer' };
const ROLE_DESC: Record<Role, string> = {
  owner: 'Full control + billing + delete account',
  manager: 'Edit everything + invite team',
  chef: 'Edit recipes, notes, waste, stock counts',
  viewer: 'Read-only access',
};

interface Member { userId: string; role: Role; addedAt: string; email: string | null; name: string | null; }
interface Invite { id: string; email: string; role: Role; token: string; created_at: string; expires_at: string; invited_by: string; }
interface Seats { used: number; limit: number | null; hasRoom: boolean; }
interface TeamApi {
  account: { id: string; name: string; tier: string; owner_user_id: string };
  members: Member[];
  invites: Invite[];
  seats: Seats;
  yourRole: Role;
}

async function authedFetch(url: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return fetch(url, {
    ...(init || {}),
    headers: {
      'Content-Type': 'application/json',
      ...((init?.headers as any) || {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
  });
}

interface Counts {
  recipes: number; costings: number; menus: number; notes: number;
  bank: number; stock: number; waste: number; invoices: number; total: number;
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
  const { user, currentAccount, currentRole, refreshAccounts } = useAuth();
  const { state } = useApp();
  const { settings } = useSettings();
  const C = settings.resolved === 'light' ? light : dark;
  const [team, setTeam] = useState<TeamApi | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openMember, setOpenMember] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  const accountId = currentAccount?.id;
  const tier = currentAccount?.tier || 'free';
  const myUserId = user?.id || '';

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true); setErr(null);
    try {
      const r = await authedFetch('/api/accounts/' + accountId + '/team');
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || 'Load failed');
      setTeam(json);
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally { setLoading(false); }
  }, [accountId]);
  useEffect(() => { load(); }, [load]);

  if (currentRole !== 'owner' && currentRole !== 'manager') {
    return <div style={{ padding: '32px', color: C.faint, fontSize: '13px' }}>My Team is for Owners and Managers.</div>;
  }
  if (!['kitchen', 'group'].includes(tier)) {
    return <div style={{ padding: '32px', color: C.faint, fontSize: '13px' }}>My Team is available on Kitchen and Group plans.</div>;
  }

  const totalContribs = team
    ? team.members.reduce((sum, m) => sum + countContributions(state, m.userId).total, 0)
    : 0;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: 'system-ui,sans-serif', padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '32px', color: C.text, marginBottom: '4px' }}>My Team</h1>
          <p style={{ fontSize: '13px', color: C.faint }}>
            <strong style={{ color: C.dim, fontWeight: 600 }}>{currentAccount?.name}</strong>
            <span style={{ margin: '0 8px', color: C.faint }}>·</span>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.gold, background: C.gold + '14', border: '0.5px solid ' + C.gold + '40', padding: '2px 8px', borderRadius: '2px' }}>{tier}</span>
          </p>
        </div>
        {team?.seats.hasRoom && (
          <button onClick={() => setShowInvite(true)}
            style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', background: C.gold, color: C.bg, border: 'none', padding: '12px 22px', cursor: 'pointer', borderRadius: '3px' }}>
            + Invite member
          </button>
        )}
      </div>

      {err && <p style={{ fontSize: '12px', color: C.red, marginBottom: '12px' }}>{err}</p>}
      {loading && !team && <p style={{ fontSize: '12px', color: C.faint }}>Loading team…</p>}

      {team && (
        <>
          {/* Top stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
            <StatTile label="Members"          value={team.members.length}                      sub={team.seats.limit ? `of ${team.seats.limit} seats` : 'unlimited'} C={C} />
            <StatTile label="Seats available"  value={team.seats.limit === null ? '∞' : Math.max(team.seats.limit - team.seats.used, 0)} sub={team.seats.limit === null ? 'Group plan' : team.seats.used + ' used'} C={C} />
            <StatTile label="Pending invites"  value={team.invites.length}                      sub={team.invites.length === 0 ? 'none' : 'awaiting acceptance'} C={C} />
            <StatTile label="Contributions"    value={totalContribs}                            sub="tagged items across team" C={C} />
          </div>

          {/* Member tiles */}
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, marginBottom: '10px' }}>Team members</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {team.members.map(m => {
              const counts = countContributions(state, m.userId);
              const isYou = m.userId === myUserId;
              const isOwnerRow = m.role === 'owner';
              return (
                <button
                  key={m.userId}
                  onClick={() => setOpenMember(m.userId)}
                  style={{
                    background: C.surface, border: '1px solid ' + C.border, borderRadius: '4px', padding: '20px',
                    textAlign: 'left', cursor: 'pointer', position: 'relative',
                    transition: 'border-color 0.15s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = C.gold + '60')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    <span style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: C.gold + '22', color: C.gold,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '16px', fontWeight: 700, fontFamily: 'Georgia,serif', flexShrink: 0,
                    }}>{(m.name || m.email || '?').charAt(0).toUpperCase()}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', color: C.text, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
                        {m.name || m.email || 'Unknown user'}
                      </p>
                      <p style={{ fontSize: '11px', color: C.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.email || '—'}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: isOwnerRow ? C.gold : C.faint, background: (isOwnerRow ? C.gold : C.faint) + '14', border: '0.5px solid ' + (isOwnerRow ? C.gold : C.faint) + '40', padding: '2px 7px', borderRadius: '2px' }}>
                      {ROLE_LABEL[m.role]}
                    </span>
                    {isYou && <span style={{ fontSize: '9px', color: C.faint, fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase' }}>(you)</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '0.5px solid ' + C.border, paddingTop: '12px' }}>
                    <p style={{ fontSize: '11px', color: C.faint }}>
                      Joined {new Date(m.addedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <p style={{ fontSize: '13px', color: counts.total > 0 ? C.gold : C.faint, fontWeight: 600 }}>
                      {counts.total} {counts.total === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pending invites */}
          {team.invites.length > 0 && (
            <>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, marginBottom: '10px' }}>Pending invites</p>
              <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '4px', overflow: 'hidden', marginBottom: '24px' }}>
                {team.invites.map(inv => (
                  <InviteRow key={inv.id} inv={inv} accountId={team.account.id} onChanged={load} C={C} />
                ))}
              </div>
            </>
          )}

          {!team.seats.hasRoom && (() => {
            // Group caps at 25 users now — the next step is Enterprise.
            // Kitchen caps at 5, next step is Group. Anything below
            // Kitchen still upgrades to Kitchen for a team.
            const upgradeHint =
              tier === 'group'   ? 'Upgrade to Enterprise for unlimited members.' :
              tier === 'kitchen' ? 'Upgrade to Group for up to 25 members.' :
              'Upgrade to Kitchen for up to 5 members.';
            return (
              <div style={{ background: C.surface2, border: '0.5px dashed ' + C.border, borderRadius: '3px', padding: '14px 18px', fontSize: '12px', color: C.faint }}>
                Seat limit reached for the {tier} tier ({team.seats.used} of {team.seats.limit}). {upgradeHint}
              </div>
            );
          })()}
        </>
      )}

      {showInvite && team && (
        <InviteModal accountId={team.account.id} onClose={() => setShowInvite(false)} onCreated={load} C={C} />
      )}
      {openMember && team && (
        <MemberDetail
          member={team.members.find(m => m.userId === openMember)!}
          counts={countContributions(state, openMember)}
          state={state}
          accountId={team.account.id}
          ownerId={team.account.owner_user_id}
          yourUserId={myUserId}
          yourRole={currentRole}
          onClose={() => setOpenMember(null)}
          onChanged={() => { load(); refreshAccounts(); }}
          C={C}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────

function StatTile({ label, value, sub, C }: { label: string; value: number | string; sub: string; C: any }) {
  return (
    <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '4px', padding: '16px 18px' }}>
      <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.faint, marginBottom: '6px' }}>{label}</p>
      <p style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '28px', color: C.text, lineHeight: 1.1 }}>{value}</p>
      <p style={{ fontSize: '11px', color: C.faint, marginTop: '4px' }}>{sub}</p>
    </div>
  );
}

function InviteRow({ inv, accountId, onChanged, C }: any) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = (typeof window !== 'undefined' ? window.location.origin : '') + '/invite/' + inv.token;
  const expires = new Date(inv.expires_at);
  const daysLeft = Math.max(0, Math.ceil((expires.getTime() - Date.now()) / 86400000));

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }
  async function revoke() {
    if (!confirm('Revoke invite for ' + inv.email + '?')) return;
    setBusy(true);
    try {
      const r = await authedFetch('/api/accounts/' + accountId + '/invites/' + inv.id, { method: 'DELETE' });
      const json = await r.json();
      if (!r.ok) alert(json.error || 'Revoke failed');
      onChanged();
    } finally { setBusy(false); }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '10px', padding: '12px 16px', borderTop: '0.5px solid ' + C.border, alignItems: 'center' }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '13px', color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv.email}</p>
        <p style={{ fontSize: '11px', color: C.faint }}>{ROLE_LABEL[inv.role as Role]} · expires in {daysLeft}d</p>
      </div>
      <button onClick={copy} title="Copy invite link" style={{ background: 'transparent', border: '0.5px solid ' + C.border, color: copied ? C.gold : C.dim, fontSize: '10px', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', padding: '5px 10px', borderRadius: '2px', cursor: 'pointer' }}>
        {copied ? '✓ Copied' : 'Copy link'}
      </button>
      <button onClick={revoke} disabled={busy} title="Revoke invite" style={{ background: 'transparent', border: 'none', color: C.faint, fontSize: '14px', cursor: 'pointer', padding: '0 4px' }}>×</button>
      <span></span>
    </div>
  );
}

function MemberDetail({ member, counts, state, accountId, ownerId, yourUserId, yourRole, onClose, onChanged, C }: any) {
  const isOwner = member.role === 'owner';
  const isYou = member.userId === yourUserId;
  const canChange = !isOwner && !isYou && (yourRole === 'owner' || yourRole === 'manager');
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  async function changeRole(newRole: Role) {
    if (newRole === 'owner' && !confirm('Transfer ownership to ' + (member.name || member.email) + '? You will become a Manager.')) return;
    setBusy(true);
    try {
      const r = await authedFetch('/api/accounts/' + accountId + '/members/' + member.userId, {
        method: 'PATCH', body: JSON.stringify({ role: newRole }),
      });
      const json = await r.json();
      if (!r.ok) alert(json.error || 'Update failed');
      onChanged();
      if (newRole === 'owner') onClose();
    } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true);
    try {
      const r = await authedFetch('/api/accounts/' + accountId + '/members/' + member.userId, { method: 'DELETE' });
      const json = await r.json();
      if (!r.ok) { alert(json.error || 'Remove failed'); setBusy(false); return; }
      onClose();
      onChanged();
    } finally { setBusy(false); }
  }

  const recent = useMemo(() => {
    const items: { type: string; title: string; when: number }[] = [];
    (state.recipes   || []).forEach((r: any) => r.addedBy === member.userId && items.push({ type: 'Recipe',  title: r.title || 'Untitled', when: r.createdAt || 0 }));
    (state.gpHistory || []).forEach((g: any) => g.addedBy === member.userId && items.push({ type: 'Costing', title: g.name  || 'Untitled', when: g.savedAt   || 0 }));
    (state.menus     || []).forEach((m: any) => m.addedBy === member.userId && items.push({ type: 'Menu',    title: m.name  || 'Untitled', when: m.createdAt || 0 }));
    (state.notes     || []).forEach((n: any) => n.addedBy === member.userId && items.push({ type: 'Note',    title: n.title || 'Untitled', when: n.createdAt || 0 }));
    return items.sort((a, b) => b.when - a.when).slice(0, 8);
  }, [member.userId, state]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '6px', padding: '28px', maxWidth: '560px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: C.gold + '22', color: C.gold,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', fontWeight: 700, fontFamily: 'Georgia,serif',
            }}>{(member.name || member.email || '?').charAt(0).toUpperCase()}</span>
            <div>
              <h2 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '22px', color: C.text, marginBottom: '2px' }}>
                {member.name || member.email || 'Unknown'}
                {isYou && <span style={{ fontSize: '11px', color: C.faint, fontWeight: 400, marginLeft: '8px' }}>(you)</span>}
              </h2>
              <p style={{ fontSize: '12px', color: C.faint }}>{member.email}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.faint, fontSize: '22px', cursor: 'pointer', padding: '0' }}>×</button>
        </div>

        {/* Role + dates */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px', padding: '14px 16px', background: C.surface2, borderRadius: '4px' }}>
          <div>
            <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.faint, marginBottom: '4px' }}>Role</p>
            {canChange ? (
              <select value={member.role} disabled={busy} onChange={e => changeRole(e.target.value as Role)}
                style={{ background: C.surface, color: C.text, fontSize: '12px', border: '0.5px solid ' + C.border, padding: '5px 8px', borderRadius: '2px', cursor: 'pointer' }}>
                {(['manager', 'chef', 'viewer'] as Role[]).map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                {yourRole === 'owner' && <option value="owner">Transfer ownership →</option>}
              </select>
            ) : (
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: isOwner ? C.gold : C.faint, background: (isOwner ? C.gold : C.faint) + '14', border: '0.5px solid ' + (isOwner ? C.gold : C.faint) + '40', padding: '3px 9px', borderRadius: '2px' }}>
                {ROLE_LABEL[member.role as Role]}
              </span>
            )}
            <p style={{ fontSize: '10px', color: C.faint, marginTop: '6px', maxWidth: '180px', lineHeight: 1.3 }}>{ROLE_DESC[member.role as Role]}</p>
          </div>
          <div style={{ borderLeft: '0.5px solid ' + C.border, paddingLeft: '20px' }}>
            <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.faint, marginBottom: '4px' }}>Joined</p>
            <p style={{ fontSize: '13px', color: C.text }}>{new Date(member.addedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
          <div style={{ borderLeft: '0.5px solid ' + C.border, paddingLeft: '20px' }}>
            <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.faint, marginBottom: '4px' }}>Total contributions</p>
            <p style={{ fontSize: '13px', color: counts.total > 0 ? C.gold : C.faint, fontWeight: 600 }}>{counts.total}</p>
          </div>
        </div>

        {/* Stats */}
        <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.faint, marginBottom: '8px' }}>Contribution breakdown</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
          <Stat label="Recipes"  value={counts.recipes}  C={C} />
          <Stat label="Costings" value={counts.costings} C={C} />
          <Stat label="Menus"    value={counts.menus}    C={C} />
          <Stat label="Notes"    value={counts.notes}    C={C} />
          <Stat label="Bank"     value={counts.bank}     C={C} />
          <Stat label="Stock"    value={counts.stock}    C={C} />
          <Stat label="Waste"    value={counts.waste}    C={C} />
          <Stat label="Invoices" value={counts.invoices} C={C} />
        </div>

        {/* Recent */}
        {recent.length > 0 && (
          <>
            <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.faint, marginBottom: '8px' }}>Recent activity</p>
            <div style={{ background: C.surface2, border: '0.5px solid ' + C.border, borderRadius: '3px', padding: '8px 14px', marginBottom: '20px' }}>
              {recent.map((it, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: C.dim, padding: '5px 0', borderBottom: i === recent.length - 1 ? 'none' : '0.5px solid ' + C.border }}>
                  <span><span style={{ color: C.faint, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: '8px' }}>{it.type}</span>{it.title}</span>
                  <span style={{ fontSize: '10px', color: C.faint }}>{it.when ? new Date(it.when).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Remove */}
        {canChange && (
          <div style={{ borderTop: '1px solid ' + C.border, paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            {!confirmRemove ? (
              <button onClick={() => setConfirmRemove(true)}
                style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.red, background: 'transparent', border: '0.5px solid ' + C.red, padding: '8px 16px', cursor: 'pointer', borderRadius: '2px' }}>
                Remove from team
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <p style={{ fontSize: '12px', color: C.red }}>Remove {member.name || member.email}?</p>
                <button onClick={() => setConfirmRemove(false)} style={{ fontSize: '11px', color: C.dim, background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                <button onClick={remove} disabled={busy} style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#fff', background: C.red, border: 'none', padding: '8px 16px', cursor: 'pointer', borderRadius: '2px' }}>
                  {busy ? '…' : 'Confirm'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, C }: { label: string; value: number; C: any }) {
  return (
    <div style={{ background: C.surface2, border: '0.5px solid ' + C.border, borderRadius: '3px', padding: '10px 12px' }}>
      <p style={{ fontSize: '20px', fontFamily: 'Georgia,serif', fontWeight: 300, color: value > 0 ? C.text : C.faint, lineHeight: 1.1 }}>{value}</p>
      <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.faint, marginTop: '2px' }}>{label}</p>
    </div>
  );
}

function InviteModal({ accountId, onClose, onCreated, C }: any) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('chef');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<{ url: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function send() {
    setBusy(true); setErr(null);
    try {
      const r = await authedFetch('/api/accounts/' + accountId + '/invites', {
        method: 'POST', body: JSON.stringify({ email: email.trim(), role }),
      });
      const json = await r.json();
      if (!r.ok) { setErr(json.error || 'Invite failed'); return; }
      const url = window.location.origin + '/invite/' + json.invite.token;
      setCreated({ url, email: json.invite.email });
      onCreated();
    } finally { setBusy(false); }
  }
  async function copy() {
    if (!created) return;
    try { await navigator.clipboard.writeText(created.url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '6px', padding: '28px', maxWidth: '460px', width: '100%' }}>
        <h2 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '22px', color: C.text, marginBottom: '16px' }}>
          {created ? 'Invite created' : 'Invite a team member'}
        </h2>

        {!created ? (
          <>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' }}>Email</label>
              <input type="email" autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="chef@kitchen.co"
                style={{ width: '100%', background: C.surface2, border: '1px solid ' + C.border, color: C.text, fontSize: '14px', padding: '10px 12px', outline: 'none', boxSizing: 'border-box', borderRadius: '3px' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' }}>Role</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                {(['manager', 'chef', 'viewer'] as Role[]).map(r => (
                  <button key={r} onClick={() => setRole(r)}
                    style={{ padding: '10px 8px', border: '1px solid ' + (role === r ? C.gold : C.border), background: role === r ? C.gold + '18' : C.surface2, color: role === r ? C.gold : C.dim, fontSize: '12px', fontWeight: role === r ? 700 : 400, cursor: 'pointer', borderRadius: '3px', textAlign: 'left' }}>
                    <div style={{ marginBottom: '2px' }}>{ROLE_LABEL[r]}</div>
                    <div style={{ fontSize: '10px', color: C.faint, fontWeight: 400, lineHeight: 1.3 }}>{ROLE_DESC[r]}</div>
                  </button>
                ))}
              </div>
            </div>
            {err && <p style={{ fontSize: '12px', color: C.red, marginBottom: '12px' }}>{err}</p>}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={onClose} disabled={busy} style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', background: 'transparent', border: '0.5px solid ' + C.border, color: C.dim, padding: '10px 18px', cursor: 'pointer', borderRadius: '2px' }}>Cancel</button>
              <button onClick={send} disabled={busy || !email.trim()} style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', background: C.gold, color: C.bg, border: 'none', padding: '10px 18px', cursor: busy || !email.trim() ? 'default' : 'pointer', borderRadius: '2px', opacity: busy || !email.trim() ? 0.6 : 1 }}>
                {busy ? 'Sending…' : 'Create invite'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: '13px', color: C.dim, marginBottom: '16px' }}>
              Copy this link and send it to <strong style={{ color: C.text }}>{created.email}</strong> — they&apos;ll be prompted to create an account and join your kitchen. The link is valid for 14 days.
            </p>
            <div style={{ background: C.surface2, border: '1px solid ' + C.border, borderRadius: '4px', padding: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <code style={{ flex: 1, fontSize: '11px', color: C.dim, fontFamily: 'monospace', wordBreak: 'break-all' }}>{created.url}</code>
              <button onClick={copy} style={{
                flexShrink: 0,
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                background: copied ? '#2A8A2A' : C.gold,
                color: copied ? '#fff' : C.bg,
                border: 'none',
                padding: '10px 18px',
                cursor: 'pointer',
                borderRadius: '3px',
                transition: 'background 0.15s, color 0.15s',
                minWidth: '110px',
              }}>
                {copied ? '✓ Copied!' : 'Copy link'}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', background: C.gold, color: C.bg, border: 'none', padding: '10px 18px', cursor: 'pointer', borderRadius: '2px' }}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
