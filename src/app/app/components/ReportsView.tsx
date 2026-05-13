'use client';
import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useSettings } from '@/context/SettingsContext';
import { dark, light } from '@/lib/theme';
import { toCsv, downloadCsv, dateStamp } from '@/lib/csv';
import { buildHistory, statsFor, WINDOW_MS, type IngredientHistory, type BenchmarkStats } from '@/lib/priceBenchmark';
import { buildSupplierStats, SUPPLIER_WINDOW_MS, type SupplierStats } from '@/lib/supplierPerformance';

type SectionKey = 'gp' | 'waste' | 'stock' | 'menus' | 'prices' | 'benchmark' | 'supplier';
type Range = '7d' | '30d' | '90d' | 'all';

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'All' },
];

function rangeCutoff(r: Range): number {
  if (r === 'all') return 0;
  const days = r === '7d' ? 7 : r === '30d' ? 30 : 90;
  return Date.now() - days * 86400000;
}
function rangeLabel(r: Range): string {
  return r === 'all' ? 'all time' : `last ${r === '7d' ? '7 days' : r === '30d' ? '30 days' : '90 days'}`;
}

function gpColor(pct: number, target: number, C: any): string {
  if (pct >= target) return C.greenLight;
  if (pct >= 65) return C.gold;
  return C.red;
}

function fmtRel(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  if (d < 30) return d + 'd ago';
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function ReportsView({ setTab }: { setTab?: (t: string) => void }) {
  const { state } = useApp();
  const { settings } = useSettings();
  const C = settings.resolved === 'light' ? light : dark;
  const sym = (state.profile || {}).currencySymbol || '£';
  const gpTarget = (state.profile || {}).gpTarget || 72;
  const businessName = (state.profile?.businessName || '').trim();

  // Section expansion + per-section date range + which one is currently printing
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    gp: true, waste: true, stock: true, menus: true, prices: true, benchmark: true, supplier: true,
  });
  const [ranges, setRanges] = useState<Record<'gp' | 'waste' | 'prices' | 'benchmark' | 'supplier', Range>>({
    gp: 'all', waste: '30d', prices: '30d', benchmark: '30d', supplier: '30d',
  });
  const [printingKey, setPrintingKey] = useState<SectionKey | null>(null);
  const [expandedIngredient, setExpandedIngredient] = useState<string | null>(null);
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);

  function toggle(k: SectionKey) { setExpanded(prev => ({ ...prev, [k]: !prev[k] })); }
  function setRange(k: 'gp' | 'waste' | 'prices' | 'benchmark' | 'supplier', r: Range) { setRanges(prev => ({ ...prev, [k]: r })); }

  // ── GP performance ────────────────────────────────────────
  const gp = useMemo(() => {
    const cutoff = rangeCutoff(ranges.gp);
    const list = (state.gpHistory || [])
      .filter((g: any) => typeof g.pct === 'number' && g.pct > 0)
      .filter((g: any) => (g.savedAt || 0) >= cutoff)
      .sort((a: any, b: any) => (b.pct || 0) - (a.pct || 0));
    const avg = list.length > 0 ? list.reduce((a: number, g: any) => a + g.pct, 0) / list.length : 0;
    const above = list.filter((g: any) => g.pct >= gpTarget).length;
    const below65 = list.filter((g: any) => g.pct < 65).length;
    return {
      list,
      avg,
      above,
      belowTarget: list.length - above,
      below65,
      top: list.slice(0, 5),
      bottom: list.slice(-5).reverse(),
    };
  }, [state.gpHistory, gpTarget, ranges.gp]);

  // ── GP trend per dish ──────────────────────────────────
  // Groups every saved costing by dish name (normalised) and pulls out the
  // earliest vs latest entry. Surfaces drift over time — useful when ingredient
  // prices creep up but nobody re-prices the menu.
  const gpTrends = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const g of (state.gpHistory || [])) {
      if (typeof g.pct !== 'number') continue;
      const key = (g.name || '').toLowerCase().trim();
      if (!key) continue;
      (groups[key] = groups[key] || []).push(g);
    }
    const trends = Object.values(groups)
      .filter(g => g.length >= 2)
      .map(g => {
        const sorted = [...g].sort((a, b) => (a.savedAt || 0) - (b.savedAt || 0));
        const first = sorted[0];
        const latest = sorted[sorted.length - 1];
        const delta = (latest.pct || 0) - (first.pct || 0);
        return {
          name: latest.name,
          firstPct: first.pct,
          latestPct: latest.pct,
          delta,
          count: sorted.length,
          firstSavedAt: first.savedAt,
          latestSavedAt: latest.savedAt,
        };
      });
    return {
      improved: [...trends].filter(t => t.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5),
      worsened: [...trends].filter(t => t.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 5),
      total: trends.length,
    };
  }, [state.gpHistory]);

  // ── Waste ────────────────────────────────────────────────
  const waste = useMemo(() => {
    const log = state.wasteLog || [];
    const cutoff = rangeCutoff(ranges.waste);
    const inRange = log.filter((w: any) => (w.createdAt || 0) >= cutoff);
    const sum = (arr: any[]) => arr.reduce((a, w) => a + (parseFloat(w.totalCost) || 0), 0);
    const byReason: Record<string, number> = {};
    for (const w of inRange) byReason[w.reason || 'Other'] = (byReason[w.reason || 'Other'] || 0) + (parseFloat(w.totalCost) || 0);
    const byIng: Record<string, number> = {};
    for (const w of inRange) byIng[w.ingredientName] = (byIng[w.ingredientName] || 0) + (parseFloat(w.totalCost) || 0);
    // Trend: rolling 4-week buckets (newest last). Helps spot waste creep.
    const now = Date.now();
    const weekMs = 7 * 86400000;
    const buckets: { from: number; total: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const from = now - (i + 1) * weekMs;
      const to = now - i * weekMs;
      const total = log.filter((w: any) => {
        const t = w.createdAt || 0;
        return t >= from && t < to;
      }).reduce((a: number, w: any) => a + (parseFloat(w.totalCost) || 0), 0);
      buckets.push({ from, total });
    }
    // Projected month = average of in-range × 30d / range days
    const rangeDays = ranges.waste === '7d' ? 7 : ranges.waste === '30d' ? 30 : ranges.waste === '90d' ? 90 : (log.length > 0 ? Math.max(1, (now - Math.min(...log.map((w: any) => w.createdAt || now))) / 86400000) : 30);
    const dailyAvg = rangeDays > 0 ? sum(inRange) / rangeDays : 0;
    const projectedMonth = dailyAvg * 30;
    return {
      log,
      inRange,
      total: sum(inRange),
      allTime: sum(log),
      reasonRows: Object.entries(byReason).sort((a, b) => b[1] - a[1]),
      topIngredients: Object.entries(byIng).sort((a, b) => b[1] - a[1]).slice(0, 5),
      weekBuckets: buckets,
      projectedMonth,
      dailyAvg,
    };
  }, [state.wasteLog, ranges.waste]);

  // ── Stock ────────────────────────────────────────────────
  const stock = useMemo(() => {
    const items = state.stockItems || [];
    const totalValue = items.reduce((a: number, s: any) => a + (parseFloat(s.currentQty) || 0) * (parseFloat(s.unitPrice) || 0), 0);
    const byCat: Record<string, { count: number; value: number }> = {};
    for (const s of items) {
      const cat = s.category || 'Other';
      const value = (parseFloat(s.currentQty) || 0) * (parseFloat(s.unitPrice) || 0);
      if (!byCat[cat]) byCat[cat] = { count: 0, value: 0 };
      byCat[cat].count++;
      byCat[cat].value += value;
    }
    const lowStock = items.filter((s: any) => {
      const cur = parseFloat(s.currentQty);
      const par = parseFloat(s.parLevel);
      const min = parseFloat(s.minLevel);
      if (isNaN(cur)) return false;
      return (!isNaN(min) && cur <= min) || (!isNaN(par) && cur < par);
    });
    return {
      totalValue,
      catRows: Object.entries(byCat).sort((a, b) => b[1].value - a[1].value),
      lowStock,
    };
  }, [state.stockItems]);

  // ── Menu engineering rollup ─────────────────────────────
  const menus = useMemo(() => {
    const all = state.menus || [];
    let stars = 0, ploughs = 0, puzzles = 0, dogs = 0, totalRated = 0, totalDishes = 0;
    const perMenu: any[] = [];
    for (const m of all) {
      const sales = (m.salesData || {}) as Record<string, number>;
      const totalCovers = Object.values(sales).reduce((a, b) => a + (b || 0), 0);
      const recipeIds = m.recipeIds || [];
      totalDishes += recipeIds.length;
      if (totalCovers === 0 || recipeIds.length === 0) {
        perMenu.push({ id: m.id, name: m.name, dishes: recipeIds.length, totalCovers: 0, classified: 0 });
        continue;
      }
      const N = recipeIds.length;
      const fairShare = 1 / N;
      const threshold = 0.7 * fairShare;
      const dishes = recipeIds.map((id: string) => {
        const r = (state.recipes || []).find((x: any) => x.id === id);
        let c = null;
        if (r?.linkedCostingId) c = (state.gpHistory || []).find((h: any) => h.id === r.linkedCostingId);
        if (!c && r) c = (state.gpHistory || []).find((h: any) => (h.name || '').toLowerCase().trim() === (r.title || '').toLowerCase().trim());
        const covers = sales[id] || 0;
        const margin = c ? (parseFloat(c.sell) || 0) - (parseFloat(c.cost) || 0) : 0;
        return { id, recipe: r, costing: c, covers, mix: covers / totalCovers, margin };
      });
      const costed = dishes.filter((d: any) => d.costing);
      const avgMargin = costed.length > 0 ? costed.reduce((a: number, d: any) => a + d.margin, 0) / costed.length : 0;
      let mStars = 0, mPloughs = 0, mPuzzles = 0, mDogs = 0;
      for (const d of dishes) {
        if (!d.costing) continue;
        const highPop = d.mix >= threshold;
        const highProf = d.margin > avgMargin;
        if (highPop && highProf) mStars++;
        else if (highPop) mPloughs++;
        else if (highProf) mPuzzles++;
        else mDogs++;
      }
      stars += mStars; ploughs += mPloughs; puzzles += mPuzzles; dogs += mDogs;
      totalRated += mStars + mPloughs + mPuzzles + mDogs;
      // Money projection: sum of (sell × covers) and (cost × covers) per dish
      const projRevenue = dishes.reduce((a: number, d: any) => a + (d.costing ? (parseFloat(d.costing.sell) || 0) * d.covers : 0), 0);
      const projCost = dishes.reduce((a: number, d: any) => a + (d.costing ? (parseFloat(d.costing.cost) || 0) * d.covers : 0), 0);
      const projProfit = projRevenue - projCost;
      const projGp = projRevenue > 0 ? (projProfit / projRevenue) * 100 : 0;
      perMenu.push({ id: m.id, name: m.name, dishes: dishes.length, totalCovers, classified: mStars + mPloughs + mPuzzles + mDogs, stars: mStars, ploughs: mPloughs, puzzles: mPuzzles, dogs: mDogs, projRevenue, projCost, projProfit, projGp });
    }
    // Group totals across all menus
    const totalRevenue = perMenu.reduce((a, m) => a + (m.projRevenue || 0), 0);
    const totalProfit = perMenu.reduce((a, m) => a + (m.projProfit || 0), 0);
    return { stars, ploughs, puzzles, dogs, totalRated, totalDishes, totalMenus: all.length, perMenu, totalRevenue, totalProfit };
  }, [state.menus, state.recipes, state.gpHistory]);

  // ── Price alerts ──────────────────────────────────
  const priceAlerts = useMemo(() => {
    const cutoff = rangeCutoff(ranges.prices);
    return [...(state.priceAlerts || [])]
      .filter((a: any) => (a.detectedAt || 0) >= cutoff)
      .sort((a: any, b: any) => (b.detectedAt || 0) - (a.detectedAt || 0));
  }, [state.priceAlerts, ranges.prices]);

  // ── Ingredient price benchmarking ─────────────────
  const benchmark = useMemo(() => {
    const history = buildHistory(state.invoices || [], state.ingredientsBank || []);
    const windowMs = WINDOW_MS[ranges.benchmark];
    const rows: { entry: IngredientHistory; stats: BenchmarkStats }[] = [];
    history.forEach(entry => {
      const stats = statsFor(entry, windowMs);
      if (!stats) return;
      // Need at least 2 points in the window for "benchmark" to mean anything —
      // a single observation gives no spread / no avg vs latest signal.
      if (stats.count < 2) return;
      rows.push({ entry, stats });
    });
    // Default sort: most volatile first — the actionable signal for a chef
    // scanning the table is "which ingredient prices are jumping around".
    rows.sort((a, b) => b.stats.volatilityPct - a.stats.volatilityPct);
    return { rows, totalIngredients: history.size };
  }, [state.invoices, state.ingredientsBank, ranges.benchmark]);

  // ── Supplier performance ─────────────────────────
  const supplier = useMemo(() => {
    const windowMs = SUPPLIER_WINDOW_MS[ranges.supplier];
    const rows = buildSupplierStats(state.invoices || [], windowMs);
    const totalSpend = rows.reduce((sum, r) => sum + r.totalSpend, 0);
    const totalInvoices = rows.reduce((sum, r) => sum + r.invoiceCount, 0);
    return { rows, totalSpend, totalInvoices };
  }, [state.invoices, ranges.supplier]);

  // ── Per-section CSV exports ────────────────────────────
  function exportSection(k: SectionKey) {
    const stamp = dateStamp();
    if (k === 'gp') {
      downloadCsv(`gp-performance-${stamp}.csv`, toCsv(
        ['Dish', 'GP %', 'Sell', 'Cost/Cover', 'GP £', 'Target %', 'Saved At'],
        gp.list.map((g: any) => [g.name, (g.pct || 0).toFixed(1), (g.sell || 0).toFixed(2), (g.cost || 0).toFixed(2), (g.gp || 0).toFixed(2), g.target ?? gpTarget, g.savedAt ? new Date(g.savedAt).toISOString() : ''])
      ));
    } else if (k === 'waste') {
      downloadCsv(`waste-${stamp}.csv`, toCsv(
        ['Ingredient', 'Reason', 'Qty', 'Unit', 'Cost', 'Date'],
        waste.inRange.map((w: any) => [w.ingredientName, w.reason, w.qty ?? '', w.unit ?? '', (parseFloat(w.totalCost) || 0).toFixed(2), w.createdAt ? new Date(w.createdAt).toISOString() : ''])
      ));
    } else if (k === 'stock') {
      downloadCsv(`stock-value-${stamp}.csv`, toCsv(
        ['Category', 'Items', 'Value'],
        stock.catRows.map(([cat, v]) => [cat, v.count, v.value.toFixed(2)])
      ));
    } else if (k === 'menus') {
      downloadCsv(`menu-engineering-${stamp}.csv`, toCsv(
        ['Menu', 'Dishes', 'Covers', 'Stars', 'Plough', 'Puzzle', 'Dog'],
        menus.perMenu.map((m: any) => [m.name, m.dishes, m.totalCovers, m.stars || 0, m.ploughs || 0, m.puzzles || 0, m.dogs || 0])
      ));
    } else if (k === 'prices') {
      downloadCsv(`price-changes-${stamp}.csv`, toCsv(
        ['Ingredient', 'From', 'To', '%', 'Detected At'],
        priceAlerts.map((a: any) => [a.name, (a.oldPrice ?? 0).toFixed(2), (a.newPrice ?? 0).toFixed(2), typeof a.pct === 'number' ? a.pct.toFixed(1) : '', a.detectedAt ? new Date(a.detectedAt).toISOString() : ''])
      ));
    } else if (k === 'benchmark') {
      downloadCsv(`price-benchmark-${stamp}.csv`, toCsv(
        ['Ingredient', 'Unit', 'Current Bank', 'Last Paid', 'Avg', 'Min', 'Max', 'vs Bank %', 'Volatility %', 'Data Points', 'Last Seen'],
        benchmark.rows.map(({ entry, stats }) => [
          entry.name,
          entry.unit,
          entry.currentBankPrice != null ? entry.currentBankPrice.toFixed(2) : '',
          stats.last.toFixed(2),
          stats.avg.toFixed(2),
          stats.min.toFixed(2),
          stats.max.toFixed(2),
          stats.vsBankPct != null ? stats.vsBankPct.toFixed(1) : '',
          stats.volatilityPct.toFixed(1),
          stats.count,
          stats.lastTs ? new Date(stats.lastTs).toISOString() : '',
        ])
      ));
    } else if (k === 'supplier') {
      downloadCsv(`supplier-performance-${stamp}.csv`, toCsv(
        ['Supplier', 'Invoices', 'Total Spend', 'Avg Invoice', 'Price Changes', 'Unique Ingredients', 'Last Invoice', 'Top Ingredients'],
        supplier.rows.map(s => [
          s.name,
          s.invoiceCount,
          s.totalSpend.toFixed(2),
          s.avgInvoice.toFixed(2),
          s.priceChangeCount,
          s.uniqueIngredientCount,
          s.lastInvoiceTs ? new Date(s.lastInvoiceTs).toISOString() : '',
          s.topIngredients.map(t => `${t.name} (${sym}${t.spend.toFixed(2)})`).join(' | '),
        ])
      ));
    }
  }

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ padding: '32px', fontFamily: 'system-ui,sans-serif', color: C.text, background: C.bg, minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        {businessName && <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.gold, marginBottom: '4px' }}>{businessName}</p>}
        <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '28px', color: C.text, marginBottom: '4px' }}>Reports</h1>
        <p style={{ fontSize: '12px', color: C.faint }}>{today} · Click any section to expand · pick a range, then print or export</p>
      </div>

      {/* Top-line stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <Card C={C} label="Average GP" value={gp.list.length > 0 ? `${gp.avg.toFixed(1)}%` : '—'} accent={gp.list.length > 0 ? gpColor(gp.avg, gpTarget, C) : undefined} sub={gp.list.length > 0 ? `${gp.above}/${gp.list.length} at target` : 'no costings yet'} />
        <Card C={C} label="Stock value" value={`${sym}${stock.totalValue.toFixed(0)}`} sub={stock.lowStock.length > 0 ? `${stock.lowStock.length} below par` : 'all above par'} subAccent={stock.lowStock.length > 0 ? C.gold : undefined} />
        <Card C={C} label={`Waste · ${ranges.waste}`} value={`${sym}${waste.total.toFixed(2)}`} accent={waste.total > 0 ? C.red : undefined} sub={`${waste.allTime > 0 ? sym + waste.allTime.toFixed(2) + ' all-time' : 'no waste logged'}`} />
        <Card C={C} label={`Price changes · ${ranges.prices}`} value={String(priceAlerts.length)} accent={priceAlerts.length > 0 ? C.red : undefined} sub={priceAlerts.length > 0 ? 'see below' : 'no recent'} />
      </div>

      {/* Two-column: GP performance + Waste */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        {/* GP performance */}
        <Section C={C} sectionKey="gp" title="GP performance" subtitle={`Target ${gpTarget}% · ${gp.list.length} costed dish${gp.list.length === 1 ? '' : 'es'} · ${rangeLabel(ranges.gp)}`}
          expanded={expanded.gp} onToggle={() => toggle('gp')}
          range={ranges.gp} onRangeChange={(r) => setRange('gp', r as Range)}
          onPrint={() => setPrintingKey('gp')} onExport={() => exportSection('gp')}>
          {gp.list.length === 0 ? (
            <Empty C={C} text="No costings yet" />
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <Mini C={C} label="At/above target" value={String(gp.above)} accent={C.greenLight} />
                <Mini C={C} label="Below target" value={String(gp.belowTarget)} accent={C.gold} />
                <Mini C={C} label="Below 65%" value={String(gp.below65)} accent={gp.below65 > 0 ? C.red : undefined} />
              </div>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.faint, marginBottom: '6px' }}>Top 5</p>
              <RankList C={C} items={gp.top.map((g: any) => ({ key: g.id, label: g.name, right: `${g.pct.toFixed(1)}%`, color: gpColor(g.pct, gpTarget, C) }))} />
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.faint, marginBottom: '6px', marginTop: '12px' }}>Bottom 5</p>
              <RankList C={C} items={gp.bottom.map((g: any) => ({ key: g.id, label: g.name, right: `${g.pct.toFixed(1)}%`, color: gpColor(g.pct, gpTarget, C) }))} />

              {/* GP trend — dishes that have been re-costed at least twice */}
              {gpTrends.total > 0 && (gpTrends.improved.length > 0 || gpTrends.worsened.length > 0) && (
                <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid ' + C.border }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.faint, marginBottom: '6px' }}>
                    GP trend <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>· {gpTrends.total} dish{gpTrends.total === 1 ? '' : 'es'} re-costed</span>
                  </p>
                  {gpTrends.worsened.length > 0 && (
                    <>
                      <p style={{ fontSize: '10px', color: C.red, marginTop: '8px', marginBottom: '4px', fontWeight: 600 }}>↓ Drifting down</p>
                      <RankList C={C} items={gpTrends.worsened.map((t: any) => ({
                        key: 'wors-' + t.name,
                        label: t.name,
                        right: `${t.firstPct.toFixed(1)}% → ${t.latestPct.toFixed(1)}%`,
                        color: C.red,
                      }))} />
                    </>
                  )}
                  {gpTrends.improved.length > 0 && (
                    <>
                      <p style={{ fontSize: '10px', color: C.greenLight, marginTop: '10px', marginBottom: '4px', fontWeight: 600 }}>↑ Improving</p>
                      <RankList C={C} items={gpTrends.improved.map((t: any) => ({
                        key: 'imp-' + t.name,
                        label: t.name,
                        right: `${t.firstPct.toFixed(1)}% → ${t.latestPct.toFixed(1)}%`,
                        color: C.greenLight,
                      }))} />
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </Section>

        {/* Waste */}
        <Section C={C} sectionKey="waste" title="Waste cost" subtitle={waste.log.length > 0 ? `${waste.inRange.length} entr${waste.inRange.length === 1 ? 'y' : 'ies'} in ${rangeLabel(ranges.waste)} · ${sym}${waste.allTime.toFixed(2)} all-time` : 'No waste logged yet'}
          expanded={expanded.waste} onToggle={() => toggle('waste')}
          range={ranges.waste} onRangeChange={(r) => setRange('waste', r as Range)}
          onPrint={() => setPrintingKey('waste')} onExport={() => exportSection('waste')}>
          {waste.total === 0 ? (
            <Empty C={C} text={waste.log.length > 0 ? `No waste in ${rangeLabel(ranges.waste)}` : 'No waste logged'} />
          ) : (
            <>
              {/* Trend + projection stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <Mini C={C} label="Daily average" value={`${sym}${waste.dailyAvg.toFixed(2)}`} accent={C.gold} />
                <Mini C={C} label="Projected / month" value={`${sym}${waste.projectedMonth.toFixed(0)}`} accent={waste.projectedMonth > 100 ? C.red : C.gold} />
              </div>

              {/* 4-week trend mini-bars */}
              {waste.weekBuckets.some(b => b.total > 0) && (
                <div style={{ marginBottom: '14px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.faint, marginBottom: '6px' }}>4-week trend</p>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '40px' }}>
                    {waste.weekBuckets.map((b, i) => {
                      const max = Math.max(...waste.weekBuckets.map(x => x.total));
                      const pct = max > 0 ? (b.total / max) * 100 : 0;
                      const lastWeek = i === waste.weekBuckets.length - 1;
                      return (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: '3px' }}>
                          <div style={{ width: '100%', background: lastWeek ? C.gold : C.gold + '40', height: Math.max(2, pct) + '%', borderRadius: '2px 2px 0 0', transition: 'height 0.2s' }} />
                          <span style={{ fontSize: '9px', color: lastWeek ? C.gold : C.faint, fontWeight: lastWeek ? 700 : 400 }}>{sym}{b.total.toFixed(0)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p style={{ fontSize: '10px', color: C.faint, marginTop: '4px', textAlign: 'right' }}>← oldest · newest →</p>
                </div>
              )}

              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.faint, marginBottom: '6px' }}>By reason</p>
              <RankList C={C} items={waste.reasonRows.map(([r, v]) => ({ key: r, label: r, right: `${sym}${v.toFixed(2)}`, color: C.gold, bar: v / waste.total }))} />
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.faint, marginBottom: '6px', marginTop: '14px' }}>Most-wasted ingredients</p>
              <RankList C={C} items={waste.topIngredients.map(([n, v]) => ({ key: n, label: n, right: `${sym}${v.toFixed(2)}`, color: C.gold }))} />
            </>
          )}
        </Section>
      </div>

      {/* Two-column: Stock by cat + Menu engineering */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        {/* Stock by category */}
        <Section C={C} sectionKey="stock" title="Stock value by category" subtitle={`${(state.stockItems || []).length} items · ${sym}${stock.totalValue.toFixed(0)} total`}
          expanded={expanded.stock} onToggle={() => toggle('stock')}
          onPrint={() => setPrintingKey('stock')} onExport={() => exportSection('stock')}>
          {stock.catRows.length === 0 ? (
            <Empty C={C} text="No stock items yet" />
          ) : (
            <RankList C={C} items={stock.catRows.map(([cat, v]) => ({
              key: cat,
              label: `${cat} · ${v.count} item${v.count === 1 ? '' : 's'}`,
              right: `${sym}${v.value.toFixed(0)}`,
              color: C.gold,
              bar: stock.totalValue > 0 ? v.value / stock.totalValue : 0,
            }))} />
          )}
        </Section>

        {/* Menu engineering rollup */}
        <Section C={C} sectionKey="menus" title="Menu engineering" subtitle={`${menus.totalMenus} menu${menus.totalMenus === 1 ? '' : 's'} · ${menus.totalRated} dish${menus.totalRated === 1 ? '' : 'es'} classified`}
          expanded={expanded.menus} onToggle={() => toggle('menus')}
          onPrint={() => setPrintingKey('menus')} onExport={() => exportSection('menus')}>
          {menus.totalRated === 0 ? (
            <Empty C={C} text={menus.totalMenus === 0 ? 'No menus yet' : 'No sales data entered yet — open any menu and add weekly covers'} />
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '14px' }}>
                <QuadStat C={C} label="Stars" value={menus.stars} color={C.greenLight} />
                <QuadStat C={C} label="Plough" value={menus.ploughs} color={C.gold} />
                <QuadStat C={C} label="Puzzle" value={menus.puzzles} color={C.gold} />
                <QuadStat C={C} label="Dog" value={menus.dogs} color={C.red} />
              </div>

              {/* Projected revenue / profit — from sales data × dish sell/cost */}
              {menus.totalRevenue > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                  <Mini C={C} label="Projected revenue" value={`${sym}${menus.totalRevenue.toFixed(0)}`} accent={C.gold} />
                  <Mini C={C} label="Projected profit" value={`${sym}${menus.totalProfit.toFixed(0)}`} accent={C.greenLight} />
                </div>
              )}

              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.faint, marginBottom: '6px' }}>Per menu</p>
              <RankList C={C} items={menus.perMenu.map((m: any) => ({
                key: m.id,
                label: m.name + (m.projRevenue > 0 ? ` · ${sym}${m.projRevenue.toFixed(0)} rev` : ''),
                right: m.classified > 0
                  ? `${m.stars}★ ${m.ploughs}P ${m.puzzles}? ${m.dogs}✗`
                  : (m.totalCovers === 0 ? 'no sales' : 'uncosted'),
                color: m.classified > 0 ? C.gold : C.faint,
                onClick: () => setTab && setTab('menus'),
              }))} />
            </>
          )}
        </Section>
      </div>

      {/* Ingredient price benchmarking — per-ingredient avg/min/max/volatility
          across all invoices in the window. Sort defaults to most volatile. */}
      <Section C={C} sectionKey="benchmark" title="Ingredient price benchmarking"
        subtitle={benchmark.rows.length > 0
          ? `${benchmark.rows.length} ingredient${benchmark.rows.length === 1 ? '' : 's'} with ≥2 invoice points in ${rangeLabel(ranges.benchmark)} · sorted by volatility`
          : `No ingredients with ≥2 invoice prices in ${rangeLabel(ranges.benchmark)}`}
        expanded={expanded.benchmark} onToggle={() => toggle('benchmark')}
        range={ranges.benchmark} onRangeChange={(r) => setRange('benchmark', r as Range)}
        onPrint={() => setPrintingKey('benchmark')} onExport={() => exportSection('benchmark')}>
        {benchmark.rows.length === 0 ? (
          <Empty C={C} text={(state.invoices || []).length === 0
            ? 'No invoices scanned yet — once you scan a few, every ingredient builds a price history.'
            : 'Need at least 2 invoice prices per ingredient in this window. Try widening to 90d or All.'} />
        ) : (
          <div style={{ background: C.surface2, border: '0.5px solid ' + C.border, borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 70px 70px 70px 70px 70px 90px 70px', gap: '6px', padding: '8px 12px', background: C.surface, fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.faint }}>
              <span>Ingredient</span>
              <span style={{ textAlign: 'right' }}>Bank</span>
              <span style={{ textAlign: 'right' }}>Last</span>
              <span style={{ textAlign: 'right' }}>Avg</span>
              <span style={{ textAlign: 'right' }}>Min</span>
              <span style={{ textAlign: 'right' }}>Max</span>
              <span style={{ textAlign: 'right' }}>vs Bank</span>
              <span style={{ textAlign: 'right' }}>Volat.</span>
            </div>
            {benchmark.rows.slice(0, 50).map(({ entry, stats }) => {
              const isExpanded = expandedIngredient === entry.nameKey;
              const vsBank = stats.vsBankPct;
              const volColor = stats.volatilityPct >= 15 ? C.red : stats.volatilityPct >= 7 ? C.gold : C.greenLight;
              return (
                <div key={entry.nameKey} style={{ borderTop: '0.5px solid ' + C.border }}>
                  <button type="button"
                    onClick={() => setExpandedIngredient(isExpanded ? null : entry.nameKey)}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 70px 70px 70px 70px 70px 90px 70px', gap: '6px', padding: '8px 12px', alignItems: 'center', width: '100%', background: isExpanded ? C.surface : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 0 }}>
                    <span style={{ fontSize: '13px', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10px', color: C.faint, width: '10px' }}>{isExpanded ? '▾' : '▸'}</span>
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.name}</span>
                      <span style={{ fontSize: '10px', color: C.faint, textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>/ {entry.unit}</span>
                    </span>
                    <span style={{ fontSize: '12px', color: entry.currentBankPrice != null ? C.dim : C.faint, textAlign: 'right' }}>
                      {entry.currentBankPrice != null ? `${sym}${entry.currentBankPrice.toFixed(2)}` : '—'}
                    </span>
                    <span style={{ fontSize: '12px', color: C.text, fontWeight: 600, textAlign: 'right' }}>{sym}{stats.last.toFixed(2)}</span>
                    <span style={{ fontSize: '12px', color: C.dim, textAlign: 'right' }}>{sym}{stats.avg.toFixed(2)}</span>
                    <span style={{ fontSize: '12px', color: C.greenLight, textAlign: 'right' }}>{sym}{stats.min.toFixed(2)}</span>
                    <span style={{ fontSize: '12px', color: C.red, textAlign: 'right' }}>{sym}{stats.max.toFixed(2)}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: vsBank == null ? C.faint : Math.abs(vsBank) < 1 ? C.dim : vsBank > 0 ? C.red : C.greenLight, textAlign: 'right' }}>
                      {vsBank == null ? '—' : `${vsBank > 0 ? '+' : ''}${vsBank.toFixed(1)}%`}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: volColor, textAlign: 'right' }}>{stats.volatilityPct.toFixed(1)}%</span>
                  </button>
                  {isExpanded && (
                    <BenchmarkSparkline C={C} entry={entry} stats={stats} sym={sym} />
                  )}
                </div>
              );
            })}
            {benchmark.rows.length > 50 && (
              <div style={{ padding: '8px 12px', fontSize: '11px', color: C.faint, textAlign: 'center', borderTop: '0.5px solid ' + C.border }}>
                +{benchmark.rows.length - 50} more (full list in CSV export)
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Supplier performance — per-supplier spend / invoice cadence /
          price-change frequency / top-spend ingredients. Sorted by spend desc. */}
      <Section C={C} sectionKey="supplier" title="Supplier performance"
        subtitle={supplier.rows.length > 0
          ? `${supplier.rows.length} supplier${supplier.rows.length === 1 ? '' : 's'} · ${supplier.totalInvoices} invoice${supplier.totalInvoices === 1 ? '' : 's'} · ${sym}${supplier.totalSpend.toFixed(0)} total in ${rangeLabel(ranges.supplier)}`
          : `No invoices in ${rangeLabel(ranges.supplier)}`}
        expanded={expanded.supplier} onToggle={() => toggle('supplier')}
        range={ranges.supplier} onRangeChange={(r) => setRange('supplier', r as Range)}
        onPrint={() => setPrintingKey('supplier')} onExport={() => exportSection('supplier')}>
        {supplier.rows.length === 0 ? (
          <Empty C={C} text={(state.invoices || []).length === 0
            ? 'No invoices scanned yet — supplier performance builds as invoices come in.'
            : 'No invoices in this window. Try widening to 90d or All.'} />
        ) : (
          <div style={{ background: C.surface2, border: '0.5px solid ' + C.border, borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 60px 100px 90px 70px 90px', gap: '6px', padding: '8px 12px', background: C.surface, fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.faint }}>
              <span>Supplier</span>
              <span style={{ textAlign: 'right' }}>Invoices</span>
              <span style={{ textAlign: 'right' }}>Spend</span>
              <span style={{ textAlign: 'right' }}>Avg</span>
              <span style={{ textAlign: 'right' }}>Δ Prices</span>
              <span style={{ textAlign: 'right' }}>Last</span>
            </div>
            {supplier.rows.map((s) => {
              const isExpanded = expandedSupplier === s.nameKey;
              const spendShare = supplier.totalSpend > 0 ? s.totalSpend / supplier.totalSpend : 0;
              return (
                <div key={s.nameKey} style={{ borderTop: '0.5px solid ' + C.border }}>
                  <button type="button"
                    onClick={() => setExpandedSupplier(isExpanded ? null : s.nameKey)}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 60px 100px 90px 70px 90px', gap: '6px', padding: '8px 12px', alignItems: 'center', width: '100%', background: isExpanded ? C.surface : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontSize: '13px', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <span style={{ fontSize: '10px', color: C.faint, width: '10px' }}>{isExpanded ? '▾' : '▸'}</span>
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                      {spendShare >= 0.2 && (
                        <span style={{ fontSize: '9px', fontWeight: 700, color: C.gold, background: C.gold + '14', border: '0.5px solid ' + C.gold + '40', padding: '1px 5px', borderRadius: '2px', flexShrink: 0 }}>
                          {(spendShare * 100).toFixed(0)}%
                        </span>
                      )}
                    </span>
                    <span style={{ fontSize: '12px', color: C.dim, textAlign: 'right' }}>{s.invoiceCount}</span>
                    <span style={{ fontSize: '12px', color: C.text, fontWeight: 600, textAlign: 'right' }}>{sym}{s.totalSpend.toFixed(0)}</span>
                    <span style={{ fontSize: '12px', color: C.dim, textAlign: 'right' }}>{sym}{s.avgInvoice.toFixed(0)}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: s.priceChangeCount === 0 ? C.faint : s.priceChangeCount >= 5 ? C.red : C.gold, textAlign: 'right' }}>
                      {s.priceChangeCount === 0 ? '—' : s.priceChangeCount}
                    </span>
                    <span style={{ fontSize: '10px', color: C.faint, textAlign: 'right' }}>
                      {s.lastInvoiceTs ? fmtRel(s.lastInvoiceTs) : '—'}
                    </span>
                  </button>
                  {isExpanded && s.topIngredients.length > 0 && (
                    <div style={{ padding: '10px 16px 14px 28px', background: C.surface2, borderTop: '0.5px solid ' + C.border }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.faint, marginBottom: '6px' }}>
                        Top ingredients · {s.uniqueIngredientCount} unique
                      </p>
                      <RankList C={C} items={s.topIngredients.map(t => ({
                        key: t.name,
                        label: `${t.name} · ${t.count}×`,
                        right: `${sym}${t.spend.toFixed(2)}`,
                        color: C.gold,
                        bar: s.totalSpend > 0 ? t.spend / s.totalSpend : 0,
                      }))} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Price changes table */}
      <Section C={C} sectionKey="prices" title="Price changes" subtitle={`${priceAlerts.length} change${priceAlerts.length === 1 ? '' : 's'} in ${rangeLabel(ranges.prices)}`}
        expanded={expanded.prices} onToggle={() => toggle('prices')}
        range={ranges.prices} onRangeChange={(r) => setRange('prices', r as Range)}
        onPrint={() => setPrintingKey('prices')} onExport={() => exportSection('prices')}>
        {priceAlerts.length === 0 ? (
          <Empty C={C} text="No price changes detected" />
        ) : (
          <div style={{ background: C.surface2, border: '0.5px solid ' + C.border, borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.6fr 90px', gap: '8px', padding: '8px 12px', background: C.surface, fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.faint }}>
              <span>Ingredient</span>
              <span style={{ textAlign: 'right' }}>From</span>
              <span style={{ textAlign: 'right' }}>To</span>
              <span style={{ textAlign: 'right' }}>%</span>
              <span style={{ textAlign: 'right' }}>When</span>
            </div>
            {priceAlerts.slice(0, 12).map((a: any, i: number) => {
              const pct = typeof a.pct === 'number' ? a.pct : null;
              const isUp = (pct ?? 0) > 0;
              return (
                <div key={a.id || i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.6fr 90px', gap: '8px', padding: '8px 12px', borderTop: '0.5px solid ' + C.border, alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: C.text }}>{a.name}</span>
                  <span style={{ fontSize: '12px', color: C.faint, textAlign: 'right', textDecoration: 'line-through' }}>{sym}{(a.oldPrice ?? 0).toFixed(2)}</span>
                  <span style={{ fontSize: '12px', color: C.text, fontWeight: 600, textAlign: 'right' }}>{sym}{(a.newPrice ?? 0).toFixed(2)}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: isUp ? C.red : C.greenLight, textAlign: 'right' }}>
                    {pct != null ? `${isUp ? '+' : ''}${pct.toFixed(1)}%` : '—'}
                  </span>
                  <span style={{ fontSize: '10px', color: C.faint, textAlign: 'right' }}>{fmtRel(a.detectedAt)}</span>
                </div>
              );
            })}
            {priceAlerts.length > 12 && (
              <div style={{ padding: '8px 12px', fontSize: '11px', color: C.faint, textAlign: 'center', borderTop: '0.5px solid ' + C.border }}>
                +{priceAlerts.length - 12} more
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Per-section print modal — clean A4 layout for just one section at a time */}
      {printingKey && (
        <PrintModal
          C={C}
          sectionKey={printingKey}
          onClose={() => setPrintingKey(null)}
          businessName={businessName}
          today={today}
          range={
            printingKey === 'gp' ? rangeLabel(ranges.gp)
            : printingKey === 'waste' ? rangeLabel(ranges.waste)
            : printingKey === 'prices' ? rangeLabel(ranges.prices)
            : printingKey === 'benchmark' ? rangeLabel(ranges.benchmark)
            : printingKey === 'supplier' ? rangeLabel(ranges.supplier)
            : ''
          }
          sym={sym}
          gpTarget={gpTarget}
          gp={gp} waste={waste} stock={stock} menus={menus} priceAlerts={priceAlerts} benchmark={benchmark} supplier={supplier}
        />
      )}
    </div>
  );
}

function Card({ C, label, value, sub, accent, subAccent }: { C: any; label: string; value: string; sub?: string; accent?: string; subAccent?: string }) {
  return (
    <div style={{ background: C.surface, border: '1px solid ' + C.border, padding: '18px 20px', borderRadius: '4px' }}>
      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.faint, marginBottom: '8px' }}>{label}</p>
      <p style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '28px', color: accent || C.text, lineHeight: 1, marginBottom: sub ? '4px' : 0 }}>{value}</p>
      {sub && <p style={{ fontSize: '11px', color: subAccent || C.faint }}>{sub}</p>}
    </div>
  );
}

function Section({ C, sectionKey, title, subtitle, expanded, onToggle, range, onRangeChange, onPrint, onExport, children }: {
  C: any;
  sectionKey: SectionKey;
  title: string;
  subtitle?: string;
  expanded: boolean;
  onToggle: () => void;
  range?: Range;
  onRangeChange?: (r: Range) => void;
  onPrint: () => void;
  onExport: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '4px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 20px', gap: '12px', flexWrap: 'wrap' }}>
        {/* Title row uses a div+role=button rather than a real <button> so it can
            safely contain block-level paragraphs without tripping React's DOM-
            nesting validator (which can blank the page on click). */}
        <div role="button" tabIndex={0}
          onClick={onToggle}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
          style={{ background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0, flex: 1, minWidth: 0, outline: 'none', userSelect: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: C.faint, width: '12px', display: 'inline-block' }}>{expanded ? '▾' : '▸'}</span>
            <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.text }}>{title}</span>
          </div>
          {subtitle && <p style={{ fontSize: '11px', color: C.faint, marginTop: '3px', marginLeft: '20px' }}>{subtitle}</p>}
        </div>
        {expanded && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}
            onClick={e => e.stopPropagation()}>
            {range && onRangeChange && (
              <div style={{ display: 'flex', gap: '2px', marginRight: '4px' }}>
                {RANGE_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => onRangeChange(opt.value)}
                    style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', padding: '5px 8px', border: '1px solid ' + (range === opt.value ? C.gold + '60' : C.border), background: range === opt.value ? C.gold + '14' : 'transparent', color: range === opt.value ? C.gold : C.faint, cursor: 'pointer', borderRadius: '2px' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={onPrint} title="Print this section"
              style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', padding: '5px 9px', border: '1px solid ' + C.border, background: 'transparent', color: C.dim, cursor: 'pointer', borderRadius: '2px' }}>
              🖨 Print
            </button>
            <button type="button" onClick={onExport} title="Export this section as CSV"
              style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', padding: '5px 9px', border: '1px solid ' + C.border, background: 'transparent', color: C.dim, cursor: 'pointer', borderRadius: '2px' }}>
              ↓ CSV
            </button>
          </div>
        )}
      </div>
      {expanded && (
        <div style={{ padding: '0 20px 20px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// Per-section print modal — opens a clean light-themed A4 preview with just one
// section's data. Uses the same @media print pattern as the recipe prints
// (visibility: hidden on the body, visible on the print container).
function PrintModal({ C, sectionKey, onClose, businessName, today, range, sym, gpTarget, gp, waste, stock, menus, priceAlerts, benchmark, supplier }: {
  C: any;
  sectionKey: SectionKey;
  onClose: () => void;
  businessName: string;
  today: string;
  range: string;
  sym: string;
  gpTarget: number;
  gp: any; waste: any; stock: any; menus: any; priceAlerts: any[]; benchmark: any; supplier: any;
}) {
  const titleMap: Record<SectionKey, string> = {
    gp: 'GP Performance',
    waste: 'Waste Cost',
    stock: 'Stock Value by Category',
    menus: 'Menu Engineering',
    prices: 'Price Changes',
    benchmark: 'Ingredient Price Benchmark',
    supplier: 'Supplier Performance',
  };
  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #report-print, #report-print * { visibility: visible !important; }
          #report-print { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; background: white !important; color: #111 !important; }
          #report-print-controls { display: none !important; }
          @page { size: A4; margin: 14mm; }
        }
      `}</style>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px', overflow: 'auto' }}>
        <div style={{ width: '100%', maxWidth: '800px', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}>
          <div id="report-print-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: C.surface, border: '1px solid ' + C.border, borderBottom: 'none', borderRadius: '4px 4px 0 0' }}>
            <p style={{ fontSize: '12px', color: C.faint }}>{titleMap[sectionKey]} · A4 print preview</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => window.print()}
                style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.bg, background: C.gold, border: 'none', padding: '8px 14px', cursor: 'pointer', borderRadius: '2px' }}>
                Print
              </button>
              <button onClick={onClose}
                style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.dim, background: 'transparent', border: '1px solid ' + C.border, padding: '8px 14px', cursor: 'pointer', borderRadius: '2px' }}>
                Close
              </button>
            </div>
          </div>
          <div id="report-print" style={{ background: '#FFFFFF', color: '#111', padding: '32px 40px', overflow: 'auto', fontFamily: 'system-ui,sans-serif', borderRadius: '0 0 4px 4px' }}>
            {/* Header */}
            <div style={{ borderBottom: '1px solid #DDD', paddingBottom: '14px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div>
                <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '28px', color: '#111', marginBottom: '4px' }}>{titleMap[sectionKey]}</h1>
                <p style={{ fontSize: '12px', color: '#555' }}>{today}{range ? ' · ' + range : ''}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                  <span style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontStyle: 'italic', color: '#111', fontSize: '18px' }}>P</span>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#C8960A', marginBottom: '6px' }}></div>
                  <span style={{ fontFamily: 'Georgia,serif', fontWeight: 300, color: '#111', fontSize: '18px', letterSpacing: '3px' }}>ALATABLE</span>
                </div>
                {businessName && <p style={{ fontSize: '11px', color: '#555', marginTop: '3px', fontWeight: 600 }}>{businessName}</p>}
              </div>
            </div>

            {/* Body */}
            {sectionKey === 'gp' && <GpPrint sym={sym} gpTarget={gpTarget} gp={gp} />}
            {sectionKey === 'waste' && <WastePrint sym={sym} waste={waste} />}
            {sectionKey === 'stock' && <StockPrint sym={sym} stock={stock} />}
            {sectionKey === 'menus' && <MenusPrint menus={menus} />}
            {sectionKey === 'prices' && <PricesPrint sym={sym} priceAlerts={priceAlerts} />}
            {sectionKey === 'benchmark' && <BenchmarkPrint sym={sym} benchmark={benchmark} />}
            {sectionKey === 'supplier' && <SupplierPrint sym={sym} supplier={supplier} />}

            <div style={{ borderTop: '1px solid #DDD', paddingTop: '12px', marginTop: '24px', fontSize: '10px', color: '#888', display: 'flex', justifyContent: 'space-between' }}>
              <span>{businessName || 'Palatable'} · Generated {today}</span>
              <span>Palatable</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Printable body components — light theme, table-first layouts ─

function PrintTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '12px' }}>
      <thead>
        <tr style={{ background: '#F4F4F2', color: '#555' }}>
          {headers.map((h, i) => (
            <th key={i} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '6px 8px', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: '0.5px solid #EEE' }}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding: '5px 8px', color: '#222', textAlign: j === 0 ? 'left' : 'right' }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GpPrint({ sym, gpTarget, gp }: { sym: string; gpTarget: number; gp: any }) {
  if (gp.list.length === 0) return <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>No costings in this range.</p>;
  return (
    <>
      <PrintTable
        headers={['Metric', 'Value']}
        rows={[
          ['Average GP', gp.avg.toFixed(1) + '%'],
          ['Costed dishes', String(gp.list.length)],
          ['At or above target (' + gpTarget + '%)', String(gp.above)],
          ['Below target', String(gp.belowTarget)],
          ['Below 65%', String(gp.below65)],
        ]}
      />
      <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#555', marginBottom: '6px', marginTop: '14px' }}>All dishes by GP %</h2>
      <PrintTable
        headers={['Dish', 'Sell', 'Cost/Cover', 'GP £', 'GP %']}
        rows={gp.list.map((g: any) => [g.name, sym + (g.sell || 0).toFixed(2), sym + (g.cost || 0).toFixed(2), sym + (g.gp || 0).toFixed(2), (g.pct || 0).toFixed(1) + '%'])}
      />
    </>
  );
}

function WastePrint({ sym, waste }: { sym: string; waste: any }) {
  if (waste.total === 0) return <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>No waste in this range.</p>;
  return (
    <>
      <PrintTable
        headers={['Metric', 'Value']}
        rows={[
          ['Total waste in range', sym + waste.total.toFixed(2)],
          ['All-time waste', sym + waste.allTime.toFixed(2)],
          ['Entries in range', String(waste.inRange.length)],
        ]}
      />
      <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#555', marginBottom: '6px', marginTop: '14px' }}>By reason</h2>
      <PrintTable headers={['Reason', 'Cost']} rows={waste.reasonRows.map(([r, v]: [string, number]) => [r, sym + v.toFixed(2)])} />
      <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#555', marginBottom: '6px', marginTop: '14px' }}>Most-wasted ingredients</h2>
      <PrintTable headers={['Ingredient', 'Cost']} rows={waste.topIngredients.map(([n, v]: [string, number]) => [n, sym + v.toFixed(2)])} />
    </>
  );
}

function StockPrint({ sym, stock }: { sym: string; stock: any }) {
  if (stock.catRows.length === 0) return <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>No stock items yet.</p>;
  return (
    <>
      <PrintTable
        headers={['Metric', 'Value']}
        rows={[
          ['Total stock value', sym + stock.totalValue.toFixed(2)],
          ['Categories', String(stock.catRows.length)],
          ['Items below par', String(stock.lowStock.length)],
        ]}
      />
      <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#555', marginBottom: '6px', marginTop: '14px' }}>By category</h2>
      <PrintTable
        headers={['Category', 'Items', 'Value', '% of Total']}
        rows={stock.catRows.map(([cat, v]: [string, any]) => [cat, String(v.count), sym + v.value.toFixed(2), stock.totalValue > 0 ? ((v.value / stock.totalValue) * 100).toFixed(1) + '%' : '—'])}
      />
    </>
  );
}

function MenusPrint({ menus }: { menus: any }) {
  if (menus.totalRated === 0) return <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>No menu engineering data yet — add weekly covers to your menus to classify dishes.</p>;
  return (
    <>
      <PrintTable
        headers={['Quadrant', 'Count']}
        rows={[
          ['★ Stars (high pop, high profit)', String(menus.stars)],
          ['Plough Horse (high pop, low profit)', String(menus.ploughs)],
          ['Puzzle (low pop, high profit)', String(menus.puzzles)],
          ['Dog (low pop, low profit)', String(menus.dogs)],
        ]}
      />
      <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#555', marginBottom: '6px', marginTop: '14px' }}>Per menu</h2>
      <PrintTable
        headers={['Menu', 'Dishes', 'Covers', '★', 'Plough', 'Puzzle', 'Dog']}
        rows={menus.perMenu.map((m: any) => [m.name, String(m.dishes), String(m.totalCovers || 0), String(m.stars || 0), String(m.ploughs || 0), String(m.puzzles || 0), String(m.dogs || 0)])}
      />
    </>
  );
}

function SupplierPrint({ sym, supplier }: { sym: string; supplier: any }) {
  if (!supplier || supplier.rows.length === 0) return <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>No invoices in this range.</p>;
  return (
    <>
      <PrintTable
        headers={['Metric', 'Value']}
        rows={[
          ['Total spend', sym + supplier.totalSpend.toFixed(2)],
          ['Total invoices', String(supplier.totalInvoices)],
          ['Suppliers', String(supplier.rows.length)],
        ]}
      />
      <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#555', marginBottom: '6px', marginTop: '14px' }}>By supplier</h2>
      <PrintTable
        headers={['Supplier', 'Invoices', 'Spend', 'Avg', 'Δ Prices', 'Top ingredient']}
        rows={supplier.rows.map((s: SupplierStats) => [
          s.name,
          String(s.invoiceCount),
          sym + s.totalSpend.toFixed(2),
          sym + s.avgInvoice.toFixed(2),
          String(s.priceChangeCount),
          s.topIngredients[0] ? `${s.topIngredients[0].name} (${sym}${s.topIngredients[0].spend.toFixed(2)})` : '—',
        ])}
      />
    </>
  );
}

function BenchmarkPrint({ sym, benchmark }: { sym: string; benchmark: any }) {
  if (!benchmark || benchmark.rows.length === 0) return <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>No ingredients with enough invoice prices to benchmark in this range.</p>;
  return (
    <PrintTable
      headers={['Ingredient', 'Unit', 'Bank', 'Last', 'Avg', 'Min', 'Max', 'vs Bank', 'Volat. %']}
      rows={benchmark.rows.map(({ entry, stats }: { entry: IngredientHistory; stats: BenchmarkStats }) => [
        entry.name,
        entry.unit,
        entry.currentBankPrice != null ? sym + entry.currentBankPrice.toFixed(2) : '—',
        sym + stats.last.toFixed(2),
        sym + stats.avg.toFixed(2),
        sym + stats.min.toFixed(2),
        sym + stats.max.toFixed(2),
        stats.vsBankPct != null ? (stats.vsBankPct > 0 ? '+' : '') + stats.vsBankPct.toFixed(1) + '%' : '—',
        stats.volatilityPct.toFixed(1) + '%',
      ])}
    />
  );
}

// Inline expansion under a benchmark table row — renders the last N points as
// vertical bars with the bank price overlaid as a dashed reference line.
// Mirrors the 4-week waste-trend pattern visually so the report stays cohesive.
function BenchmarkSparkline({ C, entry, stats, sym }: { C: any; entry: IngredientHistory; stats: BenchmarkStats; sym: string }) {
  // Show up to last 12 invoice points — older history is interesting in the
  // CSV export but visual noise in a 60px-tall sparkline.
  const points = entry.points.slice(-12);
  if (points.length === 0) return null;
  const prices = points.map(p => p.unitPrice);
  const min = Math.min(...prices, entry.currentBankPrice ?? Infinity);
  const max = Math.max(...prices, entry.currentBankPrice ?? -Infinity);
  const range = max - min || 1;
  // Bank price overlay position (0–100% from bottom). If no bank price we hide
  // the dashed line entirely.
  const bankPctFromBottom = entry.currentBankPrice != null
    ? ((entry.currentBankPrice - min) / range) * 100
    : null;
  return (
    <div style={{ padding: '12px 16px 16px 28px', background: C.surface2, borderTop: '0.5px solid ' + C.border }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.faint }}>
          Last {points.length} invoice price{points.length === 1 ? '' : 's'}
        </p>
        <p style={{ fontSize: '10px', color: C.faint }}>
          {stats.count} point{stats.count === 1 ? '' : 's'} in range · last seen {new Date(stats.lastTs).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </p>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '3px', height: '64px', paddingTop: '4px' }}>
        {bankPctFromBottom != null && (
          <div
            title={`Bank price: ${sym}${(entry.currentBankPrice as number).toFixed(2)}`}
            style={{
              position: 'absolute', left: 0, right: 0,
              bottom: `${Math.max(0, Math.min(100, bankPctFromBottom))}%`,
              height: 0,
              borderTop: `1px dashed ${C.gold}`,
              opacity: 0.7,
              pointerEvents: 'none',
            }}
          />
        )}
        {points.map((p, i) => {
          const pct = ((p.unitPrice - min) / range) * 100;
          const isLast = i === points.length - 1;
          const colour = isLast ? C.gold : C.gold + '70';
          return (
            <div key={i} title={`${sym}${p.unitPrice.toFixed(2)} · ${p.supplier} · ${new Date(p.ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', minWidth: '8px' }}>
              <div style={{ width: '100%', height: `${Math.max(4, pct)}%`, background: colour, borderRadius: '2px 2px 0 0' }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: C.faint, marginTop: '6px' }}>
        <span>{sym}{min.toFixed(2)} min</span>
        {entry.currentBankPrice != null && (
          <span style={{ color: C.gold }}>— — bank {sym}{entry.currentBankPrice.toFixed(2)}</span>
        )}
        <span>{sym}{max.toFixed(2)} max</span>
      </div>
    </div>
  );
}

function PricesPrint({ sym, priceAlerts }: { sym: string; priceAlerts: any[] }) {
  if (priceAlerts.length === 0) return <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>No price changes in this range.</p>;
  return (
    <PrintTable
      headers={['Ingredient', 'From', 'To', '%', 'Detected']}
      rows={priceAlerts.map((a: any) => [
        a.name,
        sym + (a.oldPrice ?? 0).toFixed(2),
        sym + (a.newPrice ?? 0).toFixed(2),
        typeof a.pct === 'number' ? (a.pct > 0 ? '+' : '') + a.pct.toFixed(1) + '%' : '—',
        a.detectedAt ? new Date(a.detectedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—',
      ])}
    />
  );
}

function Empty({ C, text }: { C: any; text: string }) {
  return <p style={{ fontSize: '12px', color: C.faint, fontStyle: 'italic' }}>{text}</p>;
}

function Mini({ C, label, value, accent }: { C: any; label: string; value: string; accent?: string }) {
  return (
    <div style={{ background: C.surface2, border: '0.5px solid ' + C.border, padding: '10px 12px', borderRadius: '3px' }}>
      <p style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '20px', color: accent || C.text, lineHeight: 1, marginBottom: '4px' }}>{value}</p>
      <p style={{ fontSize: '10px', color: C.faint, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</p>
    </div>
  );
}

function QuadStat({ C, label, value, color }: { C: any; label: string; value: number; color: string }) {
  return (
    <div style={{ background: color + '14', border: '0.5px solid ' + color + '40', padding: '10px', borderRadius: '3px', textAlign: 'center' }}>
      <p style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '22px', color, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: '9px', color: C.faint, marginTop: '4px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</p>
    </div>
  );
}

interface RankItem { key: string; label: string; right: string; color: string; bar?: number; onClick?: () => void; }
function RankList({ C, items }: { C: any; items: RankItem[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {items.map(it => {
        const inner = (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>{it.label}</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: it.color, flexShrink: 0 }}>{it.right}</span>
            </div>
            {it.bar != null && (
              <div style={{ height: '3px', background: C.surface2, borderRadius: '1px', marginTop: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, it.bar * 100))}%`, background: it.color }} />
              </div>
            )}
          </>
        );
        return it.onClick ? (
          <button key={it.key} onClick={it.onClick} style={{ background: 'transparent', border: 'none', padding: '4px 0', textAlign: 'left', cursor: 'pointer', borderBottom: '0.5px solid ' + C.border }}>
            {inner}
          </button>
        ) : (
          <div key={it.key} style={{ padding: '4px 0', borderBottom: '0.5px solid ' + C.border }}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
