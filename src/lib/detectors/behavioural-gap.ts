import type { createSupabaseServiceClient } from '@/lib/supabase/service';

/**
 * Behavioural-gap primitive. Looks at a rolling event history and
 * detects when an expected recurrence has broken: 'you usually log
 * waste on Mondays - the last 3 Mondays had nothing.'
 *
 * Generic enough to be reused across waste, deliveries, prep, invoices,
 * stock takes. Each concrete detector below configures the primitive
 * with a table, a date column, and an optional grouping key.
 */

type SupaClient = ReturnType<typeof createSupabaseServiceClient>;

const WEEKDAY = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function isoNow(): string {
  return new Date().toISOString();
}

function isoIn(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

type GapResult = {
  weekday: number;
  consecutive_misses: number;
  typical_count: number;
  weeks_observed: number;
};

/**
 * For each day-of-week, decide whether the last few occurrences of that
 * weekday had ZERO events compared to a baseline where they typically
 * had >= 1. Returns the worst-offending weekday, or null.
 *
 * Heuristic:
 *   - look at the last 8 weeks of dates
 *   - bucket by day-of-week
 *   - on weeks the chef DID have at least one matching event for that
 *     weekday, count this as 'typical'
 *   - if typical_count >= 4 AND the last 3 occurrences of that weekday
 *     had zero events, it's a gap.
 */
function findRecurringGap(
  datesIso: string[],
): GapResult | null {
  if (datesIso.length === 0) return null;

  const today = new Date();
  const eightWeeksAgo = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000);

  // For each weekday, build a per-week presence map.
  const byWeekday: Map<number, Map<string, boolean>> = new Map();
  for (let dow = 0; dow < 7; dow++) byWeekday.set(dow, new Map());

  const cursor = new Date(eightWeeksAgo);
  while (cursor <= today) {
    const iso = cursor.toISOString().slice(0, 10);
    const dow = cursor.getDay();
    const weekKey = isoWeekKey(cursor);
    if (!byWeekday.get(dow)!.has(weekKey)) {
      byWeekday.get(dow)!.set(weekKey, false);
    }
    if (datesIso.includes(iso)) {
      byWeekday.get(dow)!.set(weekKey, true);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  let worst: GapResult | null = null;
  for (let dow = 0; dow < 7; dow++) {
    const weeks = Array.from(byWeekday.get(dow)!.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
    const typicalCount = weeks.filter(([, has]) => has).length;
    if (typicalCount < 4) continue;
    const recent = weeks.slice(-3);
    if (recent.length < 3) continue;
    const allMissed = recent.every(([, has]) => !has);
    if (!allMissed) continue;
    const candidate = {
      weekday: dow,
      consecutive_misses: recent.length,
      typical_count: typicalCount,
      weeks_observed: weeks.length,
    };
    if (
      !worst ||
      candidate.consecutive_misses > worst.consecutive_misses ||
      candidate.typical_count > worst.typical_count
    ) {
      worst = candidate;
    }
  }
  return worst;
}

function isoWeekKey(d: Date): string {
  // ISO year-week (1-based). Good enough for grouping.
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return tmp.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
}

// ---------------------------------------------------------------------
// Concrete detectors
// ---------------------------------------------------------------------

/**
 * Waste gap. Chef typically logs waste on a given weekday but the last
 * N occurrences had nothing. Either the routine slipped or waste is
 * happening unrecorded.
 */
export async function detectWasteGap(
  svc: SupaClient,
  siteId: string,
): Promise<Array<Record<string, unknown>>> {
  const { data } = await svc
    .from('waste_entries')
    .select('logged_at')
    .eq('site_id', siteId)
    .gte(
      'logged_at',
      new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString(),
    );
  if (!data || data.length === 0) return [];

  const dates = (data as Array<{ logged_at: string }>).map((r) =>
    new Date(r.logged_at).toISOString().slice(0, 10),
  );
  const gap = findRecurringGap(dates);
  if (!gap) return [];

  const weekdayName = WEEKDAY[gap.weekday];
  return [
    {
      site_id: siteId,
      target_surface: 'stock-suppliers',
      target_role: 'chef',
      tag: 'worth_knowing',
      severity: 'attention',
      section_label: 'Routine slipped',
      headline_pre: 'Waste log usually lands on a ',
      headline_em: weekdayName,
      headline_post:
        ' - the last ' + gap.consecutive_misses + ' have been empty',
      body_md:
        'Across the last 8 weeks ' +
        weekdayName +
        ' had at least one waste entry on **' +
        gap.typical_count +
        ' of ' +
        gap.weeks_observed +
        '** weeks. Either the routine slipped, or waste is going unlogged. Worth a five-minute sweep at the end of service.',
      action_label: 'Open Waste →',
      action_target: '/stock-suppliers/waste',
      action_context: null,
      detector_kind: 'auto',
      detector_key: 'waste_gap',
      payload: gap,
      display_priority: 40,
      emitted_at: isoNow(),
      expires_at: isoIn(7),
    },
  ];
}

/**
 * Delivery gap. Supplier usually delivers on a given weekday but the
 * last few haven't arrived. Either rescheduled or worth a call.
 */
export async function detectDeliveryGap(
  svc: SupaClient,
  siteId: string,
): Promise<Array<Record<string, unknown>>> {
  const { data: deliveries } = await svc
    .from('deliveries')
    .select('supplier_id, received_at, suppliers:supplier_id (name)')
    .eq('site_id', siteId)
    .not('received_at', 'is', null)
    .gte(
      'received_at',
      new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString(),
    );
  if (!deliveries || deliveries.length === 0) return [];

  // Group by supplier and run the gap detector per supplier.
  const bySupplier = new Map<
    string,
    { name: string; dates: string[] }
  >();
  for (const row of deliveries as unknown as Array<{
    supplier_id: string | null;
    received_at: string;
    suppliers: { name: string } | null;
  }>) {
    if (!row.supplier_id) continue;
    const key = row.supplier_id;
    const cur = bySupplier.get(key) ?? {
      name: row.suppliers?.name ?? 'Supplier',
      dates: [],
    };
    cur.dates.push(new Date(row.received_at).toISOString().slice(0, 10));
    bySupplier.set(key, cur);
  }

  const signals: Array<Record<string, unknown>> = [];
  for (const [supplierId, info] of bySupplier.entries()) {
    const gap = findRecurringGap(info.dates);
    if (!gap) continue;
    const weekdayName = WEEKDAY[gap.weekday];
    signals.push({
      site_id: siteId,
      target_surface: 'stock-suppliers',
      target_role: 'chef',
      tag: 'plan_for_it',
      severity: 'attention',
      section_label: 'Supplier rhythm broken',
      headline_pre: info.name + ' usually delivers on a ',
      headline_em: weekdayName,
      headline_post:
        ' - the last ' + gap.consecutive_misses + ' have been missed',
      body_md:
        'A delivery from **' +
        info.name +
        '** has landed on ' +
        weekdayName +
        ' in **' +
        gap.typical_count +
        ' of the last 8** weeks. The last ' +
        gap.consecutive_misses +
        " haven't shown. Worth a call before stock runs thin.",
      action_label: 'Open Suppliers →',
      action_target: '/stock-suppliers/suppliers/' + supplierId,
      action_context: null,
      detector_kind: 'auto',
      detector_key: 'delivery_gap:' + supplierId,
      payload: { ...gap, supplier_id: supplierId },
      display_priority: 50,
      emitted_at: isoNow(),
      expires_at: isoIn(7),
    });
  }
  return signals;
}

/**
 * Prep routine gap. Same idea applied to prep_items: the kitchen
 * typically preps on a given weekday but the last few have been blank.
 */
export async function detectPrepRoutineGap(
  svc: SupaClient,
  siteId: string,
): Promise<Array<Record<string, unknown>>> {
  const { data } = await svc
    .from('prep_items')
    .select('prep_date, status')
    .eq('site_id', siteId)
    .gte(
      'prep_date',
      new Date(Date.now() - 56 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
    );
  if (!data || data.length === 0) return [];

  // Only count days where at least one prep item existed (any status).
  const dates = Array.from(
    new Set(
      (data as Array<{ prep_date: string }>).map((r) => r.prep_date),
    ),
  );
  const gap = findRecurringGap(dates);
  if (!gap) return [];

  const weekdayName = WEEKDAY[gap.weekday];
  return [
    {
      site_id: siteId,
      target_surface: 'prep',
      target_role: 'chef',
      tag: 'worth_knowing',
      severity: 'info',
      section_label: 'Prep rhythm slipped',
      headline_pre: 'Prep board usually has work on a ',
      headline_em: weekdayName,
      headline_post:
        ' - the last ' +
        gap.consecutive_misses +
        " have been quiet",
      body_md:
        weekdayName +
        ' had at least one prep entry on **' +
        gap.typical_count +
        ' of the last 8** weeks. Three quiet ones in a row is unusual. Either the menu shifted, or the prep board is going unlogged.',
      action_label: 'Open Prep →',
      action_target: '/prep',
      action_context: null,
      detector_kind: 'auto',
      detector_key: 'prep_routine_gap',
      payload: gap,
      display_priority: 30,
      emitted_at: isoNow(),
      expires_at: isoIn(7),
    },
  ];
}
