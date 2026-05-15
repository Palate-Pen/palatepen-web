import type { Recipe } from '@/lib/recipes';
import { RecipePrintPage } from './RecipePrintPage';

/**
 * Multi-recipe print payload — cover page + one A4 per recipe. Each
 * page is rendered by the shared `RecipePrintPage` component so the
 * book matches single-recipe print exactly.
 *
 * Hidden on screen via the `.printable-book` rule in globals.css.
 * Revealed inside `@media print`; each direct `.recipe-card` child
 * gets a `page-break-after` so recipes never share a page.
 */

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function RecipeBookPrint({
  recipes,
  kitchenName,
  filterLabel,
}: {
  recipes: Recipe[];
  kitchenName: string;
  filterLabel: string | null;
}) {
  const generated = dateFmt.format(new Date());

  return (
    <div className="printable-book">
      <div className="recipe-card">
        <div style={{ paddingTop: '30mm', textAlign: 'center' }}>
          <h1 style={{ fontSize: '32pt', marginBottom: '12pt' }}>
            {kitchenName}
          </h1>
          <p
            style={{
              fontStyle: 'italic',
              fontSize: '13pt',
              marginBottom: '24pt',
            }}
          >
            Recipe book{filterLabel ? ` · ${filterLabel}` : ''}
          </p>
          <p style={{ fontSize: '10pt', color: '#444' }}>
            {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'} · generated {generated}
          </p>
        </div>
      </div>

      {recipes.map((r) => (
        <RecipePrintPage key={r.id} recipe={r} />
      ))}
    </div>
  );
}
