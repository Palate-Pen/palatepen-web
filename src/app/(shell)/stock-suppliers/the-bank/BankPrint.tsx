import type { BankRow } from '@/lib/bank';

/**
 * Print-only inventory reference for The Bank. Groups ingredients
 * by category, lists name + supplier + unit + current price + par +
 * current stock per row. Useful for taking a paper price list to a
 * supplier meeting, or pinning a clean snapshot to the kitchen wall.
 *
 * Hidden on screen via `.printable-book` in globals.css. Each direct
 * `.recipe-card` child (one per category) gets a page-break, so each
 * category section starts on a fresh page when the chef prints.
 */

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});
const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function BankPrint({
  rows,
  kitchenName,
}: {
  rows: BankRow[];
  kitchenName: string;
}) {
  const generated = dateFmt.format(new Date());

  // Group by category (uncategorised → "Other")
  const byCategory = new Map<string, BankRow[]>();
  for (const r of rows) {
    const cat = r.category?.trim() || 'Other';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(r);
  }
  const categories = Array.from(byCategory.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  const totalValue = rows.reduce((s, r) => {
    if (r.current_price == null || r.current_stock == null) return s;
    return s + r.current_price * r.current_stock;
  }, 0);

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
            The Bank · ingredient reference
          </p>
          <p style={{ fontSize: '10pt', color: '#444' }}>
            {rows.length} {rows.length === 1 ? 'ingredient' : 'ingredients'} · {categories.length} {categories.length === 1 ? 'category' : 'categories'} · generated {generated}
          </p>
          {totalValue > 0 && (
            <p style={{ fontSize: '10pt', color: '#444', marginTop: '6pt' }}>
              On-hand value · {gbp.format(totalValue)}
            </p>
          )}
        </div>
      </div>

      {categories.map(([cat, items]) => (
        <div key={cat} className="recipe-card">
          <h1>{cat}</h1>
          <p
            style={{
              fontStyle: 'italic',
              color: '#444',
              marginBottom: '12pt',
            }}
          >
            {items.length} {items.length === 1 ? 'ingredient' : 'ingredients'}
          </p>

          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', width: '36%' }}>Ingredient</th>
                <th style={{ textAlign: 'left', width: '20%' }}>Supplier</th>
                <th style={{ textAlign: 'left', width: '10%' }}>Unit</th>
                <th style={{ textAlign: 'right', width: '14%' }}>Price</th>
                <th style={{ textAlign: 'right', width: '10%' }}>Par</th>
                <th style={{ textAlign: 'right', width: '10%' }}>Stock</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.ingredient_id}>
                  <td>
                    <strong>{r.name}</strong>
                    {r.spec && (
                      <span
                        style={{
                          display: 'block',
                          fontStyle: 'italic',
                          fontSize: '9pt',
                          color: '#444',
                          marginTop: '1pt',
                        }}
                      >
                        {r.spec}
                      </span>
                    )}
                  </td>
                  <td>{r.supplier_name ?? '—'}</td>
                  <td>{r.unit ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    {r.current_price != null
                      ? gbp.format(r.current_price)
                      : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {r.par_level ?? '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {r.current_stock ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
