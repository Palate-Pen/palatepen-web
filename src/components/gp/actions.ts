'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type SaveGPCalcInput = {
  dishName: string;
  sellPrice: number | null;
  totalCost: number;
  gpPct: number | null;
  pourCostPct: number | null;
  lines: Array<{
    name: string;
    qty: number;
    unit: string;
    unit_price: number | null;
  }>;
  notes?: string | null;
};

type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export async function saveGPCalcAction(
  input: SaveGPCalcInput,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const name = input.dishName.trim();
  if (!name) return { ok: false, error: 'dish_name_required' };

  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id')
    .eq('user_id', user.id)
    .limit(1);
  const siteId = memberships?.[0]?.site_id as string | undefined;
  if (!siteId) return { ok: false, error: 'no_membership' };

  const { data, error } = await supabase
    .from('gp_calculations')
    .insert({
      site_id: siteId,
      authored_by: user.id,
      dish_name: name,
      sell_price: input.sellPrice,
      total_cost: Math.round(input.totalCost * 100) / 100,
      gp_pct: input.gpPct,
      pour_cost_pct: input.pourCostPct,
      lines: input.lines as unknown as object,
      notes: input.notes?.trim() || null,
    })
    .select('id')
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? 'insert_failed' };
  }

  revalidatePath('/recipes');
  revalidatePath('/bartender/specs');
  return { ok: true, data: { id: data.id as string } };
}

export async function deleteGPCalcAction(
  calcId: string,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { error } = await supabase
    .from('gp_calculations')
    .delete()
    .eq('id', calcId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/recipes');
  revalidatePath('/bartender/specs');
  return { ok: true };
}
