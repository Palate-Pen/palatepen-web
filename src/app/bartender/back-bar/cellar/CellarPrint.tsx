import type { CellarRow } from '@/lib/cellar';

/**
 * Print-only inventory reference for the bar Cellar. Mirrors The Bank
 * print but adds a cost-per-pour column (specifically 25ml single)
 * which is the bartender's primary cost lens.
 *
 * Grouped by category. Hidden on screen via `.printable-book`.
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

export function CellarPrint({
  rows,
  kitchenName,
}: {
  rows: CellarRow[];
  kitchenName: string;
}) {
  const generated = dateFmt.format(new Date());

  const byCategory = new Map<string, CellarRow[]>();
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
  const breaches = rows.filter((r) => r.par_status === 'breach').length;

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
              marginBottom: '20pt',
            }}
          >
            Cellar · bottle reference
          </p>
          <p style={{ fontSize: '10pt', color: '#444' }}>
            {rows.length} {rows.length === 1 ? 'bottle' : 'bottles'} · {categories.length} {categories.length === 1 ? 'category' : 'categories'} · generated {generated}
          </p>
          {totalValue > 0 && (
            <p style={{ fontSize: '10pt', color: '#444', marginTop: '6pt' }}>
              Stock value · {gbp.format(totalValue)}
              {breaches > 0 && ` · ${breaches} par breach${breaches === 1 ? '' : 'es'}`}
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
            {items.length} {items.length === 1 ? 'bottle' : 'bottles'}
          </p>

          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', width: '32%' }}>Bottle</th>
                <th style={{ textAlign: 'left', width: '20%' }}>Supplier</th>
                <th style={{ textAlign: 'right', width: '14%' }}>Bottle £</th>
                <th style={{ textAlign: 'right', width: '12%' }}>25ml £</th>
                <th style={{ textAlign: 'right', width: '10%' }}>Par</th>
                <th style={{ textAlign: 'right', width: '12%' }}>In hand</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const lowStock =
                  r.par_status === 'breach' || r.par_status === 'low';
                return (
                  <tr key={r.ingredient_id}>
                    <td>
                      <strong>{r.name}</strong>
                      {r.unit && (
                        <span
                          style={{
                            display: 'block',
                            fontStyle: 'italic',
                            fontSize: '9pt',
                            color: '#444',
                            marginTop: '1pt',
                          }}
                        >
                          {r.unit}
                          {r.pack_volume_ml ? ` · ${r.pack_volume_ml}ml` : ''}
                        </span>
                      )}
                    </td>
                    <td>{r.supplier_name ?? '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {r.current_price != null
                        ? gbp.format(r.current_price)
                        : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {r.cost_per_single != null
                        ? gbp.format(r.cost_per_single)
                        : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>{r.par_level ?? '—'}</td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: lowStock ? 600 : 400,
                      }}
                    >
                      {r.current_stock ?? '—'}
                      {lowStock && ' ⚠'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
