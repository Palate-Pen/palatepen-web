import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  NotebookEntry,
  NotebookKind,
  NotebookTag,
  SeasonTone,
} from '@/lib/notebook-shared';

// Re-export types + utils from the server-free shared module so
// existing `from '@/lib/notebook'` imports keep working. Client
// components should prefer importing from '@/lib/notebook-shared'
// directly; the re-exports here are only safe to use from server
// modules.
export type {
  NotebookEntry,
  NotebookKind,
  NotebookTag,
  NotebookData,
  SeasonTone,
} from '@/lib/notebook-shared';
export { notebookDateLabel } from '@/lib/notebook-shared';

import type { NotebookData } from '@/lib/notebook-shared';

type Raw = {
  id: string;
  kind: NotebookKind;
  title: string;
  body_md: string | null;
  attachment_url: string | null;
  voice_duration_seconds: number | null;
  tags: NotebookTag[] | null;
  season_label: string | null;
  season_tone: string | null;
  shared: boolean;
  created_at: string;
};

export async function getNotebookData(
  siteId: string,
): Promise<NotebookData> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('notebook_entries')
    .select(
      'id, kind, title, body_md, attachment_url, voice_duration_seconds, tags, season_label, season_tone, shared, created_at',
    )
    .eq('site_id', siteId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(60);

  const rows = (data ?? []) as unknown as Raw[];

  const entries: NotebookEntry[] = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    body_md: r.body_md,
    attachment_url: r.attachment_url,
    voice_duration_seconds: r.voice_duration_seconds,
    tags: Array.isArray(r.tags) ? r.tags : [],
    season_label: r.season_label,
    season_tone:
      r.season_tone === 'peak' ||
      r.season_tone === 'ending' ||
      r.season_tone === 'arriving'
        ? (r.season_tone as SeasonTone)
        : null,
    shared: r.shared,
    created_at: r.created_at,
  }));

  const yearStart = new Date();
  yearStart.setMonth(0, 1);
  yearStart.setHours(0, 0, 0, 0);

  return {
    entries,
    total_this_year: entries.filter(
      (e) => new Date(e.created_at) >= yearStart,
    ).length,
    voice_count: entries.filter((e) => e.kind === 'voice').length,
    photo_count: entries.filter((e) => e.kind === 'photo').length,
    sketch_count: entries.filter((e) => e.kind === 'sketch').length,
    note_count: entries.filter((e) => e.kind === 'note').length,
    seasonal_count: entries.filter((e) => e.season_label != null).length,
  };
}

/**
 * Reverse lookup: which notebook entries reference this recipe via
 * linked_recipe_ids? Used by the chef Recipe detail + bar Spec detail
 * "Linked notes" panel.
 */
export async function getNotesForRecipe(
  recipeId: string,
  siteId: string,
): Promise<
  Array<{
    id: string;
    title: string | null;
    body_md: string | null;
    created_at: string;
  }>
> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('notebook_entries')
    .select('id, title, body_md, created_at')
    .eq('site_id', siteId)
    .is('archived_at', null)
    .contains('linked_recipe_ids', [recipeId])
    .order('created_at', { ascending: false });
  return (data ?? []) as Array<{
    id: string;
    title: string | null;
    body_md: string | null;
    created_at: string;
  }>;
}
