'use client';
import { useState, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { dark, light } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

interface Design {
  logo?: { url: string; path: string } | null;
  accentColor: string;
  headerText: string;
  subtitleText: string;
  footerText: string;
  showPrices: boolean;
  showDescriptions: boolean;
  sectionStyle: 'category' | 'flat';
}

const DEFAULT_DESIGN: Design = {
  logo: null,
  accentColor: '#C8960A',
  headerText: '',
  subtitleText: '',
  footerText: 'All prices include VAT',
  showPrices: true,
  showDescriptions: true,
  sectionStyle: 'category',
};

const CATEGORY_ORDER = ['Starter', 'Main', 'Sauce', 'Bread', 'Pastry', 'Dessert', 'Stock', 'Snack', 'Other'];

export default function MenuDesigner({ menuId, onClose }: { menuId: string; onClose: () => void }) {
  const { state, actions } = useApp();
  const { user } = useAuth();
  const { settings } = useSettings();
  const C = settings.resolved === 'light' ? light : dark;
  const sym = (state.profile || {}).currencySymbol || '£';

  const menu = (state.menus || []).find((m: any) => m.id === menuId);
  const design: Design = { ...DEFAULT_DESIGN, ...(menu?.design || {}), headerText: menu?.design?.headerText || (state.profile?.name ? state.profile.name + (state.profile?.location ? ' · ' + state.profile.location : '') : 'Restaurant Name'), subtitleText: menu?.design?.subtitleText || menu?.name || '' };

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInRef = useRef<HTMLInputElement | null>(null);

  function update(partial: Partial<Design>) {
    actions.updMenu(menuId, { design: { ...design, ...partial } });
  }

  function getCosting(recipeId: string): any | null {
    const r = state.recipes.find((x: any) => x.id === recipeId);
    if (!r) return null;
    if (r.linkedCostingId) return state.gpHistory.find((h: any) => h.id === r.linkedCostingId) || null;
    return state.gpHistory.find((h: any) => (h.name || '').toLowerCase().trim() === (r.title || '').toLowerCase().trim()) || null;
  }

  // Group dishes for the preview
  const dishes = useMemo(() => {
    const list = (menu?.recipeIds || []).map((id: string) => {
      const r = state.recipes.find((x: any) => x.id === id);
      const c = getCosting(id);
      return { id, recipe: r, costing: c };
    }).filter((d: any) => d.recipe);
    if (design.sectionStyle === 'flat') return [{ name: '', dishes: list }];
    const byCat: Record<string, any[]> = {};
    for (const d of list) {
      const cat = d.recipe.category || 'Other';
      (byCat[cat] = byCat[cat] || []).push(d);
    }
    return CATEGORY_ORDER
      .filter(c => byCat[c])
      .map(c => ({ name: c, dishes: byCat[c] }))
      .concat(Object.keys(byCat).filter(c => !CATEGORY_ORDER.includes(c)).map(c => ({ name: c, dishes: byCat[c] })));
  }, [menu, state.recipes, state.gpHistory, design.sectionStyle]);

  async function resizeLogo(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const maxW = 800;
        const ratio = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not supported'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Could not encode')), file.type.includes('png') ? 'image/png' : 'image/jpeg', 0.9);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
      img.src = url;
    });
  }

  async function uploadLogo(file: File) {
    if (!user?.id) return;
    setUploadError('');
    setUploading(true);
    try {
      const blob = await resizeLogo(file);
      const ext = file.type.includes('png') ? 'png' : 'jpg';
      const ts = Date.now();
      const path = `${user.id}/menu-${menuId}-logo-${ts}.${ext}`;
      const { error: upErr } = await supabase.storage.from('recipe-photos').upload(path, blob, {
        contentType: blob.type, upsert: true, cacheControl: '3600',
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('recipe-photos').getPublicUrl(path);
      // Best-effort delete of the previous logo
      if (design.logo?.path && design.logo.path !== path) {
        await supabase.storage.from('recipe-photos').remove([design.logo.path]).catch(() => {});
      }
      update({ logo: { url: pub.publicUrl, path } });
    } catch (e: any) {
      setUploadError(e?.message || 'Upload failed');
    }
    setUploading(false);
  }

  async function removeLogo() {
    if (design.logo?.path) {
      await supabase.storage.from('recipe-photos').remove([design.logo.path]).catch(() => {});
    }
    update({ logo: null });
  }

  if (!menu) return null;

  const inp: any = { width: '100%', background: C.surface2, border: '1px solid ' + C.border, color: C.text, fontSize: '13px', padding: '9px 12px', outline: 'none', boxSizing: 'border-box', borderRadius: '3px' };
  const lbl: any = { fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.faint, display: 'block', marginBottom: '6px' };

  return (
    <>
      {/* Print-only CSS hides everything except the preview */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #menu-design-print, #menu-design-print * { visibility: visible !important; }
          #menu-design-print { position: absolute; left: 0; top: 0; width: 100%; padding: 16mm !important; background: white !important; color: #111 !important; }
          #menu-design-controls, #menu-design-overlay-frame { display: none !important; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', zIndex: 60, padding: '0' }}>
        <div id="menu-design-overlay-frame" style={{ display: 'flex', width: '100%', maxHeight: '100vh' }}>
          {/* Left: controls */}
          <div id="menu-design-controls" style={{ width: '340px', background: C.surface, borderRight: '1px solid ' + C.border, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid ' + C.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, fontSize: '18px', color: C.text }}>Menu Designer</h3>
                <p style={{ fontSize: '11px', color: C.faint, marginTop: '2px' }}>Auto-saves as you edit</p>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.faint, fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              {/* Logo */}
              <div>
                <label style={lbl}>Logo</label>
                {design.logo?.url ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: C.surface2, border: '1px solid ' + C.border, borderRadius: '3px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={design.logo.url} alt="Logo" style={{ height: '40px', objectFit: 'contain' }} />
                    <div style={{ flex: 1 }} />
                    <button onClick={() => fileInRef.current?.click()} disabled={uploading}
                      style={{ fontSize: '10px', color: C.dim, background: 'transparent', border: '1px solid ' + C.border, padding: '5px 9px', cursor: 'pointer', borderRadius: '2px' }}>
                      {uploading ? '…' : 'Replace'}
                    </button>
                    <button onClick={removeLogo}
                      style={{ fontSize: '10px', color: C.faint, background: 'transparent', border: '1px solid ' + C.border, padding: '5px 9px', cursor: 'pointer', borderRadius: '2px' }}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileInRef.current?.click()} disabled={uploading}
                    style={{ width: '100%', padding: '14px', background: C.surface2, border: '1px dashed ' + C.border, color: C.dim, fontSize: '12px', cursor: 'pointer', borderRadius: '3px' }}>
                    {uploading ? 'Uploading…' : '📷 Upload logo'}
                  </button>
                )}
                <input ref={fileInRef} type="file" accept="image/*"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ''; }}
                  style={{ display: 'none' }} />
                {uploadError && <p style={{ fontSize: '11px', color: C.red, marginTop: '4px' }}>{uploadError}</p>}
              </div>

              {/* Header */}
              <div>
                <label style={lbl}>Header (restaurant name)</label>
                <input value={design.headerText} onChange={e => update({ headerText: e.target.value })} placeholder="Restaurant name" style={inp} />
              </div>

              <div>
                <label style={lbl}>Subtitle</label>
                <input value={design.subtitleText} onChange={e => update({ subtitleText: e.target.value })} placeholder="Spring Menu 2026" style={inp} />
              </div>

              {/* Accent color */}
              <div>
                <label style={lbl}>Accent colour</label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input type="color" value={design.accentColor} onChange={e => update({ accentColor: e.target.value })}
                    style={{ width: '40px', height: '36px', padding: 0, border: '1px solid ' + C.border, background: 'transparent', cursor: 'pointer', borderRadius: '3px' }} />
                  <input value={design.accentColor} onChange={e => update({ accentColor: e.target.value })}
                    style={{ ...inp, flex: 1, fontFamily: 'monospace' }} />
                </div>
                <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {['#C8960A', '#1A1A18', '#3A7A4A', '#7A3A4A', '#3A4A7A', '#A07020', '#A0A0A0'].map(c => (
                    <button key={c} onClick={() => update({ accentColor: c })} title={c}
                      style={{ width: '22px', height: '22px', borderRadius: '3px', background: c, border: c === design.accentColor ? '2px solid ' + C.text : '1px solid ' + C.border, cursor: 'pointer' }} />
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div>
                <label style={lbl}>Layout</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['category', 'flat'] as const).map(s => (
                    <button key={s} onClick={() => update({ sectionStyle: s })}
                      style={{ flex: 1, fontSize: '12px', padding: '8px', border: '1px solid ' + (design.sectionStyle === s ? C.gold : C.border), background: design.sectionStyle === s ? C.gold + '14' : 'transparent', color: design.sectionStyle === s ? C.gold : C.dim, cursor: 'pointer', borderRadius: '3px', textTransform: 'capitalize' }}>
                      {s === 'category' ? 'Group by section' : 'Flat list'}
                    </button>
                  ))}
                </div>
              </div>

              <Toggle C={C} label="Show prices" value={design.showPrices} onChange={v => update({ showPrices: v })} />
              <Toggle C={C} label="Show descriptions" value={design.showDescriptions} onChange={v => update({ showDescriptions: v })} />

              <div>
                <label style={lbl}>Footer note</label>
                <input value={design.footerText} onChange={e => update({ footerText: e.target.value })} placeholder="All prices include VAT" style={inp} />
              </div>
            </div>

            {/* Bottom actions */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid ' + C.border, display: 'flex', gap: '8px' }}>
              <button onClick={() => window.print()}
                style={{ flex: 1, fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', background: C.gold, color: C.bg, border: 'none', padding: '10px', cursor: 'pointer', borderRadius: '2px' }}>
                Print
              </button>
              <button onClick={onClose}
                style={{ fontSize: '11px', color: C.dim, background: 'transparent', border: '1px solid ' + C.border, padding: '10px 14px', cursor: 'pointer', borderRadius: '2px' }}>
                Done
              </button>
            </div>
          </div>

          {/* Right: live preview */}
          <div style={{ flex: 1, background: '#5A5552', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'auto', padding: '24px' }}>
            {/* A4-proportional sheet */}
            <div id="menu-design-print" style={{
              background: '#FFFFFF', color: '#1A1A18',
              width: '210mm', minHeight: '297mm',
              padding: '16mm', boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
              fontFamily: 'Georgia, serif',
            }}>
              <MenuPreview design={design} dishes={dishes} sym={sym} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function MenuPreview({ design, dishes, sym }: {
  design: Design;
  dishes: { name: string; dishes: any[] }[];
  sym: string;
}) {
  return (
    <>
      {/* Header */}
      <div style={{ borderBottom: '2px solid ' + design.accentColor, paddingBottom: '12mm', marginBottom: '10mm', textAlign: 'center' }}>
        {design.logo?.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={design.logo.url} alt="Logo" style={{ maxHeight: '24mm', objectFit: 'contain', marginBottom: '6mm' }} />
        )}
        <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: '32pt', color: '#111', marginBottom: '4mm', lineHeight: 1.1 }}>
          {design.headerText || 'Restaurant Name'}
        </h1>
        {design.subtitleText && (
          <p style={{ fontSize: '13pt', color: design.accentColor, fontStyle: 'italic', letterSpacing: '0.05em' }}>
            {design.subtitleText}
          </p>
        )}
      </div>

      {/* Sections */}
      {dishes.length === 0 || dishes.every(s => s.dishes.length === 0) ? (
        <p style={{ textAlign: 'center', color: '#888', fontStyle: 'italic', padding: '24mm 0' }}>
          No dishes in this menu yet — add some from the menu detail.
        </p>
      ) : dishes.map(section => (
        <section key={section.name || 'all'} style={{ marginBottom: '10mm' }}>
          {section.name && (
            <h2 style={{
              fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '14pt', textTransform: 'uppercase',
              letterSpacing: '0.2em', color: design.accentColor,
              borderBottom: '0.5px solid #DDD', paddingBottom: '2mm', marginBottom: '6mm',
              textAlign: 'center',
            }}>
              {section.name}{section.dishes.length > 1 ? 's' : ''}
            </h2>
          )}
          {section.dishes.map(d => (
            <div key={d.id} style={{ marginBottom: '6mm', breakInside: 'avoid' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8mm' }}>
                <p style={{ fontFamily: 'Georgia, serif', fontWeight: 600, fontSize: '13pt', color: '#111', flex: 1 }}>
                  {d.recipe.title}
                </p>
                {design.showPrices && d.costing?.sell != null && (
                  <p style={{ fontSize: '13pt', fontWeight: 600, color: design.accentColor, whiteSpace: 'nowrap' }}>
                    {sym}{(d.costing.sell || 0).toFixed(2)}
                  </p>
                )}
              </div>
              {design.showDescriptions && d.recipe.imported?.description && (
                <p style={{ fontSize: '10pt', color: '#555', lineHeight: 1.5, marginTop: '1mm', fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>
                  {d.recipe.imported.description}
                </p>
              )}
            </div>
          ))}
        </section>
      ))}

      {/* Footer */}
      {design.footerText && (
        <div style={{ marginTop: '12mm', paddingTop: '6mm', borderTop: '0.5px solid #DDD', textAlign: 'center' }}>
          <p style={{ fontSize: '9pt', color: '#888', fontStyle: 'italic' }}>{design.footerText}</p>
        </div>
      )}
    </>
  );
}

function Toggle({ C, label, value, onChange }: { C: any; label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '12px', color: C.text }}>
      <span>{label}</span>
      <button onClick={() => onChange(!value)}
        style={{
          width: '36px', height: '20px', borderRadius: '10px',
          background: value ? C.gold : C.surface2,
          border: '1px solid ' + (value ? C.gold : C.border),
          cursor: 'pointer', position: 'relative',
        }}>
        <div style={{
          position: 'absolute', top: '2px', left: value ? '18px' : '2px',
          width: '14px', height: '14px', borderRadius: '50%',
          background: value ? '#fff' : C.faint, transition: 'left 0.15s',
        }} />
      </button>
    </label>
  );
}
