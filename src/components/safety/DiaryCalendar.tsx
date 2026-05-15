import type { OpeningCheckRow } from '@/lib/safety/lib';

/**
 * Renders a 12-week wall calendar grid. Each cell = one day. Green if
 * the opening check that day passed all questions; amber if any
 * exceptions; gold border on today; empty grey for past days with no
 * entry; faint border on future days.
 *
 * Server component — no interactivity. Click-through to a per-day
 * detail page lands with the HACCP wizard build (Slice 7).
 */
export function DiaryCalendar({
  weeks,
  entries,
}: {
  weeks: number;
  entries: OpeningCheckRow[];
}) {
  const byDate = new Map<string, OpeningCheckRow>();
  for (const e of entries) byDate.set(e.check_date, e);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build the date matrix anchored to today, working backwards in
  // 7-day rows. First column is the oldest week, last column is this
  // week. Within each column, the day-of-week order matches the locale.

  const cells: Array<{ date: Date; iso: string; row?: OpeningCheckRow | null; isToday: boolean; isFuture: boolean }> = [];
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks * 7 - 1));
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    cells.push({
      date: d,
      iso,
      row: byDate.get(iso) ?? null,
      isToday: d.getTime() === today.getTime(),
      isFuture: d.getTime() > today.getTime(),
    });
  }

  return (
    <div className="bg-card border border-rule p-5 mb-10 overflow-x-auto">
      <div className="grid grid-cols-7 gap-1 min-w-[420px]" style={{ gridTemplateRows: 'repeat(' + weeks + ', minmax(0, 1fr))' }}>
        {cells.map((c) => {
          const passed = c.row && allYes(c.row.answers as Record<string, boolean>);
          const exceptions = c.row && !passed;
          return (
            <div
              key={c.iso}
              title={
                c.row
                  ? exceptions
                    ? c.iso + ' \u00b7 exceptions logged'
                    : c.iso + ' \u00b7 signed off'
                  : c.isFuture
                    ? c.iso
                    : c.iso + ' \u00b7 no entry'
              }
              className={
                'aspect-square border ' +
                (c.isFuture
                  ? 'border-rule-soft bg-paper'
                  : c.row
                    ? exceptions
                      ? 'bg-attention/30 border-attention'
                      : 'bg-healthy/30 border-healthy'
                    : 'border-rule bg-paper-warm') +
                (c.isToday ? ' ring-2 ring-gold' : '')
              }
            />
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-4 flex-wrap font-serif text-xs text-muted italic">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-healthy/30 border border-healthy" /> all clear</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-attention/30 border border-attention" /> exceptions logged</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-paper-warm border border-rule" /> no entry</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-paper border border-rule-soft" /> future</span>
      </div>
    </div>
  );
}

function allYes(a: Record<string, boolean>): boolean {
  return Object.values(a).every(Boolean);
}
