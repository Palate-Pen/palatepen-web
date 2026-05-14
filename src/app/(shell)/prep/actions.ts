'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { PrepStatus } from '@/lib/prep';

type UpdateResult = { ok: true } | { ok: false; error: string };

/**
 * Cycle prep status forward through the main three: not_started →
 * in_progress → done → not_started. Sets started_at/finished_at
 * timestamps as appropriate so the audit trail tracks duration.
 *
 * Uses the user-session Supabase client so RLS naturally rejects
 * writes against prep items on sites the user isn't on.
 */
export async function cyclePrepStatus(itemId: string): Promise<UpdateResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: cur, error: loadErr } = await supabase
    .from('prep_items')
    .select('id, status, prep_date')
    .eq('id', itemId)
    .single();
  if (loadErr || !cur) {
    return { ok: false, error: loadErr?.message ?? 'not_found' };
  }

  const currentStatus = cur.status as PrepStatus;
  const nextStatus = nextInCycle(currentStatus);
  const now = new Date().toISOString();

  const patch: Record<string, string | null> = { status: nextStatus };
  if (nextStatus === 'in_progress' && currentStatus === 'not_started') {
    patch.started_at = now;
    patch.finished_at = null;
  } else if (nextStatus === 'done') {
    patch.finished_at = now;
  } else if (nextStatus === 'not_started') {
    patch.started_at = null;
    patch.finished_at = null;
  }

  const { error: updErr } = await supabase
    .from('prep_items')
    .update(patch)
    .eq('id', itemId);
  if (updErr) return { ok: false, error: updErr.message };

  revalidatePath('/prep');
  revalidatePath('/');
  return { ok: true };
}

function nextInCycle(s: PrepStatus): PrepStatus {
  // Main three cycle. Over_prepped / short are exception states triggered
  // elsewhere; pressing the pill while in one of those falls back to
  // not_started so the chef can re-flow the item.
  switch (s) {
    case 'not_started':
      return 'in_progress';
    case 'in_progress':
      return 'done';
    case 'done':
      return 'not_started';
    case 'over_prepped':
    case 'short':
      return 'not_started';
  }
}

export async function setPrepNotes(
  itemId: string,
  notes: string,
): Promise<UpdateResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const trimmed = notes.trim();
  const { error } = await supabase
    .from('prep_items')
    .update({ notes: trimmed.length > 0 ? trimmed : null })
    .eq('id', itemId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/prep');
  return { ok: true };
}

export type AddPrepItemInput = {
  name: string;
  station: string;
  qty: number | null;
  qty_unit: string | null;
  recipe_id: string | null;
  notes: string | null;
  prep_date: string;
};

export async function addPrepItem(
  input: AddPrepItemInput,
): Promise<UpdateResult & { id?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id, role')
    .eq('user_id', user.id)
    .limit(1);
  const membership = memberships?.[0];
  if (!membership) return { ok: false, error: 'no_membership' };

  const trimmedName = input.name.trim();
  if (!trimmedName) return { ok: false, error: 'name_required' };
  const trimmedStation = input.station.trim();
  if (!trimmedStation) return { ok: false, error: 'station_required' };

  const row = {
    site_id: membership.site_id as string,
    prep_date: input.prep_date,
    station: trimmedStation,
    name: trimmedName,
    recipe_id: input.recipe_id,
    one_off: input.recipe_id == null,
    qty: input.qty,
    qty_unit: input.qty_unit,
    notes: input.notes,
    status: 'not_started' as const,
  };

  const { data, error } = await supabase
    .from('prep_items')
    .insert(row)
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? 'insert_failed' };

  revalidatePath('/prep');
  revalidatePath('/');
  return { ok: true, id: data.id as string };
}
