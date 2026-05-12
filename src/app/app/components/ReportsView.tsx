'use client';
import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useSettings } from '@/context/SettingsContext';
import { dark, light } from '@/lib/theme';
import { toCsv, downloadCsv, dateStamp } from '@/lib/csv';

type SectionKey = 'gp' | 'waste' | 'stock' | 'menus' | 'prices';
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
    gp: true, waste: true, stock: true, menus: true, prices: true,
  });
  const [ranges, setRanges] = useState<Record<'gp' | 'waste' | 'prices', Range>>({
    gp: 'all', waste: '30d', prices: '30d',
  });
  const [printingKey, setPrintingKey] = useState<SectionKey | null>(null);

  function toggle(k: SectionKey) { setExpanded(prev => ({ ...prev, [k]: !prev[k] })); }
  function setRange(k: 'gp' | 'waste' | 'prices', r: Range) { setRanges(prev => ({ ...prev, [k]: r })); }

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
    return {
      log,
      inRange,
      total: sum(inRange),
      allTime: sum(log),
      reasonRows: Object.entries(byReason).sort((a, b) => b[1] - a[1]),
      topIngredients: Object.entries(byIng).sort((a, b) => b[1] - a[1]).slice(0, 5),
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
      perMenu.push({ id: m.id, name: m.name, dishes: dishes.length, totalCovers, classified: mStars + mPloughs + mPuzzles + mDogs, stars: mStars, ploughs: mPloughs, puzzles: mPuzzles, dogs: mDogs });
    }
    return { stars, ploughs, puzzles, dogs, totalRated, totalDishes, totalMenus: all.length, perMenu };
  }, [state.menus, state.recipes, state.gpHistory]);

  // ── Price alerts ──────────────────────────────────
  const priceAlerts = useMemo(() => {
    const cutoff = rangeCutoff(ranges.prices);
    return [...(state.priceAlerts || [])]
      .filter((a: any) => (a.detectedAt || 0) >= cutoff)
      .sort((a: any, b: any) => (b.detectedAt || 0) - (a.detectedAt || 0));
  }, [state.priceAlerts, ranges.prices]);

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
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.faint, marginBottom: '6px' }}>Per menu</p>
              <RankList C={C} items={menus.perMenu.map((m: any) => ({
                key: m.id,
                label: m.name,
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
            : ''
          }
          sym={sym}
          gpTarget={gpTarget}
          gp={gp} waste={waste} stock={stock} menus={menus} priceAlerts={priceAlerts}
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
        <button onClick={onToggle}
          style={{ background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0, flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: C.faint, width: '12px' }}>{expanded ? '▾' : '▸'}</span>
            <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.text }}>{title}</p>
          </div>
          {subtitle && <p style={{ fontSize: '11px', color: C.faint, marginTop: '3px', marginLeft: '20px' }}>{subtitle}</p>}
        </button>
        {expanded && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
            {range && onRangeChange && (
              <div style={{ display: 'flex', gap: '2px', marginRight: '4px' }}>
                {RANGE_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => onRangeChange(opt.value)}
                    style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', padding: '5px 8px', border: '1px solid ' + (range === opt.value ? C.gold + '60' : C.border), background: range === opt.value ? C.gold + '14' : 'transparent', color: range === opt.value ? C.gold : C.faint, cursor: 'pointer', borderRadius: '2px' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            <button onClick={onPrint} title="Print this section"
              style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', padding: '5px 9px', border: '1px solid ' + C.border, background: 'transparent', color: C.dim, cursor: 'pointer', borderRadius: '2px' }}>
              🖨 Print
            </button>
            <button onClick={onExport} title="Export this section as CSV"
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
function PrintModal({ C, sectionKey, onClose, businessName, today, range, sym, gpTarget, gp, waste, stock, menus, priceAlerts }: {
  C: any;
  sectionKey: SectionKey;
  onClose: () => void;
  businessName: string;
  today: string;
  range: string;
  sym: string;
  gpTarget: number;
  gp: any; waste: any; stock: any; menus: any; priceAlerts: any[];
}) {
  const titleMap: Record<SectionKey, string> = {
    gp: 'GP Performance',
    waste: 'Waste Cost',
    stock: 'Stock Value by Category',
    menus: 'Menu Engineering',
    prices: 'Price Changes',
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
