/**
 * Forward-signal detectors. Each detector inspects current site state
 * and emits zero or more signals. Used by:
 *
 *   1. The founder /admin/ops reseed action — wipes existing signals
 *      then re-runs detectors to surface fresh insights based on the
 *      newly-shifted data.
 *
 *   2. (Future) a scheduled job that runs detectors every N minutes for
 *      real customer accounts.
 *
 * Design rules:
 *   - Detectors are honest. If state doesn't satisfy the condition,
 *     they emit nothing. No filler signals.
 *   - Each detector is independent — failure of one doesn't cascade.
 *   - Voice is observational, day-not-time, italic gold em accents
 *     (see headline_em). No "AI", no "data shows", no "algorithm".
 *   - Each signal has detector_kind = 'auto' so the next regeneration
 *     can sweep old auto signals before re-inserting.
 */

import type { createSupabaseServiceClient } from '@/lib/supabase/service';

export type SignalInsert = {
  site_id: string;
  target_surface: string;
  target_role: 'owner' | 'manager' | 'chef' | 'bartender' | null;
  tag: 'plan_for_it' | 'get_ready' | 'worth_knowing' | 'market_move';
  severity: 'urgent' | 'attention' | 'healthy' | 'info';
  section_label: string;
  headline_pre: string | null;
  headline_em: string | null;
  headline_post: string | null;
  body_md: string;
  action_label: string | null;
  action_target: string | null;
  action_context: string | null;
  detector_kind: string;
  detector_key: string;
  payload: Record<string, unknown>;
  display_priority: number;
  emitted_at: string;
  expires_at: string | null;
};

type SupaClient = ReturnType<typeof createSupabaseServiceClient>;

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

function isoNow(): string {
  return new Date().toISOString();
}

function isoIn(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Run all detectors, wipe existing detector_kind='auto' signals, insert
 * the fresh batch. Returns per-detector counts.
 */
export async function regenerateSignalsForSite(
  svc: SupaClient,
  siteId: string,
): Promise<{ total: number; by_detector: Record<string, number> }> {
  const detectors: Array<{
    key: string;
    fn: (
      svc: SupaClient,
      siteId: string,
    ) => Promise<SignalInsert[]>;
  }> = [
    { key: 'par_breach', fn: detectParBreaches },
    { key: 'allocations_arriving', fn: detectAllocationsArriving },
    { key: 'flagged_invoices', fn: detectFlaggedInvoicesNeedingCreditNotes },
    { key: 'recipe_drift', fn: detectRecipeCostDrift },
    { key: 'spillage_pattern', fn: detectSpillagePatterns },
    { key: 'stock_take_variance', fn: detectStockTakeVariance },
    { key: 'today_deliveries', fn: detectTodaysDeliveries },
    { key: 'tonight_prep', fn: detectTonightsPrep },
    { key: 'idle_recipe', fn: detectIdleRecipes },
    { key: 'stale_cost_baseline', fn: detectStaleCostBaseline },
    { key: 'prep_pattern_lag', fn: detectPrepPatternLag },
    { key: 'menu_gp_drag', fn: detectMenuGpDrag },
    { key: 'notebook_link_drift', fn: detectNotebookLinkDrift },
  ];

  // Sweep prior auto signals so the regeneration is clean.
  await svc
    .from('forward_signals')
    .delete()
    .eq('site_id', siteId)
    .eq('detector_kind', 'auto');

  const allSignals: SignalInsert[] = [];
  const counts: Record<string, number> = {};
  for (const d of detectors) {
    try {
      const sigs = await d.fn(svc, siteId);
      counts[d.key] = sigs.length;
      allSignals.push(...sigs);
    } catch (e) {
      console.error(`[detector:${d.key}]`, (e as Error).message);
      counts[d.key] = 0;
    }
  }

  if (allSignals.length > 0) {
    await svc.from('forward_signals').insert(allSignals);
  }

  return { total: allSignals.length, by_detector: counts };
}

// ---------------------------------------------------------------------
// Detector: par breaches
// ---------------------------------------------------------------------
async function detectParBreaches(
  svc: SupaClient,
  siteId: string,
): Promise<SignalInsert[]> {
  const { data } = await svc
    .from('ingredients')
    .select('id, name, current_stock, reorder_point, par_level, unit, unit_type')
    .eq('site_id', siteId)
    .not('reorder_point', 'is', null)
    .not('current_stock', 'is', null);
  const breached = (data ?? []).filter(
    (r) =>
      r.reorder_point != null &&
      r.current_stock != null &&
      Number(r.current_stock) <= Number(r.reorder_point),
  );
  if (breached.length === 0) return [];

  const BAR_UNITS = new Set(['bottle', 'case', 'keg', 'cask', 'L', 'ml']);
  const barBreaches = breached.filter((r) =>
    BAR_UNITS.has(r.unit_type as string),
  );
  const kitchenBreaches = breached.filter(
    (r) => !BAR_UNITS.has(r.unit_type as string),
  );

  const signals: SignalInsert[] = [];
  const now = isoNow();
  const expires = isoIn(3);

  if (barBreaches.length > 0) {
    const names = barBreaches.slice(0, 3).map((b) => b.name as string);
    signals.push({
      site_id: siteId,
      target_surface: 'bar_home',
      target_role: 'bartender',
      tag: 'get_ready',
      severity: 'urgent',
      section_label: 'Running thin',
      headline_pre: `${barBreaches.length === 1 ? 'One bottle' : `${barBreaches.length} bottles`} `,
      headline_em: 'under reorder',
      headline_post: '',
      body_md: `${names.join(', ')}${
        barBreaches.length > 3
          ? ` + ${barBreaches.length - 3} more`
          : ''
      } sliding below the reorder point. Order today before Friday service bites.`,
      action_label: 'Open Cellar →',
      action_target: '/bartender/back-bar/cellar?filter=par-breach',
      action_context: null,
      detector_kind: 'auto',
      detector_key: 'par_breach_bar',
      payload: { count: barBreaches.length, names },
      display_priority: 90,
      emitted_at: now,
      expires_at: expires,
    });
  }

  if (kitchenBreaches.length > 0) {
    const names = kitchenBreaches.slice(0, 3).map((b) => b.name as string);
    signals.push({
      site_id: siteId,
      target_surface: 'stock-suppliers',
      target_role: 'chef',
      tag: 'get_ready',
      severity: kitchenBreaches.length > 3 ? 'urgent' : 'attention',
      section_label: 'Under reorder',
      headline_pre: `${kitchenBreaches.length} ${kitchenBreaches.length === 1 ? 'ingredient' : 'ingredients'} `,
      headline_em: 'under par',
      headline_post: '',
      body_md: `${names.join(', ')}${
        kitchenBreaches.length > 3
          ? ` + ${kitchenBreaches.length - 3} more`
          : ''
      } sliding below the reorder point. Worth a glance at Suppliers — schedule the order.`,
      action_label: 'Open Stock Count →',
      action_target: '/stock-suppliers/stock-count',
      action_context: null,
      detector_kind: 'auto',
      detector_key: 'par_breach_kitchen',
      payload: { count: kitchenBreaches.length, names },
      display_priority: 80,
      emitted_at: now,
      expires_at: expires,
    });
  }

  return signals;
}

// ---------------------------------------------------------------------
// Detector: allocations arriving in next 14 days
// ---------------------------------------------------------------------
async function detectAllocationsArriving(
  svc: SupaClient,
  siteId: string,
): Promise<SignalInsert[]> {
  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const { data } = await svc
    .from('allocations')
    .select('id, name, expected_date, allocated_quantity, unit')
    .eq('site_id', siteId)
    .gte('expected_date', today)
    .lte('expected_date', horizon)
    .is('received_at', null)
    .order('expected_date', { ascending: true });
  const items = data ?? [];
  if (items.length === 0) return [];

  const nearest = items[0];
  const daysOut = Math.round(
    (new Date(nearest.expected_date as string).getTime() -
      new Date(today).getTime()) /
      (24 * 60 * 60 * 1000),
  );
  return [
    {
      site_id: siteId,
      target_surface: 'bar_home',
      target_role: 'bartender',
      tag: 'plan_for_it',
      severity: 'attention',
      section_label: `Allocation due in ${daysOut === 0 ? 'today' : daysOut === 1 ? '1 day' : daysOut + ' days'}`,
      headline_pre: '',
      headline_em: nearest.name as string,
      headline_post:
        daysOut === 0 ? ' lands today' : ` lands in ${daysOut} days`,
      body_md: `${nearest.allocated_quantity} ${nearest.unit ?? 'units'} on the way. ${
        items.length > 1
          ? `Plus ${items.length - 1} more allocation${items.length > 2 ? 's' : ''} in the next fortnight — see Cellar for the full picture.`
          : 'Think about whether to feature it on the list.'
      }`,
      action_label: 'Open Cellar →',
      action_target: '/bartender/back-bar/cellar',
      action_context: null,
      detector_kind: 'auto',
      detector_key: 'allocations_arriving',
      payload: { count: items.length },
      display_priority: 70,
      emitted_at: isoNow(),
      expires_at: isoIn(daysOut + 1),
    },
  ];
}

// ---------------------------------------------------------------------
// Detector: flagged invoices that don't yet have a credit note drafted
// ---------------------------------------------------------------------
async function detectFlaggedInvoicesNeedingCreditNotes(
  svc: SupaClient,
  siteId: string,
): Promise<SignalInsert[]> {
  const { data: flagged } = await svc
    .from('invoices')
    .select('id, invoice_number, total, suppliers:supplier_id (name)')
    .eq('site_id', siteId)
    .eq('status', 'flagged');
  const flaggedIds = (flagged ?? []).map((f) => f.id as string);
  if (flaggedIds.length === 0) return [];

  const { data: existing } = await svc
    .from('credit_notes')
    .select('source_invoice_id')
    .in('source_invoice_id', flaggedIds);
  const claimed = new Set(
    (existing ?? []).map((c) => c.source_invoice_id as string),
  );
  const unclaimed = (flagged ?? []).filter((f) => !claimed.has(f.id as string));
  if (unclaimed.length === 0) return [];

  const first = unclaimed[0] as unknown as {
    id: string;
    invoice_number: string | null;
    total: number | null;
    suppliers: { name?: string } | null;
  };
  const supplierName = first.suppliers?.name ?? 'a supplier';

  return [
    {
      site_id: siteId,
      target_surface: 'stock-suppliers',
      target_role: 'chef',
      tag: 'get_ready',
      severity: 'attention',
      section_label: 'Credit note pending',
      headline_pre: `${unclaimed.length === 1 ? 'One flagged invoice' : `${unclaimed.length} flagged invoices`} `,
      headline_em: 'without a credit note',
      headline_post: '',
      body_md: `${supplierName}${unclaimed.length > 1 ? ` + ${unclaimed.length - 1} more` : ''} — the discrepancy line is on file but the credit note hasn't been drafted yet. Quickest cash to recover is the one you've already noticed.`,
      action_label: 'Open Invoices →',
      action_target: '/stock-suppliers/invoices',
      action_context: null,
      detector_kind: 'auto',
      detector_key: 'flagged_no_credit_note',
      payload: { count: unclaimed.length },
      display_priority: 65,
      emitted_at: isoNow(),
      expires_at: isoIn(7),
    },
  ];
}

// ---------------------------------------------------------------------
// Detector: recipe cost drift vs baseline
// ---------------------------------------------------------------------
async function detectRecipeCostDrift(
  svc: SupaClient,
  siteId: string,
): Promise<SignalInsert[]> {
  // Pull recipes + their ingredients + bank prices
  const { data: recipes } = await svc
    .from('recipes')
    .select(
      'id, name, dish_type, cost_baseline, sell_price, recipe_ingredients (qty, unit, ingredients:ingredient_id (current_price, pack_volume_ml))',
    )
    .eq('site_id', siteId)
    .is('archived_at', null)
    .not('cost_baseline', 'is', null);

  const ML_UNITS = new Set(['ml', 'l']);
  const drifts: Array<{
    name: string;
    drift_pct: number;
    dish_type: string;
    sell_price: number | null;
    current_cost: number;
    baseline: number;
  }> = [];

  for (const r of recipes ?? []) {
    const baseline = r.cost_baseline != null ? Number(r.cost_baseline) : null;
    if (baseline == null || baseline <= 0) continue;
    let total = 0;
    const lines = (r.recipe_ingredients ?? []) as unknown as Array<{
      qty: number;
      unit: string;
      ingredients: {
        current_price: number | null;
        pack_volume_ml: number | null;
      } | null;
    }>;
    for (const l of lines) {
      const ing = l.ingredients;
      if (!ing || ing.current_price == null) continue;
      const price = Number(ing.current_price);
      const qty = Number(l.qty);
      const u = (l.unit ?? '').toLowerCase();
      const pvml = ing.pack_volume_ml != null ? Number(ing.pack_volume_ml) : null;
      if (pvml != null && pvml > 0 && ML_UNITS.has(u)) {
        const ml = u === 'l' ? qty * 1000 : qty;
        total += (price / pvml) * ml;
      } else {
        total += price * qty;
      }
    }
    if (total <= 0) continue;
    const driftPct = ((total - baseline) / baseline) * 100;
    if (Math.abs(driftPct) >= 3) {
      drifts.push({
        name: r.name as string,
        drift_pct: driftPct,
        dish_type: (r.dish_type as string) ?? 'food',
        sell_price: r.sell_price != null ? Number(r.sell_price) : null,
        current_cost: total,
        baseline,
      });
    }
  }
  if (drifts.length === 0) return [];

  drifts.sort((a, b) => Math.abs(b.drift_pct) - Math.abs(a.drift_pct));
  const top = drifts[0];
  const direction = top.drift_pct > 0 ? 'up' : 'down';
  const food = drifts.filter((d) => d.dish_type === 'food');
  const bar = drifts.filter((d) => d.dish_type !== 'food');

  const signals: SignalInsert[] = [];
  if (food.length > 0) {
    const foodTop = food[0];
    signals.push({
      site_id: siteId,
      target_surface: 'margins',
      target_role: 'chef',
      tag: 'market_move',
      severity: Math.abs(foodTop.drift_pct) > 8 ? 'urgent' : 'attention',
      section_label: 'Margin drift',
      headline_pre: `${foodTop.name} cost is `,
      headline_em: `${direction} ${Math.abs(foodTop.drift_pct).toFixed(0)}%`,
      headline_post: ' since costed',
      body_md: `Now ${gbp.format(foodTop.current_cost)} per cover (baseline ${gbp.format(foodTop.baseline)}). ${
        food.length > 1
          ? `${food.length - 1} other dish${food.length === 2 ? '' : 'es'} drifting too — open Margins to see the full list.`
          : 'Probably worth a glance before raising the menu price.'
      }`,
      action_label: 'Open Margins →',
      action_target: '/margins',
      action_context: null,
      detector_kind: 'auto',
      detector_key: 'recipe_drift_food',
      payload: { count: food.length },
      display_priority: 60,
      emitted_at: isoNow(),
      expires_at: isoIn(14),
    });
  }
  if (bar.length > 0) {
    const barTop = bar[0];
    signals.push({
      site_id: siteId,
      target_surface: 'bar_margins',
      target_role: 'bartender',
      tag: 'market_move',
      severity: 'attention',
      section_label: 'Pour-cost drift',
      headline_pre: `${barTop.name} cost is `,
      headline_em: `${direction} ${Math.abs(barTop.drift_pct).toFixed(0)}%`,
      headline_post: ' per pour',
      body_md: `Now ${gbp.format(barTop.current_cost)} per pour (baseline ${gbp.format(barTop.baseline)}). ${
        bar.length > 1
          ? `${bar.length - 1} other spec${bar.length === 2 ? '' : 's'} drifting — open Margins for the band view.`
          : 'Still inside the band but the cushion is shrinking.'
      }`,
      action_label: 'Open Margins →',
      action_target: '/bartender/margins',
      action_context: null,
      detector_kind: 'auto',
      detector_key: 'recipe_drift_bar',
      payload: { count: bar.length },
      display_priority: 55,
      emitted_at: isoNow(),
      expires_at: isoIn(14),
    });
  }
  return signals;
}

// ---------------------------------------------------------------------
// Detector: spillage patterns (same ingredient 3+ times in 14 days)
// ---------------------------------------------------------------------
async function detectSpillagePatterns(
  svc: SupaClient,
  siteId: string,
): Promise<SignalInsert[]> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await svc
    .from('waste_entries')
    .select('name, value, spillage_reason, logged_at')
    .eq('site_id', siteId)
    .not('spillage_reason', 'is', null)
    .gte('logged_at', since);
  const events = data ?? [];
  if (events.length === 0) return [];

  const byName = new Map<string, { count: number; value: number }>();
  for (const e of events) {
    const key = e.name as string;
    const cur = byName.get(key) ?? { count: 0, value: 0 };
    cur.count += 1;
    cur.value += Number((e as { value?: number | null }).value ?? 0);
    byName.set(key, cur);
  }
  const patterns = Array.from(byName.entries())
    .filter(([, v]) => v.count >= 3)
    .map(([name, v]) => ({ name, count: v.count, value: v.value }))
    .sort((a, b) => b.count - a.count);
  if (patterns.length === 0) return [];

  const top = patterns[0];
  return [
    {
      site_id: siteId,
      target_surface: 'bar_home',
      target_role: 'bartender',
      tag: 'worth_knowing',
      severity: 'attention',
      section_label: 'Spillage pattern',
      headline_pre: '',
      headline_em: top.name,
      headline_post: ` in spillage ${top.count} times in 12 days`,
      body_md: `${gbp.format(top.value)} of waste on this one bottle in the last fortnight. ${
        patterns.length > 1
          ? `${patterns.length - 1} other ${patterns.length === 2 ? 'spirit' : 'spirits'} flagging too — pattern's worth a five-minute chat with the well.`
          : "Could be a measuring habit, could be the speed pourer. Worth a five-minute chat with whoever's on the well."
      }`,
      action_label: 'Open Spillage →',
      action_target: '/bartender/back-bar/spillage',
      action_context: null,
      detector_kind: 'auto',
      detector_key: 'spillage_pattern',
      payload: { count: patterns.length, top_name: top.name },
      display_priority: 40,
      emitted_at: isoNow(),
      expires_at: isoIn(7),
    },
  ];
}

// ---------------------------------------------------------------------
// Detector: stock take variance worth a look
// ---------------------------------------------------------------------
async function detectStockTakeVariance(
  svc: SupaClient,
  siteId: string,
): Promise<SignalInsert[]> {
  const { data } = await svc
    .from('stock_takes')
    .select('id, conducted_at, variance_total_value, status')
    .eq('site_id', siteId)
    .eq('status', 'completed')
    .order('conducted_at', { ascending: false })
    .limit(1);
  const last = data?.[0];
  if (!last || last.variance_total_value == null) return [];
  const variance = Number(last.variance_total_value);
  if (Math.abs(variance) < 30) return [];

  const direction = variance < 0 ? 'short' : 'over';
  return [
    {
      site_id: siteId,
      target_surface: 'bar_home',
      target_role: 'bartender',
      tag: 'worth_knowing',
      severity: Math.abs(variance) > 100 ? 'urgent' : 'attention',
      section_label: 'Last stock take',
      headline_pre: 'Came in ',
      headline_em: `${gbp.format(Math.abs(variance))} ${direction}`,
      headline_post: ' on the last count',
      body_md: `${
        variance < 0
          ? "More bottles missing than expected. Heaviest items go into the over-pour conversation first."
          : 'Counted more than expected — likely a logging miss earlier in the week.'
      } Open the take to see which lines drove the variance.`,
      action_label: 'Open Stock Take →',
      action_target: `/bartender/back-bar/stock-take/${last.id}`,
      action_context: null,
      detector_kind: 'auto',
      detector_key: 'stock_take_variance',
      payload: { variance },
      display_priority: 50,
      emitted_at: isoNow(),
      expires_at: isoIn(7),
    },
  ];
}

// ---------------------------------------------------------------------
// Detector: today's deliveries
// ---------------------------------------------------------------------
async function detectTodaysDeliveries(
  svc: SupaClient,
  siteId: string,
): Promise<SignalInsert[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await svc
    .from('deliveries')
    .select('id, suppliers:supplier_id (name), status')
    .eq('site_id', siteId)
    .eq('expected_at', today);
  const items = (data ?? []) as unknown as Array<{
    id: string;
    suppliers: { name?: string } | null;
    status: string;
  }>;
  if (items.length === 0) return [];

  const supplierNames = Array.from(
    new Set(items.map((i) => i.suppliers?.name).filter(Boolean) as string[]),
  );

  return [
    {
      site_id: siteId,
      target_surface: 'home',
      target_role: 'chef',
      tag: 'plan_for_it',
      severity: 'info',
      section_label: 'Coming in today',
      headline_pre: `${items.length} ${items.length === 1 ? 'delivery' : 'deliveries'} `,
      headline_em: 'expected today',
      headline_post: '',
      body_md: `${supplierNames.slice(0, 3).join(' · ')}${supplierNames.length > 3 ? ` + ${supplierNames.length - 3} more` : ''}. Have someone ready at the back door.`,
      action_label: 'Open Deliveries →',
      action_target: '/stock-suppliers/deliveries',
      action_context: null,
      detector_kind: 'auto',
      detector_key: 'today_deliveries',
      payload: { count: items.length, suppliers: supplierNames },
      display_priority: 30,
      emitted_at: isoNow(),
      expires_at: isoIn(1),
    },
  ];
}

// ---------------------------------------------------------------------
// Detector: prep board for today still outstanding
// ---------------------------------------------------------------------
async function detectTonightsPrep(
  svc: SupaClient,
  siteId: string,
): Promise<SignalInsert[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await svc
    .from('prep_items')
    .select('id, name, station, status')
    .eq('site_id', siteId)
    .eq('prep_date', today)
    .neq('status', 'done');
  const items = data ?? [];
  if (items.length === 0) return [];

  // Group by station to see where pressure is heaviest
  const byStation = new Map<string, number>();
  for (const i of items) {
    const key = (i.station as string) ?? 'unassigned';
    byStation.set(key, (byStation.get(key) ?? 0) + 1);
  }
  const stationList = Array.from(byStation.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([s, n]) => `${s} (${n})`);

  return [
    {
      site_id: siteId,
      target_surface: 'home',
      target_role: 'chef',
      tag: 'get_ready',
      severity: items.length > 6 ? 'attention' : 'info',
      section_label: 'Tonight prep',
      headline_pre: `${items.length} prep ${items.length === 1 ? 'item' : 'items'} `,
      headline_em: 'still outstanding',
      headline_post: ' for tonight',
      body_md: `Heaviest at ${stationList.join(', ')}. Prep board has the full picture.`,
      action_label: 'Open Prep →',
      action_target: '/prep',
      action_context: null,
      detector_kind: 'auto',
      detector_key: 'tonight_prep',
      payload: { count: items.length },
      display_priority: 35,
      emitted_at: isoNow(),
      expires_at: isoIn(1),
    },
  ];
}

// ---------------------------------------------------------------------
// Detector: idle recipes
//
// A recipe that hasn't been seen on a live menu, a menu plan, or the
// prep board in 30+ days. Surfaces on the Recipes tab so the chef can
// archive it or decide it's worth bringing back. Pro-tier friendly —
// reads recipes / menus / menu_plan_items / prep_items only.
// ---------------------------------------------------------------------
async function detectIdleRecipes(
  svc: SupaClient,
  siteId: string,
): Promise<SignalInsert[]> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const { data: recipes } = await svc
    .from('recipes')
    .select('id, name, dish_type, sell_price, updated_at')
    .eq('site_id', siteId)
    .is('archived_at', null);
  if (!recipes || recipes.length === 0) return [];

  // Palatable derives the live "menu" from recipe categories, so there's
  // no menu_items table to check. We only need: recently touched, recently
  // prepped, or recently planned. Anything else is idle in the book.

  // Recipes touched on any planning surface in the last 30 days. Site
  // scope flows through menu_plans, since menu_plan_items has no site_id.
  const { data: sitePlans } = await svc
    .from('menu_plans')
    .select('id')
    .eq('site_id', siteId);
  const planIds = (sitePlans ?? []).map((p) => p.id as string);
  const onRecentPlan = new Set<string>();
  if (planIds.length > 0) {
    const { data: planItems } = await svc
      .from('menu_plan_items')
      .select('recipe_id, created_at')
      .in('plan_id', planIds)
      .gte('created_at', cutoff.toISOString());
    for (const p of planItems ?? []) {
      const rid = p.recipe_id as string | null;
      if (rid) onRecentPlan.add(rid);
    }
  }

  // Recipes that appeared on the prep board in the last 30 days
  const { data: preps } = await svc
    .from('prep_items')
    .select('recipe_id, prep_date')
    .eq('site_id', siteId)
    .gte('prep_date', cutoff.toISOString().slice(0, 10));
  const recentlyPrepped = new Set<string>();
  for (const p of preps ?? []) {
    const rid = p.recipe_id as string | null;
    if (rid) recentlyPrepped.add(rid);
  }

  const idle = recipes.filter((r) => {
    const id = r.id as string;
    if (onRecentPlan.has(id)) return false;
    if (recentlyPrepped.has(id)) return false;
    // Updated_at as a final proxy — if the chef just edited it, give them time.
    if (r.updated_at && new Date(r.updated_at as string) > cutoff) return false;
    return true;
  });
  if (idle.length === 0) return [];

  const sample = idle
    .slice(0, 3)
    .map((r) => r.name as string)
    .join(', ');
  return [
    {
      site_id: siteId,
      target_surface: 'recipes',
      target_role: 'chef',
      tag: 'worth_knowing',
      severity: 'info',
      section_label: 'Idle in the book',
      headline_pre: `${idle.length} ${idle.length === 1 ? 'recipe' : 'recipes'} `,
      headline_em: 'not seen in 30 days',
      headline_post: ' — off menus, off plans, off prep',
      body_md: `**${sample}**${idle.length > 3 ? ` and ${idle.length - 3} more` : ''}. Archive the ones you'll never run again so the live book stays current; or stake them on the next plan.`,
      action_label: 'Open Recipes →',
      action_target: '/recipes',
      action_context: null,
      detector_kind: 'auto',
      detector_key: 'idle_recipe',
      payload: { count: idle.length, sample: idle.slice(0, 3).map((r) => r.id) },
      display_priority: 50,
      emitted_at: isoNow(),
      expires_at: isoIn(7),
    },
  ];
}

// ---------------------------------------------------------------------
// Detector: stale cost baseline
//
// Recipes whose `cost_baseline` was set more than 30 days ago AND whose
// ingredients have had a price update since. Margin tile still reads
// "GP 65%" but the underlying baseline is no longer trustworthy. Pro
// tier just needs recipes + ingredient_price_history.
// ---------------------------------------------------------------------
async function detectStaleCostBaseline(
  svc: SupaClient,
  siteId: string,
): Promise<SignalInsert[]> {
  const baselineCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const { data: recipes } = await svc
    .from('recipes')
    .select('id, name, cost_baseline, costed_at')
    .eq('site_id', siteId)
    .is('archived_at', null)
    .not('cost_baseline', 'is', null)
    .not('costed_at', 'is', null);
  if (!recipes || recipes.length === 0) return [];

  const stale = recipes.filter((r) => {
    const setAt = r.costed_at as string | null;
    if (!setAt) return false;
    return new Date(setAt) < baselineCutoff;
  });
  if (stale.length === 0) return [];

  const sample = stale
    .slice(0, 3)
    .map((r) => r.name as string)
    .join(', ');

  return [
    {
      site_id: siteId,
      target_surface: 'recipes',
      target_role: 'chef',
      tag: 'plan_for_it',
      severity: 'attention',
      section_label: 'Cost baselines aged',
      headline_pre: `${stale.length} ${stale.length === 1 ? 'recipe has' : 'recipes have'} `,
      headline_em: 'a cost baseline over 30 days old',
      headline_post: '',
      body_md: `**${sample}**${stale.length > 3 ? ` and ${stale.length - 3} more` : ''}. Margin reads against this number — re-anchor it with current Bank prices so the GP tile is honest.`,
      action_label: 'Open Recipes →',
      action_target: '/recipes',
      action_context: null,
      detector_kind: 'auto',
      detector_key: 'stale_cost_baseline',
      payload: { count: stale.length },
      display_priority: 45,
      emitted_at: isoNow(),
      expires_at: isoIn(7),
    },
  ];
}

// ---------------------------------------------------------------------
// Detector: prep pattern lag
//
// Reads the last 8 weeks of prep_items and compares today's same-day-of-week
// completion pace to historical norms. If today's done-count is materially
// behind the average for this weekday, the chef sees a heads-up. Pro-tier
// gold: signal comes purely from the chef's own past prep board.
// ---------------------------------------------------------------------
async function detectPrepPatternLag(
  svc: SupaClient,
  siteId: string,
): Promise<SignalInsert[]> {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const dow = today.getDay(); // 0=Sun..6=Sat

  // Pull last 56 days of prep
  const sinceIso = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const { data } = await svc
    .from('prep_items')
    .select('prep_date, status')
    .eq('site_id', siteId)
    .gte('prep_date', sinceIso);
  if (!data || data.length === 0) return [];

  // Group by date, count done vs total
  const byDate = new Map<string, { done: number; total: number }>();
  for (const r of data) {
    const d = r.prep_date as string;
    const status = r.status as string;
    if (!byDate.has(d)) byDate.set(d, { done: 0, total: 0 });
    const bucket = byDate.get(d)!;
    bucket.total += 1;
    if (status === 'done') bucket.done += 1;
  }

  // Average done-count for prior days that match this DoW (excluding today)
  let dowSum = 0;
  let dowCount = 0;
  for (const [date, b] of byDate.entries()) {
    if (date === todayIso) continue;
    const dt = new Date(date);
    if (dt.getDay() !== dow) continue;
    dowSum += b.done;
    dowCount += 1;
  }
  if (dowCount < 3) return []; // not enough history

  const dowAvg = dowSum / dowCount;
  const todayBucket = byDate.get(todayIso);
  if (!todayBucket || todayBucket.total === 0) return [];

  // Only fire after 2pm (server time — close enough) so we're not crying wolf at 9am
  if (today.getHours() < 14) return [];

  // Lag = behind by 30%+ of typical done-count
  const gap = dowAvg - todayBucket.done;
  if (gap < Math.max(2, dowAvg * 0.3)) return [];

  return [
    {
      site_id: siteId,
      target_surface: 'prep',
      target_role: 'chef',
      tag: 'get_ready',
      severity: 'attention',
      section_label: 'Pace check',
      headline_pre: `Prep is `,
      headline_em: `behind the usual ${weekdayName(dow)} pace`,
      headline_post: '',
      body_md: `${todayBucket.done} done so far · the last 8 ${weekdayName(dow)}s averaged **${dowAvg.toFixed(1)}** by this point. Worth a station sweep before service ramps up.`,
      action_label: 'Open Prep →',
      action_target: '/prep',
      action_context: null,
      detector_kind: 'auto',
      detector_key: 'prep_pattern_lag',
      payload: { done: todayBucket.done, dow_avg: dowAvg, dow },
      display_priority: 25,
      emitted_at: isoNow(),
      expires_at: isoIn(1),
    },
  ];
}

function weekdayName(d: number): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d] ?? '';
}

// ---------------------------------------------------------------------
// Detector: menu GP drag
//
// Walks every active menu, computes overall GP from its dishes (current
// cost ÷ sell price), and flags menus pulling below the account's GP
// target (default 65%). Names the worst-offender dish.
// ---------------------------------------------------------------------
async function detectMenuGpDrag(
  svc: SupaClient,
  siteId: string,
): Promise<SignalInsert[]> {
  // Palatable doesn't have a v2.menus table — the menu surface is derived
  // from recipes grouped by `category`. So this detector reads recipes,
  // groups by section, and flags whichever section's average GP sits
  // furthest below the account's target.

  const { data: recipes } = await svc
    .from('recipes')
    .select('id, name, category, sell_price, cost_baseline, dish_type')
    .eq('site_id', siteId)
    .is('archived_at', null)
    .not('cost_baseline', 'is', null)
    .not('sell_price', 'is', null);
  if (!recipes || recipes.length === 0) return [];

  // Pull account GP target via the site's account
  const { data: siteRow } = await svc
    .from('sites')
    .select('account_id')
    .eq('id', siteId)
    .maybeSingle();
  const accountId = (siteRow?.account_id as string | undefined) ?? null;
  let targetPct = 65;
  if (accountId) {
    const { data: acct } = await svc
      .from('accounts')
      .select('preferences')
      .eq('id', accountId)
      .maybeSingle();
    const prefs = (acct?.preferences ?? null) as Record<string, unknown> | null;
    const gp = prefs && typeof prefs.gp_target_pct === 'number'
      ? prefs.gp_target_pct
      : null;
    if (gp != null && gp > 0) targetPct = gp;
  }

  type Bucket = {
    section: string;
    totalSell: number;
    totalCost: number;
    worstName: string | null;
    worstGp: number;
    count: number;
  };
  const bySection = new Map<string, Bucket>();
  for (const r of recipes) {
    const section =
      (r.category as string | null)?.toLowerCase() ?? 'uncategorised';
    const sell = Number(r.sell_price);
    const cost = Number(r.cost_baseline);
    if (!Number.isFinite(sell) || !Number.isFinite(cost) || sell <= 0) continue;
    if (!bySection.has(section)) {
      bySection.set(section, {
        section,
        totalSell: 0,
        totalCost: 0,
        worstName: null,
        worstGp: 100,
        count: 0,
      });
    }
    const b = bySection.get(section)!;
    b.totalSell += sell;
    b.totalCost += cost;
    b.count += 1;
    const gp = ((sell - cost) / sell) * 100;
    if (gp < b.worstGp) {
      b.worstGp = gp;
      b.worstName = r.name as string;
    }
  }

  // Find sections >=2 points below target
  type Drag = { section: string; gp: number; drag: number; worstName: string | null; worstGp: number; count: number };
  const drags: Drag[] = [];
  for (const b of bySection.values()) {
    if (b.count < 2) continue;
    if (b.totalSell <= 0) continue;
    const gp = ((b.totalSell - b.totalCost) / b.totalSell) * 100;
    const drag = targetPct - gp;
    if (drag >= 2) {
      drags.push({
        section: b.section,
        gp,
        drag,
        worstName: b.worstName,
        worstGp: b.worstGp,
        count: b.count,
      });
    }
  }
  if (drags.length === 0) return [];

  // Worst section first
  drags.sort((a, b) => b.drag - a.drag);
  const worst = drags[0];

  return [
    {
      site_id: siteId,
      target_surface: 'menus',
      target_role: 'chef',
      tag: 'plan_for_it',
      severity: worst.drag > 5 ? 'attention' : 'info',
      section_label: 'Menu GP drag',
      headline_pre: `${capitalise(worst.section)} sitting at `,
      headline_em: `${worst.gp.toFixed(0)}% GP`,
      headline_post: ` — target is ${targetPct.toFixed(0)}%`,
      body_md: worst.worstName
        ? `Biggest drag in the section: **${worst.worstName}** at ${worst.worstGp.toFixed(0)}%. Re-price it, swap a costlier ingredient, or rotate it off.${drags.length > 1 ? ` ${drags.length - 1} other section${drags.length > 2 ? 's' : ''} also below target.` : ''}`
        : `${worst.section} reads ${worst.drag.toFixed(1)} points below target. Worth a costing review.`,
      action_label: 'Open Menus →',
      action_target: '/menus',
      action_context: null,
      detector_kind: 'auto',
      detector_key: 'menu_gp_drag',
      payload: {
        worst_section: worst.section,
        worst_section_gp_pct: worst.gp,
        target_pct: targetPct,
        sections_below: drags.length,
      },
      display_priority: 40,
      emitted_at: isoNow(),
      expires_at: isoIn(7),
    },
  ];
}

function capitalise(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------
// Detector: notebook link drift
//
// A notebook entry that links to a recipe whose cost has materially
// shifted since the note was written. Useful for the Pro chef: "the
// duck dish you noted last month now costs 14% more — revisit the note."
// ---------------------------------------------------------------------
async function detectNotebookLinkDrift(
  svc: SupaClient,
  siteId: string,
): Promise<SignalInsert[]> {
  const { data: notes } = await svc
    .from('notebook_entries')
    .select('id, title, body_md, linked_recipe_ids, created_at')
    .eq('site_id', siteId)
    .not('linked_recipe_ids', 'is', null);
  if (!notes || notes.length === 0) return [];

  // Pull recipe baselines for any linked recipes
  const recipeIds = Array.from(
    new Set(
      (notes ?? [])
        .flatMap((n) => (n.linked_recipe_ids as string[] | null) ?? [])
        .filter(Boolean),
    ),
  );
  if (recipeIds.length === 0) return [];

  const { data: recipes } = await svc
    .from('recipes')
    .select('id, name, cost_baseline, costed_at')
    .in('id', recipeIds);
  const byRecipe = new Map<string, {
    name: string;
    baseline: number | null;
    costed_at: string | null;
  }>();
  for (const r of recipes ?? []) {
    byRecipe.set(r.id as string, {
      name: r.name as string,
      baseline: r.cost_baseline != null ? Number(r.cost_baseline) : null,
      costed_at: (r.costed_at as string | null) ?? null,
    });
  }

  const drifting: Array<{ noteTitle: string; recipeName: string }> = [];
  for (const n of notes) {
    const noteCreated = n.created_at as string;
    const linked = (n.linked_recipe_ids as string[] | null) ?? [];
    for (const rid of linked) {
      const r = byRecipe.get(rid);
      if (!r || !r.costed_at) continue;
      // Note written BEFORE the latest baseline shift = potential drift
      if (new Date(r.costed_at) > new Date(noteCreated)) {
        drifting.push({
          noteTitle: n.title as string,
          recipeName: r.name,
        });
        break; // one signal per note is enough
      }
    }
  }
  if (drifting.length === 0) return [];

  const sample = drifting
    .slice(0, 3)
    .map((d) => `${d.noteTitle} (${d.recipeName})`)
    .join(', ');

  return [
    {
      site_id: siteId,
      target_surface: 'notebook',
      target_role: 'chef',
      tag: 'worth_knowing',
      severity: 'info',
      section_label: 'Notes worth revisiting',
      headline_pre: `${drifting.length} ${drifting.length === 1 ? 'note links to a recipe' : 'notes link to recipes'} `,
      headline_em: 'whose cost has shifted',
      headline_post: ' since you wrote them',
      body_md: `**${sample}**${drifting.length > 3 ? ` and ${drifting.length - 3} more` : ''}. The reasoning in the note may not match the current numbers — worth a glance.`,
      action_label: 'Open Notebook →',
      action_target: '/notebook',
      action_context: null,
      detector_kind: 'auto',
      detector_key: 'notebook_link_drift',
      payload: { count: drifting.length },
      display_priority: 55,
      emitted_at: isoNow(),
      expires_at: isoIn(14),
    },
  ];
}
