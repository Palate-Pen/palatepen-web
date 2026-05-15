import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getOpeningCheckForToday,
  getRecentOpeningChecks,
  getRecentProbeReadings,
  getTrainingRecords,
  type OpeningCheckRow,
  type ProbeReadingRow,
  type TrainingRow,
} from '@/lib/safety/lib';

export type AutoLoggedDelivery = {
  id: string;
  supplier_name: string;
  line_count_estimate: number | null;
  value_estimate: number | null;
  arrived_at: string;
};

export type AutoLoggedWaste = {
  today_count: number;
  top_category: string | null;
};

export type SafetyAutoLogged = {
  deliveries: AutoLoggedDelivery[];
  probe_readings: ProbeReadingRow[];
  waste: AutoLoggedWaste;
};

export async function getSafetyAutoLogged(
  siteId: string,
): Promise<SafetyAutoLogged> {
  const supabase = await createSupabaseServerClient();
  const todayIso = new Date().toISOString().slice(0, 10);
  const startOfDay = new Date(todayIso + 'T00:00:00').toISOString();

  const [deliveriesRes, probesRes, wasteRes] = await Promise.all([
    supabase
      .from('deliveries')
      .select(
        'id, line_count_estimate, value_estimate, arrived_at, suppliers:supplier_id (name)',
      )
      .eq('site_id', siteId)
      .eq('arrived_at', todayIso)
      .order('arrived_at', { ascending: false })
      .limit(4),
    supabase
      .from('safety_probe_readings')
      .select(
        'id, site_id, kind, location, temperature_c, passed, threshold_note, logged_at, logged_by, recipe_id, menu_version_id, notes',
      )
      .eq('site_id', siteId)
      .gte('logged_at', startOfDay)
      .order('logged_at', { ascending: false })
      .limit(4),
    supabase
      .from('waste_entries')
      .select('id, category')
      .eq('site_id', siteId)
      .is('archived_at', null)
      .gte('logged_at', startOfDay),
  ]);

  const deliveries: AutoLoggedDelivery[] = (
    (deliveriesRes.data ?? []) as unknown as Array<{
      id: string;
      line_count_estimate: number | null;
      value_estimate: string | number | null;
      arrived_at: string;
      suppliers: { name: string } | null;
    }>
  ).map((d) => ({
    id: d.id,
    supplier_name: d.suppliers?.name ?? 'Supplier',
    line_count_estimate: d.line_count_estimate,
    value_estimate: d.value_estimate == null ? null : Number(d.value_estimate),
    arrived_at: d.arrived_at,
  }));

  const probe_readings: ProbeReadingRow[] = (
    (probesRes.data ?? []) as unknown as ProbeReadingRow[]
  ).map((r) => ({ ...r, temperature_c: Number(r.temperature_c) }));

  const wasteRows = (wasteRes.data ?? []) as Array<{ category: string }>;
  const wasteCounts = new Map<string, number>();
  for (const w of wasteRows) {
    wasteCounts.set(w.category, (wasteCounts.get(w.category) ?? 0) + 1);
  }
  let top_category: string | null = null;
  let max = 0;
  for (const [cat, n] of wasteCounts.entries()) {
    if (n > max) {
      max = n;
      top_category = cat;
    }
  }

  return {
    deliveries,
    probe_readings,
    waste: { today_count: wasteRows.length, top_category },
  };
}

export type SafetyEhoRollup = {
  days_logged: number;
  days_partial: number;
  deliveries_logged_pct: number;
  total_days: number;
};

export async function getSafetyEhoRollup(
  siteId: string,
  days = 90,
): Promise<SafetyEhoRollup> {
  const supabase = await createSupabaseServerClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [checksRes, deliveriesRes] = await Promise.all([
    supabase
      .from('safety_opening_checks')
      .select('check_date, answers')
      .eq('site_id', siteId)
      .gte('check_date', since),
    supabase
      .from('deliveries')
      .select('id, arrived_at, status')
      .eq('site_id', siteId)
      .gte('expected_at', since)
      .lt('expected_at', new Date().toISOString().slice(0, 10)),
  ]);

  let days_logged = 0;
  let days_partial = 0;
  for (const row of (checksRes.data ?? []) as Array<{
    answers: Record<string, boolean> | null;
  }>) {
    const answers = row.answers ?? {};
    const vals = Object.values(answers);
    if (vals.length === 0) continue;
    if (vals.every(Boolean)) days_logged += 1;
    else days_partial += 1;
  }

  const deliveries = (deliveriesRes.data ?? []) as Array<{
    arrived_at: string | null;
    status: string;
  }>;
  const expected = deliveries.length;
  const arrived = deliveries.filter((d) => d.arrived_at).length;
  const deliveries_logged_pct = expected === 0 ? 100 : Math.round((arrived / expected) * 100);

  return {
    days_logged,
    days_partial,
    deliveries_logged_pct,
    total_days: days,
  };
}

export type LookingAheadTag = 'worth_knowing' | 'get_ready' | 'plan_for_it';

export type LookingAheadItem = {
  tag: LookingAheadTag;
  body: string;
};

const TAG_LABELS: Record<LookingAheadTag, string> = {
  worth_knowing: 'Worth Knowing',
  get_ready: 'Get Ready',
  plan_for_it: 'Plan For It',
};

export function lookingAheadTagLabel(t: LookingAheadTag): string {
  return TAG_LABELS[t];
}

export async function getSafetyLookingAhead(
  siteId: string,
  inputs: {
    todays_check: OpeningCheckRow | null;
    recent_checks: OpeningCheckRow[];
    failing_probes: ProbeReadingRow[];
    expiring_certs: TrainingRow[];
  },
): Promise<LookingAheadItem[]> {
  const items: LookingAheadItem[] = [];

  if (inputs.failing_probes.length > 0) {
    const p = inputs.failing_probes[0];
    items.push({
      tag: 'worth_knowing',
      body: `<em>${p.location || 'A probe'}</em> read ${p.temperature_c}°C on ${formatShortDate(p.logged_at)} — outside spec. Worth a maintenance flag before the EHO sees it on the record.`,
    });
  } else {
    const lastChecks = inputs.recent_checks.slice(0, 14);
    if (lastChecks.length >= 7) {
      const allClear = lastChecks.every((c) => {
        const a = (c.answers ?? {}) as Record<string, boolean>;
        const vals = Object.values(a);
        return vals.length > 0 && vals.every(Boolean);
      });
      if (allClear) {
        items.push({
          tag: 'worth_knowing',
          body: `Last <em>${lastChecks.length} opening checks</em> all signed off clear — the record looks solid for any drop-in inspection.`,
        });
      } else {
        items.push({
          tag: 'worth_knowing',
          body: `Probes all reading inside spec this week — no temperature deviations on file.`,
        });
      }
    }
  }

  // EHO 12-month window heuristic — if there's no signal data we use the
  // earliest opening check as the visit proxy.
  const oldest = inputs.recent_checks.at(-1);
  if (oldest) {
    const monthsSince = Math.round(
      (Date.now() - new Date(oldest.check_date).getTime()) /
        (30 * 24 * 60 * 60 * 1000),
    );
    if (monthsSince >= 9) {
      items.push({
        tag: 'get_ready',
        body: `Diary now holds <em>${monthsSince} months</em> of records — well past the 90-day window an EHO typically asks for. Export is ready when they call.`,
      });
    }
  }

  if (inputs.expiring_certs.length > 0) {
    const c = inputs.expiring_certs[0];
    const days = c.days_until_expiry ?? 0;
    items.push({
      tag: 'get_ready',
      body: `<em>${c.staff_name}'s ${c.certificate_name ?? c.kind}</em> expires in ${days} day${days === 1 ? '' : 's'}. Book the renewal now or work them off-shift until it's done.`,
    });
  }

  // Behavioural pattern — cleaning sign-off gaps by weekday.
  const recent21 = inputs.recent_checks.slice(0, 21);
  if (recent21.length >= 14) {
    const missedByDow = new Map<number, number>();
    for (const c of recent21) {
      const a = (c.answers ?? {}) as Record<string, boolean>;
      if (a.cleaning_signed_off === false) {
        const dow = new Date(c.check_date).getDay();
        missedByDow.set(dow, (missedByDow.get(dow) ?? 0) + 1);
      }
    }
    let worstDay: number | null = null;
    let worstCount = 0;
    for (const [dow, n] of missedByDow.entries()) {
      if (n > worstCount) {
        worstCount = n;
        worstDay = dow;
      }
    }
    if (worstDay !== null && worstCount >= 2) {
      items.push({
        tag: 'plan_for_it',
        body: `Cleaning sign-off missed <em>${worstCount} ${weekdayName(worstDay)}s</em> in the last three weeks. Worth a chat with the closing team for that shift.`,
      });
    }
  }

  if (items.length === 0) {
    items.push({
      tag: 'worth_knowing',
      body: `Diary is clean. Keep logging opening checks daily — the calendar below earns its green dots one shift at a time.`,
    });
  }

  return items.slice(0, 3);
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function weekdayName(dow: number): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dow];
}

export type SafetyHomeBundle = {
  todays_check: OpeningCheckRow | null;
  recent_checks: OpeningCheckRow[];
  expiring_certs: TrainingRow[];
  failing_probes: ProbeReadingRow[];
  auto_logged: SafetyAutoLogged;
  eho: SafetyEhoRollup;
  looking_ahead: LookingAheadItem[];
};

export async function getSafetyHomeBundle(
  siteId: string,
): Promise<SafetyHomeBundle> {
  const [todays, recent, training, probes, auto, eho] = await Promise.all([
    getOpeningCheckForToday(siteId),
    getRecentOpeningChecks(siteId, 84),
    getTrainingRecords(siteId),
    getRecentProbeReadings(siteId, 30),
    getSafetyAutoLogged(siteId),
    getSafetyEhoRollup(siteId, 90),
  ]);
  const failing_probes = probes.filter((p) => !p.passed);
  const expiring_certs = training.filter(
    (t) => t.expiry_band !== 'safe' && t.expiry_band !== 'no_expiry',
  );
  const looking_ahead = await getSafetyLookingAhead(siteId, {
    todays_check: todays,
    recent_checks: recent,
    failing_probes,
    expiring_certs,
  });
  return {
    todays_check: todays,
    recent_checks: recent,
    expiring_certs,
    failing_probes,
    auto_logged: auto,
    eho,
    looking_ahead,
  };
}
