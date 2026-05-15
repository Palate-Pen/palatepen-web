'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { MenuPlanSurface, MenuPlanAction } from '@/lib/menu-plan-shared';

/**
 * Get-or-create the active draft plan for a site/surface. Idempotent:
 * if a draft already exists it returns the existing id, otherwise it
 * creates one with sensible defaults (name = "Next menu", no launch
 * date yet).
 */
export async function ensureActivePlan(
  siteId: string,
  surface: MenuPlanSurface,
): Promise<{ planId: string }> {
  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from('menu_plans')
    .select('id')
    .eq('site_id', siteId)
    .eq('surface', surface)
    .eq('status', 'draft')
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return { planId: existing.id as string };

  const { data: created, error } = await supabase
    .from('menu_plans')
    .insert({
      site_id: siteId,
      surface,
      name: 'Next menu',
      status: 'draft',
    })
    .select('id')
    .single();
  if (error || !created)
    throw new Error(`ensureActivePlan: ${error?.message ?? 'no row'}`);
  return { planId: created.id as string };
}

const ALLOWED_ACTIONS: MenuPlanAction[] = ['add', 'keep', 'remove', 'revise'];

export type AddPlanItemInput = {
  planId: string;
  recipeId: string | null;
  placeholderName: string | null;
  action: MenuPlanAction;
  popularityRating: number | null;
  notes: string | null;
  revalidatePathname?: string;
};

export async function addPlanItem(
  input: AddPlanItemInput,
): Promise<{ ok: true } | { error: string }> {
  if (!ALLOWED_ACTIONS.includes(input.action)) return { error: 'invalid_action' };
  if (!input.recipeId && !input.placeholderName?.trim())
    return { error: 'no_target' };
  if (
    input.popularityRating != null &&
    (input.popularityRating < 1 || input.popularityRating > 5)
  )
    return { error: 'invalid_rating' };

  const supabase = await createSupabaseServerClient();

  const { count } = await supabase
    .from('menu_plan_items')
    .select('id', { count: 'exact', head: true })
    .eq('plan_id', input.planId);
  const nextPosition = count ?? 0;

  const { error } = await supabase.from('menu_plan_items').insert({
    plan_id: input.planId,
    recipe_id: input.recipeId,
    placeholder_name: input.placeholderName?.trim() || null,
    action: input.action,
    popularity_rating: input.popularityRating,
    notes: input.notes?.trim() || null,
    position: nextPosition,
  });
  if (error) return { error: error.message };

  if (input.revalidatePathname) revalidatePath(input.revalidatePathname);
  return { ok: true };
}

export type UpdatePlanItemInput = {
  itemId: string;
  action?: MenuPlanAction;
  popularityRating?: number | null;
  notes?: string | null;
  revalidatePathname?: string;
};

export async function updatePlanItem(
  input: UpdatePlanItemInput,
): Promise<{ ok: true } | { error: string }> {
  if (input.action && !ALLOWED_ACTIONS.includes(input.action))
    return { error: 'invalid_action' };
  if (
    input.popularityRating != null &&
    (input.popularityRating < 1 || input.popularityRating > 5)
  )
    return { error: 'invalid_rating' };

  const patch: Record<string, unknown> = {};
  if (input.action !== undefined) patch.action = input.action;
  if (input.popularityRating !== undefined)
    patch.popularity_rating = input.popularityRating;
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
  if (Object.keys(patch).length === 0) return { ok: true };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('menu_plan_items')
    .update(patch)
    .eq('id', input.itemId);
  if (error) return { error: error.message };

  if (input.revalidatePathname) revalidatePath(input.revalidatePathname);
  return { ok: true };
}

export async function deletePlanItem(
  itemId: string,
  revalidatePathname?: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('menu_plan_items')
    .delete()
    .eq('id', itemId);
  if (error) return { error: error.message };

  if (revalidatePathname) revalidatePath(revalidatePathname);
  return { ok: true };
}

export type UpdatePlanInput = {
  planId: string;
  name?: string;
  targetLaunch?: string | null;
  notes?: string | null;
  revalidatePathname?: string;
};

export async function updatePlan(
  input: UpdatePlanInput,
): Promise<{ ok: true } | { error: string }> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim() || 'Next menu';
  if (input.targetLaunch !== undefined)
    patch.target_launch = input.targetLaunch || null;
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
  if (Object.keys(patch).length === 0) return { ok: true };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('menu_plans')
    .update(patch)
    .eq('id', input.planId);
  if (error) return { error: error.message };

  if (input.revalidatePathname) revalidatePath(input.revalidatePathname);
  return { ok: true };
}
