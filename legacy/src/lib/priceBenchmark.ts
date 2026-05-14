// Per-ingredient price benchmarking — walks the user's full invoice history
// and emits a price time series per ingredient name. Bank current price is
// folded in so the UI can compare "what I'm paying now" against historical
// avg / min / max / volatility.
//
// Matching: lowercase + trim + collapse whitespace. Anything fancier
// (Levenshtein, token overlap) belongs in a future "Bank reconciliation"
// surface where the chef can merge variant spellings manually. Keeping it
// strict here means a noisy data set produces honest "no benchmark"
// outcomes rather than spurious aggregates.

export interface PricePoint {
  ts: number;
  unitPrice: number;
  unit: string;
  supplier: string;
  invoiceId?: string;
}

export interface IngredientHistory {
  name: string;          // display name — first observed casing
  nameKey: string;       // normalised key (lowercase, collapsed)
  unit: string;          // most-common unit across the points
  points: PricePoint[];  // sorted ascending by ts
  currentBankPrice: number | null;
  bankUnit: string | null;
}

export interface BenchmarkStats {
  avg: number;
  min: number;
  max: number;
  last: number;       // latest unitPrice in window
  lastTs: number;     // ts of latest point in window
  count: number;
  volatilityPct: number; // (stddev / avg) * 100 — coefficient of variation
  vsBankPct: number | null; // (last - bank) / bank * 100, null if no bank or bank is 0
}

function normaliseName(raw: string): string {
  return String(raw || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Build a Map<nameKey, IngredientHistory> from raw user_data slices.
export function buildHistory(
  invoices: any[] = [],
  ingredientsBank: any[] = [],
): Map<string, IngredientHistory> {
  const map = new Map<string, IngredientHistory>();

  // Index bank by normalised name for O(1) lookup later.
  const bankIdx = new Map<string, { unitPrice: number; unit: string; name: string }>();
  for (const b of ingredientsBank) {
    const key = normaliseName(b?.name);
    if (!key) continue;
    const price = parseFloat(b?.unitPrice);
    if (!Number.isFinite(price) || price <= 0) continue;
    bankIdx.set(key, { unitPrice: price, unit: String(b?.unit || ''), name: String(b?.name || '') });
  }

  for (const inv of invoices) {
    const ts = Number(inv?.scannedAt || inv?.receivedAt || inv?.createdAt || 0);
    if (!ts) continue;
    const supplier = String(inv?.supplier || inv?.from || 'Unknown');
    const invoiceId = inv?.id;
    const items = Array.isArray(inv?.items) ? inv.items : [];
    for (const it of items) {
      const key = normaliseName(it?.name);
      if (!key) continue;
      const unitPrice = parseFloat(it?.unitPrice);
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) continue;
      const unit = String(it?.unit || '').toLowerCase() || 'ea';
      let entry = map.get(key);
      if (!entry) {
        const bank = bankIdx.get(key);
        entry = {
          name: String(it?.name || '').trim() || key,
          nameKey: key,
          unit,
          points: [],
          currentBankPrice: bank?.unitPrice ?? null,
          bankUnit: bank?.unit ?? null,
        };
        map.set(key, entry);
      }
      entry.points.push({ ts, unitPrice, unit, supplier, invoiceId });
    }
  }

  // Bank-only ingredients (no invoice history yet) still surface so the chef
  // sees their current paid price.
  bankIdx.forEach((bank, key) => {
    if (map.has(key)) return;
    map.set(key, {
      name: bank.name,
      nameKey: key,
      unit: bank.unit,
      points: [],
      currentBankPrice: bank.unitPrice,
      bankUnit: bank.unit,
    });
  });

  // Sort each entry's points ascending by ts for downstream chart logic.
  // Pick the most-common unit across points so the table column doesn't
  // flicker between kg / g when both occur for the same ingredient.
  map.forEach(entry => {
    entry.points.sort((a, b) => a.ts - b.ts);
    if (entry.points.length > 0) {
      const unitCounts = new Map<string, number>();
      for (const p of entry.points) unitCounts.set(p.unit, (unitCounts.get(p.unit) || 0) + 1);
      const top = Array.from(unitCounts.entries()).sort((a, b) => b[1] - a[1])[0];
      if (top) entry.unit = top[0];
    }
  });

  return map;
}

// Compute summary stats for a single ingredient over a window. Pass
// `windowMs = 0` for all-time.
export function statsFor(entry: IngredientHistory, windowMs: number): BenchmarkStats | null {
  const cutoff = windowMs > 0 ? Date.now() - windowMs : 0;
  const pts = entry.points.filter(p => p.ts >= cutoff);
  if (pts.length === 0) return null;
  const prices = pts.map(p => p.unitPrice);
  const sum = prices.reduce((a, b) => a + b, 0);
  const avg = sum / prices.length;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const last = pts[pts.length - 1].unitPrice;
  const lastTs = pts[pts.length - 1].ts;
  // Sample stddev — n-1 denominator. For n=1 we treat stddev as 0 (single
  // point has no spread).
  let variance = 0;
  if (prices.length > 1) {
    const sq = prices.reduce((a, b) => a + (b - avg) ** 2, 0);
    variance = sq / (prices.length - 1);
  }
  const stddev = Math.sqrt(variance);
  const volatilityPct = avg > 0 ? (stddev / avg) * 100 : 0;
  const vsBankPct = entry.currentBankPrice && entry.currentBankPrice > 0
    ? ((last - entry.currentBankPrice) / entry.currentBankPrice) * 100
    : null;
  return { avg, min, max, last, lastTs, count: prices.length, volatilityPct, vsBankPct };
}

export const WINDOW_MS = {
  '7d': 7 * 86400000,
  '30d': 30 * 86400000,
  '90d': 90 * 86400000,
  'all': 0,
} as const;
