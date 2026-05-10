import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-ink/10 px-6 md:px-14 py-8 bg-cream">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <span className="font-fraunces font-light text-xl text-ink">Palate <i className="text-mustard">&</i> Pen</span>
        <div className="flex gap-8">
          {[['Services','/services'],['About','/about'],['Mise','/mise'],['Blog','/blog'],['Contact','/contact']].map(([l,h])=>(
            <Link key={h} href={h} className="font-epilogue text-xs text-slate hover:text-ink transition-colors tracking-wide">{l}</Link>
          ))}
        </div>
        <span className="font-epilogue text-xs text-slate tracking-widest uppercase">hello@palateandpen.co.uk</span>
      </div>
    </footer>
  );
}