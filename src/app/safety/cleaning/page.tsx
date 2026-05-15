import { getShellContext } from '@/lib/shell/context';
import { getCleaningSchedule } from '@/lib/safety/lib';
import { CLEANING_FREQ_LABEL } from '@/lib/safety/standards';
import { SectionHead } from '@/components/shell/SectionHead';
import { KpiCard } from '@/components/shell/KpiCard';
import { LiabilityFooter } from '@/components/safety/LiabilityFooter';
import { FsaReferenceStrip } from '@/components/safety/FsaReferenceStrip';
import { CleaningTickRow } from './CleaningTickRow';
import { seedDefaultCleaningTasksFormAction } from '@/lib/safety/actions';

export const metadata = { title: 'Cleaning \u00b7 Safety \u00b7 Palatable' };

export default async function CleaningPage() {
  const ctx = await getShellContext();
  const tasks = await getCleaningSchedule(ctx.siteId);

  const grouped = new Map<string, typeof tasks>();
  for (const t of tasks) {
    if (!grouped.has(t.area)) grouped.set(t.area, []);
    grouped.get(t.area)!.push(t);
  }

  const dailyDone = tasks.filter((t) => {
    if (t.frequency !== 'daily' || !t.last_completed_at) return false;
    const today = new Date().toISOString().slice(0, 10);
    const last = t.last_completed_at.slice(0, 10);
    return last === today;
  }).length;
  const dailyTotal = tasks.filter((t) => t.frequency === 'daily').length;

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Safety \u00b7 Cleaning
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
        <em className="text-gold font-semibold not-italic">Cleaning</em> Schedule
      </h1>
      <p className="font-serif italic text-lg text-muted mb-8">
        SFBB-aligned cleaning checklist. Tick each task as you go and the diary builds itself.
      </p>

      <FsaReferenceStrip surface="cleaning" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Daily progress"
          value={dailyDone + ' / ' + dailyTotal}
          sub="ticked today"
          tone={dailyDone === dailyTotal && dailyTotal > 0 ? 'healthy' : 'attention'}
        />
        <KpiCard label="Tasks on file" value={String(tasks.length)} sub="across all frequencies" />
        <KpiCard label="Areas" value={String(grouped.size)} sub="distinct zones" />
        <KpiCard label="Last sign-off" value={(tasks[0]?.last_completed_at ? new Date(tasks[0].last_completed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '\u2014')} sub="most recent" />
      </div>

      {tasks.length === 0 ? (
        <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-7 mb-10">
          <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-gold mb-3">
            No cleaning schedule yet
          </div>
          <p className="font-serif italic text-base text-ink-soft leading-relaxed mb-5">
            We can seed a default SFBB-aligned schedule with 14 tasks across kitchen, front of house, bar, and storage. You can edit every row afterwards.
          </p>
          <form action={seedDefaultCleaningTasksFormAction}>
            <button
              type="submit"
              className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors"
            >
              Seed default schedule
            </button>
          </form>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([area, items]) => (
          <section key={area} className="mb-10">
            <SectionHead title={area} meta={items.length + (items.length === 1 ? ' task' : ' tasks')} />
            <div className="bg-card border border-rule">
              {items.map((t, i) => (
                <CleaningTickRow
                  key={t.id}
                  task={t}
                  freqLabel={CLEANING_FREQ_LABEL[t.frequency]}
                  isLast={i === items.length - 1}
                />
              ))}
            </div>
          </section>
        ))
      )}

      <LiabilityFooter />
    </div>
  );
}
