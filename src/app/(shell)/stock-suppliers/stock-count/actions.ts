'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  ingredientIdsForScope,
  type StockTakeScope,
} from '@/lib/stock-takes';

type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * Start a new stock take. Snapshot current_stock as expected_quantity
 * for every ingredient in scope. Returns the new take id.
 *
 * Two-step: insert header first, then insert one line per ingredient.
 * Status stays 'in_progress' until the chef hits Complete.
 */
export async function startStockCountAction(
  scope: StockTakeScope,
  redirectTo?: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id')
    .eq('user_id', user.id)
    .limit(1);
  const membership = memberships?.[0];
  if (!membership) redirect('/onboarding');
  const siteId = membership.site_id as string;

  const ingredients = await ingredientIdsForScope(siteId, scope);
  if (ingredients.length === 0) {
    redirect(
      (redirectTo ?? '/stock-suppliers/stock-count') + '?error=no_ingredients',
    );
  }

  const { data: header, error: hdrErr } = await supabase
    .from('stock_takes')
    .insert({
      site_id: siteId,
      conducted_by: user.id,
      conducted_at: new Date().toISOString(),
      status: 'in_progress',
    })
    .select('id')
    .single();
  if (hdrErr || !header) {
    redirect(
      (redirectTo ?? '/stock-suppliers/stock-count') +
        '?error=' +
        encodeURIComponent(hdrErr?.message ?? 'header_failed'),
    );
  }
  const takeId = header.id as string;

  const lineRows = ingredients.map((i, idx) => ({
    stock_take_id: takeId,
    ingredient_id: i.id,
    expected_quantity: i.current_stock,
    position: idx,
  }));
  await supabase.from('stock_take_lines').insert(lineRows);

  revalidatePath('/stock-suppliers/stock-count');
  revalidatePath('/bartender/back-bar/stock-take');

  // Redirect to the session detail page (chef or bar version).
  const dest = (redirectTo ?? '/stock-suppliers/stock-count') + '/' + takeId;
  redirect(dest);
}

/**
 * Update a single line — counted_quantity + reason. Variance is
 * recomputed against the snapshot expected_quantity. Lines update
 * eagerly; the chef can keep counting without an explicit save.
 */
export type UpdateLineInput = {
  takeId: string;
  lineId: string;
  countedQuantity: number | null;
  reason: string;
};

export async function updateStockCountLineAction(
  input: UpdateLineInput,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthenticated' };

  const { data: take } = await supabase
    .from('stock_takes')
    .select('id, status')
    .eq('id', input.takeId)
    .single();
  if (!take) return { ok: false, error: 'not_found' };
  if (take.status !== 'in_progress') {
    return { ok: false, error: 'not_editable_status_' + take.status };
  }

  const { data: line } = await supabase
    .from('stock_take_lines')
    .select(
      'id, expected_quantity, ingredients:ingredient_id (current_price)',
    )
    .eq('id', input.lineId)
    .eq('stock_take_id', input.takeId)
    .single();
  if (!line) return { ok: false, error: 'line_not_found' };

  const expected =
    line.expected_quantity != null ? Number(line.expected_quantity) : null;
  const price =
    (line.ingredients as unknown as { current_price?: number | null } | null)
      ?.current_price ?? null;

  const counted = input.countedQuantity;
  const variance =
    counted != null && expected != null ? counted - expected : null;
  const varianceValue =
    variance != null && price != null
      ? Math.round(variance * Number(price) * 100) / 100
      : null;

  await supabase
    .from('stock_take_lines')
    .update({
      counted_quantity: counted,
      variance_quantity: variance,
      variance_value: varianceValue,
      reason: input.reason.trim().length > 0 ? input.reason.trim() : null,
    })
    .eq('id', input.lineId)
    .eq('stock_take_id', input.takeId);

  revalidatePath('/stock-suppliers/stock-count/' + input.takeId);
  revalidatePath('/bartender/back-bar/stock-take/' + input.takeId);
  return { ok: true };
}

/**
 * Complete a stock take. Sums variance_value into the header,
 * writes each counted_quantity to ingredients.current_stock as the
 * new reality, and flips status to 'completed'. Lines without a
 * counted_quantity are skipped (chef chose not to count that one).
 */
export async function completeStockCountAction(
  takeId: string,
  notes: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: take } = await supabase
    .from('stock_takes')
    .select('id, status, site_id')
    .eq('id', takeId)
    .single();
  if (!take || take.status !== 'in_progress') {
    redirect('/stock-suppliers/stock-count/' + takeId);
  }

  const { data: lines } = await supabase
    .from('stock_take_lines')
    .select('id, ingredient_id, counted_quantity, variance_value')
    .eq('stock_take_id', takeId);

  const validLines = (lines ?? []).filter(
    (l) => l.counted_quantity != null && l.ingredient_id != null,
  ) as Array<{
    id: string;
    ingredient_id: string;
    counted_quantity: number;
    variance_value: number | null;
  }>;

  const varianceTotal = validLines.reduce(
    (s, l) => s + Number(l.variance_value ?? 0),
    0,
  );

  // Write each counted_quantity back to v2.ingredients.current_stock —
  // the count IS the new reality.
  for (const l of validLines) {
    await supabase
      .from('ingredients')
      .update({ current_stock: l.counted_quantity })
      .eq('id', l.ingredient_id);
  }

  await supabase
    .from('stock_takes')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      variance_total_value: Math.round(varianceTotal * 100) / 100,
      notes: notes.trim().length > 0 ? notes.trim() : null,
    })
    .eq('id', takeId);

  revalidatePath('/stock-suppliers');
  revalidatePath('/stock-suppliers/the-bank');
  revalidatePath('/stock-suppliers/stock-count');
  revalidatePath('/stock-suppliers/stock-count/' + takeId);
  revalidatePath('/bartender/back-bar');
  revalidatePath('/bartender/back-bar/cellar');
  revalidatePath('/bartender/back-bar/stock-take');
  revalidatePath('/bartender/back-bar/stock-take/' + takeId);
  redirect('/stock-suppliers/stock-count/' + takeId + '?completed=1');
}

export async function cancelStockCountAction(takeId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  await supabase
    .from('stock_takes')
    .update({ status: 'cancelled' })
    .eq('id', takeId)
    .eq('status', 'in_progress');
  revalidatePath('/stock-suppliers/stock-count');
  revalidatePath('/bartender/back-bar/stock-take');
  redirect('/stock-suppliers/stock-count');
}
