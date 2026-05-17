import { getShellContext } from '@/lib/shell/context';
import { getCleaningSchedule, type CleaningTaskRow } from '@/lib/safety/lib';
import { resolveSafetyUsers } from '@/lib/safety/users';
import { CLEANING_FREQ_LABEL } from '@/lib/safety/standards';
import { getDishPickerBands } from '@/lib/safety/dish-picker';
import { LiabilityFooter } from '@/components/safety/LiabilityFooter';
import { FsaReferenceStrip } from '@/components/safety/FsaReferenceStrip';
import {
  SafetyPageHeader,
  SafetySideCard,
} from '@/components/safety/SafetyPageHeader';
import { SafetyLookingAhead } from '@/components/safety/SafetyLookingAhead';
import { CleaningTickRow } from './CleaningTickRow';
import { SeedScheduleButton } from './SeedScheduleButton';
import { ManageScheduleSection } from './ManageScheduleSection';

export const metadata = { title: 'Cleaning schedule · Safety · Palatable' };

export default async function CleaningPage() {
  const ctx = await getShellContext();
  const [tasks, bands] = await Promise.all([
    getCleaningSchedule(ctx.siteId),
    getDishPickerBands(ctx.siteId, 'all'),
  ]);

  const todayIso = new Date().toISOString().slice(0, 10);

  // Compute "in cycle" per frequency: a task is in cycle when its last
  // signoff falls within its frequency window (today for daily, last 7
  // days for weekly, etc.). Each frequency gets its own progress bar so
  // ticking a weekly task doesn't move the daily bar and vice versa.
  type FreqBar = {
    key: CleaningTaskRow['frequency'];
    label: string;
    inCycle: number;
    total: number;
    pct: number;
    tone: 'healthy' | 'attention' | 'urgent';
  };
  const FREQ_WINDOW_DAYS: Record<CleaningTaskRow['frequency'], number> = {
    daily: 1,
    weekly: 7,
    monthly: 30,
    quarterly: 90,
    annually: 365,
  };
  function isInCycle(t: CleaningTaskRow): boolean {
    if (!t.last_completed_at) return false;
    const days = Math.floor(
      (Date.now() - new Date(t.last_completed_at).getTime()) /
        (24 * 60 * 60 * 1000),
    );
    return days <= FREQ_WINDOW_DAYS[t.frequency];
  }
  const freqBars: FreqBar[] = (
    ['daily', 'weekly', 'monthly', 'quarterly', 'annually'] as const
  )
    .map((f) => {
      const list = tasks.filter((t) => t.frequency === f);
      const inCycle = list.filter(isInCycle).length;
      const total = list.length;
      const pct = total === 0 ? 0 : Math.round((inCycle / total) * 100);
      const tone: FreqBar['tone'] =
        total === 0
          ? 'healthy'
          : pct === 100
            ? 'healthy'
            : pct >= 60
              ? 'attention'
              : 'urgent';
      return { key: f, label: CLEANING_FREQ_LABEL[f], inCycle, total, pct, tone };
    })
    // Drop bars where the schedule has no tasks at that frequency.
    .filter((b) => b.total > 0);

  const overallTotal = tasks.length;
  const overallInCycle = tasks.filter(isInCycle).length;
  const overallPct =
    overallTotal === 0 ? 0 : Math.round((overallInCycle / overallTotal) * 100);

  // Overdue = weekly/monthly past their cycle, or never done
  const overdue = tasks.filter((t) => {
    if (!t.last_completed_at) return true;
    const days = Math.floor(
      (Date.now() - new Date(t.last_completed_at).getTime()) /
        (24 * 60 * 60 * 1000),
    );
    if (t.frequency === 'daily') return days > 1;
    if (t.frequency === 'weekly') return days > 7;
    if (t.frequency === 'monthly') return days > 30;
    if (t.frequency === 'quarterly') return days > 90;
    if (t.frequency === 'annually') return days > 365;
    return false;
  });

  // Group by area
  const grouped = new Map<string, typeof tasks>();
  for (const t of tasks) {
    if (!grouped.has(t.area)) grouped.set(t.area, []);
    grouped.get(t.area)!.push(t);
  }

  // Today's sign-offs feed (last 6)
  const signoffs = [...tasks]
    .filter((t) => t.last_completed_at?.slice(0, 10) === todayIso)
    .sort((a, b) => (b.last_completed_at ?? '').localeCompare(a.last_completed_at ?? ''))
    .slice(0, 6);
  // Resolve user_ids → display labels across BOTH the side-feed and the
  // main task list, so every "Last: ..." line can show who did it.
  const userById = await resolveSafetyUsers(
    tasks.map((t) => t.last_completed_by),
  );

  const ahead: Array<{
    tag: 'worth_knowing' | 'get_ready' | 'plan_for_it';
    body: string;
  }> = [];
  if (overdue.length > 0) {
    ahead.push({
      tag: 'plan_for_it',
      body: `<em>${overdue[0].task}</em>${overdue.length > 1 ? ` and ${overdue.length - 1} other task${overdue.length - 1 === 1 ? '' : 's'}` : ''} overdue. The diary calendar marks these red on the home page.`,
    });
  }
  const dailyBar = freqBars.find((b) => b.key === 'daily');
  if (dailyBar && dailyBar.inCycle === dailyBar.total) {
    ahead.push({
      tag: 'worth_knowing',
      body: `All daily tasks ticked off. The full SFBB record looks clean for today.`,
    });
  }

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <SafetyPageHeader
        crumb="Cleaning Schedule"
        title="The"
        titleEm="cleaning"
        subtitle="SFBB-aligned tasks across opening, mid-day, and pre-service. Tick as you go — the calendar dots itself."
      />

      {ahead.length > 0 && <SafetyLookingAhead items={ahead} />}

      {tasks.length === 0 ? (
        <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-7">
          <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-gold mb-3">
            No cleaning schedule yet
          </div>
          <p className="font-serif italic text-base text-ink-soft leading-relaxed mb-5">
            Seed the default SFBB-aligned schedule (14 tasks across kitchen, FOH, bar, storage) for{' '}
            <strong className="not-italic font-semibold text-ink">{ctx.kitchenName}</strong>. Every row is editable afterwards.
          </p>
          <SeedScheduleButton siteId={ctx.siteId} />
        </div>
      ) : (
        <>
        <ManageScheduleSection siteId={ctx.siteId} tasks={tasks} />
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8">
          <div>
            <div className="bg-card border border-rule px-7 py-5 mb-6">
              <div className="flex items-baseline justify-between gap-4 mb-4 flex-wrap">
                <div>
                  <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-gold mb-1">
                    In cycle
                  </div>
                  <div className="font-serif text-2xl font-medium text-ink">
                    {overallInCycle} / {overallTotal} tasks within their window
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-medium text-3xl text-gold-dark leading-none">
                    {overallPct}%
                  </div>
                  <div className="font-sans text-xs text-muted mt-1">overall</div>
                </div>
              </div>

              <div className="space-y-2.5">
                {freqBars.map((b) => (
                  <div key={b.key}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span
                        className={
                          'font-display font-semibold text-[10px] tracking-[0.25em] uppercase ' +
                          (b.tone === 'urgent'
                            ? 'text-urgent'
                            : b.tone === 'attention'
                              ? 'text-attention'
                              : 'text-healthy')
                        }
                      >
                        {b.label}
                      </span>
                      <span className="font-mono text-xs text-ink-soft">
                        {b.inCycle} / {b.total}
                        <span className="text-muted-soft ml-2">{b.pct}%</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-rule rounded-sm overflow-hidden">
                      <div
                        className={
                          'h-full transition-all ' +
                          (b.tone === 'urgent'
                            ? 'bg-urgent'
                            : b.tone === 'attention'
                              ? 'bg-attention'
                              : 'bg-healthy')
                        }
                        style={{ width: b.pct + '%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {overdue.length > 0 && (
                <p className="font-serif italic text-sm text-attention mt-4">
                  {overdue.length} task{overdue.length === 1 ? '' : 's'} sitting outside their frequency window
                </p>
              )}
            </div>

            {Array.from(grouped.entries()).map(([area, items]) => (
              <section key={area} className="mb-8">
                <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
                  <h2 className="font-display font-semibold text-[13px] tracking-[0.35em] uppercase text-gold">
                    {area}
                  </h2>
                  <span className="font-serif italic text-sm text-muted">
                    {items.length} task{items.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="bg-card border border-rule">
                  {items.map((t, i) => (
                    <CleaningTickRow
                      key={t.id}
                      task={t}
                      freqLabel={CLEANING_FREQ_LABEL[t.frequency]}
                      isLast={i === items.length - 1}
                      lastByLabel={
                        t.last_completed_by ? userById.get(t.last_completed_by) ?? null : null
                      }
                      bands={bands}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div>
            <FsaReferenceStrip surface="cleaning" variant="full" />

            <SafetySideCard title="Today's sign-offs">
              {signoffs.length === 0 ? (
                <div className="px-6 py-6 font-serif italic text-sm text-muted">
                  Nothing ticked yet today.
                </div>
              ) : (
                signoffs.map((s) => {
                  const who = s.last_completed_by ? userById.get(s.last_completed_by) : null;
                  return (
                    <div key={s.id} className="px-6 py-3.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-muted-soft">
                          {new Date(s.last_completed_at!).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })}
                        </span>
                        <span className="font-display font-semibold text-[10px] tracking-[0.25em] uppercase text-gold">
                          {CLEANING_FREQ_LABEL[s.frequency]}
                        </span>
                      </div>
                      <div className="font-serif text-sm text-ink leading-snug">
                        {s.task}
                      </div>
                      {who && (
                        <div className="font-sans text-xs text-muted-soft mt-0.5">
                          by <span className="text-ink-soft">{who}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </SafetySideCard>
          </div>
        </div>
        </>
      )}

      <LiabilityFooter />
    </div>
  );
}
