import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  EhoVisitLogEntry,
  EhoVisitOutcome,
  EhoVisitRow,
  EhoVisitType,
} from './eho-visit';

function rowToVisit(data: Record<string, unknown>): EhoVisitRow {
  return {
    id: data.id as string,
    site_id: data.site_id as string,
    visit_start_at: data.visit_start_at as string,
    visit_end_at: (data.visit_end_at as string | null) ?? null,
    inspector_name: (data.inspector_name as string | null) ?? null,
    inspector_authority: (data.inspector_authority as string | null) ?? null,
    inspector_id_shown: (data.inspector_id_shown as string | null) ?? null,
    visit_type: (data.visit_type as EhoVisitType | null) ?? null,
    visit_log: Array.isArray(data.visit_log)
      ? (data.visit_log as EhoVisitLogEntry[])
      : [],
    outcome: (data.outcome as EhoVisitOutcome | null) ?? null,
    rating_after: (data.rating_after as number | null) ?? null,
    notes_md: (data.notes_md as string | null) ?? null,
    due_at: (data.due_at as string | null) ?? null,
    archived_at: (data.archived_at as string | null) ?? null,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  };
}

/** Returns the most-recent unfinished visit (visit_end_at IS NULL) for
 *  the site, or null if there isn't one. */
export async function getActiveEhoVisit(
  siteId: string,
): Promise<EhoVisitRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('safety_eho_visits')
    .select('*')
    .eq('site_id', siteId)
    .is('visit_end_at', null)
    .is('archived_at', null)
    .order('visit_start_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return rowToVisit(data as Record<string, unknown>);
}

export async function getRecentEhoVisits(
  siteId: string,
  limit = 10,
): Promise<EhoVisitRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('safety_eho_visits')
    .select('*')
    .eq('site_id', siteId)
    .is('archived_at', null)
    .order('visit_start_at', { ascending: false })
    .limit(limit);
  return ((data ?? []) as Array<Record<string, unknown>>).map(rowToVisit);
}
