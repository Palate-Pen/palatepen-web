'use client';

import { useState } from 'react';
import { LABEL_SIZES } from '@/lib/safety/pdf/label-sizes';

type Kind = 'prep' | 'ppds';

const KIND_LABEL: Record<Kind, string> = {
  prep: 'Prep label',
  ppds: 'PPDS label',
};

const KIND_DESC: Record<Kind, string> = {
  prep: 'Kitchen-side shelf-life label · industry day-dot colour · allergen short codes.',
  ppds: 'Natasha’s Law / FIR 2014 customer label · full ingredient list, allergens in BOLD CAPS.',
};

const DEFAULT_SIZE: Record<Kind, string> = {
  prep: 'dymo-multi',
  ppds: 'square-70',
};

const DEFAULT_SHELF_DAYS = 3;
const DEFAULT_COPIES = 1;

/**
 * Print menu for a recipe — opens a small inline form to pick a label
 * preset (DYMO / Brother / A4 sheet), shelf-life days, copy count, and
 * label kind (prep vs PPDS). Submitting opens the generated PDF in a
 * new tab.
 */
export function LabelPrintMenu({ recipeId }: { recipeId: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>('prep');
  const [sizeId, setSizeId] = useState<string>(DEFAULT_SIZE.prep);
  const [shelfDays, setShelfDays] = useState<number>(DEFAULT_SHELF_DAYS);
  const [copies, setCopies] = useState<number>(DEFAULT_COPIES);
  const [storage, setStorage] = useState<string>('');
  const [qty, setQty] = useState<string>('');

  function switchKind(next: Kind) {
    setKind(next);
    setSizeId(DEFAULT_SIZE[next]);
    setStorage('');
    setQty('');
  }

  function href(): string {
    const params = new URLSearchParams();
    params.set('size', sizeId);
    params.set('copies', String(Math.max(1, Math.min(96, copies))));
    params.set('shelf', String(Math.max(1, Math.min(90, shelfDays))));
    if (storage.trim()) params.set('storage', storage.trim());
    if (kind === 'ppds' && qty.trim()) params.set('qty', qty.trim());
    return `/api/recipes/${recipeId}/${kind === 'ppds' ? 'ppds-label' : 'prep-label'}?${params.toString()}`;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-transparent text-ink border border-rule hover:border-gold hover:text-gold transition-colors"
      >
        Print label
      </button>
    );
  }

  return (
    <div className="bg-card border border-gold border-l-[3px] border-l-gold px-5 py-4 w-full max-w-[640px]">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold">
          Print label
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="font-display text-base text-muted hover:text-ink leading-none"
          aria-label="Close"
        >
          {String.fromCharCode(0xd7)}
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        {(Object.keys(KIND_LABEL) as Kind[]).map((k) => {
          const active = kind === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => switchKind(k)}
              className={
                'flex-1 px-3 py-2.5 border text-left transition-colors ' +
                (active
                  ? 'bg-gold-bg border-gold'
                  : 'bg-paper border-rule hover:border-gold')
              }
            >
              <div className="font-display font-semibold text-[11px] tracking-[0.2em] uppercase text-ink">
                {KIND_LABEL[k]}
              </div>
              <div className="font-serif italic text-[11px] text-muted mt-1 leading-tight">
                {KIND_DESC[k]}
              </div>
            </button>
          );
        })}
      </div>

      <label className="block mb-3">
        <span className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted mb-1.5 block">
          Label size / printer
        </span>
        <select
          value={sizeId}
          onChange={(e) => setSizeId(e.target.value)}
          className="w-full px-3 py-2 border border-rule bg-paper font-serif text-sm text-ink focus:border-gold focus:outline-none"
        >
          <optgroup label="Single-label / thermal">
            {LABEL_SIZES.filter((s) => s.layout === 'single').map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="A4 sheet labels">
            {LABEL_SIZES.filter((s) => s.layout === 'sheet').map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </optgroup>
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <label className="block">
          <span className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted mb-1.5 block">
            Shelf life (days)
          </span>
          <input
            type="number"
            min="1"
            max="90"
            value={shelfDays}
            onChange={(e) => setShelfDays(Number(e.target.value) || 1)}
            className="w-full px-3 py-2 border border-rule bg-paper font-mono text-sm text-ink focus:border-gold focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted mb-1.5 block">
            Copies
          </span>
          <input
            type="number"
            min="1"
            max="96"
            value={copies}
            onChange={(e) => setCopies(Number(e.target.value) || 1)}
            className="w-full px-3 py-2 border border-rule bg-paper font-mono text-sm text-ink focus:border-gold focus:outline-none"
          />
        </label>
      </div>

      <label className="block mb-3">
        <span className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted mb-1.5 block">
          Storage instruction (optional)
        </span>
        <input
          type="text"
          value={storage}
          onChange={(e) => setStorage(e.target.value)}
          placeholder={
            kind === 'prep'
              ? 'Chill below 5°C'
              : 'Keep refrigerated below 5°C'
          }
          className="w-full px-3 py-2 border border-rule bg-paper font-serif text-sm text-ink focus:border-gold focus:outline-none"
        />
      </label>

      {kind === 'ppds' && (
        <label className="block mb-3">
          <span className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted mb-1.5 block">
            Pack quantity (optional)
          </span>
          <input
            type="text"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="e.g. 180g / 1 portion"
            className="w-full px-3 py-2 border border-rule bg-paper font-serif text-sm text-ink focus:border-gold focus:outline-none"
          />
        </label>
      )}

      <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-rule">
        <a
          href={href()}
          target="_blank"
          rel="noopener noreferrer"
          className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors"
        >
          Generate {KIND_LABEL[kind]} →
        </a>
      </div>
    </div>
  );
}
