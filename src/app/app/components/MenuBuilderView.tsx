'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useSettings } from '@/context/SettingsContext';
import { dark, light } from '@/lib/theme';

function gpColor(pct: number, target: number, C: any) {
  if (pct >= target) return C.greenLight;
  if (pct >= 65) return C.gold;
  return C.red;
}

export default function MenuBuilderView() {
  const { state, actions } = useApp();
  const { settings } = useSettings();
  const C = settings.resolved === 'light' ? light : dark;
  const sym = (state.profile || {}).currencySymbol || '£';
  const gpTarget = (state.profile || {}).gpTarget || 72;
  const menus = state.menus || [];

  const [selId, setSelId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [search, setSearch] = useState('');
  const [picking, setPicking] = useState(false);
  const [pickQuery, setPickQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  function addMenu() {
    if (!newName.trim()) return;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    actions.addMenu({ id, name: newName.trim(), description: newDesc.trim(), recipeIds: [] });
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
        </div>

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
            <button onClick={() => { setPicking(v => !v); setPickQuery(''); }}
              style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.gold, background: C.gold + '12', border: '1px solid ' + C.gold + '30', padding: '6px 12px', cursor: 'pointer', borderRadius: '2px' }}>
              {picking ? 'Cancel' : '+ Add Dish'}
            </button>
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
              {stats.dishes.map((d: any, i: number) => (
                <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '24px 2fr 1fr 1fr 1fr 80px', gap: '8px', padding: '10px 12px', borderTop: '1px solid ' + C.border, alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: C.faint, textAlign: 'right' }}>{i + 1}</span>
                  <div>
                    <span style={{ fontSize: '13px', color: C.text }}>{d.recipe?.title || '(deleted recipe)'}</span>
                    {d.recipe?.locked && <span title="Locked recipe" style={{ marginLeft: '6px', fontSize: '11px' }}>🔒</span>}
                    {d.recipe?.category && <span style={{ marginLeft: '8px', fontSize: '10px', color: C.faint }}>{d.recipe.category}</span>}
                  </div>
                  <span style={{ fontSize: '13px', color: C.dim, textAlign: 'right' }}>{d.costing ? sym + d.costing.sell.toFixed(2) : '—'}</span>
                  <span style={{ fontSize: '13px', color: C.dim, textAlign: 'right' }}>{d.costing ? sym + d.costing.cost.toFixed(2) : '—'}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: d.costing ? gpColor(d.costing.pct || 0, gpTarget, C) : C.faint, textAlign: 'right' }}>
                    {d.costing ? (d.costing.pct || 0).toFixed(1) + '%' : 'uncosted'}
                  </span>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                    <button onClick={() => moveRecipe(d.id, -1)} disabled={i === 0} title="Move up"
                      style={{ background: 'none', border: 'none', color: i === 0 ? C.faint : C.dim, cursor: i === 0 ? 'default' : 'pointer', fontSize: '13px', padding: '0 4px', opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                    <button onClick={() => moveRecipe(d.id, 1)} disabled={i === stats.dishes.length - 1} title="Move down"
                      style={{ background: 'none', border: 'none', color: i === stats.dishes.length - 1 ? C.faint : C.dim, cursor: i === stats.dishes.length - 1 ? 'default' : 'pointer', fontSize: '13px', padding: '0 4px', opacity: i === stats.dishes.length - 1 ? 0.3 : 1 }}>↓</button>
                    <button onClick={() => removeRecipe(d.id)} title="Remove from menu"
                      style={{ background: 'none', border: 'none', color: C.faint, cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danger */}
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
        <button onClick={() => setShowAdd(true)}
          style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', background: C.gold, color: C.bg, border: 'none', padding: '10px 18px', cursor: 'pointer', borderRadius: '2px' }}>
          + Add Menu
        </button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menus..." style={{ ...inp, marginBottom: '20px', maxWidth: '400px' }} />

      {filtered.length === 0 ? (
        <div style={{ background: C.surface, border: '1px dashed ' + C.border, borderRadius: '4px', padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: C.faint, marginBottom: '12px' }}>{menus.length === 0 ? 'No menus yet' : 'No matches'}</p>
          {menus.length === 0 && (
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
