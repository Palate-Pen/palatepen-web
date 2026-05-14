'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  PREFERENCE_DEFAULTS,
  type UserPreferences,
} from '@/lib/preferences';

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Set a single preference key for the current user. Upserts the
 * v2.user_preferences row so the first toggle a fresh user touches
 * implicitly creates their row.
 */
export async function setUserPreference<K extends keyof UserPreferences>(
  key: K,
  value: UserPreferences[K],
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  // Load existing prefs so we merge rather than overwrite.
  const { data: existing } = await supabase
    .from('user_preferences')
    .select('prefs')
    .eq('user_id', user.id)
    .maybeSingle();

  const current = (existing?.prefs ?? {}) as Partial<UserPreferences>;
  const next: UserPreferences = {
    ...PREFERENCE_DEFAULTS,
    ...current,
    [key]: value,
  };

  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: user.id,
        prefs: next as unknown as object,
      },
      { onConflict: 'user_id' },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings');
  return { ok: true };
}
