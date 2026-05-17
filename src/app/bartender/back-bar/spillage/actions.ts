'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { WasteCategory } from '@/lib/waste';

export type SpillageReason =
  | 'over_pour'
  | 'breakage'
  | 'spillage'
  | 'comp'
  | 'returned'
  | 'expired';

const VALID_REASONS: SpillageReason[] = [
  'over_pour',
  'breakage',
  'spillage',
  'comp',
  'returned',
  'expired',
];

// Map a spillage reason to the underlying waste_category enum so the
// row still sits cleanly in the broader Waste view. Bar surfaces read
// spillage_reason; chef surfaces read category.
const REASON_TO_CATEGORY: Record<SpillageReason, WasteCategory> = {
  over_pour: 'accident',
  breakage: 'accident',
  spillage: 'accident',
  comp: 'other',
  returned: 'customer_return',
  expired: 'spoilage',
};

export type SpillageFormInput = {
  ingredient_id: string | null;
  recipe_id: string | null;
  name: string;
  qty: number;
  qty_unit: string;
  spillage_reason: SpillageReason;
  reason_md: string | null;
  value: number | null;
};

type ActionResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Log a bar spillage. Writes to v2.waste_entries with `spillage_reason`
 * set so the bar spillage page picks it up; `category` is derived from
 * the reason so the same row still appears correctly on chef Waste
 * tone-grouping.
 */
export async function logSpillage(
  input: SpillageFormInput,
): Promise<ActionResult> {
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
  if (!VALID_REASONS.includes(input.spillage_reason)) {
    return { ok: false, error: 'invalid_reason' };
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

  // Snapshot value from the Bank if a known ingredient + no override.
  let value: number | null = input.value;
  if (value == null && input.ingredient_id != null) {
    const { data: ing } = await supabase
      .from('ingredients')
      .select('current_price, pack_volume_ml')
      .eq('id', input.ingredient_id)
      .single();
    const price = ing?.current_price as number | null | undefined;
    const packMl = ing?.pack_volume_ml as number | null | undefined;
    if (price != null && Number.isFinite(Number(price))) {
      const unitLow = input.qty_unit.trim().toLowerCase();
      // ml / cl handling — if we know pack volume, value = price * (qty
      // in ml) / pack_ml. Otherwise fall back to price * qty.
      if (packMl && packMl > 0 && (unitLow === 'ml' || unitLow === 'cl')) {
        const ml = unitLow === 'cl' ? input.qty * 10 : input.qty;
        value = Math.round((Number(price) * ml * 100) / packMl) / 100;
      } else {
        value = Math.round(Number(price) * input.qty * 100) / 100;
      }
    }
  }
  if (value != null) value = Math.round(value * 100) / 100;

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
      category: REASON_TO_CATEGORY[input.spillage_reason],
      spillage_reason: input.spillage_reason,
      reason_md: input.reason_md?.trim() || null,
    })
    .select('id')
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? 'insert_failed' };
  }

  revalidatePath('/bartender/back-bar/spillage');
  revalidatePath('/bartender/back-bar');
  revalidatePath('/bartender');
  return { ok: true, id: data.id as string };
}
