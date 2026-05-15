import { getShellContext } from '@/lib/shell/context';
import { getRecentProbeReadings } from '@/lib/safety/lib';
import { PROBE_KIND_LABEL } from '@/lib/safety/standards';
import { SectionHead } from '@/components/shell/SectionHead';
import { KpiCard } from '@/components/shell/KpiCard';
import { LiabilityFooter } from '@/components/safety/LiabilityFooter';
import { FsaReferenceStrip } from '@/components/safety/FsaReferenceStrip';
import { ProbeForm } from './ProbeForm';

export const metadata = { title: 'Probe Reading \u00b7 Safety \u00b7 Palatable' };

const tempFmt = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export default async function ProbeReadingPage() {
  const ctx = await getShellContext();
  const readings = await getRecentProbeReadings(ctx.siteId, 50);

  const failingLast24h = readings.filter((r) => {
    if (r.passed) return false;
    return Date.now() - new Date(r.logged_at).getTime() < 24 * 60 * 60 * 1000;
  }).length;
  const totalLast24h = readings.filter(
    (r) => Date.now() - new Date(r.logged_at).getTime() < 24 * 60 * 60 * 1000,
  ).length;

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Safety \u00b7 Probe
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
        <em className="text-gold font-semibold not-italic">Probe</em> Reading
      </h1>
      <p className="font-serif italic text-lg text-muted mb-8">
        Log temperatures. Pass/fail is automatic against FSA-aligned thresholds and stored against the reading so the audit trail survives rule changes.
      </p>

      <FsaReferenceStrip surface="probe_readings" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Logged"
          value={String(totalLast24h)}
          sub="in last 24 hours"
        />
        <KpiCard
          label="Failing"
          value={String(failingLast24h)}
          sub="below or above safe range"
          tone={failingLast24h > 0 ? 'urgent' : 'healthy'}
        />
        <KpiCard
          label="On file"
          value={String(readings.length)}
          sub="last 50 readings"
        />
        <KpiCard label="Source" value="Manual" sub="bluetooth probe \u00b7 next batch" />
      </div>

      <SectionHead title="New reading" />
      <ProbeForm />

      <SectionHead title="Recent" meta={readings.length === 0 ? 'no readings yet' : readings.length + ' on file'} />
      {readings.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-12 text-center">
          <p className="font-serif italic text-muted">
            No readings yet. Log the first one above and the audit trail starts to build.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-rule">
          <div className="hidden md:grid grid-cols-[120px_120px_1.4fr_110px_120px_100px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
            {['When', 'Kind', 'Location', 'Temperature', 'Status', 'Notes'].map(
              (h) => (
                <div
                  key={h}
                  className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
                >
                  {h}
                </div>
              ),
            )}
          </div>
          {readings.map((r, i) => (
            <div
              key={r.id}
              className={
                'grid grid-cols-1 md:grid-cols-[120px_120px_1.4fr_110px_120px_100px] gap-4 px-7 py-4 items-center' +
                (i < readings.length - 1 ? ' border-b border-rule-soft' : '')
              }
            >
              <div className="font-serif italic text-xs text-muted">
                {new Date(r.logged_at).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
                {PROBE_KIND_LABEL[r.kind as keyof typeof PROBE_KIND_LABEL] ?? r.kind}
              </div>
              <div className="font-serif text-sm text-ink">{r.location}</div>
              <div className="font-serif font-semibold text-base text-ink">
                {tempFmt.format(r.temperature_c)} {String.fromCharCode(0xb0)}C
              </div>
              <div
                className={
                  'font-display font-semibold text-xs tracking-[0.18em] uppercase ' +
                  (r.passed ? 'text-healthy' : 'text-urgent')
                }
              >
                {r.passed ? 'PASS' : 'FAIL'}
              </div>
              <div className="font-serif italic text-xs text-muted line-clamp-2">
                {r.notes ?? ''}
              </div>
            </div>
          ))}
        </div>
      )}

      <LiabilityFooter />
    </div>
  );
}
