'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Save the sell price found via the what-if slider on /margins/[id].
 *
 * Updates recipes.sell_price AND re-anchors cost_baseline + costed_at
 * to the current live cost-per-cover. The re-anchor is important: the
 * staleness + cost-spike detectors key off cost_baseline, so when a
 * chef accepts a new price they're effectively saying "this is the
 * cost-and-price snapshot I'm pricing against, drift from here." If
 * we left cost_baseline alone, the new price would immediately look
 * drifted by the same amount as before.
 *
 * The caller passes the current cost-per-cover from the panel so we
 * don't have to recompute it server-side (it's already computed via
 * getRecipe() on the page that owns this slider).
 */
export async function saveRecipeSellPrice(input: {
  recipeId: string;
  sellPrice: number;
  costPerCoverNow: number;
}): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  if (!Number.isFinite(input.sellPrice) || input.sellPrice <= 0) {
    return { ok: false, error: 'invalid_price' };
  }
  if (!Number.isFinite(input.costPerCoverNow) || input.costPerCoverNow < 0) {
    return { ok: false, error: 'invalid_cost' };
  }
  if (input.sellPrice <= input.costPerCoverNow) {
    return { ok: false, error: 'price_below_cost' };
  }

  // Round to 2dp so we don't store £18.49999 from a slider step
  // calculation. The slider already uses 0.25 increments, but the
  // suggested-target snap can produce fractional values.
  const sellPrice = Math.round(input.sellPrice * 100) / 100;
  const baseline = Math.round(input.costPerCoverNow * 100) / 100;

  const { error } = await supabase
    .from('recipes')
    .update({
      sell_price: sellPrice,
      cost_baseline: baseline,
      costed_at: new Date().toISOString(),
    })
    .eq('id', input.recipeId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/margins');
  revalidatePath(`/margins/${input.recipeId}`);
  revalidatePath('/recipes');
  revalidatePath(`/recipes/${input.recipeId}`);
  return { ok: true };
}
