'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireFeature } from '@/lib/features';
import type { WasteCategory } from '@/lib/waste';

export type WasteFormInput = {
  ingredient_id: string | null;
  recipe_id: string | null;
  name: string;
  qty: number;
  qty_unit: string;
  category: WasteCategory;
  reason_md: string | null;
  /** Chef-entered value override. When null and ingredient_id is set,
   *  the server snapshots ingredient.current_price × qty. */
  value: number | null;
};

type ActionResult = { ok: true; id: string } | { ok: false; error: string };

const VALID_CATEGORIES: WasteCategory[] = [
  'over_prep',
  'spoilage',
  'trim',
  'accident',
  'customer_return',
  'other',
];

export async function logWaste(
  input: WasteFormInput,
): Promise<ActionResult> {
  const gate = await requireFeature('waste.log');
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  if (!input.name.trim()) return { ok: false, error: 'name_required' };
  if (!Number.isFinite(input.qty) || input.qty <= 0) {
    return { ok: false, error: 'invalid_qty' };
  }
  if (!input.qty_unit.trim()) return { ok: false, error: 'unit_required' };
  if (!VALID_CATEGORIES.includes(input.category)) {
    return { ok: false, error: 'invalid_category' };
  }
  if (
    input.value != null &&
    (input.value < 0 || !Number.isFinite(input.value))
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

  // If ingredient_id is set and no explicit value, snapshot from
  // ingredient.current_price × qty. This is the operational pattern:
  // value freezes at logging time so future Bank moves don't rewrite
  // history.
  let value: number | null = input.value;
  if (value == null && input.ingredient_id != null) {
    const { data: ing } = await supabase
      .from('ingredients')
      .select('current_price')
      .eq('id', input.ingredient_id)
      .single();
    const price = ing?.current_price as number | null | undefined;
    if (price != null && Number.isFinite(Number(price))) {
      value = Math.round(Number(price) * input.qty * 100) / 100;
    }
  }
  if (value != null) {
    value = Math.round(value * 100) / 100;
  }

  const { data, error } = await supabase
    .from('waste_entries')
    .insert({
      site_id: membership.site_id as string,
      ingredient_id: input.ingredient_id,
      recipe_id: input.recipe_id,
      logged_by: user.id,
      name: input.name.trim(),
      qty: input.qty,
      qty_unit: input.qty_unit.trim(),
      value,
      category: input.category,
      reason_md: input.reason_md?.trim() || null,
    })
    .select('id')
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? 'insert_failed' };
  }

  revalidatePath('/stock-suppliers/waste');
  revalidatePath('/stock-suppliers');
  return { ok: true, id: data.id as string };
}
