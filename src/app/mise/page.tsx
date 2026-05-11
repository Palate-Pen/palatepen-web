import PalatablePromo from '@/components/PalatablePromo';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Palatable — Back Office Work You Can Stomach | Palate & Pen',
  description: 'Recipe library, GP calculator, invoice scanning, stock counting. The professional toolkit built for working chefs.',
};

const features = [
  { n:'01', title:'Recipe Library', desc:'Save and manage your full recipe catalogue. Import from any URL — Claude AI reads the page and extracts ingredients, method and timings automatically.', pro:false },
  { n:'02', title:'Idea Notebook', desc:'Free-form notes that link directly to recipes. Capture flavour ideas, technique experiments, and menu concepts without losing the thread.', pro:false },
  { n:'03', title:'GP Calculator', desc:'Ingredient-level cost tracking with GP percentage analysis, benchmark bars, and smart pricing advice. Set your own target GP per dish.', pro:false },
  { n:'04', title:'Invoice Scanning', desc:'Photograph any supplier invoice. AI extracts every ingredient, quantity and unit price into your ingredients bank instantly.', pro:true },
  { n:'05', title:'Price Alerts', desc:'Every new scan compares against your last invoice. Instant alerts when chicken goes up 8% or dairy drops.', pro:true },
  { n:'06', title:'Stock Counter', desc:'Set par levels per ingredient, run your counts, and see Good, Low, and Critical status across your entire store.', pro:true },
];

export default function MisePage() {
  return (
    <main className="min-h-screen bg-mise-bg font-epilogue">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-mise-bg/95 backdrop-blur-sm border-b border-mise-border">
        <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
          <Link href="/" className="font-fraunces text-lg font-light text-mise-text">
            Palate <span className="italic text-mustard">&amp;</span> Pen
          </Link>
          <div className="hidden md:flex gap-8 items-center">
            <Link href="/mise" className="text-xs text-mise-gold tracking-widest uppercase">Mise</Link>
            <Link href="/mise#features" className="text-xs text-mise-dim hover:text-mise-text tracking-widest uppercase transition-colors">Features</Link>
            <Link href="/mise#pricing" className="text-xs text-mise-dim hover:text-mise-text tracking-widest uppercase transition-colors">Pricing</Link>
            <Link href="/mise/app" className="text-xs font-semibold tracking-widest uppercase bg-mise-gold text-mise-bg px-5 py-2.5 hover:bg-yellow-400 transition-colors">
              Open App
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex flex-col justify-center pt-28 pb-20 px-8 md:px-16 relative overflow-hidden">
        <div className="absolute right-[-60px] top-1/2 -translate-y-1/2 font-fraunces italic text-[520px] leading-none pointer-events-none select-none text-mise-gold/[0.04] hidden xl:block">&amp;</div>
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="flex items-center gap-2 mb-10">
              <span className="font-fraunces font-bold italic text-mise-text leading-none" style={{fontSize:'96px',letterSpacing:'-4px'}}>P</span>
              <div className="rounded-full bg-mise-gold" style={{width:'18px',height:'18px',marginBottom:'34px'}}></div>
              <span className="font-fraunces font-light text-mise-text" style={{fontSize:'96px',letterSpacing:'20px'}}>ALATABLE</span>
            </div>
            <p className="text-xs font-medium tracking-widest uppercase text-mise-gold mb-5">By Palate &amp; Pen</p>
            <h1 className="font-fraunces font-light leading-tight text-mise-text mb-8" style={{fontSize:'clamp(36px,5vw,64px)'}}>
              The professional<br/><i className="text-mise-gold">chef&apos;s toolkit</i>
            </h1>
            <p className="font-light text-lg text-mise-dim max-w-lg leading-relaxed mb-10">
              Everything a working chef needs &mdash; recipe management, cost control, AI invoice scanning, and stock tracking &mdash; in one place. On any device.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link href="/mise/app" className="text-sm font-semibold tracking-widest uppercase bg-mise-gold text-mise-bg px-8 py-4 hover:bg-yellow-400 transition-colors">
                Open Web App &mdash; Free
              </Link>
              <Link href="/mise#pricing" className="text-sm font-medium tracking-widest uppercase border border-mise-border-light text-mise-dim px-8 py-4 hover:border-mise-gold hover:text-mise-gold transition-colors">
                See Pricing
              </Link>
            </div>
            <p className="text-xs text-mise-faint mt-4">Also available on iOS and Android &mdash; coming soon</p>
          </div>
          <div className="hidden lg:block">
            <div className="bg-mise-surface border border-mise-border rounded-lg overflow-hidden shadow-2xl">
              <div className="bg-mise-surface2 border-b border-mise-border px-4 py-3 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-mise-border-light"></div>
                  <div className="w-3 h-3 rounded-full bg-mise-border-light"></div>
                  <div className="w-3 h-3 rounded-full bg-mise-border-light"></div>
                </div>
                <div className="flex-1 bg-mise-surface3 rounded px-3 py-1.5 text-xs text-mise-faint">
                  palateandpen.co.uk/mise/app
                </div>
              </div>
              <div className="flex h-72">
                <div className="w-48 bg-mise-surface2 border-r border-mise-border p-3 flex flex-col gap-1">
                  <div className="flex items-center gap-1 px-2 py-2 mb-2 border-b border-mise-border">
                    <span className="font-fraunces font-bold italic text-mise-text text-xl" style={{letterSpacing:'-1px'}}>P</span>
                    <div className="w-2 h-2 rounded-full bg-mise-gold" style={{marginBottom:'7px'}}></div>
                    <span className="font-fraunces font-light text-mise-text text-xl" style={{letterSpacing:'4px'}}>ALATABLE</span>
                  </div>
                  {[{label:'Recipes',active:true},{label:'Notebook',active:false},{label:'GP Calc',active:false},{label:'Invoices',active:false},{label:'Stock',active:false},{label:'Profile',active:false}].map(item=>(
                    <div key={item.label} className={`flex items-center gap-2 px-3 py-2 rounded text-xs ${item.active?'bg-mise-gold/10 text-mise-gold border border-mise-gold/20':'text-mise-faint'}`}>
                      <div className={`w-1 h-1 rounded-full ${item.active?'bg-mise-gold':'bg-mise-border-light'}`}></div>
                      {item.label}
                    </div>
                  ))}
                </div>
                <div className="flex-1 p-4 overflow-hidden">
                  <p className="text-xs text-mise-faint tracking-widest uppercase mb-3">Recipe Library</p>
                  {['Pan-seared Salmon','Beef Bourguignon','Sourdough Bread','Tarte Tatin'].map((r,i)=>(
                    <div key={r} className={`flex items-center gap-3 p-2.5 mb-1.5 border rounded text-xs ${i===0?'border-mise-gold/30 bg-mise-gold/5':'border-mise-border bg-mise-surface2'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${i===0?'bg-mise-gold':'bg-mise-border-light'}`}></div>
                      <span className="text-mise-dim">{r}</span>
                      {i===0&&<span className="ml-auto text-mise-gold">GP 72%</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Promo */}
      <section id="features" className="border-t border-mise-border">
        <PalatablePromo/>
      </section>

      {/* Mockups */}
      

      {/* Pricing */}
      <section id="pricing" className="py-24 px-8 md:px-16 border-t border-mise-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-baseline gap-5 mb-16">
            <span className="text-xs font-bold tracking-widest uppercase text-mise-gold">Pricing</span>
            <h2 className="font-fraunces font-light text-mise-text" style={{fontSize:'clamp(28px,4vw,48px)'}}>Simple, honest <i>pricing</i></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
            <div className="border border-mise-border p-8">
              <p className="text-xs font-bold tracking-widest uppercase text-mise-faint mb-6">Free</p>
              <p className="font-fraunces font-light text-mise-text mb-1" style={{fontSize:'52px'}}>&pound;0<span className="text-xl text-mise-faint">/mo</span></p>
              <p className="text-sm text-mise-faint mb-8">Get started, no card required</p>
              <div className="space-y-3 mb-8">
                {['5 saved recipes','10 notebook ideas','Basic GP calculator','Single device'].map(f=>(
                  <div key={f} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-mise-border-light flex-shrink-0"></div>
                    <span className="text-sm text-mise-dim">{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/mise/app" className="block text-center text-xs font-medium tracking-widest uppercase border border-mise-border-light text-mise-dim px-6 py-3 hover:border-mise-gold hover:text-mise-gold transition-colors">
                Get Started Free
              </Link>
            </div>
            <div className="border border-mise-gold/40 bg-mise-gold/5 p-8 relative">
              <div className="absolute top-4 right-4 text-xs font-bold tracking-widest uppercase text-mise-gold bg-mise-gold/10 border border-mise-gold/20 px-3 py-1">Most Popular</div>
              <p className="text-xs font-bold tracking-widest uppercase text-mise-gold mb-6">Pro</p>
              <p className="font-fraunces font-light text-mise-text mb-1" style={{fontSize:'52px'}}>&pound;9.99<span className="text-xl text-mise-faint">/mo</span></p>
              <p className="text-sm text-mise-gold mb-8">or &pound;99/year &mdash; save 17%</p>
              <div className="space-y-3 mb-8">
                {['Unlimited recipes & notes','AI invoice scanning','URL recipe import','Price change alerts','Stock counter with par levels','Cloud sync across all devices','Full GP history & analytics'].map(f=>(
                  <div key={f} className="flex items-center gap-3">
                    <span className="text-mise-gold text-sm flex-shrink-0">&#10003;</span>
                    <span className="text-sm text-mise-text">{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/mise/app" className="block text-center text-xs font-semibold tracking-widest uppercase bg-mise-gold text-mise-bg px-6 py-3 hover:bg-yellow-400 transition-colors">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      
      </section>

      {/* Footer */}
      <footer className="border-t border-mise-border px-8 md:px-16 py-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="font-fraunces font-light text-xl text-mise-text">
            Palate <span className="italic text-mustard">&amp;</span> Pen
          </Link>
          <span className="text-xs text-mise-faint">hello@palateandpen.co.uk</span>
        </div>
      </footer>
    </main>
  );
}