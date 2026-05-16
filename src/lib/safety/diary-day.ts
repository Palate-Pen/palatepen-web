import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getOpeningCheckForToday,
  type OpeningCheckRow,
  type ProbeReadingRow,
  type IncidentRow,
} from '@/lib/safety/lib';
import { getOpeningCheckGroups, flattenGroups } from '@/lib/safety/checklists';

export type CleaningSignoffRow = {
  id: string;
  task_id: string;
  completed_at: string;
  completed_by: string | null;
  notes: string | null;
  task_title: string;
  task_area: string;
  task_frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
};

export type DiaryDayMissed = {
  /** Which opening-check questions were ticked false, with metadata. */
  unticked_questions: Array<{
    key: string;
    label: string;
  }>;
  /** Daily cleaning tasks that weren't completed on this date. */
  unticked_daily_tasks: Array<{
    id: string;
    area: string;
    task: string;
  }>;
  /** True when no opening check was logged at all. */
  no_check_on_file: boolean;
};

export type DiaryDayBundle = {
  date: string;
  is_today: boolean;
  is_future: boolean;
  opening_check: OpeningCheckRow | null;
  probe_readings: ProbeReadingRow[];
  incidents: IncidentRow[];
  cleaning_signoffs: CleaningSignoffRow[];
  missed: DiaryDayMissed;
};

/**
 * Pull every Safety record logged on a single date for one site. Used
 * by the diary-day detail surface so the chef can click a calendar
 * day and see exactly what was logged, by who, and what was missed.
 */
export async function getDiaryDay(
  siteId: string,
  isoDate: string,
  /** Account id — used to resolve the per-account opening-check config
   *  so missed-items detection respects custom questions. Falls back to
   *  hardcoded defaults if omitted. */
  accountId?: string,
): Promise<DiaryDayBundle> {
  const supabase = await createSupabaseServerClient();

  const dayStart = new Date(isoDate + 'T00:00:00').toISOString();
  const dayEnd = new Date(isoDate + 'T23:59:59.999').toISOString();
  const todayIso = new Date().toISOString().slice(0, 10);

  // Opening check is keyed by check_date.
  const [
    openingRes,
    probesRes,
    incidentsRes,
    cleaningSignoffsRes,
    cleaningTasksRes,
  ] = await Promise.all([
    supabase
      .from('safety_opening_checks')
      .select('id, site_id, check_date, answers, notes, completed_by, created_at')
      .eq('site_id', siteId)
      .eq('check_date', isoDate)
      .maybeSingle(),
    supabase
      .from('safety_probe_readings')
      .select(
        'id, site_id, kind, location, temperature_c, passed, threshold_note, logged_at, logged_by, recipe_id, menu_version_id, notes',
      )
      .eq('site_id', siteId)
      .gte('logged_at', dayStart)
      .lte('logged_at', dayEnd)
      .order('logged_at', { ascending: true }),
    supabase
      .from('safety_incidents')
      .select(
        'id, site_id, kind, summary, body_md, occurred_at, resolved_at, resolution_md, recipe_id, menu_version_id, allergens, customer_name, customer_contact, logged_by',
      )
      .eq('site_id', siteId)
      .is('archived_at', null)
      .gte('occurred_at', dayStart)
      .lte('occurred_at', dayEnd)
      .order('occurred_at', { ascending: true }),
    supabase
      .from('safety_cleaning_signoffs')
      .select('id, task_id, completed_at, completed_by, notes')
      .eq('site_id', siteId)
      .gte('completed_at', dayStart)
      .lte('completed_at', dayEnd)
      .order('completed_at', { ascending: true }),
    supabase
      .from('safety_cleaning_tasks')
      .select('id, area, task, frequency')
      .eq('site_id', siteId)
      .is('archived_at', null),
  ]);

  const probes = ((probesRes.data ?? []) as unknown as ProbeReadingRow[]).map(
    (p) => ({ ...p, temperature_c: Number(p.temperature_c) }),
  );

  const allTasks = (cleaningTasksRes.data ?? []) as Array<{
    id: string;
    area: string;
    task: string;
    frequency: CleaningSignoffRow['task_frequency'];
  }>;
  const taskById = new Map(allTasks.map((t) => [t.id, t]));

  const signoffs: CleaningSignoffRow[] = (
    (cleaningSignoffsRes.data ?? []) as Array<{
      id: string;
      task_id: string;
      completed_at: string;
      completed_by: string | null;
      notes: string | null;
    }>
  ).map((s) => {
    const t = taskById.get(s.task_id);
    return {
      id: s.id,
      task_id: s.task_id,
      completed_at: s.completed_at,
      completed_by: s.completed_by,
      notes: s.notes,
      task_title: t?.task ?? 'Task',
      task_area: t?.area ?? 'Area',
      task_frequency: t?.frequency ?? 'daily',
    };
  });

  const opening = (openingRes.data ?? null) as OpeningCheckRow | null;

  // Missed-items detection
  const missed: DiaryDayMissed = {
    unticked_questions: [],
    unticked_daily_tasks: [],
    no_check_on_file: opening === null,
  };

  if (opening) {
    const answers = (opening.answers ?? {}) as Record<string, unknown>;
    const groups = await getOpeningCheckGroups(accountId ?? '');
    const questions = flattenGroups(groups);
    for (const q of questions) {
      const v = answers[q.key];
      if (v === false || v === undefined || v === null) {
        missed.unticked_questions.push({ key: q.key, label: q.label });
      }
    }
  }

  // Daily cleaning tasks should be signed off today (or any same-day record).
  const signedTaskIds = new Set(signoffs.map((s) => s.task_id));
  // Only flag "missed daily tasks" for past/today dates, not future.
  if (isoDate <= todayIso) {
    for (const t of allTasks) {
      if (t.frequency !== 'daily') continue;
      if (!signedTaskIds.has(t.id)) {
        missed.unticked_daily_tasks.push({
          id: t.id,
          area: t.area,
          task: t.task,
        });
      }
    }
  }

  return {
    date: isoDate,
    is_today: isoDate === todayIso,
    is_future: isoDate > todayIso,
    opening_check: opening,
    probe_readings: probes,
    incidents: (incidentsRes.data ?? []) as IncidentRow[],
    cleaning_signoffs: signoffs,
    missed,
  };
}

// Re-export for the page to call directly without juggling imports.
export { getOpeningCheckForToday };
