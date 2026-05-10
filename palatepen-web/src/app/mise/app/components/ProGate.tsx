'use client';

interface ProGateProps {
  feature: string;
  title: string;
  desc: string;
  children: React.ReactNode;
  tier: string;
}

export default function ProGate({ feature, title, desc, children, tier }: ProGateProps) {
  if (tier === 'pro') return <>{children}</>;
  return (
    <div className="flex-1 flex items-center justify-center p-12 font-epilogue">
      <div className="max-w-sm text-center">
        <div className="w-16 h-16 rounded-full bg-mise-gold/10 border border-mise-gold/20 flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl">🔒</span>
        </div>
        <p className="text-xs font-bold tracking-widest uppercase text-mise-gold mb-3">Pro Feature</p>
        <h3 className="font-fraunces font-light text-2xl text-mise-text mb-3">{title}</h3>
        <p className="text-sm text-mise-dim leading-relaxed mb-8">{desc}</p>
        <div className="border border-mise-gold/40 bg-mise-gold/5 p-6 rounded mb-4 text-left">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold tracking-widest uppercase text-mise-gold">Mise Pro</span>
            <span className="font-fraunces font-light text-mise-text text-xl">£9.99<span className="text-sm text-mise-faint">/mo</span></span>
          </div>
          {['Unlimited recipes & notes','AI invoice scanning','URL recipe import','Price change alerts','Stock counter','Cloud sync'].map(f=>(
            <div key={f} className="flex items-center gap-2 mb-1.5">
              <span className="text-mise-gold text-xs">✓</span>
              <span className="text-xs text-mise-dim">{f}</span>
            </div>
          ))}
        </div>
        <button className="w-full bg-mise-gold text-mise-bg text-xs font-semibold tracking-widest uppercase py-3 hover:bg-yellow-400 transition-colors">
          Upgrade to Pro
        </button>
        <p className="text-xs text-mise-faint mt-3">or £99/year — save 17%</p>
      </div>
    </div>
  );
}