// Shared CSV utility — used by exports today, will back the import templates next.

export function csvEscape(value: any): string {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function toCsv(headers: string[], rows: any[][]): string {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) lines.push(row.map(csvEscape).join(','));
  return lines.join('\r\n');
}

// Triggers a browser download. Prepends a UTF-8 BOM so Excel opens it
// with the correct encoding without the user fiddling with import dialogs.
export function downloadCsv(filename: string, content: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

export function dateStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const ISO = (ts: any) => (ts ? new Date(ts).toISOString() : '');

// ── Export helpers ────────────────────────────────────────

export function exportRecipesCsv(recipes: any[]) {
  const headers = [
    'ID', 'Title', 'Category', 'Servings', 'Prep Time', 'Cook Time',
    'Source URL', 'Notes', 'Ingredients (| separated)', 'Method (|| separated)',
    'Contains Allergens', 'May Contain Allergens', 'Tree Nut Types', 'Cereal Types',
    'Locked', 'Linked Costing ID', 'Photo URL', 'Created At',
  ];
  const rows = recipes.map(r => [
    r.id,
    r.title || '',
    r.category || '',
    r.imported?.servings || '',
    r.imported?.prepTime || '',
    r.imported?.cookTime || '',
    r.url || '',
    r.notes || '',
    (r.imported?.ingredients || []).join(' | '),
    (r.imported?.method || []).join(' || '),
    (r.allergens?.contains || []).join('; '),
    (r.allergens?.mayContain || []).join('; '),
    (r.allergens?.nutTypes || []).join('; '),
    (r.allergens?.glutenTypes || []).join('; '),
    r.locked ? 'Yes' : 'No',
    r.linkedCostingId || '',
    r.photoUrl || '',
    ISO(r.createdAt),
  ]);
  downloadCsv(`palatable-recipes-${dateStamp()}.csv`, toCsv(headers, rows));
}

export function exportCostingsCsv(history: any[]) {
  const headers = [
    'ID', 'Dish Name', 'Sell Price', 'Cost per Cover', 'GP £', 'GP %',
    'Target %', 'Portions', 'Currency', 'Saved At', 'Ingredients (| separated)',
  ];
  const rows = history.map(h => [
    h.id,
    h.name || '',
    Number(h.sell || 0).toFixed(2),
    Number(h.cost || 0).toFixed(3),
    Number(h.gp || 0).toFixed(2),
    Number(h.pct || 0).toFixed(2),
    h.target ?? '',
    h.portions ?? '',
    h.currency || 'GBP',
    ISO(h.savedAt),
    (h.ingredients || [])
      .map((i: any) => `${i.name} × ${i.qty}${i.unit} @${Number(i.price||0).toFixed(2)} = ${Number(i.line||0).toFixed(3)}`)
      .join(' | '),
  ]);
  downloadCsv(`palatable-costings-${dateStamp()}.csv`, toCsv(headers, rows));
}

export function exportStockCsv(stock: any[]) {
  const headers = [
    'ID', 'Name', 'Category', 'Unit', 'Current Qty', 'Par Level',
    'Min Level', 'Unit Price (£)', 'Last Counted', 'Created At',
  ];
  const rows = stock.map(s => [
    s.id,
    s.name || '',
    s.category || '',
    s.unit || '',
    s.currentQty ?? '',
    s.parLevel ?? '',
    s.minLevel ?? '',
    s.unitPrice ?? '',
    ISO(s.lastCounted),
    ISO(s.createdAt),
  ]);
  downloadCsv(`palatable-stock-${dateStamp()}.csv`, toCsv(headers, rows));
}
