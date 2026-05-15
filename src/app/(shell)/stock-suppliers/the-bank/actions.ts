'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AllergenState } from '@/lib/allergens';
import type { NutritionState } from '@/lib/nutrition';

export type IngredientFormInput = {
  name: string;
  supplier_id: string | null;
  spec: string | null;
  unit: string | null;
  category: string | null;
  current_price: number | null;
  allergens: AllergenState;
  nutrition: NutritionState;
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
      nutrition: input.nutrition as unknown as object,
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
      nutrition: input.nutrition as unknown as object,
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

export type BulkCreateBankInput = {
  rows: Array<{
    name: string;
    unit: string;
    current_price: number | null;
    supplier_name: string | null;
    notes: string | null;
  }>;
  default_supplier_name?: string | null;
};

/**
 * Bulk-create Bank entries from a scanned spec sheet. Matches each row's
 * supplier_name (or default) to an existing v2.suppliers row case-
 * insensitively; creates the supplier when none exists. Each ingredient
 * gets an opening price-history row tagged source='imported' so the
 * Bank sparkline has a real starting point.
 */
export async function bulkCreateBankFromSpecAction(
  input: BulkCreateBankInput,
): Promise<{ ok: true; created: number } | { ok: false; error: string }> {
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
  const siteId = memberships?.[0]?.site_id as string | undefined;
  if (!siteId) return { ok: false, error: 'no_membership' };

  // Resolve supplier names — lookup-or-create on first sight
  const supplierIdByName = new Map<string, string>();
  const allSupplierNames = new Set<string>();
  for (const r of input.rows) {
    const name = (r.supplier_name ?? input.default_supplier_name ?? '').trim();
    if (name) allSupplierNames.add(name);
  }
  if (allSupplierNames.size > 0) {
    const { data: existing } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('site_id', siteId);
    const byLower = new Map<string, string>();
    for (const s of existing ?? []) {
      byLower.set((s.name as string).toLowerCase(), s.id as string);
    }
    for (const name of allSupplierNames) {
      const hit = byLower.get(name.toLowerCase());
      if (hit) {
        supplierIdByName.set(name, hit);
      } else {
        const { data: created } = await supabase
          .from('suppliers')
          .insert({ site_id: siteId, name })
          .select('id')
          .single();
        if (created) supplierIdByName.set(name, created.id as string);
      }
    }
  }

  const now = new Date().toISOString();
  const ingredientPayload = input.rows
    .filter((r) => r.name.trim() !== '')
    .map((r) => ({
      site_id: siteId,
      supplier_id:
        supplierIdByName.get(
          (r.supplier_name ?? input.default_supplier_name ?? '').trim(),
        ) ?? null,
      name: r.name.trim(),
      unit: r.unit.trim(),
      current_price: r.current_price,
      last_seen_at: r.current_price != null ? now : null,
      spec: r.notes?.trim() || null,
    }));

  const { data: createdIngs, error } = await supabase
    .from('ingredients')
    .insert(ingredientPayload)
    .select('id, current_price');
  if (error) return { ok: false, error: error.message };

  // Opening price-history rows for ingredients that had a price
  const histPayload = (createdIngs ?? [])
    .filter((i) => i.current_price != null)
    .map((i) => ({
      ingredient_id: i.id as string,
      price: Number(i.current_price),
      source: 'imported' as const,
      recorded_at: now,
      notes: 'Spec sheet scan',
    }));
  if (histPayload.length > 0) {
    await supabase.from('ingredient_price_history').insert(histPayload);
  }

  revalidatePath('/stock-suppliers/the-bank');
  revalidatePath('/stock-suppliers');
  revalidatePath('/stock-suppliers/suppliers');
  return { ok: true, created: createdIngs?.length ?? 0 };
}

export type ParLevelInput = {
  ingredientId: string;
  parLevel: number | null;
  reorderPoint: number | null;
  currentStock: number | null;
};

/**
 * Set par-tracking fields on an ingredient — par_level (ideal stock),
 * reorder_point (trigger to reorder), current_stock (latest count).
 * Used from The Bank detail page. Null inputs clear the field.
 */
export async function updateIngredientPar(
  input: ParLevelInput,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const check = (n: number | null, label: string) =>
    n != null && (!Number.isFinite(n) || n < 0)
      ? `invalid_${label}`
      : null;
  const err =
    check(input.parLevel, 'par') ??
    check(input.reorderPoint, 'reorder') ??
    check(input.currentStock, 'stock');
  if (err) return { ok: false, error: err };

  const { error } = await supabase
    .from('ingredients')
    .update({
      par_level: input.parLevel,
      reorder_point: input.reorderPoint,
      current_stock: input.currentStock,
    })
    .eq('id', input.ingredientId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/stock-suppliers/the-bank');
  revalidatePath(`/stock-suppliers/the-bank/${input.ingredientId}`);
  revalidatePath('/stock-suppliers');
  revalidatePath('/bartender/back-bar/cellar');
  revalidatePath('/bartender');
  return { ok: true, id: input.ingredientId };
}

/**
 * Bulk auto-categorise uncategorised Bank entries on this site. Runs
 * `guessCategory(name)` for every ingredient whose category is null,
 * writes the best-fit category back, and reports the count. Idempotent
 * — re-running won't touch ingredients that already have a category
 * (so chef-corrected categories are sticky).
 */
export async function autoCategoriseBank(): Promise<
  { ok: true; categorised: number } | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { guessCategory } = await import('@/lib/categorize');

  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id')
    .eq('user_id', user.id)
    .limit(1);
  const siteId = memberships?.[0]?.site_id as string | undefined;
  if (!siteId) return { ok: false, error: 'no_membership' };

  const { data: rows } = await supabase
    .from('ingredients')
    .select('id, name, category')
    .eq('site_id', siteId)
    .is('category', null);
  if (!rows || rows.length === 0) return { ok: true, categorised: 0 };

  let updated = 0;
  for (const r of rows) {
    const guess = guessCategory(r.name as string);
    const { error } = await supabase
      .from('ingredients')
      .update({ category: guess })
      .eq('id', r.id as string);
    if (!error) updated += 1;
  }

  revalidatePath('/stock-suppliers/the-bank');
  revalidatePath('/stock-suppliers');
  return { ok: true, categorised: updated };
}
