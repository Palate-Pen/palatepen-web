'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { dark, light } from '@/lib/theme';
import { createOutlet } from '@/lib/outlets';
import type { OutletType } from '@/types/outlets';

const OUTLET_TYPES: { value: OutletType; label: string }[] = [
  { value: 'restaurant',       label: 'Restaurant' },
  { value: 'pub',              label: 'Pub' },
  { value: 'cafe',             label: 'Café' },
  { value: 'bar',              label: 'Bar' },
  { value: 'hotel',            label: 'Hotel' },
  { value: 'central_kitchen',  label: 'Central kitchen' },
  { value: 'other',            label: 'Other' },
];

export default function AddOutletModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { settings } = useSettings();
  const { tier, currentAccount } = useAuth();
  const C = settings.resolved === 'light' ? light : dark;

  const [name, setName] = useState('');
  const [type, setType] = useState<OutletType>('restaurant');
  const [address, setAddress] = useState('');
  const [isCentralKitchen, setIsCentralKitchen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!currentAccount) { setError('No active account.'); return; }
    if (!name.trim()) { setError('Outlet name is required.'); return; }

    setSaving(true);
    setError(null);
    const { outlet, error: createErr } = await createOutlet(currentAccount.id, tier, {
      name: name.trim(),
      type,
      address: address.trim() || undefined,
      is_central_kitchen: isCentralKitchen || type === 'central_kitchen',
    });
    setSaving(false);

    if (createErr || !outlet) {
      setError(createErr || 'Failed to create outlet. Please try again.');
      return;
    }
    onCreated();
    onClose();
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: '6px', padding: '28px', maxWidth: '480px', width: '100%' }}>
        <h2 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '22px', color: C.text, marginBottom: '4px' }}>Add outlet</h2>
        <p style={{ fontSize: '12px', color: C.faint, marginBottom: '18px' }}>Each outlet has its own stock, invoices and waste log. Recipes and costings stay shared across the account.</p>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' }}>Outlet name</label>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. The Larder — Soho"
            style={{ width: '100%', background: C.surface2, border: '1px solid ' + C.border, color: C.text, fontSize: '14px', padding: '10px 12px', outline: 'none', boxSizing: 'border-box', borderRadius: '3px' }}
          />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' }}>Type</label>
          <select
            value={type}
            onChange={e => setType(e.target.value as OutletType)}
            style={{ width: '100%', background: C.surface2, border: '1px solid ' + C.border, color: C.text, fontSize: '14px', padding: '10px 12px', outline: 'none', boxSizing: 'border-box', borderRadius: '3px', cursor: 'pointer' }}
          >
            {OUTLET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' }}>Address <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: C.faint }}>(optional)</span></label>
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="e.g. 12 Dean Street, London W1D 3RW"
            style={{ width: '100%', background: C.surface2, border: '1px solid ' + C.border, color: C.text, fontSize: '14px', padding: '10px 12px', outline: 'none', boxSizing: 'border-box', borderRadius: '3px' }}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: C.dim, marginBottom: '18px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isCentralKitchen}
            onChange={e => setIsCentralKitchen(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: C.gold, cursor: 'pointer' }}
          />
          This is a central kitchen supplying other outlets
        </label>

        {error && (
          <div role="alert" style={{ background: 'rgba(200,64,64,0.08)', border: '1px solid rgba(200,64,64,0.3)', color: '#C84040', padding: '10px 12px', borderRadius: '4px', fontSize: '13px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={saving}
            style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', background: 'transparent', border: '0.5px solid ' + C.border, color: C.dim, padding: '10px 18px', cursor: saving ? 'wait' : 'pointer', borderRadius: '2px' }}>
            Cancel
          </button>
          <button onClick={submit} disabled={saving || !name.trim()}
            style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', background: C.gold, color: C.bg, border: 'none', padding: '10px 18px', cursor: saving || !name.trim() ? 'default' : 'pointer', borderRadius: '2px', opacity: saving || !name.trim() ? 0.6 : 1 }}>
            {saving ? 'Adding…' : 'Add outlet'}
          </button>
        </div>
      </div>
    </div>
  );
}
