'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AllergenState } from '@/lib/allergens';

export type IngredientFormInput = {
  name: string;
  supplier_id: string | null;
  spec: string | null;
  unit: string | null;
  category: string | null;
  current_price: number | null;
  allergens: AllergenState;
};

export type PriceUpdateInput = {
  ingredientId: string;
  newPrice: number;
  reason: string | null;
};

type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

function validate(input: IngredientFormInput): string | null {
  if (!input.name.trim()) return 'name_required';
  if (
    input.current_price != null &&
    (input.current_price < 0 || !Number.isFinite(input.current_price))
  ) {
    return 'invalid_price';
  }
  return null;
}

/**
 * Create a Bank ingredient. The chef uses this when they want to track
 * something before an invoice arrives (or for things they buy by hand
 * and never get a scanned invoice for — herbs from the corner shop,
 * etc.). If a current_price is supplied it also writes an opening
 * ingredient_price_history row tagged source='manual' so the sparkline
 * has a starting point.
 */
export async function createIngredient(
  input: IngredientFormInput,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const validation = validate(input);
  if (validation) return { ok: false, error: validation };

  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id, role')
    .eq('user_id', user.id)
    .limit(1);
  const membership = memberships?.[0];
  if (!membership) return { ok: false, error: 'no_membership' };
  const siteId = membership.site_id as string;

  const now = new Date().toISOString();
  const { data: newRow, error: insErr } = await supabase
    .from('ingredients')
    .insert({
      site_id: siteId,
      supplier_id: input.supplier_id,
      name: input.name.trim(),
      spec: input.spec?.trim() || null,
      unit: input.unit?.trim() || null,
      category: input.category?.trim() || null,
      current_price: input.current_price,
      last_seen_at: input.current_price != null ? now : null,
      allergens: input.allergens as unknown as object,
    })
    .select('id')
    .single();
  if (insErr || !newRow) {
    return { ok: false, error: insErr?.message ?? 'insert_failed' };
  }
  const ingredientId = newRow.id as string;

  if (input.current_price != null) {
    await supabase.from('ingredient_price_history').insert({
      ingredient_id: ingredientId,
      price: input.current_price,
      source: 'manual',
      recorded_at: now,
      notes: 'Opening price',
    });
  }

  revalidatePath('/stock-suppliers/the-bank');
  revalidatePath('/stock-suppliers');
  return { ok: true, id: ingredientId };
}

/**
 * Update name / spec / unit / category / supplier. Price changes go
 * through updateIngredientPrice so the history table picks them up.
 */
export async function updateIngredient(
  ingredientId: string,
  input: Omit<IngredientFormInput, 'current_price'>,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  if (!input.name.trim()) return { ok: false, error: 'name_required' };

  const { error } = await supabase
    .from('ingredients')
    .update({
      supplier_id: input.supplier_id,
      name: input.name.trim(),
      spec: input.spec?.trim() || null,
      unit: input.unit?.trim() || null,
      category: input.category?.trim() || null,
      allergens: input.allergens as unknown as object,
    })
    .eq('id', ingredientId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/stock-suppliers/the-bank');
  revalidatePath(`/stock-suppliers/the-bank/${ingredientId}`);
  revalidatePath('/stock-suppliers');
  revalidatePath('/recipes');
  revalidatePath('/margins');
  return { ok: true, id: ingredientId };
}

/**
 * Manually update an ingredient's price. Writes to
 * ingredient_price_history with source='manual' so the sparkline +
 * detectors see it, sets current_price + last_seen_at on the
 * ingredient row, and revalidates the surfaces that read live cost
 * (Bank, Recipes, Margins, Hub).
 *
 * Reason is optional — when present it gets stored on the history row's
 * notes column for audit ("supplier called, raised lamb prices 15%").
 */
export async function updateIngredientPrice(
  input: PriceUpdateInput,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  if (!Number.isFinite(input.newPrice) || input.newPrice < 0) {
    return { ok: false, error: 'invalid_price' };
  }

  const now = new Date().toISOString();
  const price = Math.round(input.newPrice * 100) / 100;

  const { error: histErr } = await supabase
    .from('ingredient_price_history')
    .insert({
      ingredient_id: input.ingredientId,
      price,
      source: 'manual',
      recorded_at: now,
      notes: input.reason?.trim() || null,
    });
  if (histErr) return { ok: false, error: histErr.message };

  const { error: updErr } = await supabase
    .from('ingredients')
    .update({
      current_price: price,
      last_seen_at: now,
    })
    .eq('id', input.ingredientId);
  if (updErr) return { ok: false, error: updErr.message };

  revalidatePath('/stock-suppliers/the-bank');
  revalidatePath(`/stock-suppliers/the-bank/${input.ingredientId}`);
  revalidatePath('/stock-suppliers');
  revalidatePath('/recipes');
  revalidatePath('/margins');
  return { ok: true, id: input.ingredientId };
}
