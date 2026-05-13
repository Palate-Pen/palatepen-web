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

export default function PalatablePage() {
  return (
    <main className="min-h-screen bg-palatable-bg font-epilogue">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-palatable-bg/95 backdrop-blur-sm border-b border-palatable-border">
        <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
          <Link href="/" className="font-fraunces text-lg font-light text-palatable-text">
            Palate <span className="italic text-mustard">&amp;</span> Pen
          </Link>
          <div className="hidden md:flex gap-8 items-center">
            <Link href="/palatable" className="text-xs text-palatable-gold tracking-widest uppercase">Palatable</Link>
            <Link href="/palatable#features" className="text-xs text-palatable-dim hover:text-palatable-text tracking-widest uppercase transition-colors">Features</Link>
            <Link href="/palatable#pricing" className="text-xs text-palatable-dim hover:text-palatable-text tracking-widest uppercase transition-colors">Pricing</Link>
            <Link href="/palatable/app" className="text-xs font-semibold tracking-widest uppercase bg-palatable-gold text-palatable-bg px-5 py-2.5 hover:bg-yellow-400 transition-colors">
              Open App
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex flex-col justify-center pt-28 pb-20 px-8 md:px-16 relative overflow-hidden">
        <div className="absolute right-[-60px] top-1/2 -translate-y-1/2 font-fraunces italic text-[520px] leading-none pointer-events-none select-none text-palatable-gold/[0.04] hidden xl:block">&amp;</div>
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="flex items-center gap-2 mb-10">
              <span className="font-fraunces font-bold italic text-palatable-text leading-none" style={{fontSize:'96px',letterSpacing:'-4px'}}>P</span>
              <div className="rounded-full bg-palatable-gold" style={{width:'18px',height:'18px',marginBottom:'34px'}}></div>
              <span className="font-fraunces font-light text-palatable-text" style={{fontSize:'96px',letterSpacing:'20px'}}>ALATABLE</span>
            </div>
            <p className="text-xs font-medium tracking-widest uppercase text-palatable-gold mb-5">By Palate &amp; Pen</p>
            <h1 className="font-fraunces font-light leading-tight text-palatable-text mb-8" style={{fontSize:'clamp(36px,5vw,64px)'}}>
              The professional<br/><i className="text-palatable-gold">chef&apos;s toolkit</i>
            </h1>
            <p className="font-light text-lg text-palatable-dim max-w-lg leading-relaxed mb-10">
              Everything a working chef needs &mdash; recipe management, cost control, AI invoice scanning, and stock tracking &mdash; in one place. On any device.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link href="/palatable/app" className="text-sm font-semibold tracking-widest uppercase bg-palatable-gold text-palatable-bg px-8 py-4 hover:bg-yellow-400 transition-colors">
                Open Web App &mdash; Free
              </Link>
              <Link href="/palatable#pricing" className="text-sm font-medium tracking-widest uppercase border border-palatable-border-light text-palatable-dim px-8 py-4 hover:border-palatable-gold hover:text-palatable-gold transition-colors">
                See Pricing
              </Link>
            </div>
            <p className="text-xs text-palatable-faint mt-4">Also available on iOS and Android &mdash; coming soon</p>
          </div>
          <div className="hidden lg:block">
            <div className="bg-palatable-surface border border-palatable-border rounded-lg overflow-hidden shadow-2xl">
              <div className="bg-palatable-surface2 border-b border-palatable-border px-4 py-3 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-palatable-border-light"></div>
                  <div className="w-3 h-3 rounded-full bg-palatable-border-light"></div>
                  <div className="w-3 h-3 rounded-full bg-palatable-border-light"></div>
                </div>
                <div className="flex-1 bg-palatable-surface3 rounded px-3 py-1.5 text-xs text-palatable-faint">
                  palateandpen.co.uk/palatable/app
                </div>
              </div>
              <div className="flex h-72">
                <div className="w-48 bg-palatable-surface2 border-r border-palatable-border p-3 flex flex-col gap-1">
                  <div className="flex items-center gap-1 px-2 py-2 mb-2 border-b border-palatable-border">
                    <span className="font-fraunces font-bold italic text-palatable-text text-xl" style={{letterSpacing:'-1px'}}>P</span>
                    <div className="w-2 h-2 rounded-full bg-palatable-gold" style={{marginBottom:'7px'}}></div>
                    <span className="font-fraunces font-light text-palatable-text text-xl" style={{letterSpacing:'4px'}}>ALATABLE</span>
                  </div>
                  {[{label:'Recipes',active:true},{label:'Notebook',active:false},{label:'GP Calc',active:false},{label:'Invoices',active:false},{label:'Stock',active:false},{label:'Profile',active:false}].map(item=>(
                    <div key={item.label} className={`flex items-center gap-2 px-3 py-2 rounded text-xs ${item.active?'bg-palatable-gold/10 text-palatable-gold border border-palatable-gold/20':'text-palatable-faint'}`}>
                      <div className={`w-1 h-1 rounded-full ${item.active?'bg-palatable-gold':'bg-palatable-border-light'}`}></div>
                      {item.label}
                    </div>
                  ))}
                </div>
                <div className="flex-1 p-4 overflow-hidden">
                  <p className="text-xs text-palatable-faint tracking-widest uppercase mb-3">Recipe Library</p>
                  {['Pan-seared Salmon','Beef Bourguignon','Sourdough Bread','Tarte Tatin'].map((r,i)=>(
                    <div key={r} className={`flex items-center gap-3 p-2.5 mb-1.5 border rounded text-xs ${i===0?'border-palatable-gold/30 bg-palatable-gold/5':'border-palatable-border bg-palatable-surface2'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${i===0?'bg-palatable-gold':'bg-palatable-border-light'}`}></div>
                      <span className="text-palatable-dim">{r}</span>
                      {i===0&&<span className="ml-auto text-palatable-gold">GP 72%</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Promo */}
      <section id="features" className="border-t border-palatable-border">
        <PalatablePromo/>
      </section>

      {/* Mockups */}
      

      {/* Pricing */}
      <section id="pricing" className="py-24 px-8 md:px-16 border-t border-palatable-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-baseline gap-5 mb-16">
            <span className="text-xs font-bold tracking-widest uppercase text-palatable-gold">Pricing</span>
            <h2 className="font-fraunces font-light text-palatable-text" style={{fontSize:'clamp(28px,4vw,48px)'}}>Simple, honest <i>pricing</i></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                key: 'free',
                name: 'Free',
                price: '£0',
                period: ' forever',
                yearly: 'No card required',
                who: 'Trying it out',
                features: ['5 recipes', 'Basic costing', '10 notebook ideas'],
                cta: 'Get Started Free',
                href: '/palatable/app',
                highlight: false,
              },
              {
                key: 'pro',
                name: 'Pro',
                price: '£25',
                period: '/mo',
                yearly: 'or £249/year',
                who: 'The working chef — full toolkit',
                features: ['Unlimited recipes', 'AI invoice scanning', 'Stock & par levels', 'Menu builder', 'Allergens & nutrition', 'Price alerts'],
                cta: 'Start with Pro',
                href: '/palatable/app',
                highlight: true,
              },
              {
                key: 'kitchen',
                name: 'Kitchen',
                price: '£59',
                period: '/mo',
                yearly: 'or £590/year',
                who: 'Small team, single site',
                features: ['Up to 5 users', 'Everything in Pro', 'Team permissions', 'Supplier ordering', 'Waste tracking'],
                cta: 'Choose Kitchen',
                href: '/palatable/app',
                highlight: false,
              },
              {
                key: 'group',
                name: 'Group',
                price: '£129',
                period: '/mo',
                yearly: 'or £1,290/year',
                who: 'Multi-site operators',
                features: ['Unlimited users', 'Multiple outlets', 'Central kitchen management', 'Group reporting', 'POS integration'],
                cta: 'Choose Group',
                href: '/palatable/app',
                highlight: false,
              },
              {
                key: 'enterprise',
                name: 'Enterprise',
                price: 'POA',
                period: '',
                yearly: 'Price on request',
                who: 'Hotel groups, contract caterers, franchises',
                features: ['Custom integrations', 'Dedicated account manager', 'Volume pricing & SLA', 'Onboarding & training', 'Custom contract terms'],
                cta: 'Contact Sales',
                href: 'mailto:hello@palateandpen.co.uk?subject=Enterprise%20enquiry',
                highlight: false,
              },
            ].map(plan => (
              <div key={plan.key} className={`p-7 relative flex flex-col ${plan.highlight ? 'border border-palatable-gold/40 bg-palatable-gold/5' : 'border border-palatable-border'}`}>
                {plan.highlight && (
                  <div className="absolute top-4 right-4 text-[10px] font-bold tracking-widest uppercase text-palatable-gold bg-palatable-gold/10 border border-palatable-gold/20 px-2 py-0.5">Most Popular</div>
                )}
                <p className={`text-xs font-bold tracking-widest uppercase mb-5 ${plan.highlight ? 'text-palatable-gold' : 'text-palatable-faint'}`}>{plan.name}</p>
                <p className="font-fraunces font-light text-palatable-text mb-1" style={{ fontSize: '40px', lineHeight: 1 }}>
                  {plan.price}<span className="text-base text-palatable-faint">{plan.period}</span>
                </p>
                <p className={`text-xs mb-3 ${plan.highlight ? 'text-palatable-gold' : 'text-palatable-faint'}`}>{plan.yearly}</p>
                <p className="text-xs italic text-palatable-dim mb-6">{plan.who}</p>
                <div className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-start gap-2.5">
                      <span className={`text-sm flex-shrink-0 ${plan.highlight ? 'text-palatable-gold' : 'text-palatable-dim'}`}>{plan.highlight ? '✓' : '·'}</span>
                      <span className={`text-sm ${plan.highlight ? 'text-palatable-text' : 'text-palatable-dim'}`}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href={plan.href}
                  className={`block text-center text-xs font-semibold tracking-widest uppercase px-5 py-3 transition-colors ${plan.highlight
                    ? 'bg-palatable-gold text-palatable-bg hover:bg-yellow-400'
                    : 'border border-palatable-border-light text-palatable-dim hover:border-palatable-gold hover:text-palatable-gold'}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      
      </section>

      {/* Footer */}
      <footer className="border-t border-palatable-border px-8 md:px-16 py-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="font-fraunces font-light text-xl text-palatable-text">
            Palate <span className="italic text-mustard">&amp;</span> Pen
          </Link>
          <span className="text-xs text-palatable-faint">hello@palateandpen.co.uk</span>
        </div>
      </footer>
    </main>
  );
}