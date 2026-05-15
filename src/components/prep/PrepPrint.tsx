import type { PrepBoard } from '@/lib/prep';

/**
 * Single-page tick sheet for a day's prep board. Chef walks the kitchen
 * with it, ticks items as they go. One A4 page, grouped by station.
 * Hidden on screen via `.printable-book` in globals.css.
 */

const qtyFmt = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 3 });
const dateFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function PrepPrint({
  board,
  kitchenName,
  surfaceLabel = 'Prep board',
}: {
  board: PrepBoard;
  kitchenName: string;
  surfaceLabel?: string;
}) {
  if (board.total_items === 0) return null;
  const dayLabel = dateFmt.format(new Date(`${board.prep_date}T00:00:00Z`));

  return (
    <div className="printable-book">
      <div
        className="recipe-card"
        style={{ pageBreakAfter: 'auto', breakAfter: 'auto' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '14pt' }}>
          <h1 style={{ fontSize: '24pt', marginBottom: '4pt' }}>
            {kitchenName}
          </h1>
          <p
            style={{
              fontStyle: 'italic',
              fontSize: '11pt',
              color: '#444',
            }}
          >
            {surfaceLabel} · {dayLabel}
          </p>
          <p style={{ fontSize: '9pt', color: '#666', marginTop: '2pt' }}>
            {board.total_items} items · {board.stations.length}{' '}
            {board.stations.length === 1 ? 'station' : 'stations'} · {board.done}{' '}
            done / {board.in_progress} in progress / {board.not_started} to start
          </p>
        </div>

        {board.stations.map((station) => (
          <section key={station.name} style={{ marginBottom: '12pt' }}>
            <h2 style={{ marginTop: '0', display: 'flex', justifyContent: 'space-between' }}>
              <span>{station.name}</span>
              {station.primary_chef && (
                <span
                  style={{
                    fontSize: '10pt',
                    fontWeight: 400,
                    textTransform: 'none',
                    letterSpacing: '0',
                    fontStyle: 'italic',
                    color: '#444',
                  }}
                >
                  {station.primary_chef}
                </span>
              )}
            </h2>
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'center', width: '6%' }}>✓</th>
                  <th style={{ textAlign: 'left', width: '46%' }}>Item</th>
                  <th style={{ textAlign: 'right', width: '14%' }}>Qty</th>
                  <th style={{ textAlign: 'left', width: '14%' }}>Unit</th>
                  <th style={{ textAlign: 'left', width: '20%' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {station.items.map((item) => (
                  <tr key={item.id} style={{ height: '18pt' }}>
                    <td style={{ textAlign: 'center' }}>
                      {item.status === 'done' ? '✓' : '☐'}
                    </td>
                    <td>
                      <strong>{item.name}</strong>
                      {item.recipe_name && (
                        <span
                          style={{
                            display: 'block',
                            fontSize: '9pt',
                            fontStyle: 'italic',
                            color: '#444',
                          }}
                        >
                          {item.recipe_name}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {item.qty != null ? qtyFmt.format(item.qty) : '—'}
                    </td>
                    <td>{item.qty_unit ?? '—'}</td>
                    <td
                      style={{
                        fontSize: '9pt',
                        fontStyle: 'italic',
                        color: '#444',
                      }}
                    >
                      {item.notes ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </div>
  );
}
