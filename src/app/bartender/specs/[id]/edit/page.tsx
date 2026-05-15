import { notFound } from 'next/navigation';
import { getShellContext } from '@/lib/shell/context';
import { getRecipe } from '@/lib/recipes';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  RecipeForm,
  type BankIngredientOption,
  type SubRecipeOption,
} from '@/app/(shell)/recipes/RecipeForm';
import { BAR_DISH_TYPES } from '@/lib/bar';

export const metadata = { title: 'Edit spec — Bar — Palatable' };

export default async function EditSpecPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getShellContext();
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('ingredients')
    .select('id, name, unit, current_price')
    .eq('site_id', ctx.siteId)
    .order('name', { ascending: true });

  const bankIngredients: BankIngredientOption[] = (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    unit: (row.unit as string | null) ?? null,
    current_price:
      row.current_price == null ? null : Number(row.current_price),
  }));

  const { data: subs } = await supabase
    .from('recipes')
    .select('id, name, menu_section')
    .eq('site_id', ctx.siteId)
    .is('archived_at', null)
    .in('dish_type', BAR_DISH_TYPES)
    .neq('id', recipe.id)
    .order('name', { ascending: true });
  const subRecipeOptions: SubRecipeOption[] = (subs ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    menu_section: (r.menu_section as string | null) ?? null,
  }));

  const initial = {
    name: recipe.name,
    menu_section: recipe.menu_section,
    serves: recipe.serves,
    portion_per_cover: recipe.portion_per_cover,
    sell_price: recipe.sell_price,
    notes: recipe.notes,
    allergens: recipe.allergens,
    locked: recipe.locked,
    method: recipe.method,
    tags: recipe.tags,
    photo_url: recipe.photo_url,
    dish_type: recipe.dish_type,
    glass_type: recipe.glass_type,
    ice_type: recipe.ice_type,
    technique: recipe.technique,
    pour_ml: recipe.pour_ml,
    garnish: recipe.garnish,
    ingredients: recipe.ingredients.map((i) => ({
      name: i.name,
      qty: i.qty,
      unit: i.unit,
      ingredient_id: i.ingredient_id,
      sub_recipe_id: i.sub_recipe_id,
    })),
  };

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[900px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Specs · Edit
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
        Edit{' '}
        <em className="text-gold font-semibold not-italic">{recipe.name}</em>
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-8">
        Tweak the build, glass, technique, or sell price. Saved changes flow into Margins and the Cellar immediately.
      </p>

      <RecipeForm
        mode="edit"
        recipeId={recipe.id}
        initial={initial}
        bankIngredients={bankIngredients}
        siteId={ctx.siteId}
        redirectOnSave={(id) => `/bartender/specs/${id}`}
      />
    </div>
  );
}
