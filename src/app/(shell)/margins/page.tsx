export const metadata = { title: 'Margins — Palatable' };

type DishTone = 'healthy' | 'attention' | 'urgent';
type Trend = 'up' | 'down' | 'flat' | 'urgent-down';

type Dish = {
  name: string;
  gp: string;
  gpTone: DishTone;
  trend: Trend;
  trendValue: string;
  price: string;
  exposureBold?: string;
  exposureTail: string;
};

type MenuDetailSection = {
  title: string;
  summary: React.ReactNode;
  dishes: Dish[];
};

const sectionSummary = [
  { name: 'Starters', gp: '72%', tone: 'healthy' as DishTone, detail: '4 dishes', flagTone: 'healthy' as DishTone, flag: 'all behaving' },
  { name: 'Mains', gp: '63%', tone: 'attention' as DishTone, detail: '5 dishes', flagTone: 'urgent' as DishTone, flag: '2 flagged', active: true },
  { name: 'Grill', gp: '69%', tone: 'healthy' as DishTone, detail: '4 dishes', flagTone: 'healthy' as DishTone, flag: 'steady as ever' },
  { name: 'Sides', gp: '76%', tone: 'healthy' as DishTone, detail: '6 dishes', flagTone: 'healthy' as DishTone, flag: 'pulling weight' },
  { name: 'Desserts', gp: '70%', tone: 'healthy' as DishTone, detail: '3 dishes', flagTone: 'healthy' as DishTone, flag: 'all good' },
  { name: 'Drinks', gp: '78%', tone: 'healthy' as DishTone, detail: '— / list only', flagTone: 'healthy' as DishTone, flag: 'not tracked' },
];

const allDishes: MenuDetailSection[] = [
  {
    title: 'Starters',
    summary: (
      <>
        <strong className="not-italic font-semibold text-ink">4 dishes</strong> · avg GP{' '}
        <strong className="not-italic font-semibold text-ink">72%</strong> · two soft drifts on tahini, rest behaving
      </>
    ),
    dishes: [
      { name: 'Hummus & Flatbread', gp: '69%', gpTone: 'attention', trend: 'down', trendValue: '↓ 3.0', price: '£8.50', exposureBold: 'Tahini', exposureTail: ' · Reza Foods' },
      { name: 'Baba Ghanoush', gp: '70%', gpTone: 'attention', trend: 'down', trendValue: '↓ 2.5', price: '£8.00', exposureBold: 'Tahini', exposureTail: ' · same story as the hummus' },
      { name: 'Falafel', gp: '74%', gpTone: 'healthy', trend: 'flat', trendValue: '— 0.0', price: '£9.00', exposureTail: 'Chickpeas, herbs · holding' },
      { name: 'Cured Mackerel', gp: '75%', gpTone: 'healthy', trend: 'up', trendValue: '↑ 1.5', price: '£11.00', exposureTail: 'Mackerel cheaper than usual' },
    ],
  },
  {
    title: 'Mains',
    summary: (
      <>
        <strong className="not-italic font-semibold text-ink">5 dishes</strong> · avg GP{' '}
        <strong className="not-italic font-semibold text-ink">63%</strong> · 2 flagged · 3 holding
      </>
    ),
    dishes: [
      { name: 'Lamb Shawarma', gp: '61%', gpTone: 'urgent', trend: 'urgent-down', trendValue: '↓ 4.0', price: '£18.50', exposureBold: 'Lamb shoulder', exposureTail: ' · Aubrey hiked the price' },
      { name: 'Chargrilled Burger', gp: '64%', gpTone: 'attention', trend: 'down', trendValue: '↓ 2.0', price: '£16.00', exposureBold: 'Beef mince + brioche', exposureTail: ' · both up a bit' },
      { name: 'Chicken Shish', gp: '68%', gpTone: 'healthy', trend: 'flat', trendValue: '— 0.0', price: '£17.00', exposureTail: 'Chicken doing what chicken does' },
      { name: 'Adana Kebab', gp: '66%', gpTone: 'healthy', trend: 'flat', trendValue: '— 0.0', price: '£17.50', exposureTail: 'Lamb mince · holding steady' },
      { name: 'Aubergine Şakşuka', gp: '71%', gpTone: 'healthy', trend: 'up', trendValue: '↑ 1.0', price: '£14.00', exposureTail: 'Veg in season, costing less' },
    ],
  },
  {
    title: 'Grill',
    summary: (
      <>
        <strong className="not-italic font-semibold text-ink">4 dishes</strong> · avg GP{' '}
        <strong className="not-italic font-semibold text-ink">69%</strong> · everyone behaving
      </>
    ),
    dishes: [
      { name: 'Beef Short Rib', gp: '67%', gpTone: 'healthy', trend: 'flat', trendValue: '— 0.0', price: '£24.00', exposureTail: 'Short rib · doing its job' },
      { name: 'Whole Bream', gp: '71%', gpTone: 'healthy', trend: 'up', trendValue: '↑ 0.5', price: '£22.00', exposureTail: 'Bream cheaper than usual' },
      { name: 'Lamb Cutlets', gp: '68%', gpTone: 'healthy', trend: 'down', trendValue: '↓ 1.0', price: '£26.00', exposureBold: 'Cutlets', exposureTail: ' · soft drift, watching it' },
      { name: 'Halloumi Skewers', gp: '70%', gpTone: 'healthy', trend: 'flat', trendValue: '— 0.0', price: '£14.00', exposureTail: 'Halloumi · same price as ever' },
    ],
  },
  {
    title: 'Sides',
    summary: (
      <>
        <strong className="not-italic font-semibold text-ink">6 dishes</strong> · avg GP{' '}
        <strong className="not-italic font-semibold text-ink">76%</strong> · making good money, all six
      </>
    ),
    dishes: [
      { name: 'Hand-Cut Chips', gp: '78%', gpTone: 'healthy', trend: 'flat', trendValue: '— 0.0', price: '£5.50', exposureTail: 'Potatoes · steady' },
      { name: 'Tabbouleh', gp: '79%', gpTone: 'healthy', trend: 'up', trendValue: '↑ 0.5', price: '£6.00', exposureTail: 'Herbs, bulgur · fine' },
      { name: 'Charred Broccoli', gp: '73%', gpTone: 'healthy', trend: 'flat', trendValue: '— 0.0', price: '£6.50', exposureTail: 'Broccoli · stable' },
      { name: 'Pickled Vegetables', gp: '82%', gpTone: 'healthy', trend: 'flat', trendValue: '— 0.0', price: '£4.50', exposureTail: 'Best margin on the menu' },
      { name: 'Flatbread', gp: '74%', gpTone: 'healthy', trend: 'down', trendValue: '↓ 0.5', price: '£4.00', exposureTail: 'Flour up slightly · not a problem' },
      { name: 'Yoghurt & Herbs', gp: '75%', gpTone: 'healthy', trend: 'flat', trendValue: '— 0.0', price: '£4.00', exposureTail: 'Yoghurt · stable' },
    ],
  },
  {
    title: 'Desserts',
    summary: (
      <>
        <strong className="not-italic font-semibold text-ink">3 dishes</strong> · avg GP{' '}
        <strong className="not-italic font-semibold text-ink">70%</strong> · sweet end to the menu
      </>
    ),
    dishes: [
      { name: 'Baklava', gp: '71%', gpTone: 'healthy', trend: 'flat', trendValue: '— 0.0', price: '£8.00', exposureTail: 'Pistachio · stable' },
      { name: 'Halva & Stone Fruit', gp: '69%', gpTone: 'healthy', trend: 'up', trendValue: '↑ 0.5', price: '£7.50', exposureTail: 'Stone fruit in season' },
      { name: 'Cardamom Ice Cream', gp: '70%', gpTone: 'healthy', trend: 'flat', trendValue: '— 0.0', price: '£6.00', exposureTail: 'Dairy · steady' },
    ],
  },
];

const toneText: Record<DishTone, string> = {
  healthy: 'text-healthy',
  attention: 'text-attention',
  urgent: 'text-urgent',
};

const trendText: Record<Trend, string> = {
  up: 'text-healthy',
  down: 'text-attention',
  flat: 'text-muted',
  'urgent-down': 'text-urgent',
};

export default function MarginsPage() {
  return (
    <div className="px-14 pt-12 pb-20 max-w-[1400px]">
      <div className="flex justify-between items-start gap-8 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-display font-semibold text-[9px] tracking-[0.5em] uppercase text-gold mb-3.5">
            Menu Performance
          </div>
          <h1 className="font-serif text-5xl text-ink leading-[1.05] tracking-[-0.015em]">
            <em className="text-gold not-italic font-medium italic">Margins</em>
            {' '}— how your menu is doing
          </h1>
          <p className="font-serif italic text-[17px] text-muted mt-3">
            Two dishes need sorting. Everything else is in good shape.
          </p>
        </div>

        <div className="bg-card border border-rule px-5 py-4 min-w-[300px]">
          <div className="font-display font-semibold text-[8px] tracking-[0.4em] uppercase text-muted mb-3">
            Comparing
          </div>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {['7 D', '7 D vs 7 D', 'Month vs Last', 'Quarter', 'YTD'].map((p) => (
              <button
                key={p}
                className={
                  'font-display font-semibold text-[8px] tracking-[0.3em] uppercase px-3 py-2 border ' +
                  (p === '7 D vs 7 D'
                    ? 'bg-ink border-ink text-paper'
                    : 'bg-transparent border-rule text-ink-soft hover:border-gold hover:text-ink')
                }
              >
                {p}
              </button>
            ))}
          </div>
          <div className="font-serif italic text-xs text-muted">
            <strong className="not-italic font-semibold text-ink">8 May – 14 May</strong>{' '}
            vs{' '}
            <strong className="not-italic font-semibold text-ink">1 May – 7 May</strong>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <Kpi label="Menu GP" value="68%" trend="↓ 1.2pt" tone="healthy" sub="target 65% · still healthy" />
        <Kpi label="Dishes Healthy" value="15" trend="/ 17" sub="88% of menu on target" />
        <Kpi label="Needs Attention" value="2" sub="both in mains" tone="attention" />
        <Kpi label="Worst Drift" value="−4pt" sub="lamb shawarma" tone="attention" />
      </div>

      <Section title="Needs Your Attention" meta="Two dishes flagged · sorted by severity">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AttentionCard
            severity="urgent"
            section="Mains"
            severityLabel="Urgent"
            headlinePre="Your"
            headlineEm="lamb shawarma"
            headlinePost="'s hurting you."
            gp="61%"
            movementLabel="Down This Week"
            movementValue="−4 points"
            cause={
              <>
                <strong className="not-italic font-semibold text-ink">
                  Aubrey hit you with £14.20/kg on lamb shoulder Tuesday
                </strong>{' '}
                — up from £12.70. You costed it at £11.50. Every plate's down £1.85.
              </>
            }
            actionLabel="Sort the dish →"
            actionContext="last costed 6 weeks ago"
          />
          <AttentionCard
            severity="attention"
            section="Mains"
            severityLabel="Watch"
            headlinePre="The"
            headlineEm="burger"
            headlinePost="'s drifting on you."
            gp="64%"
            movementLabel="Down This Week"
            movementValue="−2 points"
            cause={
              <>
                <strong className="not-italic font-semibold text-ink">
                  Beef mince up 6% at Aubrey, brioche up 8% at Reza.
                </strong>{' '}
                Each one's small but it's been three weeks of soft drift — not a one-off.
              </>
            }
            actionLabel="Sort the dish →"
            actionContext="last costed 9 weeks ago"
          />
        </div>
      </Section>

      <Section title="Menu Section Performance" meta="in menu order · click to jump to detail">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {sectionSummary.map((s) => (
            <SectionSummaryCard key={s.name} {...s} />
          ))}
        </div>
      </Section>

      <Section title="All Dishes" meta="in menu order · click any dish to drill into its costing">
        {allDishes.map((s) => (
          <MenuDetailBlock key={s.title} section={s} />
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  meta,
  children,
}: {
  title: string;
  meta: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <div className="flex items-baseline justify-between mb-6 pb-3 border-b border-rule">
        <div className="font-display font-semibold text-[10px] tracking-[0.5em] uppercase text-gold">
          {title}
        </div>
        <div className="font-serif italic text-[13px] text-muted">{meta}</div>
      </div>
      {children}
    </section>
  );
}

function Kpi({
  label,
  value,
  trend,
  sub,
  tone,
}: {
  label: string;
  value: string;
  trend?: string;
  sub: string;
  tone?: 'healthy' | 'attention';
}) {
  return (
    <div className="bg-card px-7 py-6">
      <div className="font-display font-semibold text-[8px] tracking-[0.4em] uppercase text-muted mb-3">
        {label}
      </div>
      <div
        className={
          'font-serif font-medium text-[36px] leading-none tracking-[-0.015em] ' +
          (tone === 'healthy'
            ? 'text-healthy'
            : tone === 'attention'
              ? 'text-attention'
              : 'text-ink')
        }
      >
        {value}
        {trend && (
          <span className="font-serif italic text-sm text-muted ml-2">
            {trend}
          </span>
        )}
      </div>
      <div className="font-serif italic text-[13px] text-muted mt-2">{sub}</div>
    </div>
  );
}

function AttentionCard({
  severity,
  section,
  severityLabel,
  headlinePre,
  headlineEm,
  headlinePost,
  gp,
  movementLabel,
  movementValue,
  cause,
  actionLabel,
  actionContext,
}: {
  severity: 'urgent' | 'attention';
  section: string;
  severityLabel: string;
  headlinePre: string;
  headlineEm: string;
  headlinePost: string;
  gp: string;
  movementLabel: string;
  movementValue: string;
  cause: React.ReactNode;
  actionLabel: string;
  actionContext: string;
}) {
  const border = severity === 'urgent' ? 'border-l-urgent' : 'border-l-attention';
  const sevColor = severity === 'urgent' ? 'text-urgent' : 'text-attention';

  return (
    <div className={'bg-card border border-rule border-l-4 px-7 py-7 ' + border}>
      <div className="flex items-baseline justify-between mb-4">
        <div className={'font-display font-semibold text-[9px] tracking-[0.4em] uppercase ' + sevColor}>
          {section}
        </div>
        <div className={'font-display font-semibold text-[8px] tracking-[0.3em] uppercase ' + sevColor}>
          {severityLabel}
        </div>
      </div>

      <div className="font-serif text-xl text-ink mb-5 leading-snug">
        {headlinePre}{' '}
        <em className="text-gold not-italic font-medium italic">{headlineEm}</em>
        {headlinePost}
      </div>

      <div className="flex items-end gap-8 mb-5">
        <div className={'font-serif font-medium text-[40px] leading-none ' + sevColor}>
          {gp}
        </div>
        <div>
          <div className="font-display font-semibold text-[8px] tracking-[0.4em] uppercase text-muted">
            {movementLabel}
          </div>
          <div className={'font-serif font-medium text-lg mt-1 ' + sevColor}>
            {movementValue}
          </div>
        </div>
      </div>

      <div className="font-serif italic text-[15px] text-muted leading-relaxed mb-4">
        {cause}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-rule">
        <a className="font-display font-semibold text-[9px] tracking-[0.3em] uppercase text-gold cursor-pointer">
          {actionLabel}
        </a>
        <div className="font-serif italic text-[11px] text-muted">{actionContext}</div>
      </div>
    </div>
  );
}

function SectionSummaryCard({
  name,
  gp,
  tone,
  detail,
  flag,
  flagTone,
  active,
}: {
  name: string;
  gp: string;
  tone: DishTone;
  detail: string;
  flag: string;
  flagTone: DishTone;
  active?: boolean;
}) {
  return (
    <div
      className={
        'bg-card border px-5 py-5 cursor-pointer transition-colors ' +
        (active ? 'border-gold' : 'border-rule hover:border-rule-gold')
      }
    >
      <div className="font-display font-semibold text-[9px] tracking-[0.35em] uppercase text-muted mb-3">
        {name}
      </div>
      <div className={'font-serif font-medium text-[28px] leading-none ' + toneText[tone]}>
        {gp}
      </div>
      <div className="font-serif italic text-[12px] text-muted mt-2">{detail}</div>
      <div className="flex items-center gap-1.5 mt-2 font-serif italic text-[12px] text-muted">
        <span
          className={
            'w-1.5 h-1.5 rounded-full ' +
            (flagTone === 'urgent'
              ? 'bg-urgent'
              : flagTone === 'attention'
                ? 'bg-attention'
                : 'bg-healthy')
          }
        />
        <span>{flag}</span>
      </div>
    </div>
  );
}

function MenuDetailBlock({ section }: { section: MenuDetailSection }) {
  return (
    <div className="mb-8">
      <div className="bg-paper-warm border border-rule px-6 py-4 mb-0">
        <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold mb-1.5">
          {section.title}
        </div>
        <div className="font-serif italic text-[13px] text-muted">{section.summary}</div>
      </div>

      <div className="bg-card border border-rule border-t-0">
        <div className="hidden md:grid grid-cols-[2fr_70px_70px_90px_2fr_30px] gap-4 px-6 py-3 border-b border-rule bg-paper-warm/40">
          {['Dish', 'GP %', 'vs 7D', 'Plate Price', 'Exposed To', ''].map((h, i) => (
            <div key={i} className="font-display font-semibold text-[8px] tracking-[0.35em] uppercase text-muted">
              {h}
            </div>
          ))}
        </div>

        {section.dishes.map((d, i) => (
          <div
            key={d.name}
            className={
              'grid grid-cols-1 md:grid-cols-[2fr_70px_70px_90px_2fr_30px] gap-4 px-6 py-4 items-center cursor-pointer hover:bg-card-warm transition-colors' +
              (i < section.dishes.length - 1 ? ' border-b border-rule-soft' : '')
            }
          >
            <div className="font-serif font-semibold text-base text-ink">
              {d.name}
            </div>
            <div className={'font-serif font-semibold text-base ' + toneText[d.gpTone]}>
              {d.gp}
            </div>
            <div className={'font-serif font-medium text-sm ' + trendText[d.trend]}>
              {d.trendValue}
            </div>
            <div className="font-serif text-sm text-ink">{d.price}</div>
            <div className="font-serif italic text-[13px] text-muted">
              {d.exposureBold && (
                <strong className="not-italic font-semibold text-ink">
                  {d.exposureBold}
                </strong>
              )}
              {d.exposureTail}
            </div>
            <div className="text-muted-soft justify-self-end">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 3l4 4-4 4" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
