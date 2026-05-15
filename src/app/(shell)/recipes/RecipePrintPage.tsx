import type { Recipe } from '@/lib/recipes';
import { ALLERGENS } from '@/lib/allergens';

/**
 * One-page print render of a single recipe — title, meta, photo,
 * ingredients table, numbered method, allergens, tags.
 *
 * Used by both `/recipes` (Print recipe book — many pages) and
 * `/recipes/[id]` (Print recipe — one page). Shares the exact same
 * layout so single-recipe prints and the book look identical.
 *
 * Caller wraps this in `<div className="printable-book">…</div>` — that
 * gives it the page-break-after + display:none-on-screen behaviour
 * defined in globals.css.
 */

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});
const qtyFmt = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 3 });

export function RecipePrintPage({ recipe }: { recipe: Recipe }) {
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
              <span
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontSize: '9pt',
                }}
              >
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
