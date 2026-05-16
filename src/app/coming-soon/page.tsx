import Link from 'next/link';

export const metadata = {
  title: 'Palate & Pen — Hospitality Consulting',
  description:
    'Menu design, culinary consulting, kitchen operations and GP services. By Jack Harrison — 13 years in London\'s toughest kitchens, now building tighter back offices for independent venues.',
};

/**
 * palateandpen.co.uk root. Middleware rewrites every consulting-host
 * URL (other than /admin/* which redirects to the app subdomain) here,
 * so this single page IS the consulting site front door.
 */
export default function ConsultingHomePage() {
  return (
    <div className="bg-paper text-ink">
      <Nav />
      <Hero />
      <About />
      <Services />
      <PalatableShowcase />
      <Approach />
      <Contact />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <nav className="sticky top-0 z-40 bg-paper/90 backdrop-blur border-b border-rule py-4">
      <div className="max-w-[1200px] mx-auto px-6 md:px-8 flex items-center justify-between">
        <a href="#" className="font-display font-semibold text-sm tracking-[0.35em] uppercase text-ink no-underline">
          Palate<span className="text-gold mx-1">&amp;</span>Pen
        </a>
        <div className="hidden md:flex items-center gap-8">
          <a href="#about" className="font-sans text-sm text-ink-soft hover:text-gold transition-colors font-medium">About</a>
          <a href="#services" className="font-sans text-sm text-ink-soft hover:text-gold transition-colors font-medium">Services</a>
          <a href="#palatable" className="font-sans text-sm text-ink-soft hover:text-gold transition-colors font-medium">Palatable</a>
          <a href="#approach" className="font-sans text-sm text-ink-soft hover:text-gold transition-colors font-medium">Approach</a>
          <a
            href="#contact"
            className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase px-4 py-2.5 bg-ink text-paper hover:bg-gold transition-colors"
          >
            Get In Touch
          </a>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="max-w-[1200px] mx-auto px-6 md:px-8 pt-16 md:pt-24 pb-20">
      <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold mb-6">
        Hospitality Consulting · London
      </div>
      <h1 className="font-serif text-4xl md:text-6xl font-normal text-ink leading-[1.05] tracking-[-0.02em] mb-6 max-w-[920px]">
        Menu design and{' '}
        <em className="text-gold italic font-medium">kitchen operations</em>, by someone who&apos;s worked the pass.
      </h1>
      <p className="font-serif italic text-lg md:text-xl text-muted mb-10 max-w-[720px] leading-relaxed">
        Palate &amp; Pen helps independent restaurants and hospitality venues build better menus, tighter operations, and healthier margins — without losing what makes the food good in the first place.
      </p>
      <div className="flex flex-wrap gap-3.5">
        <a
          href="#contact"
          className="font-display font-semibold text-[11px] tracking-[0.35em] uppercase px-7 py-4 bg-ink text-paper border border-ink hover:bg-gold hover:border-gold transition-colors inline-flex items-center gap-2.5"
        >
          Book a Conversation
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </a>
        <a
          href="#services"
          className="font-display font-semibold text-[11px] tracking-[0.35em] uppercase px-7 py-4 bg-transparent text-ink border border-ink hover:bg-ink hover:text-paper transition-colors"
        >
          See Services
        </a>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="bg-paper-warm">
      <div className="max-w-[800px] mx-auto px-6 md:px-8 py-20 md:py-24">
        <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold mb-4">
          Meet the man behind the pen
        </div>
        <h2 className="font-serif text-3xl md:text-5xl font-normal text-ink leading-[1.1] tracking-[-0.015em] mb-6">
          I&apos;m Jack <em className="text-gold italic font-medium">Harrison</em>.
        </h2>
        <div className="font-serif text-base md:text-lg text-ink-soft leading-[1.75] space-y-5">
          <p>Spent most of my twenties buried in the London food scene — the kind of kitchens that don&apos;t sleep, don&apos;t apologise, and don&apos;t accept average.</p>
          <p>
            My craft was built on{' '}
            <em className="text-gold-dark font-medium italic">live fire and charcoal</em>. Middle Eastern flavours, smoke, heat, and the kind of cooking that gets in your blood and never really leaves.
          </p>
          <p>Every section. Every shift. Every brutal Saturday night a kitchen can throw at you.</p>
          <p>Now I take everything I learned over those years — the flavour knowledge, the obsession with detail, the understanding of what makes a kitchen actually work — and put it to use for other venues.</p>
          <p>
            Menus that tell your story. Operations that hold up under pressure. Numbers that mean something.{' '}
            <em className="text-gold-dark font-medium italic">That&apos;s Palate &amp; Pen.</em>
          </p>
        </div>
      </div>
    </section>
  );
}

const SERVICES: Array<{ num: string; name: string; desc: string; bullets: string[] }> = [
  {
    num: '01 · Menu Design',
    name: 'Menus that earn their place.',
    desc: 'Concept, structure, copy, costing — built from the inside out by someone who knows what actually leaves the pass.',
    bullets: ['Dish development and refinement', 'Menu writing — descriptions that sell without lying', 'Allergen and PPDS-compliant outputs'],
  },
  {
    num: '02 · Culinary Consulting',
    name: 'A chef\'s eye on the bigger picture.',
    desc: 'Whether you\'re opening a new venue, refreshing a tired concept, or trying to fix what\'s not landing — I bring a chef\'s perspective to the strategic decisions.',
    bullets: ['Pre-opening kitchen design and flow', 'Concept refinement and menu strategy', 'Section-by-section training and standards'],
  },
  {
    num: '03 · Menu Engineering',
    name: 'Numbers behind every dish.',
    desc: 'Stars, plough horses, puzzles, dogs — and what to do about each. Data-led menu analysis with actual chef-led recommendations on top.',
    bullets: ['Full menu profitability audit', 'Dish-level performance scoring', 'Reprice, rework, or remove — clear next steps'],
  },
  {
    num: '04 · Kitchen Operations',
    name: 'Tighter back office, calmer service.',
    desc: 'Prep planning, stock management, supplier relationships, daily diary, training records. The unglamorous stuff that decides whether a kitchen actually runs.',
    bullets: ['Prep and ordering systems review', 'SFBB and HACCP documentation', 'EHO readiness audits'],
  },
  {
    num: '05 · GP Service',
    name: 'Find the margin you\'re missing.',
    desc: 'Most independents leave 4–8 GP points on the table — in waste, in costing errors, in supplier prices that drifted. I find them, document them, and help you claw them back.',
    bullets: ['Full ingredient and recipe cost audit', 'Waste and yield analysis', 'Supplier benchmarking and renegotiation'],
  },
  {
    num: '06 · Training',
    name: 'Brigade development that sticks.',
    desc: 'Section training, food safety, allergen handling, kitchen leadership — delivered on your floor, in your kitchen, against your menu.',
    bullets: ['Section-level skills training', 'Allergen and food safety workshops', 'Junior leadership coaching'],
  },
];

function Services() {
  return (
    <section id="services" className="max-w-[1200px] mx-auto px-6 md:px-8 py-20 md:py-24">
      <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold mb-4">
        Services
      </div>
      <h2 className="font-serif text-3xl md:text-5xl font-normal text-ink leading-[1.1] tracking-[-0.015em] mb-4 max-w-[720px]">
        Five ways I can{' '}
        <em className="text-gold italic font-medium">help your venue</em>.
      </h2>
      <p className="font-serif italic text-base md:text-lg text-muted mb-12 max-w-[640px] leading-relaxed">
        Pick one, pick a few, or bring me in to run a full review. Engagements range from a one-off menu engineering session to a multi-month operations overhaul.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-rule border border-rule">
        {SERVICES.map((s) => (
          <div key={s.num} className="bg-card hover:bg-paper-warm transition-colors px-8 py-9 cursor-default">
            <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-gold mb-4">
              {s.num}
            </div>
            <div className="font-serif font-medium text-xl md:text-2xl text-ink mb-3">{s.name}</div>
            <p className="font-serif text-sm md:text-base text-muted leading-[1.6] mb-4">{s.desc}</p>
            {s.bullets.map((b) => (
              <div key={b} className="flex items-start gap-2.5 font-serif text-sm text-ink-soft mb-1.5 leading-relaxed">
                <span className="text-gold flex-shrink-0">—</span>
                <span>{b}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function PalatableShowcase() {
  return (
    <section id="palatable" className="bg-ink text-paper">
      <div className="max-w-[1200px] mx-auto px-6 md:px-8 py-20 md:py-24 grid md:grid-cols-2 gap-12 md:gap-16 items-center">
        <div>
          <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold-light mb-4">
            Our Software
          </div>
          <h2 className="font-serif text-3xl md:text-5xl font-normal text-paper leading-[1.1] tracking-[-0.015em] mb-6">
            Meet <em className="text-gold-light italic font-medium">Palatable</em>.
          </h2>
          <p className="font-serif text-base md:text-lg text-paper/85 leading-[1.7] mb-5">
            The chef-built operating system for independent kitchens. Recipes, costing, prep, stock, suppliers, allergens, daily diary — all in one place, all designed by someone who&apos;s actually run service.
          </p>
          <p className="font-serif text-base md:text-lg text-paper/85 leading-[1.7] mb-6">
            From £49 per site per month. Add the Safety module — SFBB digital diary, HACCP wizard, EHO inspection mode — for £20 more.
          </p>
          <ul className="list-none mb-8">
            {[
              'Live dish costing & GP tracking',
              'AI invoice scanning & price alerts',
              'SFBB digital diary & HACCP wizard',
              'EHO inspection control desk',
              'Looking Ahead — forward intelligence',
            ].map((f) => (
              <li
                key={f}
                className="py-3 border-b border-paper/10 font-serif text-sm md:text-base text-paper/85 flex items-center gap-3"
              >
                <span className="text-gold-light font-semibold">→</span>
                {f}
              </li>
            ))}
          </ul>
          <a
            href="https://app.palateandpen.co.uk"
            className="font-display font-semibold text-[11px] tracking-[0.35em] uppercase px-7 py-4 bg-gold text-ink border border-gold hover:bg-gold-light transition-colors inline-flex items-center gap-2.5"
          >
            Visit Palatable
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M7 17L17 7M7 7h10v10" />
            </svg>
          </a>
        </div>
        <div className="bg-paper/5 border border-paper/10 rounded-sm p-10">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-paper/10">
            <div className="w-2 h-2 rounded-full bg-gold" />
            <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-paper">
              Today · Looking Ahead
            </div>
          </div>
          {[
            { eyebrow: 'Plan For It · 12 days', text: <><em className="text-gold-light italic">Maya&apos;s Level 2</em> expires Saturday week. Refresher booked.</> },
            { eyebrow: 'Market Move', text: <>Lamb shoulder up 8% at <em className="text-gold-light italic">Aubrey</em>. Two other suppliers held.</> },
            { eyebrow: 'Worth Knowing', text: <><em className="text-gold-light italic">Fridge 2</em> has crept up 0.4°C this week. Service in 3hr.</> },
          ].map((c, i) => (
            <div key={i} className="bg-paper/[0.06] border-l-2 border-gold pl-5 pr-4 py-4 mb-3">
              <div className="font-display font-semibold text-[9px] tracking-[0.3em] uppercase text-gold-light mb-1.5">
                {c.eyebrow}
              </div>
              <div className="font-serif text-sm md:text-[15px] text-paper/90 leading-relaxed">{c.text}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Approach() {
  const steps = [
    { num: 'One · Conversation', title: 'A free hour, no pitch.', desc: 'Tell me what\'s working and what isn\'t. I\'ll tell you straight whether I can help — and if I can\'t, who probably can.' },
    { num: 'Two · Single Engagement', title: 'One job, one outcome.', desc: 'A new menu. An EHO audit. A GP review. Defined scope, fixed price, clear deliverable. Typically 2–6 weeks.' },
    { num: 'Three · Ongoing Partner', title: 'A retained pair of eyes.', desc: 'Monthly check-ins on margins, menu performance, kitchen operations. For venues that want a second brain on the back office, not just a one-off fix.' },
  ];
  return (
    <section id="approach" className="max-w-[1200px] mx-auto px-6 md:px-8 py-20 md:py-24">
      <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold mb-4">
        How I Work
      </div>
      <h2 className="font-serif text-3xl md:text-5xl font-normal text-ink leading-[1.1] tracking-[-0.015em] mb-4 max-w-[720px]">
        Three ways into <em className="text-gold italic font-medium">a partnership</em>.
      </h2>
      <p className="font-serif italic text-base md:text-lg text-muted mb-12 max-w-[640px] leading-relaxed">
        No retainers you can&apos;t get out of. No deck-heavy proposals that go nowhere. Pick the engagement that fits, and we start.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {steps.map((s) => (
          <div key={s.num} className="pt-7 border-t-2 border-gold">
            <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold mb-3">{s.num}</div>
            <div className="font-serif font-medium text-xl text-ink mb-3">{s.title}</div>
            <p className="font-serif text-[15px] text-muted leading-[1.6]">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="bg-paper-warm">
      <div className="max-w-[720px] mx-auto px-6 md:px-8 py-20 md:py-24 text-center">
        <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold mb-4">
          Let&apos;s Talk
        </div>
        <h2 className="font-serif text-3xl md:text-5xl font-normal text-ink leading-[1.1] tracking-[-0.015em] mb-4">
          First conversation&apos;s on <em className="text-gold italic font-medium">me</em>.
        </h2>
        <p className="font-serif italic text-base md:text-lg text-muted mb-10 leading-relaxed">
          No deck, no pitch. Just an hour to talk about what your venue&apos;s doing well and where the friction is. Email me below.
        </p>
        <a
          href="mailto:hello@palateandpen.co.uk"
          className="font-serif text-xl md:text-2xl text-ink hover:text-gold transition-colors inline-block border-b border-gold pb-1"
        >
          hello@palateandpen.co.uk
        </a>
        <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted mt-10">
          East Midlands · UK · Replies within 72 hours
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-ink text-paper/60 px-6 md:px-8 py-12">
      <div className="max-w-[1200px] mx-auto flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="font-display font-semibold text-sm tracking-[0.35em] uppercase text-paper">
            Palate<span className="text-gold mx-1">&amp;</span>Pen
          </div>
          <div className="font-serif italic text-sm text-paper/60 mt-1">
            © 2026 Palate &amp; Pen Ltd · Jack Harrison · East Midlands
          </div>
        </div>
        <div className="flex gap-6">
          <Link href="https://app.palateandpen.co.uk" className="font-sans text-xs text-paper/70 hover:text-gold-light transition-colors">Palatable</Link>
          <a href="#about" className="font-sans text-xs text-paper/70 hover:text-gold-light transition-colors">About</a>
          <a href="#services" className="font-sans text-xs text-paper/70 hover:text-gold-light transition-colors">Services</a>
          <a href="mailto:hello@palateandpen.co.uk" className="font-sans text-xs text-paper/70 hover:text-gold-light transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}
