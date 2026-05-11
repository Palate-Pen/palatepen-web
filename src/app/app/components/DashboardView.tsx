'use client';
import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';

// Brand-locked palette per spec
const C = {
  bg: '#0E0C0A',
  surface: '#1C1A17',
  surface2: '#242118',
  border: '#35302A',
  text: '#F0E8DC',
  dim: '#C0B8AC',
  faint: '#7A7470',
  gold: '#C8960A',
  amber: '#E8AE20',
  green: '#5AAA6A',
  red: '#C84040',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function gpColor(pct: number, target: number): string {
  if (pct >= target) return C.green;
  if (pct >= 65) return C.amber;
  return C.red;
}

interface Card {
  id: string;          // sidebar tab id
  icon: string;
  title: string;
  subtitle: string;
  comingSoon?: boolean;
}

export default function DashboardView({ setTab }: { setTab: (t: string) => void }) {
  const { state } = useApp();
  const { user, tier } = useAuth();
  useSettings();

  const profile = state.profile || {};
  const sym = profile.currencySymbol || '£';
  const gpTarget = profile.gpTarget || 72;
  const userName = profile.name || user?.user_metadata?.name || 'Chef';
  const tierLabel = tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : 'Free';
  const isPaid = ['pro', 'kitchen', 'group'].includes(tier);

  const stats = useMemo(() => {
    const recipes = state.recipes || [];
    const notes = state.notes || [];
    const gpHistory = state.gpHistory || [];
    const stockItems = state.stockItems || [];
    const priceAlerts = state.priceAlerts || [];
    const invoices = state.invoices || [];
    const menus = state.menus || [];

    const validGP = gpHistory.filter((g: any) => typeof g.pct === 'number' && g.pct > 0);
    const avgGP = validGP.length > 0 ? validGP.reduce((a: number, g: any) => a + g.pct, 0) / validGP.length : 0;

    const stockValue = stockItems.reduce((a: number, s: any) => {
      const qty = parseFloat(s.currentQty) || 0;
      const price = parseFloat(s.unitPrice) || 0;
      return a + qty * price;
    }, 0);

    return {
      recipes, notes, gpHistory, stockItems, priceAlerts, invoices, menus,
      avgGP,
      stockValue,
      lowStock: stockItems.filter((s: any) => {
        const cur = parseFloat(s.currentQty);
        const min = parseFloat(s.minLevel);
        const par = parseFloat(s.parLevel);
        if (isNaN(cur)) return false;
        if (!isNaN(min) && cur <= min) return true;
        if (!isNaN(par) && cur < par) return true;
        return false;
      }),
      recentRecipes: [...recipes].sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5),
      recentAlerts: priceAlerts.slice(0, 5),
    };
  }, [state]);

  // Look up GP for a recipe via its linked costing
  function recipeGP(r: any): number | null {
    let c = null;
    if (r.linkedCostingId) c = stats.gpHistory.find((h: any) => h.id === r.linkedCostingId);
    if (!c) c = stats.gpHistory.find((h: any) => (h.name || '').toLowerCase().trim() === (r.title || '').toLowerCase().trim());
    return c ? c.pct : null;
  }

  const cards: Card[] = [
    { id: 'recipes',  icon: '📖', title: 'Recipes',  subtitle: `${stats.recipes.length} saved` },
    { id: 'notebook', icon: '📝', title: 'Notebook', subtitle: `${stats.notes.length} ideas` },
    { id: 'costing',  icon: '£',  title: 'Costing',  subtitle: stats.gpHistory.length > 0 ? `Avg ${stats.avgGP.toFixed(1)}% GP` : 'No costings yet' },
    { id: 'menus',    icon: '🍽', title: 'Menus',    subtitle: `${stats.menus.length} menu${stats.menus.length === 1 ? '' : 's'}` },
    { id: 'invoices', icon: '🧾', title: 'Invoices', subtitle: `${stats.invoices.length} scanned` },
    { id: 'stock',    icon: '📦', title: 'Stock',    subtitle: `${stats.stockItems.length} items · ${sym}${stats.stockValue.toFixed(0)}` },
    { id: 'waste',    icon: '🗑', title: 'Waste',    subtitle: 'Track waste cost', comingSoon: true },
    { id: 'reports',  icon: '📊', title: 'Reports',  subtitle: 'GP, sales, waste trends', comingSoon: true },
  ];

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: 'system-ui,sans-serif', padding: '32px' }}>
      {/* Greeting */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '32px', color: C.text, marginBottom: '4px' }}>
            {greeting()}, {userName}
          </h1>
          <p style={{ fontSize: '13px', color: C.faint }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <span style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase',
          color: isPaid ? C.gold : C.faint,
          background: isPaid ? C.gold + '14' : C.surface,
          border: '1px solid ' + (isPaid ? C.gold + '40' : C.border),
          padding: '6px 12px', borderRadius: '2px',
        }}>{tierLabel}</span>
      </div>

      {/* Quick stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <QuickStat label="Recipes" value={String(stats.recipes.length)} />
        <QuickStat label="Average GP" value={stats.gpHistory.length > 0 ? `${stats.avgGP.toFixed(1)}%` : '—'} accent={stats.gpHistory.length > 0 ? gpColor(stats.avgGP, gpTarget) : undefined} />
        <QuickStat label="Stock value" value={`${sym}${stats.stockValue.toFixed(0)}`} />
        <QuickStat label="Price alerts" value={String(stats.priceAlerts.length)} accent={stats.priceAlerts.length > 0 ? C.red : undefined} />
      </div>

      {/* Price alerts banner */}
      {stats.recentAlerts.length > 0 && (
        <div style={{ background: C.red + '12', border: '1px solid ' + C.red + '40', borderRadius: '4px', padding: '14px 18px', marginBottom: '20px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.red, marginBottom: '10px' }}>
            ⚠ Price changes ({stats.priceAlerts.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {stats.recentAlerts.map((a: any, i: number) => {
              const pct = typeof a.changePct === 'number' ? a.changePct
                       : typeof a.percentChange === 'number' ? a.percentChange
                       : null;
              return (
                <div key={a.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ color: C.text }}>{a.name || a.ingredient || '(unnamed)'}</span>
                  {pct != null && (
                    <span style={{ color: C.red, fontWeight: 600 }}>{pct > 0 ? '+' : ''}{pct.toFixed(1)}%</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feature grid 4×2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {cards.map(card => (
          <button key={card.id}
            onClick={() => { if (!card.comingSoon) setTab(card.id); }}
            disabled={card.comingSoon}
            style={{
              textAlign: 'left', cursor: card.comingSoon ? 'default' : 'pointer',
              background: C.surface, border: '1px solid ' + C.border,
              borderRadius: '4px', padding: '20px',
              opacity: card.comingSoon ? 0.55 : 1,
              transition: 'border-color 0.15s, background 0.15s',
              position: 'relative',
            }}
            onMouseEnter={e => { if (!card.comingSoon) (e.currentTarget.style.borderColor = C.gold + '60'); }}
            onMouseLeave={e => { if (!card.comingSoon) (e.currentTarget.style.borderColor = C.border); }}
          >
            <div style={{ width: '36px', height: '36px', borderRadius: '4px', background: C.gold + '14', border: '0.5px solid ' + C.gold + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', fontSize: '18px', color: C.gold, fontFamily: 'Georgia,serif', fontWeight: 700 }}>
              {card.icon}
            </div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>{card.title}</p>
            <p style={{ fontSize: '11px', color: C.faint }}>{card.subtitle}</p>
            {card.comingSoon && (
              <span style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px', color: C.faint, background: C.surface2, border: '0.5px solid ' + C.border, padding: '2px 6px', borderRadius: '2px', textTransform: 'uppercase' }}>
                Soon
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Two columns: Recent recipes + Stock alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* Recent recipes */}
        <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '4px', padding: '20px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.faint, marginBottom: '14px' }}>Recent recipes</p>
          {stats.recentRecipes.length === 0 ? (
            <p style={{ fontSize: '13px', color: C.faint }}>No recipes yet — head to the Recipes tab to add one.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.recentRecipes.map((r: any) => {
                const gp = recipeGP(r);
                const col = gp != null ? gpColor(gp, gpTarget) : C.faint;
                return (
                  <button key={r.id} onClick={() => setTab('recipes')}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', padding: '6px 0', cursor: 'pointer', textAlign: 'left', borderBottom: '0.5px solid ' + C.border }}>
                    <span style={{ fontSize: '13px', color: C.text }}>
                      {r.locked && <span style={{ marginRight: '6px', fontSize: '11px' }}>🔒</span>}
                      {r.title}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: col }}>
                      {gp != null ? gp.toFixed(1) + '%' : 'no GP'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Stock alerts */}
        <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '4px', padding: '20px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.faint, marginBottom: '14px' }}>Stock at par or below</p>
          {stats.lowStock.length === 0 ? (
            <p style={{ fontSize: '13px', color: C.faint }}>{stats.stockItems.length === 0 ? 'No stock items yet.' : 'Everything above par 👍'}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.lowStock.slice(0, 6).map((s: any) => {
                const cur = parseFloat(s.currentQty) || 0;
                const par = parseFloat(s.parLevel);
                const min = parseFloat(s.minLevel);
                const isCrit = !isNaN(min) && cur <= min;
                return (
                  <button key={s.id} onClick={() => setTab('stock')}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', padding: '6px 0', cursor: 'pointer', textAlign: 'left', borderBottom: '0.5px solid ' + C.border }}>
                    <span style={{ fontSize: '13px', color: C.text }}>{s.name}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: isCrit ? C.red : C.amber }}>
                      {cur}{s.unit || ''} {!isNaN(par) && `/ par ${par}${s.unit || ''}`}
                    </span>
                  </button>
                );
              })}
              {stats.lowStock.length > 6 && (
                <p style={{ fontSize: '11px', color: C.faint, marginTop: '4px' }}>+{stats.lowStock.length - 6} more</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '4px', padding: '18px 20px' }}>
      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.faint, marginBottom: '8px' }}>{label}</p>
      <p style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '32px', color: accent || C.text, lineHeight: 1 }}>{value}</p>
    </div>
  );
}
