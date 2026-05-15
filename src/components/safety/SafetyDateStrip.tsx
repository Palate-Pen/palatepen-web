type Tone = 'healthy' | 'attention' | 'urgent';

/**
 * Top-of-page date pill. Mirrors the mockup: day + week meta on the
 * left, status pill on the right. Renders server-side; the "service in
 * X" sub-line is computed once on render.
 */
export function SafetyDateStrip({
  serviceStart,
  tone,
  toneLabel,
}: {
  /** Service start, e.g. '18:30' — used to compute hours-to-service. */
  serviceStart: string;
  tone: Tone;
  toneLabel: string;
}) {
  const now = new Date();
  const dateLabel = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const weekNum = isoWeekNumber(now);
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
  const sub = `Week ${weekNum} · Day ${dayOfWeek} of 7${formatServiceIn(serviceStart, now)}`;

  const toneClass: Record<Tone, string> = {
    healthy: 'bg-healthy/10 text-healthy',
    attention: 'bg-attention/10 text-attention',
    urgent: 'bg-urgent/10 text-urgent',
  };
  const dotClass: Record<Tone, string> = {
    healthy: 'bg-healthy',
    attention: 'bg-attention',
    urgent: 'bg-urgent',
  };

  return (
    <div className="bg-card border border-rule px-5 py-3.5 mb-8 flex items-center gap-4 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="font-serif font-medium text-base text-ink">{dateLabel}</div>
        <div className="font-sans text-xs text-muted mt-0.5">{sub}</div>
      </div>
      <div
        className={
          'inline-flex items-center gap-2 px-3 py-1.5 font-display font-semibold text-[10px] tracking-[0.25em] uppercase ' +
          toneClass[tone]
        }
      >
        <span className={'w-2 h-2 rounded-full ' + dotClass[tone]} />
        <span>{toneLabel}</span>
      </div>
    </div>
  );
}

function formatServiceIn(serviceStart: string, now: Date): string {
  const [h, m] = serviceStart.split(':').map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const svc = new Date(now);
  svc.setHours(h, m, 0, 0);
  const diff = svc.getTime() - now.getTime();
  if (diff <= 0) return ' · Service open';
  const hrs = Math.floor(diff / (60 * 60 * 1000));
  const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  return ` · Service in ${hrs}hr ${mins.toString().padStart(2, '0')}min`;
}

function isoWeekNumber(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
}
