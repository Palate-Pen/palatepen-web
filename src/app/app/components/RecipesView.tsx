'use client';
import { useState, useEffect } from 'react';
import { useApp, uid } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { dark, light } from '@/lib/theme';

const CATS = ['Starter','Main','Dessert','Sauce','Bread','Pastry','Stock','Snack','Other'];

// UK Food Information Regulations — 14 mandatory allergens
const ALLERGENS: { key: string; label: string; short: string }[] = [
  { key: 'gluten',     label: 'Gluten',     short: 'GL' },
  { key: 'crustaceans',label: 'Crustaceans',short: 'CR' },
  { key: 'eggs',       label: 'Eggs',       short: 'EG' },
  { key: 'fish',       label: 'Fish',       short: 'FI' },
  { key: 'peanuts',    label: 'Peanuts',    short: 'PE' },
  { key: 'soybeans',   label: 'Soybeans',   short: 'SO' },
  { key: 'milk',       label: 'Milk',       short: 'MI' },
  { key: 'nuts',       label: 'Nuts',       short: 'NU' },
  { key: 'celery',     label: 'Celery',     short: 'CE' },
  { key: 'mustard',    label: 'Mustard',    short: 'MU' },
  { key: 'sesame',     label: 'Sesame',     short: 'SE' },
  { key: 'sulphites',  label: 'Sulphites',  short: 'SU' },
  { key: 'lupin',      label: 'Lupin',      short: 'LU' },
  { key: 'molluscs',   label: 'Molluscs',   short: 'MO' },
];

// FIR sub-types — UK law requires naming the specific tree nut and cereal
const NUT_TYPES = ['Almond','Hazelnut','Walnut','Cashew','Pecan','Brazil nut','Pistachio','Macadamia'];
const GLUTEN_TYPES = ['Wheat','Rye','Barley','Oats','Spelt','Kamut'];

const NUTRITION_FIELDS: { key: string; label: string; unit: string }[] = [
  { key: 'kcal',      label: 'Energy',         unit: 'kcal' },
  { key: 'kj',        label: 'Energy',         unit: 'kJ' },
  { key: 'fat',       label: 'Fat',            unit: 'g' },
  { key: 'saturates', label: 'of which saturates', unit: 'g' },
  { key: 'carbs',     label: 'Carbohydrate',   unit: 'g' },
  { key: 'sugars',    label: 'of which sugars', unit: 'g' },
  { key: 'protein',   label: 'Protein',        unit: 'g' },
  { key: 'salt',      label: 'Salt',           unit: 'g' },
  { key: 'fibre',     label: 'Fibre',          unit: 'g' },
];

// UK FOP traffic-light thresholds per 100g of finished food (2013 DH guidance).
// Returns 'low' (green), 'med' (amber), 'high' (red), or null if no rule.
type Light = 'low' | 'med' | 'high';
const FOP: Record<string, [number, number]> = {
  // [low/med boundary, med/high boundary]
  fat:       [3.0, 17.5],
  saturates: [1.5, 5.0],
  sugars:    [5.0, 22.5],
  salt:      [0.3, 1.5],
};
function trafficLight(key: string, valuePer100g: number): Light | null {
  const t = FOP[key];
  if (!t) return null;
  if (valuePer100g <= t[0]) return 'low';
  if (valuePer100g <= t[1]) return 'med';
  return 'high';
}
const LIGHT_LABEL: Record<Light, string> = { low: 'LOW', med: 'MED', high: 'HIGH' };
function lightColors(C: any, l: Light): { fg: string; bg: string; bd: string } {
  if (l === 'low')  return { fg: C.greenLight, bg: C.greenLight + '18', bd: C.greenLight + '40' };
  if (l === 'med')  return { fg: C.gold,       bg: C.gold + '18',       bd: C.gold + '40' };
  return                  { fg: C.red,        bg: C.red + '18',        bd: C.red + '40' };
}

// Convert a (qty, unit) pair into grams/ml so we can scale per-100 nutrition.
// Returns null if we can't make sense of the unit (e.g. 'ea').
function toGrams(qty: number, unit: string | undefined): number | null {
  const u = (unit || '').toLowerCase();
  if (u === 'g' || u === 'ml') return qty;
  if (u === 'kg' || u === 'l') return qty * 1000;
  return null; // 'ea', 'dozen', 'case', etc. — can't compute without weight
}

// Compute allergens + nutrition for a recipe from its linked costing's ingredients
// matched against the bank.
function computeFromBank(costing: any, bank: any[]) {
  const result = {
    contains: new Set<string>(),
    nutTypes: new Set<string>(),
    glutenTypes: new Set<string>(),
    nutrition: {} as Record<string, number>,
    matched: 0,
    unmatched: [] as string[],
    nutritionCoverage: 0, // grams of ingredients we could compute nutrition for
    nutritionTotal: 0,    // grams of ingredients in the recipe overall
  };
  if (!costing?.ingredients?.length) return result;
  for (const ing of costing.ingredients) {
    const name = (ing.name || '').toLowerCase().trim();
    const bankItem = bank.find((b: any) => (b.name || '').toLowerCase().trim() === name);
    if (!bankItem) {
      result.unmatched.push(ing.name || '(unnamed)');
      continue;
    }
    result.matched++;
    (bankItem.allergens?.contains || []).forEach((k: string) => result.contains.add(k));
    (bankItem.allergens?.nutTypes || []).forEach((k: string) => result.nutTypes.add(k));
    (bankItem.allergens?.glutenTypes || []).forEach((k: string) => result.glutenTypes.add(k));
    const grams = toGrams(parseFloat(ing.qty) || 0, ing.unit);
    if (grams !== null) result.nutritionTotal += grams;
    if (grams !== null && bankItem.nutrition) {
      const scale = grams / 100;
      let any = false;
      NUTRITION_FIELDS.forEach(f => {
        const v = parseFloat(bankItem.nutrition[f.key]);
        if (!isNaN(v)) {
          result.nutrition[f.key] = (result.nutrition[f.key] || 0) + v * scale;
          any = true;
        }
      });
      if (any) result.nutritionCoverage += grams;
    }
  }
  return result;
}

function gpColor(pct: number, target: number, C: any) {
  if (pct >= target) return C.greenLight;
  if (pct >= 65) return C.gold;
  return C.red;
}

export default function RecipesView() {
  const { state, actions } = useApp();
  const { settings } = useSettings();
  const C = settings.resolved === 'light' ? light : dark;
  const sym = (state.profile||{}).currencySymbol || '£';
  const gpTarget = (state.profile||{}).gpTarget || 72;

  const [search, setSearch] = useState('');
  const [sel, setSel] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCat, setEditCat] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState('Main');
  const [newNotes, setNewNotes] = useState('');
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Record<string,boolean>>({});
  const [assigningCosting, setAssigningCosting] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);

  const filtered = state.recipes.filter((r: any) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    (r.category||'').toLowerCase().includes(search.toLowerCase())
  );

  function getLinkedCosting(recipe: any) {
    if (!recipe) return null;
    // First check for explicit link
    if (recipe.linkedCostingId) {
      return state.gpHistory.find((h: any) => h.id === recipe.linkedCostingId) || null;
    }
    // Fall back to name match
    return state.gpHistory.find((h: any) =>
      h.name?.toLowerCase().trim() === recipe.title?.toLowerCase().trim()
    ) || null;
  }

  function assignCosting(costingId: string) {
    actions.updRecipe(sel.id, { linkedCostingId: costingId });
    setSel({ ...sel, linkedCostingId: costingId });
    setAssigningCosting(false);
  }

  function removeCosting() {
    actions.updRecipe(sel.id, { linkedCostingId: null });
    setSel({ ...sel, linkedCostingId: null });
  }

  function openEdit() {
    setEditTitle(sel.title || '');
    setEditCat(sel.category || 'Main');
    setEditNotes(sel.notes || '');
    setEditMode(true);
  }

  useEffect(() => {
    if (!editMode || !sel || !editTitle.trim()) return;
    const t = setTimeout(() => {
      actions.updRecipe(sel.id, { title: editTitle.trim(), category: editCat, notes: editNotes });
      setSel((prev:any) => prev ? { ...prev, title: editTitle.trim(), category: editCat, notes: editNotes } : prev);
    }, 500);
    return () => clearTimeout(t);
  }, [editMode, editTitle, editCat, editNotes]);

  function addRecipe() {
    if (!newTitle.trim()) return;
    actions.addRecipe({ title: newTitle.trim(), category: newCat, notes: newNotes });
    setShowAdd(false); setNewTitle(''); setNewCat('Main'); setNewNotes('');
  }

  const inp: any = { width: '100%', background: C.surface2, border: '1px solid ' + C.border, color: C.text, fontSize: '13px', padding: '9px 12px', outline: 'none', fontFamily: 'system-ui,sans-serif', boxSizing: 'border-box' };

  // ── RECIPE DETAIL ──────────────────────────────────────────
  if (sel) {
    const linkedCosting = getLinkedCosting(sel);

    return (
      <div style={{ padding: '32px', maxWidth: '920px', fontFamily: 'system-ui,sans-serif', color: C.text }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button onClick={() => { setSel(null); setEditMode(false); }} style={{ fontSize: '13px', color: C.gold, background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Recipe Library
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {editMode ? (
              <>
                <p style={{ fontSize: '10px', letterSpacing: '0.8px', textTransform: 'uppercase', color: C.faint, alignSelf: 'center' }}>Auto-saves</p>
                <button onClick={() => setEditMode(false)} style={{ fontSize: '11px', fontWeight: 700, color: C.bg, background: C.gold, border: 'none', padding: '8px 16px', cursor: 'pointer', borderRadius: '2px' }}>Done</button>
              </>
            ) : (
              <button onClick={openEdit} style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.gold, background: C.gold + '12', border: '1px solid ' + C.gold + '30', padding: '8px 16px', cursor: 'pointer', borderRadius: '2px' }}>
                Edit Recipe
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        {editMode ? (
          <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
            style={{ ...inp, background: 'transparent', fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '32px', border: 'none', borderBottom: '1px solid ' + C.border, paddingBottom: '12px', marginBottom: '20px' }} />
        ) : (
          <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '32px', color: C.text, borderBottom: '1px solid ' + C.border, paddingBottom: '12px', marginBottom: '20px' }}>{sel.title}</h1>
        )}

        {/* Category */}
        {editMode ? (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '8px' }}>Category</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {CATS.map(c => (
                <button key={c} onClick={() => setEditCat(c)} style={{ fontSize: '12px', padding: '6px 12px', border: '1px solid ' + (editCat === c ? C.gold : C.border), color: editCat === c ? C.gold : C.dim, background: editCat === c ? C.gold + '10' : 'transparent', cursor: 'pointer', borderRadius: '2px' }}>{c}</button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '28px' }}>
            {[sel.category, sel.imported?.servings ? 'Serves ' + sel.imported.servings : null, sel.imported?.prepTime ? 'Prep: ' + sel.imported.prepTime : null].filter(Boolean).map((t: string) => (
              <span key={t} style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.gold, background: C.gold + '18', border: '0.5px solid ' + C.gold + '30', padding: '4px 10px', borderRadius: '2px' }}>{t}</span>
            ))}
          </div>
        )}

        {/* LINKED NOTES */}
        {!editMode && (() => {
          const linkedNotes = (sel.linkedNoteIds||[]).map((id: string) => state.notes.find((n: any) => n.id === id)).filter(Boolean);
          if (!linkedNotes.length) return null;
          return (
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, marginBottom: '10px' }}>Linked Notes</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {linkedNotes.map((note: any) => (
                  <div key={note.id} style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '4px', overflow: 'hidden' }}>
                    <button onClick={() => setExpandedNotes(prev => ({ ...prev, [note.id]: !prev[note.id] }))}
                      style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ fontSize: '14px', color: C.text }}>{note.title || 'Untitled'}</span>
                      <span style={{ fontSize: '16px', color: C.faint }}>{expandedNotes[note.id] ? '−' : '+'}</span>
                    </button>
                    {expandedNotes[note.id] && (
                      <div style={{ padding: '12px 16px 16px', borderTop: '1px solid ' + C.border }}>
                        <p style={{ fontSize: '13px', color: C.dim, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{note.content || 'No content yet.'}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* COSTING PANEL */}
        {!editMode && (
          <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '4px', marginBottom: '28px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid ' + C.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint }}>Costing</p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {linkedCosting && <p style={{ fontSize: '11px', color: C.faint }}>Last updated {new Date(linkedCosting.savedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>}
                {linkedCosting ? (
                  <button onClick={removeCosting} style={{ fontSize: '10px', color: C.faint, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Remove link</button>
                ) : null}
                <button onClick={() => setAssigningCosting(v => !v)}
                  style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.gold, background: C.gold + '12', border: '1px solid ' + C.gold + '30', padding: '4px 10px', cursor: 'pointer', borderRadius: '2px' }}>
                  {assigningCosting ? 'Cancel' : linkedCosting ? 'Change' : '+ Assign Costing'}
                </button>
              </div>
            </div>

            {/* Costing select */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid ' + C.border, background: C.surface2, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ fontSize: '11px', color: C.faint, whiteSpace: 'nowrap', flexShrink: 0 }}>Linked costing:</label>
              <select
                value={sel.linkedCostingId || ''}
                onChange={e => {
                  const val = e.target.value;
                  actions.updRecipe(sel.id, { linkedCostingId: val || null });
                  setSel({ ...sel, linkedCostingId: val || null });
                }}
                style={{ flex: 1, background: C.surface, border: '1px solid ' + C.border, color: C.text, fontSize: '13px', padding: '7px 10px', outline: 'none', cursor: 'pointer', borderRadius: '3px' }}
              >
                <option value=''>— No costing linked —</option>
                {state.gpHistory.map((h: any) => (
                  <option key={h.id} value={h.id}>
                    {h.name} — {(h.pct || 0).toFixed(1)}% GP · £{(h.sell || 0).toFixed(2)} sell
                  </option>
                ))}
              </select>
            </div>

            {linkedCosting ? (
              <div>
                {/* GP summary row */}
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

                {/* Benchmark bars — target + business min only */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid ' + C.border }}>
                  {[
                    { l: 'This dish', v: linkedCosting.pct||0, c: gpColor(linkedCosting.pct||0, linkedCosting.target||gpTarget, C) },
                    { l: 'Target ' + (linkedCosting.target||gpTarget) + '%', v: linkedCosting.target||gpTarget, c: C.greenLight },
                  ].map(b => (
                    <div key={b.l} style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.faint, marginBottom: '3px' }}>
                        <span>{b.l}</span><span style={{ color: b.c }}>{b.v.toFixed(1)}%</span>
                      </div>
                      <div style={{ height: '3px', background: C.surface3, borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '3px', background: b.c, width: Math.min(Math.max(b.v, 0), 100) + '%', borderRadius: '2px' }}></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ingredients table */}
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
              !assigningCosting && (
                <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: C.faint, marginBottom: '8px' }}>No costing linked to this recipe.</p>
                  <p style={{ fontSize: '12px', color: C.faint }}>Click &ldquo;Assign Costing&rdquo; above to link a saved costing, or go to the Costing screen to create one.</p>
                </div>
              )
            )}
          </div>
        )}

        {/* Ingredients */}
        {!editMode && sel.imported?.ingredients?.length > 0 && (
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
        {!editMode && sel.imported?.method?.length > 0 && (
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

        {/* Allergens (computed from bank via linked costing) + Nutrition + May Contain */}
        {(() => {
          const linked = getLinkedCosting(sel);
          const computed = computeFromBank(linked, state.ingredientsBank || []);
          const portions = parseFloat(linked?.portions) || 1;
          const containsArr = Array.from(computed.contains);
          const nutTypesArr = Array.from(computed.nutTypes);
          const glutenTypesArr = Array.from(computed.glutenTypes);

          return (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint }}>Allergens — Contains <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>(computed from Bank)</span></p>
                <button onClick={() => setShowCompliance(true)}
                  style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.gold, background: 'transparent', border: '1px solid ' + C.gold + '40', padding: '5px 10px', cursor: 'pointer', borderRadius: '2px' }}>
                  Run Compliance Check
                </button>
              </div>

              {!linked ? (
                <p style={{ fontSize: '12px', color: C.faint, padding: '12px', background: C.surface2, border: '0.5px dashed ' + C.border, borderRadius: '3px', marginBottom: '14px' }}>
                  Link a costing above to compute allergens and nutrition from the ingredients.
                </p>
              ) : computed.matched === 0 ? (
                <p style={{ fontSize: '12px', color: C.faint, padding: '12px', background: C.surface2, border: '0.5px dashed ' + C.border, borderRadius: '3px', marginBottom: '14px' }}>
                  None of the {linked.ingredients?.length || 0} costing ingredients match a Bank entry. Add them to the Bank tab to see allergens here.
                </p>
              ) : (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                    {containsArr.length === 0 && <span style={{ fontSize: '12px', color: C.faint }}>No allergens in any of the {computed.matched} matched ingredients.</span>}
                    {containsArr.map(k => {
                      const a = ALLERGENS.find(x => x.key === k);
                      return a && <span key={k} style={{ fontSize: '11px', padding: '5px 10px', border: '1px solid ' + C.red, color: C.red, background: C.red + '12', borderRadius: '2px', fontWeight: 700 }}>{a.label}</span>;
                    })}
                  </div>
                  {nutTypesArr.length > 0 && (
                    <div style={{ marginBottom: '10px', paddingLeft: '12px', borderLeft: '2px solid ' + C.red + '40' }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.red, marginBottom: '4px' }}>Tree nuts: <span style={{ color: C.text, fontWeight: 400 }}>{nutTypesArr.join(', ')}</span></p>
                    </div>
                  )}
                  {glutenTypesArr.length > 0 && (
                    <div style={{ marginBottom: '10px', paddingLeft: '12px', borderLeft: '2px solid ' + C.red + '40' }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.red, marginBottom: '4px' }}>Cereals: <span style={{ color: C.text, fontWeight: 400 }}>{glutenTypesArr.join(', ')}</span></p>
                    </div>
                  )}
                  {computed.unmatched.length > 0 && (
                    <p style={{ fontSize: '11px', color: C.gold, marginBottom: '14px' }}>
                      ⚠ {computed.unmatched.length} ingredient{computed.unmatched.length === 1 ? '' : 's'} not in Bank — allergens may be incomplete: {computed.unmatched.slice(0, 5).join(', ')}{computed.unmatched.length > 5 ? '…' : ''}
                    </p>
                  )}
                </>
              )}

              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, marginBottom: '8px', marginTop: '16px' }}>May Contain — Cross-contamination warning <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>(per-recipe)</span></p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {ALLERGENS.map(a => {
                  const may = (sel.allergens?.mayContain || []).includes(a.key);
                  const computedHas = computed.contains.has(a.key);
                  return (
                    <button key={a.key} disabled={computedHas}
                      title={computedHas ? 'Already in computed Contains list' : ''}
                      onClick={() => {
                        const cur = (sel.allergens?.mayContain || []) as string[];
                        const next = may ? cur.filter(k => k !== a.key) : [...cur, a.key];
                        actions.updRecipe(sel.id, { allergens: { ...(sel.allergens || {}), mayContain: next } });
                      }}
                      style={{ fontSize: '11px', padding: '5px 10px', border: '1px dashed ' + (may ? C.gold : C.border), color: may ? C.gold : (computedHas ? C.faint : C.dim), background: may ? C.gold + '10' : 'transparent', cursor: computedHas ? 'not-allowed' : 'pointer', borderRadius: '2px', fontWeight: may ? 700 : 400, opacity: computedHas ? 0.4 : 1 }}>
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Nutrition (computed) */}
        {(() => {
          const linked = getLinkedCosting(sel);
          const computed = computeFromBank(linked, state.ingredientsBank || []);
          if (!linked || computed.matched === 0) return null;
          const portions = parseFloat(linked.portions) || 1;
          const hasAny = NUTRITION_FIELDS.some(f => computed.nutrition[f.key] != null);
          if (!hasAny) {
            return (
              <div style={{ marginBottom: '24px', padding: '14px', background: C.surface2, border: '0.5px dashed ' + C.border, borderRadius: '3px' }}>
                <p style={{ fontSize: '12px', color: C.faint }}>No nutrition data — fill in nutrition fields on Bank ingredients (per 100g/ml) to see totals here.</p>
              </div>
            );
          }
          const coveragePct = computed.nutritionTotal > 0 ? Math.round((computed.nutritionCoverage / computed.nutritionTotal) * 100) : 0;
          // per-100g of finished dish — uses the weight we actually computed nutrition for
          const dishGrams = computed.nutritionCoverage;
          return (
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, marginBottom: '8px' }}>
                Nutrition <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>(per portion · {portions} portion{portions === 1 ? '' : 's'} · UK FOP traffic lights apply per 100g)</span>
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {NUTRITION_FIELDS.map(f => {
                  const total = computed.nutrition[f.key];
                  if (total == null) return null;
                  const perPortion = total / portions;
                  const per100 = dishGrams > 0 ? (total * 100) / dishGrams : null;
                  const light = per100 != null ? trafficLight(f.key, per100) : null;
                  const lc = light ? lightColors(C, light) : null;
                  const decimals = f.unit === 'g' ? 1 : 0;
                  return (
                    <div key={f.key} style={{
                      background: lc ? lc.bg : C.surface2,
                      border: '0.5px solid ' + (lc ? lc.bd : C.border),
                      padding: '10px 12px', borderRadius: '3px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                        <p style={{ fontSize: '10px', color: C.faint }}>{f.label}</p>
                        {light && lc && (
                          <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: 0.4, color: lc.fg, background: 'transparent', border: '0.5px solid ' + lc.fg, padding: '1px 5px', borderRadius: '2px' }}>
                            {LIGHT_LABEL[light]}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '15px', color: lc ? lc.fg : C.text, fontWeight: 600 }}>{perPortion.toFixed(decimals)}<span style={{ fontSize: '10px', color: C.faint, fontWeight: 400, marginLeft: '3px' }}>{f.unit}</span></p>
                      <p style={{ fontSize: '10px', color: C.faint, marginTop: '2px' }}>
                        {per100 != null ? `${per100.toFixed(decimals)}${f.unit}/100g · ` : ''}total {total.toFixed(decimals)}{f.unit}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: '11px', color: C.faint, marginTop: '8px' }}>
                Traffic lights follow UK Department of Health 2013 FOP guidance for fat, saturates, sugars, and salt per 100g.
                {coveragePct < 100 && (
                  <span style={{ color: C.gold }}> ⚠ Computed from {coveragePct}% of recipe weight — add nutrition data to remaining Bank ingredients for full accuracy.</span>
                )}
              </p>
            </div>
          );
        })()}

        {/* Chef notes */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, marginBottom: '8px' }}>Chef&apos;s Notes</p>
          <textarea
            value={editMode ? editNotes : (sel.notes || '')}
            onChange={e => editMode ? setEditNotes(e.target.value) : actions.updRecipe(sel.id, { notes: e.target.value })}
            placeholder="Techniques, adaptations, ideas..." rows={4}
            style={{ ...inp, resize: 'none' }}
          />
        </div>

        {/* Delete */}
        {!editMode && (
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
        )}

        {/* Compliance modal */}
        {showCompliance && (() => {
          const linked = getLinkedCosting(sel);
          const computed = computeFromBank(linked, state.ingredientsBank || []);
          const importedCount = sel.imported?.ingredients?.length || 0;
          const linkedCount = linked?.ingredients?.length || 0;
          const ingTotal = Math.max(importedCount, linkedCount);
          const contains = Array.from(computed.contains);
          const mayContain = sel.allergens?.mayContain || [];
          const nutTypes = Array.from(computed.nutTypes);
          const glutenTypes = Array.from(computed.glutenTypes);

          type Status = 'pass' | 'warn' | 'fail';
          const checks: { label: string; status: Status; detail: string; source: string }[] = [
            {
              source: "Natasha's Law",
              label: 'Recipe has a name',
              status: sel.title ? 'pass' : 'fail',
              detail: sel.title ? sel.title : 'Add a recipe title — required on the label',
            },
            {
              source: "Natasha's Law",
              label: 'Full ingredient list',
              status: ingTotal > 0 ? 'pass' : 'fail',
              detail: ingTotal > 0
                ? `${ingTotal} ingredients (${importedCount > 0 ? 'imported' : 'from linked costing'})`
                : 'PPDS food must show every ingredient. Import the recipe or link a costing.',
            },
            {
              source: 'Palate & Pen',
              label: 'Ingredients linked to Bank',
              status: linkedCount === 0 ? 'fail' : (computed.unmatched.length === 0 ? 'pass' : 'warn'),
              detail: linkedCount === 0
                ? 'Allergens cannot be computed without a linked costing'
                : computed.unmatched.length === 0
                  ? `All ${computed.matched} ingredients matched`
                  : `${computed.unmatched.length} not in Bank: ${computed.unmatched.slice(0, 3).join(', ')}${computed.unmatched.length > 3 ? '…' : ''}`,
            },
            {
              source: 'FIR 2014',
              label: 'Allergens reviewed',
              status: (contains.length + mayContain.length) > 0 ? 'pass' : (computed.matched > 0 ? 'warn' : 'pass'),
              detail: (contains.length + mayContain.length) > 0
                ? `${contains.length} contains (computed), ${mayContain.length} may contain`
                : 'No allergens detected — confirm Bank entries are tagged correctly',
            },
          ];
          if (contains.includes('nuts')) {
            checks.push({
              source: 'FIR 2014',
              label: 'Tree nut named',
              status: nutTypes.length > 0 ? 'pass' : 'fail',
              detail: nutTypes.length > 0
                ? nutTypes.join(', ')
                : 'UK law requires naming the specific nut. Open the Bank tab and tag the relevant ingredient.',
            });
          }
          if (contains.includes('gluten')) {
            checks.push({
              source: 'FIR 2014',
              label: 'Gluten cereal named',
              status: glutenTypes.length > 0 ? 'pass' : 'fail',
              detail: glutenTypes.length > 0
                ? glutenTypes.join(', ')
                : 'UK law requires naming the cereal. Open the Bank tab and tag the relevant ingredient.',
            });
          }

          const fails = checks.filter(c => c.status === 'fail').length;
          const warns = checks.filter(c => c.status === 'warn').length;
          const compliant = fails === 0;
          const statusColor = fails > 0 ? C.red : (warns > 0 ? C.gold : C.greenLight);
          const iconFor = (s: Status) => s === 'pass' ? '✓' : s === 'warn' ? '⚠' : '✗';
          const colorFor = (s: Status) => s === 'pass' ? C.greenLight : s === 'warn' ? C.gold : C.red;

          return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
              <div style={{ background: C.surface, border: '1px solid ' + C.border, width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'auto', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid ' + C.border }}>
                  <div>
                    <h3 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '20px', color: C.text }}>Allergen Compliance</h3>
                    <p style={{ fontSize: '12px', color: C.faint, marginTop: '2px' }}>UK FIR 2014 + Natasha&apos;s Law</p>
                  </div>
                  <button onClick={() => setShowCompliance(false)} style={{ background: 'none', border: 'none', color: C.faint, fontSize: '20px', cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ padding: '16px 20px', background: statusColor + '14', borderBottom: '1px solid ' + C.border }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: statusColor, letterSpacing: '0.5px' }}>
                    {compliant ? '✓ Compliant' : `✗ Not compliant — ${fails} issue${fails === 1 ? '' : 's'}`}
                    {warns > 0 && <span style={{ color: C.gold, marginLeft: 8, fontWeight: 400 }}>+ {warns} warning{warns === 1 ? '' : 's'}</span>}
                  </p>
                </div>

                <div style={{ padding: '12px 20px' }}>
                  {checks.map((c, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px 0', borderBottom: i < checks.length - 1 ? '0.5px solid ' + C.border : 'none' }}>
                      <span style={{ fontSize: '18px', color: colorFor(c.status), lineHeight: 1, flexShrink: 0, width: '20px', textAlign: 'center' }}>{iconFor(c.status)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: '13px', color: C.text, fontWeight: 500 }}>{c.label}</span>
                          <span style={{ fontSize: '10px', color: C.faint, letterSpacing: 0.5, textTransform: 'uppercase' }}>{c.source}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: c.status === 'fail' ? C.red : C.faint, lineHeight: 1.5 }}>{c.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '12px 20px', borderTop: '1px solid ' + C.border, fontSize: '11px', color: C.faint, lineHeight: 1.6 }}>
                  Checks the 14 UK FIR allergens, name-the-nut and name-the-cereal rules, and Natasha&apos;s Law PPDS labelling requirements (recipe name + full ingredient list). Always verify with your EHO if in doubt.
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // ── RECIPE LIST ────────────────────────────────────────────
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
            const costing = getLinkedCosting(r);
            return (
              <button key={r.id} onClick={() => { setSel(r); setEditMode(false); setAssigningCosting(false); }}
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
                  {(r.allergens?.contains || []).map((k: string) => {
                    const a = ALLERGENS.find(x => x.key === k);
                    if (!a) return null;
                    return <span key={k} title={`Contains ${a.label}`} style={{ fontSize: '9px', fontWeight: 700, color: C.red, background: C.red + '12', border: '0.5px solid ' + C.red + '30', padding: '2px 6px', borderRadius: '2px' }}>{a.short}</span>;
                  })}
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
              <button onClick={addRecipe} disabled={!newTitle.trim()}
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
