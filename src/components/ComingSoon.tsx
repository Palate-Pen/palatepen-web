'use client';
import { useState } from 'react';

export default function ComingSoon() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [msg, setMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes('@')) { setMsg('Please enter a valid email address'); setStatus('error'); return; }
    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) { setStatus('success'); setMsg('You are on the list. We will be in touch.'); setEmail(''); }
      else { setStatus('error'); setMsg(data.error || 'Something went wrong. Please try again.'); }
    } catch {
      setStatus('error');
      setMsg('Something went wrong. Please try again.');
    }
  }

  return (
    <main className="min-h-screen bg-[#0E0D0B] flex flex-col relative overflow-hidden">

      {/* Decorative background amp */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 font-fraunces italic text-[500px] leading-none pointer-events-none select-none text-[#D4A017]/5 hidden lg:block">&</div>

      {/* Top bar */}
      <div className="fade-up-1 flex justify-between items-center px-8 md:px-16 pt-10">
        <div className="flex items-center gap-1">
          <span className="font-fraunces text-2xl font-light text-[#FAF7F2] tracking-tight">Palate</span>
          <span className="font-fraunces text-2xl italic text-[#D4A017] tracking-tight">&</span>
          <span className="font-fraunces text-2xl font-light text-[#FAF7F2] tracking-tight">Pen</span>
        </div>
        <span className="font-epilogue text-xs tracking-widest uppercase text-[#7A7A72]">London — Est. 2026</span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 py-20">

        <div className="fade-up-2 mb-6">
          <span className="font-epilogue text-xs font-medium tracking-widest uppercase text-[#2A7D6F]">
            Menu Design & Food Consultancy
          </span>
        </div>

        <h1 className="fade-up-3 font-fraunces font-light text-5xl md:text-7xl lg:text-8xl text-[#FAF7F2] leading-none tracking-tight mb-6 max-w-4xl">
          Something<br/>worth the<br/><span className="italic text-[#D4A017]">wait.</span>
        </h1>

        <p className="fade-up-4 font-epilogue font-light text-base md:text-lg text-[#7A7A72] max-w-md leading-relaxed mb-12 border-l-2 border-[#D4A017] pl-5">
          We make your menu as good as your food. A new kind of food consultancy — and a professional toolkit for working chefs — is nearly here.
        </p>

        {/* Email capture */}
        <div className="fade-up-5 max-w-md">
          {status === 'success' ? (
            <div className="border border-[#2A7D6F] bg-[#2A7D6F]/10 px-6 py-4">
              <p className="font-epilogue text-sm text-[#2A7D6F]">{msg}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="font-epilogue text-xs font-medium tracking-widest uppercase text-[#7A7A72] mb-4">
                Register your interest
              </p>
              <div className="flex gap-0">
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setStatus('idle'); setMsg(''); }}
                  placeholder="Your email address"
                  className="flex-1 bg-[#161512] border border-[#2E2B24] border-r-0 px-4 py-3 font-epilogue text-sm text-[#FAF7F2] placeholder-[#4A4840] focus:outline-none focus:border-[#D4A017] transition-colors"
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="bg-[#D4A017] text-[#0E0D0B] px-6 py-3 font-epilogue text-xs font-semibold tracking-widest uppercase hover:bg-yellow-400 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {status === 'loading' ? '...' : 'Notify Me'}
                </button>
              </div>
              {status === 'error' && (
                <p className="font-epilogue text-xs text-red-400 mt-2">{msg}</p>
              )}
              <p className="font-epilogue text-xs text-[#4A4840] mt-3">No spam. Just the launch — and a few things worth reading.</p>
            </form>
          )}
        </div>

        {/* Mise app teaser */}
        <div className="fade-up-5 mt-16 flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="font-fraunces text-xl font-bold italic text-[#FAF7F2]" style={{letterSpacing:'-1px'}}>M</span>
            <div className="w-2 h-2 rounded-full bg-[#C8960A]" style={{marginBottom:'6px'}}></div>
            <span className="font-fraunces text-xl font-light text-[#FAF7F2]" style={{letterSpacing:'4px'}}>ISE</span>
          </div>
          <div className="w-px h-6 bg-[#2E2B24]"></div>
          <span className="font-epilogue text-xs text-[#4A4840] tracking-wide">Professional chef's toolkit — App Store coming soon</span>
        </div>

      </div>

      {/* Footer */}
      <div className="fade-up-5 flex justify-between items-center px-8 md:px-16 pb-10">
        <span className="font-epilogue text-xs text-[#4A4840] tracking-wide">hello@palateandpen.co.uk</span>
        <a
          href="https://instagram.com/palate.pen"
          target="_blank"
          rel="noopener noreferrer"
          className="font-epilogue text-xs text-[#7A7A72] hover:text-[#D4A017] transition-colors tracking-widest uppercase"
        >
          Instagram
        </a>
      </div>

    </main>
  );
}