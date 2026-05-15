import type { Recipe } from '@/lib/recipes';
import { ALLERGENS } from '@/lib/allergens';

/**
 * Print-only rendering of every recipe in the chef's book (or every
 * recipe matching the active tag). Hidden on screen by `.printable-book`
 * in globals.css; revealed only inside `@media print`.
 *
 * Layout per recipe: title + meta line, photo if present, ingredients
 * list, method, allergens, sell price. One recipe per A4 page (forced
 * via the `.recipe-card` page-break-after in globals.css).
 *
 * Filtering: caller passes the already-filtered `recipes` array (by tag,
 * dish type, archive state). This component just renders.
 */

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
      {/* Cover page */}
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
        <RecipeBookPage key={r.id} recipe={r} />
      ))}
    </div>
  );
}

function RecipeBookPage({ recipe }: { recipe: Recipe }) {
  const allergens = [
    ...recipe.allergens.contains.map((k) => allergenLabel(k, 'Contains')),
    ...recipe.allergens.mayContain.map((k) => allergenLabel(k, 'May contain')),
  ];
  const portionLabel =
    recipe.portion_per_cover != null
      ? `${recipe.portion_per_cover} ${recipe.portion_per_cover === 1 ? 'portion' : 'portions'} per cover`
      : null;
  const servesLabel = recipe.serves != null ? `Serves ${recipe.serves}` : null;
  const sellLabel =
    recipe.sell_price != null ? `Sell · ${gbp.format(recipe.sell_price)}` : null;
  const costLabel =
    recipe.cost_per_cover != null
      ? `Cost · ${gbp.format(recipe.cost_per_cover)}`
      : null;
  const meta = [servesLabel, portionLabel, sellLabel, costLabel]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="recipe-card">
      <h1>{recipe.name}</h1>
      {meta && (
        <p style={{ fontStyle: 'italic', color: '#444', marginBottom: '12pt' }}>
          {meta}
          {recipe.menu_section && (
            <>
              {' · '}
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '9pt' }}>
                {recipe.menu_section}
              </span>
            </>
          )}
        </p>
      )}

      {recipe.notes && (
        <p style={{ fontStyle: 'italic', marginBottom: '12pt' }}>{recipe.notes}</p>
      )}

      {recipe.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recipe.photo_url}
          alt={recipe.name}
          style={{ width: '100%', marginBottom: '12pt' }}
        />
      )}

      {recipe.ingredients.length > 0 && (
        <section>
          <h2>Ingredients</h2>
          <table style={{ marginBottom: '12pt' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', width: '60%' }}>Item</th>
                <th style={{ textAlign: 'right', width: '20%' }}>Qty</th>
                <th style={{ textAlign: 'left', width: '20%' }}>Unit</th>
              </tr>
            </thead>
            <tbody>
              {recipe.ingredients.map((i) => (
                <tr key={i.id}>
                  <td>{i.name}</td>
                  <td style={{ textAlign: 'right' }}>{qtyFmt.format(i.qty)}</td>
                  <td>{i.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {recipe.method.length > 0 && (
        <section>
          <h2>Method</h2>
          <ol style={{ paddingLeft: '20pt', marginBottom: '12pt' }}>
            {recipe.method.map((step, i) => (
              <li key={i} style={{ marginBottom: '4pt' }}>
                {step}
              </li>
            ))}
          </ol>
        </section>
      )}

      {allergens.length > 0 && (
        <section>
          <h3>Allergens</h3>
          <p style={{ fontSize: '9.5pt', marginBottom: '6pt' }}>
            {allergens.join(' · ')}
          </p>
        </section>
      )}

      {recipe.tags.length > 0 && (
        <section>
          <h3>Tags</h3>
          <p
            style={{
              fontSize: '9pt',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#444',
            }}
          >
            {recipe.tags.join(' · ')}
          </p>
        </section>
      )}
    </div>
  );
}

function allergenLabel(key: string, prefix: 'Contains' | 'May contain'): string {
  const meta = ALLERGENS.find((a) => a.key === key);
  return `${prefix} ${meta?.label ?? key}`;
}
