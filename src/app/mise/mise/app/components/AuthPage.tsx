'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'landing'|'signin'|'signup'>('landing');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSignIn() {
    if (!email||!password) { setError('Please fill in all fields'); return; }
    setLoading(true); setError('');
    try { await signIn(email, password); }
    catch(e:any) { setError(e.message||'Sign in failed'); }
    setLoading(false);
  }

  async function handleSignUp() {
    if (!name||!email||!password) { setError('Please fill in all fields'); return; }
    if (password.length<6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    try { await signUp(email, password, name); setSuccess('Check your email to confirm your account, then sign in.'); setMode('signin'); }
    catch(e:any) { setError(e.message||'Sign up failed'); }
    setLoading(false);
  }

  if (mode==='landing') return (
    <div className="min-h-screen bg-mise-bg font-epilogue flex flex-col">
      <nav className="px-8 py-5 border-b border-mise-border flex justify-between items-center">
        <Link href="/mise" className="flex items-center gap-1">
          <span className="font-fraunces font-bold italic text-mise-text text-2xl" style={{letterSpacing:'-1px'}}>M</span>
          <div className="w-2 h-2 rounded-full bg-mise-gold" style={{marginBottom:'7px'}}></div>
          <span className="font-fraunces font-light text-mise-text text-2xl" style={{letterSpacing:'5px'}}>ISE</span>
        </Link>
        <button onClick={()=>setMode('signin')} className="text-xs text-mise-dim hover:text-mise-text transition-colors tracking-widest uppercase">Sign In</button>
      </nav>
      <div className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full px-8 py-16 gap-16 items-center">
        <div className="flex-1">
          <p className="text-xs font-medium tracking-widest uppercase text-mise-gold mb-4">By Palate & Pen</p>
          <h1 className="font-fraunces font-light text-mise-text leading-tight mb-6" style={{fontSize:'clamp(36px,5vw,60px)'}}>
            The professional<br/><i className="text-mise-gold">chef's toolkit</i>
          </h1>
          <p className="text-mise-dim leading-relaxed mb-10 max-w-md">Recipe library, GP calculator, invoice scanning, and stock counting — everything a working chef needs, on any device.</p>
          <div className="space-y-3">
            <button onClick={()=>setMode('signup')} className="block w-full max-w-xs text-center text-sm font-semibold tracking-widest uppercase bg-mise-gold text-mise-bg py-3.5 hover:bg-yellow-400 transition-colors">
              Get Started Free
            </button>
            <button onClick={()=>setMode('signin')} className="block w-full max-w-xs text-center text-sm tracking-widest uppercase border border-mise-border-light text-mise-dim py-3.5 hover:border-mise-gold hover:text-mise-gold transition-colors">
              Sign In
            </button>
          </div>
        </div>
        <div className="flex-1 max-w-sm w-full space-y-3">
          {[{tier:'Free',price:'£0',desc:'5 recipes, 10 notes, basic GP calculator',highlight:false},
            {tier:'Pro',price:'£9.99/mo',desc:'Unlimited everything + AI scanning + cloud sync. Or £99/year — save 17%',highlight:true}].map(t=>(
            <div key={t.tier} className={`p-6 border rounded ${t.highlight?'border-mise-gold/40 bg-mise-gold/5':'border-mise-border'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className={`text-xs font-bold tracking-widest uppercase ${t.highlight?'text-mise-gold':'text-mise-faint'}`}>{t.tier}</span>
                <span className={`font-fraunces font-light text-2xl ${t.highlight?'text-mise-gold':'text-mise-text'}`}>{t.price}</span>
              </div>
              <p className="text-xs text-mise-dim leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-mise-bg font-epilogue flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-1.5 mb-10">
          <span className="font-fraunces font-bold italic text-mise-text text-3xl" style={{letterSpacing:'-1px'}}>M</span>
          <div className="w-2.5 h-2.5 rounded-full bg-mise-gold" style={{marginBottom:'10px'}}></div>
          <span className="font-fraunces font-light text-mise-text text-3xl" style={{letterSpacing:'6px'}}>ISE</span>
        </div>
        <h2 className="font-fraunces font-light text-2xl text-mise-text mb-2">{mode==='signin'?'Welcome back':'Create account'}</h2>
        <p className="text-sm text-mise-faint mb-8">{mode==='signin'?'Sign in to your Mise account':'Start free — upgrade to Pro anytime'}</p>
        {error&&<div className="bg-red-900/20 border border-red-800/40 text-red-400 text-sm px-4 py-3 rounded mb-4">{error}</div>}
        {success&&<div className="bg-green-900/20 border border-green-800/40 text-green-400 text-sm px-4 py-3 rounded mb-4">{success}</div>}
        <div className="space-y-4">
          {mode==='signup'&&(
            <div>
              <label className="text-xs font-bold tracking-widest uppercase text-mise-faint block mb-2">Your Name</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Jack Harrison"
                className="w-full bg-mise-surface border border-mise-border text-mise-text text-sm px-4 py-3 focus:outline-none focus:border-mise-gold transition-colors placeholder-mise-faint" />
            </div>
          )}
          <div>
            <label className="text-xs font-bold tracking-widest uppercase text-mise-faint block mb-2">Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="hello@example.com"
              className="w-full bg-mise-surface border border-mise-border text-mise-text text-sm px-4 py-3 focus:outline-none focus:border-mise-gold transition-colors placeholder-mise-faint" />
          </div>
          <div>
            <label className="text-xs font-bold tracking-widest uppercase text-mise-faint block mb-2">Password</label>
            <div className="flex border border-mise-border focus-within:border-mise-gold transition-colors">
              <input type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==='signup'?'At least 6 characters':'Your password'}
                className="flex-1 bg-mise-surface text-mise-text text-sm px-4 py-3 focus:outline-none placeholder-mise-faint" />
              <button onClick={()=>setShowPw(v=>!v)} className="px-4 text-xs text-mise-faint hover:text-mise-dim transition-colors bg-mise-surface">{showPw?'Hide':'Show'}</button>
            </div>
          </div>
        </div>
        <button onClick={mode==='signin'?handleSignIn:handleSignUp} disabled={loading}
          className="w-full mt-6 bg-mise-gold text-mise-bg text-sm font-semibold tracking-widest uppercase py-3.5 hover:bg-yellow-400 transition-colors disabled:opacity-50">
          {loading?'...':(mode==='signin'?'Sign In':'Create Account')}
        </button>
        <button onClick={()=>setMode(mode==='signin'?'signup':'signin')} className="w-full mt-3 text-sm text-mise-faint hover:text-mise-dim transition-colors py-2">
          {mode==='signin'?'No account? Sign up free':'Already have an account? Sign in'}
        </button>
        <button onClick={()=>setMode('landing')} className="w-full text-xs text-mise-faint hover:text-mise-dim transition-colors py-1">← Back</button>
      </div>
    </div>
  );
}