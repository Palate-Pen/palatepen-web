import { getShellContext } from '@/lib/shell/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { BankIngredientOption, SubRecipeOption } from '../RecipeForm';
import { NewRecipeClient } from './NewRecipeClient';
import { FOOD_DISH_TYPES } from '@/lib/bar';

export const metadata = { title: 'New recipe — Palatable' };

/**
 * New recipe page. Loads two reference datasets so the form can do
 * its work:
 *   - bankIngredients: every Bank entry on the site, for the
 *     ingredient-name autocomplete + price look-up.
 *   - subRecipeOptions: other food recipes on the site, for the
 *     sub-recipe row variant.
 *
 * Both are wrapped in try/catch so a single failed query never blanks
 * the page — the form mounts with empty options, the chef can still
 * type the recipe by hand.
 */
export default async function NewRecipePage() {
  const ctx = await getShellContext();
  const supabase = await createSupabaseServerClient();

  let bankIngredients: BankIngredientOption[] = [];
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .select('id, name, unit, current_price')
      .eq('site_id', ctx.siteId)
      .order('name', { ascending: true });
    if (error) {
      console.error('[recipes/new] bank fetch failed', error.code, error.message);
    } else {
      bankIngredients = (data ?? []).map((row) => ({
        id: row.id as string,
        name: row.name as string,
        unit: (row.unit as string | null) ?? null,
        current_price:
          row.current_price == null ? null : Number(row.current_price),
      }));
    }
  } catch (e) {
    console.error('[recipes/new] bank fetch threw', (e as Error).message);
  }

  let subRecipeOptions: SubRecipeOption[] = [];
  try {
    const { data: subs, error } = await supabase
      .from('recipes')
      .select('id, name, menu_section')
      .eq('site_id', ctx.siteId)
      .is('archived_at', null)
      .in('dish_type', FOOD_DISH_TYPES)
      .order('name', { ascending: true });
    if (error) {
      console.error(
        '[recipes/new] sub-recipe fetch failed',
        error.code,
        error.message,
      );
    } else {
      subRecipeOptions = (subs ?? []).map((r) => ({
        id: r.id as string,
        name: r.name as string,
        menu_section: (r.menu_section as string | null) ?? null,
      }));
    }
  } catch (e) {
    console.error('[recipes/new] sub-recipe fetch threw', (e as Error).message);
  }

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[960px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Recipes · New
      </div>
      <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] text-ink">
        <em className="text-gold font-semibold not-italic">Add</em> a dish
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-8">
        Costing flows the moment ingredients link to The Bank. You can leave the sell price blank and set it later.
      </p>

      <NewRecipeClient
        bankIngredients={bankIngredients}
        subRecipeOptions={subRecipeOptions}
      />
    </div>
  );
}
