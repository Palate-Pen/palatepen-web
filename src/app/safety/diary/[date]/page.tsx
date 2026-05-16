import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getShellContext } from '@/lib/shell/context';
import { getDiaryDay } from '@/lib/safety/diary-day';
import { resolveSafetyUsers } from '@/lib/safety/users';
import {
  PROBE_KIND_LABEL,
  INCIDENT_KIND_LABEL,
  CLEANING_FREQ_LABEL,
} from '@/lib/safety/standards';
import { LiabilityFooter } from '@/components/safety/LiabilityFooter';
import { FsaReferenceStrip } from '@/components/safety/FsaReferenceStrip';
import { SafetyPageHeader } from '@/components/safety/SafetyPageHeader';

export const metadata = { title: 'Diary day · Safety · Palatable' };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const longDateFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const shortTimeFmt = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export default async function DiaryDayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!ISO_DATE.test(date)) notFound();

  const ctx = await getShellContext();
  const day = await getDiaryDay(ctx.siteId, date);

  // Resolve every user_id we'll surface in one shot.
  const userIds: Array<string | null> = [
    day.opening_check?.completed_by ?? null,
    ...day.probe_readings.map((p) => p.logged_by),
    ...day.incidents.map((i) => i.logged_by),
    ...day.cleaning_signoffs.map((s) => s.completed_by),
  ];
  // Include the per-question meta authors from the opening check too.
  if (day.opening_check) {
    const meta = (
      (day.opening_check.answers ?? {}) as Record<string, unknown>
    )._meta as
      | Record<string, { by?: string; at?: string }>
      | undefined;
    if (meta) {
      // _meta values store the display label directly (set by the action),
      // not the user_id — so they don't need resolving. But if they look
      // like uuids, treat them as user_ids for safety.
      for (const v of Object.values(meta)) {
        if (v?.by && v.by.length === 36 && v.by.includes('-')) {
          userIds.push(v.by);
        }
      }
    }
  }
  const userById = await resolveSafetyUsers(userIds);

  const dateLabel = longDateFmt.format(new Date(date + 'T12:00:00'));
  const eventCount =
    (day.opening_check ? 1 : 0) +
    day.probe_readings.length +
    day.incidents.length +
    day.cleaning_signoffs.length;

  const missedCount =
    day.missed.unticked_questions.length +
    day.missed.unticked_daily_tasks.length +
    (day.missed.no_check_on_file ? 1 : 0);

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <SafetyPageHeader
        crumb={day.is_today ? 'Today' : dateLabel}
        title={day.is_today ? "Today's" : 'Diary for'}
        titleEm={day.is_today ? 'safety log' : dateLabel}
        subtitle={
          eventCount === 0 && !day.is_future
            ? "Nothing logged on this day. Anything that needed signing off shows under Missed below."
            : day.is_future
              ? "This day hasn't happened yet. The diary fills in as the day runs."
              : `${eventCount} record${eventCount === 1 ? '' : 's'} on file${missedCount > 0 ? ` · ${missedCount} item${missedCount === 1 ? '' : 's'} missed` : ''}`
        }
      />

      <Link
        href="/safety"
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors inline-block mb-6"
      >
        ← Back to Safety home
      </Link>

      {/* MISSED ITEMS — surfaced top so it's the first thing the chef sees */}
      {missedCount > 0 && !day.is_future && (
        <section className="bg-card border border-rule border-l-[3px] border-l-urgent mb-8">
          <div className="px-7 py-4 border-b border-rule">
            <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-urgent">
              Missed on this day
            </div>
            <p className="font-serif italic text-sm text-muted mt-1">
              These are the items an EHO would expect to find logged. Tap each
              to add or correct them now.
            </p>
          </div>
          {day.missed.no_check_on_file && (
            <div className="px-7 py-4 border-b border-rule-soft flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="font-serif font-semibold text-base text-ink">
                  Opening check not logged
                </div>
                <div className="font-serif italic text-sm text-muted">
                  The five SFBB questions weren&rsquo;t signed off for this day.
                </div>
              </div>
              {day.is_today && (
                <Link
                  href="/safety"
                  className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-3.5 py-1.5 border border-gold text-gold hover:bg-gold hover:text-paper transition-colors"
                >
                  Log it now
                </Link>
              )}
            </div>
          )}
          {day.missed.unticked_questions.map((q) => (
            <div
              key={'q-' + q.key}
              className="px-7 py-3.5 border-b border-rule-soft last:border-b-0 flex items-center gap-4 flex-wrap"
            >
              <div className="flex-1 min-w-[200px]">
                <div className="font-serif text-base text-ink">{q.label}</div>
                <div className="font-sans text-xs text-muted-soft">
                  Not ticked clear
                </div>
              </div>
              {day.is_today && (
                <Link
                  href="/safety"
                  className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 border border-rule text-muted hover:text-gold hover:border-gold transition-colors"
                >
                  Open check
                </Link>
              )}
            </div>
          ))}
          {day.missed.unticked_daily_tasks.slice(0, 5).map((t) => (
            <div
              key={'t-' + t.id}
              className="px-7 py-3.5 border-b border-rule-soft last:border-b-0 flex items-center gap-4 flex-wrap"
            >
              <div className="flex-1 min-w-[200px]">
                <div className="font-serif text-base text-ink">
                  {t.task}
                </div>
                <div className="font-sans text-xs text-muted-soft">
                  Daily task · {t.area} · no sign-off on this day
                </div>
              </div>
              {day.is_today && (
                <Link
                  href="/safety/cleaning"
                  className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 border border-rule text-muted hover:text-gold hover:border-gold transition-colors"
                >
                  Tick it
                </Link>
              )}
            </div>
          ))}
          {day.missed.unticked_daily_tasks.length > 5 && (
            <div className="px-7 py-3 font-serif italic text-sm text-muted">
              + {day.missed.unticked_daily_tasks.length - 5} other daily task
              {day.missed.unticked_daily_tasks.length - 5 === 1 ? '' : 's'} also unsigned.
            </div>
          )}
        </section>
      )}

      {/* OPENING CHECK */}
      <Section title="Opening check" meta={day.opening_check ? 'SFBB · 5 questions' : 'Not logged'}>
        {day.opening_check ? (
          (() => {
            const answers = (day.opening_check.answers ?? {}) as Record<
              string,
              unknown
            >;
            const meta = (answers._meta ?? {}) as Record<
              string,
              { by?: string; at?: string }
            >;
            const completedBy =
              day.opening_check.completed_by
                ? userById.get(day.opening_check.completed_by) ?? null
                : null;
            return (
              <div className="bg-card border border-rule">
                <div className="px-6 py-3 border-b border-rule font-sans text-xs text-muted">
                  {completedBy ? (
                    <>
                      Submitted by <span className="text-ink-soft">{completedBy}</span>{' '}
                      · {shortTimeFmt.format(new Date(day.opening_check.created_at))}
                    </>
                  ) : (
                    `Submitted ${shortTimeFmt.format(new Date(day.opening_check.created_at))}`
                  )}
                </div>
                {Object.entries(answers)
                  .filter(([k]) => k !== '_meta')
                  .map(([k, v], i, list) => {
                    const m = meta[k];
                    const who = m?.by ?? null;
                    return (
                      <div
                        key={k}
                        className={
                          'px-6 py-3 flex items-center gap-4 flex-wrap ' +
                          (i < list.length - 1 ? 'border-b border-rule-soft' : '')
                        }
                      >
                        <span
                          className={
                            'inline-flex font-display font-semibold text-[10px] tracking-[0.25em] uppercase px-2 py-0.5 border ' +
                            (v
                              ? 'border-healthy/40 text-healthy bg-healthy/10'
                              : 'border-urgent/40 text-urgent bg-urgent/10')
                          }
                        >
                          {v ? 'Clear' : 'Flagged'}
                        </span>
                        <div className="font-serif text-sm text-ink flex-1 min-w-[200px]">
                          {k.replace(/_/g, ' ')}
                        </div>
                        {(who || m?.at) && (
                          <div className="font-sans text-xs text-muted-soft">
                            {who && <>by <span className="text-ink-soft">{who}</span></>}
                            {m?.at && (
                              <>
                                {who ? ' · ' : ''}
                                {shortTimeFmt.format(new Date(m.at))}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            );
          })()
        ) : (
          <EmptyHint>
            No opening check logged on this day.{' '}
            {day.is_today && (
              <Link
                href="/safety"
                className="text-gold hover:text-gold-dark transition-colors underline-offset-2 hover:underline"
              >
                Sign it off now →
              </Link>
            )}
          </EmptyHint>
        )}
      </Section>

      {/* PROBE READINGS */}
      <Section
        title="Probe readings"
        meta={`${day.probe_readings.length} on this day`}
      >
        {day.probe_readings.length === 0 ? (
          <EmptyHint>No probe readings on this day.</EmptyHint>
        ) : (
          <div className="bg-card border border-rule">
            {day.probe_readings.map((p, i, list) => {
              const who = p.logged_by ? userById.get(p.logged_by) ?? null : null;
              return (
                <div
                  key={p.id}
                  className={
                    'px-6 py-3.5 flex items-center gap-4 flex-wrap ' +
                    (i < list.length - 1 ? 'border-b border-rule-soft' : '')
                  }
                >
                  <span className="font-mono text-xs text-muted-soft w-12 flex-shrink-0">
                    {shortTimeFmt.format(new Date(p.logged_at))}
                  </span>
                  <div className="flex-1 min-w-[180px]">
                    <div className="font-serif text-base text-ink">{p.location}</div>
                    <div className="font-sans text-xs text-muted-soft">
                      {PROBE_KIND_LABEL[p.kind as keyof typeof PROBE_KIND_LABEL] ?? p.kind}
                      {who && (
                        <>
                          {' · by '}
                          <span className="text-ink-soft">{who}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div
                    className={
                      'font-mono font-medium text-sm flex-shrink-0 ' +
                      (p.passed ? 'text-healthy' : 'text-urgent')
                    }
                  >
                    {p.temperature_c.toFixed(1)}°C
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* CLEANING SIGNOFFS */}
      <Section
        title="Cleaning sign-offs"
        meta={`${day.cleaning_signoffs.length} task${day.cleaning_signoffs.length === 1 ? '' : 's'} ticked`}
      >
        {day.cleaning_signoffs.length === 0 ? (
          <EmptyHint>No cleaning sign-offs recorded on this day.</EmptyHint>
        ) : (
          <div className="bg-card border border-rule">
            {day.cleaning_signoffs.map((s, i, list) => {
              const who = s.completed_by
                ? userById.get(s.completed_by) ?? null
                : null;
              return (
                <div
                  key={s.id}
                  className={
                    'px-6 py-3.5 flex items-center gap-4 flex-wrap ' +
                    (i < list.length - 1 ? 'border-b border-rule-soft' : '')
                  }
                >
                  <span className="font-mono text-xs text-muted-soft w-12 flex-shrink-0">
                    {shortTimeFmt.format(new Date(s.completed_at))}
                  </span>
                  <div className="flex-1 min-w-[180px]">
                    <div className="font-serif text-base text-ink">
                      {s.task_title}
                    </div>
                    <div className="font-sans text-xs text-muted-soft">
                      {s.task_area} · {CLEANING_FREQ_LABEL[s.task_frequency]}
                      {who && (
                        <>
                          {' · by '}
                          <span className="text-ink-soft">{who}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* INCIDENTS */}
      <Section
        title="Incidents"
        meta={`${day.incidents.length} on file`}
      >
        {day.incidents.length === 0 ? (
          <EmptyHint>Nothing logged. Hopefully that stays the case.</EmptyHint>
        ) : (
          <div className="bg-card border border-rule">
            {day.incidents.map((inc, i, list) => {
              const who = inc.logged_by
                ? userById.get(inc.logged_by) ?? null
                : null;
              return (
                <Link
                  key={inc.id}
                  href="/safety/incidents"
                  className={
                    'block px-6 py-4 hover:bg-paper-warm transition-colors no-underline text-inherit ' +
                    (i < list.length - 1 ? 'border-b border-rule-soft' : '')
                  }
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <span
                      className={
                        'inline-flex font-display font-semibold text-[10px] tracking-[0.25em] uppercase px-2 py-0.5 ' +
                        toneForKind(inc.kind)
                      }
                    >
                      {INCIDENT_KIND_LABEL[inc.kind]}
                    </span>
                    <span className="font-sans text-xs text-muted-soft">
                      {shortTimeFmt.format(new Date(inc.occurred_at))}
                    </span>
                  </div>
                  <div className="font-serif text-sm text-ink leading-snug mb-1">
                    {inc.summary}
                  </div>
                  {(who || inc.resolved_at) && (
                    <div className="font-sans text-xs text-muted-soft">
                      {who && <>logged by <span className="text-ink-soft">{who}</span></>}
                      {inc.resolved_at && (
                        <span className="ml-2 text-healthy">· resolved</span>
                      )}
                      {!inc.resolved_at && (
                        <span className="ml-2 text-attention">· open</span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </Section>

      <FsaReferenceStrip surface="opening_checks" variant="full" />

      <LiabilityFooter />
    </div>
  );
}

function Section({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-display font-semibold text-[13px] tracking-[0.35em] uppercase text-gold">
          {title}
        </h2>
        {meta && (
          <span className="font-serif italic text-sm text-muted">{meta}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card border border-rule px-6 py-5 font-serif italic text-sm text-muted">
      {children}
    </div>
  );
}

function toneForKind(k: string): string {
  if (k === 'allergen' || k === 'illness') return 'bg-urgent/10 text-urgent';
  if (k === 'complaint') return 'bg-attention/10 text-attention';
  return 'bg-gold-bg text-gold-dark';
}
