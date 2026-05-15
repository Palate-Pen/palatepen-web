import { getShellContext } from '@/lib/shell/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { IngredientForm, type SupplierOption } from '../IngredientForm';

export const metadata = { title: 'Add to The Bank — Palatable' };

export default async function NewBankIngredientPage() {
  const ctx = await getShellContext();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('suppliers')
    .select('id, name')
    .eq('site_id', ctx.siteId)
    .order('name', { ascending: true });
  const suppliers: SupplierOption[] = (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
  }));

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[800px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        The Bank · Add ingredient
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
        <em className="text-gold font-semibold not-italic">Add</em> an ingredient
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-8">
        For things you buy that haven't come through a scanned invoice yet. Link to a supplier so the system can keep track when prices move.
      </p>

      <IngredientForm mode="create" suppliers={suppliers} />
    </div>
  );
}
