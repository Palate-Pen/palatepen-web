'use client';
import { useState } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { dark, light } from '@/lib/theme';
import { updateOutlet, deleteOutlet } from '@/lib/outlets';
import type { Outlet, OutletType } from '@/types/outlets';

const OUTLET_TYPES: { value: OutletType; label: string }[] = [
  { value: 'restaurant',       label: 'Restaurant' },
  { value: 'pub',              label: 'Pub' },
  { value: 'cafe',             label: 'Café' },
  { value: 'bar',              label: 'Bar' },
  { value: 'hotel',            label: 'Hotel' },
  { value: 'central_kitchen',  label: 'Central kitchen' },
  { value: 'other',            label: 'Other' },
];

export default function EditOutletModal({ outlet, onClose, onSaved }: { outlet: Outlet; onClose: () => void; onSaved: () => void }) {
  const { settings } = useSettings();
  const C = settings.resolved === 'light' ? light : dark;

  const [name, setName] = useState(outlet.name);
  const [type, setType] = useState<OutletType>(outlet.type);
  const [address, setAddress] = useState(outlet.address || '');
  const [isCentralKitchen, setIsCentralKitchen] = useState(outlet.is_central_kitchen);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete confirmation requires typing the outlet name. Prevents the
  // "click ✕ then click Delete" double-tap mistake from binning an outlet.
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  async function save() {
    if (!name.trim()) { setError('Outlet name is required.'); return; }
    setSaving(true);
    setError(null);
    const { error: updErr } = await updateOutlet(outlet.id, {
      name: name.trim(),
      type,
      address: address.trim() || undefined,
      is_central_kitchen: isCentralKitchen,
    });
    setSaving(false);
    if (updErr) { setError(updErr); return; }
    onSaved();
    onClose();
  }

  async function confirmDelete() {
    if (deleteConfirm !== outlet.name) {
      setError('Type the outlet name exactly to confirm.');
      return;
    }
    setDeleting(true);
    setError(null);
    const { error: delErr } = await deleteOutlet(outlet.id);
    setDeleting(false);
    if (delErr) { setError(delErr); return; }
    onSaved();
    onClose();
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '6px', padding: '28px', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <h2 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '22px', color: C.text, marginBottom: '4px' }}>Edit outlet</h2>
        <p style={{ fontSize: '12px', color: C.faint, marginBottom: '18px' }}>Changes apply immediately. Memberships scoped to this outlet stay attached.</p>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' }}>Outlet name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            style={{ width: '100%', background: C.surface2, border: '1px solid ' + C.border, color: C.text, fontSize: '14px', padding: '10px 12px', outline: 'none', boxSizing: 'border-box', borderRadius: '3px' }} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' }}>Type</label>
          <select value={type} onChange={e => setType(e.target.value as OutletType)}
            style={{ width: '100%', background: C.surface2, border: '1px solid ' + C.border, color: C.text, fontSize: '14px', padding: '10px 12px', outline: 'none', boxSizing: 'border-box', borderRadius: '3px', cursor: 'pointer' }}>
            {OUTLET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' }}>Address <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: C.faint }}>(optional)</span></label>
          <input type="text" value={address} onChange={e => setAddress(e.target.value)}
            style={{ width: '100%', background: C.surface2, border: '1px solid ' + C.border, color: C.text, fontSize: '14px', padding: '10px 12px', outline: 'none', boxSizing: 'border-box', borderRadius: '3px' }} />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: C.dim, marginBottom: '18px', cursor: 'pointer' }}>
          <input type="checkbox" checked={isCentralKitchen} onChange={e => setIsCentralKitchen(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: C.gold, cursor: 'pointer' }} />
          This is a central kitchen supplying other outlets
        </label>

        {error && (
          <div role="alert" style={{ background: 'rgba(200,64,64,0.08)', border: '1px solid rgba(200,64,64,0.3)', color: '#C84040', padding: '10px 12px', borderRadius: '4px', fontSize: '13px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <button onClick={onClose} disabled={saving || deleting}
            style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', background: 'transparent', border: '0.5px solid ' + C.border, color: C.dim, padding: '10px 18px', cursor: saving || deleting ? 'wait' : 'pointer', borderRadius: '2px' }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving || deleting || !name.trim()}
            style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', background: C.gold, color: C.bg, border: 'none', padding: '10px 18px', cursor: saving || !name.trim() ? 'default' : 'pointer', borderRadius: '2px', opacity: saving || !name.trim() ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        {/* Danger zone */}
        <div style={{ borderTop: '1px solid ' + C.border, paddingTop: '16px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#C84040', marginBottom: '8px' }}>Danger zone</p>
          {!showDelete ? (
            <button onClick={() => setShowDelete(true)} disabled={saving || deleting}
              style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', background: 'transparent', border: '1px solid rgba(200,64,64,0.4)', color: '#C84040', padding: '8px 14px', cursor: 'pointer', borderRadius: '2px' }}>
              Delete outlet
            </button>
          ) : (
            <div style={{ background: 'rgba(200,64,64,0.06)', border: '1px solid rgba(200,64,64,0.3)', borderRadius: '3px', padding: '12px' }}>
              <p style={{ fontSize: '12px', color: C.dim, marginBottom: '10px', lineHeight: 1.5 }}>
                Type <strong style={{ color: '#C84040' }}>{outlet.name}</strong> to confirm deletion. Memberships scoped to this outlet become account-wide; purchase orders lose their outlet link.
              </p>
              <input type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                placeholder={outlet.name}
                style={{ width: '100%', background: C.surface2, border: '1px solid ' + C.border, color: C.text, fontSize: '13px', padding: '8px 10px', outline: 'none', boxSizing: 'border-box', borderRadius: '2px', marginBottom: '10px' }} />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => { setShowDelete(false); setDeleteConfirm(''); setError(null); }} disabled={deleting}
                  style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', background: 'transparent', border: '0.5px solid ' + C.border, color: C.dim, padding: '8px 14px', cursor: 'pointer', borderRadius: '2px' }}>
                  Cancel
                </button>
                <button onClick={confirmDelete} disabled={deleting || deleteConfirm !== outlet.name}
                  style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', background: '#C84040', color: '#fff', border: 'none', padding: '8px 14px', cursor: deleting || deleteConfirm !== outlet.name ? 'default' : 'pointer', borderRadius: '2px', opacity: deleting || deleteConfirm !== outlet.name ? 0.6 : 1 }}>
                  {deleting ? 'Deleting…' : 'Delete permanently'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
