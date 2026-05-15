import { getShellContext } from '@/lib/shell/context';
import { getNotebookData } from '@/lib/notebook';
import { getUserPreferences } from '@/lib/preferences';
import { getRecipes } from '@/lib/recipes';
import { FOOD_DISH_TYPES } from '@/lib/bar';
import { KpiCard } from '@/components/shell/KpiCard';
import { LookingAhead } from '@/components/shell/LookingAhead';
import { AddNoteDialog, type RecipeOption } from './AddNoteDialog';
import { CaptureSoonButton } from './CaptureSoonButton';
import { NotebookFilters } from './NotebookFilters';

export const metadata = { title: 'Notebook — Palatable' };

// Curated seasonal threads — surfaced at the top of the page. Until the
// async season-detector job lands, these stay as hand-tended highlights
// computed from the notebook content + the seasonal calendar. The grid
// below renders the full live notebook entry feed.
type SeasonRibbonTone = 'peak' | 'ending' | 'arriving';

const seasonCards: Array<{
  label: string;
  tag: string;
  headlinePre: string;
  headlineEm: string;
  headlinePost: string;
  body: React.ReactNode;
  related: string[];
  actionLabel: string;
  actionContext: string;
  tone: SeasonRibbonTone;
}> = [
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
      'Whole bream sketch · Sun 11 May',
      'Spice rub experiments',
    ],
    actionLabel: 'See in Seasonal calendar →',
    actionContext: '3 entries detected',
    tone: 'arriving',
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
      "Chargrilled spears · 19 April",
      'Voice memo · plating ideas',
    ],
    actionLabel: 'See in Seasonal calendar →',
    actionContext: '2 entries detected',
    tone: 'ending',
  },
];

export default async function NotebookPage() {
  const ctx = await getShellContext();
  const [data, prefs, recipes] = await Promise.all([
    getNotebookData(ctx.siteId),
    getUserPreferences(ctx.userId),
    getRecipes(ctx.siteId, { dishTypes: FOOD_DISH_TYPES }),
  ]);
  const recipeOptions: RecipeOption[] = recipes.map((r) => ({
    id: r.id,
    name: r.name,
    dish_type: r.dish_type,
  }));

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-start gap-8 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            Where The Thinking Lives
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
            Your{' '}
            <em className="text-gold font-semibold not-italic">Notebook</em>
          </h1>
          <p className="font-serif italic text-lg text-muted mt-3">
            {data.entries.length === 0
              ? 'Nothing in the notebook yet. Capture the first thought below.'
              : `${data.total_this_year} ${data.total_this_year === 1 ? 'entry' : 'entries'} this year. ${seasonCards.length} seasonal threads on the move.`}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <CaptureSoonButton label="Voice" primary>
            <rect x="9" y="3" width="6" height="13" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0" />
            <path d="M12 18v3M9 21h6" />
          </CaptureSoonButton>
          <CaptureSoonButton label="Photo">
            <path d="M4 7h3l1.5-2h7L17 7h3v12H4V7z" />
            <circle cx="12" cy="13" r="3.5" />
          </CaptureSoonButton>
          <CaptureSoonButton label="Sketch">
            <path d="M3 17l5-5 4 4 6-6 3 3" />
            <path d="M14 8h7v7" />
            <path d="M3 21h18" />
          </CaptureSoonButton>
          <AddNoteDialog
            defaultShared={prefs.team_view_notebook}
            recipeOptions={recipeOptions}
            siteId={ctx.siteId}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Entries This Year"
          value={String(data.total_this_year)}
          sub="logged thoughts, ideas, voices"
        />
        <KpiCard
          label="Voice Memos"
          value={String(data.voice_count)}
          sub="quick captures in service"
        />
        <KpiCard
          label="Photos & Sketches"
          value={String(data.photo_count + data.sketch_count)}
          sub={`${data.photo_count} photo · ${data.sketch_count} sketch`}
        />
        <KpiCard
          label="Seasonal Threads"
          value={String(data.seasonal_count + seasonCards.length)}
          sub="ingredients on the move"
          tone={seasonCards.length > 0 ? 'attention' : undefined}
        />
      </div>

      <section className="mt-2 mb-10">
        <div className="flex items-baseline justify-between mb-6 pb-3 border-b border-rule">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold">
            Coming Into Season
          </div>
          <div className="font-serif italic text-sm text-muted">
            {seasonCards.length} {seasonCards.length === 1 ? 'thread' : 'threads'} from your notebook · timed to the calendar
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {seasonCards.map((c) => (
            <SeasonCard key={c.label} card={c} />
          ))}
        </div>
      </section>

      <NotebookFilters entries={data.entries} />

      <LookingAhead siteId={ctx.siteId} surface="notebook" />
    </div>
  );
}

function SeasonCard({ card }: { card: typeof seasonCards[number] }) {
  const stripe =
    card.tone === 'ending' ? 'border-l-attention' : 'border-l-gold';
  return (
    <div
      className={'bg-card border border-rule border-l-4 px-7 py-7 ' + stripe}
    >
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
        <button
          type="button"
          className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold hover:text-gold-dark transition-colors bg-transparent border-0 p-0 cursor-pointer"
        >
          {card.actionLabel}
        </button>
        <div className="font-serif italic text-xs text-muted">
          {card.actionContext}
        </div>
      </div>
    </div>
  );
}
