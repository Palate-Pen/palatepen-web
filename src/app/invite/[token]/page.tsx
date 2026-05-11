'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface InviteData {
  invite: { email: string; role: string; expiresAt: string };
  accountName: string;
  expired: boolean;
  accepted: boolean;
}

const C = {
  bg: '#0E0C0A', surface: '#16130F', surface2: '#1B1814', border: '#2A241D',
  text: '#F0E8DC', dim: '#C8B89A', faint: '#6B5E4A', gold: '#C8960A',
  red: '#B85A3A', green: '#5A8A4A',
};

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const { user, loading, refreshAccounts, switchAccount } = useAuth();
  const [data, setData] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetch('/api/invites/' + params.token)
      .then(r => r.json())
      .then(json => {
        if (json.error) setError(json.error);
        else setData(json);
      })
      .catch(e => setError(String(e)));
  }, [params.token]);

  async function accept() {
    setAccepting(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setError('Please sign in first'); setAccepting(false); return; }
      const r = await fetch('/api/invites/' + params.token + '/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      });
      const json = await r.json();
      if (!r.ok) { setError(json.error || 'Accept failed'); setAccepting(false); return; }
      await refreshAccounts();
      switchAccount(json.accountId);
      router.push('/app');
    } catch (e: any) {
      setError(String(e.message || e));
      setAccepting(false);
    }
  }

  if (!data && !error) return <Wrap><p style={{ color: C.faint }}>Loading invite…</p></Wrap>;
  if (error && !data) return <Wrap><Box title="Invite unavailable">{error}</Box></Wrap>;
  if (!data) return null;

  if (data.accepted) return <Wrap><Box title="Already accepted">This invite has already been used. Sign in to your account to access it.</Box></Wrap>;
  if (data.expired)  return <Wrap><Box title="Invite expired">This invite has expired. Ask the sender to send a new one.</Box></Wrap>;

  const roleLabel = data.invite.role.charAt(0).toUpperCase() + data.invite.role.slice(1);

  return (
    <Wrap>
      <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '6px', padding: '40px', maxWidth: '440px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '32px' }}>
          <span style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontStyle: 'italic', color: C.text, fontSize: '28px', letterSpacing: '-1px' }}>P</span>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: C.gold, marginBottom: '8px' }}></div>
          <span style={{ fontFamily: 'Georgia,serif', fontWeight: 300, color: C.text, fontSize: '28px', letterSpacing: '6px' }}>ALATABLE</span>
        </div>
        <p style={{ fontSize: '13px', color: C.faint, marginBottom: '8px' }}>You&apos;ve been invited to join</p>
        <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '28px', color: C.text, marginBottom: '12px' }}>{data.accountName}</h1>
        <p style={{ fontSize: '13px', color: C.dim, marginBottom: '4px' }}>as <strong style={{ color: C.gold }}>{roleLabel}</strong></p>
        <p style={{ fontSize: '11px', color: C.faint, marginBottom: '32px' }}>Invitation sent to {data.invite.email}</p>

        {loading ? (
          <p style={{ color: C.faint, fontSize: '12px' }}>Checking session…</p>
        ) : !user ? (
          <>
            <p style={{ fontSize: '12px', color: C.dim, marginBottom: '16px' }}>Sign in or create an account to accept this invite.</p>
            <a
              href={'/app?invite=' + params.token}
              onClick={() => { try { window.sessionStorage.setItem('palatable_pending_invite', params.token); } catch {} }}
              style={{ display: 'inline-block', background: C.gold, color: C.bg, fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', padding: '12px 28px', textDecoration: 'none', borderRadius: '3px' }}
            >
              Sign in to continue
            </a>
          </>
        ) : (
          <>
            <p style={{ fontSize: '12px', color: C.dim, marginBottom: '16px' }}>Signed in as <strong style={{ color: C.text }}>{user.email}</strong></p>
            <button onClick={accept} disabled={accepting} style={{ background: C.gold, color: C.bg, fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', padding: '12px 28px', border: 'none', cursor: accepting ? 'default' : 'pointer', borderRadius: '3px', opacity: accepting ? 0.6 : 1 }}>
              {accepting ? 'Joining…' : 'Accept invite'}
            </button>
            {error && <p style={{ color: C.red, fontSize: '12px', marginTop: '12px' }}>{error}</p>}
          </>
        )}
      </div>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'system-ui,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
      {children}
    </div>
  );
}
function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '6px', padding: '32px', maxWidth: '420px', textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '22px', color: C.text, marginBottom: '12px' }}>{title}</h1>
      <p style={{ fontSize: '13px', color: C.dim }}>{children}</p>
    </div>
  );
}
