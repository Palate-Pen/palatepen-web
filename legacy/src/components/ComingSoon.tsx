'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ComingSoon() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true); setError('');
    try {
      const { error: err } = await supabase.from('waitlist').insert({ email, created_at: new Date().toISOString() });
      if (err && !err.message.includes('duplicate')) throw err;
      setSubmitted(true);
    } catch (e: any) {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1A1A18', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
      <nav style={{ padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(250,247,242,0.06)' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 300, color: '#FAF7F2' }}>
          Palate <span style={{ fontStyle: 'italic', color: '#D4A017' }}>&amp;</span> Pen
        </div>
        <a href="mailto:hello@palateandpen.co.uk" style={{ fontFamily: 'system-ui,sans-serif', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(250,247,242,0.4)', textDecoration: 'none' }}>
          hello@palateandpen.co.uk
        </a>
      </nav>

      {/* Hero */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>

        {/* Background amp */}
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '500px', color: 'rgba(212,160,23,0.04)', lineHeight: 1, pointerEvents: 'none', userSelect: 'none', whiteSpace: 'nowrap' }}>&amp;</div>

        <div style={{ position: 'relative', maxWidth: '640px' }}>
          <p style={{ fontFamily: 'system-ui,sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#2A7D6F', marginBottom: '28px' }}>
            Menu Design &amp; Food Consultancy
          </p>

          <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 'clamp(40px,7vw,80px)', lineHeight: 1.05, letterSpacing: '-0.02em', color: '#FAF7F2', marginBottom: '12px' }}>
            We make your menu<br />as good as your
          </h1>
          <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontStyle: 'italic', fontSize: 'clamp(40px,7vw,80px)', lineHeight: 1.05, letterSpacing: '-0.02em', color: '#D4A017', marginBottom: '36px' }}>
            food.
          </h1>

          <div style={{ width: '40px', height: '1px', background: '#D4A017', margin: '0 auto 36px' }}></div>

          <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '18px', color: 'rgba(250,247,242,0.45)', lineHeight: 1.7, marginBottom: '48px', maxWidth: '480px', margin: '0 auto 48px' }}>
            Something considered is on its way. Leave your email and we&apos;ll be in touch when we&apos;re ready.
          </p>

          {submitted ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'rgba(42,125,111,0.15)', border: '1px solid rgba(42,125,111,0.3)', padding: '16px 28px', borderRadius: '3px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#2A7D6F', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>&#10003;</span>
              </div>
              <p style={{ fontFamily: 'system-ui,sans-serif', fontSize: '14px', color: '#2A7D6F' }}>You&apos;re on the list. We&apos;ll be in touch.</p>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: 'flex', gap: '8px', maxWidth: '420px', margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Your email address"
                style={{ flex: 1, minWidth: '220px', background: 'rgba(250,247,242,0.06)', border: '1px solid rgba(250,247,242,0.12)', color: '#FAF7F2', fontSize: '14px', padding: '14px 18px', outline: 'none', fontFamily: 'system-ui,sans-serif', borderRadius: '2px' }}
              />
              <button type="submit" disabled={loading || !email}
                style={{ fontFamily: 'system-ui,sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', background: '#D4A017', color: '#1A1A18', border: 'none', padding: '14px 24px', cursor: 'pointer', borderRadius: '2px', opacity: loading || !email ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                {loading ? '...' : 'Notify Me'}
              </button>
              {error && <p style={{ width: '100%', textAlign: 'center', fontSize: '12px', color: '#C84040', marginTop: '8px' }}>{error}</p>}
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ padding: '20px 48px', borderTop: '1px solid rgba(250,247,242,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontFamily: 'system-ui,sans-serif', fontSize: '11px', color: 'rgba(250,247,242,0.2)', letterSpacing: '0.5px' }}>&copy; 2026 Palate &amp; Pen</span>
        <a href="https://instagram.com/palate.pen" target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'system-ui,sans-serif', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#D4A017', textDecoration: 'none' }}>@palate.pen</a>
      </footer>
    </main>
  );
}