import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getShellContext } from '@/lib/shell/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { IngredientForm, type SupplierOption } from '../IngredientForm';
import { PriceUpdateForm } from '../PriceUpdateForm';
import { parseAllergens } from '@/lib/allergens';

export const metadata = { title: 'Bank ingredient — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});
const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export default async function BankIngredientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getShellContext();
  const supabase = await createSupabaseServerClient();

  const [
    { data: ingredient },
    { data: history },
    { data: suppliers },
    { data: recipeLinks },
  ] = await Promise.all([
    supabase
      .from('ingredients')
      .select(
        'id, site_id, supplier_id, name, spec, unit, category, current_price, last_seen_at, allergens, suppliers:supplier_id (name)',
      )
      .eq('id', id)
      .single(),
    supabase
      .from('ingredient_price_history')
      .select('id, price, source, recorded_at, notes')
      .eq('ingredient_id', id)
      .order('recorded_at', { ascending: false })
      .limit(20),
    supabase
      .from('suppliers')
      .select('id, name')
      .eq('site_id', ctx.siteId)
      .order('name', { ascending: true }),
    supabase
      .from('recipe_ingredients')
      .select('id, qty, unit, recipes:recipe_id (id, name, menu_section)')
      .eq('ingredient_id', id),
  ]);

  if (!ingredient) notFound();
  const ing = ingredient as unknown as {
    id: string;
    site_id: string;
    supplier_id: string | null;
    name: string;
    spec: string | null;
    unit: string | null;
    category: string | null;
    current_price: number | null;
    last_seen_at: string | null;
    allergens: unknown;
    suppliers: { name: string } | null;
  };
  const allergens = parseAllergens(ing.allergens);

  if (ing.site_id !== ctx.siteId) notFound();

  const supplierOptions: SupplierOption[] = (suppliers ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
  }));

  const historyRows = (history ?? []) as Array<{
    id: string;
    price: number;
    source: string;
    recorded_at: string;
    notes: string | null;
  }>;

  const recipeRows = (recipeLinks ?? []) as unknown as Array<{
    id: string;
    qty: number;
    unit: string;
    recipes: { id: string; name: string; menu_section: string | null } | null;
  }>;

  // Movement over the last 30 days
  const thirtyAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const oldEnough = historyRows
    .filter((h) => new Date(h.recorded_at) <= thirtyAgo)
    .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))[0];
  const baseline = oldEnough?.price ?? historyRows.at(-1)?.price ?? null;
  const movementPct =
    baseline != null && baseline > 0 && ing.current_price != null
      ? ((ing.current_price - baseline) / baseline) * 100
      : null;
  const movementUp = movementPct != null && movementPct > 0.5;
  const movementDown = movementPct != null && movementPct < -0.5;
  const movementTone = movementUp
    ? 'attention'
    : movementDown
      ? 'healthy'
      : undefined;

  return (
    <div className="px-14 pt-12 pb-20 max-w-[1100px]">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        The Bank · Detail
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
        {ing.name}
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-8">
        {subtitle(ing)}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Current Price"
          value={
            ing.current_price != null
              ? `${gbp.format(ing.current_price)}${ing.unit ? ` / ${ing.unit}` : ''}`
              : '—'
          }
          sub={
            ing.last_seen_at
              ? `last seen ${dateFmt.format(new Date(ing.last_seen_at))}`
              : 'no price yet'
          }
        />
        <KpiCard
          label="30-day Movement"
          value={
            movementPct == null
              ? '—'
              : `${movementPct >= 0 ? '+' : ''}${movementPct.toFixed(1)}%`
          }
          sub={
            movementPct == null
              ? 'not enough history yet'
              : Math.abs(movementPct) < 0.5
                ? 'steady'
                : movementUp
                  ? 'creeping up'
                  : 'on the way down'
          }
          tone={movementTone}
        />
        <KpiCard
          label="Supplier"
          value={ing.suppliers?.name ?? '—'}
          sub={ing.category ?? 'no category set'}
        />
        <KpiCard
          label="Used In"
          value={String(recipeRows.length)}
          sub={
            recipeRows.length === 0
              ? 'not on any recipe'
              : `${recipeRows.length === 1 ? 'recipe' : 'recipes'} affected when price moves`
          }
          tone={recipeRows.length > 0 ? undefined : undefined}
        />
      </div>

      <section className="mb-10">
        <SectionHead title="Update the price" meta="manual entry · writes to history" />
        <PriceUpdateForm
          ingredientId={ing.id}
          currentPrice={ing.current_price}
          unit={ing.unit}
        />
      </section>

      <section className="mb-10">
        <SectionHead
          title="Price history"
          meta={`${historyRows.length} ${historyRows.length === 1 ? 'entry' : 'entries'}`}
        />
        {historyRows.length === 0 ? (
          <div className="bg-card border border-rule px-10 py-10 text-center">
            <p className="font-serif italic text-muted">
              No history yet. Once you save a price or scan an invoice with this ingredient, the entries land here.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-rule">
            <div className="hidden md:grid grid-cols-[180px_120px_120px_1fr] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
              {['Recorded', 'Price', 'Source', 'Notes'].map((h) => (
                <div key={h} className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted">
                  {h}
                </div>
              ))}
            </div>
            {historyRows.map((h, i) => (
              <div
                key={h.id}
                className={
                  'grid grid-cols-1 md:grid-cols-[180px_120px_120px_1fr] gap-4 px-7 py-3 items-center ' +
                  (i === historyRows.length - 1 ? '' : 'border-b border-rule-soft')
                }
              >
                <div className="font-serif text-sm text-ink">
                  {dateFmt.format(new Date(h.recorded_at))}
                </div>
                <div className="font-serif font-semibold text-base text-ink">
                  {gbp.format(h.price)}
                </div>
                <div>
                  <span className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase px-2 py-1 border border-rule rounded-sm text-muted">
                    {h.source}
                  </span>
                </div>
                <div className="font-serif italic text-sm text-muted truncate">
                  {h.notes ?? '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {recipeRows.length > 0 && (
        <section className="mb-10">
          <SectionHead
            title="Used in"
            meta={`${recipeRows.length} ${recipeRows.length === 1 ? 'recipe' : 'recipes'}`}
          />
          <div className="bg-card border border-rule">
            {recipeRows.map((r, i) => (
              <Link
                key={r.id}
                href={r.recipes ? `/recipes/${r.recipes.id}` : '#'}
                className={
                  'grid grid-cols-1 md:grid-cols-[2fr_120px_120px] gap-4 px-7 py-4 items-center hover:bg-paper-warm transition-colors ' +
                  (i === recipeRows.length - 1 ? '' : 'border-b border-rule-soft')
                }
              >
                <div className="font-serif font-semibold text-base text-ink">
                  {r.recipes?.name ?? '—'}
                </div>
                <div className="font-serif italic text-sm text-muted">
                  {r.recipes?.menu_section ?? '—'}
                </div>
                <div className="font-serif text-sm text-ink">
                  {r.qty} {r.unit} per dish
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <SectionHead title="Edit details" meta="name · supplier · spec · unit · allergens" />
        <IngredientForm
          mode="edit"
          ingredientId={ing.id}
          initial={{
            name: ing.name,
            supplier_id: ing.supplier_id,
            spec: ing.spec,
            unit: ing.unit,
            category: ing.category,
            current_price: ing.current_price,
            allergens,
          }}
          suppliers={supplierOptions}
        />
      </section>

      <div className="flex items-center gap-3">
        <Link
          href="/stock-suppliers/the-bank"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
        >
          ← Back to The Bank
        </Link>
      </div>
    </div>
  );
}

function subtitle(ing: {
  spec: string | null;
  category: string | null;
  unit: string | null;
}): string {
  const parts: string[] = [];
  if (ing.spec) parts.push(ing.spec);
  if (ing.category) parts.push(ing.category);
  if (ing.unit) parts.push(`priced per ${ing.unit}`);
  if (parts.length === 0) return 'Tracked ingredient. Update the price or edit details below.';
  return parts.join(' · ');
}
