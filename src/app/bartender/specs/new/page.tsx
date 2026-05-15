import { getShellContext } from '@/lib/shell/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { BankIngredientOption, SubRecipeOption } from '@/app/(shell)/recipes/RecipeForm';
import { NewRecipeClient } from '@/app/(shell)/recipes/new/NewRecipeClient';
import { BAR_DISH_TYPES } from '@/lib/bar';

export const metadata = { title: 'New spec — Bar — Palatable' };

export default async function NewSpecPage() {
  const ctx = await getShellContext();
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
    .order('name', { ascending: true });
  const subRecipeOptions: SubRecipeOption[] = (subs ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    menu_section: (r.menu_section as string | null) ?? null,
  }));

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[900px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Specs · New
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
        <em className="text-gold font-semibold not-italic">Add</em> a spec
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-8">
        Pour-cost flows the moment build components link to the Cellar. You can leave the sell price blank and set it later.
      </p>

      <NewRecipeClient
        bankIngredients={bankIngredients}
        subRecipeOptions={subRecipeOptions}
        defaultDishType="cocktail"
        redirectOnSave={(id) => `/bartender/specs/${id}`}
        importLabel="Import a cocktail spec from a URL"
        importBody="Paste any cocktail recipe page — Diffords Guide, Imbibe, Punch, a blog. Haiku reads it and pre-fills the spec form below. Review the pour sizes and the glass before saving."
      />
    </div>
  );
}
