'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
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
interface TeamData { account: { id: string; name: string; tier: string; owner_user_id: string }; members: Member[]; invites: Invite[]; seats: Seats; yourRole: Role; }

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

export default function TeamSection({ onUpgrade }: { onUpgrade?: () => void }) {
  const { currentAccount, currentRole, refreshAccounts } = useAuth();
  const { settings } = useSettings();
  const C = settings.resolved === 'light' ? light : dark;
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  const accountId = currentAccount?.id;
  const tier = currentAccount?.tier || 'free';
  const isPaidTeamTier = tier === 'kitchen' || tier === 'group';
  const canManage = currentRole === 'owner' || currentRole === 'manager';

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true); setErr(null);
    try {
      const r = await authedFetch('/api/accounts/' + accountId + '/team');
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || 'Load failed');
      setData(json);
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [accountId]);
  useEffect(() => { load(); }, [load]);

  if (!canManage) return null;

  const card: any = { background: C.surface2, border: '1px solid ' + C.border, borderRadius: '4px', padding: '20px', marginBottom: '12px' };
  const sec: any = { fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint };

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={sec}>Team</p>
        {data && (
          <span style={{ fontSize: '11px', color: C.faint }}>
            {data.seats.limit === null ? `${data.seats.used} members` : `${data.seats.used} of ${data.seats.limit} seats used`}
          </span>
        )}
      </div>

      {!isPaidTeamTier && (
        <div style={{ background: C.gold + '0c', border: '0.5px dashed ' + C.gold + '40', borderRadius: '3px', padding: '14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '13px', color: C.text, marginBottom: '4px', fontWeight: 600 }}>Upgrade to Kitchen to invite team members</p>
            <p style={{ fontSize: '11px', color: C.dim }}>Free and Pro tiers are single-user. Kitchen unlocks up to 10 team members; Group is unlimited.</p>
          </div>
          {onUpgrade && (
            <button onClick={onUpgrade} style={{ flexShrink: 0, fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', background: C.gold, color: C.bg, padding: '8px 16px', border: 'none', cursor: 'pointer', borderRadius: '2px' }}>
              Upgrade
            </button>
          )}
        </div>
      )}

      {err && <p style={{ fontSize: '12px', color: C.red, marginBottom: '12px' }}>{err}</p>}
      {loading && !data && <p style={{ fontSize: '12px', color: C.faint }}>Loading team…</p>}

      {data && (
        <>
          {/* Members */}
          <div style={{ background: C.surface, border: '0.5px solid ' + C.border, borderRadius: '3px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 28px', gap: '8px', padding: '8px 12px', background: C.surface2, fontSize: '9px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: C.faint }}>
              <span>Member</span><span style={{ textAlign: 'right' }}>Role</span><span></span>
            </div>
            {data.members.map(m => (
              <MemberRow key={m.userId} m={m} accountId={data.account.id} ownerId={data.account.owner_user_id} yourRole={data.yourRole} onChanged={() => { load(); refreshAccounts(); }} C={C} />
            ))}
          </div>

          {/* Pending invites */}
          {data.invites.length > 0 && (
            <div style={{ background: C.surface, border: '0.5px solid ' + C.border, borderRadius: '3px', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ padding: '8px 12px', background: C.surface2, fontSize: '9px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: C.faint, display: 'flex', justifyContent: 'space-between' }}>
                <span>Pending invites</span><span>{data.invites.length}</span>
              </div>
              {data.invites.map(inv => (
                <InviteRow key={inv.id} inv={inv} accountId={data.account.id} onChanged={load} C={C} />
              ))}
            </div>
          )}

          {/* Invite button */}
          {isPaidTeamTier && (
            <button
              disabled={!data.seats.hasRoom}
              onClick={() => setShowInvite(true)}
              title={!data.seats.hasRoom ? 'Seat limit reached — upgrade to add more' : ''}
              style={{
                fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase',
                background: data.seats.hasRoom ? C.gold : C.surface, color: data.seats.hasRoom ? C.bg : C.faint,
                border: data.seats.hasRoom ? 'none' : '0.5px solid ' + C.border,
                padding: '10px 20px', cursor: data.seats.hasRoom ? 'pointer' : 'not-allowed', borderRadius: '2px',
                opacity: data.seats.hasRoom ? 1 : 0.6,
              }}
            >
              + Invite member
            </button>
          )}
        </>
      )}

      {showInvite && data && (
        <InviteModal accountId={data.account.id} onClose={() => setShowInvite(false)} onCreated={load} C={C} />
      )}
    </div>
  );
}

function MemberRow({ m, accountId, yourRole, onChanged, C }: any) {
  const isOwner = m.role === 'owner';
  const canChange = !isOwner && (yourRole === 'owner' || yourRole === 'manager');
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  async function changeRole(newRole: Role) {
    if (newRole === 'owner' && !confirm('Transfer ownership to this member? You will become a Manager.')) return;
    setBusy(true);
    try {
      const r = await authedFetch('/api/accounts/' + accountId + '/members/' + m.userId, {
        method: 'PATCH', body: JSON.stringify({ role: newRole }),
      });
      const json = await r.json();
      if (!r.ok) alert(json.error || 'Update failed');
      onChanged();
    } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true);
    try {
      const r = await authedFetch('/api/accounts/' + accountId + '/members/' + m.userId, { method: 'DELETE' });
      const json = await r.json();
      if (!r.ok) alert(json.error || 'Remove failed');
      onChanged();
    } finally { setBusy(false); }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 28px', gap: '8px', padding: '10px 12px', borderTop: '0.5px solid ' + C.border, alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: C.gold + '22', color: C.gold, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, fontFamily: 'Georgia,serif', flexShrink: 0 }}>
          {(m.name || m.email || '?').charAt(0).toUpperCase()}
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '13px', color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {m.name || m.email || 'Unknown user'}
          </p>
          {m.name && m.email && <p style={{ fontSize: '11px', color: C.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</p>}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        {canChange ? (
          <select value={m.role} disabled={busy} onChange={e => changeRole(e.target.value as Role)}
            style={{ background: C.surface2, color: C.text, fontSize: '11px', border: '0.5px solid ' + C.border, padding: '4px 6px', borderRadius: '2px', cursor: 'pointer' }}>
            {(['manager', 'chef', 'viewer'] as Role[]).map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            {yourRole === 'owner' && <option value="owner">Transfer ownership →</option>}
          </select>
        ) : (
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: isOwner ? C.gold : C.faint, background: (isOwner ? C.gold : C.faint) + '14', border: '0.5px solid ' + (isOwner ? C.gold : C.faint) + '40', padding: '2px 8px', borderRadius: '2px' }}>
            {ROLE_LABEL[m.role as Role]}
          </span>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        {!isOwner && canChange && (
          confirmRemove ? (
            <span style={{ display: 'inline-flex', gap: '4px' }}>
              <button onClick={remove} disabled={busy} title="Confirm remove" style={{ background: 'none', border: 'none', color: C.red, fontSize: '13px', cursor: 'pointer', padding: '0 2px' }}>✓</button>
              <button onClick={() => setConfirmRemove(false)} title="Cancel" style={{ background: 'none', border: 'none', color: C.faint, fontSize: '13px', cursor: 'pointer', padding: '0 2px' }}>×</button>
            </span>
          ) : (
            <button onClick={() => setConfirmRemove(true)} title="Remove from team" style={{ background: 'none', border: 'none', color: C.faint, fontSize: '14px', cursor: 'pointer', padding: '0 4px' }}>×</button>
          )
        )}
      </div>
    </div>
  );
}

function InviteRow({ inv, accountId, onChanged, C }: any) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = (typeof window !== 'undefined' ? window.location.origin : '') + '/invite/' + inv.token;

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

  const expires = new Date(inv.expires_at);
  const daysLeft = Math.max(0, Math.ceil((expires.getTime() - Date.now()) / 86400000));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '8px', padding: '10px 12px', borderTop: '0.5px solid ' + C.border, alignItems: 'center' }}>
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
    try { await navigator.clipboard.writeText(created.url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
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
              Share this link with <strong style={{ color: C.text }}>{created.email}</strong> — it&apos;s valid for 14 days. Email delivery isn&apos;t wired in yet, so paste it into your preferred channel.
            </p>
            <div style={{ background: C.surface2, border: '1px solid ' + C.border, borderRadius: '3px', padding: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <code style={{ flex: 1, fontSize: '11px', color: C.dim, fontFamily: 'monospace', wordBreak: 'break-all' }}>{created.url}</code>
              <button onClick={copy} style={{ flexShrink: 0, fontSize: '10px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', background: copied ? C.gold + '22' : C.gold, color: copied ? C.gold : C.bg, border: 'none', padding: '6px 12px', cursor: 'pointer', borderRadius: '2px' }}>
                {copied ? '✓ Copied' : 'Copy'}
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
