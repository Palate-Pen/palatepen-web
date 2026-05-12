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

// ── Column schemas — exposed so templates and importers share one source of truth ─

export const RECIPE_HEADERS = [
  'ID', 'Title', 'Category', 'Servings', 'Prep Time', 'Cook Time',
  'Source URL', 'Notes', 'Ingredients (| separated)', 'Method (|| separated)',
  'Contains Allergens', 'May Contain Allergens', 'Tree Nut Types', 'Cereal Types',
  'Locked', 'Linked Costing ID', 'Photo URL', 'Created At',
];

export const COSTING_HEADERS = [
  'ID', 'Dish Name', 'Sell Price', 'Cost per Cover', 'GP £', 'GP %',
  'Target %', 'Portions', 'Currency', 'Saved At', 'Ingredients (| separated)',
];

export const STOCK_HEADERS = [
  'ID', 'Name', 'Category', 'Unit', 'Current Qty', 'Par Level',
  'Min Level', 'Unit Price (£)', 'Last Counted', 'Created At',
];

// ── Template downloads — header-only CSVs the user can populate offline ─

export function downloadRecipesTemplate() {
  downloadCsv('palatable-recipes-template.csv', toCsv(RECIPE_HEADERS, []));
}
export function downloadCostingsTemplate() {
  downloadCsv('palatable-costings-template.csv', toCsv(COSTING_HEADERS, []));
}
export function downloadStockTemplate() {
  downloadCsv('palatable-stock-template.csv', toCsv(STOCK_HEADERS, []));
}

// ── CSV parser — RFC-4180-ish with quoted cells, escaped quotes, CR/LF lines.

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;
  // Strip leading BOM if present (Excel adds one on save-as-CSV)
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 2; continue; }
        inQuotes = false;
        i++;
      } else {
        cell += c;
        i++;
      }
    } else {
      if (c === '"' && cell === '') {
        inQuotes = true;
        i++;
      } else if (c === ',') {
        row.push(cell);
        cell = '';
        i++;
      } else if (c === '\n' || c === '\r') {
        row.push(cell);
        // Drop pure-blank rows so a trailing newline doesn't generate ghost entities
        if (!(row.length === 1 && row[0] === '')) rows.push(row);
        row = [];
        cell = '';
        if (c === '\r' && text[i + 1] === '\n') i++;
        i++;
      } else {
        cell += c;
        i++;
      }
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    if (!(row.length === 1 && row[0] === '')) rows.push(row);
  }
  return rows;
}

export function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (row[i] ?? '').trim(); });
    return obj;
  });
}

// Read a File (browser File API) as text. Resolves with the file's contents.
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error('Could not read file'));
    r.readAsText(file);
  });
}

// ── Row → entity converters. New IDs are always generated by the caller's add
//    action; "ID" columns from the export are read but not reused, so the same
//    template imported twice creates two distinct records (the user dedups by
//    eye, not by us). linkedCostingId passes through so a paired recipes+costings
//    import keeps cross-references when names match. ────────────────────────

const splitList = (s: string, sep: string) =>
  (s || '').split(sep).map(x => x.trim()).filter(Boolean);

export function rowsToRecipes(rows: Record<string, string>[]): any[] {
  return rows.map(o => {
    const r: any = {
      title: o['Title'] || 'Untitled recipe',
      category: o['Category'] || 'Other',
      notes: o['Notes'] || '',
      url: o['Source URL'] || '',
      locked: (o['Locked'] || '').toLowerCase() === 'yes',
    };
    if (o['Photo URL']) r.photoUrl = o['Photo URL'];
    if (o['Linked Costing ID']) r.linkedCostingId = o['Linked Costing ID'];
    const ings = splitList(o['Ingredients (| separated)'] || o['Ingredients'] || '', '|');
    const method = splitList(o['Method (|| separated)'] || o['Method'] || '', '||');
    const servings = o['Servings'] || '';
    const prepTime = o['Prep Time'] || '';
    const cookTime = o['Cook Time'] || '';
    if (ings.length || method.length || servings || prepTime || cookTime) {
      r.imported = { ingredients: ings, method, servings, prepTime, cookTime, description: '' };
    }
    const contains = splitList(o['Contains Allergens'] || '', ';');
    const mayContain = splitList(o['May Contain Allergens'] || '', ';');
    const nutTypes = splitList(o['Tree Nut Types'] || '', ';');
    const glutenTypes = splitList(o['Cereal Types'] || '', ';');
    if (contains.length || mayContain.length || nutTypes.length || glutenTypes.length) {
      r.allergens = { contains, mayContain, nutTypes, glutenTypes };
    }
    return r;
  });
}

// Format: "name × qty unit @price = line" — same shape as the costings export.
const ING_RE = /^(.+?)\s*×\s*([\d.]+)\s*([a-zA-Z]+)?\s*@([\d.]+)\s*=\s*([\d.]+)$/;

export function rowsToCostings(rows: Record<string, string>[]): any[] {
  return rows.map((o, rowIdx) => {
    const ingsStr = o['Ingredients (| separated)'] || o['Ingredients'] || '';
    const ingredients = splitList(ingsStr, '|').map((s, i) => {
      const m = s.match(ING_RE);
      if (!m) return null;
      return {
        id: `${Date.now()}-${rowIdx}-${i}`,
        name: (m[1] || '').trim(),
        qty: parseFloat(m[2]) || 0,
        unit: m[3] || 'each',
        price: parseFloat(m[4]) || 0,
        line: parseFloat(m[5]) || 0,
      };
    }).filter(Boolean) as any[];
    const sell = parseFloat(o['Sell Price']) || 0;
    const portions = parseInt(o['Portions']) || 1;
    // Use stored values when present; otherwise recompute from the ingredients.
    const lineTotal = ingredients.reduce((a, b) => a + (b.line || 0), 0);
    const cost = parseFloat(o['Cost per Cover']) || (portions ? lineTotal / portions : 0);
    const gp = parseFloat(o['GP £']) || (sell - cost);
    const pct = parseFloat(o['GP %']) || (sell > 0 ? (gp / sell) * 100 : 0);
    return {
      name: o['Dish Name'] || 'Untitled dish',
      sell, cost, gp, pct,
      target: parseFloat(o['Target %']) || 72,
      portions,
      currency: o['Currency'] || 'GBP',
      ingredients,
    };
  });
}

export function rowsToStock(rows: Record<string, string>[]): any[] {
  const num = (s: string) => {
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  };
  return rows.map(o => ({
    name: o['Name'] || 'Untitled item',
    category: o['Category'] || 'Other',
    unit: o['Unit'] || 'kg',
    currentQty: num(o['Current Qty']),
    parLevel: num(o['Par Level']),
    minLevel: num(o['Min Level']),
    unitPrice: num(o['Unit Price (£)']),
  }));
}
