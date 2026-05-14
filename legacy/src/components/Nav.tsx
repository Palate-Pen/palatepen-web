'use client';
import { useState } from 'react';
import Link from 'next/link';

const links = [
  { label:'About', href:'/about' },
  { label:'Services', href:'/services' },
  { label:'Palatable', href:'/palatable' },
  { label:'Blog', href:'/blog' },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-cream/95 backdrop-blur-sm border-b border-ink/10">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="font-fraunces text-xl font-light text-ink">
          Palate <span className="italic text-mustard">&amp;</span> Pen
        </Link>
        {/* Desktop */}
        <div className="hidden md:flex gap-8 items-center">
          {links.map(l => (
            <Link key={l.href} href={l.href} className="font-epilogue text-xs text-slate hover:text-ink transition-colors tracking-widest uppercase">{l.label}</Link>
          ))}
          <Link href="/contact" className="font-epilogue text-xs font-semibold tracking-widest uppercase bg-ink text-cream px-5 py-2.5 hover:bg-teal transition-colors">Get in Touch</Link>
        </div>
        {/* Mobile hamburger */}
        <button onClick={() => setOpen(!open)} className="md:hidden flex flex-col gap-1.5 p-2" aria-label="Menu">
          <span className={`block w-5 h-0.5 bg-ink transition-all ${open ? 'rotate-45 translate-y-2' : ''}`}></span>
          <span className={`block w-5 h-0.5 bg-ink transition-all ${open ? 'opacity-0' : ''}`}></span>
          <span className={`block w-5 h-0.5 bg-ink transition-all ${open ? '-rotate-45 -translate-y-2' : ''}`}></span>
        </button>
      </div>
      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-cream border-t border-ink/10 px-6 py-4 flex flex-col gap-4">
          {links.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="font-epilogue text-sm text-ink tracking-widest uppercase">{l.label}</Link>
          ))}
          <Link href="/contact" onClick={() => setOpen(false)} className="font-epilogue text-xs font-semibold tracking-widest uppercase bg-ink text-cream px-5 py-3 text-center hover:bg-teal transition-colors">Get in Touch</Link>
        </div>
      )}
    </nav>
  );
}