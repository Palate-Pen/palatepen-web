'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

// Brand-locked dark palette for the landing — matches the spec colours exactly,
// not the user's dark.theme tokens (which are slightly different).
const C = {
  bg: '#0E0C0A',
  surface: '#1C1A17',
  surface2: '#242118',
  border: '#35302A',
  text: '#F0E8DC',
  dim: '#C0B8AC',
  faint: '#7A7470',
  gold: '#C8960A',
  goldLight: '#E8AE20',
  red: '#C84040',
  green: '#5AAA6A',
};

const TIERS = [
  { name: 'Free',    price: '£0',   period: '',          tag: 'Get started' },
  { name: 'Pro',     price: '£25',  period: '/month',    tag: 'Most popular', highlight: true },
  { name: 'Kitchen', price: '£59',  period: '/month',    tag: 'Up to 5 users' },
  { name: 'Group',   price: '£129', period: '/month',    tag: 'Multi-outlet' },
];

const FEATURES = [
  { icon: '📖', title: 'Recipe Library',   desc: 'AI URL import. Allergens, nutrition, spec sheets.' },
  { icon: '£',  title: 'GP Costing',        desc: 'Ingredient-level costs with target GP analysis.' },
  { icon: '🧾', title: 'Invoice Scanning',  desc: 'Photograph an invoice — Claude reads every line.' },
  { icon: '📦', title: 'Stock Control',     desc: 'Par levels, alerts, and live value across all sites.' },
];

const STATS = [
  { value: '73.9%', label: 'Average GP tracked' },
  { value: '£389',  label: 'Stock value tracked live' },
  { value: 'AI',    label: 'Invoice scanning in seconds' },
  { value: '£25',   label: 'Per month for the full toolkit' },
];

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'landing' | 'signin' | 'signup'>('landing');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inp: React.CSSProperties = { width: '100%', background: C.surface, border: '1px solid ' + C.border, color: C.text, fontSize: '14px', padding: '12px 14px', outline: 'none', fontFamily: 'system-ui,sans-serif', boxSizing: 'border-box' };

  async function handleSignIn() {
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true); setError('');
    try { await signIn(email, password); }
    catch (e: any) { setError(e.message || 'Sign in failed'); }
    setLoading(false);
  }
  async function handleSignUp() {
    if (!name || !email || !password) { setError('Please fill in all fields'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    try {
      let skipPersonal = false;
      try { skipPersonal = !!window.sessionStorage.getItem('palatable_pending_invite'); } catch {}
      await signUp(email, password, name, { skipPersonal });
      setSuccess('Check your email to confirm, then sign in.'); setMode('signin');
    } catch (e: any) { setError(e.message || 'Sign up failed'); }
    setLoading(false);
  }

  // ── LANDING ────────────────────────────────────────────────
  if (mode === 'landing') return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'system-ui,sans-serif' }}>
      {/* Nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', borderBottom: '1px solid ' + C.border }}>
        <Logo />
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <a onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ fontSize: '12px', color: C.dim, cursor: 'pointer', letterSpacing: '0.5px' }}>Features</a>
          <a onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ fontSize: '12px', color: C.dim, cursor: 'pointer', letterSpacing: '0.5px' }}>Pricing</a>
          <button onClick={() => setMode('signin')} style={{ fontSize: '12px', color: C.dim, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.5px' }}>Sign in</button>
          <button onClick={() => setMode('signup')} style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', background: C.gold, color: C.bg, padding: '10px 18px', border: 'none', cursor: 'pointer', borderRadius: '2px' }}>
            Start free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: '1180px', margin: '0 auto', padding: '64px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: '11px', color: C.gold, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '20px' }}>By Palate &amp; Pen</p>
          <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: 'clamp(40px, 5.5vw, 64px)', lineHeight: 1.05, marginBottom: '24px' }}>
            Back office work<br />you can <i style={{ color: C.gold }}>stomach</i>
          </h1>
          <p style={{ fontSize: '17px', color: C.dim, lineHeight: 1.6, marginBottom: '32px', maxWidth: '460px' }}>
            Recipes, costing, AI invoice scanning and stock control — built for working chefs. No spreadsheets, no clipboards.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => setMode('signup')} style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', background: C.gold, color: C.bg, padding: '15px 28px', border: 'none', cursor: 'pointer', borderRadius: '2px' }}>
              Get started free
            </button>
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', background: 'transparent', color: C.text, padding: '15px 28px', border: '1px solid ' + C.border, cursor: 'pointer', borderRadius: '2px' }}>
              See how it works
            </button>
          </div>
          <p style={{ fontSize: '12px', color: C.faint, marginTop: '24px' }}>5× cheaper than the competition</p>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {STATS.map(s => (
            <div key={s.label} style={{ background: C.surface, border: '1px solid ' + C.border, padding: '24px 20px', borderRadius: '4px' }}>
              <p style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '32px', color: C.gold, marginBottom: '8px', lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: '12px', color: C.dim, lineHeight: 1.4 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature strip */}
      <section id="features" style={{ borderTop: '1px solid ' + C.border, borderBottom: '1px solid ' + C.border, background: C.surface + '60' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '48px 40px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
          {FEATURES.map(f => (
            <div key={f.title}>
              <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: C.gold + '14', border: '1px solid ' + C.gold + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', fontSize: '18px', color: C.gold, fontFamily: 'Georgia,serif', fontWeight: 700 }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '6px', letterSpacing: '0.3px' }}>{f.title}</h3>
              <p style={{ fontSize: '12px', color: C.faint, lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing row */}
      <section id="pricing" style={{ maxWidth: '1180px', margin: '0 auto', padding: '64px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '20px', marginBottom: '32px' }}>
          <p style={{ fontSize: '11px', color: C.gold, letterSpacing: '2px', textTransform: 'uppercase' }}>Pricing</p>
          <h2 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '32px' }}>Simple, honest <i style={{ color: C.gold }}>pricing</i></h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {TIERS.map(t => (
            <div key={t.name} style={{
              background: t.highlight ? C.gold + '08' : C.surface,
              border: '1px solid ' + (t.highlight ? C.gold + '50' : C.border),
              padding: '24px 20px', borderRadius: '4px', position: 'relative',
            }}>
              {t.highlight && (
                <span style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '9px', fontWeight: 700, color: C.gold, background: C.gold + '14', border: '0.5px solid ' + C.gold + '40', padding: '2px 6px', borderRadius: '2px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Popular
                </span>
              )}
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: t.highlight ? C.gold : C.faint, marginBottom: '12px' }}>{t.name}</p>
              <p style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '36px', color: C.text, marginBottom: '4px', lineHeight: 1 }}>
                {t.price}<span style={{ fontSize: '13px', color: C.faint }}>{t.period}</span>
              </p>
              <p style={{ fontSize: '11px', color: C.faint, marginTop: '8px' }}>{t.tag}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid ' + C.border, padding: '24px 40px', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: C.faint, letterSpacing: '0.5px' }}>Palate &amp; Pen · hello@palateandpen.co.uk</p>
      </footer>
    </div>
  );

  // ── SIGN IN / SIGN UP ──────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ marginBottom: '40px' }}><Logo /></div>
        <h2 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '26px', color: C.text, marginBottom: '6px' }}>
          {mode === 'signin' ? 'Welcome back' : 'Create account'}
        </h2>
        <p style={{ fontSize: '13px', color: C.faint, marginBottom: '32px' }}>
          {mode === 'signin' ? 'Sign in to Palatable' : 'Start free — upgrade anytime'}
        </p>
        {error && <div style={{ background: C.red + '1A', border: '1px solid ' + C.red + '4D', color: C.red, fontSize: '13px', padding: '10px 14px', marginBottom: '16px', borderRadius: '2px' }}>{error}</div>}
        {success && <div style={{ background: C.green + '1A', border: '1px solid ' + C.green + '4D', color: C.green, fontSize: '13px', padding: '10px 14px', marginBottom: '16px', borderRadius: '2px' }}>{success}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {mode === 'signup' && <Field label="Your name" value={name} onChange={setName} placeholder="Jack Harrison" />}
          <Field label="Email" value={email} onChange={setEmail} placeholder="hello@example.com" type="email" />
          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' }}>Password</label>
            <div style={{ display: 'flex', border: '1px solid ' + C.border, background: C.surface }}>
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" style={{ ...inp, flex: 1, border: 'none' }} />
              <button onClick={() => setShowPw(v => !v)} style={{ padding: '0 14px', background: 'none', border: 'none', color: C.faint, fontSize: '11px', cursor: 'pointer' }}>{showPw ? 'Hide' : 'Show'}</button>
            </div>
          </div>
        </div>
        <button onClick={mode === 'signin' ? handleSignIn : handleSignUp} disabled={loading}
          style={{ width: '100%', marginTop: '20px', background: C.gold, color: C.bg, fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', padding: '14px', border: 'none', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? '...' : (mode === 'signin' ? 'Sign in' : 'Create account')}
        </button>
        <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} style={{ width: '100%', marginTop: '12px', background: 'none', border: 'none', color: C.faint, fontSize: '13px', cursor: 'pointer', padding: '8px' }}>
          {mode === 'signin' ? 'No account? Sign up free' : 'Already have an account? Sign in'}
        </button>
        <button onClick={() => setMode('landing')} style={{ width: '100%', background: 'none', border: 'none', color: C.faint, fontSize: '12px', cursor: 'pointer', padding: '4px' }}>← Back</button>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontStyle: 'italic', color: C.text, fontSize: '26px', letterSpacing: '-1px' }}>P</span>
      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: C.gold, marginBottom: '9px' }}></div>
      <span style={{ fontFamily: 'Georgia,serif', fontWeight: 300, color: C.text, fontSize: '26px', letterSpacing: '5px' }}>ALATABLE</span>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: any) {
  return (
    <div>
      <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, color: C.text, fontSize: '14px', padding: '12px 14px', outline: 'none', fontFamily: 'system-ui,sans-serif', boxSizing: 'border-box' }} />
    </div>
  );
}
