// Per-supplier delivery reliability scoring. Reads the same invoice array
// as the price benchmark / supplier performance surfaces but cuts on
// invoice.status ('confirmed' | 'flagged') and invoice.discrepancies — both
// set by the delivery-check flow in InvoicesView.
//
// Score is a 0-10 number combining:
//   - Confirmation ratio (10 × confirmed / total)
//   - Discrepancy severity penalty (avg flagged-invoice discrepancy value as
//     a fraction of avg invoice value, scaled and subtracted)
// Legacy invoices without a `status` field are treated as confirmed — the
// feature is opt-in and a chef who never opens the delivery check shouldn't
// see their suppliers' scores collapse to zero.

export interface DiscrepancyEntry {
  name: string;
  invoicedQty: number;
  receivedQty: number;
  received: boolean;
  note?: string;
  unitPrice?: number;
  unit?: string;
}

export interface SupplierReliability {
  name: string;
  nameKey: string;
  totalInvoices: number;
  confirmedCount: number;
  flaggedCount: number;
  totalValue: number;          // sum of invoice totals over all-time
  totalDiscrepancyValue: number; // sum of (invoiced - received) × unitPrice on flagged invoices
  avgInvoiceValue: number;
  score: number;               // 0-10
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  scoreRecent: number;         // score over last 45d (for trend comparison)
  scorePrior: number;          // score over prior 45d
  topIssue: { name: string; count: number } | null; // most-flagged ingredient by occurrence
  lastInvoiceTs: number;
}

function normalise(s: string): string {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Compute the £ discrepancy from a flagged invoice. Uses each discrepancy
// row's unitPrice if stored, else falls back to the matching invoice item's
// unitPrice (matched by name).
function discrepancyValue(inv: any): number {
  const items = Array.isArray(inv?.items) ? inv.items : [];
  const discrepancies = Array.isArray(inv?.discrepancies) ? inv.discrepancies : [];
  let total = 0;
  for (const d of discrepancies) {
    const invoiced = Number(d?.invoicedQty || 0);
    const received = Number(d?.receivedQty || 0);
    const shortfall = invoiced - received;
    if (shortfall <= 0) continue;
    let unitPrice = Number(d?.unitPrice || 0);
    if (!unitPrice) {
      const match = items.find((it: any) => normalise(it?.name) === normalise(d?.name));
      unitPrice = Number(match?.unitPrice || 0);
    }
    total += shortfall * unitPrice;
  }
  return total;
}

function invoiceTotal(inv: any): number {
  const t = Number(inv?.total);
  if (Number.isFinite(t) && t > 0) return t;
  const items = Array.isArray(inv?.items) ? inv.items : [];
  return items.reduce((s: number, it: any) => {
    const explicit = Number(it?.totalPrice);
    if (Number.isFinite(explicit) && explicit > 0) return s + explicit;
    return s + (Number(it?.unitPrice || 0) * Number(it?.qty || 0));
  }, 0);
}

// Score helper applied to either a full window or a half-window for trend.
function scoreInvoices(invs: any[]): number {
  if (invs.length === 0) return 10;
  const confirmed = invs.filter(i => (i?.status || 'confirmed') === 'confirmed').length;
  const flagged   = invs.length - confirmed;
  const base = 10 * (confirmed / invs.length);
  if (flagged === 0) return Math.round(base * 10) / 10;
  // Severity penalty: avg discrepancy value on flagged invoices as a
  // fraction of avg invoice value, capped at 4 points off (so even
  // catastrophic discrepancies don't take a perfect 80%-confirmed
  // supplier below 4/10).
  const flaggedRows = invs.filter(i => i?.status === 'flagged');
  const avgInv = invs.reduce((s, i) => s + invoiceTotal(i), 0) / invs.length;
  const avgDisc = flaggedRows.reduce((s, i) => s + discrepancyValue(i), 0) / flaggedRows.length;
  const severity = avgInv > 0 ? Math.min(1, avgDisc / avgInv) : 0;
  const penalty = severity * 4;
  return Math.max(0, Math.round((base - penalty) * 10) / 10);
}

export function buildSupplierReliability(invoices: any[] = []): SupplierReliability[] {
  const groups = new Map<string, { name: string; rows: any[] }>();
  for (const inv of invoices) {
    const key = normalise(inv?.supplier);
    if (!key) continue;
    let g = groups.get(key);
    if (!g) {
      g = { name: String(inv?.supplier || '').trim() || key, rows: [] };
      groups.set(key, g);
    }
    g.rows.push(inv);
  }

  const now = Date.now();
  const D = 86400000;
  const last45 = now - 45 * D;
  const prior45 = now - 90 * D;

  const out: SupplierReliability[] = [];
  groups.forEach((g, key) => {
    const rows = g.rows;
    const confirmedCount = rows.filter(i => (i?.status || 'confirmed') === 'confirmed').length;
    const flaggedCount = rows.length - confirmedCount;
    const totalValue = rows.reduce((s, i) => s + invoiceTotal(i), 0);
    const totalDiscrepancyValue = rows.filter(i => i?.status === 'flagged').reduce((s, i) => s + discrepancyValue(i), 0);
    const lastInvoiceTs = rows.reduce((m, i) => Math.max(m, Number(i?.scannedAt || i?.receivedAt || 0)), 0);

    // Trend windows.
    const recentRows = rows.filter(i => {
      const t = Number(i?.scannedAt || i?.receivedAt || 0);
      return t >= last45;
    });
    const priorRows = rows.filter(i => {
      const t = Number(i?.scannedAt || i?.receivedAt || 0);
      return t >= prior45 && t < last45;
    });
    const scoreRecent = scoreInvoices(recentRows);
    const scorePrior = scoreInvoices(priorRows);

    let trend: SupplierReliability['trend'];
    if (recentRows.length === 0 || priorRows.length === 0) {
      trend = 'insufficient_data';
    } else if (scoreRecent > scorePrior + 0.3) {
      trend = 'improving';
    } else if (scoreRecent < scorePrior - 0.3) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    // Top issue — count occurrences of each flagged ingredient name across
    // all flagged invoices for this supplier. Pick the highest.
    const issueCounts = new Map<string, { name: string; count: number }>();
    for (const inv of rows) {
      if (inv?.status !== 'flagged') continue;
      const ds = Array.isArray(inv?.discrepancies) ? inv.discrepancies : [];
      for (const d of ds) {
        const issueName = String(d?.name || '').trim();
        if (!issueName) continue;
        // Only count items that were actually short or missing (received < invoiced)
        const wasShort = Number(d?.receivedQty || 0) < Number(d?.invoicedQty || 0) || d?.received === false;
        if (!wasShort) continue;
        const k = normalise(issueName);
        const existing = issueCounts.get(k);
        if (existing) existing.count += 1;
        else issueCounts.set(k, { name: issueName, count: 1 });
      }
    }
    const topIssue = Array.from(issueCounts.values()).sort((a, b) => b.count - a.count)[0] || null;

    out.push({
      name: g.name,
      nameKey: key,
      totalInvoices: rows.length,
      confirmedCount,
      flaggedCount,
      totalValue,
      totalDiscrepancyValue,
      avgInvoiceValue: rows.length > 0 ? totalValue / rows.length : 0,
      score: scoreInvoices(rows),
      trend,
      scoreRecent,
      scorePrior,
      topIssue,
      lastInvoiceTs,
    });
  });

  // Default order: lowest score first — chefs need to see the problem
  // suppliers, not the perfect ones.
  out.sort((a, b) => a.score - b.score);
  return out;
}

// Map by nameKey for O(1) lookup in the history list (so we can render the
// score next to each invoice's supplier).
export function reliabilityByName(rels: SupplierReliability[]): Map<string, SupplierReliability> {
  const m = new Map<string, SupplierReliability>();
  for (const r of rels) m.set(r.nameKey, r);
  return m;
}

// Last-30-day discrepancy summary for the banner at top of /invoices.
export function recentDiscrepancySummary(invoices: any[] = []): { count: number; value: number } {
  const cutoff = Date.now() - 30 * 86400000;
  const flaggedRecent = invoices.filter(i => {
    const t = Number(i?.scannedAt || i?.receivedAt || 0);
    return i?.status === 'flagged' && t >= cutoff;
  });
  const value = flaggedRecent.reduce((s, i) => s + discrepancyValue(i), 0);
  return { count: flaggedRecent.length, value };
}
