import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import {
  getPrepBoard,
  getSavedPrepItems,
  type PrepItem,
  type PrepStation,
  type PrepStatus,
} from '@/lib/prep';
import { getRecipes } from '@/lib/recipes';
import { FOOD_DISH_TYPES } from '@/lib/bar';
import { LookingAhead } from '@/components/shell/LookingAhead';
import { KpiCard } from '@/components/shell/KpiCard';
import { PrepStatusButton } from './PrepStatusButton';
import { PrepNotesField } from './PrepNotesField';
import { AddPrepItemDialog } from './AddPrepItemDialog';
import { PrintButton } from '@/components/shell/PrintButton';
import { PrepPrint } from '@/components/prep/PrepPrint';

export const metadata = { title: 'Prep — Palatable' };

const statusStripe: Record<PrepStatus, string> = {
  done: 'before:bg-healthy before:opacity-50',
  in_progress: 'before:bg-gold',
  not_started: 'before:bg-muted-soft before:opacity-40',
  over_prepped: 'before:bg-attention',
  short: 'before:bg-urgent',
};

// Avatar gradients keyed by lowercased assigned_label. Anything else falls
// back to the dashed-outline "unassigned" style.
const avatarGradient: Record<string, string> = {
  tom: 'bg-gradient-to-br from-[#5D4A6E] to-[#7E6A8E]',
  maria: 'bg-gradient-to-br from-[#5D7F4F] to-[#7E9F6F]',
  sam: 'bg-gradient-to-br from-[#B86A2E] to-[#D08A4E]',
};

const dayShort = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

const qtyFmt = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 3 });
const timeFmt = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

// Local-date helpers (Europe/London) — anchor the calendar to the user's
// wall clock, not UTC. See src/lib/dates.ts for the why.
import { isoDateLocal, todayIso, addDaysIso, diffDaysIso } from '@/lib/dates';

function parseDateParam(raw: string | undefined): string {
  if (!raw) return todayIso();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return todayIso();
  return raw;
}

/**
 * Build the five-day strip around the *selected* day, with the
 * relative-day label ("Yesterday", "Today", "Tomorrow") computed
 * against actual today, not the selected day. So when the chef pages
 * back to Monday, "Today" still highlights the real today and the
 * selected day gets its own ring.
 */
function rollingDays(
  selectedIso: string,
  realTodayIso: string,
): {
  label: string;
  date: Date;
  iso: string;
  selected: boolean;
  isToday: boolean;
}[] {
  const out: {
    label: string;
    date: Date;
    iso: string;
    selected: boolean;
    isToday: boolean;
  }[] = [];
  // 2 days before, selected, 2 days after — five-day window
  for (let offset = -2; offset <= 2; offset++) {
    const iso = addDaysIso(selectedIso, offset);
    const dayDiffFromToday = diffDaysIso(iso, realTodayIso);
    let label: string;
    if (dayDiffFromToday === 0) label = 'Today';
    else if (dayDiffFromToday === -1) label = 'Yesterday';
    else if (dayDiffFromToday === 1) label = 'Tomorrow';
    else {
      // Use UTC midnight purely to derive the weekday name — both sides
      // are anchored to the same calendar day so the weekday is correct
      // regardless of viewer timezone.
      label = new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
        weekday: 'long',
      });
    }
    out.push({
      label,
      date: new Date(`${iso}T12:00:00Z`),
      iso,
      selected: iso === selectedIso,
      isToday: iso === realTodayIso,
    });
  }
  return out;
}

function pctDone(board: { total_items: number; done: number }): string {
  if (board.total_items === 0) return '—';
  return `${Math.round((board.done / board.total_items) * 100)}% complete`;
}

export default async function PrepPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string }>;
}) {
  const ctx = await getShellContext();
  const sp = searchParams ? await searchParams : {};
  const realTodayIso = todayIso();
  const selectedIso = parseDateParam(sp?.date);

  const [board, recipes, savedItems] = await Promise.all([
    getPrepBoard(ctx.siteId, selectedIso),
    getRecipes(ctx.siteId, { dishTypes: FOOD_DISH_TYPES }),
    getSavedPrepItems(ctx.siteId, selectedIso, 30),
  ]);

  const days = rollingDays(selectedIso, realTodayIso);
  const stationCount = board.stations.length;
  const recipeOptions = recipes.map((r) => ({ id: r.id, name: r.name }));
  const knownStations = board.stations.map((s) => s.name);

  const prevIso = addDaysIso(selectedIso, -1);
  const nextIso = addDaysIso(selectedIso, 1);
  // For headers / "Prep on Tue 14 May" formatting — anchor to noon UTC
  // so the day label is correct regardless of viewer timezone.
  const selectedDate = new Date(`${selectedIso}T12:00:00Z`);
  const isFuture = selectedIso > realTodayIso;
  const isPast = selectedIso < realTodayIso;

  const inProgressChefs = Array.from(
    new Set(
      board.stations
        .flatMap((s) => s.items)
        .filter((i) => i.status === 'in_progress' && i.assigned_label)
        .map((i) => i.assigned_label as string),
    ),
  );

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="print-hide">
      <div className="flex justify-between items-start gap-8 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            What's Getting Made Today
          </div>
          <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] text-ink">
            {isPast ? (
              <>
                Prep on{' '}
                <em className="text-gold font-semibold not-italic">
                  {dayShort.format(selectedDate)}
                </em>
              </>
            ) : isFuture ? (
              <>
                Prep for{' '}
                <em className="text-gold font-semibold not-italic">
                  {dayShort.format(selectedDate)}
                </em>
              </>
            ) : (
              <>
                Today's <em className="text-gold font-semibold not-italic">prep</em>
              </>
            )}
          </h1>
          <p className="font-serif italic text-lg text-muted mt-3">
            {board.total_items === 0 ? (
              isPast ? (
                <>Nothing on the board that day. The chef may have skipped logging.</>
              ) : isFuture ? (
                <>Board's empty for this day — get ahead by adding items now.</>
              ) : (
                <>No prep set for today. Add the first item or let yesterday's board carry over.</>
              )
            ) : (
              <>
                {numberWord(board.total_items)} items across{' '}
                {numberWord(stationCount)} {stationCount === 1 ? 'station' : 'stations'}.{' '}
                {board.done} done, {board.in_progress} in progress, {board.not_started} to go.
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {board.total_items > 0 && <PrintButton label="Print prep sheet" />}
          <AddPrepItemDialog
            prepDate={selectedIso}
            recipes={recipeOptions}
            knownStations={knownStations}
            savedItems={savedItems.map((s) => ({
              name: s.name,
              station: s.station,
              recipe_id: s.recipe_id,
              qty: s.qty,
              qty_unit: s.qty_unit,
              last_prepped_on: s.last_prepped_on,
            }))}
          />
        </div>
      </div>

      <div className="flex gap-2 items-center mb-8 flex-wrap">
        <DayNav href={`/prep?date=${prevIso}`} direction="prev" />
        {days.map((d) => (
          <DayTab key={d.iso} {...d} />
        ))}
        <DayNav href={`/prep?date=${nextIso}`} direction="next" />
        {selectedIso !== realTodayIso && (
          <Link
            href="/prep"
            className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-gold hover:text-gold-dark transition-colors ml-2"
          >
            ← Jump to today
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Items Today"
          value={String(board.total_items)}
          sub={`across ${stationCount} ${stationCount === 1 ? 'station' : 'stations'}`}
        />
        <KpiCard
          label="Done"
          value={String(board.done)}
          sub={pctDone(board)}
          tone={board.done > 0 ? 'healthy' : undefined}
        />
        <KpiCard
          label="In Progress"
          value={String(board.in_progress)}
          sub={
            inProgressChefs.length > 0
              ? inProgressChefs.join(' · ')
              : 'nobody mid-task'
          }
        />
        <KpiCard
          label="To Start"
          value={String(board.not_started)}
          sub={
            board.unassigned > 0
              ? `${board.unassigned} unassigned`
              : 'all assigned'
          }
          tone={board.not_started > 0 ? 'attention' : undefined}
        />
      </div>

      {/* Covers strip — hardcoded until v2.covers schema lands */}
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
            Covers source pending.
          </strong>{' '}
          The v2 covers schema isn't wired yet — this strip will fill in once the booking integration lands.
        </div>
      </div>

      {board.stations.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-16 text-center">
          <div className="font-serif text-2xl text-ink mb-2">
            Prep board's empty.
          </div>
          <p className="font-serif italic text-muted">
            Add an item to today's board — the system tracks status, suggests quantities, and learns the rhythm from there.
          </p>
        </div>
      ) : (
        board.stations.map((s) => <StationBlock key={s.name} station={s} />)
      )}

      <LookingAhead siteId={ctx.siteId} surface="prep" />
      </div>

      <PrepPrint
        board={board}
        kitchenName={ctx.kitchenName}
        surfaceLabel="Prep board"
      />
    </div>
  );
}

function numberWord(n: number): string {
  const words = [
    'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
    'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
    'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty',
  ];
  return n <= 20 ? words[n] : String(n);
}

function DayTab({
  label,
  date,
  iso,
  selected,
  isToday,
}: {
  label: string;
  date: Date;
  iso: string;
  selected: boolean;
  isToday: boolean;
}) {
  const base =
    'font-sans font-semibold text-xs tracking-[0.08em] uppercase px-4 py-2.5 border flex flex-col items-center gap-0.5 transition-colors';
  const cls = selected
    ? 'bg-ink border-ink text-paper'
    : isToday
      ? 'bg-transparent border-gold text-gold hover:bg-gold/5'
      : 'bg-transparent border-rule text-ink-soft hover:border-gold hover:text-ink';
  return (
    <Link href={`/prep?date=${iso}`} className={`${base} ${cls}`}>
      <span>{label}</span>
      <span
        className={
          'font-serif font-medium text-xs tracking-normal normal-case ' +
          (selected ? 'text-paper/70' : 'text-muted')
        }
      >
        {dayShort.format(date)}
      </span>
    </Link>
  );
}

function DayNav({
  href,
  direction,
}: {
  href: string;
  direction: 'prev' | 'next';
}) {
  return (
    <Link
      href={href}
      className="w-9 h-9 flex items-center justify-center bg-transparent border border-rule text-muted transition-colors hover:border-gold hover:text-gold"
      aria-label={direction === 'prev' ? 'Previous day' : 'Next day'}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {direction === 'prev' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
      </svg>
    </Link>
  );
}


function StationBlock({ station }: { station: PrepStation }) {
  const allDone = station.in_progress === 0 && station.not_started === 0 && station.done > 0;
  const progressTone = allDone
    ? 'text-healthy'
    : station.not_started > 0 && station.done === 0
      ? 'text-attention'
      : 'text-ink';
  const rest = [
    station.in_progress > 0 ? `${station.in_progress} in progress` : null,
    station.not_started > 0 ? `${station.not_started} to start` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const total = station.items.length;

  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between mb-0 px-6 py-3.5 bg-paper-warm border border-rule border-b-2 border-b-gold flex-wrap gap-3">
        <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold flex items-center gap-3">
          <span>{station.name}</span>
          {station.primary_chef && (
            <>
              <span className="text-muted text-xs">·</span>
              <span className="font-serif font-normal italic text-sm tracking-normal normal-case text-ink">
                {station.primary_chef}
              </span>
            </>
          )}
        </div>
        <div className="font-serif italic text-sm text-muted">
          <strong className={'not-italic font-semibold ' + progressTone}>
            {station.done} of {total} done
          </strong>
          {rest && <> · {rest}</>}
        </div>
      </div>

      <div className="bg-card border border-rule border-t-0">
        <div className="hidden md:grid grid-cols-[minmax(220px,1.4fr)_130px_110px_140px_minmax(140px,1fr)_60px] gap-5 px-7 py-3.5 bg-paper-warm border-b border-rule">
          {['Item', 'Quantity', 'Assigned', 'Status', 'Notes', ''].map(
            (h, i) => (
              <div
                key={i}
                className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
              >
                {h}
              </div>
            ),
          )}
        </div>

        {station.items.map((item, i) => (
          <PrepRow key={item.id} item={item} last={i === station.items.length - 1} />
        ))}
      </div>
    </section>
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

function PrepRow({ item, last }: { item: PrepItem; last: boolean }) {
  const assignedClass = item.assigned_label
    ? avatarGradient[item.assigned_label.toLowerCase()] ??
      'bg-gradient-to-br from-gold-dark to-gold-light'
    : 'bg-paper-warm text-muted-soft border border-dashed border-muted-soft';

  const contextParts: string[] = [];
  if (item.finished_at) {
    contextParts.push(`finished ${timeFmt.format(new Date(item.finished_at))}`);
  } else if (item.started_at) {
    contextParts.push(`started ${timeFmt.format(new Date(item.started_at))}`);
  }
  if (item.one_off && !item.recipe_name) contextParts.push('one-off');

  return (
    <div
      className={
        'relative grid grid-cols-1 md:grid-cols-[minmax(220px,1.4fr)_130px_110px_140px_minmax(140px,1fr)_60px] gap-5 px-7 py-4 items-center transition-colors before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] ' +
        statusStripe[item.status] +
        (last ? '' : ' border-b border-rule-soft')
      }
    >
      <div>
        <div className="font-serif font-semibold text-base text-ink leading-snug tracking-[-0.005em]">
          {item.name}
        </div>
        <div className="text-xs text-muted mt-1 flex items-center gap-2 tracking-[0.02em] flex-wrap">
          {item.recipe_name && (
            <span className="text-gold">
              <span className="mr-0.5">↗</span>
              Recipe · {item.recipe_name}
            </span>
          )}
          {item.recipe_name && contextParts.length > 0 && <span>·</span>}
          {contextParts.length > 0 && <span>{contextParts.join(' · ')}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        {item.qty != null ? (
          <div className="font-serif font-semibold text-lg text-ink tracking-[-0.005em]">
            {qtyFmt.format(item.qty)}
            {item.qty_unit && (
              <>
                {' '}
                <em className="text-gold not-italic font-medium italic">
                  {item.qty_unit}
                </em>
              </>
            )}
          </div>
        ) : (
          <div className="font-serif font-semibold text-lg text-muted-soft">—</div>
        )}
        {item.suggested_qty && (
          <div
            className={
              'font-serif italic text-xs ' +
              (item.suggested_flag ? 'text-attention' : 'text-muted')
            }
          >
            {item.suggested_qty}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div
          className={
            'w-7 h-7 rounded-full flex items-center justify-center font-display font-semibold text-xs tracking-[0.05em] text-paper flex-shrink-0 ' +
            assignedClass
          }
        >
          {item.assigned_label ? initials(item.assigned_label) : '?'}
        </div>
        <div
          className={
            'font-serif text-sm ' +
            (item.assigned_label ? 'text-ink' : 'text-muted-soft italic')
          }
        >
          {item.assigned_label ?? 'Unassigned'}
        </div>
      </div>

      <div>
        <PrepStatusButton itemId={item.id} status={item.status} />
      </div>

      <div>
        <PrepNotesField itemId={item.id} initial={item.notes} />
      </div>

      <div />
    </div>
  );
}
