import { createSupabaseServerClient } from '@/lib/supabase/server';

export type NotebookKind = 'note' | 'voice' | 'photo' | 'sketch';

export type NotebookTag = {
  kind: 'dish' | 'detected' | 'plain';
  text: string;
};

export type SeasonTone = 'peak' | 'ending' | 'arriving';

export type NotebookEntry = {
  id: string;
  kind: NotebookKind;
  title: string;
  body_md: string | null;
  attachment_url: string | null;
  voice_duration_seconds: number | null;
  tags: NotebookTag[];
  season_label: string | null;
  season_tone: SeasonTone | null;
  shared: boolean;
  created_at: string;
};

export type NotebookData = {
  entries: NotebookEntry[];
  total_this_year: number;
  voice_count: number;
  photo_count: number;
  sketch_count: number;
  note_count: number;
  seasonal_count: number;
};

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
        ? r.season_tone
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

const dayMs = 24 * 60 * 60 * 1000;
const longDateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
});
const weekdayDateFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const timeFmt = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** "Today 09:14" / "Yesterday 22:18" / "Sun 11 May" / "19 April" */
export function notebookDateLabel(iso: string, now: Date = new Date()): string {
  const t = new Date(iso);
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const tStartOfDay = new Date(t);
  tStartOfDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (startOfDay.getTime() - tStartOfDay.getTime()) / dayMs,
  );

  if (diffDays === 0) return `Today ${timeFmt.format(t)}`;
  if (diffDays === 1) return `Yesterday ${timeFmt.format(t)}`;
  if (diffDays > 1 && diffDays <= 7) return weekdayDateFmt.format(t);
  if (t.getFullYear() === now.getFullYear()) return longDateFmt.format(t);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(t);
}
