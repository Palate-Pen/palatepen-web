import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';

const services = [
  { title:'Culinary Consulting', desc:'Menu engineering, seasonal concept development, and food strategy rooted in real kitchen and hospitality expertise.' },
  { title:'Menu Design', desc:'Bespoke print and digital menus — typography-led layouts that guide the eye and elevate the dining experience.' },
  { title:'GP Strategy', desc:'Gross profit analysis and pricing strategy that protects your margins without compromising quality.' },
  { title:'Kitchen Operations', desc:'Streamlining workflows, supplier relationships, and operational efficiency so your brigade can focus on the food.' },
  { title:'Training', desc:'Practical training for your team — from cost control and kitchen operations to menu knowledge and service standards.' },
  { title:'Menu Copywriting', desc:'Descriptions that sell. Words that create appetite, reflect your cuisine, and turn browsers into loyal guests.' },
];

const posts = [
  { slug:'gp-margins-explained', title:'GP margins explained — what every chef needs to know', category:'Business', date:'May 2026' },
  { slug:'menu-engineering-psychology', title:'The psychology of menu design — how layout drives orders', category:'Menu Design', date:'May 2026' },
  { slug:'stock-counting-made-simple', title:'Stock counting made simple — the system that actually works', category:'Kitchen Ops', date:'May 2026' },
];

export default function Home() {
  return (
    <main>
      <Nav />

      {/* Hero */}
      <section className="bg-ink min-h-screen flex flex-col justify-between pt-28 pb-16 px-6 md:px-14 relative overflow-hidden">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 font-fraunces italic text-[400px] text-mustard/5 leading-none pointer-events-none select-none hidden lg:block">&amp;</div>
        <div className="flex justify-between items-center">
          <span className="font-epilogue text-xs font-medium tracking-widest uppercase text-slate">Menu Design &amp; Food Consultancy</span>
          <span className="font-epilogue text-xs text-slate tracking-wider">Est. 2026</span>
        </div>
        <div className="max-w-4xl fade-up-2">
          <p className="font-epilogue text-xs font-medium tracking-widest uppercase text-teal mb-6">Palate &amp; Pen</p>
          <h1 className="font-fraunces font-light leading-none tracking-tight text-cream mb-10" style={{fontSize:'clamp(48px,9vw,100px)'}}>
            We make your<br/>menu as good<br/>as your <span className="italic text-mustard">food.</span>
          </h1>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 fade-up-3">
          <p className="font-fraunces italic text-lg md:text-xl text-slate max-w-md leading-relaxed border-l-2 border-mustard pl-5">
            Real kitchen experience meets considered design and strategy — so your dishes sell themselves before a single bite.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link href="/services" className="font-epilogue text-xs font-semibold tracking-widest uppercase bg-mustard text-ink px-6 py-3 hover:bg-yellow-400 transition-colors">Our Services</Link>
            <Link href="/contact" className="font-epilogue text-xs font-medium tracking-widest uppercase border border-white/20 text-white/60 px-6 py-3 hover:border-mustard hover:text-mustard transition-colors">Get in Touch</Link>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-24 px-6 md:px-14 bg-paper border-t border-ink/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-baseline gap-5 mb-16">
            <span className="font-epilogue text-xs font-bold tracking-widest uppercase text-mustard">What we do</span>
            <h2 className="font-fraunces font-light text-ink" style={{fontSize:'clamp(28px,4vw,48px)'}}>Expertise that <i className="text-teal">delivers</i></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
            {services.map(s => (
              <div key={s.title} className="border-t-2 border-ink pt-5">
                <h3 className="font-fraunces font-light text-2xl text-ink mb-3">{s.title}</h3>
                <p className="font-epilogue font-light text-sm text-slate leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-14">
            <Link href="/services" className="font-epilogue text-xs font-semibold tracking-widest uppercase bg-ink text-cream px-8 py-4 hover:bg-teal transition-colors">All Services</Link>
          </div>
        </div>
      </section>

      {/* Mise teaser */}
      <section className="py-24 px-6 md:px-14 bg-mise-bg">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="flex-1">
            <p className="font-epilogue text-xs font-medium tracking-widest uppercase text-mise-gold mb-6">Our App</p>
            <div className="flex items-center gap-2 mb-8">
              <span className="font-fraunces font-bold italic text-mise-text" style={{fontSize:'48px',letterSpacing:'-2px'}}>M</span>
              <div className="rounded-full bg-mise-gold" style={{width:'12px',height:'12px',marginBottom:'16px'}}></div>
              <span className="font-fraunces font-light text-mise-text" style={{fontSize:'48px',letterSpacing:'10px'}}>ISE</span>
            </div>
            <h2 className="font-fraunces font-light text-4xl md:text-5xl text-mise-text leading-tight mb-6">
              The professional<br/><i className="text-mise-gold">chef&apos;s toolkit</i>
            </h2>
            <p className="font-epilogue font-light text-base text-mise-dim max-w-md leading-relaxed mb-10">
              Recipe library, idea notebook, GP calculator, AI invoice scanning, price alerts, and stock counting — everything a working chef needs in one place.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link href="/mise" className="font-epilogue text-xs font-semibold tracking-widest uppercase bg-mise-gold text-mise-bg px-6 py-3 hover:bg-yellow-400 transition-colors">Learn More</Link>
              <Link href="/mise/app" className="font-epilogue text-xs font-medium tracking-widest uppercase border border-white/20 text-white/60 px-6 py-3 hover:border-mise-gold hover:text-mise-gold transition-colors">Open Web App</Link>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-1 gap-3 max-w-sm">
            {[{label:'Free',price:'£0',desc:'5 recipes, 10 notes, basic GP calculator'},{label:'Pro',price:'£9.99/mo',desc:'Unlimited everything + AI scanning + cloud sync',highlight:true},{label:'Annual Pro',price:'£99/yr',desc:'Save 17% — best value for working chefs'}].map(t => (
              <div key={t.label} className={`p-5 border ${t.highlight?'border-mise-gold/50 bg-mise-gold/10':'border-white/10'}`}>
                <div className="flex justify-between items-center">
                  <span className="font-epilogue text-xs font-bold tracking-widest uppercase text-white/40">{t.label}</span>
                  <span className={`font-fraunces text-2xl font-light ${t.highlight?'text-mise-gold':'text-mise-text'}`}>{t.price}</span>
                </div>
                <p className="font-epilogue text-xs text-white/30 mt-2 leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog preview */}
      <section className="py-24 px-6 md:px-14 bg-cream border-t border-ink/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-baseline mb-16">
            <div className="flex items-baseline gap-5">
              <span className="font-epilogue text-xs font-bold tracking-widest uppercase text-mustard">From the Blog</span>
              <h2 className="font-fraunces font-light text-ink" style={{fontSize:'clamp(28px,4vw,48px)'}}>Latest <i className="text-mustard">writing</i></h2>
            </div>
            <Link href="/blog" className="font-epilogue text-xs tracking-widest uppercase text-teal hover:text-ink transition-colors hidden md:block">All Posts</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
            {posts.map(p => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="group bg-paper hover:bg-mustard-pale transition-colors p-8 border border-ink/5">
                <span className="font-epilogue text-xs font-bold tracking-widest uppercase text-teal mb-4 block">{p.category}</span>
                <h3 className="font-fraunces font-light text-xl text-ink leading-snug mb-6 group-hover:text-teal transition-colors">{p.title}</h3>
                <span className="font-epilogue text-xs text-slate">{p.date}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}