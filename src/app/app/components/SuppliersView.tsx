'use client';
import { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useSettings } from '@/context/SettingsContext';
import { dark, light } from '@/lib/theme';
import { useIsMobile } from '@/lib/useIsMobile';
import { buildSupplierReliability, type SupplierReliability } from '@/lib/supplierReliability';
import { useOutlet } from '@/context/OutletContext';
import { scopeByOutlet } from '@/lib/outlets';

// Amber distinct from brand gold (matches the rest of the redesigned views).
const AMBER = '#E8AE20';

// Score → colour ramp. Mirrors the chips used in Invoices' supplier card.
function scoreColour(score: number, C: any): string {
  if (score >= 8.5) return C.greenLight;
  if (score >= 6.5) return C.gold;
  return C.red;
}

// Two-letter initials for the supplier avatar.
function initials(name: string): string {
  const w = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (w.length === 0) return '?';
  if (w.length === 1) return w[0].slice(0, 2).toUpperCase();
  return (w[0][0] + w[w.length - 1][0]).toUpperCase();
}

function normaliseKey(name: string): string {
  return String(name || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

interface SupplierContact {
  name?: string;
  rep?: string;
  phone?: string;
  email?: string;
  deliveryDays?: string;
  notes?: string;
}

// A merged supplier row — combines a reliability entry (if invoice history
// exists) with a contact entry (if the chef has stored rep details). Either
// can be missing.
interface MergedSupplier {
  key: string;
  name: string;
  hasInvoices: boolean;
  rel?: SupplierReliability;
  contact?: SupplierContact;
}

export default function SuppliersView({ setTab }: { setTab?: (t: string) => void }) {
  const { state, actions } = useApp();
  const { settings } = useSettings();
  const C = settings.resolved === 'light' ? light : dark;
  const isMobile = useIsMobile();
  const sym = (state.profile || {}).currencySymbol || '£';
  const { activeOutletId, isMultiOutlet } = useOutlet();
  // Suppliers are derived from invoices (reliability scores, items list,
  // last-seen dates). Scoping invoices here automatically scopes the
  // supplier surface too.
  const invoices = scopeByOutlet(state.invoices || [], activeOutletId, isMultiOutlet);
  const profile = state.profile || {};
  const supplierContacts = ((profile as any).supplierContacts || {}) as Record<string, SupplierContact>;

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'worst' | 'az'>('worst');
  const [showAdd, setShowAdd] = useState(false);

  // Contact edit buffer (mirrors the selected supplier — re-seeded when it
  // changes so we can save-on-blur without thrashing the profile autosave).
  const [contactRep, setContactRep] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactDeliveryDays, setContactDeliveryDays] = useState('');
  const [contactNotes, setContactNotes] = useState('');

  // Add-supplier modal buffer.
  const [addName, setAddName] = useState('');
  const [addRep, setAddRep] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addDeliveryDays, setAddDeliveryDays] = useState('');
  const [addNotes, setAddNotes] = useState('');

  const reliability = useMemo(() => buildSupplierReliability(invoices), [invoices]);
  const reliabilityIdx = useMemo(() => {
    const m = new Map<string, SupplierReliability>();
    for (const r of reliability) m.set(r.nameKey, r);
    return m;
  }, [reliability]);

  // Merged list — every supplier the chef knows about, whether by invoice
  // history, by manually-added contact, or both.
  const merged = useMemo<MergedSupplier[]>(() => {
    const out: MergedSupplier[] = reliability.map(r => ({
      key: r.nameKey,
      name: r.name,
      hasInvoices: true,
      rel: r,
      contact: supplierContacts[r.nameKey],
    }));
    Object.entries(supplierContacts).forEach(([key, c]) => {
      if (reliabilityIdx.has(key)) return;
      out.push({
        key,
        name: c?.name || key,
        hasInvoices: false,
        contact: c,
      });
    });
    return out;
  }, [reliability, reliabilityIdx, supplierContacts]);

  // Filtered + sorted left-panel list.
  const displayed = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = q
      ? merged.filter(s => s.name.toLowerCase().includes(q) || (s.contact?.rep || '').toLowerCase().includes(q))
      : merged;
    if (sort === 'az') {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }
    // 'worst' — worst score first, contacts-only rows (no score) sink to bottom.
    return [...filtered].sort((a, b) => {
      const ah = a.hasInvoices ? 1 : 0;
      const bh = b.hasInvoices ? 1 : 0;
      if (ah !== bh) return bh - ah;
      const as = a.rel?.score ?? 10;
      const bs = b.rel?.score ?? 10;
      return as - bs;
    });
  }, [merged, search, sort]);

  // Auto-select first when nothing is selected (desktop) but only when the
  // list isn't empty. On mobile, leave nothing selected so the list shows.
  useEffect(() => {
    if (isMobile) return;
    if (selectedKey) return;
    if (displayed.length > 0) setSelectedKey(displayed[0].key);
  }, [displayed, selectedKey, isMobile]);

  // Seed the contact edit buffer when the selected supplier changes.
  useEffect(() => {
    if (!selectedKey) return;
    const c = supplierContacts[selectedKey] || {};
    setContactRep(c.rep || '');
    setContactPhone(c.phone || '');
    setContactEmail(c.email || '');
    setContactDeliveryDays(c.deliveryDays || '');
    setContactNotes(c.notes || '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  function saveContact() {
    if (!selectedKey) return;
    const merged = supplierContacts[selectedKey] || {};
    const next: SupplierContact = {
      name: merged.name || displayed.find(s => s.key === selectedKey)?.name || selectedKey,
      rep: contactRep.trim(),
      phone: contactPhone.trim(),
      email: contactEmail.trim(),
      deliveryDays: contactDeliveryDays.trim(),
      notes: contactNotes.trim(),
    };
    // No-op short-circuit if nothing changed (Tab through clean inputs).
    if (
      (next.rep || '') === (merged.rep || '') &&
      (next.phone || '') === (merged.phone || '') &&
      (next.email || '') === (merged.email || '') &&
      (next.deliveryDays || '') === (merged.deliveryDays || '') &&
      (next.notes || '') === (merged.notes || '')
    ) return;
    actions.updProfile({
      supplierContacts: { ...supplierContacts, [selectedKey]: next },
    });
  }

  function addSupplier() {
    const trimmed = addName.trim();
    if (!trimmed) return;
    const key = normaliseKey(trimmed);
    if (supplierContacts[key]) {
      alert(`A supplier called "${trimmed}" already has a contact card.`);
      return;
    }
    actions.updProfile({
      supplierContacts: {
        ...supplierContacts,
        [key]: {
          name: trimmed,
          rep: addRep.trim(),
          phone: addPhone.trim(),
          email: addEmail.trim(),
          deliveryDays: addDeliveryDays.trim(),
          notes: addNotes.trim(),
        },
      },
    });
    setSelectedKey(key);
    setAddName(''); setAddRep(''); setAddPhone(''); setAddEmail(''); setAddDeliveryDays(''); setAddNotes('');
    setShowAdd(false);
  }

  // ── Derived data for the currently-selected supplier ─────────
  const selected = useMemo(() => displayed.find(s => s.key === selectedKey) || null, [displayed, selectedKey]);
  const selectedRel = selected?.rel;
  const selectedContact = supplierContacts[selectedKey || ''] || {};

  // Per-supplier price history — flatten priceChangeDetails across all
  // their invoices, most recent first, top 8.
  const priceHistory = useMemo(() => {
    if (!selectedKey) return [];
    const hits: any[] = [];
    const targetName = (selectedRel?.name || selectedContact.name || selectedKey).toLowerCase().trim();
    for (const inv of invoices) {
      if ((inv?.supplier || '').toLowerCase().trim() !== targetName) continue;
      for (const c of inv?.priceChangeDetails || []) {
        hits.push({ ...c, detectedAt: c.detectedAt || inv.scannedAt });
      }
    }
    hits.sort((a, b) => (b.detectedAt || 0) - (a.detectedAt || 0));
    return hits.slice(0, 8);
  }, [selectedKey, selectedRel, selectedContact, invoices]);

  // Unique ingredient names supplied — for the chip cloud.
  const itemsSupplied = useMemo(() => {
    if (!selectedKey) return [] as string[];
    const targetName = (selectedRel?.name || selectedContact.name || selectedKey).toLowerCase().trim();
    const set = new Set<string>();
    for (const inv of invoices) {
      if ((inv?.supplier || '').toLowerCase().trim() !== targetName) continue;
      for (const it of inv?.items || []) if (it.name) set.add(it.name);
    }
    return Array.from(set).slice(0, 30);
  }, [selectedKey, selectedRel, selectedContact, invoices]);

  // ── Shared styling ───────────────────────────────────────────
  const inp: any = {
    width: '100%',
    background: C.surface,
    border: `1px solid ${C.border}`,
    color: C.text,
    fontSize: '13px',
    padding: '10px 12px',
    outline: 'none',
    fontFamily: 'system-ui,sans-serif',
    boxSizing: 'border-box',
    borderRadius: '6px',
  };
  const card: any = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: '8px' };

  // ── Top bar ──────────────────────────────────────────────────
  const topBar = (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '12px', flexWrap: 'wrap',
      padding: isMobile ? '16px' : '20px 24px',
      borderBottom: `0.5px solid ${C.border}`,
      background: C.bg,
      flexShrink: 0,
    }}>
      <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: isMobile ? '22px' : '26px', color: C.text, lineHeight: 1.1 }}>
        Suppliers
      </h1>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setSort(s => s === 'worst' ? 'az' : 'worst')}
          title={`Sort: ${sort === 'worst' ? 'Worst first' : 'A–Z'} — click to toggle`}
          style={{ fontSize: '11px', color: C.dim, background: C.surface2, border: `1px solid ${C.border}`, padding: '8px 12px', cursor: 'pointer', borderRadius: '6px', minHeight: '36px' }}>
          {sort === 'worst' ? '↓ Worst first' : '↓ A–Z'}
        </button>
        <button onClick={() => setShowAdd(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: C.gold, background: 'transparent', border: `1px solid ${C.gold}60`, padding: '8px 14px', cursor: 'pointer', borderRadius: '6px', minHeight: '36px' }}>
          + Add supplier
        </button>
      </div>
    </div>
  );

  // ── Left panel ───────────────────────────────────────────────
  const leftPanel = (
    <div style={{
      width: isMobile ? '100%' : '240px',
      minWidth: isMobile ? 0 : '240px',
      background: C.surface2,
      borderRight: isMobile ? 'none' : `0.5px solid ${C.border}`,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 12px 8px', borderBottom: `0.5px solid ${C.border}` }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search suppliers…"
          style={{ ...inp, background: C.surface, padding: '9px 12px', fontSize: '12px', minHeight: '36px' }}/>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 6px 12px' }}>
        {displayed.length === 0 ? (
          <p style={{ fontSize: '12px', color: C.faint, padding: '20px 12px', textAlign: 'center' }}>
            {search ? 'No matches.' : 'No suppliers yet — scan an invoice or add one manually.'}
          </p>
        ) : displayed.map(s => {
          const active = s.key === selectedKey;
          const score = s.rel?.score;
          const colour = score != null ? scoreColour(score, C) : C.faint;
          const lastInvoice = s.rel?.lastInvoiceTs
            ? new Date(s.rel.lastInvoiceTs).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
            : 'No invoices yet';
          return (
            <button key={s.key} onClick={() => setSelectedKey(s.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                width: '100%', padding: '10px 10px',
                background: active ? `${C.gold}14` : 'transparent',
                borderLeft: active ? `2px solid ${C.gold}` : '2px solid transparent',
                border: 'none', borderRadius: '4px',
                marginBottom: '2px', cursor: 'pointer', textAlign: 'left',
              }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: `${colour}22`, color: colour,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, fontFamily: 'Georgia,serif',
                flexShrink: 0,
              }}>{initials(s.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '12px', color: active ? C.text : C.dim, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</p>
                <p style={{ fontSize: '10px', color: C.faint, marginTop: '1px' }}>{lastInvoice}</p>
              </div>
              {score != null && (
                <span style={{ fontSize: '10px', fontWeight: 700, color: colour, background: `${colour}14`, border: `0.5px solid ${colour}40`, padding: '2px 6px', borderRadius: '3px', flexShrink: 0 }}>
                  {score.toFixed(1)}
                </span>
              )}
            </button>
          );
        })}
        <button onClick={() => setShowAdd(true)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            width: 'calc(100% - 4px)', margin: '8px 2px 0',
            padding: '10px', fontSize: '12px', color: C.faint,
            background: 'transparent', border: `1px dashed ${C.border}`,
            borderRadius: '4px', cursor: 'pointer',
          }}>
          + Add supplier
        </button>
      </div>
    </div>
  );

  // ── Right panel — empty state ────────────────────────────────
  const emptyRight = (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: '48px', color: C.faint, marginBottom: '14px' }}>⌐□</div>
        <p style={{ fontSize: '14px', color: C.dim }}>Select a supplier to view details</p>
      </div>
    </div>
  );

  // ── Right panel — supplier detail ────────────────────────────
  function renderRightDetail() {
    if (!selected) return emptyRight;
    const score = selectedRel?.score;
    const accuracyPct = selectedRel && selectedRel.totalInvoices > 0
      ? (selectedRel.confirmedCount / selectedRel.totalInvoices) * 100
      : null;
    const accuracyColour = accuracyPct == null ? C.faint : accuracyPct >= 100 ? C.greenLight : accuracyPct >= 75 ? AMBER : C.red;

    return (
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: isMobile ? '16px' : '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Mobile back button */}
          {isMobile && (
            <button onClick={() => setSelectedKey(null)}
              style={{ fontSize: '12px', color: C.gold, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, marginBottom: '4px' }}>
              ← Back to list
            </button>
          )}

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: `${score != null ? scoreColour(score, C) : C.gold}22`,
              color: score != null ? scoreColour(score, C) : C.gold,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '15px', fontWeight: 700, fontFamily: 'Georgia,serif',
              flexShrink: 0,
            }}>{initials(selected.name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '20px', color: C.text, lineHeight: 1.2, marginBottom: '4px' }}>
                {selected.name}
              </h2>
              <p style={{ fontSize: '12px', color: C.faint }}>
                {selectedRel ? `${selectedRel.totalInvoices} invoice${selectedRel.totalInvoices === 1 ? '' : 's'}` : 'No invoices yet'}
                {selectedContact.rep ? ` · Rep: ${selectedContact.rep}` : ''}
                {selectedRel?.lastInvoiceTs ? ` · Last: ${new Date(selectedRel.lastInvoiceTs).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {selectedContact.phone ? (
                <a href={`tel:${selectedContact.phone.replace(/\s+/g, '')}`} title={`Call ${selectedContact.rep || 'rep'}`}
                  style={{ width: '36px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `${C.gold}14`, color: C.gold, border: `1px solid ${C.gold}40`, borderRadius: '6px', textDecoration: 'none', fontSize: '15px' }}>📞</a>
              ) : (
                <span title="No phone stored" style={{ width: '36px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: C.faint, border: `1px solid ${C.border}`, borderRadius: '6px', fontSize: '15px', opacity: 0.5, cursor: 'not-allowed' }}>📞</span>
              )}
              {selectedContact.email ? (
                <a href={`mailto:${selectedContact.email}`} title={`Email ${selectedContact.rep || 'supplier'}`}
                  style={{ width: '36px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `${C.gold}14`, color: C.gold, border: `1px solid ${C.gold}40`, borderRadius: '6px', textDecoration: 'none', fontSize: '15px' }}>✉</a>
              ) : (
                <span title="No email stored" style={{ width: '36px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: C.faint, border: `1px solid ${C.border}`, borderRadius: '6px', fontSize: '15px', opacity: 0.5, cursor: 'not-allowed' }}>✉</span>
              )}
              <button disabled title="Coming in Phase 3 — Supplier ordering"
                style={{ fontSize: '12px', fontWeight: 700, color: C.bg, background: `${C.gold}80`, border: 'none', padding: '0 14px', cursor: 'not-allowed', borderRadius: '6px', minHeight: '36px', opacity: 0.6 }}>
                Raise PO
              </button>
            </div>
          </div>

          {/* 4 stat tiles */}
          {selectedRel ? (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '10px' }}>
              {[
                { l: 'Score last 45d', v: `${selectedRel.scoreRecent.toFixed(1)}/10`, c: scoreColour(selectedRel.scoreRecent, C) },
                { l: 'Score prior 45d', v: `${selectedRel.scorePrior.toFixed(1)}/10`, c: scoreColour(selectedRel.scorePrior, C) },
                { l: 'Total discrepancy', v: `${sym}${selectedRel.totalDiscrepancyValue.toFixed(2)}`, c: selectedRel.totalDiscrepancyValue > 0 ? C.red : C.dim },
                { l: 'Delivery accuracy', v: accuracyPct != null ? `${accuracyPct.toFixed(0)}%` : '—', c: accuracyColour },
              ].map(t => (
                <div key={t.l} style={{ ...card, padding: '14px 16px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.faint, marginBottom: '6px' }}>{t.l}</p>
                  <p style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '22px', color: t.c, lineHeight: 1.1 }}>{t.v}</p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ ...card, padding: '14px 16px', borderStyle: 'dashed' }}>
              <p style={{ fontSize: '12px', color: C.faint }}>No invoice history yet. Once you scan invoices from this supplier, reliability scores and trend will appear here.</p>
            </div>
          )}

          {/* Most common issue */}
          {selectedRel?.topIssue && (
            <div style={{ ...card, background: `${C.gold}10`, borderColor: `${C.gold}40`, padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '18px', color: C.gold }}>⚠</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.gold, marginBottom: '2px' }}>Most common issue</p>
                <p style={{ fontSize: '13px', color: C.text }}>
                  <strong>{selectedRel.topIssue.name}</strong> — flagged {selectedRel.topIssue.count}× across {selectedRel.flaggedCount} flagged deliver{selectedRel.flaggedCount === 1 ? 'y' : 'ies'}
                </p>
              </div>
            </div>
          )}

          {/* Two-column grid: price history + contact */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
            {/* Price change history */}
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint }}>Price change history</p>
              </div>
              {priceHistory.length === 0 ? (
                <p style={{ fontSize: '12px', color: C.faint, padding: '14px', fontStyle: 'italic' }}>No price changes recorded.</p>
              ) : (
                <div>
                  {priceHistory.map((c: any, i: number) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px', padding: '9px 14px', borderTop: i === 0 ? 'none' : `1px solid ${C.border}` }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '12px', color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</p>
                        <p style={{ fontSize: '10px', color: C.faint }}>{c.detectedAt ? new Date(c.detectedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '12px', color: C.dim }}>
                          {sym}{(c.oldPrice || 0).toFixed(2)} <span style={{ color: C.faint }}>→</span> {sym}{(c.newPrice || 0).toFixed(2)}
                        </p>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: c.change > 0 ? C.red : C.greenLight }}>
                          {c.change > 0 ? '+' : ''}{(c.pct || 0).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contact details — inline editable */}
            <div style={{ ...card, padding: '12px 14px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, marginBottom: '10px' }}>Contact details</p>
              {!contactRep && !contactPhone && !contactEmail && !contactDeliveryDays && !contactNotes && (
                <p style={{ fontSize: '11px', color: C.faint, fontStyle: 'italic', marginBottom: '10px' }}>Add contact details to enable quick call / email / PO actions.</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: C.faint, letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Rep name</label>
                  <input value={contactRep} onChange={e => setContactRep(e.target.value)} onBlur={saveContact}
                    placeholder="e.g. Sarah Wilkins" style={{ ...inp, fontSize: '12px', padding: '8px 10px', minHeight: '36px' }}/>
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: C.faint, letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Phone</label>
                  <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} onBlur={saveContact}
                    placeholder="020 7946 0123" style={{ ...inp, fontSize: '12px', padding: '8px 10px', minHeight: '36px' }}/>
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: C.faint, letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Email</label>
                  <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} onBlur={saveContact}
                    placeholder="orders@supplier.co.uk" style={{ ...inp, fontSize: '12px', padding: '8px 10px', minHeight: '36px' }}/>
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: C.faint, letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Delivery days</label>
                  <input value={contactDeliveryDays} onChange={e => setContactDeliveryDays(e.target.value)} onBlur={saveContact}
                    placeholder="Tue / Thu / Fri" style={{ ...inp, fontSize: '12px', padding: '8px 10px', minHeight: '36px' }}/>
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: C.faint, letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Notes</label>
                  <textarea value={contactNotes} onChange={e => setContactNotes(e.target.value)} onBlur={saveContact}
                    placeholder="Cut-off times, account number…" rows={2}
                    style={{ ...inp, fontSize: '12px', padding: '8px 10px', resize: 'vertical', fontFamily: 'inherit' }}/>
                </div>
              </div>
              <p style={{ fontSize: '10px', color: C.faint, fontStyle: 'italic', marginTop: '8px' }}>Auto-saves when you tab out.</p>
            </div>
          </div>

          {/* Items supplied chip cloud */}
          {itemsSupplied.length > 0 && (
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, marginBottom: '8px' }}>
                Items supplied ({itemsSupplied.length})
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {itemsSupplied.map(n => (
                  <span key={n} style={{ fontSize: '11px', color: C.dim, background: C.surface, border: `1px solid ${C.border}`, padding: '4px 10px', borderRadius: '12px' }}>{n}</span>
                ))}
              </div>
            </div>
          )}

          {/* Bottom action row */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '8px', borderTop: `1px solid ${C.border}` }}>
            <button disabled title="Coming in Phase 3 — Supplier ordering"
              style={{ fontSize: '12px', fontWeight: 700, color: C.bg, background: `${C.gold}80`, border: 'none', padding: '9px 14px', cursor: 'not-allowed', borderRadius: '6px', opacity: 0.6 }}>
              Raise PO
            </button>
            <button onClick={() => { if (setTab) setTab('invoices'); }}
              style={{ fontSize: '12px', color: C.dim, background: 'transparent', border: `1px solid ${C.border}`, padding: '9px 14px', cursor: 'pointer', borderRadius: '6px' }}>
              View invoice history
            </button>
            <button onClick={() => { if (setTab) setTab('invoices'); }}
              style={{ fontSize: '12px', color: C.dim, background: 'transparent', border: `1px solid ${C.border}`, padding: '9px 14px', cursor: 'pointer', borderRadius: '6px' }}>
              Full history
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Add-supplier modal ───────────────────────────────────────
  const addModal = !showAdd ? null : (
    <div onClick={() => setShowAdd(false)}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ ...card, width: '100%', maxWidth: '440px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: `1px solid ${C.border}` }}>
          <h3 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '20px', color: C.text }}>Add supplier</h3>
          <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: C.faint, fontSize: '22px', cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' }}>Supplier name <span style={{ color: C.red }}>*</span></label>
            <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="e.g. Brakes" style={inp}/>
          </div>
          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' }}>Rep name</label>
            <input value={addRep} onChange={e => setAddRep(e.target.value)} placeholder="e.g. Sarah Wilkins" style={inp}/>
          </div>
          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' }}>Phone</label>
            <input type="tel" value={addPhone} onChange={e => setAddPhone(e.target.value)} placeholder="020 7946 0123" style={inp}/>
          </div>
          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' }}>Email</label>
            <input type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="orders@supplier.co.uk" style={inp}/>
          </div>
          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' }}>Delivery days</label>
            <input value={addDeliveryDays} onChange={e => setAddDeliveryDays(e.target.value)} placeholder="Tue / Thu / Fri" style={inp}/>
          </div>
          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' }}>Notes</label>
            <textarea value={addNotes} onChange={e => setAddNotes(e.target.value)} placeholder="Cut-off times, account number…" rows={2}
              style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }}/>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', padding: '14px 20px', borderTop: `1px solid ${C.border}` }}>
          <button onClick={() => setShowAdd(false)} style={{ flex: 1, fontSize: '13px', color: C.dim, background: C.surface2, border: `1px solid ${C.border}`, padding: '11px', cursor: 'pointer', borderRadius: '6px' }}>Cancel</button>
          <button onClick={addSupplier} disabled={!addName.trim()}
            style={{ flex: 1, fontSize: '13px', fontWeight: 700, background: C.gold, color: C.bg, border: 'none', padding: '11px', cursor: !addName.trim() ? 'not-allowed' : 'pointer', borderRadius: '6px', opacity: !addName.trim() ? 0.4 : 1 }}>
            Add supplier
          </button>
        </div>
      </div>
    </div>
  );

  // ── Root render ──────────────────────────────────────────────
  // Mobile: single-pane master/detail. When a supplier is selected, hide the
  // list and show only the detail (with a Back button at the top). Desktop:
  // both panels side-by-side.
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', overflow: 'hidden',
      background: C.bg, color: C.text,
      fontFamily: '-apple-system,system-ui,sans-serif',
    }}>
      {topBar}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {(!isMobile || !selectedKey) && leftPanel}
        {!isMobile && renderRightDetail()}
        {isMobile && selectedKey && (
          <div style={{ flex: 1, overflow: 'hidden' }}>{renderRightDetail()}</div>
        )}
      </div>
      {addModal}
    </div>
  );
}
