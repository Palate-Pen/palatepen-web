import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getRecipes, type Recipe } from '@/lib/recipes';
import { BAR_DISH_TYPES, FOOD_DISH_TYPES } from '@/lib/bar';
import { gpToneFor } from '@/lib/gp';
import {
  quadrantFor,
  gpPctFromRecipe,
  type MenuPlan,
  type MenuPlanItem,
  type MenuPlanSurface,
  type MenuPlanStatus,
  type MenuPlanAction,
} from '@/lib/menu-plan-shared';

// Re-export shared types + utils for convenience so existing callers
// that import from '@/lib/menu-plan' keep working.
export * from '@/lib/menu-plan-shared';

/**
 * Get the active draft plan for a site + surface, or null if none.
 * Server-only — uses next/headers cookies via createSupabaseServerClient.
 * The pure types / KPI / Looking Ahead derivations live in
 * menu-plan-shared.ts so client components can pull them safely.
 */
export async function getActiveMenuPlan(
  siteId: string,
  surface: MenuPlanSurface,
): Promise<MenuPlan | null> {
  const supabase = await createSupabaseServerClient();
  const { data: plan } = await supabase
    .from('menu_plans')
    .select('id, site_id, surface, name, target_launch, status, notes, created_at, finalised_at, archived_at')
    .eq('site_id', siteId)
    .eq('surface', surface)
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!plan) return null;

  const { data: itemRows } = await supabase
    .from('menu_plan_items')
    .select('id, recipe_id, placeholder_name, action, popularity_rating, notes, position')
    .eq('plan_id', plan.id)
    .order('position', { ascending: true });

  const dishTypes = surface === 'bar' ? BAR_DISH_TYPES : FOOD_DISH_TYPES;
  const recipes = await getRecipes(siteId, { dishTypes });
  const recipeById = new Map<string, Recipe>(recipes.map((r) => [r.id, r]));

  const items: MenuPlanItem[] = (itemRows ?? []).map((row) => {
    const recipe = row.recipe_id
      ? recipeById.get(row.recipe_id as string) ?? null
      : null;
    const gp = recipe ? gpPctFromRecipe(recipe) : null;
    const rating = (row.popularity_rating as number | null) ?? null;
    return {
      id: row.id as string,
      recipe_id: (row.recipe_id as string | null) ?? null,
      recipe,
      placeholder_name: (row.placeholder_name as string | null) ?? null,
      action: row.action as MenuPlanAction,
      popularity_rating: rating,
      notes: (row.notes as string | null) ?? null,
      position: row.position as number,
      display_name:
        recipe?.name ?? (row.placeholder_name as string | null) ?? 'Untitled',
      gp_pct: gp,
      gp_tone: gpToneFor(gp),
      quadrant: quadrantFor(rating, gp),
    };
  });

  return {
    id: plan.id as string,
    site_id: plan.site_id as string,
    surface: plan.surface as MenuPlanSurface,
    name: plan.name as string,
    target_launch: (plan.target_launch as string | null) ?? null,
    status: plan.status as MenuPlanStatus,
    notes: (plan.notes as string | null) ?? null,
    created_at: plan.created_at as string,
    finalised_at: (plan.finalised_at as string | null) ?? null,
    items,
  };
}
