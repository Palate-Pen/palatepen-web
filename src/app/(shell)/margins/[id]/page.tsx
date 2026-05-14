import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRecipe, type RecipeIngredient } from '@/lib/recipes';
import { gpToneFor, DEFAULT_GP_TARGET } from '@/lib/margins';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { WhatIfPanel } from './WhatIfPanel';

export const metadata = { title: 'Margin detail — Palatable' };

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

export default async function MarginDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const gpPct =
    recipe.sell_price != null &&
    recipe.cost_per_cover != null &&
    recipe.sell_price > 0
      ? ((recipe.sell_price - recipe.cost_per_cover) / recipe.sell_price) * 100
      : null;
  const tone = gpToneFor(gpPct);

  const driftPct =
    recipe.cost_baseline != null &&
    recipe.cost_baseline > 0 &&
    recipe.cost_per_cover != null
      ? ((recipe.cost_per_cover - recipe.cost_baseline) / recipe.cost_baseline) * 100
      : null;

  const sortedIngs = [...recipe.ingredients].sort(
    (a, b) => (b.line_cost ?? 0) - (a.line_cost ?? 0),
  );
  const sumLineCost = sortedIngs.reduce(
    (s, i) => s + (i.line_cost ?? 0),
    0,
  );

  const canRunWhatIf =
    recipe.cost_per_cover != null &&
    recipe.cost_per_cover > 0 &&
    recipe.sell_price != null &&
    recipe.sell_price > 0;

  return (
    <div className="px-14 pt-12 pb-20 max-w-[1200px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Margins ·{' '}
        {recipe.menu_section
          ? recipe.menu_section[0].toUpperCase() + recipe.menu_section.slice(1)
          : 'Detail'}
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
        {recipe.name}
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-8">
        {subtitle(recipe, gpPct, driftPct)}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="GP Margin"
          value={gpPct != null ? `${gpPct.toFixed(0)}%` : '—'}
          sub={`target ${DEFAULT_GP_TARGET}%`}
          tone={
            tone === 'healthy'
              ? 'healthy'
              : tone === 'attention'
                ? 'attention'
                : tone === 'urgent'
                  ? 'urgent'
                  : undefined
          }
        />
        <KpiCard
          label="Sell Price"
          value={recipe.sell_price != null ? gbp.format(recipe.sell_price) : '—'}
          sub={
            recipe.sell_price == null
              ? 'not set yet'
              : 'on the menu now'
          }
        />
        <KpiCard
          label="Cost / Cover"
          value={
            recipe.cost_per_cover != null
              ? gbp.format(recipe.cost_per_cover)
              : '—'
          }
          sub={
            recipe.cost_baseline != null
              ? `was ${gbp.format(recipe.cost_baseline)}`
              : 'live from The Bank'
          }
        />
        <KpiCard
          label="Margin / Cover"
          value={
            recipe.sell_price != null && recipe.cost_per_cover != null
              ? gbp.format(recipe.sell_price - recipe.cost_per_cover)
              : '—'
          }
          sub={
            gpPct != null
              ? gpPct >= DEFAULT_GP_TARGET
                ? 'at or above target'
                : `${(DEFAULT_GP_TARGET - gpPct).toFixed(1)}pt below target`
              : 'set price + cost to see'
          }
          tone={
            gpPct != null && gpPct >= DEFAULT_GP_TARGET
              ? 'healthy'
              : gpPct != null && gpPct < DEFAULT_GP_TARGET - 7
                ? 'urgent'
                : gpPct != null
                  ? 'attention'
                  : undefined
          }
        />
      </div>

      {driftPct != null && Math.abs(driftPct) >= 3 && (
        <div className="mb-10 bg-card border border-rule border-l-4 border-l-attention px-7 py-6">
          <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-attention mb-2">
            Cost has moved
          </div>
          <p className="font-serif italic text-base text-ink-soft leading-relaxed">
            This dish was costed at{' '}
            <strong className="not-italic font-semibold text-ink">
              {gbp.format(recipe.cost_baseline!)}
            </strong>
            {recipe.costed_at && (
              <>
                {' on '}
                {dateFmt.format(new Date(recipe.costed_at))}
              </>
            )}
            . Live cost is now{' '}
            <strong className="not-italic font-semibold text-ink">
              {gbp.format(recipe.cost_per_cover!)}
            </strong>
            {' — '}
            <strong className={`not-italic font-semibold ${driftPct >= 0 ? 'text-attention' : 'text-healthy'}`}>
              {driftPct >= 0 ? '↑' : '↓'} {Math.abs(driftPct).toFixed(1)}%
            </strong>
            . Drag the slider below to find a sell price that holds GP.
          </p>
        </div>
      )}

      {canRunWhatIf ? (
        <WhatIfPanel
          recipeId={recipe.id}
          costPerCover={recipe.cost_per_cover!}
          initialSellPrice={recipe.sell_price!}
        />
      ) : (
        <div className="mb-10 bg-card border border-rule px-7 py-6">
          <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-muted mb-2">
            What-if pricing unavailable
          </div>
          <p className="font-serif italic text-sm text-muted">
            {recipe.sell_price == null
              ? 'Set a sell price for this dish first — then you can drag the slider to test alternatives.'
              : recipe.cost_per_cover == null
                ? 'Link the ingredients to The Bank so cost-per-cover can be computed live — then the slider will work.'
                : 'Cost data is incomplete.'}
          </p>
        </div>
      )}

      <section className="mt-12">
        <SectionHead
          title="What This Dish Is Exposed To"
          meta={`${recipe.ingredients.length} ${recipe.ingredients.length === 1 ? 'ingredient' : 'ingredients'} · sorted by cost weight`}
        />
        {sortedIngs.length === 0 ? (
          <div className="bg-card border border-rule px-10 py-10 text-center">
            <p className="font-serif italic text-muted">
              No ingredients on this recipe yet.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-rule">
            <div className="hidden md:grid grid-cols-[2fr_100px_100px_110px_70px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
              {['Ingredient', 'Qty', 'Unit price', 'Line cost', 'Weight'].map((h) => (
                <div
                  key={h}
                  className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
                >
                  {h}
                </div>
              ))}
            </div>
            {sortedIngs.map((ing, i) => (
              <IngredientCostLine
                key={ing.id}
                ing={ing}
                sumLineCost={sumLineCost}
                last={i === sortedIngs.length - 1}
              />
            ))}
          </div>
        )}
      </section>

      <div className="mt-10 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/margins"
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
          >
            ← Back to Margins
          </Link>
          <Link
            href={`/recipes/${recipe.id}`}
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
          >
            Open in Recipes →
          </Link>
        </div>
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
  gpPct: number | null,
  driftPct: number | null,
): string {
  if (gpPct == null && recipe.cost_per_cover == null) {
    return 'Ingredients not yet linked to The Bank — costing is pending.';
  }
  if (gpPct == null) {
    return 'Set a sell price to see this dish on the margin board.';
  }

  const tone = gpToneFor(gpPct);
  const opener =
    tone === 'healthy'
      ? `Sitting comfortably at ${gpPct.toFixed(0)}% GP.`
      : tone === 'attention'
        ? `Drifting at ${gpPct.toFixed(0)}% GP — worth a look.`
        : `Bleeding at ${gpPct.toFixed(0)}% GP — needs a fix.`;

  if (driftPct != null && Math.abs(driftPct) >= 3) {
    return `${opener} The live cost has moved ${Math.abs(driftPct).toFixed(1)}% since this dish was last priced — drag the slider to find a new sell price.`;
  }

  return opener;
}

function IngredientCostLine({
  ing,
  sumLineCost,
  last,
}: {
  ing: RecipeIngredient;
  sumLineCost: number;
  last: boolean;
}) {
  const linked = ing.ingredient_id != null;
  const weight =
    ing.line_cost != null && sumLineCost > 0
      ? (ing.line_cost / sumLineCost) * 100
      : null;
  return (
    <div
      className={
        'grid grid-cols-1 md:grid-cols-[2fr_100px_100px_110px_70px] gap-4 px-7 py-4 items-center ' +
        (last ? '' : 'border-b border-rule-soft')
      }
    >
      <div>
        <div className="font-serif font-semibold text-base text-ink">
          {ing.name}
        </div>
        {!linked && (
          <div className="font-serif italic text-xs text-muted mt-0.5">
            free-text · not yet linked to The Bank
          </div>
        )}
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
      <div className="font-serif text-sm text-muted">
        {weight != null ? `${weight.toFixed(0)}%` : '—'}
      </div>
    </div>
  );
}
