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
import { getActiveEhoVisit, getRecentEhoVisits } from '@/lib/safety/eho-visit-server';
import { getHaccpPlan } from '@/lib/safety/haccp-server';
import { HACCP_STATUS_LABEL } from '@/lib/safety/haccp';
import { LiabilityFooter } from '@/components/safety/LiabilityFooter';
import { FsaReferenceStrip } from '@/components/safety/FsaReferenceStrip';
import { SafetyPageHeader } from '@/components/safety/SafetyPageHeader';
import {
  EhoControlDesk,
  type ComplianceMetric,
  type EvidenceTileSpec,
} from '@/components/safety/EhoControlDesk';

export const metadata = { title: 'EHO Visit Mode · Safety · Palatable' };

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
    activeVisit,
    recentVisits,
    haccpPlan,
    recipesRes,
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
    getActiveEhoVisit(ctx.siteId),
    getRecentEhoVisits(ctx.siteId, 6),
    getHaccpPlan(ctx.siteId),
    supabase
      .from('recipes')
      .select(
        'id, name, sell_price, recipe_ingredients(allergens)',
      )
      .eq('site_id', ctx.siteId)
      .is('archived_at', null),
  ]);

  const probesIn90 = probes.filter((p) => p.logged_at >= sinceTs);
  const probesFailing = probesIn90.filter((p) => !p.passed).length;

  const deliveries = (deliveriesRes.data ?? []) as Array<{
    id: string;
    arrived_at: string | null;
    status: string;
  }>;
  const deliveriesArrived = deliveries.filter((d) => d.arrived_at).length;
  const deliveriesTotal = deliveries.length;
  const wasteCount = (wasteRes.data ?? []).length;

  const incidentsResolved = incidents.filter((i) => i.resolved_at).length;
  const incidentsOpen = incidents.length - incidentsResolved;

  const expired = training.filter((t) => t.expiry_band === 'expired').length;
  const within30 = training.filter((t) =>
    ['today', 'this_week', 'two_weeks', 'month'].includes(t.expiry_band),
  ).length;

  const cleaningTotal = cleaning.length;
  const cleaningGaps = cleaning.filter((c) => {
    if (!c.last_completed_at) return true;
    const days = Math.floor(
      (Date.now() - new Date(c.last_completed_at).getTime()) /
        (24 * 60 * 60 * 1000),
    );
    if (c.frequency === 'daily') return days > 1;
    if (c.frequency === 'weekly') return days > 7;
    if (c.frequency === 'monthly') return days > 30;
    if (c.frequency === 'quarterly') return days > 90;
    if (c.frequency === 'annually') return days > 365;
    return false;
  }).length;
  const cleaningDoneToday = cleaning.filter((c) => {
    if (!c.last_completed_at) return false;
    return (
      c.last_completed_at.slice(0, 10) ===
      new Date().toISOString().slice(0, 10)
    );
  }).length;

  // ---------- Allergen + menu rollup ----------
  type RecipeRow = {
    id: string;
    name: string;
    sell_price: number | null;
    recipe_ingredients: Array<{ allergens: string[] | null }> | null;
  };
  const recipes = (recipesRes.data ?? []) as unknown as RecipeRow[];
  const menuRecipes = recipes.filter((r) => r.sell_price != null && Number(r.sell_price) > 0);
  const allergensCovered = new Set<string>();
  let recipesWithAllergens = 0;
  for (const r of recipes) {
    let has = false;
    for (const ri of r.recipe_ingredients ?? []) {
      for (const a of ri.allergens ?? []) {
        allergensCovered.add(a);
        has = true;
      }
    }
    if (has) recipesWithAllergens += 1;
  }
  const recipesNoAllergenInfo =
    recipes.length - recipesWithAllergens;

  // ---------- Compliance posture (per FSA inspection categories) ----------
  const posture: ComplianceMetric[] = [
    {
      label: 'Days Logged',
      value: `${rollup.days_logged} / 90`,
      detail:
        rollup.days_partial === 0
          ? `${Math.round((rollup.days_logged / 90) * 100)}% complete coverage`
          : `${rollup.days_partial} partial · ${Math.round((rollup.days_logged / 90) * 100)}% covered`,
      tone:
        rollup.days_logged >= 80
          ? 'healthy'
          : rollup.days_logged >= 60
            ? 'attention'
            : 'urgent',
    },
    {
      label: 'Probe Readings',
      value: String(probesIn90.length),
      detail:
        probesFailing === 0
          ? 'All within FSA limits'
          : `${probesFailing} outside spec — see Probe log`,
      tone: probesFailing === 0 ? 'healthy' : probesFailing > 5 ? 'urgent' : 'attention',
    },
    {
      label: 'Deliveries',
      value:
        deliveriesTotal > 0
          ? `${deliveriesArrived} / ${deliveriesTotal}`
          : '—',
      detail:
        deliveriesTotal > 0
          ? `${Math.round((deliveriesArrived / Math.max(1, deliveriesTotal)) * 100)}% checked at receipt`
          : 'No deliveries scheduled in window',
      tone:
        deliveriesTotal === 0
          ? 'healthy'
          : deliveriesArrived === deliveriesTotal
            ? 'healthy'
            : 'attention',
    },
    {
      label: 'Cleaning gaps',
      value: String(cleaningGaps),
      detail:
        cleaningGaps === 0
          ? 'Every task in cycle'
          : `${cleaningGaps} task${cleaningGaps === 1 ? '' : 's'} past cycle`,
      tone: cleaningGaps === 0 ? 'healthy' : cleaningGaps > 5 ? 'urgent' : 'attention',
    },
    {
      label: 'Training',
      value:
        expired > 0 ? `${expired} expired` : within30 > 0 ? `${within30} expiring` : 'Valid',
      detail:
        expired > 0
          ? `Refresher needed`
          : within30 > 0
            ? `Within 30 days`
            : `${training.length} certs on file`,
      tone: expired > 0 ? 'urgent' : within30 > 0 ? 'attention' : 'healthy',
    },
  ];

  // ---------- Evidence tiles (mapped to the FSA inspection categories) ----------
  // FSA scores three areas:
  //   1. Food handling practices       → probes, deliveries, allergens, waste
  //   2. Physical premises condition   → cleaning, opening checks
  //   3. Food safety management system → HACCP, training, incidents, registration
  const haccpStatus = haccpPlan
    ? HACCP_STATUS_LABEL[haccpPlan.status]
    : 'Not started';
  const haccpTone: EvidenceTileSpec['tone'] = !haccpPlan
    ? 'urgent'
    : haccpPlan.status === 'signed' || haccpPlan.status === 'active'
      ? 'healthy'
      : 'attention';

  const tiles: EvidenceTileSpec[] = [
    {
      title: 'HACCP / SFBB Plan',
      tone: haccpTone,
      status: haccpPlan ? haccpStatus : 'Not started',
      detail: haccpPlan
        ? `Plan ${haccpPlan.status === 'signed' ? 'signed off' : 'in progress'}. Last updated ${dateFmt.format(new Date(haccpPlan.updated_at))}.`
        : 'No plan started yet — required by Regulation (EC) 852/2004.',
      href: haccpPlan ? `/api/safety/haccp/${haccpPlan.id}/pdf` : '/safety/haccp',
      hrefLabel: haccpPlan ? 'Open plan PDF' : 'Start HACCP wizard',
    },
    {
      title: 'Daily Diary',
      tone: rollup.days_partial === 0 ? 'healthy' : 'attention',
      status: rollup.days_partial === 0 ? 'Live' : `${rollup.days_partial} partial`,
      num: String(rollup.days_logged),
      numSub: `Days complete · ${rollup.days_partial} partial`,
      detail:
        'Opening checks, deliveries, probes, cleaning, waste — all in one record.',
      href: '/safety',
      hrefLabel: 'Open diary',
    },
    {
      title: 'Temperature Records',
      tone: probesFailing === 0 ? 'healthy' : 'attention',
      status:
        probesFailing === 0 ? 'Compliant' : `${probesFailing} outside spec`,
      num: String(probesIn90.length),
      numSub: 'Readings · last 90 days',
      detail:
        'Fridges, freezers, hot holding, cooking core, cooling. Pass/fail logged against FSA-aligned thresholds.',
      href: '/safety/probe',
      hrefLabel: 'Open probe log',
    },
    {
      title: 'Supplier Deliveries',
      tone: 'healthy',
      status: deliveriesTotal === 0 ? 'No deliveries' : 'All logged',
      num: String(deliveriesArrived),
      numSub: `of ${deliveriesTotal} · last 90 days`,
      detail:
        'Every delivery linked to its supplier + invoice. Discrepancy flags fed into supplier reliability scores.',
      href: '/stock-suppliers/deliveries',
      hrefLabel: 'Open deliveries',
    },
    {
      title: 'Allergen Records',
      tone:
        recipesNoAllergenInfo === 0
          ? 'healthy'
          : recipesNoAllergenInfo > 5
            ? 'attention'
            : 'attention',
      status:
        recipesNoAllergenInfo === 0
          ? 'All declared'
          : `${recipesNoAllergenInfo} undeclared`,
      detail: (
        <>
          <strong className="font-semibold">14 UK FIR allergens tracked at ingredient level.</strong>{' '}
          {recipes.length} recipes on file · {menuRecipes.length} on the live menu · {allergensCovered.size} distinct allergens declared.
        </>
      ),
      href: '/manager/compliance',
      hrefLabel: 'Open allergen map',
    },
    {
      title: 'Incident Log',
      tone: incidentsOpen === 0 ? 'healthy' : 'attention',
      status:
        incidentsOpen === 0
          ? 'All resolved'
          : `${incidentsOpen} open`,
      num: String(incidents.length),
      numSub: 'Incidents · 90 days',
      detail:
        'Complaints, allergens, near-misses, illness. Each with full corrective action audit trail.',
      href: '/safety/incidents',
      hrefLabel: 'Open issues',
    },
    {
      title: 'Cleaning Schedule',
      tone: cleaningGaps === 0 ? 'healthy' : 'attention',
      status:
        cleaningGaps === 0
          ? 'On track'
          : `${cleaningGaps} outstanding`,
      num: `${cleaningDoneToday} / ${cleaningTotal}`,
      numSub: 'Done today',
      detail:
        'SFBB-aligned daily, weekly, monthly tasks. Each row carries its frequency and cleaning method.',
      href: '/safety/cleaning',
      hrefLabel: 'Open cleaning',
    },
    {
      title: 'Training Records',
      tone: expired === 0 ? 'healthy' : 'urgent',
      status:
        expired > 0
          ? `${expired} expired`
          : within30 > 0
            ? `${within30} expiring`
            : 'All valid',
      num: String(training.length),
      numSub: `Certs · ${new Set(training.map((t) => t.staff_name)).size} staff`,
      detail:
        'Food hygiene, allergen awareness, HACCP — tracked per staff member with expiry windows.',
      href: '/safety/training',
      hrefLabel: 'Open training',
    },
    {
      title: 'Waste Log',
      tone: 'healthy',
      status: 'Tracked',
      num: String(wasteCount),
      numSub: 'Entries · 90 days',
      detail:
        'Disposal reasons logged: over-prep, spoilage, customer return, accidents. Linked back to suppliers for trend visibility.',
      href: '/stock-suppliers/waste',
      hrefLabel: 'Open waste',
    },
    {
      title: 'Registration & History',
      tone: 'healthy',
      status: 'Current',
      detail: (
        <>
          <strong className="font-semibold">{accountRes.data?.name ?? 'This account'}</strong> ·
          records compiled against SFBB + Regulation (EC) 852/2004.
          {recentVisits.length > 0 && (
            <>
              <br />
              <strong className="font-semibold">Last EHO visit:</strong>{' '}
              {dateFmt.format(new Date(recentVisits[0].visit_start_at))}
              {recentVisits[0].rating_after != null && (
                <> — rated FHRS {recentVisits[0].rating_after}</>
              )}
            </>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <SafetyPageHeader
        crumb="EHO Visit Mode"
        title="Inspector at the"
        titleEm="door?"
        subtitle="One tap and you're ready. 90 days of records bundled, FSA-cited, ready to hand over."
      />

      <EhoControlDesk
        siteId={ctx.siteId}
        visit={activeVisit}
        recentVisits={recentVisits}
        posture={posture}
        tiles={tiles}
      />

      <FsaReferenceStrip surface="eho" variant="full" />

      <LiabilityFooter />
    </div>
  );
}
