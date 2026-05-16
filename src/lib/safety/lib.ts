import { createSupabaseServerClient } from '@/lib/supabase/server';

export type OpeningCheckRow = {
  id: string;
  site_id: string;
  check_date: string;
  answers: Record<string, unknown>;
  notes: string | null;
  completed_by: string | null;
  created_at: string;
};

export async function getOpeningCheckForToday(
  siteId: string,
): Promise<OpeningCheckRow | null> {
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('safety_opening_checks')
    .select('id, site_id, check_date, answers, notes, completed_by, created_at')
    .eq('site_id', siteId)
    .eq('check_date', today)
    .maybeSingle();
  return data as OpeningCheckRow | null;
}

export async function getRecentOpeningChecks(
  siteId: string,
  days = 84,
): Promise<OpeningCheckRow[]> {
  const supabase = await createSupabaseServerClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const { data } = await supabase
    .from('safety_opening_checks')
    .select('id, site_id, check_date, answers, notes, completed_by, created_at')
    .eq('site_id', siteId)
    .gte('check_date', since)
    .order('check_date', { ascending: false });
  return (data ?? []) as OpeningCheckRow[];
}

export type ProbeReadingRow = {
  id: string;
  site_id: string;
  kind: string;
  location: string;
  temperature_c: number;
  passed: boolean;
  threshold_note: string | null;
  logged_at: string;
  logged_by: string | null;
  recipe_id: string | null;
  menu_version_id: string | null;
  notes: string | null;
};

export async function getRecentProbeReadings(
  siteId: string,
  limit = 50,
): Promise<ProbeReadingRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('safety_probe_readings')
    .select(
      'id, site_id, kind, location, temperature_c, passed, threshold_note, logged_at, logged_by, recipe_id, menu_version_id, notes',
    )
    .eq('site_id', siteId)
    .order('logged_at', { ascending: false })
    .limit(limit);
  return ((data ?? []) as unknown as ProbeReadingRow[]).map((r) => ({
    ...r,
    temperature_c: Number(r.temperature_c),
  }));
}

export type IncidentRow = {
  id: string;
  site_id: string;
  kind: 'complaint' | 'allergen' | 'near_miss' | 'illness';
  summary: string;
  body_md: string | null;
  occurred_at: string;
  resolved_at: string | null;
  resolution_md: string | null;
  recipe_id: string | null;
  menu_version_id: string | null;
  allergens: string[] | null;
  customer_name: string | null;
  customer_contact: string | null;
  logged_by: string | null;
};

export async function getRecentIncidents(
  siteId: string,
  options?: { unresolvedOnly?: boolean; limit?: number },
): Promise<IncidentRow[]> {
  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from('safety_incidents')
    .select(
      'id, site_id, kind, summary, body_md, occurred_at, resolved_at, resolution_md, recipe_id, menu_version_id, allergens, customer_name, customer_contact, logged_by',
    )
    .eq('site_id', siteId)
    .is('archived_at', null)
    .order('occurred_at', { ascending: false });
  if (options?.unresolvedOnly) q = q.is('resolved_at', null);
  if (options?.limit) q = q.limit(options.limit);
  const { data } = await q;
  return (data ?? []) as IncidentRow[];
}

export type CleaningTaskRow = {
  id: string;
  site_id: string;
  area: string;
  task: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  notes_md: string | null;
  /** Most recent signoff timestamp, if any */
  last_completed_at: string | null;
  /** Most recent signoff user_id, if any */
  last_completed_by: string | null;
};

export async function getCleaningSchedule(
  siteId: string,
): Promise<CleaningTaskRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data: tasks } = await supabase
    .from('safety_cleaning_tasks')
    .select('id, site_id, area, task, frequency, notes_md')
    .eq('site_id', siteId)
    .is('archived_at', null)
    .order('area', { ascending: true })
    .order('frequency', { ascending: true });
  if (!tasks || tasks.length === 0) return [];

  const taskIds = tasks.map((t) => t.id as string);
  const { data: signoffs } = await supabase
    .from('safety_cleaning_signoffs')
    .select('task_id, completed_at, completed_by')
    .in('task_id', taskIds)
    .order('completed_at', { ascending: false });
  const latestByTask = new Map<
    string,
    { at: string; by: string | null }
  >();
  for (const s of signoffs ?? []) {
    const tid = s.task_id as string;
    if (!latestByTask.has(tid)) {
      latestByTask.set(tid, {
        at: s.completed_at as string,
        by: (s.completed_by as string | null) ?? null,
      });
    }
  }

  return tasks.map((t) => {
    const latest = latestByTask.get(t.id as string);
    return {
      id: t.id as string,
      site_id: t.site_id as string,
      area: t.area as string,
      task: t.task as string,
      frequency: t.frequency as CleaningTaskRow['frequency'],
      notes_md: (t.notes_md as string | null) ?? null,
      last_completed_at: latest?.at ?? null,
      last_completed_by: latest?.by ?? null,
    };
  });
}

export type TrainingRow = {
  id: string;
  site_id: string;
  staff_name: string;
  kind: string;
  certificate_name: string | null;
  awarding_body: string | null;
  awarded_on: string;
  expires_on: string | null;
  /** Days until expiry — negative if already expired, null if no expiry. */
  days_until_expiry: number | null;
  /** Ladder bucket per the cert expiry ladder spec (30 / 14 / 7 / 0 days). */
  expiry_band: 'expired' | 'today' | 'this_week' | 'two_weeks' | 'month' | 'safe' | 'no_expiry';
};

export async function getTrainingRecords(
  siteId: string,
): Promise<TrainingRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('safety_training')
    .select(
      'id, site_id, staff_name, kind, certificate_name, awarding_body, awarded_on, expires_on',
    )
    .eq('site_id', siteId)
    .is('archived_at', null)
    .order('expires_on', { ascending: true, nullsFirst: false });

  const now = Date.now();
  return ((data ?? []) as unknown as Array<{
    id: string;
    site_id: string;
    staff_name: string;
    kind: string;
    certificate_name: string | null;
    awarding_body: string | null;
    awarded_on: string;
    expires_on: string | null;
  }>).map((r) => {
    let days: number | null = null;
    let band: TrainingRow['expiry_band'] = 'no_expiry';
    if (r.expires_on) {
      const ms = new Date(r.expires_on).getTime() - now;
      days = Math.ceil(ms / (24 * 60 * 60 * 1000));
      if (days < 0) band = 'expired';
      else if (days === 0) band = 'today';
      else if (days <= 7) band = 'this_week';
      else if (days <= 14) band = 'two_weeks';
      else if (days <= 30) band = 'month';
      else band = 'safe';
    }
    return { ...r, days_until_expiry: days, expiry_band: band };
  });
}

export type SafetyHomeData = {
  todays_check: OpeningCheckRow | null;
  recent_checks: OpeningCheckRow[];        // last 12 weeks
  expiring_certs_30d: TrainingRow[];
  unresolved_incidents: IncidentRow[];
  recent_failing_probes: ProbeReadingRow[];
};

export async function getSafetyHomeData(
  siteId: string,
): Promise<SafetyHomeData> {
  const [todays, recent, training, incidents, probes] = await Promise.all([
    getOpeningCheckForToday(siteId),
    getRecentOpeningChecks(siteId, 84),
    getTrainingRecords(siteId),
    getRecentIncidents(siteId, { unresolvedOnly: true, limit: 5 }),
    getRecentProbeReadings(siteId, 30),
  ]);
  return {
    todays_check: todays,
    recent_checks: recent,
    expiring_certs_30d: training.filter(
      (t) =>
        t.expiry_band !== 'safe' && t.expiry_band !== 'no_expiry',
    ),
    unresolved_incidents: incidents,
    recent_failing_probes: probes.filter((p) => !p.passed),
  };
}
