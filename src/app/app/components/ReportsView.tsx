'use client';
import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useSettings } from '@/context/SettingsContext';
import { dark, light } from '@/lib/theme';

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

  // ── GP performance ────────────────────────────────────────
  const gp = useMemo(() => {
    const list = (state.gpHistory || [])
      .filter((g: any) => typeof g.pct === 'number' && g.pct > 0)
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
  }, [state.gpHistory, gpTarget]);

  // ── Waste ────────────────────────────────────────────────
  const waste = useMemo(() => {
    const log = state.wasteLog || [];
    const now = Date.now();
    const sum = (arr: any[]) => arr.reduce((a, w) => a + (parseFloat(w.totalCost) || 0), 0);
    const week = log.filter((w: any) => (w.createdAt || 0) >= now - 7 * 86400000);
    const month = log.filter((w: any) => (w.createdAt || 0) >= now - 30 * 86400000);
    const byReason: Record<string, number> = {};
    for (const w of month) byReason[w.reason || 'Other'] = (byReason[w.reason || 'Other'] || 0) + (parseFloat(w.totalCost) || 0);
    const byIng: Record<string, number> = {};
    for (const w of month) byIng[w.ingredientName] = (byIng[w.ingredientName] || 0) + (parseFloat(w.totalCost) || 0);
    return {
      log,
      week: sum(week),
      month: sum(month),
      allTime: sum(log),
      reasonRows: Object.entries(byReason).sort((a, b) => b[1] - a[1]),
      topIngredients: Object.entries(byIng).sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }, [state.wasteLog]);

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

  // ── Price alerts (30d) ──────────────────────────────────
  const priceAlerts = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400000;
    return [...(state.priceAlerts || [])]
      .filter((a: any) => (a.detectedAt || 0) >= cutoff)
      .sort((a: any, b: any) => (b.detectedAt || 0) - (a.detectedAt || 0));
  }, [state.priceAlerts]);

  return (
    <div style={{ padding: '32px', fontFamily: 'system-ui,sans-serif', color: C.text, background: C.bg, minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '28px', color: C.text, marginBottom: '4px' }}>Reports</h1>
        <p style={{ fontSize: '12px', color: C.faint }}>Live snapshots across costings, waste, stock, menus, and price changes</p>
      </div>

      {/* Top-line stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <Card C={C} label="Average GP" value={gp.list.length > 0 ? `${gp.avg.toFixed(1)}%` : '—'} accent={gp.list.length > 0 ? gpColor(gp.avg, gpTarget, C) : undefined} sub={gp.list.length > 0 ? `${gp.above}/${gp.list.length} at target` : 'no costings yet'} />
        <Card C={C} label="Stock value" value={`${sym}${stock.totalValue.toFixed(0)}`} sub={stock.lowStock.length > 0 ? `${stock.lowStock.length} below par` : 'all above par'} subAccent={stock.lowStock.length > 0 ? C.gold : undefined} />
        <Card C={C} label="Waste · 30d" value={`${sym}${waste.month.toFixed(2)}`} accent={waste.month > 0 ? C.red : undefined} sub={`${waste.allTime > 0 ? sym + waste.allTime.toFixed(2) + ' all-time' : 'no waste logged'}`} />
        <Card C={C} label="Price changes · 30d" value={String(priceAlerts.length)} accent={priceAlerts.length > 0 ? C.red : undefined} sub={priceAlerts.length > 0 ? 'see below' : 'no recent'} />
      </div>

      {/* Two-column: GP performance + Waste */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        {/* GP performance */}
        <Section C={C} title="GP performance" subtitle={`Target ${gpTarget}% · ${gp.list.length} costed dish${gp.list.length === 1 ? '' : 'es'}`}>
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
        <Section C={C} title="Waste cost · last 30 days" subtitle={waste.log.length > 0 ? `${waste.log.length} entr${waste.log.length === 1 ? 'y' : 'ies'} · ${sym}${waste.allTime.toFixed(2)} all-time` : 'No waste logged yet'}>
          {waste.month === 0 ? (
            <Empty C={C} text={waste.log.length > 0 ? 'No waste in the last 30 days' : 'No waste logged'} />
          ) : (
            <>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.faint, marginBottom: '6px' }}>By reason</p>
              <RankList C={C} items={waste.reasonRows.map(([r, v]) => ({ key: r, label: r, right: `${sym}${v.toFixed(2)}`, color: C.gold, bar: v / waste.month }))} />
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.faint, marginBottom: '6px', marginTop: '14px' }}>Most-wasted ingredients</p>
              <RankList C={C} items={waste.topIngredients.map(([n, v]) => ({ key: n, label: n, right: `${sym}${v.toFixed(2)}`, color: C.gold }))} />
            </>
          )}
        </Section>
      </div>

      {/* Two-column: Stock by cat + Menu engineering */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        {/* Stock by category */}
        <Section C={C} title="Stock value by category" subtitle={`${(state.stockItems || []).length} items · ${sym}${stock.totalValue.toFixed(0)} total`}>
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
        <Section C={C} title="Menu engineering" subtitle={`${menus.totalMenus} menu${menus.totalMenus === 1 ? '' : 's'} · ${menus.totalRated} dish${menus.totalRated === 1 ? '' : 'es'} classified`}>
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
      <Section C={C} title="Price changes · last 30 days" subtitle={`${priceAlerts.length} change${priceAlerts.length === 1 ? '' : 's'}`}>
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

function Section({ C, title, subtitle, children }: { C: any; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '4px', padding: '20px', marginBottom: '12px' }}>
      <div style={{ marginBottom: '14px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.faint }}>{title}</p>
        {subtitle && <p style={{ fontSize: '11px', color: C.faint, marginTop: '2px' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
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
