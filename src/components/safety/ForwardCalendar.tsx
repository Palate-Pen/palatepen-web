import type { CalendarItem } from '@/lib/safety/forward-calendar';

const SOURCE_TONE: Record<CalendarItem['source'], string> = {
  signal: 'border-gold',
  delivery: 'border-attention',
  menu_plan: 'border-gold',
  training_expiry: 'border-urgent',
  eho_due: 'border-urgent',
};

const SOURCE_LABEL: Record<CalendarItem['source'], string> = {
  signal: 'Signal',
  delivery: 'Delivery',
  menu_plan: 'Menu plan',
  training_expiry: 'Cert',
  eho_due: 'EHO',
};

const DAY = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
];

/**
 * Horizontal 14-day strip showing dated events from across the
 * platform. Each cell = one day; items inside ordered by source then
 * urgency. Renders on chef home, manager home, owner home, and safety
 * home — all reading the same getForwardCalendar() aggregator.
 */
export function ForwardCalendar({
  days,
  items,
}: {
  days: number;
  items: CalendarItem[];
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells: Array<{ iso: string; date: Date; items: CalendarItem[] }> = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    cells.push({
      iso,
      date: d,
      items: items.filter((it) => it.date_iso === iso),
    });
  }

  const totalCount = items.length;

  return (
    <section className="mb-12">
      <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-rule">
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold">
          Next {days} Days
        </div>
        <div className="font-serif italic text-sm text-muted">
          {totalCount === 0
            ? 'nothing scheduled'
            : totalCount + (totalCount === 1 ? ' thing' : ' things') + ' on the calendar'}
        </div>
      </div>
      <div className="grid grid-cols-7 lg:grid-cols-14 gap-2">
        {cells.map((c, i) => {
          const isToday = i === 0;
          return (
            <div
              key={c.iso}
              className={
                'bg-card border px-3 py-3 min-h-[120px] flex flex-col ' +
                (isToday ? 'border-gold border-2' : 'border-rule')
              }
            >
              <div className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted mb-1">
                {DAY[c.date.getDay()]}
              </div>
              <div className="font-serif font-semibold text-base text-ink leading-none mb-3">
                {c.date.getDate()}
              </div>
              <div className="flex flex-col gap-1.5">
                {c.items.slice(0, 3).map((it) => (
                  <a
                    key={it.id}
                    href={it.action_target ?? '#'}
                    title={it.title}
                    className={
                      'block px-2 py-1 border-l-2 bg-paper-warm/60 font-serif text-[11px] text-ink leading-tight hover:bg-paper-warm transition-colors ' +
                      SOURCE_TONE[it.source]
                    }
                  >
                    <span className="font-display font-semibold tracking-[0.12em] uppercase text-[9px] text-muted block">
                      {SOURCE_LABEL[it.source]}
                    </span>
                    <span className="line-clamp-2">{it.title}</span>
                  </a>
                ))}
                {c.items.length > 3 && (
                  <span className="font-serif italic text-[10px] text-muted">
                    +{c.items.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
