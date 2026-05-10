import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';

const features = [
  { icon:'recipe', title:'Recipe Library', desc:'Save recipes from any URL with one tap. Claude AI reads the page and pulls in ingredients, method and times automatically.', pro:false },
  { icon:'notebook', title:'Idea Notebook', desc:'Free-form notes that link to recipes and each other. Your thinking stays connected as menus evolve.', pro:false },
  { icon:'gp', title:'GP Calculator', desc:'Ingredient-level cost tracking with GP % analysis, benchmark bars, and smart advice. Set your own target GP per dish.', pro:false },
  { icon:'invoice', title:'Invoice Scanning', desc:'Photograph any supplier invoice. AI extracts every ingredient, quantity and price into your ingredients bank instantly.', pro:true },
  { icon:'alerts', title:'Price Alerts', desc:'Every new scan compares against your last invoice. Instant alerts when chicken goes up 8% or butter drops.', pro:true },
  { icon:'stock', title:'Stock Counter', desc:'Set par levels, count your stores, see Good/Low/Critical status at a glance. Links directly to your ingredients bank.', pro:true },
];

export default function MisePage() {
  return (
    <main>
      <Nav />
      <section className="min-h-screen bg-mise-dark pt-32 pb-24 px-6 md:px-14">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-12">
            <span className="font-fraunces text-6xl font-bold italic text-cream leading-none" style={{letterSpacing:'-2px'}}>M</span>
            <div className="w-3.5 h-3.5 rounded-full bg-mise-gold" style={{marginBottom:'20px'}}></div>
            <span className="font-fraunces text-6xl font-light text-cream" style={{letterSpacing:'14px'}}>ISE</span>
          </div>
          <p className="font-epilogue text-xs font-medium tracking-widest uppercase text-mise-gold mb-4">By Palate & Pen</p>
          <h1 className="font-fraunces font-light text-5xl md:text-7xl text-cream leading-tight mb-8 max-w-3xl">
            The professional<br/><i className="text-mise-gold">chef's toolkit</i>
          </h1>
          <p className="font-epilogue font-light text-lg text-cream/60 max-w-xl leading-relaxed mb-12">
            Everything a working chef needs — recipe management, cost control, invoice scanning, and stock tracking — in one beautifully designed app.
          </p>
          <div className="flex gap-4 flex-wrap">
            <a href="https://apps.apple.com" className="font-epilogue text-sm font-semibold tracking-widest uppercase bg-mise-gold text-mise-dark px-8 py-4 hover:bg-yellow-400 transition-colors">Download on iOS</a>
            <a href="https://play.google.com" className="font-epilogue text-sm font-medium tracking-widest uppercase border border-white/20 text-cream/70 px-8 py-4 hover:border-mise-gold hover:text-mise-gold transition-colors">Get on Android</a>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 md:px-14 bg-paper" id="features">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-fraunces font-light text-4xl text-ink mb-16">Everything you <i>need</i></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
            {features.map(f=>(
              <div key={f.title} className="bg-cream p-8 border border-ink/5">
                {f.pro && <span className="inline-block font-epilogue text-xs font-bold tracking-widest uppercase text-mise-gold bg-mise-dark px-3 py-1 mb-4">Pro</span>}
                <h3 className="font-fraunces font-light text-2xl text-ink mb-3">{f.title}</h3>
                <p className="font-epilogue font-light text-sm text-slate leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 md:px-14 bg-ink" id="pricing">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-fraunces font-light text-4xl text-cream mb-4">Simple <i className="text-mustard">pricing</i></h2>
          <p className="font-epilogue font-light text-cream/50 mb-16">Start free. Upgrade when you're ready.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-white/10 p-8 text-left">
              <p className="font-epilogue text-xs font-bold tracking-widest uppercase text-white/40 mb-4">Free</p>
              <p className="font-fraunces text-5xl font-light text-cream mb-6">£0<span className="text-xl text-white/30">/mo</span></p>
              <div className="space-y-3 mb-8">
                {['5 saved recipes','10 notebook ideas','Basic GP calculator','Single device'].map(f=>(
                  <div key={f} className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-white/20"></div><span className="font-epilogue text-sm text-white/50">{f}</span></div>
                ))}
              </div>
              <a href="#" className="block font-epilogue text-xs font-medium tracking-widest uppercase border border-white/20 text-white/50 px-6 py-3 text-center hover:border-white/40 transition-colors">Get Started</a>
            </div>
            <div className="border border-mise-gold/50 bg-mise-gold/5 p-8 text-left relative">
              <div className="absolute top-4 right-4 font-epilogue text-xs font-bold tracking-widest uppercase text-mise-gold">Most Popular</div>
              <p className="font-epilogue text-xs font-bold tracking-widest uppercase text-mise-gold mb-4">Pro</p>
              <p className="font-fraunces text-5xl font-light text-cream mb-1">£9.99<span className="text-xl text-white/30">/mo</span></p>
              <p className="font-epilogue text-xs text-mise-gold mb-6">or £99/year — save 17%</p>
              <div className="space-y-3 mb-8">
                {['Unlimited recipes & notes','AI invoice scanning','URL recipe import','Price change alerts','Stock counter','Cloud sync across all devices','Full GP history'].map(f=>(
                  <div key={f} className="flex items-center gap-3"><span className="text-mise-gold text-sm">✓</span><span className="font-epilogue text-sm text-cream/80">{f}</span></div>
                ))}
              </div>
              <a href="#" className="block font-epilogue text-xs font-semibold tracking-widest uppercase bg-mise-gold text-mise-dark px-6 py-3 text-center hover:bg-yellow-400 transition-colors">Start Free Trial</a>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}