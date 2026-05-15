/**
 * Pure types + utils for Notebook entries — no server imports.
 *
 * Client components (e.g. NotebookFilters) need NotebookEntry and the
 * date-label helper; if those lived in lib/notebook.ts alongside
 * getNotebookData(), the client bundle would transitively pull in
 * next/headers via createSupabaseServerClient and the build would fail.
 *
 * Server-only data fetching lives in lib/notebook.ts; this file is
 * safe to import from anywhere.
 */

export type NotebookKind = 'note' | 'voice' | 'photo' | 'sketch';

export type NotebookTag = {
  kind: 'dish' | 'detected' | 'plain' | 'menu';
  text: string;
  /** Optional plan_id when kind === 'menu' and the tag was picked from
   *  an active v2.menu_plans row. Free-text menu tags omit this. */
  plan_id?: string;
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
