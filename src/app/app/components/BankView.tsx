'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useSettings } from '@/context/SettingsContext';
import { dark, light } from '@/lib/theme';

const CATEGORIES = ['Meat & Fish','Dairy','Produce','Dry Goods','Beverages','Bakery','Frozen','Cleaning','Other'];
const UNITS = ['kg','g','l','ml','ea','dozen','case'];

const ALLERGENS: { key: string; label: string }[] = [
  { key: 'gluten',     label: 'Gluten' },
  { key: 'crustaceans',label: 'Crustaceans' },
  { key: 'eggs',       label: 'Eggs' },
  { key: 'fish',       label: 'Fish' },
  { key: 'peanuts',    label: 'Peanuts' },
  { key: 'soybeans',   label: 'Soybeans' },
  { key: 'milk',       label: 'Milk' },
  { key: 'nuts',       label: 'Nuts' },
  { key: 'celery',     label: 'Celery' },
  { key: 'mustard',    label: 'Mustard' },
  { key: 'sesame',     label: 'Sesame' },
  { key: 'sulphites',  label: 'Sulphites' },
  { key: 'lupin',      label: 'Lupin' },
  { key: 'molluscs',   label: 'Molluscs' },
];
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

export default function BankView() {
  const { state, actions } = useApp();
  const { settings } = useSettings();
  const C = settings.resolved === 'light' ? light : dark;
  const sym = (state.profile||{}).currencySymbol || '£';

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [selId, setSelId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const bank = state.ingredientsBank || [];
  const sel = bank.find((b: any) => b.id === selId) || null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bank
      .filter((b: any) => {
        if (catFilter !== 'all' && (b.category || 'Other') !== catFilter) return false;
        if (!q) return true;
        return (b.name || '').toLowerCase().includes(q);
      })
      .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
  }, [bank, search, catFilter]);

  function update(field: string, value: any) {
    if (!sel) return;
    actions.updBank(sel.id, { [field]: value });
  }
  function updateNested(parent: string, field: string, value: any) {
    if (!sel) return;
    actions.updBank(sel.id, { [parent]: { ...(sel[parent] || {}), [field]: value } });
  }

  function addItem() {
    const name = newName.trim();
    if (!name) return;
    actions.addBank({ name });
    setNewName('');
    setShowAdd(false);
    // select the new item after a tick
    setTimeout(() => {
      const created = (state.ingredientsBank || []).find((b: any) => b.name.toLowerCase() === name.toLowerCase());
      if (created) setSelId(created.id);
    }, 50);
  }

  function deleteItem() {
    if (!sel) return;
    actions.delBank(sel.id);
    setSelId(null);
    setDeleteConfirm(false);
  }

  const inp: any = { width: '100%', background: C.surface2, border: '1px solid ' + C.border, color: C.text, fontSize: '13px', padding: '9px 12px', outline: 'none', boxSizing: 'border-box', borderRadius: '3px' };
  const lbl: any = { fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 0px)', fontFamily: 'system-ui,sans-serif', color: C.text }}>
      {/* List */}
      <div style={{ width: '340px', borderRight: '1px solid ' + C.border, background: C.surface, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid ' + C.border }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '24px' }}>Ingredients Bank</h1>
            <button onClick={() => setShowAdd(true)}
              style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', background: C.gold, color: C.bg, padding: '7px 12px', border: 'none', cursor: 'pointer', borderRadius: '2px' }}>
              + Add
            </button>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ingredients..." style={{ ...inp, marginBottom: '8px' }} />
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
            <option value="all">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <p style={{ fontSize: '11px', color: C.faint, marginTop: '10px' }}>{filtered.length} of {bank.length} ingredients</p>
        </div>
        <div style={{ overflow: 'auto', flex: 1 }}>
          {filtered.length === 0 ? (
            <p style={{ padding: '24px', textAlign: 'center', color: C.faint, fontSize: '13px' }}>{bank.length === 0 ? 'No ingredients yet. Add one or scan an invoice.' : 'No matches.'}</p>
          ) : filtered.map((b: any) => {
            const containsCount = (b.allergens?.contains || []).length;
            const hasNutrition = b.nutrition && Object.keys(b.nutrition).some(k => b.nutrition[k] !== '' && b.nutrition[k] != null);
            const isSel = b.id === selId;
            return (
              <button key={b.id} onClick={() => { setSelId(b.id); setDeleteConfirm(false); }}
                style={{ width: '100%', textAlign: 'left', background: isSel ? C.gold + '12' : 'transparent', borderLeft: '3px solid ' + (isSel ? C.gold : 'transparent'), border: 'none', borderBottom: '0.5px solid ' + C.border, padding: '12px 16px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '14px', color: isSel ? C.gold : C.text, fontWeight: isSel ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</span>
                  <span style={{ fontSize: '11px', color: C.faint, flexShrink: 0 }}>{b.unitPrice != null ? sym + Number(b.unitPrice).toFixed(2) + '/' + (b.unit || 'kg') : '—'}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: C.faint }}>{b.category || 'Other'}</span>
                  {containsCount > 0 && <span style={{ fontSize: '9px', fontWeight: 700, color: C.red, background: C.red + '12', border: '0.5px solid ' + C.red + '30', padding: '1px 5px', borderRadius: '2px' }}>{containsCount} allergen{containsCount === 1 ? '' : 's'}</span>}
                  {hasNutrition && <span style={{ fontSize: '9px', fontWeight: 700, color: C.greenLight, background: C.greenLight + '12', border: '0.5px solid ' + C.greenLight + '30', padding: '1px 5px', borderRadius: '2px' }}>kcal</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail */}
      <div style={{ flex: 1, overflow: 'auto', padding: '32px' }}>
        {!sel ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.faint, fontSize: '14px' }}>
            Select an ingredient to edit, or click + Add
          </div>
        ) : (
          <div style={{ maxWidth: '720px' }}>
            {/* Identity */}
            <div style={{ marginBottom: '24px' }}>
              <input value={sel.name || ''} onChange={e => update('name', e.target.value)}
                style={{ width: '100%', fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '28px', color: C.text, background: 'transparent', border: 'none', borderBottom: '1px solid ' + C.border, outline: 'none', padding: '4px 0', marginBottom: '6px' }} />
              <p style={{ fontSize: '11px', color: C.faint }}>Edit any field below — changes save automatically and propagate to every recipe that uses this ingredient.</p>
            </div>

            {/* Category, unit, price */}
            <div style={{ background: C.surface2, border: '1px solid ' + C.border, padding: '20px', borderRadius: '4px', marginBottom: '14px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, marginBottom: '14px' }}>Basics</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={lbl}>Category</label>
                  <select value={sel.category || 'Other'} onChange={e => update('category', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Unit</label>
                  <select value={sel.unit || 'kg'} onChange={e => update('unit', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Price per {sel.unit || 'kg'} ({sym})</label>
                  <input type="number" step="0.01" value={sel.unitPrice ?? ''} onChange={e => update('unitPrice', e.target.value === '' ? null : parseFloat(e.target.value))} placeholder="0.00" style={inp} />
                </div>
              </div>
            </div>

            {/* Allergens */}
            <div style={{ background: C.surface2, border: '1px solid ' + C.border, padding: '20px', borderRadius: '4px', marginBottom: '14px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, marginBottom: '12px' }}>Allergens — Contains</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                {ALLERGENS.map(a => {
                  const on = (sel.allergens?.contains || []).includes(a.key);
                  return (
                    <button key={a.key}
                      onClick={() => {
                        const cur = (sel.allergens?.contains || []) as string[];
                        const next = on ? cur.filter(k => k !== a.key) : [...cur, a.key];
                        updateNested('allergens', 'contains', next);
                      }}
                      style={{ fontSize: '11px', padding: '5px 10px', border: '1px solid ' + (on ? C.red : C.border), color: on ? C.red : C.dim, background: on ? C.red + '12' : 'transparent', cursor: 'pointer', borderRadius: '2px', fontWeight: on ? 700 : 400 }}>
                      {a.label}
                    </button>
                  );
                })}
              </div>

              {(sel.allergens?.contains || []).includes('nuts') && (
                <div style={{ marginBottom: '14px', paddingLeft: '12px', borderLeft: '2px solid ' + C.red + '40' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.red, marginBottom: '6px' }}>Name the nut</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {NUT_TYPES.map(n => {
                      const on = (sel.allergens?.nutTypes || []).includes(n);
                      return (
                        <button key={n}
                          onClick={() => {
                            const cur = (sel.allergens?.nutTypes || []) as string[];
                            updateNested('allergens', 'nutTypes', on ? cur.filter(k => k !== n) : [...cur, n]);
                          }}
                          style={{ fontSize: '11px', padding: '4px 9px', border: '1px solid ' + (on ? C.red : C.border), color: on ? C.red : C.dim, background: on ? C.red + '12' : 'transparent', cursor: 'pointer', borderRadius: '2px', fontWeight: on ? 700 : 400 }}>
                          {n}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(sel.allergens?.contains || []).includes('gluten') && (
                <div style={{ paddingLeft: '12px', borderLeft: '2px solid ' + C.red + '40' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.red, marginBottom: '6px' }}>Name the cereal</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {GLUTEN_TYPES.map(g => {
                      const on = (sel.allergens?.glutenTypes || []).includes(g);
                      return (
                        <button key={g}
                          onClick={() => {
                            const cur = (sel.allergens?.glutenTypes || []) as string[];
                            updateNested('allergens', 'glutenTypes', on ? cur.filter(k => k !== g) : [...cur, g]);
                          }}
                          style={{ fontSize: '11px', padding: '4px 9px', border: '1px solid ' + (on ? C.red : C.border), color: on ? C.red : C.dim, background: on ? C.red + '12' : 'transparent', cursor: 'pointer', borderRadius: '2px', fontWeight: on ? 700 : 400 }}>
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Nutrition */}
            <div style={{ background: C.surface2, border: '1px solid ' + C.border, padding: '20px', borderRadius: '4px', marginBottom: '14px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, marginBottom: '12px' }}>Nutrition — per 100{sel.unit === 'l' || sel.unit === 'ml' ? 'ml' : 'g'}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {NUTRITION_FIELDS.map(f => (
                  <div key={f.key}>
                    <label style={lbl}>{f.label} ({f.unit})</label>
                    <input type="number" step="0.1" value={sel.nutrition?.[f.key] ?? ''}
                      onChange={e => updateNested('nutrition', f.key, e.target.value === '' ? null : parseFloat(e.target.value))}
                      placeholder="0" style={inp} />
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '11px', color: C.faint, marginTop: '12px' }}>Source these from the manufacturer's back-of-pack label or McCance & Widdowson.</p>
            </div>

            {/* Danger */}
            <div style={{ background: C.surface2, border: '1px solid ' + C.red + '30', padding: '20px', borderRadius: '4px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.red, marginBottom: '8px' }}>Danger Zone</p>
              <p style={{ fontSize: '12px', color: C.faint, marginBottom: '12px' }}>Deletes this ingredient from the bank. Existing costings keep their copy of the data.</p>
              {!deleteConfirm ? (
                <button onClick={() => setDeleteConfirm(true)} style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.red, background: 'transparent', border: '1px solid ' + C.red, padding: '7px 14px', cursor: 'pointer', borderRadius: '2px' }}>Delete ingredient</button>
              ) : (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: C.red }}>Are you sure?</span>
                  <button onClick={deleteItem} style={{ fontSize: '11px', fontWeight: 700, color: '#fff', background: C.red, border: 'none', padding: '7px 14px', cursor: 'pointer', borderRadius: '2px' }}>Yes, delete</button>
                  <button onClick={() => setDeleteConfirm(false)} style={{ fontSize: '11px', color: C.dim, background: 'none', border: '1px solid ' + C.border, padding: '7px 14px', cursor: 'pointer', borderRadius: '2px' }}>Cancel</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ background: C.surface, border: '1px solid ' + C.border, width: '100%', maxWidth: '420px', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid ' + C.border }}>
              <h3 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '20px' }}>Add ingredient</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: C.faint, fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: '20px' }}>
              <label style={lbl}>Name</label>
              <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
                placeholder="e.g. Cornish unsalted butter" style={inp} />
              <p style={{ fontSize: '11px', color: C.faint, marginTop: '8px' }}>You can fill in category, price, allergens and nutrition after creating.</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '14px 20px', borderTop: '1px solid ' + C.border }}>
              <button onClick={() => setShowAdd(false)} style={{ fontSize: '12px', color: C.dim, background: 'transparent', border: '1px solid ' + C.border, padding: '8px 14px', cursor: 'pointer', borderRadius: '2px' }}>Cancel</button>
              <button onClick={addItem} disabled={!newName.trim()}
                style={{ fontSize: '12px', fontWeight: 700, color: C.bg, background: C.gold, border: 'none', padding: '8px 14px', cursor: newName.trim() ? 'pointer' : 'default', borderRadius: '2px', opacity: newName.trim() ? 1 : 0.5 }}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
