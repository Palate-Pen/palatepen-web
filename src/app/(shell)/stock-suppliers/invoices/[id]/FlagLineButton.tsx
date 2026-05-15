'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { flagInvoiceLineAction } from './actions';

/**
 * Per-line discrepancy flag control on the invoice detail. When the
 * line isn't flagged, shows a small "Flag" button. When it is, shows
 * the note inline + "Edit" / "Clear" actions. Click "Flag" or "Edit"
 * to open a small inline editor — qty short (optional) + reason note.
 *
 * The server action recomputes the parent invoice's status based on
 * whether any line is flagged.
 */
export function FlagLineButton({
  invoiceId,
  lineId,
  initialQtyShort,
  initialNote,
  disabled,
}: {
  invoiceId: string;
  lineId: string;
  initialQtyShort: number | null;
  initialNote: string | null;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [qtyShort, setQtyShort] = useState(
    initialQtyShort != null ? String(initialQtyShort) : '',
  );
  const [note, setNote] = useState(initialNote ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isFlagged =
    initialQtyShort != null || (initialNote != null && initialNote.trim() !== '');

  function save() {
    if (pending) return;
    setError(null);
    const qtyNum = qtyShort.trim() === '' ? null : Number(qtyShort);
    if (qtyNum != null && !Number.isFinite(qtyNum)) {
      setError('Qty short must be a number, or leave blank.');
      return;
    }
    const trimmed = note.trim();
    if (qtyNum == null && trimmed === '') {
      setError('Add a reason note or a qty-short value to flag this line.');
      return;
    }
    startTransition(async () => {
      const res = await flagInvoiceLineAction({
        invoiceId,
        lineId,
        qtyShort: qtyNum,
        note: trimmed,
      });
      if (!res.ok) {
        setError(humaniseError(res.error));
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function clear() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const res = await flagInvoiceLineAction({
        invoiceId,
        lineId,
        qtyShort: null,
        note: '',
      });
      if (!res.ok) {
        setError(humaniseError(res.error));
        return;
      }
      setOpen(false);
      setQtyShort('');
      setNote('');
      router.refresh();
    });
  }

  if (open) {
    return (
      <div className="bg-paper-warm border border-attention/40 rounded-sm px-3 py-2.5 flex flex-col gap-2 max-w-[360px]">
        <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
          <span className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted">
            Qty short
          </span>
          <input
            type="number"
            step="0.001"
            value={qtyShort}
            onChange={(e) => setQtyShort(e.target.value)}
            placeholder="optional"
            className="w-full px-2 py-1 border border-rule bg-card font-serif text-sm text-ink focus:outline-none focus:border-attention"
          />
        </div>
        <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
          <span className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted pt-1.5">
            Reason
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="e.g. 2kg short on the lamb"
            maxLength={240}
            className="w-full px-2 py-1 border border-rule bg-card font-serif italic text-sm text-ink-soft resize-none focus:outline-none focus:border-attention"
          />
        </div>
        {error && (
          <div className="font-serif italic text-xs text-urgent">{error}</div>
        )}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={pending}
            className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted hover:text-ink transition-colors bg-transparent border-0 p-0 cursor-pointer"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            {isFlagged && (
              <button
                type="button"
                onClick={clear}
                disabled={pending}
                className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted hover:text-urgent transition-colors bg-transparent border-0 p-0 cursor-pointer"
              >
                Clear flag
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-3 py-1.5 bg-attention text-paper border border-attention hover:bg-attention/80 transition-colors disabled:opacity-40"
            >
              {pending ? 'Saving…' : 'Save flag'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isFlagged) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-attention hover:text-attention/70 transition-colors bg-transparent border-0 p-0 cursor-pointer disabled:opacity-40"
      >
        <span>⚑ Flagged</span>
        <span className="font-serif italic text-xs text-muted normal-case tracking-normal">
          edit
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      disabled={disabled}
      className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted hover:text-attention transition-colors bg-transparent border-0 p-0 cursor-pointer disabled:opacity-40"
      title="Flag this line for discrepancy"
    >
      ⚑ Flag
    </button>
  );
}

function humaniseError(code: string): string {
  switch (code) {
    case 'invoice_not_found':
      return 'Invoice not found.';
    case 'already_confirmed':
      return 'Already confirmed — flagging is locked once banked.';
    default:
      return code;
  }
}
