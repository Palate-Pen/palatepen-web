'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { scheduleDelivery } from './actions';

export type SupplierOption = { id: string; name: string };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ScheduleDeliveryDialog({
  suppliers,
}: {
  suppliers: SupplierOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '');
  const [expectedAt, setExpectedAt] = useState(todayIso());
  const [lineCount, setLineCount] = useState('');
  const [valueEst, setValueEst] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setSupplierId(suppliers[0]?.id ?? '');
    setExpectedAt(todayIso());
    setLineCount('');
    setValueEst('');
    setNotes('');
    setError(null);
  }

  function submit() {
    if (pending) return;
    setError(null);

    if (!supplierId) {
      setError('Pick a supplier — add one from /stock-suppliers/suppliers if needed.');
      return;
    }

    const lineNum = lineCount.trim() === '' ? null : Number(lineCount);
    if (lineNum != null && (!Number.isFinite(lineNum) || lineNum < 0)) {
      setError('Line count must be a non-negative whole number.');
      return;
    }
    const valueNum = valueEst.trim() === '' ? null : Number(valueEst);
    if (valueNum != null && (!Number.isFinite(valueNum) || valueNum < 0)) {
      setError('Estimated value must be a non-negative number.');
      return;
    }

    startTransition(async () => {
      const res = await scheduleDelivery({
        supplier_id: supplierId,
        expected_at: expectedAt,
        line_count_estimate: lineNum,
        value_estimate: valueNum,
        notes: notes.trim() || null,
      });
      if (!res.ok) {
        setError(humaniseError(res.error));
        return;
      }
      close();
      router.refresh();
    });
  }

  if (suppliers.length === 0) {
    return (
      <div className="bg-card border border-rule px-5 py-3 font-serif italic text-xs text-muted max-w-[260px]">
        Add a supplier before scheduling deliveries.
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors whitespace-nowrap"
      >
        + Schedule delivery
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink/40">
          <div
            className="absolute inset-0"
            onClick={close}
            aria-hidden="true"
          />
          <div className="relative bg-paper border border-rule shadow-[0_24px_60px_rgba(26,22,18,0.18)] max-w-[520px] w-full max-h-[90vh] overflow-y-auto">
            <div className="px-7 pt-6 pb-3 border-b border-rule">
              <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold mb-2">
                Schedule delivery
              </div>
              <h2 className="font-display text-2xl font-semibold uppercase tracking-[0.04em] text-ink">
                What's coming in?
              </h2>
            </div>

            <div className="px-7 py-6 flex flex-col gap-4">
              <Field label="Supplier">
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Expected on">
                <input
                  type="date"
                  value={expectedAt}
                  onChange={(e) => setExpectedAt(e.target.value)}
                  className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
                />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Line count (optional)">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={lineCount}
                    onChange={(e) => setLineCount(e.target.value)}
                    placeholder="e.g. 12"
                    className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
                  />
                </Field>
                <Field label="Estimated value £ (optional)">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valueEst}
                    onChange={(e) => setValueEst(e.target.value)}
                    placeholder="e.g. 280"
                    className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
                  />
                </Field>
              </div>

              <Field label="Notes (optional)">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="anything the chef on receipt should know"
                  className="w-full px-3 py-2 border border-rule bg-card font-serif italic text-sm text-ink-soft resize-none focus:outline-none focus:border-gold"
                  maxLength={400}
                />
              </Field>

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
                disabled={pending}
                className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {pending ? 'Scheduling…' : 'Schedule it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function humaniseError(code: string): string {
  switch (code) {
    case 'supplier_required':
      return 'Pick a supplier.';
    case 'invalid_date':
      return 'Pick a valid date.';
    case 'invalid_lines':
      return 'Line count must be a non-negative number.';
    case 'invalid_value':
      return 'Value must be a non-negative number.';
    case 'no_membership':
      return 'No site membership — try signing back in.';
    default:
      return code;
  }
}
