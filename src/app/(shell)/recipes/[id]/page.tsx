import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRecipe, type RecipeIngredient } from '@/lib/recipes';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { ALLERGENS } from '@/lib/allergens';
import { aggregateRecipeNutrition } from '@/lib/nutrition';
import { NutritionDisplay } from '@/components/nutrition/NutritionDisplay';
import { ComplianceCheck } from './ComplianceCheck';

export const metadata = { title: 'Recipe — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});
const qtyFmt = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 3 });
const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const DRIFT_THRESHOLD = 0.03;

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const driftPct =
    recipe.cost_baseline != null && recipe.cost_baseline > 0 && recipe.cost_per_cover != null
      ? (recipe.cost_per_cover - recipe.cost_baseline) / recipe.cost_baseline
      : null;
  const drifting = driftPct != null && Math.abs(driftPct) > DRIFT_THRESHOLD;
  const gpPct =
    recipe.sell_price != null && recipe.cost_per_cover != null && recipe.sell_price > 0
      ? ((recipe.sell_price - recipe.cost_per_cover) / recipe.sell_price) * 100
      : null;
  const matched =
    recipe.ingredients.length > 0 &&
    recipe.matched_ingredient_count === recipe.ingredients.length;
  const partial = !matched && recipe.matched_ingredient_count > 0;
  const unmatched = recipe.ingredients.length - recipe.matched_ingredient_count;
  const nutritionSummary = aggregateRecipeNutrition(
    recipe.ingredients.map((i) => ({
      qty: i.qty,
      unit: i.unit,
      nutrition: i.nutrition,
    })),
    recipe.serves,
    recipe.portion_per_cover,
  );

  return (
    <div className="px-14 pt-12 pb-20 max-w-[1200px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Recipes · Detail
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
        {recipe.name}
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-8">
        {subtitle(recipe, drifting, driftPct, matched, partial, unmatched)}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Cost / Cover"
          value={
            recipe.cost_per_cover != null
              ? gbp.format(recipe.cost_per_cover)
              : '—'
          }
          sub={
            recipe.cost_baseline != null
              ? `costed at ${gbp.format(recipe.cost_baseline)}`
              : 'no baseline yet'
          }
          tone={drifting ? 'attention' : undefined}
        />
        <KpiCard
          label="Sell Price"
          value={recipe.sell_price != null ? gbp.format(recipe.sell_price) : '—'}
          sub={
            recipe.sell_price == null
              ? 'not set yet'
              : recipe.menu_section
                ? `on ${recipe.menu_section}`
                : 'menu price'
          }
        />
        <KpiCard
          label="GP Margin"
          value={gpPct != null ? `${gpPct.toFixed(0)}%` : '—'}
          sub={
            gpPct == null
              ? 'needs sell price + cost'
              : gpPct >= 65
                ? 'healthy'
                : gpPct >= 55
                  ? 'workable'
                  : 'thin'
          }
          tone={
            gpPct != null && gpPct >= 65
              ? 'healthy'
              : gpPct != null && gpPct < 55
                ? 'urgent'
                : gpPct != null
                  ? 'attention'
                  : undefined
          }
        />
        <KpiCard
          label="Bank Match"
          value={`${recipe.matched_ingredient_count}/${recipe.ingredients.length}`}
          sub={
            matched
              ? 'all linked'
              : unmatched > 0
                ? `${unmatched} free-text`
                : 'no ingredients yet'
          }
          tone={
            matched ? 'healthy' : partial ? 'attention' : recipe.ingredients.length > 0 ? 'urgent' : undefined
          }
        />
      </div>

      {drifting && recipe.cost_baseline != null && recipe.cost_per_cover != null && (
        <div className="mb-10 bg-card border border-rule border-l-4 border-l-attention px-7 py-6">
          <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-attention mb-2">
            Cost has drifted
          </div>
          <p className="font-serif italic text-base text-ink-soft leading-relaxed">
            This recipe was costed{' '}
            {recipe.costed_at
              ? `on ${dateFmt.format(new Date(recipe.costed_at))} at ${gbp.format(recipe.cost_baseline)}`
              : `at ${gbp.format(recipe.cost_baseline)}`}
            . Live cost is now {gbp.format(recipe.cost_per_cover)} —{' '}
            <strong className="not-italic font-semibold text-ink">
              {(driftPct! * 100).toFixed(1)}%{' '}
              {driftPct! > 0 ? 'up' : 'down'}
            </strong>
            . Worth reviewing the sell price or the recipe.
          </p>
        </div>
      )}

      <section className="mt-10">
        <div className="flex items-baseline justify-between mb-6 pb-3 border-b border-rule flex-wrap gap-3">
          <div className="flex items-baseline gap-4">
            <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold">
              Allergens
            </div>
            <div className="font-serif italic text-sm text-muted">
              {recipe.allergens.contains.length === 0 &&
              recipe.allergens.mayContain.length === 0
                ? 'none declared'
                : `${recipe.allergens.contains.length} contains · ${recipe.allergens.mayContain.length} may`}
            </div>
          </div>
          <ComplianceCheck
            recipeName={recipe.name}
            ingredientCount={recipe.ingredients.length}
            matchedIngredientCount={recipe.matched_ingredient_count}
            allergens={recipe.allergens}
          />
        </div>
        {recipe.allergens.contains.length === 0 &&
        recipe.allergens.mayContain.length === 0 ? (
          <div className="bg-card border border-rule px-10 py-8 text-center">
            <p className="font-serif italic text-muted">
              No allergens declared. Edit the recipe to capture the UK FIR mandatory 14.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-rule px-7 py-6">
            {recipe.allergens.contains.length > 0 && (
              <div className="mb-4">
                <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-urgent mb-2">
                  Contains
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {recipe.allergens.contains.map((k) => {
                    const a = ALLERGENS.find((x) => x.key === k);
                    return (
                      <span
                        key={k}
                        className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-2.5 py-1 bg-urgent/10 text-urgent border border-urgent/40"
                      >
                        {a?.short ?? k.toUpperCase()} · {a?.label ?? k}
                      </span>
                    );
                  })}
                </div>
                {recipe.allergens.nutTypes.length > 0 && (
                  <div className="font-serif italic text-xs text-muted">
                    Specific tree nuts: {recipe.allergens.nutTypes.join(', ')}
                  </div>
                )}
                {recipe.allergens.glutenTypes.length > 0 && (
                  <div className="font-serif italic text-xs text-muted">
                    Specific cereals: {recipe.allergens.glutenTypes.join(', ')}
                  </div>
                )}
              </div>
            )}
            {recipe.allergens.mayContain.length > 0 && (
              <div>
                <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-attention mb-2">
                  May contain (cross-contamination)
                </div>
                <div className="flex flex-wrap gap-2">
                  {recipe.allergens.mayContain.map((k) => {
                    const a = ALLERGENS.find((x) => x.key === k);
                    return (
                      <span
                        key={k}
                        className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-2.5 py-1 bg-attention/10 text-attention border border-attention/40 border-dashed"
                      >
                        {a?.short ?? k.toUpperCase()} · {a?.label ?? k}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="mt-10">
        <SectionHead
          title="Ingredients"
          meta={`${recipe.ingredients.length} ${recipe.ingredients.length === 1 ? 'line' : 'lines'} · ${matched ? 'all linked to The Bank' : `${unmatched} free-text`}`}
        />
        {recipe.ingredients.length === 0 ? (
          <div className="bg-card border border-rule px-10 py-10 text-center">
            <p className="font-serif italic text-muted">
              No ingredients yet. Link some to The Bank and the costing flows automatically.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-rule">
            <div className="hidden md:grid grid-cols-[2fr_100px_100px_110px_110px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
              {['Ingredient', 'Qty', 'Unit price', 'Line cost', 'Bank link'].map((h) => (
                <div key={h} className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted">
                  {h}
                </div>
              ))}
            </div>
            {recipe.ingredients.map((ing, i) => (
              <IngredientLine key={ing.id} ing={ing} last={i === recipe.ingredients.length - 1} />
            ))}
            <div className="grid grid-cols-1 md:grid-cols-[2fr_100px_100px_110px_110px] gap-4 px-7 py-4 bg-paper-warm border-t border-rule">
              <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-muted">
                Total
              </div>
              <div />
              <div />
              <div className="font-serif font-semibold text-base text-ink">
                {gbp.format(recipe.total_cost)}
              </div>
              <div className="font-serif italic text-xs text-muted">
                {recipe.serves != null && recipe.portion_per_cover != null
                  ? `${recipe.portion_per_cover}/cover · serves ${recipe.serves}`
                  : 'set serves + portion to get cost/cover'}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="mt-10">
        <SectionHead
          title="Method"
          meta={
            recipe.method.length === 0
              ? 'no method captured yet'
              : `${recipe.method.length} ${recipe.method.length === 1 ? 'step' : 'steps'}`
          }
        />
        {recipe.method.length === 0 ? (
          <div className="bg-card border border-rule px-10 py-10 text-center">
            <p className="font-serif italic text-muted">
              No method yet. Edit the recipe to add numbered steps.
            </p>
          </div>
        ) : (
          <ol className="bg-card border border-rule">
            {recipe.method.map((step, i) => (
              <li
                key={i}
                className={
                  'grid grid-cols-[60px_1fr] gap-4 px-7 py-4 items-start ' +
                  (i === recipe.method.length - 1 ? '' : 'border-b border-rule-soft')
                }
              >
                <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
                  Step {i + 1}
                </div>
                <p className="font-serif text-base text-ink-soft leading-relaxed">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mt-10">
        <SectionHead
          title="Nutrition"
          meta={
            nutritionSummary.hasData
              ? `per portion + per 100g · ${nutritionSummary.coveragePct.toFixed(0)}% coverage`
              : 'no nutrition data yet'
          }
        />
        <NutritionDisplay summary={nutritionSummary} />
      </section>

      {recipe.notes && (
        <section className="mt-10">
          <SectionHead title="Notes" meta="chef notes" />
          <div className="bg-card border border-rule px-7 py-6">
            <p className="font-serif italic text-base text-ink-soft leading-relaxed whitespace-pre-wrap">
              {recipe.notes}
            </p>
          </div>
        </section>
      )}

      <div className="mt-10 flex items-center justify-between gap-3 flex-wrap">
        <Link
          href="/recipes"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
        >
          ← Back to Recipes
        </Link>
        <Link
          href={`/recipes/${recipe.id}/edit`}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors"
        >
          Edit recipe →
        </Link>
      </div>
    </div>
  );
}

function subtitle(
  recipe: NonNullable<Awaited<ReturnType<typeof getRecipe>>>,
  drifting: boolean,
  driftPct: number | null,
  matched: boolean,
  partial: boolean,
  unmatched: number,
): string {
  const section = recipe.menu_section ? `${recipe.menu_section} · ` : '';
  const serves =
    recipe.serves != null && recipe.portion_per_cover != null
      ? `serves ${recipe.serves} · ${recipe.portion_per_cover} per cover`
      : recipe.serves != null
        ? `serves ${recipe.serves}`
        : null;
  const bits: string[] = [];
  if (serves) bits.push(serves);
  if (drifting && driftPct != null) {
    bits.push(`live cost has drifted ${(driftPct * 100).toFixed(1)}% from baseline`);
  } else if (matched) {
    bits.push('all ingredients linked to The Bank · costing live');
  } else if (partial) {
    bits.push(`${unmatched} ingredients still free-text · partial Bank match`);
  }
  return section + bits.join('. ') + '.';
}

function IngredientLine({
  ing,
  last,
}: {
  ing: RecipeIngredient;
  last: boolean;
}) {
  const linked = ing.ingredient_id != null;
  return (
    <div
      className={
        'grid grid-cols-1 md:grid-cols-[2fr_100px_100px_110px_110px] gap-4 px-7 py-4 items-center ' +
        (last ? '' : 'border-b border-rule-soft')
      }
    >
      <div className="font-serif font-semibold text-base text-ink">
        {ing.name}
      </div>
      <div className="font-serif text-sm text-ink">
        {qtyFmt.format(ing.qty)} {ing.unit}
      </div>
      <div className="font-serif text-sm text-ink">
        {ing.current_price != null ? gbp.format(ing.current_price) : '—'}
      </div>
      <div className="font-serif font-semibold text-sm text-ink">
        {ing.line_cost != null ? gbp.format(ing.line_cost) : '—'}
      </div>
      <div>
        {linked ? (
          <span className="inline-flex items-center gap-1.5 font-display text-xs font-semibold tracking-[0.18em] uppercase text-healthy">
            <span className="w-1.5 h-1.5 rounded-full bg-healthy" />
            Linked
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-display text-xs font-semibold tracking-[0.18em] uppercase text-muted-soft">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-soft" />
            Free-text
          </span>
        )}
      </div>
    </div>
  );
}
