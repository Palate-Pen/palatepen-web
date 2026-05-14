'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type DeliveryFormInput = {
  supplier_id: string;
  expected_at: string; // YYYY-MM-DD
  line_count_estimate: number | null;
  value_estimate: number | null;
  notes: string | null;
};

type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function scheduleDelivery(
  input: DeliveryFormInput,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  if (!input.supplier_id) return { ok: false, error: 'supplier_required' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expected_at)) {
    return { ok: false, error: 'invalid_date' };
  }
  if (
    input.line_count_estimate != null &&
    (input.line_count_estimate < 0 || !Number.isFinite(input.line_count_estimate))
  ) {
    return { ok: false, error: 'invalid_lines' };
  }
  if (
    input.value_estimate != null &&
    (input.value_estimate < 0 || !Number.isFinite(input.value_estimate))
  ) {
    return { ok: false, error: 'invalid_value' };
  }

  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id, role')
    .eq('user_id', user.id)
    .limit(1);
  const membership = memberships?.[0];
  if (!membership) return { ok: false, error: 'no_membership' };

  const { data, error } = await supabase
    .from('deliveries')
    .insert({
      site_id: membership.site_id as string,
      supplier_id: input.supplier_id,
      expected_at: input.expected_at,
      status: 'expected',
      line_count_estimate: input.line_count_estimate,
      value_estimate: input.value_estimate,
      notes: input.notes?.trim() || null,
    })
    .select('id')
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? 'insert_failed' };
  }

  revalidatePath('/stock-suppliers/deliveries');
  revalidatePath('/stock-suppliers');
  revalidatePath('/');
  return { ok: true, id: data.id as string };
}
