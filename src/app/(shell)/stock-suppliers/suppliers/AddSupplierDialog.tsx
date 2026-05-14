'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createSupplier } from './actions';

export function AddSupplierDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setName('');
    setError(null);
  }

  function submit() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const res = await createSupplier(name);
      if (!res.ok) {
        setError(humaniseError(res.error));
        return;
      }
      close();
      router.refresh();
    });
  }

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink/40">
          <div
            className="absolute inset-0"
            onClick={close}
            aria-hidden="true"
          />
          <div className="relative bg-paper border border-rule shadow-[0_24px_60px_rgba(26,22,18,0.18)] max-w-[480px] w-full">
            <div className="px-7 pt-6 pb-3 border-b border-rule">
              <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold mb-2">
                New supplier
              </div>
              <h2 className="font-display text-2xl font-semibold uppercase tracking-[0.04em] text-ink">
                Add to the books
              </h2>
            </div>

            <div className="px-7 py-6 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted">
                  Supplier name
                </span>
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submit();
                    if (e.key === 'Escape') close();
                  }}
                  placeholder="e.g. Aubrey Allen, Reza Foods, Bookers"
                  maxLength={120}
                  className="w-full px-3 py-2 border border-rule bg-card font-serif font-semibold text-base text-ink focus:outline-none focus:border-gold"
                />
              </label>

              {error && (
                <div className="bg-card border border-l-4 border-l-urgent border-rule px-4 py-3 font-serif italic text-sm text-ink-soft">
                  {error}
                </div>
              )}
            </div>

            <div className="px-7 pb-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-transparent text-muted border border-rule hover:border-gold hover:text-gold transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending || !name.trim()}
                className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {pending ? 'Adding…' : 'Add supplier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function humaniseError(code: string): string {
  switch (code) {
    case 'name_required':
      return 'Give the supplier a name.';
    case 'name_too_long':
      return "Name's too long (120 chars max).";
    case 'duplicate_name':
      return 'A supplier with that name is already on the books.';
    case 'no_membership':
      return 'No site membership — try signing back in.';
    default:
      return code;
  }
}
