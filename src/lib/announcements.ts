import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AnnouncementSeverity = 'info' | 'attention' | 'urgent';

export type Announcement = {
  id: string;
  title: string;
  body: string | null;
  severity: AnnouncementSeverity;
  active: boolean;
  expires_at: string | null;
  created_at: string;
};

/**
 * Get the currently-active announcement (if any). Renders in the shell
 * top strip on every authenticated page. Returns null when nothing's
 * active or the active one has expired.
 */
export async function getActiveAnnouncement(): Promise<Announcement | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('admin_announcements')
    .select('id, title, body, severity, active, expires_at, created_at')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return null;
  }
  return data as Announcement;
}

export async function getRecentAnnouncements(
  limit = 10,
): Promise<Announcement[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('admin_announcements')
    .select('id, title, body, severity, active, expires_at, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as Announcement[];
}
