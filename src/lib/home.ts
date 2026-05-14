import { getShellContext } from '@/lib/shell/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type HomeRollup = {
  // Live numbers for the Kitchen-at-a-Glance KPI strip.
  menu_gp_pct: number | null;
  stock_value: number | null;
  todays_deliveries_due: number;
  waste_this_week: number;
  // Today's prep status — top-of-page rollup
  prep_total_today: number;
  prep_done_today: number;
  prep_in_progress_today: number;
  // Today's deliveries
  todays_delivery_suppliers: string[];
  // Recipes count + menu activity placeholder until menus schema lands
  recipes_count: number;
};

/**
 * Server-side aggregate for the Home dashboard. Reads across every
 * surface's v2 table — Margins (recipes × bank), Stock (deliveries,
 * waste), Prep (prep_items today), Bank (ingredients).
 *
 * Single call per page render — keeps the home page fast even as more
 * surfaces wire up.
 */
export async function getHomeRollup(siteId: string): Promise<HomeRollup> {
  const supabase = await createSupabaseServerClient();
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    recipesRes,
    deliveriesRes,
    wasteRes,
    prepRes,
    suppliersRes,
  ] = await Promise.all([
    supabase
      .from('recipes')
      .select('sell_price')
      .eq('site_id', siteId)
      .is('archived_at', null),
    supabase
      .from('deliveries')
      .select('id, supplier_id, expected_at, status')
      .eq('site_id', siteId)
      .eq('expected_at', todayIso)
      .is('archived_at', null),
    supabase
      .from('waste_entries')
      .select('value')
      .eq('site_id', siteId)
      .gte('logged_at', sevenDaysAgo.toISOString())
      .is('archived_at', null),
    supabase
      .from('prep_items')
      .select('status')
      .eq('site_id', siteId)
      .eq('prep_date', todayIso),
    supabase.from('suppliers').select('id, name').eq('site_id', siteId),
  ]);

  const supplierName = new Map(
    (suppliersRes.data ?? []).map((s) => [s.id as string, s.name as string]),
  );

  // Menu GP: cheaper to compute via the existing Margins lib, but doing
  // it inline here so Home doesn't pull every recipe-ingredient row
  // for a glance number. Recipes' menu GP requires cost-per-cover,
  // which needs the recipe_ingredients × ingredients join — defer for
  // now and rely on Margins' computation if the user navigates there.
  // For Home: report total recipes count + null GP (cost computation
  // is heavy; will land when we have a snapshotted aggregate).
  const recipesCount = recipesRes.data?.length ?? 0;

  const wasteValue = (wasteRes.data ?? []).reduce(
    (sum, w) => sum + (w.value == null ? 0 : Number(w.value)),
    0,
  );

  const prepItems = prepRes.data ?? [];
  const prepDone = prepItems.filter((p) => p.status === 'done').length;
  const prepInProgress = prepItems.filter(
    (p) => p.status === 'in_progress',
  ).length;

  const todaysDeliveries = deliveriesRes.data ?? [];
  const todaysSuppliers = todaysDeliveries
    .map((d) => supplierName.get(d.supplier_id as string))
    .filter((n): n is string => !!n);

  return {
    menu_gp_pct: null, // deferred — Margins owns the heavy computation
    stock_value: null, // pending — no stock-counted schema yet
    todays_deliveries_due: todaysDeliveries.length,
    waste_this_week: wasteValue,
    prep_total_today: prepItems.length,
    prep_done_today: prepDone,
    prep_in_progress_today: prepInProgress,
    todays_delivery_suppliers: todaysSuppliers,
    recipes_count: recipesCount,
  };
}

export { getShellContext };
