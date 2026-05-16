import Link from 'next/link';
import type { OpeningCheckRow } from '@/lib/safety/lib';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Wall-calendar grid matching the chef-safety-mockup-v1.html pattern:
 * day-number + dot per cell, today gets a gold ring, future days are
 * paper-warm. Renders the current calendar month with leading muted
 * days from the previous month so the grid stays Mon-aligned.
 *
 * `weeks` is retained for API compatibility but is ignored — the
 * mockup pattern is a single month view, not a rolling N-week strip.
 */
export function DiaryCalendar({
  weeks: _weeks,
  entries,
}: {
  weeks?: number;
  entries: OpeningCheckRow[];
}) {
  void _weeks;
  const byDate = new Map<string, OpeningCheckRow>();
  for (const e of entries) byDate.set(e.check_date, e);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yyyy = today.getFullYear();
  const mm = today.getMonth();

  const first = new Date(yyyy, mm, 1);
  const firstDow = (first.getDay() + 6) % 7; // shift Sun=0 → Mon=0
  const daysInMonth = new Date(yyyy, mm + 1, 0).getDate();

  type Cell = {
    date: Date;
    iso: string;
    inMonth: boolean;
    row: OpeningCheckRow | null;
    isToday: boolean;
    isFuture: boolean;
  };
  const cells: Cell[] = [];

  // Leading muted days from previous month
  for (let i = firstDow; i > 0; i--) {
    const d = new Date(yyyy, mm, 1 - i);
    const iso = d.toISOString().slice(0, 10);
    cells.push({
      date: d,
      iso,
      inMonth: false,
      row: byDate.get(iso) ?? null,
      isToday: false,
      isFuture: false,
    });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(yyyy, mm, day);
    const iso = d.toISOString().slice(0, 10);
    cells.push({
      date: d,
      iso,
      inMonth: true,
      row: byDate.get(iso) ?? null,
      isToday: d.getTime() === today.getTime(),
      isFuture: d.getTime() > today.getTime(),
    });
  }
  // Trailing days to complete the final week row
  const trailing = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= trailing; i++) {
    const d = new Date(yyyy, mm, daysInMonth + i);
    cells.push({
      date: d,
      iso: d.toISOString().slice(0, 10),
      inMonth: false,
      row: null,
      isToday: false,
      isFuture: true,
    });
  }

  return (
    <div className="bg-card border border-rule p-5 mt-4">
      <div className="grid grid-cols-7 gap-1.5 pb-2.5 border-b border-rule mb-2.5">
        {DAYS.map((d) => (
          <div
            key={d}
            className="text-center font-display font-semibold text-[9px] tracking-[0.2em] uppercase text-muted"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((c) => {
          const status = classify(c.row);
          const isFuture = c.isFuture;
          const wrapper =
            isFuture
              ? 'bg-paper-warm border-rule-soft cursor-default'
              : status === 'complete'
                ? 'bg-healthy/[0.08] border-healthy'
                : status === 'partial'
                  ? 'bg-attention/[0.08] border-attention'
                  : status === 'missed'
                    ? 'bg-urgent/[0.08] border-urgent'
                    : 'border-rule-soft hover:border-gold hover:bg-gold-bg cursor-pointer';
          const todayRing = c.isToday ? ' border-[2px] border-gold' : ' border';
          const dotClass =
            status === 'complete'
              ? 'bg-healthy'
              : status === 'partial'
                ? 'bg-attention'
                : status === 'missed'
                  ? 'bg-urgent'
                  : '';
          const numClass = c.inMonth
            ? c.isToday
              ? 'font-bold text-gold-dark'
              : 'text-ink-soft'
            : 'text-muted-soft';
          const inner = (
            <>
              <span className={'font-serif text-[13px] ' + numClass}>
                {c.date.getDate()}
              </span>
              {dotClass && <span className={'w-1.5 h-1.5 rounded-full self-end ' + dotClass} />}
            </>
          );
          const wrapperClass =
            'p-1.5 flex flex-col justify-between transition-colors ' + wrapper + todayRing;
          if (isFuture) {
            return (
              <div
                key={c.iso}
                className={wrapperClass}
                style={{ aspectRatio: '1.4 / 1' }}
                title={c.iso}
              >
                {inner}
              </div>
            );
          }
          return (
            <Link
              key={c.iso}
              href={'/safety/diary/' + c.iso}
              className={wrapperClass + ' no-underline'}
              style={{ aspectRatio: '1.4 / 1' }}
              title={`Open diary for ${c.iso}`}
              aria-label={`Open diary for ${c.iso}`}
            >
              {inner}
            </Link>
          );
        })}
      </div>
      <div className="flex gap-6 mt-4 pt-4 border-t border-rule flex-wrap">
        <span className="flex items-center gap-2 font-sans text-xs text-muted">
          <span className="w-2 h-2 rounded-full bg-healthy" /> All checks complete
        </span>
        <span className="flex items-center gap-2 font-sans text-xs text-muted">
          <span className="w-2 h-2 rounded-full bg-attention" /> Partial
        </span>
        <span className="flex items-center gap-2 font-sans text-xs text-muted">
          <span className="w-2 h-2 rounded-full bg-urgent" /> Not logged
        </span>
      </div>
    </div>
  );
}

function classify(row: OpeningCheckRow | null): 'complete' | 'partial' | 'missed' | null {
  if (!row) return null;
  const a = (row.answers ?? {}) as Record<string, unknown>;
  const entries = Object.entries(a).filter(([k]) => k !== '_meta');
  if (entries.length === 0) return 'missed';
  if (entries.every(([, v]) => Boolean(v))) return 'complete';
  return 'partial';
}
