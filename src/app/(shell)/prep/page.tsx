export const metadata = { title: 'Prep — Palatable' };

type Status = 'done' | 'in-progress' | 'not-started';
type Assignee = 'tom' | 'maria' | 'sam' | 'unassigned';

type PrepItem = {
  name: string;
  emphasis?: string;
  recipe?: string;
  context?: string;
  qty: string;
  qtyUnit?: string;
  suggested: string;
  suggestedFlag?: boolean;
  assignee: Assignee;
  assigneeName: string;
  status: Status;
  notes?: string;
};

type Station = {
  name: string;
  chef: string;
  progress: { done: number; total: number; rest: string; tone?: 'healthy' | 'attention' };
  items: PrepItem[];
};

const stations: Station[] = [
  {
    name: 'Garde Manger',
    chef: 'Tom Reilly',
    progress: { done: 3, total: 5, rest: '2 to go', tone: 'healthy' },
    items: [
      {
        name: 'base',
        emphasis: 'Hummus',
        recipe: 'Recipe · Hummus',
        context: 'finished 08:22',
        qty: '4.5',
        qtyUnit: 'kg',
        suggested: 'suggested 4.2kg',
        assignee: 'tom',
        assigneeName: 'Tom',
        status: 'done',
        notes:
          "Used labneh to thin per Tuesday's voice memo — rounder flavour, cuts cost.",
      },
      {
        name: 'Tahini sauce',
        recipe: 'Recipe · Tahini Sauce',
        context: 'finished 08:45',
        qty: '2',
        qtyUnit: 'L',
        suggested: 'at recipe scale',
        assignee: 'tom',
        assigneeName: 'Tom',
        status: 'done',
      },
      {
        name: 'Baba ghanoush',
        recipe: 'Recipe · Baba Ghanoush',
        context: 'finished 09:10',
        qty: '3',
        qtyUnit: 'kg',
        suggested: 'suggested 2.8kg',
        assignee: 'tom',
        assigneeName: 'Tom',
        status: 'done',
        notes: 'Aubergines properly smoked this morning — flavour deep.',
      },
      {
        name: 'Pickled turnips',
        recipe: 'Recipe · Pink Pickle',
        context: 'started 09:25',
        qty: '1.5',
        qtyUnit: 'kg',
        suggested: 'at recipe scale',
        assignee: 'tom',
        assigneeName: 'Tom',
        status: 'in-progress',
      },
      {
        name: 'Parsley + coriander',
        context: 'one-off · garnish',
        qty: '300',
        qtyUnit: 'g',
        suggested: 'cut back 20% — last 4 weeks binned £62',
        suggestedFlag: true,
        assignee: 'tom',
        assigneeName: 'Tom',
        status: 'not-started',
        notes: 'Try smaller batches twice — fresher service, less waste.',
      },
    ],
  },
  {
    name: 'Grill',
    chef: 'Maria Costa',
    progress: { done: 1, total: 4, rest: '1 in progress · 2 to start' },
    items: [
      {
        name: 'Lamb shawarma marinade',
        recipe: 'Recipe · Shawarma Marinade',
        context: 'finished 09:00 · resting',
        qty: '8',
        qtyUnit: 'kg',
        suggested: 'suggested 7.6kg',
        assignee: 'maria',
        assigneeName: 'Maria',
        status: 'done',
        notes: '2% brine this time — not 3%. Resting til 12:00.',
      },
      {
        name: 'Beef short rib',
        recipe: 'Recipe · Short Rib Braise',
        context: 'in oven · started 08:30',
        qty: '12',
        qtyUnit: 'portions',
        suggested: 'covers-driven',
        assignee: 'maria',
        assigneeName: 'Maria',
        status: 'in-progress',
      },
      {
        name: 'Chicken thigh skewers',
        recipe: 'Recipe · Chicken Skewers',
        qty: '24',
        qtyUnit: 'skewers',
        suggested: 'covers-driven · +18%',
        assignee: 'maria',
        assigneeName: 'Maria',
        status: 'not-started',
      },
      {
        name: 'Sea bream — scaled & gutted',
        context: 'arriving Fri delivery',
        qty: '8',
        qtyUnit: 'fish',
        suggested: 'prep on arrival Fri',
        assignee: 'unassigned',
        assigneeName: 'Unassigned',
        status: 'not-started',
      },
    ],
  },
  {
    name: 'Pass',
    chef: 'Sam Ahmed',
    progress: { done: 0, total: 2, rest: '1 in progress' },
    items: [
      {
        name: 'Şakşuka — aubergine base',
        recipe: 'Recipe · Şakşuka',
        context: 'started 09:00',
        qty: '3.5',
        qtyUnit: 'kg',
        suggested: 'covers-driven',
        assignee: 'sam',
        assigneeName: 'Sam',
        status: 'in-progress',
        notes: "Tom's labneh-under plating today — let it cool fully.",
      },
      {
        name: 'Mezze plating mise',
        context: 'one-off · prep for service',
        qty: '—',
        suggested: 'station setup',
        assignee: 'sam',
        assigneeName: 'Sam',
        status: 'not-started',
      },
    ],
  },
  {
    name: 'Pastry',
    chef: 'Unassigned today',
    progress: { done: 0, total: 1, rest: '1 unassigned', tone: 'attention' },
    items: [
      {
        name: 'Knafeh — kataifi assembly',
        recipe: 'Recipe · Knafeh',
        qty: '10',
        qtyUnit: 'portions',
        suggested: 'dessert orders flat this week',
        suggestedFlag: true,
        assignee: 'unassigned',
        assigneeName: 'Unassigned',
        status: 'not-started',
      },
    ],
  },
];

const days = [
  { label: 'Yesterday', date: 'Wed 13 May', active: false },
  { label: 'Today', date: 'Thu 14 May', active: true },
  { label: 'Tomorrow', date: 'Fri 15 May', active: false },
  { label: 'Saturday', date: 'Sat 16 May', active: false },
  { label: 'Sunday', date: 'Sun 17 May', active: false },
];

const statusStripe: Record<Status, string> = {
  done: 'before:bg-healthy before:opacity-50',
  'in-progress': 'before:bg-gold',
  'not-started': 'before:bg-muted-soft before:opacity-40',
};

const avatarBg: Record<Assignee, string> = {
  tom: 'bg-gradient-to-br from-[#5D4A6E] to-[#7E6A8E]',
  maria: 'bg-gradient-to-br from-[#5D7F4F] to-[#7E9F6F]',
  sam: 'bg-gradient-to-br from-[#B86A2E] to-[#D08A4E]',
  unassigned: 'bg-paper-warm text-muted-soft border border-dashed border-muted-soft',
};

const statusPillColor: Record<Status, string> = {
  done: 'text-healthy',
  'in-progress': 'text-gold',
  'not-started': 'text-muted',
};

const statusDotColor: Record<Status, string> = {
  done: 'bg-healthy',
  'in-progress': 'bg-gold',
  'not-started': 'bg-muted-soft',
};

export default function PrepPage() {
  return (
    <div className="px-14 pt-12 pb-20 max-w-[1400px]">
      <div className="flex justify-between items-start gap-8 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            What's Getting Made Today
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
            Today's <em className="text-gold font-semibold not-italic">prep</em>
          </h1>
          <p className="font-serif italic text-lg text-muted mt-3">
            Twelve items across four stations. Four done, three in progress, five to go.
          </p>
        </div>

        <div className="bg-card border border-rule px-5 py-4 min-w-[240px] flex items-center gap-3.5 cursor-pointer transition-all hover:border-rule-gold hover:-translate-y-px">
          <div className="w-10 h-10 border border-gold rounded-sm flex items-center justify-center text-gold bg-gold-bg flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
          <div>
            <div className="font-serif font-semibold text-base text-ink leading-tight">
              Add prep item
            </div>
            <div className="font-serif italic text-xs text-muted mt-0.5">
              recipe-linked or one-off
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 items-center mb-8 flex-wrap">
        <DayNav direction="prev" />
        {days.map((d) => (
          <DayTab key={d.label} {...d} />
        ))}
        <DayNav direction="next" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard label="Items Today" value="12" sub="across 4 stations" />
        <KpiCard label="Done" value="4" sub="33% complete" tone="healthy" />
        <KpiCard label="In Progress" value="3" sub="Tom · Maria · Sam" />
        <KpiCard label="To Start" value="5" sub="2 unassigned · service in 7 hrs" tone="attention" />
      </div>

      <div className="bg-card border border-rule px-7 py-5 mb-10 flex gap-8 items-center flex-wrap">
        <div>
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted">
            Tonight's covers
          </div>
          <div className="font-serif font-semibold text-xl text-ink mt-0.5">
            142 <em className="text-gold not-italic font-medium italic">booked</em>
          </div>
        </div>
        <div className="w-px self-stretch bg-rule" />
        <div>
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted">
            Forecast
          </div>
          <div className="font-serif font-semibold text-xl text-ink mt-0.5">
            156–168
          </div>
        </div>
        <div className="w-px self-stretch bg-rule" />
        <div className="font-serif italic text-sm text-ink-soft leading-snug flex-1 min-w-[260px]">
          <strong className="not-italic font-semibold text-ink">
            Tracking 18% above last Thursday.
          </strong>{' '}
          Hummus and shawarma scaled accordingly · pastry left at standard since dessert orders flat this week.
        </div>
      </div>

      {stations.map((s) => (
        <StationBlock key={s.name} station={s} />
      ))}

      <section className="mt-12">
        <div className="flex items-baseline justify-between mb-6 pb-3 border-b border-rule">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold">
            Looking Ahead
          </div>
          <div className="font-serif italic text-sm text-muted">
            two patterns shaping tomorrow's prep
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AheadCard
            sectionLabel="Friday Service"
            tag="Get Ready"
            headlinePre="Friday's booking"
            headlineEm="tracking high"
            body={
              <>
                <strong className="not-italic font-semibold text-ink">
                  168 covers booked, forecast 180–195 with walk-ins.
                </strong>{' '}
                Bream arrives 09:00 — worth scaling shawarma marinade up 15% and prepping a second batch of tahini. Sea bream prep currently unassigned.
              </>
            }
            actionLabel="Set Friday prep →"
            actionContext="Fri 15 May"
          />
          <AheadCard
            sectionLabel="Weekend Pattern"
            tag="Worth Knowing"
            headlinePre="Sunday over-prep"
            headlineEm="creeping back"
            body={
              <>
                <strong className="not-italic font-semibold text-ink">
                  Last four Sundays binned £38 on average — mostly Saturday over-prep that didn't carry.
                </strong>{' '}
                Worth scaling Saturday batches down 15% this week and seeing if Sunday improves.
              </>
            }
            actionLabel="Set Saturday prep →"
            actionContext="4-week pattern"
          />
        </div>
      </section>
    </div>
  );
}

function DayTab({
  label,
  date,
  active,
}: {
  label: string;
  date: string;
  active: boolean;
}) {
  return (
    <button
      className={
        'font-sans font-semibold text-xs tracking-[0.08em] uppercase px-4 py-2.5 border flex flex-col items-center gap-0.5 transition-colors ' +
        (active
          ? 'bg-ink border-ink text-paper'
          : 'bg-transparent border-rule text-ink-soft hover:border-gold hover:text-ink')
      }
    >
      <span>{label}</span>
      <span
        className={
          'font-serif font-medium text-xs tracking-normal normal-case ' +
          (active ? 'text-paper/70' : 'text-muted')
        }
      >
        {date}
      </span>
    </button>
  );
}

function DayNav({ direction }: { direction: 'prev' | 'next' }) {
  return (
    <button className="w-9 h-9 flex items-center justify-center bg-transparent border border-rule text-muted transition-colors hover:border-gold hover:text-gold">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {direction === 'prev' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
      </svg>
    </button>
  );
}

function KpiCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: 'healthy' | 'attention';
}) {
  return (
    <div className="bg-card px-7 py-6">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted mb-3">
        {label}
      </div>
      <div
        className={
          'font-serif font-medium text-2xl leading-none ' +
          (tone === 'healthy'
            ? 'text-healthy'
            : tone === 'attention'
              ? 'text-attention'
              : 'text-ink')
        }
      >
        {value}
      </div>
      <div className="font-serif italic text-sm text-muted mt-2">{sub}</div>
    </div>
  );
}

function StationBlock({ station }: { station: Station }) {
  const progressTone =
    station.progress.tone === 'healthy'
      ? 'text-healthy'
      : station.progress.tone === 'attention'
        ? 'text-attention'
        : 'text-ink';

  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between mb-0 px-6 py-3.5 bg-paper-warm border border-rule border-b-2 border-b-gold">
        <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold flex items-center gap-3">
          <span>{station.name}</span>
          <span className="text-muted text-xs">·</span>
          <span className="font-serif font-normal italic text-sm tracking-normal normal-case text-ink">
            {station.chef}
          </span>
        </div>
        <div className="font-serif italic text-sm text-muted">
          <strong className={'not-italic font-semibold ' + progressTone}>
            {station.progress.done} of {station.progress.total} done
          </strong>{' '}
          · {station.progress.rest}
        </div>
      </div>

      <div className="bg-card border border-rule border-t-0">
        <div className="hidden md:grid grid-cols-[minmax(220px,1.4fr)_130px_110px_140px_minmax(140px,1fr)_60px] gap-5 px-7 py-3.5 bg-paper-warm border-b border-rule">
          {['Item', 'Quantity', 'Assigned', 'Status', 'Notes', ''].map((h, i) => (
            <div
              key={i}
              className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
            >
              {h}
            </div>
          ))}
        </div>

        {station.items.map((item, i) => (
          <PrepRow
            key={item.name + i}
            item={item}
            last={i === station.items.length - 1}
          />
        ))}
      </div>
    </section>
  );
}

function PrepRow({ item, last }: { item: PrepItem; last: boolean }) {
  return (
    <div
      className={
        'relative grid grid-cols-1 md:grid-cols-[minmax(220px,1.4fr)_130px_110px_140px_minmax(140px,1fr)_60px] gap-5 px-7 py-4 items-center cursor-pointer transition-colors hover:bg-card-warm before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] ' +
        statusStripe[item.status] +
        (last ? '' : ' border-b border-rule-soft')
      }
    >
      <div>
        <div className="font-serif font-semibold text-base text-ink leading-snug tracking-[-0.005em]">
          {item.emphasis && (
            <em className="text-gold not-italic font-semibold italic">
              {item.emphasis}
            </em>
          )}
          {item.emphasis && ' '}
          {item.name}
        </div>
        <div className="text-xs text-muted mt-1 flex items-center gap-2 tracking-[0.02em]">
          {item.recipe && (
            <span className="text-gold">
              <span className="mr-0.5">↗</span>
              {item.recipe}
            </span>
          )}
          {item.recipe && item.context && <span>·</span>}
          {item.context && <span>{item.context}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        <div className="font-serif font-semibold text-lg text-ink tracking-[-0.005em]">
          {item.qty}
          {item.qtyUnit && (
            <>
              {' '}
              <em className="text-gold not-italic font-medium italic">
                {item.qtyUnit}
              </em>
            </>
          )}
        </div>
        <div
          className={
            'font-serif italic text-xs ' +
            (item.suggestedFlag ? 'text-attention' : 'text-muted')
          }
        >
          {item.suggested}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div
          className={
            'w-7 h-7 rounded-full flex items-center justify-center font-display font-semibold text-xs tracking-[0.05em] text-paper flex-shrink-0 ' +
            avatarBg[item.assignee]
          }
        >
          {item.assignee === 'unassigned' ? '?' : initials(item.assigneeName)}
        </div>
        <div
          className={
            'font-serif text-sm ' +
            (item.assignee === 'unassigned'
              ? 'text-muted-soft italic'
              : 'text-ink')
          }
        >
          {item.assigneeName}
        </div>
      </div>

      <div
        className={
          'inline-flex items-center gap-1.5 font-sans font-semibold text-xs tracking-[0.08em] uppercase ' +
          statusPillColor[item.status]
        }
      >
        <span
          className={'w-1.5 h-1.5 rounded-full ' + statusDotColor[item.status]}
        />
        {item.status === 'in-progress'
          ? 'In Progress'
          : item.status === 'not-started'
            ? 'Not Started'
            : 'Done'}
      </div>

      <div
        className={
          'font-serif italic text-xs leading-snug ' +
          (item.notes ? 'text-ink-soft' : 'text-muted-soft')
        }
      >
        {item.notes ?? 'Add note'}
      </div>

      <div className="text-muted-soft justify-self-end">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function AheadCard({
  sectionLabel,
  tag,
  headlinePre,
  headlineEm,
  body,
  actionLabel,
  actionContext,
}: {
  sectionLabel: string;
  tag: string;
  headlinePre: string;
  headlineEm: string;
  body: React.ReactNode;
  actionLabel: string;
  actionContext: string;
}) {
  return (
    <div className="bg-card border border-rule px-7 py-7">
      <div className="flex items-baseline justify-between mb-4">
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold">
          {sectionLabel}
        </div>
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted px-2 py-1 border border-rule">
          {tag}
        </div>
      </div>
      <div className="font-serif text-xl text-ink mb-3">
        {headlinePre}{' '}
        <em className="text-gold not-italic font-medium italic">{headlineEm}</em>.
      </div>
      <div className="font-serif italic text-sm text-muted leading-relaxed mb-4">
        {body}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-rule">
        <a className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold cursor-pointer">
          {actionLabel}
        </a>
        <div className="font-serif italic text-xs text-muted">
          {actionContext}
        </div>
      </div>
    </div>
  );
}
