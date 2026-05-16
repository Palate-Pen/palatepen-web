'use client';

import { useState } from 'react';
import { SupplierForm } from './SupplierForm';

export function AddSupplierDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors whitespace-nowrap"
      >
        + Add supplier
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-ink/40 overflow-y-auto">
          <div
            className="absolute inset-0"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative bg-paper border border-rule shadow-[0_24px_60px_rgba(26,22,18,0.18)] max-w-[680px] w-full my-auto">
            <div className="px-7 pt-6 pb-3 border-b border-rule">
              <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold mb-2">
                New supplier
              </div>
              <h2 className="font-serif text-2xl font-normal leading-[1.1] tracking-[-0.015em] text-ink">
                Add to the books
              </h2>
            </div>

            <div className="px-7 py-6">
              <SupplierForm
                mode="create"
                onSaved={() => setOpen(false)}
                onCancel={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
