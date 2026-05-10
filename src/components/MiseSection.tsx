import Link from 'next/link';

export default function MiseSection() {
  return (
    <section className="py-24 px-6 md:px-14 bg-mise-dark">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="flex-1">
            <p className="font-epilogue text-xs font-medium tracking-widest uppercase text-mise-gold mb-6">Our App</p>
            <div className="flex items-center gap-2 mb-8">
              <span className="font-fraunces text-5xl font-bold italic text-cream leading-none" style={{letterSpacing:'-2px'}}>M</span>
              <div className="w-3 h-3 rounded-full bg-mise-gold" style={{marginBottom:'16px'}}></div>
              <span className="font-fraunces text-5xl font-light text-cream" style={{letterSpacing:'12px'}}>ISE</span>
            </div>
            <h2 className="font-fraunces font-light text-4xl md:text-5xl text-cream leading-tight mb-6">
              The professional<br/>chef's <i className="text-mise-gold">toolkit</i>
            </h2>
            <p className="font-epilogue font-light text-base text-cream/60 max-w-md leading-relaxed mb-10">
              Recipe library, idea notebook, GP calculator, AI invoice scanning, price alerts, and stock counting — everything a working chef needs in one place.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link href="/mise" className="font-epilogue text-xs font-semibold tracking-widest uppercase bg-mise-gold text-mise-dark px-6 py-3 hover:bg-yellow-400 transition-colors">
                Learn More
              </Link>
              <Link href="/mise#pricing" className="font-epilogue text-xs font-medium tracking-widest uppercase border border-cream/20 text-cream/70 px-6 py-3 hover:border-mise-gold hover:text-mise-gold transition-colors">
                See Pricing
              </Link>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-1 gap-3">
            {[
              { label:'Free', price:'£0', desc:'5 recipes, 10 notes, basic GP calculator' },
              { label:'Pro', price:'£9.99/mo', desc:'Unlimited everything + AI scanning + cloud sync', highlight:true },
              { label:'Annual Pro', price:'£99/yr', desc:'Save 17% — best value for working chefs' },
            ].map(t=>(
              <div key={t.label} className={`p-6 border ${t.highlight ? 'border-mise-gold bg-mise-gold/10' : 'border-white/10'}`}>
                <div className="flex justify-between items-center">
                  <span className="font-epilogue text-xs font-bold tracking-widest uppercase text-white/50">{t.label}</span>
                  <span className={`font-fraunces text-2xl font-light ${t.highlight ? 'text-mise-gold' : 'text-cream'}`}>{t.price}</span>
                </div>
                <p className="font-epilogue text-xs text-white/40 mt-2 leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}