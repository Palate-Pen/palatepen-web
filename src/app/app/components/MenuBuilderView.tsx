'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { usePerms } from '@/lib/perms';
import { useTierAndFlag } from '@/lib/usePlatformConfig';
import { dark, light } from '@/lib/theme';
import MenuDesigner from './MenuDesigner';
import { useOutlet } from '@/context/OutletContext';
import { scopeByOutlet } from '@/lib/outlets';

// Slug for the public URL. Random 8-char alphanumeric using a reduced
// alphabet (no 0/1/l/i/o) to avoid ambiguity when read aloud or printed.
function genMenuSlug(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function gpColor(pct: number, target: number, C: any) {
  if (pct >= target) return C.greenLight;
  if (pct >= 65) return C.gold;
  return C.red;
}

export default function MenuBuilderView() {
  const { state, actions } = useApp();
  const { tier } = useAuth();
  const { settings } = useSettings();
  const perms = usePerms();
  // Tier check is now baked into useTierAndFlag — menus_live_digital is
  // Group-only per the tier schema, so this single flag becomes the
  // authoritative gate for the Publish card.
  const flagPublicMenus = useTierAndFlag('menus_live_digital', 'publicMenus', (state.profile as any)?.featureOverrides);
  const publishingAllowed = flagPublicMenus;
  const [copyConfirm, setCopyConfirm] = useState(false);

  function publishMenu(m: any) {
    if (!publishingAllowed) return;
    const slug = m.publicSlug || genMenuSlug();
    actions.updMenu(m.id, { published: true, publicSlug: slug });
  }
  function unpublishMenu(m: any) {
    actions.updMenu(m.id, { published: false });
  }
  function copyMenuUrl(slug: string) {
    const url = (typeof window !== 'undefined' ? window.location.origin : '') + '/m/' + slug;
    try {
      navigator.clipboard?.writeText(url);
      setCopyConfirm(true);
      setTimeout(() => setCopyConfirm(false), 1500);
    } catch {}
  }
  const C = settings.resolved === 'light' ? light : dark;
  const canEdit = perms.canEditMenus;
  const sym = (state.profile || {}).currencySymbol || '£';
  const gpTarget = (state.profile || {}).gpTarget || 72;
  const { activeOutletId, isMultiOutlet } = useOutlet();
  const menus = scopeByOutlet(state.menus || [], activeOutletId, isMultiOutlet);

  const [selId, setSelId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [search, setSearch] = useState('');
  const [picking, setPicking] = useState(false);
  const [pickQuery, setPickQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showDesigner, setShowDesigner] = useState(false);

  const sel = menus.find((m: any) => m.id === selId) || null;

  // Look up a recipe + its linked costing for menu calculations
  function getCosting(recipeId: string): any | null {
    const r = state.recipes.find((x: any) => x.id === recipeId);
    if (!r) return null;
    if (r.linkedCostingId) return state.gpHistory.find((h: any) => h.id === r.linkedCostingId) || null;
    return state.gpHistory.find((h: any) => (h.name || '').toLowerCase().trim() === (r.title || '').toLowerCase().trim()) || null;
  }

  // Compute menu rollup
  function menuStats(menu: any) {
    type Dish = { id: string; recipe: any; costing: any };
    const dishes: Dish[] = (menu.recipeIds || []).map((id: string) => {
      const r = state.recipes.find((x: any) => x.id === id);
      const c = getCosting(id);
      return { id, recipe: r, costing: c };
    });
    const costed: Dish[] = dishes.filter((d: Dish) => !!d.costing);
    const totalSell = costed.reduce((a: number, d: Dish) => a + (d.costing.sell || 0), 0);
    const totalCost = costed.reduce((a: number, d: Dish) => a + (d.costing.cost || 0), 0);
    const blendedGP = totalSell > 0 ? ((totalSell - totalCost) / totalSell) * 100 : 0;
    const lowest: Dish | null = costed.length > 0
      ? costed.reduce((min: Dish, d: Dish) => (d.costing.pct < min.costing.pct ? d : min), costed[0])
      : null;
    return { dishes, costed, totalSell, totalCost, blendedGP, lowest, uncosted: dishes.length - costed.length };
  }

  // Menu engineering classification (Kasavana & Smith).
  // Profitability: contribution margin (sell - cost) per dish vs the menu mean.
  //   above mean → HIGH, below or equal → LOW.
  // Popularity: sales mix % (this dish covers / total covers) vs 70% × fair share.
  //   fair share = 1 / N_dishes. 70% of fair share is the standard threshold.
  type Quadrant = 'star' | 'plough' | 'puzzle' | 'dog';
  type EngDish = { id: string; recipe: any; costing: any; covers: number; mix: number; margin: number; quadrant: Quadrant | null };
  function engineering(menu: any): { rows: EngDish[]; totalCovers: number; avgMargin: number; fairShare: number; threshold: number } | null {
    const sales = (menu.salesData || {}) as Record<string, number>;
    const items = (menu.recipeIds || []).map((id: string) => {
      const r = state.recipes.find((x: any) => x.id === id);
      const c = getCosting(id);
      const covers = parseInt(String(sales[id] || 0)) || 0;
      const margin = c ? (parseFloat(c.sell) || 0) - (parseFloat(c.cost) || 0) : 0;
      return { id, recipe: r, costing: c, covers, mix: 0, margin, quadrant: null as Quadrant | null };
    });
    const totalCovers = items.reduce((a: number, d: any) => a + d.covers, 0);
    const N = items.length;
    if (N === 0) return null;
    const fairShare = 1 / N;
    const threshold = 0.7 * fairShare; // 70% rule
    const costedItems = items.filter((d: any) => d.costing);
    const avgMargin = costedItems.length > 0
      ? costedItems.reduce((a: number, d: any) => a + d.margin, 0) / costedItems.length
      : 0;
    items.forEach((d: any) => {
      d.mix = totalCovers > 0 ? d.covers / totalCovers : 0;
      if (!d.costing || totalCovers === 0) { d.quadrant = null; return; }
      const highPop = d.mix >= threshold;
      const highProf = d.margin > avgMargin;
      d.quadrant = highPop
        ? (highProf ? 'star' : 'plough')
        : (highProf ? 'puzzle' : 'dog');
    });
    return { rows: items as EngDish[], totalCovers, avgMargin, fairShare, threshold };
  }

  function setCovers(menuId: string, recipeId: string, value: string) {
    const menu = menus.find((m: any) => m.id === menuId);
    if (!menu) return;
    const next = { ...(menu.salesData || {}), [recipeId]: parseInt(value) || 0 };
    actions.updMenu(menuId, { salesData: next });
  }
  function clearAllCovers(menuId: string) {
    actions.updMenu(menuId, { salesData: {} });
  }

  function addMenu() {
    if (!newName.trim()) return;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    actions.addMenu({ id, name: newName.trim(), description: newDesc.trim(), recipeIds: [], ...(isMultiOutlet && activeOutletId ? { outletId: activeOutletId } : {}) });
    setShowAdd(false); setNewName(''); setNewDesc('');
    setTimeout(() => setSelId(id), 50);
  }

  function addRecipeToMenu(recipeId: string) {
    if (!sel) return;
    const next = [...(sel.recipeIds || []), recipeId];
    actions.updMenu(sel.id, { recipeIds: next });
  }

  function removeRecipe(recipeId: string) {
    if (!sel) return;
    actions.updMenu(sel.id, { recipeIds: (sel.recipeIds || []).filter((id: string) => id !== recipeId) });
  }

  function cleanOrphans() {
    if (!sel) return;
    const valid = new Set(state.recipes.map((r: any) => r.id));
    const recipeIds = (sel.recipeIds || []).filter((id: string) => valid.has(id));
    const salesData: Record<string, number> = {};
    Object.entries(sel.salesData || {}).forEach(([k, v]) => { if (valid.has(k)) salesData[k] = v as number; });
    actions.updMenu(sel.id, { recipeIds, salesData });
  }

  function moveRecipe(recipeId: string, dir: -1 | 1) {
    if (!sel) return;
    const ids = [...(sel.recipeIds || [])];
    const i = ids.indexOf(recipeId);
    if (i === -1) return;
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    actions.updMenu(sel.id, { recipeIds: ids });
  }

  function deleteMenu() {
    if (!sel) return;
    actions.delMenu(sel.id);
    setSelId(null); setConfirmDelete(false);
  }

  const filtered = menus.filter((m: any) => (m.name || '').toLowerCase().includes(search.toLowerCase()));
  const inp: any = { width: '100%', background: C.surface2, border: '1px solid ' + C.border, color: C.text, fontSize: '13px', padding: '9px 12px', outline: 'none', boxSizing: 'border-box', borderRadius: '3px' };
  const lbl: any = { fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' };

  // ── DETAIL ──────────────────────────────────────────────
  if (sel) {
    const stats = menuStats(sel);
    const recipesInMenu = new Set(sel.recipeIds || []);
    const pickQ = pickQuery.toLowerCase().trim();
    const pickResults = picking
      ? (state.recipes || []).filter((r: any) => !recipesInMenu.has(r.id) && (!pickQ || (r.title || '').toLowerCase().includes(pickQ))).slice(0, 8)
      : [];

    return (
      <div style={{ padding: '32px', maxWidth: '900px', fontFamily: 'system-ui,sans-serif', color: C.text }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button onClick={() => { setSelId(null); setPicking(false); setConfirmDelete(false); }} style={{ fontSize: '13px', color: C.gold, background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Menus
          </button>
          {canEdit && (
            <button onClick={() => setShowDesigner(true)}
              disabled={(sel.recipeIds || []).length === 0}
              title={(sel.recipeIds || []).length === 0 ? 'Add at least one dish first' : 'Open Menu Designer'}
              style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: (sel.recipeIds || []).length === 0 ? C.faint : C.gold, background: (sel.recipeIds || []).length === 0 ? 'transparent' : C.gold + '14', border: '1px solid ' + ((sel.recipeIds || []).length === 0 ? C.border : C.gold + '40'), padding: '8px 14px', cursor: (sel.recipeIds || []).length === 0 ? 'not-allowed' : 'pointer', borderRadius: '2px', opacity: (sel.recipeIds || []).length === 0 ? 0.5 : 1 }}>
              🎨 Menu Designer
            </button>
          )}
        </div>

        {showDesigner && <MenuDesigner menuId={sel.id} onClose={() => setShowDesigner(false)} />}

        <input
          value={sel.name}
          onChange={e => actions.updMenu(sel.id, { name: e.target.value })}
          placeholder="Menu name"
          style={{ width: '100%', fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '32px', color: C.text, background: 'transparent', border: 'none', borderBottom: '1px solid ' + C.border, paddingBottom: '12px', marginBottom: '14px', outline: 'none' }}
        />
        <textarea
          value={sel.description || ''}
          onChange={e => actions.updMenu(sel.id, { description: e.target.value })}
          placeholder="Optional description (e.g. Spring 2026 lunch menu)"
          rows={2}
          style={{ ...inp, resize: 'none', marginBottom: '24px' }}
        />

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '20px' }}>
          <div style={{ background: C.surface2, border: '1px solid ' + C.border, padding: '14px 16px', borderRadius: '4px' }}>
            <p style={{ fontSize: '10px', color: C.faint, marginBottom: '4px' }}>Dishes</p>
            <p style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '24px', color: C.text }}>{stats.dishes.length}</p>
            {stats.uncosted > 0 && <p style={{ fontSize: '10px', color: C.gold, marginTop: '2px' }}>{stats.uncosted} uncosted</p>}
          </div>
          <div style={{ background: C.surface2, border: '1px solid ' + C.border, padding: '14px 16px', borderRadius: '4px' }}>
            <p style={{ fontSize: '10px', color: C.faint, marginBottom: '4px' }}>Total Sell</p>
            <p style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '24px', color: C.text }}>{sym}{stats.totalSell.toFixed(2)}</p>
            <p style={{ fontSize: '10px', color: C.faint, marginTop: '2px' }}>avg {sym}{(stats.costed.length ? stats.totalSell / stats.costed.length : 0).toFixed(2)}</p>
          </div>
          <div style={{ background: C.surface2, border: '1px solid ' + C.border, padding: '14px 16px', borderRadius: '4px' }}>
            <p style={{ fontSize: '10px', color: C.faint, marginBottom: '4px' }}>Total Cost</p>
            <p style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '24px', color: C.text }}>{sym}{stats.totalCost.toFixed(2)}</p>
            <p style={{ fontSize: '10px', color: C.faint, marginTop: '2px' }}>avg {sym}{(stats.costed.length ? stats.totalCost / stats.costed.length : 0).toFixed(2)}</p>
          </div>
          <div style={{ background: C.surface2, border: '1px solid ' + gpColor(stats.blendedGP, gpTarget, C) + '60', padding: '14px 16px', borderRadius: '4px' }}>
            <p style={{ fontSize: '10px', color: C.faint, marginBottom: '4px' }}>Blended GP</p>
            <p style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '24px', color: gpColor(stats.blendedGP, gpTarget, C) }}>{stats.blendedGP.toFixed(1)}%</p>
            <p style={{ fontSize: '10px', color: C.faint, marginTop: '2px' }}>target {gpTarget}%</p>
          </div>
        </div>

        {/* Publish (Kitchen/Group only) — hidden entirely when publicMenus flag is off */}
        {flagPublicMenus && (() => {
          const publicUrl = sel.publicSlug && typeof window !== 'undefined'
            ? window.location.origin + '/m/' + sel.publicSlug
            : '';
          const qrSrc = sel.publicSlug && sel.published
            ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(publicUrl)}`
            : '';
          return (
            <div style={{ background: C.surface2, border: '1px solid ' + (sel.published ? C.gold + '40' : C.border), borderRadius: '4px', padding: '14px 16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: sel.published ? C.gold : C.faint, marginBottom: '4px' }}>
                    {sel.published ? '● Live · Public URL' : 'Live Digital Menu'}
                  </p>
                  <p style={{ fontSize: '12px', color: C.dim, marginBottom: '8px', lineHeight: 1.5 }}>
                    {!publishingAllowed
                      ? 'Publish your menu to a public URL with QR code — available on Kitchen and Group tiers.'
                      : sel.published
                        ? 'Anyone with the link can view this menu. Updates show live — no re-publish needed.'
                        : 'Publish to get a public URL and QR code. The link updates automatically as you change the menu.'}
                  </p>
                  {!publishingAllowed ? (
                    <p style={{ fontSize: '11px', color: C.gold, marginTop: '4px' }}>Upgrade to Kitchen (£59/mo) or Group (£129/mo) to publish.</p>
                  ) : !sel.published ? (
                    <button onClick={() => publishMenu(sel)} disabled={!canEdit || stats.dishes.length === 0}
                      title={stats.dishes.length === 0 ? 'Add at least one dish first' : ''}
                      style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.bg, background: C.gold, border: 'none', padding: '9px 16px', cursor: stats.dishes.length === 0 ? 'not-allowed' : 'pointer', borderRadius: '2px', opacity: stats.dishes.length === 0 ? 0.5 : 1 }}>
                      ✨ Publish Menu
                    </button>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        <code style={{ fontSize: '12px', color: C.text, background: C.surface, border: '1px solid ' + C.border, padding: '7px 10px', borderRadius: '2px', flex: 1, minWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {publicUrl}
                        </code>
                        <button onClick={() => copyMenuUrl(sel.publicSlug)}
                          style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.gold, background: C.gold + '14', border: '1px solid ' + C.gold + '40', padding: '7px 12px', cursor: 'pointer', borderRadius: '2px' }}>
                          {copyConfirm ? '✓ Copied' : 'Copy'}
                        </button>
                        <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.dim, background: 'transparent', border: '1px solid ' + C.border, padding: '7px 12px', cursor: 'pointer', borderRadius: '2px', textDecoration: 'none' }}>
                          Open ↗
                        </a>
                        {canEdit && (
                          <button onClick={() => unpublishMenu(sel)}
                            style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.red, background: 'transparent', border: '1px solid ' + C.red + '40', padding: '7px 12px', cursor: 'pointer', borderRadius: '2px' }}>
                            Unpublish
                          </button>
                        )}
                      </div>
                      <p style={{ fontSize: '11px', color: C.faint }}>Share the link, print it on a table card, or scan the QR with any phone camera.</p>
                    </>
                  )}
                </div>
                {sel.published && qrSrc && (
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrSrc} alt="QR code" width={96} height={96} style={{ background: '#fff', padding: '4px', borderRadius: '2px' }} />
                    <a href={qrSrc} download={`menu-${sel.publicSlug}-qr.png`} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.gold, textDecoration: 'none' }}>
                      ↓ Save QR
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Lowest GP flag */}
        {stats.lowest && stats.lowest.costing.pct < gpTarget && (
          <div style={{ background: C.red + '12', border: '1px solid ' + C.red + '40', borderRadius: '4px', padding: '12px 16px', marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.red, marginBottom: '4px' }}>⚠ Lowest GP dish</p>
            <p style={{ fontSize: '13px', color: C.text }}>
              <strong>{stats.lowest.recipe?.title || 'Unknown'}</strong> · {stats.lowest.costing.pct.toFixed(1)}% GP
              <span style={{ color: C.faint }}> — {(gpTarget - stats.lowest.costing.pct).toFixed(1)} points below target</span>
            </p>
          </div>
        )}

        {/* Dish list */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint }}>Dishes ({stats.dishes.length})</p>
            {canEdit && (
              <button onClick={() => { setPicking(v => !v); setPickQuery(''); }}
                style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.gold, background: C.gold + '12', border: '1px solid ' + C.gold + '30', padding: '6px 12px', cursor: 'pointer', borderRadius: '2px' }}>
                {picking ? 'Cancel' : '+ Add Dish'}
              </button>
            )}
          </div>

          {picking && (
            <div style={{ background: C.surface2, border: '1px solid ' + C.gold + '40', borderRadius: '3px', padding: '10px', marginBottom: '10px' }}>
              <input value={pickQuery} onChange={e => setPickQuery(e.target.value)} placeholder="Search recipes…" style={{ ...inp, marginBottom: '8px' }} autoFocus />
              {pickResults.length === 0 ? (
                <p style={{ fontSize: '12px', color: C.faint, padding: '8px' }}>{pickQuery ? 'No matching recipes' : 'Start typing to find a recipe'}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {pickResults.map((r: any) => {
                    const c = getCosting(r.id);
                    return (
                      <button key={r.id} onClick={() => { addRecipeToMenu(r.id); setPicking(false); setPickQuery(''); }}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.surface, border: '1px solid ' + C.border, padding: '8px 12px', cursor: 'pointer', borderRadius: '2px', textAlign: 'left' }}>
                        <span style={{ fontSize: '13px', color: C.text }}>{r.title}</span>
                        <span style={{ fontSize: '11px', color: c ? gpColor(c.pct || 0, gpTarget, C) : C.faint }}>
                          {c ? `${(c.pct || 0).toFixed(1)}% GP · ${sym}${(c.sell || 0).toFixed(2)}` : 'no costing'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {(() => {
            const orphanCount = stats.dishes.filter((d: any) => !d.recipe).length;
            if (orphanCount === 0) return null;
            return (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '8px 12px', background: C.red + '0c', border: '0.5px solid ' + C.red + '40', borderRadius: '3px' }}>
                <span style={{ fontSize: '12px', color: C.red }}>
                  {orphanCount} {orphanCount === 1 ? 'dish references a recipe' : 'dishes reference recipes'} that no longer exist.
                </span>
                <button onClick={cleanOrphans} style={{ fontSize: '11px', fontWeight: 600, color: C.red, background: 'transparent', border: '0.5px solid ' + C.red + '60', padding: '4px 10px', borderRadius: '2px', cursor: 'pointer', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Clean up
                </button>
              </div>
            );
          })()}

          {stats.dishes.length === 0 ? (
            <p style={{ fontSize: '13px', color: C.faint, padding: '20px', textAlign: 'center', background: C.surface2, border: '0.5px dashed ' + C.border, borderRadius: '3px' }}>
              No dishes yet. Click <strong style={{ color: C.gold }}>+ Add Dish</strong> to start building this menu.
            </p>
          ) : (
            <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '24px 2fr 1fr 1fr 1fr 80px', gap: '8px', padding: '10px 12px', background: C.surface2, fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.faint }}>
                <span></span>
                <span>Dish</span>
                <span style={{ textAlign: 'right' }}>Sell</span>
                <span style={{ textAlign: 'right' }}>Cost</span>
                <span style={{ textAlign: 'right' }}>GP</span>
                <span></span>
              </div>
              {stats.dishes.map((d: any, i: number) => {
                const orphan = !d.recipe;
                return (
                <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '24px 2fr 1fr 1fr 1fr 80px', gap: '8px', padding: '10px 12px', borderTop: '1px solid ' + C.border, alignItems: 'center', background: orphan ? C.red + '08' : 'transparent' }}>
                  <span style={{ fontSize: '11px', color: C.faint, textAlign: 'right' }}>{i + 1}</span>
                  <div>
                    {orphan ? (
                      <>
                        <span style={{ fontSize: '13px', color: C.red, fontStyle: 'italic' }}>Recipe no longer exists</span>
                        <span style={{ marginLeft: '8px', fontSize: '9px', fontWeight: 700, color: C.red, background: C.red + '14', border: '0.5px solid ' + C.red + '40', padding: '1px 5px', borderRadius: '2px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Removed</span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: '13px', color: C.text }}>{d.recipe.title}</span>
                        {d.recipe.locked && <span title="Locked recipe" style={{ marginLeft: '6px', fontSize: '11px' }}>🔒</span>}
                        {d.recipe.category && <span style={{ marginLeft: '8px', fontSize: '10px', color: C.faint }}>{d.recipe.category}</span>}
                      </>
                    )}
                  </div>
                  <span style={{ fontSize: '13px', color: C.dim, textAlign: 'right' }}>{d.costing ? sym + d.costing.sell.toFixed(2) : '—'}</span>
                  <span style={{ fontSize: '13px', color: C.dim, textAlign: 'right' }}>{d.costing ? sym + d.costing.cost.toFixed(2) : '—'}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: d.costing ? gpColor(d.costing.pct || 0, gpTarget, C) : C.faint, textAlign: 'right' }}>
                    {d.costing ? (d.costing.pct || 0).toFixed(1) + '%' : 'uncosted'}
                  </span>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                    {canEdit && (<>
                      <button onClick={() => moveRecipe(d.id, -1)} disabled={i === 0} title="Move up"
                        style={{ background: 'none', border: 'none', color: i === 0 ? C.faint : C.dim, cursor: i === 0 ? 'default' : 'pointer', fontSize: '13px', padding: '0 4px', opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                      <button onClick={() => moveRecipe(d.id, 1)} disabled={i === stats.dishes.length - 1} title="Move down"
                        style={{ background: 'none', border: 'none', color: i === stats.dishes.length - 1 ? C.faint : C.dim, cursor: i === stats.dishes.length - 1 ? 'default' : 'pointer', fontSize: '13px', padding: '0 4px', opacity: i === stats.dishes.length - 1 ? 0.3 : 1 }}>↓</button>
                      <button onClick={() => removeRecipe(d.id)} title="Remove from menu"
                        style={{ background: 'none', border: 'none', color: orphan ? C.red : C.faint, cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}>×</button>
                    </>)}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Menu Engineering — sales mix × profitability */}
        {(() => {
          const eng = engineering(sel);
          if (!eng || eng.rows.length === 0) return null;
          const Q_META: Record<'star' | 'plough' | 'puzzle' | 'dog', { label: string; color: string; advice: string }> = {
            star:   { label: 'Star',         color: C.greenLight, advice: 'High covers + high margin. Protect: don\'t change spec or price.' },
            plough: { label: 'Plough Horse', color: C.gold,       advice: 'Sells well but margin is thin. Trim cost or nudge price up.' },
            puzzle: { label: 'Puzzle',       color: C.gold,       advice: 'Profitable but few sell. Promote, reposition, or rename.' },
            dog:    { label: 'Dog',          color: C.red,        advice: 'Low covers + low margin. Cull or replace at next menu change.' },
          };
          const byQ = (q: 'star' | 'plough' | 'puzzle' | 'dog') => eng.rows.filter((r: EngDish) => r.quadrant === q);

          return (
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint }}>
                  Menu Engineering <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>(Kasavana &amp; Smith)</span>
                </p>
                {eng.totalCovers > 0 && (
                  <button onClick={() => clearAllCovers(sel.id)} style={{ fontSize: '11px', color: C.faint, background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    Clear sales
                  </button>
                )}
              </div>

              {/* Per-dish sales entry table */}
              <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '3px', overflow: 'hidden', marginBottom: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 100px 80px 100px 110px', gap: '8px', padding: '8px 12px', background: C.surface2, fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.faint }}>
                  <span>Dish</span>
                  <span style={{ textAlign: 'right' }}>Covers</span>
                  <span style={{ textAlign: 'right' }}>Mix %</span>
                  <span style={{ textAlign: 'right' }}>Margin</span>
                  <span style={{ textAlign: 'right' }}>Class</span>
                </div>
                {eng.rows.map((d: EngDish) => (
                  <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '2fr 100px 80px 100px 110px', gap: '8px', padding: '8px 12px', borderTop: '1px solid ' + C.border, alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: C.text }}>{d.recipe?.title || '(deleted)'}</span>
                    <input
                      type="number"
                      min={0}
                      value={d.covers || ''}
                      onChange={e => setCovers(sel.id, d.id, e.target.value)}
                      placeholder="0"
                      style={{ background: C.surface2, border: '1px solid ' + C.border, color: C.text, fontSize: '12px', padding: '4px 8px', textAlign: 'right', borderRadius: '2px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                    />
                    <span style={{ fontSize: '12px', color: C.dim, textAlign: 'right' }}>
                      {eng.totalCovers > 0 ? (d.mix * 100).toFixed(1) + '%' : '—'}
                    </span>
                    <span style={{ fontSize: '12px', color: C.dim, textAlign: 'right' }}>
                      {d.costing ? sym + d.margin.toFixed(2) : '—'}
                    </span>
                    <span style={{ textAlign: 'right' }}>
                      {d.quadrant ? (
                        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: Q_META[d.quadrant].color, background: Q_META[d.quadrant].color + '15', border: '0.5px solid ' + Q_META[d.quadrant].color + '40', padding: '3px 8px', borderRadius: '2px' }}>
                          {Q_META[d.quadrant].label}
                        </span>
                      ) : (
                        <span style={{ fontSize: '10px', color: C.faint }}>—</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {eng.totalCovers === 0 ? (
                <p style={{ fontSize: '12px', color: C.faint, fontStyle: 'italic' }}>
                  Enter covers per dish above to see the Star / Plough Horse / Puzzle / Dog classification.
                </p>
              ) : (
                <>
                  {/* 2x2 quadrant grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '8px', height: '260px', marginBottom: '12px', position: 'relative' }}>
                    {/* Y axis label */}
                    <div style={{ position: 'absolute', left: '-32px', top: '50%', transform: 'rotate(-90deg) translateX(50%)', transformOrigin: 'left top', fontSize: '10px', color: C.faint, letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      Profitability →
                    </div>

                    {/* TOP-LEFT: Puzzle (low pop, high prof) */}
                    <Quad C={C} meta={Q_META.puzzle} dishes={byQ('puzzle')} />
                    {/* TOP-RIGHT: Star (high pop, high prof) */}
                    <Quad C={C} meta={Q_META.star} dishes={byQ('star')} />
                    {/* BOT-LEFT: Dog */}
                    <Quad C={C} meta={Q_META.dog} dishes={byQ('dog')} />
                    {/* BOT-RIGHT: Plough Horse */}
                    <Quad C={C} meta={Q_META.plough} dishes={byQ('plough')} />
                  </div>
                  <p style={{ fontSize: '10px', color: C.faint, textAlign: 'center', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>Popularity →</p>

                  {/* Method note */}
                  <p style={{ fontSize: '11px', color: C.faint, lineHeight: 1.6 }}>
                    Profitability split is the menu&apos;s average contribution margin ({sym}{eng.avgMargin.toFixed(2)}). Popularity threshold is 70% of fair share — with {eng.rows.length} dish{eng.rows.length === 1 ? '' : 'es'} that&apos;s {(eng.threshold * 100).toFixed(1)}% of total covers ({Math.round(eng.totalCovers * eng.threshold)} covers per dish). Total covers entered: <strong style={{ color: C.text }}>{eng.totalCovers}</strong>.
                  </p>
                  <div style={{ marginTop: '12px', padding: '10px 14px', background: C.gold + '08', border: '0.5px dashed ' + C.gold + '40', borderRadius: '3px' }}>
                    <p style={{ fontSize: '11px', color: C.dim, lineHeight: 1.5 }}>
                      <strong style={{ color: C.gold, letterSpacing: '0.3px' }}>Coming in Phase 4:</strong> covers will populate automatically from POS integration (Square, ePOSnow). Manual entry will become the fallback rather than the default.
                    </p>
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* Danger — manager+ only */}
        {canEdit && (
        <div style={{ borderTop: '1px solid ' + C.border, paddingTop: '20px', marginTop: '24px' }}>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.red, border: '1px solid ' + C.red, background: 'transparent', padding: '8px 16px', cursor: 'pointer', borderRadius: '2px' }}>
              Delete Menu
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <p style={{ fontSize: '13px', color: C.red }}>Delete &quot;{sel.name}&quot;?</p>
              <button onClick={() => setConfirmDelete(false)} style={{ fontSize: '12px', color: C.dim, background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={deleteMenu} style={{ fontSize: '12px', fontWeight: 700, color: '#fff', background: C.red, border: 'none', padding: '8px 16px', cursor: 'pointer', borderRadius: '2px' }}>
                Confirm Delete
              </button>
            </div>
          )}
        </div>
        )}
      </div>
    );
  }

  // ── LIST ─────────────────────────────────────────────────
  return (
    <div style={{ padding: '32px', fontFamily: 'system-ui,sans-serif', color: C.text }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '28px', color: C.text, marginBottom: '4px' }}>Menus</h1>
          <p style={{ fontSize: '12px', color: C.faint }}>{menus.length} menu{menus.length === 1 ? '' : 's'} saved</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowAdd(true)}
            style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', background: C.gold, color: C.bg, border: 'none', padding: '10px 18px', cursor: 'pointer', borderRadius: '2px' }}>
            + Add Menu
          </button>
        )}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menus..." style={{ ...inp, marginBottom: '20px', maxWidth: '400px' }} />

      {filtered.length === 0 ? (
        <div style={{ background: C.surface, border: '1px dashed ' + C.border, borderRadius: '4px', padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: C.faint, marginBottom: '12px' }}>{menus.length === 0 ? 'No menus yet' : 'No matches'}</p>
          {canEdit && menus.length === 0 && (
            <button onClick={() => setShowAdd(true)} style={{ fontSize: '12px', fontWeight: 700, color: C.gold, background: 'transparent', border: '1px solid ' + C.gold + '40', padding: '8px 16px', cursor: 'pointer', borderRadius: '2px' }}>
              Create your first menu
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {filtered.map((m: any) => {
            const stats = menuStats(m);
            return (
              <button key={m.id} onClick={() => setSelId(m.id)}
                style={{ textAlign: 'left', background: C.surface, border: '1px solid ' + C.border, borderRadius: '4px', padding: '20px', cursor: 'pointer' }}>
                <h3 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '20px', color: C.text, marginBottom: '6px' }}>{m.name || 'Untitled'}</h3>
                {m.description && <p style={{ fontSize: '12px', color: C.faint, marginBottom: '10px', lineHeight: 1.4 }}>{m.description}</p>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', borderTop: '1px solid ' + C.border, paddingTop: '10px' }}>
                  <span style={{ fontSize: '11px', color: C.faint }}>{stats.dishes.length} dish{stats.dishes.length === 1 ? '' : 'es'}{stats.uncosted > 0 ? ` · ${stats.uncosted} uncosted` : ''}</span>
                  {stats.costed.length > 0 ? (
                    <span style={{ fontSize: '12px', fontWeight: 600, color: gpColor(stats.blendedGP, gpTarget, C) }}>
                      {stats.blendedGP.toFixed(1)}% GP
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: C.faint }}>—</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ background: C.surface, border: '1px solid ' + C.border, width: '100%', maxWidth: '420px', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid ' + C.border }}>
              <h3 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '20px' }}>New menu</h3>
              <button onClick={() => { setShowAdd(false); setNewName(''); setNewDesc(''); }} style={{ background: 'none', border: 'none', color: C.faint, fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={lbl}>Name</label>
                <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addMenu(); }} placeholder="e.g. Spring Lunch 2026" style={inp} />
              </div>
              <div>
                <label style={lbl}>Description (optional)</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="A short note about this menu" rows={2} style={{ ...inp, resize: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', padding: '16px 20px', borderTop: '1px solid ' + C.border }}>
              <button onClick={() => { setShowAdd(false); setNewName(''); setNewDesc(''); }} style={{ flex: 1, fontSize: '12px', color: C.dim, background: C.surface2, border: '1px solid ' + C.border, padding: '10px', cursor: 'pointer', borderRadius: '2px' }}>Cancel</button>
              <button onClick={addMenu} disabled={!newName.trim()}
                style={{ flex: 1, fontSize: '12px', fontWeight: 700, background: C.gold, color: C.bg, border: 'none', padding: '10px', cursor: 'pointer', borderRadius: '2px', opacity: !newName.trim() ? 0.4 : 1 }}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Quad({ C, meta, dishes }: {
  C: any;
  meta: { label: string; color: string; advice: string };
  dishes: { id: string; recipe: any }[];
}) {
  return (
    <div style={{
      background: meta.color + '0A',
      border: '1px solid ' + meta.color + '40',
      borderRadius: '4px',
      padding: '12px',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: meta.color }}>{meta.label}</p>
        <span style={{ fontSize: '11px', color: C.faint }}>{dishes.length}</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {dishes.length === 0 ? (
          <p style={{ fontSize: '11px', color: C.faint, fontStyle: 'italic' }}>—</p>
        ) : dishes.map(d => (
          <p key={d.id} style={{ fontSize: '12px', color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.recipe?.title || '(deleted)'}</p>
        ))}
      </div>
      <p style={{ fontSize: '10px', color: C.faint, marginTop: '8px', lineHeight: 1.4 }}>{meta.advice}</p>
    </div>
  );
}
