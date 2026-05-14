'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Dismiss a forward signal — chef looked at it, decided it's not
 * actionable, wants it cleared from the feed. The signal stays in the
 * database (for the founder admin's audit view + detector dedupe) but
 * vanishes from the chef's LookingAhead components and renders muted +
 * "Dismissed" in the Inbox.
 */
export async function dismissSignal(signalId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { error } = await supabase
    .from('forward_signals')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', signalId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/inbox');
  revalidatePath('/');
  revalidatePath('/prep');
  revalidatePath('/recipes');
  revalidatePath('/menus');
  revalidatePath('/margins');
  revalidatePath('/stock-suppliers');
  revalidatePath('/notebook');
  return { ok: true };
}

/**
 * Mark a signal as acted-on. Distinct from dismiss — acted means
 * "the suggestion was useful, I did the thing." Used for detector
 * feedback: a detector that emits signals chefs frequently act on is
 * pulling its weight; one that gets dismissed every time isn't.
 *
 * acted_at + dismissed_at can both be set; the UI shows "Acted" when
 * acted_at is present regardless of dismissed_at.
 */
export async function markSignalActed(signalId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('forward_signals')
    .update({ acted_at: now, dismissed_at: now })
    .eq('id', signalId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/inbox');
  revalidatePath('/');
  revalidatePath('/prep');
  revalidatePath('/recipes');
  revalidatePath('/menus');
  revalidatePath('/margins');
  revalidatePath('/stock-suppliers');
  revalidatePath('/notebook');
  return { ok: true };
}

/**
 * Restore a previously dismissed signal back into the feed. Mostly
 * here for the chef-mis-clicked-dismiss case. Clears both
 * dismissed_at and acted_at.
 */
export async function restoreSignal(signalId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { error } = await supabase
    .from('forward_signals')
    .update({ dismissed_at: null, acted_at: null })
    .eq('id', signalId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/inbox');
  revalidatePath('/');
  revalidatePath('/prep');
  revalidatePath('/recipes');
  revalidatePath('/menus');
  revalidatePath('/margins');
  revalidatePath('/stock-suppliers');
  revalidatePath('/notebook');
  return { ok: true };
}
