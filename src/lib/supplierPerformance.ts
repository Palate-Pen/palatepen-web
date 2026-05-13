// Per-supplier performance aggregation. Reads the same invoice history as
// the price-benchmarking surface but cuts by supplier instead of ingredient.
//
// Surfaces the chef-relevant questions:
//   - Who am I spending the most with this month?
//   - Which suppliers are bumping prices most often?
//   - How recently has each supplier delivered?
//   - For each supplier, what are my top-spend ingredients?
//
// Matching is by lowercased trimmed supplier name (chefs often type the same
// supplier with slight casing/whitespace differences). The display name is
// the first-observed casing.

export interface SupplierTopIngredient {
  name: string;
  spend: number;
  count: number;
}

export interface SupplierStats {
  name: string;             // display name (first-observed casing)
  nameKey: string;          // normalised key
  invoiceCount: number;
  totalSpend: number;
  avgInvoice: number;
  lastInvoiceTs: number;
  priceChangeCount: number;
  uniqueIngredientCount: number;
  topIngredients: SupplierTopIngredient[]; // top 5 by spend
}

function normalise(raw: string): string {
  return String(raw || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// One pass over invoices. Items with no totalPrice fall back to qty *
// unitPrice; both being missing → 0 spend (the row still counts as an
// invoice but doesn't pollute the spend total).
export function buildSupplierStats(invoices: any[] = [], windowMs: number): SupplierStats[] {
  const cutoff = windowMs > 0 ? Date.now() - windowMs : 0;

  // Per-supplier accumulator. Ingredient totals are tracked in a nested map
  // so we can pick the top 5 at the end without a second pass over items.
  interface Acc {
    name: string;
    nameKey: string;
    invoiceCount: number;
    totalSpend: number;
    lastInvoiceTs: number;
    priceChangeCount: number;
    ingredientSpend: Map<string, { name: string; spend: number; count: number }>;
  }
  const accs = new Map<string, Acc>();

  for (const inv of invoices) {
    const rawName = inv?.supplier;
    const key = normalise(rawName);
    if (!key) continue;
    const ts = Number(inv?.scannedAt || inv?.receivedAt || inv?.createdAt || 0);
    if (!ts || ts < cutoff) continue;

    let acc = accs.get(key);
    if (!acc) {
      acc = {
        name: String(rawName || '').trim() || key,
        nameKey: key,
        invoiceCount: 0,
        totalSpend: 0,
        lastInvoiceTs: 0,
        priceChangeCount: 0,
        ingredientSpend: new Map(),
      };
      accs.set(key, acc);
    }

    acc.invoiceCount += 1;
    if (ts > acc.lastInvoiceTs) acc.lastInvoiceTs = ts;

    // Invoice-level priceChanges: stored as a number on manual scans, or as
    // an array of objects on priceChangeDetails. Use the explicit count if
    // present, else fall back to the array length.
    const pcCount = typeof inv?.priceChanges === 'number'
      ? inv.priceChanges
      : Array.isArray(inv?.priceChangeDetails) ? inv.priceChangeDetails.length : 0;
    acc.priceChangeCount += pcCount;

    let invoiceSpend = 0;
    const items = Array.isArray(inv?.items) ? inv.items : [];
    for (const it of items) {
      const itemSpend = Number.isFinite(parseFloat(it?.totalPrice))
        ? parseFloat(it.totalPrice)
        : parseFloat(it?.unitPrice) * parseFloat(it?.qty);
      const spend = Number.isFinite(itemSpend) && itemSpend > 0 ? itemSpend : 0;
      invoiceSpend += spend;

      const ingName = String(it?.name || '').trim();
      if (ingName) {
        const ingKey = normalise(ingName);
        const existing = acc.ingredientSpend.get(ingKey);
        if (existing) {
          existing.spend += spend;
          existing.count += 1;
        } else {
          acc.ingredientSpend.set(ingKey, { name: ingName, spend, count: 1 });
        }
      }
    }

    // Prefer the invoice-level `total` (set by the inbound-email webhook)
    // when it's present and positive — supplier invoices sometimes carry
    // delivery / discount lines that we don't itemise, so the sum of items
    // can understate. Fall back to the computed itemSpend otherwise.
    const invTotal = parseFloat(inv?.total);
    acc.totalSpend += (Number.isFinite(invTotal) && invTotal > 0) ? invTotal : invoiceSpend;
  }

  const results: SupplierStats[] = [];
  accs.forEach(acc => {
    const ingredientList = Array.from(acc.ingredientSpend.values())
      .sort((a, b) => b.spend - a.spend);
    results.push({
      name: acc.name,
      nameKey: acc.nameKey,
      invoiceCount: acc.invoiceCount,
      totalSpend: acc.totalSpend,
      avgInvoice: acc.invoiceCount > 0 ? acc.totalSpend / acc.invoiceCount : 0,
      lastInvoiceTs: acc.lastInvoiceTs,
      priceChangeCount: acc.priceChangeCount,
      uniqueIngredientCount: acc.ingredientSpend.size,
      topIngredients: ingredientList.slice(0, 5),
    });
  });

  // Default sort: highest spend first — the actionable signal is "where is
  // my money going". UI can re-sort.
  results.sort((a, b) => b.totalSpend - a.totalSpend);
  return results;
}

export const SUPPLIER_WINDOW_MS = {
  '7d': 7 * 86400000,
  '30d': 30 * 86400000,
  '90d': 90 * 86400000,
  'all': 0,
} as const;
