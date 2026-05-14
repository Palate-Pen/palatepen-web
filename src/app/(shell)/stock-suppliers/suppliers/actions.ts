'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createSupplier(name: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'name_required' };
  if (trimmed.length > 120) return { ok: false, error: 'name_too_long' };

  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id, role')
    .eq('user_id', user.id)
    .limit(1);
  const membership = memberships?.[0];
  if (!membership) return { ok: false, error: 'no_membership' };

  // Block dupe names on the same site (case-insensitive). The DB doesn't
  // enforce this — we soft-enforce here so the chef gets a clear message
  // instead of a downstream surprise when the same supplier appears twice.
  const { data: existing } = await supabase
    .from('suppliers')
    .select('id')
    .eq('site_id', membership.site_id as string)
    .ilike('name', trimmed)
    .limit(1);
  if (existing && existing.length > 0) {
    return { ok: false, error: 'duplicate_name' };
  }

  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      site_id: membership.site_id as string,
      name: trimmed,
    })
    .select('id')
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? 'insert_failed' };
  }

  revalidatePath('/stock-suppliers/suppliers');
  revalidatePath('/stock-suppliers');
  return { ok: true, id: data.id as string };
}
