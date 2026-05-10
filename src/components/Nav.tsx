'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-cream/90 backdrop-blur-sm border-b border-ink/10">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="font-fraunces text-xl font-light text-ink">
          Palate <span className="italic text-mustard">&</span> Pen
        </Link>
        <div className="hidden md:flex gap-8 items-center">
          {[['Services','/services'],['About','/about'],['Mise','/mise'],['Blog','/blog']].map(([label,href])=>(
            <Link key={href} href={href} className="font-epilogue text-sm text-slate hover:text-ink transition-colors tracking-wide">{label}</Link>
          ))}
          <Link href="/mise" className="font-epilogue text-xs font-medium tracking-widest uppercase bg-ink text-cream px-4 py-2 hover:bg-teal transition-colors">
            Get Mise
          </Link>
        </div>
      </div>
    </nav>
  );
}