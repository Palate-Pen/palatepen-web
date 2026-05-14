import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-ink border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <div className="font-fraunces text-xl font-light text-cream mb-2">
              Palate <span className="italic text-mustard">&amp;</span> Pen
            </div>
            <p className="font-epilogue text-xs text-white/40 max-w-xs leading-relaxed">Menu design and food consultancy. London, UK.</p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {[['About','/about'],['Services','/services'],['Palatable','/palatable'],['Blog','/blog'],['Contact','/contact']].map(([l,h]) => (
              <Link key={h} href={h} className="font-epilogue text-xs text-white/40 hover:text-white/70 transition-colors tracking-widest uppercase">{l}</Link>
            ))}
          </div>
          <div className="flex flex-col gap-2 text-right">
            <a href="https://instagram.com/palate.pen" target="_blank" rel="noopener noreferrer" className="font-epilogue text-xs text-mustard hover:text-yellow-400 transition-colors tracking-widest uppercase">@palate.pen</a>
            <span className="font-epilogue text-xs text-white/30">hello@palateandpen.co.uk</span>
          </div>
        </div>
        <div className="border-t border-white/5 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-2">
          <span className="font-epilogue text-xs text-white/20">&copy; 2026 Palate &amp; Pen. All rights reserved.</span>
          <Link href="/palatable/app" className="font-epilogue text-xs text-white/30 hover:text-mustard transition-colors tracking-widest uppercase">Open Palatable App</Link>
        </div>
      </div>
    </footer>
  );
}