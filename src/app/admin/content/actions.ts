'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ADMIN_EMAIL } from '@/lib/admin';
import type { AnnouncementSeverity } from '@/lib/announcements';

export type PublishInput = {
  title: string;
  body: string | null;
  severity: AnnouncementSeverity;
  expiresAt: string | null;
};

async function gateFounder() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  if (user.email !== ADMIN_EMAIL) {
    return { error: 'not_founder' as const, supabase: null };
  }
  return { error: null, supabase };
}

/**
 * Publishes a new announcement. Deactivates every other active row
 * first so only one banner ever renders to users. New row becomes the
 * active one.
 */
export async function publishAnnouncementAction(
  input: PublishInput,
): Promise<{ ok: true; id: string } | { error: string }> {
  const gate = await gateFounder();
  if (gate.error) return { error: gate.error };
  const supabase = gate.supabase!;

  if (!input.title.trim()) return { error: 'title_required' };
  if (!['info', 'attention', 'urgent'].includes(input.severity))
    return { error: 'invalid_severity' };

  // Deactivate prior actives first
  await supabase
    .from('admin_announcements')
    .update({ active: false })
    .eq('active', true);

  const { data, error } = await supabase
    .from('admin_announcements')
    .insert({
      title: input.title.trim(),
      body: input.body?.trim() || null,
      severity: input.severity,
      expires_at: input.expiresAt || null,
      active: true,
    })
    .select('id')
    .single();
  if (error || !data) return { error: error?.message ?? 'insert_failed' };

  revalidatePath('/admin/content');
  revalidatePath('/');
  return { ok: true, id: data.id as string };
}

export async function deactivateAllAnnouncements(): Promise<
  { ok: true } | { error: string }
> {
  const gate = await gateFounder();
  if (gate.error) return { error: gate.error };
  const supabase = gate.supabase!;

  const { error } = await supabase
    .from('admin_announcements')
    .update({ active: false })
    .eq('active', true);
  if (error) return { error: error.message };

  revalidatePath('/admin/content');
  revalidatePath('/');
  return { ok: true };
}
