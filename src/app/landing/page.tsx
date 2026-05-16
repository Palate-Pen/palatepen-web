import Link from 'next/link';

export const metadata = {
  title: 'Palatable — One Platform. Every Role.',
  description:
    'The chef-built operating system for independent restaurants, bars, and groups. Chefs, bartenders, managers and owners — all on one platform, each seeing what they need to see. From £49 per site per month.',
};

/**
 * app.palateandpen.co.uk public landing. Middleware rewrites unauth
 * visitors hitting `/` to this route. Signed-in users continue
 * through to their normal role home.
 *
 * Rewritten 2026-05-18 to showcase the whole brigade — chef, bar,
 * manager, owner — not just the kitchen. Quadrant grid in the middle
 * makes the role-aware product visible at a glance.
 *
 * Pre-launch: trial + signin CTAs all point at /coming-soon-feature.
 * /signin remains directly reachable so the founder can get in.
 */
export default function PalatableLandingPage() {
  return (
    <div className="bg-paper text-ink">
      <Nav />
      <Hero />
      <Problem />
      <BrigadeQuadrant />
      <OnePlatform />
      <MarginsShowcase />
      <SafetyShowcase />
      <Pricing />
      <BuiltBy />
      <FinalCta />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <nav className="sticky top-0 z-40 bg-paper/90 backdrop-blur border-b border-rule py-4">
      <div className="max-w-[1200px] mx-auto px-6 md:px-8 flex items-center justify-between">
        <a
          href="#"
          className="font-display font-semibold text-sm tracking-[0.3em] uppercase text-ink no-underline inline-flex items-center gap-1.5"
        >
          Palatable
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
        </a>
        <div className="hidden md:flex items-center gap-8">
          <a
            href="#problem"
            className="font-sans text-sm text-ink-soft hover:text-gold transition-colors font-medium"
          >
            Why Palatable
          </a>
          <a
            href="#brigade"
            className="font-sans text-sm text-ink-soft hover:text-gold transition-colors font-medium"
          >
            For Your Brigade
          </a>
          <a
            href="#platform"
            className="font-sans text-sm text-ink-soft hover:text-gold transition-colors font-medium"
          >
            Platform
          </a>
          <a
            href="#pricing"
            className="font-sans text-sm text-ink-soft hover:text-gold transition-colors font-medium"
          >
            Pricing
          </a>
          <Link
            href="/coming-soon-feature"
            className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase px-4 py-2.5 bg-ink text-paper hover:bg-gold transition-colors"
          >
            Try Pro Free
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="max-w-[1200px] mx-auto px-6 md:px-8 py-16 md:py-20 grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-center">
      <div>
        <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold mb-6">
          Built By A Chef · For The Whole Brigade
        </div>
        <h1 className="font-serif text-4xl md:text-[52px] font-normal text-ink leading-[1.05] tracking-[-0.02em] mb-5">
          One platform.{' '}
          <em className="text-gold italic font-medium">Every role</em>.
        </h1>
        <p className="font-serif italic text-lg md:text-[19px] text-muted mb-8 leading-relaxed">
          Chefs, bartenders, managers, owners — all on one operating system. Each role sees exactly what they need to see, and nobody does work for anyone else.
        </p>
        <div className="flex flex-wrap gap-3.5 mb-4">
          <Link
            href="/coming-soon-feature"
            className="font-display font-semibold text-[11px] tracking-[0.35em] uppercase px-7 py-4 bg-ink text-paper border border-ink hover:bg-gold hover:border-gold transition-colors inline-flex items-center gap-2.5"
          >
            Start 7-Day Pro Trial
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="w-3.5 h-3.5"
            >
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
          <a
            href="#brigade"
            className="font-display font-semibold text-[11px] tracking-[0.35em] uppercase px-7 py-4 bg-transparent text-ink border border-ink hover:bg-ink hover:text-paper transition-colors"
          >
            See Each Role
          </a>
        </div>
        <p className="font-serif italic text-sm text-muted">
          No card required. Full Pro access. From £49 per site per month after trial.
        </p>
      </div>

      <HeroMockup />
    </section>
  );
}

function HeroMockup() {
  return (
    <div className="bg-ink rounded-md shadow-[0_24px_60px_rgba(26,22,18,0.18),0_8px_16px_rgba(26,22,18,0.08)] overflow-hidden">
      <div className="flex items-center gap-1.5 px-3.5 py-3 bg-paper/[0.05] border-b border-paper/10">
        <span className="w-2 h-2 rounded-full bg-[#E36050]" />
        <span className="w-2 h-2 rounded-full bg-[#D9A02C]" />
        <span className="w-2 h-2 rounded-full bg-[#5DA853]" />
        <span className="ml-3 font-mono text-[10px] text-paper/50">
          app.palateandpen.co.uk
        </span>
      </div>
      <div className="p-6 bg-paper">
        <div className="font-display font-semibold text-[9px] tracking-[0.35em] uppercase text-gold mb-1.5">
          Owner · This Week
        </div>
        <div className="font-serif text-2xl text-ink mb-1 leading-tight">
          2 sites,{' '}
          <em className="text-gold italic font-medium">one lens</em>.
        </div>
        <div className="font-serif italic text-xs text-muted mb-5">
          Group rollup · Week 20
        </div>
        <div>
          <div className="font-display font-semibold text-[9px] tracking-[0.3em] uppercase text-gold mb-2 pb-1.5 border-b border-rule">
            Looking Ahead
          </div>
          {[
            {
              tag: 'Plan For It',
              text: (
                <>
                  <em className="text-gold italic font-medium">Camden site</em>{' '}
                  pulling 6 points under group GP target.
                </>
              ),
            },
            {
              tag: 'Worth Knowing',
              text: (
                <>
                  Bidfresh now 8% cheaper than Aubrey across{' '}
                  <em className="text-gold italic font-medium">both sites</em>.
                </>
              ),
            },
            {
              tag: 'Get Ready',
              text: (
                <>
                  EHO due at{' '}
                  <em className="text-gold italic font-medium">Shoreditch</em>{' '}
                  in 18 days. 81 of 90 days logged.
                </>
              ),
            },
          ].map((c, i) => (
            <div
              key={i}
              className="bg-card border-l-2 border-gold px-3.5 py-2.5 mb-1.5"
            >
              <span className="inline-block font-display font-semibold text-[8px] tracking-[0.25em] uppercase px-1.5 py-0.5 bg-gold text-paper mb-1">
                {c.tag}
              </span>
              <div className="font-serif text-xs text-ink-soft leading-snug">
                {c.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Problem() {
  const cards = [
    {
      eyebrow: 'The Old Way',
      title: (
        <>
          Your chef knows the kitchen.{' '}
          <em className="text-gold-dark italic">You don&apos;t see the numbers.</em>
        </>
      ),
      desc: 'They keep the recipes in a notebook. The costing lives on a spreadsheet two months out of date. You ask for last month&apos;s GP and get an email three days later.',
    },
    {
      eyebrow: 'The Old Way',
      title: (
        <>
          Your bar runs its own system.{' '}
          <em className="text-gold-dark italic">Nobody talks to anyone.</em>
        </>
      ),
      desc: 'Cocktail specs on a clipboard behind the bar. Spillage logged in someone&apos;s memory. Pour cost calculated once a quarter when the accountant complains.',
    },
    {
      eyebrow: 'The Old Way',
      title: (
        <>
          You add a second site.{' '}
          <em className="text-gold-dark italic">Everything doubles.</em>
        </>
      ),
      desc: 'Two recipe books. Two stock sheets. Two suppliers you can&apos;t compare. Sundays evaporate into spreadsheets stitching it all together.',
    },
  ];
  return (
    <section id="problem" className="bg-paper-warm">
      <div className="max-w-[1200px] mx-auto px-6 md:px-8 py-20 md:py-24">
        <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold mb-4">
          The Problem
        </div>
        <h2 className="font-serif text-3xl md:text-5xl font-normal text-ink leading-[1.1] tracking-[-0.015em] mb-4 max-w-[760px]">
          Most hospitality software is{' '}
          <em className="text-gold italic font-medium">built for one role</em>{' '}
          and leaves the rest in the dark.
        </h2>
        <p className="font-serif italic text-base md:text-lg text-muted mb-10 max-w-[640px] leading-relaxed">
          Generic tools weren&apos;t built for the way a real venue actually runs — chef in the pass, bar on the floor, manager in the office, owner across town. Palatable is.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {cards.map((c, i) => (
            <div key={i} className="bg-card border-l-[3px] border-gold p-8">
              <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted mb-3">
                {c.eyebrow}
              </div>
              <div className="font-serif font-medium text-lg text-ink leading-tight mb-3">
                {c.title}
              </div>
              <p className="font-serif text-[15px] text-muted leading-[1.6]">
                {c.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// BRIGADE QUADRANT — the new heart of the page
// 2×2 grid of role cards. Each card has an eyebrow, headline, four
// bullet features, and a faux Looking-Ahead signal that reads as if it
// just emitted on that role's home screen.
// ---------------------------------------------------------------------

type RoleCard = {
  eyebrow: string;
  who: string;
  title: React.ReactNode;
  desc: string;
  features: string[];
  signalTag: string;
  signalText: React.ReactNode;
};

const ROLE_CARDS: RoleCard[] = [
  {
    eyebrow: 'Chef View',
    who: 'Head Chef · Sous Chef · CDP',
    title: (
      <>
        The kitchen, <em className="text-gold italic font-medium">in one tab</em>.
      </>
    ),
    desc: 'Mobile-first. Calm. Hides every penny the chef doesn\'t need to see — but tracks every penny that earns its place on the plate.',
    features: [
      'Live-costed recipes · allergens · yield',
      'Day-by-day prep board with stations',
      'Invoice scanning — snap, costs update',
      'Notebook for ideas, techniques, season',
    ],
    signalTag: 'Plan For It',
    signalText: (
      <>
        Hake costing up <em className="text-gold italic font-medium">9%</em> since last refresh — worth a £1.50 re-price.
      </>
    ),
  },
  {
    eyebrow: 'Bar View',
    who: 'Head Bartender · Bartender · Bar Back',
    title: (
      <>
        The bar, <em className="text-gold italic font-medium">on the same system</em>.
      </>
    ),
    desc: 'Drinks-shaped, but built from the same operating system. Cocktail specs, cellar stock, spillage — no more clipboards behind the well.',
    features: [
      'Cocktail specs with live pour cost',
      'Cellar stock + par breaches',
      'Spillage log surfacing patterns',
      'Tonight\'s mise list — garnish, cordials',
    ],
    signalTag: 'Worth Knowing',
    signalText: (
      <>
        Patrón spillage <em className="text-gold italic font-medium">4 times in 12 days</em>. Worth a chat with the well.
      </>
    ),
  },
  {
    eyebrow: 'Manager View',
    who: 'Manager · Deputy Manager · Supervisor',
    title: (
      <>
        Site command, <em className="text-gold italic font-medium">without the spreadsheet</em>.
      </>
    ),
    desc: 'Site-wide command. Menu engineering matrix. Team controls. Exceptions on the front page — not buried in a binder.',
    features: [
      'Menu builder · stars / plowhorses / dogs',
      'Team + permissions per member',
      'Deliveries oversight + discrepancy banner',
      'Compliance health card at a glance',
    ],
    signalTag: 'Get Ready',
    signalText: (
      <>
        Cellar deep-clean is{' '}
        <em className="text-gold italic font-medium">3 days overdue</em>. Three other tasks behind schedule too.
      </>
    ),
  },
  {
    eyebrow: 'Owner View',
    who: 'Owner · Group Operations',
    title: (
      <>
        The whole business, <em className="text-gold italic font-medium">one lens</em>.
      </>
    ),
    desc: 'Cross-site rollup. Per-venue GP and stock. Group totals. Cash position. Without asking your chef for a single number.',
    features: [
      'Site grid — GP · stock · alerts per venue',
      'Cross-site supplier price comparison',
      'Group reports · weekly / monthly / YoY',
      'Team management across every site',
    ],
    signalTag: 'Market Move',
    signalText: (
      <>
        <em className="text-gold italic font-medium">Bidfresh</em> now 8% cheaper than Aubrey across both sites.
      </>
    ),
  },
];

function BrigadeQuadrant() {
  return (
    <section
      id="brigade"
      className="max-w-[1200px] mx-auto px-6 md:px-8 py-20 md:py-24"
    >
      <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold mb-4">
        For Your Whole Brigade
      </div>
      <h2 className="font-serif text-3xl md:text-5xl font-normal text-ink leading-[1.1] tracking-[-0.015em] mb-4 max-w-[820px]">
        Four roles.{' '}
        <em className="text-gold italic font-medium">One operating system</em>.
      </h2>
      <p className="font-serif italic text-base md:text-lg text-muted mb-12 max-w-[700px] leading-relaxed">
        Every role gets a surface designed for the way they actually work. The chef&apos;s tab stays calm. The owner&apos;s tab stays sharp. The data flows up automatically — nobody types it twice.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-7">
        {ROLE_CARDS.map((r) => (
          <RoleQuadrantCard key={r.eyebrow} card={r} />
        ))}
      </div>

      <div className="mt-10 px-7 py-6 bg-paper-warm border-l-[3px] border-gold">
        <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-2">
          The Architectural Insight
        </div>
        <div className="font-serif text-[15px] md:text-[17px] text-ink-soft leading-[1.6]">
          The chef does the chef&apos;s work. The bartender does the bartender&apos;s work. That work feeds the manager&apos;s view and the owner&apos;s view{' '}
          <em className="text-gold-dark italic font-medium">automatically</em>. Nobody does data entry for anyone else.
        </div>
      </div>
    </section>
  );
}

function RoleQuadrantCard({ card }: { card: RoleCard }) {
  return (
    <div className="bg-card border border-rule p-7 md:p-8 flex flex-col">
      <div className="font-display font-semibold text-[10px] tracking-[0.35em] uppercase text-gold mb-2">
        {card.eyebrow}
      </div>
      <div className="font-serif italic text-xs text-muted mb-3">{card.who}</div>
      <div className="font-serif font-normal text-2xl md:text-[26px] text-ink leading-[1.15] tracking-[-0.015em] mb-3">
        {card.title}
      </div>
      <p className="font-serif text-[15px] text-ink-soft leading-[1.55] mb-5">
        {card.desc}
      </p>
      <ul className="list-none mb-6 space-y-2 flex-grow">
        {card.features.map((f) => (
          <li
            key={f}
            className="font-serif text-[14px] text-ink-soft flex items-start gap-2.5 leading-snug"
          >
            <span className="text-gold font-semibold flex-shrink-0 mt-0.5">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="bg-paper-warm border-l-2 border-gold px-4 py-3 mt-auto">
        <div className="font-display font-semibold text-[9px] tracking-[0.25em] uppercase text-gold mb-1">
          Looking Ahead · {card.signalTag}
        </div>
        <div className="font-serif text-[13px] text-ink-soft leading-snug">
          {card.signalText}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// ONE PLATFORM — replaces the old Modules grid. Reframes the modules
// not as "kitchen features" but as the shared spine that all four
// roles touch. Each module entry now includes a "who uses it" line.
// ---------------------------------------------------------------------

const PLATFORM_MODULES: Array<{
  name: string;
  desc: string;
  who: string;
  path: React.ReactNode;
}> = [
  {
    name: 'Recipes & Specs',
    desc: 'Live-costed dishes for the kitchen, cocktail specs for the bar — one schema, two surfaces.',
    who: 'Chef + Bartender authoring · Manager reviews · Owner sees GP',
    path: (
      <>
        <path d="M4 19V5a2 2 0 012-2h11l4 4v12a2 2 0 01-2 2H6a2 2 0 01-2-2zM7 7h7M7 11h10M7 15h8" />
      </>
    ),
  },
  {
    name: 'Stock & Suppliers',
    desc: 'One Bank, one Cellar. Invoice scanning, par-breach alerts, supplier reliability scoring.',
    who: 'Chef + Bartender scan · Manager monitors · Owner compares across sites',
    path: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="1" />
        <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
      </>
    ),
  },
  {
    name: 'Prep & Mise',
    desc: 'Day-by-day prep planner for the kitchen, mise list for the bar. Auto-builds from your menu.',
    who: 'Chef + Bartender plan · Manager sees outstanding',
    path: (
      <>
        <path d="M5 18C5 11 11 5 19 5c0 8-6 14-14 14z" />
        <path d="M5 18l9-9" />
      </>
    ),
  },
  {
    name: 'Menus & Plans',
    desc: 'Menu builder, allergen labels, GP per dish. Forward menu planner with the Kasavana matrix.',
    who: 'Manager builds · Chef + Bartender annotate · Owner approves',
    path: (
      <>
        <path d="M4 6h16M4 12h16M4 18h12" />
      </>
    ),
  },
  {
    name: 'Margins',
    desc: 'Dish-by-dish GP tracking. Spots drift the day a supplier price moves — not at month-end.',
    who: 'Chef + Bartender see per-dish · Manager sees by section · Owner sees rollup',
    path: (
      <>
        <path d="M3 17l4-4 3 3 7-7 4 4" />
      </>
    ),
  },
  {
    name: 'Looking Ahead',
    desc: 'Forward intelligence in chef\'s voice. Par breaches, cost spikes, stale costing, training expiry.',
    who: 'Every role · filtered to what they can act on',
    path: (
      <>
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  },
  {
    name: 'Team & Permissions',
    desc: 'Per-member roles with feature-level overrides. Tier and billing locked to the lead role.',
    who: 'Manager manages site team · Owner manages the whole brigade',
    path: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="10" r="2.5" />
        <path d="M3 20c0-3 3-5 6-5s6 2 6 5M14 20c0-2 2-4 4-4s3.5 1.5 3.5 3.5" />
      </>
    ),
  },
  {
    name: 'Safety (add-on)',
    desc: 'SFBB diary · HACCP wizard · EHO inspection mode. £20/site/month on top of any tier.',
    who: 'Chef + Bartender log · Manager + Owner consume · EHO mode for inspections',
    path: (
      <>
        <path d="M12 2L4 7v7c0 5 4 8 8 8s8-3 8-8V7l-8-5z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
  },
];

function OnePlatform() {
  return (
    <section
      id="platform"
      className="bg-paper-warm"
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-8 py-20 md:py-24">
        <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold mb-4">
          One Platform
        </div>
        <h2 className="font-serif text-3xl md:text-5xl font-normal text-ink leading-[1.1] tracking-[-0.015em] mb-4 max-w-[720px]">
          Eight modules.{' '}
          <em className="text-gold italic font-medium">Every role touches them differently</em>.
        </h2>
        <p className="font-serif italic text-base md:text-lg text-muted mb-12 max-w-[700px] leading-relaxed">
          Same data underneath. Different surface depending on who&apos;s holding the phone. No double-entry, no exports, no Sunday spreadsheets.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-rule border border-rule">
          {PLATFORM_MODULES.map((m) => (
            <div
              key={m.name}
              className="bg-card hover:bg-paper-warm transition-colors px-6 py-7 cursor-default flex flex-col"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="w-6 h-6 text-gold mb-4"
              >
                {m.path}
              </svg>
              <div className="font-serif font-medium text-base text-ink mb-2">
                {m.name}
              </div>
              <p className="font-serif text-[13px] text-muted leading-[1.5] mb-3 flex-grow">
                {m.desc}
              </p>
              <div className="font-display font-semibold text-[9px] tracking-[0.2em] uppercase text-gold-dark pt-3 border-t border-rule-soft">
                {m.who}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MarginsShowcase() {
  const rows: Array<{
    dish: React.ReactNode;
    gp: number;
    pct: number;
    status: string;
    tone: 'healthy' | 'attention' | 'urgent';
  }> = [
    {
      dish: <em className="text-gold italic font-medium">Hummus &amp; Lamb</em>,
      gp: 74,
      pct: 92,
      status: 'Star',
      tone: 'healthy',
    },
    {
      dish: <>Cauliflower Shawarma</>,
      gp: 71,
      pct: 88,
      status: 'On Target',
      tone: 'healthy',
    },
    {
      dish: <>Aleppo Chicken</>,
      gp: 68,
      pct: 82,
      status: 'On Target',
      tone: 'healthy',
    },
    {
      dish: <em className="text-gold italic font-medium">Smoked Aubergine</em>,
      gp: 62,
      pct: 65,
      status: 'Drift',
      tone: 'attention',
    },
    {
      dish: <>Beef Shawarma</>,
      gp: 54,
      pct: 48,
      status: 'Action',
      tone: 'urgent',
    },
  ];
  return (
    <section className="bg-paper">
      <div className="max-w-[1200px] mx-auto px-6 md:px-8 py-20 md:py-24 grid lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-16 items-center">
        <div>
          <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold mb-4">
            Margins · In Action
          </div>
          <h2 className="font-serif text-3xl md:text-5xl font-normal text-ink leading-[1.1] tracking-[-0.015em] mb-6">
            Every dish,{' '}
            <em className="text-gold italic font-medium">scored daily</em>.
          </h2>
          <p className="font-serif text-base md:text-[17px] text-ink-soft leading-[1.7] mb-4">
            Live GP for every dish, pulled from real ingredient costs and updated every time a supplier price moves — across food and drink.
          </p>
          <p className="font-serif text-base md:text-[17px] text-ink-soft leading-[1.7]">
            The chef sees per-dish drift. The manager sees which section is dragging GP. The owner sees the rollup across sites.{' '}
            <em className="text-gold-dark italic font-medium">Same data, three lenses, no exports.</em>
          </p>
        </div>
        <div className="bg-card border border-rule rounded-md shadow-[0_16px_40px_rgba(26,22,18,0.08)] overflow-hidden">
          <div className="flex items-center gap-1.5 px-3.5 py-3 bg-paper-warm border-b border-rule">
            <span className="w-2 h-2 rounded-full bg-[#E36050]" />
            <span className="w-2 h-2 rounded-full bg-[#D9A02C]" />
            <span className="w-2 h-2 rounded-full bg-[#5DA853]" />
            <span className="ml-2 font-display font-semibold text-[10px] tracking-[0.35em] uppercase text-gold">
              Margins · Week 20
            </span>
          </div>
          <div className="px-6 py-5">
            <div className="font-display font-semibold text-[9px] tracking-[0.3em] uppercase text-gold mb-1.5">
              Dish Performance · This Week
            </div>
            <div className="font-serif text-xl text-ink mb-4 leading-tight">
              8 of 12 dishes{' '}
              <em className="text-gold italic font-medium">on target</em>.
            </div>
            <div className="grid grid-cols-[1.6fr_0.7fr_1fr_0.6fr] gap-4 pb-2 border-b border-rule">
              {['Dish', 'GP', 'vs Target', 'Status'].map((h) => (
                <div
                  key={h}
                  className="font-display font-semibold text-[9px] tracking-[0.25em] uppercase text-muted"
                >
                  {h}
                </div>
              ))}
            </div>
            {rows.map((r, i) => (
              <div
                key={i}
                className={
                  'grid grid-cols-[1.6fr_0.7fr_1fr_0.6fr] gap-4 py-3 items-center' +
                  (i < rows.length - 1 ? ' border-b border-rule' : '')
                }
              >
                <div className="font-serif text-sm text-ink">{r.dish}</div>
                <div
                  className={
                    'font-mono text-sm font-medium ' +
                    (r.tone === 'healthy'
                      ? 'text-healthy'
                      : r.tone === 'attention'
                        ? 'text-attention'
                        : 'text-urgent')
                  }
                >
                  {r.gp}%
                </div>
                <div className="h-1.5 bg-rule rounded-sm overflow-hidden">
                  <div
                    className={
                      'h-full rounded-sm ' +
                      (r.tone === 'healthy'
                        ? 'bg-healthy'
                        : r.tone === 'attention'
                          ? 'bg-attention'
                          : 'bg-urgent')
                    }
                    style={{ width: r.pct + '%' }}
                  />
                </div>
                <div
                  className={
                    'font-display font-semibold text-[9px] tracking-[0.25em] uppercase px-2 py-1 text-center ' +
                    (r.tone === 'healthy'
                      ? 'bg-healthy/15 text-healthy'
                      : r.tone === 'attention'
                        ? 'bg-attention/15 text-attention'
                        : 'bg-urgent text-paper')
                  }
                >
                  {r.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SafetyShowcase() {
  return (
    <section id="safety" className="bg-ink text-paper">
      <div className="max-w-[1200px] mx-auto px-6 md:px-8 py-20 md:py-24 grid md:grid-cols-2 gap-12 md:gap-16 items-center">
        <div>
          <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold-light mb-4">
            Safety Module · £20 / site / month
          </div>
          <h2 className="font-serif text-3xl md:text-5xl font-normal text-paper leading-[1.1] tracking-[-0.015em] mb-6">
            When the EHO walks in,{' '}
            <em className="text-gold-light italic font-medium">
              you don&apos;t reach for a binder
            </em>
            .
          </h2>
          <p className="font-serif text-base md:text-[17px] text-paper/85 leading-[1.7] mb-4">
            The Safety module replaces the FSA paper diary with a digital one — opening checks, probe readings, deliveries, cleaning, training records, incident log.{' '}
            <em className="text-gold-light italic font-medium">
              Logged by the brigade. Visible to managers. Audit-ready for owners.
            </em>
          </p>
          <p className="font-serif text-base md:text-[17px] text-paper/85 leading-[1.7] mb-4">
            When the inspector arrives, you open the iPad. Live timer running. Visit log auto-saving. Every record from the last 90 days, organised by category, ready to show.
          </p>
          <p className="font-serif text-base md:text-[17px] text-paper/85 leading-[1.7]">
            One tap. 4 seconds.{' '}
            <em className="text-gold-light italic font-medium">
              47-page evidence bundle
            </em>
            , exported.
          </p>
          <div className="grid grid-cols-2 gap-6 mt-8 pt-8 border-t border-paper/10">
            <div>
              <div className="font-serif font-medium text-3xl text-gold-light leading-none">
                47 pages
              </div>
              <div className="font-display font-semibold text-[9px] tracking-[0.3em] uppercase text-paper/60 mt-2">
                90-Day Evidence Bundle
              </div>
            </div>
            <div>
              <div className="font-serif font-medium text-3xl text-gold-light leading-none">
                4 seconds
              </div>
              <div className="font-display font-semibold text-[9px] tracking-[0.3em] uppercase text-paper/60 mt-2">
                To Generate
              </div>
            </div>
          </div>
        </div>
        <div className="bg-paper/[0.04] border border-paper/10 rounded-sm p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-paper/10">
            <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-paper">
              EHO Visit · Live
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-gold-light">
              <span className="w-2 h-2 rounded-full bg-healthy animate-pulse" />
              <span>00:24:18</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: 'Days Logged', value: '81 / 90', tone: 'healthy' },
              { label: 'Probe Readings', value: '412', tone: 'healthy' },
              { label: 'Deliveries', value: '68 / 68', tone: 'healthy' },
              { label: 'Cleaning Gaps', value: '3', tone: 'attention' },
            ].map((t) => (
              <div
                key={t.label}
                className={
                  'bg-paper/[0.06] px-4 py-3.5 border-l-2 ' +
                  (t.tone === 'attention' ? 'border-attention' : 'border-healthy')
                }
              >
                <div className="font-display font-semibold text-[9px] tracking-[0.25em] uppercase text-paper/50 mb-1">
                  {t.label}
                </div>
                <div
                  className={
                    'font-serif font-medium text-lg leading-none ' +
                    (t.tone === 'attention' ? 'text-attention' : 'text-healthy')
                  }
                >
                  {t.value}
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/coming-soon-feature"
            className="block w-full text-center py-3.5 bg-gold text-ink font-display font-semibold text-[11px] tracking-[0.35em] uppercase no-underline hover:bg-gold-light transition-colors"
          >
            Export 90-Day Bundle
          </Link>
          <div className="text-center font-serif italic text-xs text-paper/50 mt-2.5">
            PDF · 47 pages · 4 seconds to generate
          </div>
        </div>
      </div>
    </section>
  );
}

const PRICING: Array<{
  name: string;
  price: string;
  sub: string;
  features: string[];
  featured?: boolean;
  cta: { label: string; href: string };
}> = [
  {
    name: 'Pro',
    price: '£49',
    sub: 'Solo chef or solo bar lead. Single site. The essentials, done well.',
    features: [
      'Recipes or specs · live costing',
      'Invoice scanning + price alerts',
      'Allergen tracking',
      'Daily margins dashboard',
      '1 user account',
    ],
    cta: { label: "Let's Start", href: '/coming-soon-feature' },
  },
  {
    name: 'Kitchen',
    price: '£79',
    sub: 'Independent restaurant or bar. Full brigade. The complete operating system.',
    features: [
      'Everything in Pro',
      'Up to 5 users — chef + bar + manager',
      'Prep + mise · notebook',
      'Stock counting + supplier scores',
      'Looking Ahead intelligence',
      'Manager shell · menu builder · team',
    ],
    featured: true,
    cta: { label: "Let's Start", href: '/coming-soon-feature' },
  },
  {
    name: 'Group',
    price: '£119',
    sub: 'Multi-site operator. Cross-venue reporting and owner controls.',
    features: [
      'Everything in Kitchen',
      'Up to 25 users · up to 5 sites',
      'Owner shell · cross-site rollup',
      'Cross-venue supplier comparison',
      'Group reports · weekly / monthly / YoY',
      'Priority support',
    ],
    cta: { label: "Let's Start", href: '/coming-soon-feature' },
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    sub: 'Hotels, large groups, franchise networks. Built around you.',
    features: [
      'Everything in Group',
      'Unlimited users + sites',
      'SSO + advanced permissions',
      'Custom integrations + API',
      'Dedicated account manager',
      'SLA + data residency options',
    ],
    cta: {
      label: "Let's Talk",
      href: 'mailto:hello@palateandpen.co.uk?subject=Palatable%20Enterprise%20enquiry',
    },
  },
];

function Pricing() {
  return (
    <section
      id="pricing"
      className="max-w-[1200px] mx-auto px-6 md:px-8 py-20 md:py-24"
    >
      <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold mb-4">
        Pricing
      </div>
      <h2 className="font-serif text-3xl md:text-5xl font-normal text-ink leading-[1.1] tracking-[-0.015em] mb-4 max-w-[720px]">
        Honest pricing.{' '}
        <em className="text-gold italic font-medium">No surprises</em>.
      </h2>
      <p className="font-serif italic text-base md:text-lg text-muted mb-10 max-w-[640px] leading-relaxed">
        Per site, per month. Cancel anytime. Add the Safety module to any tier for £20 more.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {PRICING.map((p) => (
          <div
            key={p.name}
            className={
              'bg-card p-8 flex flex-col relative ' +
              (p.featured
                ? 'border-2 border-gold xl:-translate-y-2'
                : 'border border-rule')
            }
          >
            {p.featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-paper font-display font-semibold text-[9px] tracking-[0.3em] uppercase px-3 py-1">
                Most Popular
              </div>
            )}
            <div className="font-display font-semibold text-[11px] tracking-[0.35em] uppercase text-gold mb-4">
              {p.name}
            </div>
            <div className="font-serif text-[42px] font-normal text-ink leading-none mb-1">
              <em className="text-gold italic font-medium">{p.price}</em>
            </div>
            <div className="font-serif italic text-[13px] text-muted mb-5">
              {p.name === 'Enterprise' ? 'tailored to your group' : 'per site, per month'}
            </div>
            <div className="font-serif text-[13px] text-ink-soft mb-5 leading-[1.5] min-h-[56px]">
              {p.sub}
            </div>
            <ul className="list-none mb-6 flex-grow">
              {p.features.map((f) => (
                <li
                  key={f}
                  className="py-2.5 border-b border-rule last:border-b-0 font-serif text-[13px] text-ink-soft flex items-start gap-2 leading-[1.4]"
                >
                  <span className="text-gold font-semibold flex-shrink-0">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <a
              href={p.cta.href}
              className={
                'block w-full text-center py-3.5 font-display font-semibold text-[11px] tracking-[0.35em] uppercase border transition-colors ' +
                (p.featured
                  ? 'bg-ink text-paper border-ink hover:bg-gold hover:border-gold'
                  : 'border-ink text-ink hover:bg-ink hover:text-paper')
              }
            >
              {p.cta.label}
            </a>
          </div>
        ))}
      </div>
      <div className="mt-8 px-8 py-6 bg-paper-warm border-l-[3px] border-gold text-center">
        <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-1.5">
          Optional Add-On
        </div>
        <div className="font-serif text-[15px] text-ink-soft">
          Add the{' '}
          <em className="text-gold-dark italic font-medium">Safety module</em>{' '}
          to any tier for an extra{' '}
          <em className="text-gold-dark italic font-medium">£20/site/month</em>{' '}
          — SFBB digital diary, HACCP wizard, and the EHO Visit page.
        </div>
      </div>
    </section>
  );
}

function BuiltBy() {
  return (
    <section className="bg-paper-warm">
      <div className="max-w-[720px] mx-auto px-6 md:px-8 py-20 md:py-24 text-center">
        <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold mb-4">
          Built By A Chef
        </div>
        <h2 className="font-serif text-3xl md:text-5xl font-normal text-ink leading-[1.1] tracking-[-0.015em] mb-4">
          By the team behind{' '}
          <em className="text-gold italic font-medium">Palate &amp; Pen</em>.
        </h2>
        <p className="font-serif text-base md:text-[19px] text-ink-soft leading-[1.7] mb-8">
          Palatable is built by a working chef who got tired of watching his bar lead, manager and owners all run their own systems that never talked to each other. No VC funding. No AI-native buzzwords. Just an operating system shaped by hundreds of services — and designed so the whole brigade actually wants to use it.
        </p>
        <a
          href="https://www.palateandpen.co.uk"
          className="font-display font-semibold text-[11px] tracking-[0.35em] uppercase text-ink hover:text-gold transition-colors pb-1 border-b border-gold inline-flex items-center gap-2.5"
        >
          Visit Palate &amp; Pen
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-3.5 h-3.5"
          >
            <path d="M7 17L17 7M7 7h10v10" />
          </svg>
        </a>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="max-w-[1200px] mx-auto px-6 md:px-8 py-20 md:py-24 text-center">
      <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold mb-4">
        Get Started
      </div>
      <h2 className="font-serif text-3xl md:text-5xl font-normal text-ink leading-[1.1] tracking-[-0.015em] mb-4">
        Try Palatable Pro{' '}
        <em className="text-gold italic font-medium">free for 7 days</em>.
      </h2>
      <p className="font-serif italic text-base md:text-lg text-muted mb-8 max-w-[640px] mx-auto leading-relaxed">
        No card required. Full Pro access from day one. Bring your chef, your bar lead, your manager — see if the whole brigade earns its place.
      </p>
      <div className="flex flex-wrap gap-3.5 justify-center">
        <Link
          href="/coming-soon-feature"
          className="font-display font-semibold text-[11px] tracking-[0.35em] uppercase px-7 py-4 bg-ink text-paper border border-ink hover:bg-gold hover:border-gold transition-colors inline-flex items-center gap-2.5"
        >
          Start 7-Day Pro Trial
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="w-3.5 h-3.5"
          >
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
        <a
          href="mailto:hello@palateandpen.co.uk"
          className="font-display font-semibold text-[11px] tracking-[0.35em] uppercase px-7 py-4 bg-transparent text-ink border border-ink hover:bg-ink hover:text-paper transition-colors"
        >
          Book a Demo
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-ink text-paper/60 px-6 md:px-8 py-12">
      <div className="max-w-[1200px] mx-auto flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="font-display font-semibold text-sm tracking-[0.3em] uppercase text-paper inline-flex items-center gap-1.5">
            Palatable
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          </div>
          <div className="font-serif italic text-sm text-paper/60 mt-1">
            © 2026 Palate &amp; Pen Ltd · Built by chefs · East Midlands
          </div>
        </div>
        <div className="flex gap-6">
          <a
            href="https://www.palateandpen.co.uk"
            className="font-sans text-xs text-paper/70 hover:text-gold-light transition-colors"
          >
            Palate &amp; Pen
          </a>
          <a
            href="#brigade"
            className="font-sans text-xs text-paper/70 hover:text-gold-light transition-colors"
          >
            For Your Brigade
          </a>
          <a
            href="#pricing"
            className="font-sans text-xs text-paper/70 hover:text-gold-light transition-colors"
          >
            Pricing
          </a>
          <a
            href="mailto:hello@palateandpen.co.uk"
            className="font-sans text-xs text-paper/70 hover:text-gold-light transition-colors"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
