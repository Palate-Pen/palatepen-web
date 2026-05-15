import { getShellContext } from '@/lib/shell/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  RecipeForm,
  type BankIngredientOption,
} from '@/app/(shell)/recipes/RecipeForm';

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

      <RecipeForm
        mode="create"
        bankIngredients={bankIngredients}
        defaultDishType="cocktail"
        redirectOnSave={(id) => `/bartender/specs/${id}`}
      />
    </div>
  );
}
