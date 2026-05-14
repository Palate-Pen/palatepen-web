import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getPrepBoard, type PrepBoard } from '@/lib/prep';
import { getMarginsData } from '@/lib/margins';

const dayMs = 24 * 60 * 60 * 1000;
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export type ManagerStationRollup = {
  name: string;
  primary_chef: string | null;
  done: number;
  in_progress: number;
  not_started: number;
  total: number;
};

export type SupplierSpendRow = {
  supplier_id: string | null;
  supplier_name: string;
  total: number;
  pct: number;
};

export type WasteCategoryRow = {
  category: string;
  total: number;
  count: number;
  pct: number;
};

export type TopMarginDish = {
  recipe_id: string;
  name: string;
  gp_pct: number;
  sell_price: number;
};

export type ManagerHomeData = {
  food_cost_7d: number;
  food_cost_count: number;
  outstanding_invoices_value: number;
  outstanding_invoices_count: number;
  outstanding_oldest_days: number | null;
  waste_7d_value: number;
  waste_7d_count: number;
  /** Placeholder until covers schema lands. */
  covers_7d: number | null;
  prep_board: PrepBoard;
  prep_stations: ManagerStationRollup[];
  supplier_spend_90d: SupplierSpendRow[];
  waste_by_category_90d: WasteCategoryRow[];
  top_margin_dishes: TopMarginDish[];
};

type InvoiceSpendRow = {
  status: string;
  received_at: string;
  total: number | null;
  supplier_id: string | null;
  suppliers: { name: string } | null;
};

type WasteRollupRow = {
  category: string;
  value: number | null;
  logged_at: string;
};

export async function getManagerHomeData(
  siteId: string,
): Promise<ManagerHomeData> {
  const supabase = await createSupabaseServerClient();
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 7 * dayMs);
  const ninetyDaysAgo = new Date(today.getTime() - 90 * dayMs);

  // Pull all the slow pieces in parallel.
  const [
    prepBoard,
    margins,
    invoicesResp,
    wasteResp,
  ] = await Promise.all([
    getPrepBoard(siteId, isoDate(today)),
    getMarginsData(siteId),
    supabase
      .from('invoices')
      .select(
        'id, status, received_at, total, supplier_id, suppliers:supplier_id (name)',
      )
      .eq('site_id', siteId)
      .is('archived_at', null)
      .gte('received_at', isoDate(ninetyDaysAgo)),
    supabase
      .from('waste_entries')
      .select('category, value, logged_at')
      .eq('site_id', siteId)
      .is('archived_at', null)
      .gte('logged_at', ninetyDaysAgo.toISOString()),
  ]);

  const invoices = (invoicesResp.data ?? []) as unknown as InvoiceSpendRow[];
  const wasteRows = (wasteResp.data ?? []) as WasteRollupRow[];

  // Food cost (confirmed invoices, last 7 days)
  const sevenDayInvoices = invoices.filter(
    (i) =>
      i.status === 'confirmed' &&
      new Date(i.received_at) >= sevenDaysAgo,
  );
  const foodCost7d = sevenDayInvoices.reduce(
    (s, i) => s + (Number(i.total) || 0),
    0,
  );

  // Outstanding (scanned or flagged, not yet confirmed)
  const outstanding = invoices.filter(
    (i) => i.status === 'scanned' || i.status === 'flagged',
  );
  const outstandingValue = outstanding.reduce(
    (s, i) => s + (Number(i.total) || 0),
    0,
  );
  const outstandingOldest =
    outstanding.length === 0
      ? null
      : Math.max(
          ...outstanding.map((i) =>
            Math.floor(
              (today.getTime() - new Date(i.received_at).getTime()) / dayMs,
            ),
          ),
        );

  // Waste last 7 days
  const waste7d = wasteRows.filter(
    (w) => new Date(w.logged_at) >= sevenDaysAgo,
  );
  const wasteValue7d = waste7d.reduce(
    (s, w) => s + (Number(w.value) || 0),
    0,
  );

  // Prep station rollup
  const prepStations: ManagerStationRollup[] = prepBoard.stations.map((s) => ({
    name: s.name,
    primary_chef: s.primary_chef,
    done: s.done,
    in_progress: s.in_progress,
    not_started: s.not_started,
    total: s.items.length,
  }));

  // Supplier spend, last 90 days, confirmed invoices only
  const supplierMap = new Map<string, { name: string; total: number }>();
  for (const inv of invoices) {
    if (inv.status !== 'confirmed') continue;
    const sid = inv.supplier_id ?? 'unknown';
    const name = inv.suppliers?.name ?? 'Unknown';
    const total = Number(inv.total) || 0;
    const cur = supplierMap.get(sid) ?? { name, total: 0 };
    cur.total += total;
    supplierMap.set(sid, cur);
  }
  const supplierTotal = Array.from(supplierMap.values()).reduce(
    (s, x) => s + x.total,
    0,
  );
  const supplierSpend: SupplierSpendRow[] = Array.from(supplierMap.entries())
    .map(([sid, x]) => ({
      supplier_id: sid === 'unknown' ? null : sid,
      supplier_name: x.name,
      total: x.total,
      pct: supplierTotal > 0 ? (x.total / supplierTotal) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Waste by category, last 90 days
  const wasteCatMap = new Map<string, { total: number; count: number }>();
  for (const w of wasteRows) {
    const cur = wasteCatMap.get(w.category) ?? { total: 0, count: 0 };
    cur.total += Number(w.value) || 0;
    cur.count += 1;
    wasteCatMap.set(w.category, cur);
  }
  const wasteTotal = Array.from(wasteCatMap.values()).reduce(
    (s, x) => s + x.total,
    0,
  );
  const wasteByCategory: WasteCategoryRow[] = Array.from(wasteCatMap.entries())
    .map(([category, x]) => ({
      category,
      total: x.total,
      count: x.count,
      pct: wasteTotal > 0 ? (x.total / wasteTotal) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Top margin dishes
  const topMargins: TopMarginDish[] = margins.recipes
    .filter(
      (r) =>
        r.sell_price != null &&
        r.cost_per_cover != null &&
        r.sell_price > 0,
    )
    .map((r) => ({
      recipe_id: r.id,
      name: r.name,
      gp_pct:
        ((r.sell_price! - r.cost_per_cover!) / r.sell_price!) * 100,
      sell_price: r.sell_price!,
    }))
    .sort((a, b) => b.gp_pct - a.gp_pct)
    .slice(0, 5);

  return {
    food_cost_7d: foodCost7d,
    food_cost_count: sevenDayInvoices.length,
    outstanding_invoices_value: outstandingValue,
    outstanding_invoices_count: outstanding.length,
    outstanding_oldest_days: outstandingOldest,
    waste_7d_value: wasteValue7d,
    waste_7d_count: waste7d.length,
    covers_7d: null,
    prep_board: prepBoard,
    prep_stations: prepStations,
    supplier_spend_90d: supplierSpend,
    waste_by_category_90d: wasteByCategory,
    top_margin_dishes: topMargins,
  };
}
