import { getShellContext } from '@/lib/shell/context';
import { getRecentProbeReadings } from '@/lib/safety/lib';
import { PROBE_KIND_LABEL } from '@/lib/safety/standards';
import { LiabilityFooter } from '@/components/safety/LiabilityFooter';
import { FsaReferenceStrip } from '@/components/safety/FsaReferenceStrip';
import {
  SafetyPageHeader,
  SafetySideCard,
} from '@/components/safety/SafetyPageHeader';
import { SafetyLookingAhead } from '@/components/safety/SafetyLookingAhead';
import { ProbeForm } from './ProbeForm';

export const metadata = { title: 'Probe reading · Safety · Palatable' };

const tempFmt = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export default async function ProbeReadingPage() {
  const ctx = await getShellContext();
  const readings = await getRecentProbeReadings(ctx.siteId, 30);

  const today = new Date().toISOString().slice(0, 10);
  const todaysReadings = readings.filter((r) =>
    r.logged_at.startsWith(today),
  );

  // Pattern detection — surface in Looking Ahead bar at the top.
  const ahead: Array<{ tag: 'worth_knowing' | 'get_ready' | 'plan_for_it'; body: string }> = [];
  const failingByLoc = new Map<string, number>();
  for (const r of readings) {
    if (!r.passed) {
      failingByLoc.set(r.location, (failingByLoc.get(r.location) ?? 0) + 1);
    }
  }
  for (const [loc, count] of failingByLoc.entries()) {
    if (count >= 2) {
      ahead.push({
        tag: 'worth_knowing',
        body: `<em>${loc}</em> read outside spec ${count} times in last 30 days. Worth a maintenance flag.`,
      });
    }
  }
  if (todaysReadings.length === 0) {
    ahead.push({
      tag: 'plan_for_it',
      body: `No probe readings logged today yet. Cooking core checks land here at first plate-up.`,
    });
  }

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <SafetyPageHeader
        crumb="Log a Probe Reading"
        title="Log a"
        titleEm="probe reading"
        subtitle="Tied to today's menu where it can be. Manual entry for now — digital probes coming later."
      />

      {ahead.length > 0 && <SafetyLookingAhead items={ahead} />}

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8">
        <div>
          <ProbeForm />
        </div>
        <div>
          <FsaReferenceStrip surface="probe_readings" variant="full" />

          <SafetySideCard title="Today's readings">
            {todaysReadings.length === 0 ? (
              <div className="px-6 py-6 font-serif italic text-sm text-muted">
                No readings yet today.
              </div>
            ) : (
              todaysReadings.slice(0, 8).map((r) => (
                <div
                  key={r.id}
                  className="px-6 py-3.5 flex items-center gap-3"
                >
                  <div className="font-mono text-xs text-muted-soft w-12 flex-shrink-0">
                    {new Date(r.logged_at).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-serif text-sm text-ink truncate">
                      {r.location}
                    </div>
                    <div className="font-sans text-xs text-muted mt-0.5">
                      {PROBE_KIND_LABEL[r.kind as keyof typeof PROBE_KIND_LABEL] ?? r.kind}
                    </div>
                  </div>
                  <div
                    className={
                      'font-mono font-medium text-sm flex-shrink-0 ' +
                      (r.passed ? 'text-healthy' : 'text-attention')
                    }
                  >
                    {tempFmt.format(r.temperature_c)}°C
                  </div>
                </div>
              ))
            )}
          </SafetySideCard>

          <div className="bg-paper-warm border-l-[3px] border-gold px-6 py-5">
            <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-2">
              A note on probes
            </div>
            <p className="font-serif text-sm text-ink-soft leading-relaxed">
              Probes need <strong className="font-semibold">weekly calibration</strong> — boiling water (100°C) or ice slurry (0°C). The system flags overdue calibrations on the home Looking Ahead bar.
            </p>
          </div>
        </div>
      </div>

      <LiabilityFooter />
    </div>
  );
}
