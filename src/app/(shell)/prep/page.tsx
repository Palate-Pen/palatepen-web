import { getShellContext } from '@/lib/shell/context';
import {
  getPrepBoard,
  type PrepItem,
  type PrepStation,
  type PrepStatus,
} from '@/lib/prep';
import { LookingAhead } from '@/components/shell/LookingAhead';

export const metadata = { title: 'Prep — Palatable' };

const statusStripe: Record<PrepStatus, string> = {
  done: 'before:bg-healthy before:opacity-50',
  in_progress: 'before:bg-gold',
  not_started: 'before:bg-muted-soft before:opacity-40',
  over_prepped: 'before:bg-attention',
  short: 'before:bg-urgent',
};

const statusPillColor: Record<PrepStatus, string> = {
  done: 'text-healthy',
  in_progress: 'text-gold',
  not_started: 'text-muted',
  over_prepped: 'text-attention',
  short: 'text-urgent',
};

const statusDotColor: Record<PrepStatus, string> = {
  done: 'bg-healthy',
  in_progress: 'bg-gold',
  not_started: 'bg-muted-soft',
  over_prepped: 'bg-attention',
  short: 'bg-urgent',
};

const statusLabel: Record<PrepStatus, string> = {
  done: 'Done',
  in_progress: 'In Progress',
  not_started: 'Not Started',
  over_prepped: 'Over-Prepped',
  short: 'Short',
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

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rollingDays(today: Date): { label: string; date: Date; iso: string; active: boolean }[] {
  const labels = ['Yesterday', 'Today', 'Tomorrow', 'Saturday', 'Sunday'];
  return labels.map((label, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + (i - 1));
    return {
      label,
      date: d,
      iso: isoDate(d),
      active: i === 1,
    };
  });
}

function pctDone(board: { total_items: number; done: number }): string {
  if (board.total_items === 0) return '—';
  return `${Math.round((board.done / board.total_items) * 100)}% complete`;
}

export default async function PrepPage() {
  const ctx = await getShellContext();
  const today = new Date();
  const board = await getPrepBoard(ctx.siteId, isoDate(today));

  const days = rollingDays(today);
  const stationCount = board.stations.length;

  const inProgressChefs = Array.from(
    new Set(
      board.stations
        .flatMap((s) => s.items)
        .filter((i) => i.status === 'in_progress' && i.assigned_label)
        .map((i) => i.assigned_label as string),
    ),
  );

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
            {board.total_items === 0 ? (
              <>No prep set for today. Add the first item or let yesterday's board carry over.</>
            ) : (
              <>
                {numberWord(board.total_items)} items across{' '}
                {numberWord(stationCount)} {stationCount === 1 ? 'station' : 'stations'}.{' '}
                {board.done} done, {board.in_progress} in progress, {board.not_started} to go.
              </>
            )}
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
          <DayTab key={d.iso} {...d} />
        ))}
        <DayNav direction="next" />
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
  active,
}: {
  label: string;
  date: Date;
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
        {dayShort.format(date)}
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
        'relative grid grid-cols-1 md:grid-cols-[minmax(220px,1.4fr)_130px_110px_140px_minmax(140px,1fr)_60px] gap-5 px-7 py-4 items-center cursor-pointer transition-colors hover:bg-card-warm before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] ' +
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

      <div
        className={
          'inline-flex items-center gap-1.5 font-sans font-semibold text-xs tracking-[0.08em] uppercase ' +
          statusPillColor[item.status]
        }
      >
        <span
          className={'w-1.5 h-1.5 rounded-full ' + statusDotColor[item.status]}
        />
        {statusLabel[item.status]}
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
