import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getRecipes, type Recipe } from '@/lib/recipes';
import { KpiCard } from '@/components/shell/KpiCard';
import { LookingAhead } from '@/components/shell/LookingAhead';
import { AllergenChips } from '@/components/allergens/AllergenPanel';

export const metadata = { title: 'Recipes — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

const qtyFmt = new Intl.NumberFormat('en-GB', {
  maximumFractionDigits: 3,
});

const DRIFT_THRESHOLD = 0.03; // 3% drift = "needs a look"

export default async function RecipesPage() {
  const ctx = await getShellContext();
  const recipes = await getRecipes(ctx.siteId);

  const costed = recipes.filter((r) => r.cost_per_cover != null);
  const avgCpc =
    costed.length > 0
      ? costed.reduce((s, r) => s + (r.cost_per_cover ?? 0), 0) / costed.length
      : 0;
  const drifting = recipes.filter(
    (r) =>
      r.cost_baseline != null &&
      r.cost_per_cover != null &&
      r.cost_baseline > 0 &&
      Math.abs((r.cost_per_cover - r.cost_baseline) / r.cost_baseline) >
        DRIFT_THRESHOLD,
  ).length;
  const fullyMatched = recipes.filter(
    (r) =>
      r.ingredients.length > 0 &&
      r.matched_ingredient_count === r.ingredients.length,
  ).length;
  const matchPct =
    recipes.length > 0
      ? Math.round((fullyMatched / recipes.length) * 100)
      : 0;

  return (
    <div className="px-14 pt-12 pb-20 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-start gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            Your Recipe Book
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
            <em className="text-gold font-semibold not-italic">Recipes</em>
          </h1>
          <p className="font-serif italic text-lg text-muted">
            {recipes.length > 0 ? (
              <>
                {recipes.length} {recipes.length === 1 ? 'dish' : 'dishes'}. Costing pulled live from The Bank — click a dish to drill in.
              </>
            ) : (
              <>No recipes yet. Costing will be live the moment you add one.</>
            )}
          </p>
        </div>
        <Link
          href="/recipes/new"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors whitespace-nowrap"
        >
          + Add recipe
        </Link>
      </div>

      {recipes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
          <KpiCard
            label="Dishes On The Book"
            value={String(recipes.length)}
            sub={costed.length === recipes.length ? 'all costed' : `${costed.length} costed`}
          />
          <KpiCard
            label="Avg Cost / Cover"
            value={avgCpc > 0 ? `£${avgCpc.toFixed(2)}` : '—'}
            sub="live from The Bank"
          />
          <KpiCard
            label="Drifting"
            value={String(drifting)}
            sub={drifting === 0 ? 'all current' : 'price moved >3% since costed'}
            tone={drifting > 0 ? 'attention' : undefined}
          />
          <KpiCard
            label="Bank Match"
            value={`${matchPct}%`}
            sub={`${fullyMatched}/${recipes.length} fully linked`}
            tone={matchPct === 100 ? 'healthy' : matchPct >= 70 ? undefined : 'attention'}
          />
        </div>
      )}

      {recipes.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-16 text-center">
          <div className="font-serif text-2xl text-ink mb-2">
            Nothing in the recipe book yet.
          </div>
          <p className="font-serif italic text-muted">
            Add a dish — link its ingredients to The Bank — and the cost-per-cover stays current as supplier prices move.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      )}

      <LookingAhead siteId={ctx.siteId} surface="recipes" />
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const portionLabel =
    recipe.portion_per_cover != null
      ? `${recipe.portion_per_cover} ${recipe.portion_per_cover === 1 ? 'portion' : 'portions'} per cover`
      : null;
  const servesLabel = recipe.serves != null ? `Serves ${recipe.serves}` : null;
  const meta = [servesLabel, portionLabel].filter(Boolean).join(' · ');

  const allMatched =
    recipe.ingredients.length > 0 &&
    recipe.matched_ingredient_count === recipe.ingredients.length;
  const partialMatch =
    recipe.matched_ingredient_count > 0 &&
    recipe.matched_ingredient_count < recipe.ingredients.length;

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="bg-card border border-rule cursor-pointer transition-all hover:border-gold hover:shadow-[0_4px_16px_rgba(26,22,18,0.08)] flex flex-col"
    >
      <div className="px-6 py-6 border-b border-rule">
        <div className="font-serif font-semibold text-2xl text-ink leading-tight flex items-center gap-2">
          {recipe.name}
          {recipe.locked && (
            <span
              className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-gold"
              title="Locked — edits gated"
            >
              🔒
            </span>
          )}
        </div>
        {meta && (
          <div className="text-xs text-muted mt-2 tracking-[0.02em]">
            {meta}
          </div>
        )}
        {(recipe.allergens.contains.length > 0 ||
          recipe.allergens.mayContain.length > 0) && (
          <div className="mt-3">
            <AllergenChips value={recipe.allergens} size="sm" />
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-b border-rule flex justify-between items-center bg-gradient-to-r from-[rgba(93,127,79,0.06)] to-transparent">
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted">
          Cost per cover
        </div>
        <div className="text-right">
          {recipe.cost_per_cover != null ? (
            <>
              <div
                className={
                  'font-serif font-semibold text-xl ' +
                  (allMatched ? 'text-healthy' : 'text-ink-soft')
                }
              >
                {gbp.format(recipe.cost_per_cover)}
              </div>
              <div className="text-xs text-muted mt-0.5">
                total dish {gbp.format(recipe.total_cost)}
                {partialMatch && (
                  <span className="text-muted-soft italic">
                    {' '}· partial
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="font-serif italic text-sm text-muted">
              cost pending
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-5 flex-1">
        {recipe.ingredients.length === 0 ? (
          <div className="font-serif italic text-sm text-muted-soft">
            No ingredients yet.
          </div>
        ) : (
          recipe.ingredients.map((ing, i) => (
            <div
              key={ing.id}
              className={
                'flex justify-between items-baseline gap-3 py-2.5' +
                (i < recipe.ingredients.length - 1
                  ? ' border-b border-rule'
                  : '')
              }
            >
              <div className="font-serif text-sm text-ink flex-1">
                {ing.name}
              </div>
              <div className="text-xs text-muted w-20 text-right whitespace-nowrap">
                {qtyFmt.format(ing.qty)} {ing.unit}
              </div>
              <div
                className={
                  'font-serif text-xs w-16 text-right ' +
                  (ing.line_cost != null
                    ? 'text-ink-soft'
                    : 'text-muted-soft italic')
                }
              >
                {ing.line_cost != null
                  ? gbp.format(ing.line_cost)
                  : '—'}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-6 py-4 border-t border-rule bg-paper flex justify-between items-center">
        <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
          Open recipe →
        </span>
        <span className="font-serif italic text-xs text-muted">
          {recipe.matched_ingredient_count}/{recipe.ingredients.length} linked
        </span>
      </div>
    </Link>
  );
}
