import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getRecipes, type Recipe } from '@/lib/recipes';
import { FOOD_DISH_TYPES } from '@/lib/bar';
import { KpiCard } from '@/components/shell/KpiCard';
import { LookingAhead } from '@/components/shell/LookingAhead';
import { AllergenChips } from '@/components/allergens/AllergenPanel';
import { TagCloud, buildTagCloud } from '@/components/shell/TagCloud';
import { PrintButton } from '@/components/shell/PrintButton';
import { RecipeBookPrint } from './RecipeBookPrint';

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

export default async function RecipesPage({
  searchParams,
}: {
  searchParams?: Promise<{ tag?: string }>;
}) {
  const ctx = await getShellContext();
  const sp = searchParams ? await searchParams : {};
  const activeTag = sp?.tag?.toLowerCase().trim() || null;
  const allRecipes = await getRecipes(ctx.siteId, { dishTypes: FOOD_DISH_TYPES });
  const recipes = activeTag
    ? allRecipes.filter((r) => r.tags.includes(activeTag))
    : allRecipes;
  const tagCloud = buildTagCloud(allRecipes);

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
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="print-hide">
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
        <div className="flex items-center gap-2 flex-wrap">
          {recipes.length > 0 && (
            <PrintButton
              label={activeTag ? `Print ${activeTag} book` : 'Print recipe book'}
            />
          )}
          <Link
            href="/recipes/new"
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors whitespace-nowrap"
          >
            + Add recipe
          </Link>
        </div>
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

      {tagCloud.length > 0 && (
        <div className="mb-8">
          <TagCloud
            cloud={tagCloud}
            basePath="/recipes"
            activeTag={activeTag}
          />
        </div>
      )}

      {recipes.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-16 text-center">
          <div className="font-serif text-2xl text-ink mb-2">
            {activeTag
              ? `No recipes tagged "${activeTag}" yet.`
              : 'Nothing in the recipe book yet.'}
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

      {/* Print-only payload — hidden on screen, revealed by globals.css
       *  `@media print`. Rendering it here avoids a separate /print
       *  route and keeps the chef on the same page when they hit Print. */}
      <RecipeBookPrint
        recipes={recipes}
        kitchenName={ctx.kitchenName}
        filterLabel={activeTag ? `Tagged "${activeTag}"` : null}
      />
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
      className="bg-card border border-rule cursor-pointer transition-all hover:border-gold hover:shadow-[0_4px_16px_rgba(26,22,18,0.08)] flex flex-col overflow-hidden"
    >
      {recipe.photo_url && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={recipe.photo_url}
          alt={recipe.name}
          className="w-full aspect-[16/10] object-cover border-b border-rule"
        />
      )}
      <div className="px-6 py-6 border-b border-rule">
        <div className="font-serif font-semibold text-2xl text-ink leading-tight flex items-center gap-2">
          {recipe.name}
          {recipe.locked && (
            <span
              className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-gold"
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
        {recipe.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {recipe.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-2 py-0.5 border border-rule text-muted-soft"
              >
                {t}
              </span>
            ))}
            {recipe.tags.length > 4 && (
              <span className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted-soft">
                +{recipe.tags.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      <GpTile recipe={recipe} allMatched={allMatched} partialMatch={partialMatch} />

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

/**
 * Recipe-tile GP panel. Replaces the old "Cost per cover" tile.
 *
 * Surfaces what the chef actually cares about at a glance: today's GP
 * (using live Bank prices) and how far it's drifted from the baseline
 * GP at the time the sell price was last set. The cost per cover
 * itself is one level deeper, on the recipe detail page.
 *
 * Empty states (priority order, top-to-bottom):
 *   - no sell_price set        → "set a sell price"
 *   - no cost_per_cover         → "cost pending"
 *   - no baseline               → show GP only, no delta chip
 *   - has both                  → GP + signed delta chip with tone
 */
function GpTile({
  recipe,
  allMatched,
  partialMatch,
}: {
  recipe: Recipe;
  allMatched: boolean;
  partialMatch: boolean;
}) {
  const sell = recipe.sell_price;
  const cost = recipe.cost_per_cover;
  const baseline = recipe.cost_baseline;

  const gpPct =
    sell != null && sell > 0 && cost != null
      ? ((sell - cost) / sell) * 100
      : null;
  const baselineGpPct =
    sell != null && sell > 0 && baseline != null
      ? ((sell - baseline) / sell) * 100
      : null;
  const deltaPt =
    gpPct != null && baselineGpPct != null ? gpPct - baselineGpPct : null;

  // Tone — driven by drift direction + magnitude. >8pt down is urgent,
  // any other downward drift is attention, upward is healthy, flat is
  // neutral. Falls back to match-state when there's no baseline.
  let tone: 'healthy' | 'attention' | 'urgent' | 'muted' = 'muted';
  if (deltaPt != null) {
    if (deltaPt > 0.5) tone = 'healthy';
    else if (deltaPt < -8) tone = 'urgent';
    else if (deltaPt < -0.5) tone = 'attention';
  } else if (gpPct != null) {
    tone = allMatched ? 'healthy' : 'muted';
  }
  const toneText =
    tone === 'healthy'
      ? 'text-healthy'
      : tone === 'attention'
        ? 'text-attention'
        : tone === 'urgent'
          ? 'text-urgent'
          : 'text-ink-soft';

  return (
    <div className="px-6 py-4 border-b border-rule flex justify-between items-center bg-gradient-to-r from-[rgba(93,127,79,0.06)] to-transparent">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted">
        Dish GP
      </div>
      <div className="text-right">
        {sell == null || sell === 0 ? (
          <div className="font-serif italic text-sm text-muted">
            set a sell price
          </div>
        ) : cost == null ? (
          <div className="font-serif italic text-sm text-muted">
            cost pending
          </div>
        ) : (
          <>
            <div className={'font-serif font-semibold text-xl ' + toneText}>
              {gpPct!.toFixed(0)}%
            </div>
            <div className="text-xs text-muted mt-0.5">
              {deltaPt != null && Math.abs(deltaPt) >= 0.5 ? (
                <span className={toneText}>
                  {deltaPt > 0 ? '+' : ''}
                  {deltaPt.toFixed(1)}pt since costed
                </span>
              ) : deltaPt != null ? (
                <span>at baseline</span>
              ) : (
                <span>{gbp.format(cost)}/cover</span>
              )}
              {partialMatch && (
                <span className="text-muted-soft italic"> · partial</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
