import { createSupabaseServerClient } from '@/lib/supabase/server';

export type BankPricePoint = {
  price: number;
  recorded_at: string;
};

export type BankRow = {
  ingredient_id: string;
  name: string;
  spec: string | null;
  unit: string | null;
  category: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  current_price: number;
  last_seen_at: string | null;
  history: BankPricePoint[];
  movement_pct: number;
  multi_supplier_count: number;
  /** Par-tracking fields. Optional — null means the chef hasn't set
   *  one up. Surfaced on The Bank list as a Stock column when any
   *  ingredient has them set. */
  par_level: number | null;
  reorder_point: number | null;
  current_stock: number | null;
  par_status: 'breach' | 'low' | 'healthy' | 'unknown';
};

export type BankSummary = {
  ingredients_on_file: number;
  suppliers_active: number;
  prices_on_the_move: number;
  movement_up: number;
  movement_down: number;
  auto_updated_this_week: number;
  multi_sourced: number;
  last_update_at: string | null;
};

const MOVEMENT_FLAT_THRESHOLD = 1.5;

function pickPriceAt(history: BankPricePoint[], targetIso: string): number | null {
  if (history.length === 0) return null;
  const target = new Date(targetIso).getTime();
  let best: BankPricePoint | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const p of history) {
    const t = new Date(p.recorded_at).getTime();
    const delta = Math.abs(t - target);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = p;
    }
  }
  return best?.price ?? null;
}

export async function getBankRows(siteId: string): Promise<BankRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data: ingredients, error: ingErr } = await supabase
    .from('ingredients')
    .select(
      'id, name, spec, unit, category, supplier_id, current_price, last_seen_at, par_level, reorder_point, current_stock',
    )
    .eq('site_id', siteId);
  if (ingErr) throw new Error(`bank.getBankRows ingredients: ${ingErr.message}`);
  if (!ingredients || ingredients.length === 0) return [];

  const ingredientIds = ingredients.map((i) => i.id as string);
  const supplierIds = Array.from(
    new Set(
      ingredients
        .map((i) => i.supplier_id as string | null)
        .filter((s): s is string => !!s),
    ),
  );

  const since = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
  const { data: history, error: histErr } = await supabase
    .from('ingredient_price_history')
    .select('ingredient_id, price, recorded_at')
    .in('ingredient_id', ingredientIds)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true });
  if (histErr) throw new Error(`bank.getBankRows history: ${histErr.message}`);

  const { data: suppliers, error: supErr } = await supabase
    .from('suppliers')
    .select('id, name')
    .in('id', supplierIds.length ? supplierIds : ['00000000-0000-0000-0000-000000000000']);
  if (supErr) throw new Error(`bank.getBankRows suppliers: ${supErr.message}`);
  const supplierMap = new Map(
    (suppliers ?? []).map((s) => [s.id as string, s.name as string]),
  );

  const historyByIngredient = new Map<string, BankPricePoint[]>();
  for (const h of history ?? []) {
    const arr = historyByIngredient.get(h.ingredient_id as string) ?? [];
    arr.push({
      price: Number(h.price),
      recorded_at: h.recorded_at as string,
    });
    historyByIngredient.set(h.ingredient_id as string, arr);
  }

  const nameCount = new Map<string, number>();
  for (const i of ingredients) {
    const key = (i.name as string).toLowerCase();
    nameCount.set(key, (nameCount.get(key) ?? 0) + 1);
  }

  const fourteenDaysAgoIso = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  return ingredients
    .map((i): BankRow => {
      const id = i.id as string;
      const ingHistory = historyByIngredient.get(id) ?? [];
      const current = Number(i.current_price);
      const prior = pickPriceAt(ingHistory, fourteenDaysAgoIso);
      const movement_pct =
        prior && prior > 0 ? ((current - prior) / prior) * 100 : 0;
      const stock =
        i.current_stock != null ? Number(i.current_stock) : null;
      const reorder =
        i.reorder_point != null ? Number(i.reorder_point) : null;
      const par = i.par_level != null ? Number(i.par_level) : null;
      let parStatus: BankRow['par_status'] = 'unknown';
      if (stock != null && reorder != null) {
        if (stock <= reorder) parStatus = 'breach';
        else if (par != null && stock < par * 0.75) parStatus = 'low';
        else parStatus = 'healthy';
      }
      return {
        ingredient_id: id,
        name: i.name as string,
        spec: (i.spec as string | null) ?? null,
        unit: (i.unit as string | null) ?? null,
        category: (i.category as string | null) ?? null,
        supplier_id: (i.supplier_id as string | null) ?? null,
        supplier_name: i.supplier_id
          ? (supplierMap.get(i.supplier_id as string) ?? null)
          : null,
        current_price: current,
        last_seen_at: (i.last_seen_at as string | null) ?? null,
        history: ingHistory,
        movement_pct,
        multi_supplier_count: nameCount.get((i.name as string).toLowerCase()) ?? 1,
        par_level: par,
        reorder_point: reorder,
        current_stock: stock,
        par_status: parStatus,
      };
    })
    .sort((a, b) => Math.abs(b.movement_pct) - Math.abs(a.movement_pct));
}

export async function getBankSummary(siteId: string): Promise<BankSummary> {
  const rows = await getBankRows(siteId);
  let up = 0;
  let down = 0;
  for (const r of rows) {
    if (r.movement_pct >= MOVEMENT_FLAT_THRESHOLD) up += 1;
    else if (r.movement_pct <= -MOVEMENT_FLAT_THRESHOLD) down += 1;
  }

  const supplierIds = new Set(
    rows.map((r) => r.supplier_id).filter((s): s is string => !!s),
  );
  const lastUpdate = rows
    .map((r) => r.last_seen_at)
    .filter((t): t is string => !!t)
    .sort()
    .reverse()[0] ?? null;

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const autoUpdated = rows.filter((r) => {
    if (!r.last_seen_at) return false;
    return new Date(r.last_seen_at).getTime() >= weekAgo;
  }).length;

  const multiSourced = rows.filter((r) => r.multi_supplier_count > 1).length;

  return {
    ingredients_on_file: rows.length,
    suppliers_active: supplierIds.size,
    prices_on_the_move: up + down,
    movement_up: up,
    movement_down: down,
    auto_updated_this_week: autoUpdated,
    multi_sourced: multiSourced,
    last_update_at: lastUpdate,
  };
}

export function isFlatMovement(pct: number): boolean {
  return Math.abs(pct) < MOVEMENT_FLAT_THRESHOLD;
}

/**
 * Generate the SVG polyline points string for a 30-day sparkline.
 * Maps history evenly across [0, 120] on the x-axis and [4, 32] on the y-axis,
 * inverted so higher price renders higher on the chart.
 * If all prices are identical (or the window is too short), returns a flat midline.
 */
export function sparklinePoints(history: BankPricePoint[]): string {
  if (history.length === 0) return '';
  if (history.length === 1) return '0,18 120,18';

  const prices = history.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min;

  const n = history.length;
  return history
    .map((p, i) => {
      const x = (i / (n - 1)) * 120;
      const y = range > 0 ? 32 - ((p.price - min) / range) * 28 : 18;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/**
 * Last sparkline point coordinate — used for the trailing dot.
 */
export function sparklineLastPoint(history: BankPricePoint[]): { x: number; y: number } {
  if (history.length === 0) return { x: 120, y: 18 };
  const prices = history.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min;
  const last = history[history.length - 1];
  return {
    x: 120,
    y: range > 0 ? 32 - ((last.price - min) / range) * 28 : 18,
  };
}
