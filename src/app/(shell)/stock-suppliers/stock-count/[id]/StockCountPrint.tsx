import type { StockTakeDetail, StockTakeLine } from '@/lib/stock-takes';

/**
 * Print payload for a stock-count session. Two modes:
 *
 * - `in_progress`: blank tick-sheet. Each row shows ingredient name +
 *   expected quantity (par) + unit, with an empty box for the chef to
 *   write the actual counted quantity while walking the kitchen.
 * - `completed` / `cancelled`: archived snapshot. Each row shows
 *   expected + counted + variance side-by-side, plus reason. Total
 *   variance value lands on the cover.
 *
 * Grouped by category for both modes. Hidden on screen via
 * `.printable-book` in globals.css.
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

export function StockCountPrint({
  take,
  kitchenName,
}: {
  take: StockTakeDetail;
  kitchenName: string;
}) {
  const isLive = take.status === 'in_progress';
  const generated = dateFmt.format(new Date());

  // Group by category — uncategorised line goes to 'Other'
  const byCategory = new Map<string, StockTakeLine[]>();
  for (const l of take.lines) {
    const cat = l.category?.trim() || 'Other';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(l);
  }
  const categories = Array.from(byCategory.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

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
            {isLive ? 'Stock count · tick sheet' : 'Stock count · summary'}
          </p>
          <p style={{ fontSize: '10pt', color: '#444' }}>
            {dateFmt.format(new Date(take.conducted_at))} · {take.lines.length}{' '}
            {take.lines.length === 1 ? 'line' : 'lines'} · {categories.length}{' '}
            {categories.length === 1 ? 'category' : 'categories'}
          </p>
          {!isLive && take.variance_total_value != null && (
            <p style={{ fontSize: '10pt', color: '#444', marginTop: '6pt' }}>
              Total variance ·{' '}
              {take.variance_total_value >= 0 ? '+' : '−'}
              {gbp.format(Math.abs(take.variance_total_value))}
            </p>
          )}
          <p style={{ fontSize: '9pt', color: '#666', marginTop: '12pt' }}>
            generated {generated}
            {isLive && ' · counter: _______________________'}
          </p>
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
            {items.length} {items.length === 1 ? 'line' : 'lines'} to count
          </p>

          {isLive ? <LiveTable items={items} /> : <SummaryTable items={items} />}
        </div>
      ))}
    </div>
  );
}

function LiveTable({ items }: { items: StockTakeLine[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', width: '46%' }}>Ingredient</th>
          <th style={{ textAlign: 'right', width: '14%' }}>Expected</th>
          <th style={{ textAlign: 'left', width: '12%' }}>Unit</th>
          <th style={{ textAlign: 'left', width: '28%' }}>Counted</th>
        </tr>
      </thead>
      <tbody>
        {items.map((l) => (
          <tr key={l.id} style={{ height: '24pt' }}>
            <td>
              <strong>{l.ingredient_name}</strong>
            </td>
            <td style={{ textAlign: 'right' }}>
              {l.expected_quantity != null ? qtyFmt.format(l.expected_quantity) : '—'}
            </td>
            <td>{l.unit ?? '—'}</td>
            <td>
              {/* Empty cell for chef's handwriting */}
              &nbsp;
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SummaryTable({ items }: { items: StockTakeLine[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', width: '36%' }}>Ingredient</th>
          <th style={{ textAlign: 'right', width: '12%' }}>Expected</th>
          <th style={{ textAlign: 'right', width: '12%' }}>Counted</th>
          <th style={{ textAlign: 'right', width: '12%' }}>Variance</th>
          <th style={{ textAlign: 'right', width: '12%' }}>£ Δ</th>
          <th style={{ textAlign: 'left', width: '16%' }}>Reason</th>
        </tr>
      </thead>
      <tbody>
        {items.map((l) => {
          const negVariance =
            l.variance_quantity != null && l.variance_quantity < 0;
          return (
            <tr key={l.id}>
              <td>
                <strong>{l.ingredient_name}</strong>
              </td>
              <td style={{ textAlign: 'right' }}>
                {l.expected_quantity != null
                  ? qtyFmt.format(l.expected_quantity)
                  : '—'}
              </td>
              <td style={{ textAlign: 'right' }}>
                {l.counted_quantity != null
                  ? qtyFmt.format(l.counted_quantity)
                  : '—'}
              </td>
              <td
                style={{
                  textAlign: 'right',
                  fontWeight: negVariance ? 600 : 400,
                }}
              >
                {l.variance_quantity != null
                  ? (l.variance_quantity > 0 ? '+' : '') +
                    qtyFmt.format(l.variance_quantity)
                  : '—'}
              </td>
              <td
                style={{
                  textAlign: 'right',
                  fontWeight: negVariance ? 600 : 400,
                }}
              >
                {l.variance_value != null
                  ? (l.variance_value > 0 ? '+' : '−') +
                    gbp.format(Math.abs(l.variance_value))
                  : '—'}
              </td>
              <td style={{ fontSize: '9pt', fontStyle: 'italic' }}>
                {l.reason ?? ''}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
