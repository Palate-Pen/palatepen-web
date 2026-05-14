export const metadata = { title: 'Notebook — Palatable' };

type EntryType = 'voice' | 'photo' | 'sketch' | 'note';
type SeasonRibbon = { tone: 'peak' | 'ending' | 'arriving'; text: string };

type Tag = { kind: 'dish' | 'detected' | 'plain'; text: string };

type Entry = {
  type: EntryType;
  date: string;
  title: string;
  body: React.ReactNode;
  tags: Tag[];
  voiceDuration?: string;
  voiceBars?: number[];
  photoTint?: string;
  sketchSubject?: string;
  season?: SeasonRibbon;
  shared?: boolean;
  italic?: boolean;
};

const seasonCards = [
  {
    label: 'Sumac · arriving Mon 19 May',
    tag: 'Worth Revisiting',
    headlinePre: '',
    headlineEm: 'Sumac',
    headlinePost: ' arrives next week.',
    body: (
      <>
        <strong className="not-italic font-semibold text-ink">
          The system spotted sumac in three of your notebook entries.
        </strong>{' '}
        Most notably the saffron-cured trout pairing map from February — you tagged that one "worth revisiting." UK sumac runs mid-May through late June. Good window for picking the thread up.
      </>
    ),
    related: [
      'Saffron-cured trout · Feb 14',
      'Spice rub experiments · Aug 23',
      'Voice memo · Sep 4',
    ],
    actionLabel: 'See in Seasonal calendar →',
    actionContext: '3 entries detected',
    tone: 'arriving' as const,
  },
  {
    label: 'Asparagus · ending soon',
    tag: 'Last Three Weeks',
    headlinePre: 'British ',
    headlineEm: 'asparagus',
    headlinePost: ' closing on you.',
    body: (
      <>
        <strong className="not-italic font-semibold text-ink">
          Season ends around 21 June.
        </strong>{' '}
        Two recent entries about asparagus — Tom's plating from yesterday and your chargrilled spears note from April. If you want to run an asparagus dish before the window shuts, three weeks left.
      </>
    ),
    related: [
      "Tom's plating · Yesterday",
      'Chargrilled spears · 19 April',
    ],
    actionLabel: 'See in Seasonal calendar →',
    actionContext: '2 entries detected',
    tone: 'ending' as const,
  },
];

const filters = [
  { label: 'All', active: true },
  { label: 'Voice' },
  { label: 'Photos' },
  { label: 'Sketches' },
  { label: 'Notes' },
  { label: 'By dish', divider: true },
  { label: 'By ingredient' },
  { label: 'Coming into season' },
  { label: 'Shared with brigade' },
];

const entries: Entry[] = [
  {
    type: 'voice',
    date: 'Today 09:14',
    title: 'Lamb shawarma — brine adjustment',
    italic: true,
    body: (
      <em>
        3% brine on the shoulder was too aggressive — way too salty by Tuesday service. Try 2% Sunday and revisit Thursday. Possibly add a touch more lemon to the marinade to compensate.
      </em>
    ),
    voiceDuration: '0:47',
    voiceBars: [6, 14, 22, 18, 28, 24, 32, 20, 26, 30, 22, 16, 24, 28, 20, 14, 18, 10, 24, 16, 26, 22, 14, 18, 8],
    tags: [
      { kind: 'dish', text: 'lamb shawarma' },
      { kind: 'detected', text: 'lamb shoulder' },
      { kind: 'detected', text: 'lemon' },
      { kind: 'plain', text: 'brine' },
    ],
    shared: true,
  },
  {
    type: 'photo',
    date: 'Yesterday 22:18',
    title: "New aubergine plating — Tom's idea",
    body:
      "Tom plated the şakşuka with the labneh swooshed underneath instead of on top — looks proper, hides the slight overcook on the aubergines. Let's try this on the pass tomorrow.",
    photoTint: 'bg-gradient-to-br from-[#5D4A6E] via-[#7E6A8E] to-[#3D362C]',
    tags: [
      { kind: 'dish', text: 'aubergine şakşuka' },
      { kind: 'detected', text: 'aubergine' },
      { kind: 'detected', text: 'labneh' },
      { kind: 'plain', text: 'plating' },
    ],
  },
  {
    type: 'sketch',
    date: 'Sun 11 May',
    title: 'Whole bream with sumac & charred lemon',
    body:
      'For summer menu. Could pair with pomegranate molasses dressing — sweet/tart to cut the sumac.',
    sketchSubject: 'whole bream\n+ sumac dust\ncrispy skin · charred lemon',
    season: { tone: 'peak', text: 'Coming into peak · Sea Bream' },
    tags: [
      { kind: 'dish', text: 'whole bream' },
      { kind: 'detected', text: 'sea bream' },
      { kind: 'detected', text: 'sumac' },
      { kind: 'detected', text: 'lemon' },
      { kind: 'detected', text: 'pomegranate molasses' },
      { kind: 'plain', text: 'summer menu' },
    ],
  },
  {
    type: 'note',
    date: 'Mon 12 May',
    title: 'Thoughts on the new sous',
    italic: true,
    body:
      "Maria's three weeks in and her grill timing's coming along. Lamb cutlets last night were textbook. Still a bit slow on plating during a rush — could partner her with Tom on Fri service to learn the rhythm. Also notes: she wants to lead on the new summer menu — let her present three dish ideas next week.",
    tags: [
      { kind: 'detected', text: 'lamb cutlets' },
      { kind: 'plain', text: 'team' },
      { kind: 'plain', text: 'private' },
    ],
  },
  {
    type: 'voice',
    date: 'Tue 13 May',
    title: 'Hummus thinning — try labneh',
    italic: true,
    body: (
      <em>
        Add a spoon of labneh to thin the hummus instead of more tahini. Cuts the cost and the flavour's actually rounder.
      </em>
    ),
    voiceDuration: '0:23',
    voiceBars: [10, 18, 14, 22, 20, 26, 16, 12, 18, 14, 8, 20, 22, 16, 10],
    tags: [
      { kind: 'dish', text: 'hummus' },
      { kind: 'detected', text: 'labneh' },
      { kind: 'detected', text: 'tahini' },
      { kind: 'plain', text: 'cost-saving' },
    ],
  },
  {
    type: 'photo',
    date: '19 April',
    title: 'Chargrilled asparagus — labneh & lemon zest',
    body:
      'Tested this on staff Friday. Char on the spears was good but needs more lemon zest at the table. Try with the brown butter idea from the Notebook last spring.',
    photoTint: 'bg-gradient-to-br from-[#5D7F4F] via-[#7E9F6F] to-[#3D5A2F]',
    season: { tone: 'ending', text: 'Ending soon · Asparagus' },
    tags: [
      { kind: 'dish', text: 'asparagus side' },
      { kind: 'detected', text: 'asparagus' },
      { kind: 'detected', text: 'labneh' },
      { kind: 'detected', text: 'lemon' },
      { kind: 'detected', text: 'brown butter' },
      { kind: 'plain', text: 'spring menu' },
    ],
  },
  {
    type: 'sketch',
    date: 'Feb 14 — three months ago',
    title: 'Saffron-cured trout — pairing map',
    body:
      "Worked through flavour pairings on prep day. Sumac and labneh were the strongest. Worth revisiting now that sumac's coming into season.",
    sketchSubject: 'trout\nsaffron-cured\nsumac · dill · labneh · fennel',
    season: { tone: 'arriving', text: 'Coming next week · Sumac' },
    tags: [
      { kind: 'dish', text: 'saffron-cured trout' },
      { kind: 'detected', text: 'trout' },
      { kind: 'detected', text: 'saffron' },
      { kind: 'detected', text: 'sumac' },
      { kind: 'detected', text: 'labneh' },
      { kind: 'detected', text: 'dill' },
      { kind: 'detected', text: 'fennel' },
      { kind: 'plain', text: 'development' },
    ],
  },
  {
    type: 'note',
    date: 'Wed 7 May',
    title: 'Stone fruit list for July',
    italic: true,
    body:
      'White peach · yellow peach · apricot · cherries (English if Henstings has them) · greengage when they arrive. Aim to have a stone fruit dessert ready by end June.',
    season: { tone: 'arriving', text: 'Arriving in June · Stone Fruit' },
    tags: [
      { kind: 'detected', text: 'peach' },
      { kind: 'detected', text: 'apricot' },
      { kind: 'detected', text: 'cherries' },
      { kind: 'detected', text: 'greengage' },
      { kind: 'plain', text: 'summer menu' },
      { kind: 'plain', text: 'planning' },
    ],
  },
];

const ribbonClass: Record<NonNullable<Entry['season']>['tone'], string> = {
  peak: 'bg-gold text-paper',
  ending: 'bg-attention text-paper',
  arriving: 'bg-gold text-paper',
};

const tagClass: Record<Tag['kind'], string> = {
  dish: 'bg-gold-bg text-gold border-gold/30',
  detected:
    "bg-paper-warm text-ink-soft border-rule before:content-['•'] before:text-gold before:mr-1 before:font-bold",
  plain: 'bg-paper-warm text-ink-soft border-rule',
};

export default function NotebookPage() {
  return (
    <div className="px-14 pt-12 pb-20 max-w-[1400px]">
      <div className="flex justify-between items-start gap-8 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            Where The Thinking Lives
          </div>
          <h1 className="font-serif text-4xl text-ink leading-[1.05] tracking-[-0.015em]">
            Your{' '}
            <em className="text-gold not-italic font-medium italic">Notebook</em>
          </h1>
          <p className="font-serif italic text-lg text-muted mt-3">
            Forty-seven entries this year. Three with seasonal ingredients on the move.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <CaptureButton primary label="Voice">
            <rect x="9" y="3" width="6" height="13" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0" />
            <path d="M12 18v3M9 21h6" />
          </CaptureButton>
          <CaptureButton label="Photo">
            <path d="M4 7h3l1.5-2h7L17 7h3v12H4V7z" />
            <circle cx="12" cy="13" r="3.5" />
          </CaptureButton>
          <CaptureButton label="Sketch">
            <path d="M3 17l5-5 4 4 6-6 3 3" />
            <path d="M14 8h7v7" />
            <path d="M3 21h18" />
          </CaptureButton>
          <CaptureButton label="Note">
            <path d="M14 3H6v18h12V7l-4-4z" />
            <path d="M14 3v4h4" />
            <path d="M9 11h6M9 14h6M9 17h4" />
          </CaptureButton>
        </div>
      </div>

      <section className="mt-2 mb-10">
        <div className="flex items-baseline justify-between mb-6 pb-3 border-b border-rule">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold">
            Coming Into Season
          </div>
          <div className="font-serif italic text-sm text-muted">
            three from your notebook · timed to the calendar
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {seasonCards.map((c) => (
            <SeasonCard key={c.label} card={c} />
          ))}
        </div>
      </section>

      <div className="flex gap-2 flex-wrap items-center mb-8 pb-4 border-b border-rule">
        {filters.map((f) => (
          <span key={f.label} className="flex items-center gap-2">
            {f.divider && <span className="text-muted-soft">·</span>}
            <button
              className={
                'font-sans font-semibold text-xs tracking-[0.08em] uppercase px-3 py-2 border ' +
                (f.active
                  ? 'bg-ink border-ink text-paper'
                  : 'bg-transparent border-rule text-ink-soft hover:border-gold hover:text-ink')
              }
            >
              {f.label}
            </button>
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {entries.map((e, i) => (
          <EntryCard key={i} entry={e} />
        ))}
      </div>
    </div>
  );
}

function CaptureButton({
  primary,
  label,
  children,
}: {
  primary?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      className={
        'flex flex-col items-center gap-1.5 px-4 py-3 border transition-colors ' +
        (primary
          ? 'bg-gold border-gold text-paper hover:bg-gold-dark'
          : 'bg-card border-rule text-ink-soft hover:border-gold hover:text-gold')
      }
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
      <span className="font-sans font-semibold text-xs tracking-[0.08em] uppercase">
        {label}
      </span>
    </button>
  );
}

function SeasonCard({ card }: { card: typeof seasonCards[number] }) {
  const stripe = card.tone === 'ending' ? 'border-l-attention' : 'border-l-gold';
  return (
    <div className={'bg-card border border-rule border-l-4 px-7 py-7 ' + stripe}>
      <div className="flex items-baseline justify-between mb-4">
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold">
          {card.label}
        </div>
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted px-2 py-1 border border-rule">
          {card.tag}
        </div>
      </div>
      <div className="font-serif text-xl text-ink mb-3 leading-snug">
        {card.headlinePre}
        <em className="text-gold not-italic font-medium italic">
          {card.headlineEm}
        </em>
        {card.headlinePost}
      </div>
      <div className="font-serif italic text-sm text-muted leading-relaxed mb-4">
        {card.body}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {card.related.map((r) => (
          <span
            key={r}
            className="font-serif italic text-xs text-ink-soft px-2.5 py-1 bg-paper-warm border border-rule"
          >
            {r}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-rule">
        <a className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold cursor-pointer">
          {card.actionLabel}
        </a>
        <div className="font-serif italic text-xs text-muted">
          {card.actionContext}
        </div>
      </div>
    </div>
  );
}

function EntryCard({ entry }: { entry: Entry }) {
  const typeLabel: Record<EntryType, string> = {
    voice: 'Voice memo',
    photo: 'Photo',
    sketch: 'Sketch',
    note: 'Note',
  };

  return (
    <div className="bg-card border border-rule p-5 relative flex flex-col cursor-pointer transition-all hover:border-gold hover:shadow-[0_4px_16px_rgba(26,22,18,0.06)]">
      {entry.season && (
        <span
          className={
            'absolute top-3 right-3 font-sans font-semibold text-xs tracking-[0.08em] uppercase px-2 py-1 ' +
            ribbonClass[entry.season.tone]
          }
        >
          {entry.season.text}
        </span>
      )}

      {entry.type === 'voice' && entry.voiceBars && (
        <div className="bg-paper-warm border border-rule px-4 py-4 mb-4">
          <div className="flex items-end gap-0.5 h-9">
            {entry.voiceBars.map((h, i) => (
              <div
                key={i}
                className="w-1 bg-gold-dark"
                style={{ height: h }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <span className="text-muted">Press to play</span>
            <span className="text-ink-soft font-mono">{entry.voiceDuration}</span>
          </div>
        </div>
      )}

      {entry.type === 'photo' && (
        <div
          className={
            'h-40 mb-4 rounded-sm ' + (entry.photoTint ?? 'bg-paper-warm')
          }
        />
      )}

      {entry.type === 'sketch' && entry.sketchSubject && (
        <div className="h-40 mb-4 bg-paper-warm border border-rule flex items-center justify-center text-center px-4">
          <div className="font-serif italic text-sm text-ink-soft whitespace-pre-line leading-relaxed">
            {entry.sketchSubject}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted">
          {typeLabel[entry.type]}
        </div>
        <div className="font-serif italic text-xs text-muted">{entry.date}</div>
      </div>

      <div className="font-serif font-semibold text-lg text-ink mb-2 leading-snug">
        {entry.title}
      </div>

      <div
        className={
          'font-serif text-sm text-ink-soft leading-relaxed mb-4 flex-1 ' +
          (entry.italic ? 'italic' : '')
        }
      >
        {entry.body}
      </div>

      <div className="flex flex-wrap gap-1.5 items-center pt-3 border-t border-rule">
        {entry.tags.map((t, i) => (
          <span
            key={i}
            className={
              'inline-flex items-center font-sans font-semibold text-xs tracking-[0.08em] uppercase px-2 py-1 border ' +
              tagClass[t.kind]
            }
          >
            {t.text}
          </span>
        ))}
        {entry.shared && (
          <span className="inline-flex items-center gap-1 font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted ml-auto">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="6" cy="12" r="2" />
              <circle cx="18" cy="6" r="2" />
              <circle cx="18" cy="18" r="2" />
              <path d="M8 12l8-5M8 12l8 5" />
            </svg>
            shared
          </span>
        )}
      </div>
    </div>
  );
}
