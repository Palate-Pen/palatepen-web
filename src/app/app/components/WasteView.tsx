'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useSettings } from '@/context/SettingsContext';
import { dark, light } from '@/lib/theme';
import { CATEGORIES } from '@/lib/categorize';

const REASONS = [
  'Spoilage',
  'Out of date',
  'Over-prep',
  'Customer return',
  'Damaged or dropped',
  'Off-spec / quality',
  'Trim',
  'Training',
  'Other',
];

const UNITS = ['kg', 'g', 'l', 'ml', 'ea', 'dozen', 'case'];

type DateRange = 'all' | 'today' | 'week' | 'month';

function startOf(range: DateRange): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (range === 'today') return d.getTime();
  if (range === 'week') { d.setDate(d.getDate() - 7); return d.getTime(); }
  if (range === 'month') { d.setMonth(d.getMonth() - 1); return d.getTime(); }
  return 0;
}

// Convert a (qty, unit) into a base unit cost using the bank price.
// bank.unitPrice is per bank.unit. Convert qty into bank.unit, then multiply.
function computeWasteCost(qty: number, unit: string, bankUnit: string, unitPrice: number): number {
  if (!unitPrice || !qty) return 0;
  const u = (unit || '').toLowerCase();
  const bu = (bankUnit || '').toLowerCase();
  if (u === bu) return qty * unitPrice;
  // mass conversions
  if (u === 'kg' && bu === 'g') return qty * 1000 * unitPrice;
  if (u === 'g' && bu === 'kg') return (qty / 1000) * unitPrice;
  // volume conversions
  if (u === 'l' && bu === 'ml') return qty * 1000 * unitPrice;
  if (u === 'ml' && bu === 'l') return (qty / 1000) * unitPrice;
  // can't convert (e.g. ea ↔ kg) — fall back to qty × unitPrice and let the user override
  return qty * unitPrice;
}

export default function WasteView() {
  const { state, actions } = useApp();
  const { settings } = useSettings();
  const C = settings.resolved === 'light' ? light : dark;
  const sym = (state.profile || {}).currencySymbol || '£';
  const log = state.wasteLog || [];
  const bank = state.ingredientsBank || [];

  const [showAdd, setShowAdd] = useState(false);
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [rangeFilter, setRangeFilter] = useState<DateRange>('all');
  const [search, setSearch] = useState('');
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  // Add form state
  const [pickedBank, setPickedBank] = useState<any>(null);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('kg');
  const [reason, setReason] = useState(REASONS[0]);
  const [notes, setNotes] = useState('');
  const [overridePrice, setOverridePrice] = useState('');

  function resetForm() {
    setShowAdd(false);
    setPickedBank(null); setName(''); setQty(''); setUnit('kg');
    setReason(REASONS[0]); setNotes(''); setOverridePrice('');
  }

  function pickBank(b: any) {
    setPickedBank(b);
    setName(b.name);
    setUnit(b.unit || 'kg');
    setOverridePrice('');
  }

  const computedCost = useMemo(() => {
    const q = parseFloat(qty) || 0;
    const ovr = parseFloat(overridePrice);
    if (!isNaN(ovr) && ovr > 0) return q * ovr;
    if (pickedBank) {
      return computeWasteCost(q, unit, pickedBank.unit, parseFloat(pickedBank.unitPrice) || 0);
    }
    return 0;
  }, [qty, unit, pickedBank, overridePrice]);

  function logWaste() {
    if (!name.trim() || !qty) return;
    actions.addWaste({
      ingredientName: name.trim(),
      qty: parseFloat(qty) || 0,
      unit,
      unitPrice: pickedBank ? parseFloat(pickedBank.unitPrice) || 0 : (parseFloat(overridePrice) || 0),
      bankUnit: pickedBank?.unit || unit,
      totalCost: Number(computedCost.toFixed(3)),
      reason,
      notes: notes.trim(),
      category: pickedBank?.category || 'Other',
      supplier: pickedBank?.supplier || null,
    });
    resetForm();
  }

  // ---------- filtering + stats ----------
  const filtered = useMemo(() => {
    const after = startOf(rangeFilter);
    const q = search.trim().toLowerCase();
    return log
      .filter((w: any) => (rangeFilter === 'all' || (w.createdAt || 0) >= after))
      .filter((w: any) => (reasonFilter === 'all' || w.reason === reasonFilter))
      .filter((w: any) => !q || (w.ingredientName || '').toLowerCase().includes(q));
  }, [log, rangeFilter, reasonFilter, search]);

  const stats = useMemo(() => {
    const sum = (arr: any[]) => arr.reduce((a, w) => a + (parseFloat(w.totalCost) || 0), 0);
    const allTime = sum(log);
    const week = sum(log.filter((w: any) => (w.createdAt || 0) >= startOf('week')));
    const month = sum(log.filter((w: any) => (w.createdAt || 0) >= startOf('month')));
    // Top wasted ingredient by £
    const byIng: Record<string, number> = {};
    for (const w of log) {
      const k = (w.ingredientName || '').toLowerCase();
      byIng[k] = (byIng[k] || 0) + (parseFloat(w.totalCost) || 0);
    }
    const topEntry = Object.entries(byIng).sort((a, b) => b[1] - a[1])[0];
    const top = topEntry ? { name: topEntry[0], cost: topEntry[1] } : null;
    // By reason for current filter window
    const byReason: Record<string, number> = {};
    for (const w of filtered) {
      byReason[w.reason || 'Other'] = (byReason[w.reason || 'Other'] || 0) + (parseFloat(w.totalCost) || 0);
    }
    return { allTime, week, month, top, byReason };
  }, [log, filtered]);

  // Bank autocomplete for add form
  const bankSuggestions = useMemo(() => {
    if (!name || pickedBank) return [];
    const q = name.toLowerCase();
    return bank.filter((b: any) => b.name.toLowerCase().includes(q) && b.name.toLowerCase() !== q).slice(0, 5);
  }, [name, pickedBank, bank]);

  function exportCSV() {
    const rows = [
      ['date', 'ingredient', 'qty', 'unit', 'reason', 'category', 'unit_cost', 'total_cost', 'notes'],
      ...filtered.map((w: any) => [
        new Date(w.createdAt).toISOString(),
        w.ingredientName,
        w.qty, w.unit, w.reason, w.category || '',
        w.unitPrice, w.totalCost, w.notes || '',
      ]),
    ];
    const csv = rows.map(r => r.map(c => {
      const s = String(c ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `palatable-waste-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const inp: any = { width: '100%', background: C.surface2, border: '1px solid ' + C.border, color: C.text, fontSize: '13px', padding: '9px 12px', outline: 'none', boxSizing: 'border-box', borderRadius: '3px' };
  const lbl: any = { fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' };

  return (
    <div style={{ padding: '32px', fontFamily: 'system-ui,sans-serif', color: C.text, background: C.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '28px', color: C.text, marginBottom: '4px' }}>Waste</h1>
          <p style={{ fontSize: '12px', color: C.faint }}>{log.length} entr{log.length === 1 ? 'y' : 'ies'} · {sym}{stats.allTime.toFixed(2)} all-time</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={exportCSV} disabled={filtered.length === 0} title="Export filtered list to CSV"
            style={{ fontSize: '11px', fontWeight: 600, color: C.dim, background: C.surface, border: '1px solid ' + C.border, padding: '10px 14px', cursor: filtered.length === 0 ? 'default' : 'pointer', borderRadius: '2px', opacity: filtered.length === 0 ? 0.5 : 1 }}>
            CSV
          </button>
          <button onClick={() => setShowAdd(true)}
            style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', background: C.gold, color: C.bg, border: 'none', padding: '10px 18px', cursor: 'pointer', borderRadius: '2px' }}>
            + Log Waste
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <Card C={C} label="Last 7 days" value={`${sym}${stats.week.toFixed(2)}`} accent />
        <Card C={C} label="Last 30 days" value={`${sym}${stats.month.toFixed(2)}`} />
        <Card C={C} label="All time" value={`${sym}${stats.allTime.toFixed(2)}`} />
        <Card C={C} label="Top ingredient" value={stats.top ? `${sym}${stats.top.cost.toFixed(2)}` : '—'} sub={stats.top?.name || 'no entries'} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ingredient…" style={{ ...inp, width: '240px' }} />
        <select value={rangeFilter} onChange={e => setRangeFilter(e.target.value as DateRange)} style={{ ...inp, width: 'auto', cursor: 'pointer' }}>
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="week">Last 7 days</option>
          <option value="month">Last 30 days</option>
        </select>
        <select value={reasonFilter} onChange={e => setReasonFilter(e.target.value)} style={{ ...inp, width: 'auto', cursor: 'pointer' }}>
          <option value="all">All reasons</option>
          {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: C.faint }}>
          {filtered.length} shown · {sym}{filtered.reduce((a: number, w: any) => a + (parseFloat(w.totalCost) || 0), 0).toFixed(2)} total
        </span>
      </div>

      {/* By-reason breakdown when filtered */}
      {Object.keys(stats.byReason).length > 0 && (
        <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '4px', padding: '14px 18px', marginBottom: '16px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.faint, marginBottom: '10px' }}>Cost by reason</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {Object.entries(stats.byReason).sort((a, b) => b[1] - a[1]).map(([r, cost]) => (
              <span key={r} style={{ fontSize: '12px', color: C.dim, background: C.surface2, border: '0.5px solid ' + C.border, padding: '4px 10px', borderRadius: '2px' }}>
                {r}: <strong style={{ color: C.gold }}>{sym}{cost.toFixed(2)}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Log table */}
      {filtered.length === 0 ? (
        <div style={{ background: C.surface, border: '1px dashed ' + C.border, borderRadius: '4px', padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: C.faint, marginBottom: '8px' }}>{log.length === 0 ? 'No waste logged yet' : 'No entries match the filter'}</p>
          {log.length === 0 && (
            <button onClick={() => setShowAdd(true)} style={{ fontSize: '12px', fontWeight: 700, color: C.gold, background: 'transparent', border: '1px solid ' + C.gold + '40', padding: '8px 16px', cursor: 'pointer', borderRadius: '2px' }}>
              Log your first entry
            </button>
          )}
        </div>
      ) : (
        <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 2fr 1fr 1.5fr 1fr 32px', gap: '8px', padding: '10px 14px', background: C.surface2, fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: C.faint }}>
            <span>Date</span>
            <span>Ingredient</span>
            <span>Qty</span>
            <span>Reason</span>
            <span style={{ textAlign: 'right' }}>Cost</span>
            <span></span>
          </div>
          {filtered.map((w: any) => {
            const isConfirm = confirmDel === w.id;
            return (
              <div key={w.id} style={{ display: 'grid', gridTemplateColumns: '90px 2fr 1fr 1.5fr 1fr 32px', gap: '8px', padding: '10px 14px', borderTop: '1px solid ' + C.border, alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: C.faint }}>{new Date(w.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '13px', color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.ingredientName}</p>
                  {w.notes && <p style={{ fontSize: '10px', color: C.faint, fontStyle: 'italic', marginTop: '2px' }}>{w.notes}</p>}
                </div>
                <span style={{ fontSize: '13px', color: C.dim }}>{w.qty}{w.unit}</span>
                <span style={{ fontSize: '12px', color: C.dim }}>{w.reason}</span>
                <span style={{ fontSize: '13px', color: C.gold, fontWeight: 600, textAlign: 'right' }}>{sym}{(parseFloat(w.totalCost) || 0).toFixed(2)}</span>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  {isConfirm ? (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => { actions.delWaste(w.id); setConfirmDel(null); }}
                        title="Confirm delete"
                        style={{ background: C.red, color: '#fff', border: 'none', cursor: 'pointer', fontSize: '11px', padding: '2px 8px', borderRadius: '2px' }}>✓</button>
                      <button onClick={() => setConfirmDel(null)} title="Cancel"
                        style={{ background: 'transparent', color: C.faint, border: '1px solid ' + C.border, cursor: 'pointer', fontSize: '11px', padding: '2px 8px', borderRadius: '2px' }}>×</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDel(w.id)} title="Delete entry"
                      style={{ color: C.faint, background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}>×</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ background: C.surface, border: '1px solid ' + C.border, width: '100%', maxWidth: '480px', maxHeight: '92vh', overflow: 'auto', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid ' + C.border }}>
              <h3 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '20px' }}>Log waste</h3>
              <button onClick={resetForm} style={{ background: 'none', border: 'none', color: C.faint, fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ position: 'relative' }}>
                <label style={lbl}>Ingredient</label>
                <input autoFocus value={name}
                  onChange={e => { setName(e.target.value); setPickedBank(null); }}
                  placeholder="Search bank or type a name…" style={inp} />
                {bankSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: C.surface, border: '1px solid ' + C.gold + '60', borderTop: 'none', zIndex: 5, maxHeight: '200px', overflow: 'auto' }}>
                    {bankSuggestions.map((b: any) => (
                      <button key={b.id} onMouseDown={e => { e.preventDefault(); pickBank(b); }}
                        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'none', border: 'none', borderBottom: '1px solid ' + C.border, cursor: 'pointer', textAlign: 'left' }}>
                        <span style={{ fontSize: '13px', color: C.text }}>{b.name}</span>
                        <span style={{ fontSize: '12px', color: C.gold, fontWeight: 600 }}>{sym}{(parseFloat(b.unitPrice) || 0).toFixed(2)}/{b.unit}</span>
                      </button>
                    ))}
                  </div>
                )}
                {pickedBank && (
                  <p style={{ fontSize: '11px', color: C.greenLight, marginTop: '4px' }}>
                    ✓ From bank · {sym}{(parseFloat(pickedBank.unitPrice) || 0).toFixed(2)}/{pickedBank.unit}
                  </p>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={lbl}>Quantity wasted</label>
                  <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Unit</label>
                  <select value={unit} onChange={e => setUnit(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>Reason</label>
                <select value={reason} onChange={e => setReason(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                  {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {!pickedBank && (
                <div>
                  <label style={lbl}>Unit cost ({sym}/{unit}) <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>— not in bank, enter manually</span></label>
                  <input type="number" step="0.01" value={overridePrice} onChange={e => setOverridePrice(e.target.value)} placeholder="0.00" style={inp} />
                </div>
              )}
              <div>
                <label style={lbl}>Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="What happened?" rows={2} style={{ ...inp, resize: 'none' }} />
              </div>
              <div style={{ background: C.surface2, border: '1px solid ' + C.border, padding: '10px 14px', borderRadius: '3px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: C.faint, letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 700 }}>Cost impact</span>
                <span style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '24px', color: C.gold }}>{sym}{computedCost.toFixed(2)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', padding: '16px 20px', borderTop: '1px solid ' + C.border }}>
              <button onClick={resetForm} style={{ flex: 1, fontSize: '12px', color: C.dim, background: C.surface2, border: '1px solid ' + C.border, padding: '10px', cursor: 'pointer', borderRadius: '2px' }}>Cancel</button>
              <button onClick={logWaste} disabled={!name.trim() || !qty || computedCost === 0}
                style={{ flex: 1, fontSize: '12px', fontWeight: 700, background: C.gold, color: C.bg, border: 'none', padding: '10px', cursor: 'pointer', borderRadius: '2px', opacity: (!name.trim() || !qty || computedCost === 0) ? 0.4 : 1 }}>
                Log waste
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ C, label, value, sub, accent }: { C: any; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div style={{ background: C.surface, border: '1px solid ' + C.border, padding: '18px 20px', borderRadius: '4px' }}>
      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.faint, marginBottom: '8px' }}>{label}</p>
      <p style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '28px', color: accent ? C.gold : C.text, lineHeight: 1, marginBottom: sub ? '4px' : 0 }}>{value}</p>
      {sub && <p style={{ fontSize: '11px', color: C.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</p>}
    </div>
  );
}
