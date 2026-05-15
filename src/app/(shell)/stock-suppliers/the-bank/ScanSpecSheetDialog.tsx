'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { bulkCreateBankFromSpecAction } from './actions';

type ExtractedProduct = {
  name: string;
  unit: string;
  pack_size?: string;
  unit_price: number;
  supplier_hint?: string;
  notes?: string;
};

type ReviewRow = {
  key: string;
  include: boolean;
  name: string;
  unit: string;
  unit_price: string;
  supplier_name: string;
  notes: string;
};

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

function makeKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

/**
 * Upload-extract-review workflow for supplier spec sheets. Opens a
 * full-screen modal:
 *   1. Pick a file (image or PDF, ≤5MB)
 *   2. POST to /api/palatable/scan-spec-sheet — Haiku 4.5 vision parses
 *      the sheet and returns a JSON list of products
 *   3. Chef sees the extracted rows in an editable table, can untick
 *      anything they don't want, edit names/prices, set a default
 *      supplier
 *   4. Submit calls bulkCreateBankFromSpecAction — Bank entries land,
 *      with opening price-history rows so sparklines start populated
 */
export function ScanSpecSheetDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<'idle' | 'extracting' | 'review' | 'saving' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [supplierName, setSupplierName] = useState('');
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setStage('idle');
    setError(null);
    setRows([]);
    setSupplierName('');
    setSavedCount(0);
  }

  async function handleFile(file: File) {
    setError(null);
    setStage('extracting');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/palatable/scan-spec-sheet', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(humaniseError(json.error ?? 'unknown_error', json.detail));
        setStage('idle');
        return;
      }
      const products: ExtractedProduct[] = json.extracted?.products ?? [];
      const sheetSupplier: string | undefined = json.extracted?.supplier_name;
      if (sheetSupplier) setSupplierName(sheetSupplier);
      setRows(
        products.map((p) => ({
          key: makeKey(),
          include: true,
          name: p.name ?? '',
          unit: p.unit ?? 'each',
          unit_price: Number.isFinite(p.unit_price) ? String(p.unit_price) : '',
          supplier_name: p.supplier_hint ?? '',
          notes: [p.pack_size, p.notes].filter(Boolean).join(' · '),
        })),
      );
      setStage('review');
    } catch (e) {
      setError((e as Error).message || 'upload_failed');
      setStage('idle');
    }
  }

  function submit() {
    if (pending) return;
    setError(null);
    const toCreate = rows
      .filter((r) => r.include && r.name.trim() !== '')
      .map((r) => ({
        name: r.name.trim(),
        unit: r.unit.trim() || 'each',
        current_price:
          r.unit_price.trim() === '' || !Number.isFinite(Number(r.unit_price))
            ? null
            : Number(r.unit_price),
        supplier_name: r.supplier_name.trim() || null,
        notes: r.notes.trim() || null,
      }));
    if (toCreate.length === 0) {
      setError('Tick at least one row to add to the Bank.');
      return;
    }
    setStage('saving');
    startTransition(async () => {
      const res = await bulkCreateBankFromSpecAction({
        rows: toCreate,
        default_supplier_name: supplierName.trim() || null,
      });
      if (!res.ok) {
        setError(res.error);
        setStage('review');
        return;
      }
      setSavedCount(res.created);
      setStage('done');
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-transparent text-ink border border-rule hover:border-gold hover:text-gold transition-colors"
      >
        ⎙ Scan spec sheet
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-ink/40 overflow-y-auto">
          <div
            className="absolute inset-0"
            onClick={close}
            aria-hidden="true"
          />
          <div className="relative bg-paper border border-rule shadow-[0_24px_60px_rgba(26,22,18,0.18)] max-w-[1000px] w-full my-auto">
            <div className="px-7 pt-6 pb-3 border-b border-rule flex justify-between items-start gap-4 flex-wrap">
              <div>
                <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold mb-2">
                  Spec sheet · Haiku
                </div>
                <h2 className="font-display text-2xl font-semibold uppercase tracking-[0.04em] text-ink">
                  Scan a supplier sheet
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-ink transition-colors"
              >
                Close ×
              </button>
            </div>

            <div className="px-7 py-6">
              {stage === 'idle' && (
                <div>
                  <p className="font-serif italic text-base text-ink-soft leading-relaxed mb-6">
                    Drop a price list (PDF or photo). Haiku reads the
                    products + prices + pack sizes. Review the extracted
                    rows, tick what you want banked, hit Save.
                  </p>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="border-2 border-dashed border-rule px-12 py-12 hover:border-gold transition-colors text-center w-full"
                  >
                    <div className="font-display font-semibold text-sm tracking-[0.18em] uppercase text-gold mb-1">
                      + Pick a spec sheet
                    </div>
                    <div className="font-serif italic text-sm text-muted">
                      JPG, PNG, WebP, or PDF · up to 5MB
                    </div>
                  </button>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                      e.target.value = '';
                    }}
                  />
                </div>
              )}

              {stage === 'extracting' && (
                <div className="text-center py-12">
                  <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold mb-3">
                    Reading the sheet
                  </div>
                  <p className="font-serif italic text-base text-muted">
                    Haiku is parsing the price list — usually 5-10 seconds.
                  </p>
                </div>
              )}

              {stage === 'review' && (
                <ReviewTable
                  rows={rows}
                  setRows={setRows}
                  supplierName={supplierName}
                  setSupplierName={setSupplierName}
                />
              )}

              {stage === 'saving' && (
                <div className="text-center py-12">
                  <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold mb-3">
                    Adding to The Bank
                  </div>
                  <p className="font-serif italic text-base text-muted">
                    Creating ingredients + suppliers + opening price history.
                  </p>
                </div>
              )}

              {stage === 'done' && (
                <div className="text-center py-10">
                  <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-healthy mb-3">
                    ✓ Banked
                  </div>
                  <p className="font-serif text-lg text-ink mb-2">
                    {savedCount} ingredient{savedCount === 1 ? '' : 's'} added to The Bank.
                  </p>
                  <p className="font-serif italic text-sm text-muted mb-6">
                    Sparklines populate from today's price. Cost-per-cover
                    re-computes across every recipe that links these
                    ingredients.
                  </p>
                  <button
                    type="button"
                    onClick={close}
                    className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}

              {error && stage !== 'extracting' && stage !== 'saving' && (
                <div className="mt-4 bg-card border border-l-4 border-l-urgent border-rule px-4 py-3 font-serif italic text-sm text-ink-soft">
                  {error}
                </div>
              )}
            </div>

            {stage === 'review' && (
              <div className="px-7 py-5 border-t border-rule flex items-center justify-end gap-3 bg-paper-warm/50">
                <button
                  type="button"
                  onClick={close}
                  className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-transparent text-muted border border-rule hover:border-gold hover:text-gold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={pending}
                  className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors disabled:opacity-40"
                >
                  Add {rows.filter((r) => r.include).length} to The Bank
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ReviewTable({
  rows,
  setRows,
  supplierName,
  setSupplierName,
}: {
  rows: ReviewRow[];
  setRows: (updater: (rows: ReviewRow[]) => ReviewRow[]) => void;
  supplierName: string;
  setSupplierName: (v: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="font-serif italic text-muted py-8 text-center">
        Haiku didn't find any product rows. Try a different page or photo angle.
      </p>
    );
  }

  function update(key: string, patch: Partial<ReviewRow>) {
    setRows((cur) => cur.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function toggle(key: string) {
    setRows((cur) =>
      cur.map((r) => (r.key === key ? { ...r, include: !r.include } : r)),
    );
  }

  const totalIncluded = rows.filter((r) => r.include).length;
  const totalValue = rows
    .filter((r) => r.include)
    .reduce(
      (s, r) =>
        s + (Number.isFinite(Number(r.unit_price)) ? Number(r.unit_price) : 0),
      0,
    );

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-4 mb-5">
        <div>
          <label className="block font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-muted mb-1.5">
            Default supplier (applied to rows without one)
          </label>
          <input
            type="text"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder="e.g. Reza Foods"
            className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
          />
        </div>
        <div className="flex flex-col justify-end">
          <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-muted mb-1">
            Selected
          </div>
          <div className="font-serif font-semibold text-xl text-ink">
            {totalIncluded} of {rows.length}
          </div>
          <div className="font-serif italic text-xs text-muted">
            {gbp.format(totalValue)} of price baseline
          </div>
        </div>
      </div>

      <div className="bg-card border border-rule overflow-hidden">
        <div className="hidden md:grid grid-cols-[36px_2fr_80px_100px_1.2fr] gap-3 px-4 py-2.5 bg-paper-warm border-b border-rule">
          {['', 'Name', 'Unit', 'Price', 'Supplier · Notes'].map((h, i) => (
            <div
              key={i}
              className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
            >
              {h}
            </div>
          ))}
        </div>
        {rows.map((r, idx) => (
          <div
            key={r.key}
            className={
              'grid grid-cols-1 md:grid-cols-[36px_2fr_80px_100px_1.2fr] gap-3 px-4 py-2.5 items-center' +
              (idx < rows.length - 1 ? ' border-b border-rule-soft' : '') +
              (!r.include ? ' opacity-50' : '')
            }
          >
            <input
              type="checkbox"
              checked={r.include}
              onChange={() => toggle(r.key)}
              className="accent-gold w-4 h-4"
            />
            <input
              type="text"
              value={r.name}
              onChange={(e) => update(r.key, { name: e.target.value })}
              className="px-2 py-1.5 border border-rule bg-card font-serif text-sm text-ink focus:outline-none focus:border-gold"
            />
            <input
              type="text"
              value={r.unit}
              onChange={(e) => update(r.key, { unit: e.target.value })}
              className="px-2 py-1.5 border border-rule bg-card font-serif text-sm text-ink focus:outline-none focus:border-gold"
            />
            <input
              type="number"
              step="0.01"
              value={r.unit_price}
              onChange={(e) => update(r.key, { unit_price: e.target.value })}
              className="px-2 py-1.5 border border-rule bg-card font-serif text-sm text-ink focus:outline-none focus:border-gold"
            />
            <input
              type="text"
              value={r.supplier_name ? `${r.supplier_name} · ${r.notes}` : r.notes}
              onChange={(e) => {
                const parts = e.target.value.split(' · ');
                update(r.key, {
                  supplier_name: parts.length > 1 ? parts[0] : '',
                  notes: parts.length > 1 ? parts.slice(1).join(' · ') : parts[0],
                });
              }}
              placeholder="supplier · notes"
              className="px-2 py-1.5 border border-rule bg-card font-serif italic text-sm text-ink-soft focus:outline-none focus:border-gold"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function humaniseError(code: string, detail?: string): string {
  switch (code) {
    case 'unauthorized':
      return 'Sign back in and try again.';
    case 'no_membership':
      return 'No site membership on file.';
    case 'insufficient_role':
      return 'Your role can\'t add to the Bank.';
    case 'unsupported_type':
      return detail ?? 'File type not supported. Use JPG, PNG, WebP or PDF.';
    case 'file_too_large':
      return 'Spec sheet is too big — max 5MB.';
    case 'missing_anthropic_key':
      return 'AI is currently unavailable.';
    case 'extraction_failed':
      return 'Haiku couldn\'t parse this sheet — try a clearer scan.';
    case 'no_products_extracted':
      return 'No product rows found. Try a different page.';
    case 'extraction_parse_failed':
      return 'Haiku returned something we couldn\'t parse. Try again.';
    default:
      return detail ?? code;
  }
}
