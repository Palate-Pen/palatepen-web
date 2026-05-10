'use client';
import { useState } from 'react';
import { useApp, uid } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { dark, light } from '@/lib/theme';

const CATS = ['Starter','Main','Dessert','Sauce','Bread','Pastry','Stock','Snack','Other'];

function gpColor(pct: number, target: number, C: any) {
  if (pct >= target) return C.greenLight;
  if (pct >= 65) return C.gold;
  return C.red;
}

export default function RecipesView() {
  const { state, actions } = useApp();
  const { tier } = useAuth();
  const { settings } = useSettings();
  const C = settings.resolved === 'light' ? light : dark;
  const sym = (state.profile||{}).currencySymbol || '£';
  const gpTarget = (state.profile||{}).gpTarget || 72;

  const [search, setSearch] = useState('');
  const [sel, setSel] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState('Main');
  const [newNotes, setNewNotes] = useState('');
  const [deleteId, setDeleteId] = useState<string|null>(null);

  const filtered = state.recipes.filter((r: any) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    (r.category||'').toLowerCase().includes(search.toLowerCase())
  );

  // Find linked costing for selected recipe
  const linkedCosting = sel
    ? state.gpHistory.find((h: any) =>
        h.name?.toLowerCase() === sel.title?.toLowerCase() ||
        h.linkedRecipeId === sel.id
      )
    : null;

  function save() {
    if (!newTitle.trim()) return;
    actions.addRecipe({ title: newTitle.trim(), category: newCat, notes: newNotes });
    setShowAdd(false); setNewTitle(''); setNewCat('Main'); setNewNotes('');
  }

  const inp: any = {
    width: '100%', background: C.surface2, border: '1px solid ' + C.border,
    color: C.text, fontSize: '13px', padding: '9px 12px', outline: 'none',
    fontFamily: 'system-ui,sans-serif', boxSizing: 'border-box',
  };

  // ── RECIPE DETAIL ────────────────────────────────────────
  if (sel) return (
    <div style={{ padding: '32px', maxWidth: '920px', fontFamily: 'system-ui,sans-serif', color: C.text }}>
      <button onClick={() => setSel(null)} style={{ fontSize: '13px', color: C.gold, background: 'none', border: 'none', cursor: 'pointer', marginBottom: '20px', display: 'block' }}>
        ← Recipe Library
      </button>

      <input value={sel.title} onChange={e => actions.updRecipe(sel.id, { title: e.target.value })}
        style={{ width: '100%', background: 'transparent', fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '32px', color: C.text, border: 'none', borderBottom: '1px solid ' + C.border, paddingBottom: '12px', marginBottom: '20px', outline: 'none', boxSizing: 'border-box' }} />

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '28px' }}>
        {[sel.category, sel.imported?.servings ? 'Serves ' + sel.imported.servings : null, sel.imported?.prepTime ? 'Prep: ' + sel.imported.prepTime : null].filter(Boolean).map((t: string) => (
          <span key={t} style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.gold, background: C.gold + '18', border: '0.5px solid ' + C.gold + '30', padding: '4px 10px', borderRadius: '2px' }}>{t}</span>
        ))}
      </div>

      {/* COSTING PANEL */}
      <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '4px', marginBottom: '28px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid ' + C.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint }}>Costing</p>
          {linkedCosting && (
            <p style={{ fontSize: '11px', color: C.faint }}>Last updated {new Date(linkedCosting.savedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
          )}
        </div>

        {linkedCosting ? (
          <div>
            {/* GP summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid ' + C.border }}>
              {[
                { l: 'Sell', v: sym + (linkedCosting.sell||0).toFixed(2) },
                { l: 'Cost/Cover', v: sym + (linkedCosting.cost||0).toFixed(2) },
                { l: 'GP £', v: sym + (linkedCosting.gp||0).toFixed(2) },
                { l: 'GP %', v: (linkedCosting.pct||0).toFixed(1) + '%', highlight: true },
              ].map((cell, i) => (
                <div key={cell.l} style={{ padding: '14px', textAlign: 'center', borderRight: i < 3 ? '1px solid ' + C.border : 'none' }}>
                  <p style={{ fontSize: '10px', letterSpacing: '0.8px', textTransform: 'uppercase', color: C.faint, marginBottom: '6px' }}>{cell.l}</p>
                  <p style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '20px', color: cell.highlight ? gpColor(linkedCosting.pct||0, linkedCosting.target||gpTarget, C) : C.text }}>{cell.v}</p>
                </div>
              ))}
            </div>

            {/* GP benchmark bar */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid ' + C.border }}>
              {[
                { l: 'This dish', v: linkedCosting.pct||0, c: gpColor(linkedCosting.pct||0, linkedCosting.target||gpTarget, C) },
                { l: 'Target ' + (linkedCosting.target||gpTarget) + '%', v: linkedCosting.target||gpTarget, c: C.greenLight },
                { l: 'Industry min 65%', v: 65, c: C.faint },
              ].map(b => (
                <div key={b.l} style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.faint, marginBottom: '3px' }}>
                    <span>{b.l}</span><span style={{ color: b.c }}>{b.v.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: '3px', background: C.surface3, borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '3px', background: b.c, borderRadius: '2px', width: Math.min(Math.max(b.v, 0), 100) + '%' }}></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Ingredient breakdown */}
            {(linkedCosting.ingredients||[]).length > 0 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '8px', padding: '10px 16px', background: C.surface2, borderBottom: '1px solid ' + C.border }}>
                  {['Ingredient','Qty','Cost/unit','Line cost'].map(h => (
                    <p key={h} style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.faint }}>{h}</p>
                  ))}
                </div>
                {linkedCosting.ingredients.map((ing: any) => (
                  <div key={ing.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '8px', padding: '10px 16px', borderBottom: '1px solid ' + C.border, alignItems: 'center' }}>
                    <p style={{ fontSize: '13px', color: C.text }}>{ing.name}</p>
                    <p style={{ fontSize: '13px', color: C.dim }}>{ing.qty}{ing.unit}</p>
                    <p style={{ fontSize: '13px', color: C.dim }}>{sym}{(ing.price||0).toFixed(2)}</p>
                    <p style={{ fontSize: '13px', color: C.gold }}>{sym}{(ing.line||0).toFixed(3)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* GP advice */}
            <div style={{ padding: '12px 16px', background: (linkedCosting.pct||0) >= (linkedCosting.target||gpTarget) ? C.green + '08' : C.red + '06' }}>
              <p style={{ fontSize: '12px', color: (linkedCosting.pct||0) >= (linkedCosting.target||gpTarget) ? C.greenLight : C.red }}>
                {(linkedCosting.pct||0) >= (linkedCosting.target||gpTarget)
                  ? 'On target — GP of ' + (linkedCosting.pct||0).toFixed(1) + '% meets your ' + (linkedCosting.target||gpTarget) + '% goal.'
                  : 'Below target — price at ' + sym + (linkedCosting.cost / (1 - (linkedCosting.target||gpTarget) / 100)).toFixed(2) + ' to hit ' + (linkedCosting.target||gpTarget) + '%.'}
              </p>
            </div>
          </div>
        ) : (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: C.faint, marginBottom: '12px' }}>No costing saved for this recipe yet.</p>
            <p style={{ fontSize: '12px', color: C.faint }}>Go to Costing, enter &ldquo;{sel.title}&rdquo; as the dish name, and save — it will appear here automatically.</p>
          </div>
        )}
      </div>

      {/* Ingredients from import */}
      {sel.imported?.ingredients?.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, marginBottom: '12px' }}>Ingredients</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {sel.imported.ingredients.map((ing: string, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'start', gap: '10px', padding: '8px 12px', background: C.surface2, border: '0.5px solid ' + C.border, borderRadius: '3px' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: C.gold, flexShrink: 0, marginTop: '5px' }}></div>
                <span style={{ fontSize: '13px', color: C.text }}>{ing}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Method */}
      {sel.imported?.method?.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, marginBottom: '12px' }}>Method</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sel.imported.method.map((step: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '16px', padding: '14px 16px', background: C.surface2, border: '0.5px solid ' + C.border, borderRadius: '3px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: C.gold + '18', border: '0.5px solid ' + C.gold + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '11px', color: C.gold, fontWeight: 700 }}>{i + 1}</span>
                </div>
                <p style={{ fontSize: '13px', color: C.text, lineHeight: 1.7 }}>{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chef notes */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, marginBottom: '8px' }}>Chef&apos;s Notes</p>
        <textarea value={sel.notes} onChange={e => actions.updRecipe(sel.id, { notes: e.target.value })}
          placeholder="Techniques, adaptations, ideas..." rows={4} style={{ ...inp, resize: 'none' }} />
      </div>

      {/* Delete */}
      <div style={{ borderTop: '1px solid ' + C.border, paddingTop: '20px' }}>
        {deleteId === sel.id ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <p style={{ fontSize: '13px', color: C.red }}>Delete this recipe?</p>
            <button onClick={() => setDeleteId(null)} style={{ fontSize: '12px', color: C.dim, background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => { actions.delRecipe(sel.id); setSel(null); setDeleteId(null); }}
              style={{ fontSize: '12px', fontWeight: 700, color: '#fff', background: C.red, border: 'none', padding: '8px 16px', cursor: 'pointer', borderRadius: '2px' }}>
              Confirm Delete
            </button>
          </div>
        ) : (
          <button onClick={() => setDeleteId(sel.id)}
            style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.red, border: '1px solid ' + C.red, background: 'transparent', padding: '8px 16px', cursor: 'pointer', borderRadius: '2px' }}>
            Delete Recipe
          </button>
        )}
      </div>
    </div>
  );

  // ── RECIPE LIST ──────────────────────────────────────────
  return (
    <div style={{ padding: '32px', fontFamily: 'system-ui,sans-serif', color: C.text }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '28px', color: C.text, marginBottom: '4px' }}>Recipe Library</h1>
          <p style={{ fontSize: '12px', color: C.faint }}>{state.recipes.length} recipe{state.recipes.length !== 1 ? 's' : ''} saved</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', background: C.gold, color: C.bg, border: 'none', padding: '10px 18px', cursor: 'pointer', borderRadius: '2px' }}>
          + Add Recipe
        </button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search recipes..."
        style={{ width: '100%', background: C.surface, border: '1px solid ' + C.border, color: C.text, fontSize: '14px', padding: '12px 14px', outline: 'none', fontFamily: 'system-ui,sans-serif', marginBottom: '16px', boxSizing: 'border-box' }} />

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: '13px', color: C.faint }}>No recipes yet. Add your first one.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '8px' }}>
          {filtered.map((r: any) => {
            const costing = state.gpHistory.find((h: any) =>
              h.name?.toLowerCase() === r.title?.toLowerCase() || h.linkedRecipeId === r.id
            );
            return (
              <button key={r.id} onClick={() => setSel(r)}
                style={{ textAlign: 'left', background: C.surface, border: '1px solid ' + C.border, borderRadius: '4px', padding: '20px', cursor: 'pointer' }}>
                <h3 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '18px', color: C.text, marginBottom: '8px' }}>{r.title}</h3>
                {r.imported?.description && (
                  <p style={{ fontSize: '12px', color: C.faint, lineHeight: 1.5, marginBottom: '10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {r.imported.description}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: C.gold, background: C.gold + '18', border: '0.5px solid ' + C.gold + '30', padding: '2px 8px', borderRadius: '2px' }}>{r.category || 'Other'}</span>
                  {costing && (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: gpColor(costing.pct||0, costing.target||gpTarget, C), background: gpColor(costing.pct||0, costing.target||gpTarget, C) + '18', border: '0.5px solid ' + gpColor(costing.pct||0, costing.target||gpTarget, C) + '30', padding: '2px 8px', borderRadius: '2px' }}>
                      GP {(costing.pct||0).toFixed(1)}%
                    </span>
                  )}
                  {r.imported && <span style={{ fontSize: '10px', color: C.faint, background: C.surface2, border: '0.5px solid ' + C.border, padding: '2px 8px', borderRadius: '2px' }}>Imported</span>}
                  {(r.linkedNoteIds||[]).length > 0 && <span style={{ fontSize: '10px', color: C.faint, background: C.surface2, border: '0.5px solid ' + C.border, padding: '2px 8px', borderRadius: '2px' }}>{r.linkedNoteIds.length} note{r.linkedNoteIds.length > 1 ? 's' : ''}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ background: C.surface, border: '1px solid ' + C.border, width: '100%', maxWidth: '480px', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid ' + C.border }}>
              <h3 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '20px', color: C.text }}>Add Recipe</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: C.faint, fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' }}>Title</label>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Beef Bourguignon" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '8px' }}>Category</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {CATS.map(c => (
                    <button key={c} onClick={() => setNewCat(c)}
                      style={{ fontSize: '12px', padding: '6px 12px', border: '1px solid ' + (newCat === c ? C.gold : C.border), color: newCat === c ? C.gold : C.dim, background: newCat === c ? C.gold + '10' : 'transparent', cursor: 'pointer', borderRadius: '2px' }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' }}>Chef&apos;s Notes</label>
                <textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Your thoughts, variations..." rows={3} style={{ ...inp, resize: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', padding: '16px 20px', borderTop: '1px solid ' + C.border }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, fontSize: '12px', color: C.dim, background: C.surface2, border: '1px solid ' + C.border, padding: '10px', cursor: 'pointer', borderRadius: '2px' }}>Cancel</button>
              <button onClick={save} disabled={!newTitle.trim()}
                style={{ flex: 1, fontSize: '12px', fontWeight: 700, background: C.gold, color: C.bg, border: 'none', padding: '10px', cursor: 'pointer', borderRadius: '2px', opacity: !newTitle.trim() ? 0.4 : 1 }}>
                Save Recipe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
