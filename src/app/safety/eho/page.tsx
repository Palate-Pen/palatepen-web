import { getShellContext } from '@/lib/shell/context';
import { getSafetyEhoRollup } from '@/lib/safety/home';
import {
  getRecentOpeningChecks,
  getRecentProbeReadings,
  getRecentIncidents,
  getCleaningSchedule,
  getTrainingRecords,
} from '@/lib/safety/lib';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { LiabilityFooter } from '@/components/safety/LiabilityFooter';
import { FsaReferenceStrip } from '@/components/safety/FsaReferenceStrip';
import {
  SafetyPageHeader,
  SafetySideCard,
} from '@/components/safety/SafetyPageHeader';

export const metadata = { title: 'EHO Mode · Safety · Palatable' };

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export default async function EhoExportPage() {
  const ctx = await getShellContext();
  const supabase = await createSupabaseServerClient();

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const sinceTs = new Date(since + 'T00:00:00').toISOString();

  const [
    rollup,
    openingChecks,
    probes,
    incidents,
    cleaning,
    training,
    deliveriesRes,
    wasteRes,
    accountRes,
  ] = await Promise.all([
    getSafetyEhoRollup(ctx.siteId, 90),
    getRecentOpeningChecks(ctx.siteId, 90),
    getRecentProbeReadings(ctx.siteId, 500),
    getRecentIncidents(ctx.siteId, { limit: 50 }),
    getCleaningSchedule(ctx.siteId),
    getTrainingRecords(ctx.siteId),
    supabase
      .from('deliveries')
      .select('id, arrived_at, status')
      .eq('site_id', ctx.siteId)
      .gte('expected_at', since),
    supabase
      .from('waste_entries')
      .select('id')
      .eq('site_id', ctx.siteId)
      .is('archived_at', null)
      .gte('logged_at', sinceTs),
    supabase
      .from('accounts')
      .select('name')
      .eq('id', ctx.accountId)
      .maybeSingle(),
  ]);

  const probesIn90 = probes.filter(
    (p) => p.logged_at >= sinceTs,
  );
  const probesFailing = probesIn90.filter((p) => !p.passed).length;

  const deliveries = (deliveriesRes.data ?? []) as Array<{
    id: string;
    arrived_at: string | null;
    status: string;
  }>;
  const deliveriesArrived = deliveries.filter((d) => d.arrived_at).length;
  const wasteCount = (wasteRes.data ?? []).length;

  const incidentsResolved = incidents.filter((i) => i.resolved_at).length;
  const incidentsOpen = incidents.length - incidentsResolved;

  const expired = training.filter((t) => t.expiry_band === 'expired').length;
  const within30 = training.filter((t) =>
    ['today', 'this_week', 'two_weeks', 'month'].includes(t.expiry_band),
  ).length;

  const cleaningTotal = cleaning.length;
  const cleaningDoneToday = cleaning.filter((c) => {
    if (!c.last_completed_at) return false;
    return (
      c.last_completed_at.slice(0, 10) ===
      new Date().toISOString().slice(0, 10)
    );
  }).length;

  // Tiles
  const tiles: TileSpec[] = [
    {
      title: 'Daily Diary',
      tone: rollup.days_partial === 0 ? 'healthy' : 'attention',
      status: rollup.days_partial === 0 ? 'Live' : `${rollup.days_partial} Partial`,
      num: String(rollup.days_logged),
      numSub: `Days Complete · ${rollup.days_partial} Partial`,
      detail:
        'Opening checks, deliveries, probes, cleaning, waste — all in one record.',
      href: '/safety',
      linkLabel: 'Open Diary',
    },
    {
      title: 'Temperature Records',
      tone: probesFailing === 0 ? 'healthy' : 'attention',
      status: probesFailing === 0 ? 'Compliant' : `${probesFailing} Outside Spec`,
      num: String(probesIn90.length),
      numSub: `Readings · Last 90 Days`,
      detail:
        'Fridges, freezers, hot holding, cooking core, cooling. Pass/fail logged against FSA-aligned thresholds.',
      href: '/safety/probe',
      linkLabel: 'Open Probe Log',
    },
    {
      title: 'Supplier Deliveries',
      tone: 'healthy',
      status: 'All Logged',
      num: String(deliveriesArrived),
      numSub: `Deliveries · last 90 days`,
      detail:
        'Every delivery linked to its supplier + invoice. Discrepancy flags fed back to supplier reliability scores.',
      href: '/stock-suppliers/deliveries',
      linkLabel: 'Open Deliveries',
    },
    {
      title: 'Incident Log',
      tone: incidentsOpen === 0 ? 'healthy' : 'attention',
      status: incidentsOpen === 0 ? 'All Resolved' : `${incidentsOpen} Open`,
      num: String(incidents.length),
      numSub: `Incidents · 90 Days`,
      detail:
        'Complaints, allergens, near-misses, illness. Each with full corrective action audit trail.',
      href: '/safety/incidents',
      linkLabel: 'Open Issues',
    },
    {
      title: 'Cleaning Schedule',
      tone: cleaningDoneToday === cleaningTotal ? 'healthy' : 'attention',
      status:
        cleaningDoneToday === cleaningTotal
          ? 'On Track'
          : `${cleaningTotal - cleaningDoneToday} Outstanding`,
      num: `${cleaningDoneToday} / ${cleaningTotal}`,
      numSub: 'Tasks Done Today',
      detail:
        'SFBB-aligned daily, weekly, monthly tasks. Each row carries its cleaning method for EHO inspection.',
      href: '/safety/cleaning',
      linkLabel: 'Open Cleaning',
    },
    {
      title: 'Training Records',
      tone: expired === 0 ? 'healthy' : 'attention',
      status:
        expired > 0 ? `${expired} Expired` : within30 > 0 ? `${within30} Expiring` : 'All Valid',
      num: `${training.length}`,
      numSub: `Certifications · ${new Set(training.map((t) => t.staff_name)).size} staff`,
      detail:
        'Food hygiene, allergen awareness, HACCP — tracked per staff member with expiry windows.',
      href: '/safety/training',
      linkLabel: 'Open Training',
    },
    {
      title: 'Waste Log',
      tone: 'healthy',
      status: 'Tracked',
      num: String(wasteCount),
      numSub: `Entries · 90 Days`,
      detail:
        'Disposal reasons logged: date expiry, prep waste, customer return, accidents. Trend visibility for supplier feedback.',
      href: '/stock-suppliers/waste',
      linkLabel: 'Open Waste',
    },
    {
      title: 'Opening Checks',
      tone: openingChecks.length >= 80 ? 'healthy' : 'attention',
      status: `${openingChecks.length} / 90 logged`,
      num: String(openingChecks.length),
      numSub: 'Daily diary entries',
      detail:
        'Fridge temperatures, probe calibration, cleaning verification, staff health, handwash stations.',
      href: '/safety',
      linkLabel: 'Open Diary',
    },
  ];

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <SafetyPageHeader
        crumb="EHO Mode"
        title="Inspector at the"
        titleEm="door?"
        subtitle="One tap and you're ready. 90 days of records bundled, FSA-cited, ready to hand over."
      />

      <div className="bg-ink text-paper border-l-[3px] border-l-gold px-8 py-7 mb-10 flex flex-wrap items-center gap-8 justify-between">
        <div className="flex-1 min-w-[280px]">
          <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold-light mb-2">
            90-Day Export Bundle
          </div>
          <div className="font-serif text-[26px] text-paper leading-tight mb-2">
            <em className="text-gold-light italic font-medium">
              {accountRes.data?.name ?? 'This account'}
            </em>{' '}
            · {dateFmt.format(new Date(since))} to today
          </div>
          <p className="font-serif italic text-sm text-paper/75 leading-relaxed">
            Every record on this page bundles into a clean PDF the inspector can read on screen or print. FSA citations included against each section.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 min-w-[200px]">
          <button
            type="button"
            className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase px-7 py-3.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors"
            disabled
            title="PDF export lands in the next Safety batch"
          >
            Export 90-day PDF
          </button>
          <div className="font-sans text-[10px] text-paper/50 tracking-wider uppercase text-center">
            PDF export wires next batch
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8">
        <div>
          <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-display font-semibold text-[13px] tracking-[0.35em] uppercase text-gold">
              Evidence on file
            </h2>
            <span className="font-serif italic text-sm text-muted">
              8 categories · linked to source surfaces
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {tiles.map((t) => (
              <EvidenceTile key={t.title} {...t} />
            ))}
          </div>
        </div>

        <div>
          <FsaReferenceStrip surface="eho" variant="full" />

          <SafetySideCard title="What's in the bundle">
            {[
              ['Opening checks', `${rollup.days_logged} signed-off days`],
              ['Temperature readings', `${probesIn90.length} probe readings`],
              ['Deliveries', `${deliveriesArrived} arrivals logged`],
              ['Incidents', `${incidents.length} entries · ${incidentsResolved} resolved`],
              ['Cleaning tasks', `${cleaningTotal} tasks on schedule`],
              ['Training certificates', `${training.length} records`],
              ['Waste entries', `${wasteCount} logs`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="px-6 py-3 flex items-baseline justify-between gap-3"
              >
                <span className="font-serif text-sm text-ink">{label}</span>
                <span className="font-sans text-xs text-muted text-right">{value}</span>
              </div>
            ))}
          </SafetySideCard>

          <div className="bg-paper-warm border-l-[3px] border-gold px-6 py-5">
            <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-2">
              When an inspector arrives
            </div>
            <p className="font-serif text-sm text-ink-soft leading-relaxed mb-2">
              Open this page on the iPad at the pass. Show the tiles. Tap any tile to drill into the source records. Export the PDF for handover.
            </p>
            <p className="font-serif italic text-xs text-muted">
              The inspector card + live visit log lands in the next batch.
            </p>
          </div>
        </div>
      </div>

      <LiabilityFooter />
    </div>
  );
}

type TileSpec = {
  title: string;
  tone: 'healthy' | 'attention';
  status: string;
  num: string;
  numSub: string;
  detail: string;
  href: string;
  linkLabel: string;
};

function EvidenceTile(t: TileSpec) {
  return (
    <a
      href={t.href}
      className={
        'block bg-card border px-6 py-5 transition-colors hover:border-gold ' +
        (t.tone === 'attention'
          ? 'border-attention/40 border-l-[3px] border-l-attention'
          : 'border-rule')
      }
    >
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <div className="font-serif font-semibold text-base text-ink leading-tight">
          {t.title}
        </div>
        <span
          className={
            'font-display font-semibold text-[10px] tracking-[0.25em] uppercase ' +
            (t.tone === 'attention' ? 'text-attention' : 'text-healthy')
          }
        >
          {t.status}
        </span>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="font-mono font-medium text-[26px] text-ink leading-none">
          {t.num}
        </span>
        <span className="font-sans text-xs text-muted">{t.numSub}</span>
      </div>
      <p className="font-serif text-sm text-ink-soft leading-relaxed mb-3">
        {t.detail}
      </p>
      <span className="font-display font-semibold text-[10px] tracking-[0.25em] uppercase text-gold inline-flex items-center gap-1">
        {t.linkLabel} →
      </span>
    </a>
  );
}
