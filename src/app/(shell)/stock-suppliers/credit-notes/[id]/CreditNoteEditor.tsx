'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateCreditNoteAction } from '../actions';
import {
  CREDIT_NOTE_LINE_REASON_LABEL,
  type CreditNoteLine,
  type CreditNoteLineReason,
  type CreditNoteStatus,
} from '@/lib/credit-notes-shared';

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

const REASONS: CreditNoteLineReason[] = [
  'short',
  'damaged',
  'wrong_item',
  'wrong_price',
  'other',
];

type LineDraft = {
  id: string;
  raw_name: string;
  qty_unit: string;
  qty: string;
  unit_price: string;
  reason: CreditNoteLineReason;
  note: string;
};

export function CreditNoteEditor({
  creditNoteId,
  status,
  initialNotes,
  initialLines,
}: {
  creditNoteId: string;
  status: CreditNoteStatus;
  initialNotes: string;
  initialLines: CreditNoteLine[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState(initialNotes);
  const [lines, setLines] = useState<LineDraft[]>(
    initialLines.map((l) => ({
      id: l.id,
      raw_name: l.raw_name,
      qty_unit: l.qty_unit,
      qty: String(l.qty),
      unit_price: String(l.unit_price),
      reason: l.reason,
      note: l.note ?? '',
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState(0);

  const editable = status === 'draft';

  const total = lines.reduce((s, l) => {
    const q = Number(l.qty) || 0;
    const p = Number(l.unit_price) || 0;
    return s + Math.round(q * p * 100) / 100;
  }, 0);

  const updateLine = (id: string, patch: Partial<LineDraft>) => {
    setLines((curr) => curr.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateCreditNoteAction({
        creditNoteId,
        notes,
        lines: lines.map((l) => ({
          id: l.id,
          qty: Number(l.qty) || 0,
          unit_price: Number(l.unit_price) || 0,
          reason: l.reason,
          note: l.note,
        })),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedTick((n) => n + 1);
      router.refresh();
    });
  };

  return (
    <div>
      <div className="bg-card border border-rule">
        <div className="hidden md:grid grid-cols-[2fr_120px_110px_140px_60px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
          {['Line', 'Qty', 'Unit price', 'Reason', 'Total'].map((h, i) => (
            <div
              key={i}
              className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
            >
              {h}
            </div>
          ))}
        </div>

        {lines.length === 0 && (
          <div className="px-10 py-12 text-center">
            <p className="font-serif italic text-muted">
              No lines on this credit note.
            </p>
          </div>
        )}

        {lines.map((l, idx) => {
          const qNum = Number(l.qty) || 0;
          const pNum = Number(l.unit_price) || 0;
          const lineTotal = Math.round(qNum * pNum * 100) / 100;
          return (
            <div
              key={l.id}
              className={
                'grid grid-cols-1 md:grid-cols-[2fr_120px_110px_140px_60px] gap-4 px-7 py-4 items-start' +
                (idx === lines.length - 1 ? '' : ' border-b border-rule-soft')
              }
            >
              <div>
                <div className="font-serif font-semibold text-base text-ink">
                  {l.raw_name}
                </div>
                {editable ? (
                  <input
                    type="text"
                    value={l.note}
                    onChange={(e) => updateLine(l.id, { note: e.target.value })}
                    placeholder="Note for supplier (optional)"
                    className="mt-2 w-full font-serif italic text-sm text-ink-soft bg-paper-warm border border-rule px-2.5 py-1.5 focus:outline-none focus:border-gold"
                  />
                ) : (
                  l.note && (
                    <div className="font-serif italic text-xs text-muted mt-1">
                      {l.note}
                    </div>
                  )
                )}
              </div>
              <div>
                {editable ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.001"
                      value={l.qty}
                      onChange={(e) =>
                        updateLine(l.id, { qty: e.target.value })
                      }
                      className="w-16 font-serif text-sm text-ink bg-paper-warm border border-rule px-2 py-1.5 focus:outline-none focus:border-gold"
                    />
                    <span className="font-serif italic text-xs text-muted">
                      {l.qty_unit}
                    </span>
                  </div>
                ) : (
                  <div className="font-serif text-sm text-ink">
                    {l.qty} {l.qty_unit}
                  </div>
                )}
              </div>
              <div>
                {editable ? (
                  <input
                    type="number"
                    step="0.0001"
                    value={l.unit_price}
                    onChange={(e) =>
                      updateLine(l.id, { unit_price: e.target.value })
                    }
                    className="w-24 font-serif text-sm text-ink bg-paper-warm border border-rule px-2 py-1.5 focus:outline-none focus:border-gold"
                  />
                ) : (
                  <div className="font-serif text-sm text-ink">
                    {gbp.format(pNum)}
                  </div>
                )}
              </div>
              <div>
                {editable ? (
                  <select
                    value={l.reason}
                    onChange={(e) =>
                      updateLine(l.id, {
                        reason: e.target.value as CreditNoteLineReason,
                      })
                    }
                    className="w-full font-serif text-sm text-ink bg-paper-warm border border-rule px-2 py-1.5 focus:outline-none focus:border-gold"
                  >
                    {REASONS.map((r) => (
                      <option key={r} value={r}>
                        {CREDIT_NOTE_LINE_REASON_LABEL[r]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 bg-attention/10 text-attention border border-attention/40 font-display font-semibold text-[10px] tracking-[0.18em] uppercase rounded-sm">
                    {CREDIT_NOTE_LINE_REASON_LABEL[l.reason]}
                  </span>
                )}
              </div>
              <div className="font-serif font-semibold text-sm text-ink">
                {gbp.format(lineTotal)}
              </div>
            </div>
          );
        })}

        <div className="grid grid-cols-1 md:grid-cols-[2fr_120px_110px_140px_60px] gap-4 px-7 py-4 bg-paper-warm border-t border-rule items-center">
          <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted md:col-span-4 text-right">
            Total claim
          </div>
          <div className="font-serif font-semibold text-base text-ink">
            {gbp.format(total)}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <label className="block font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2">
          Internal notes
        </label>
        {editable ? (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Optional — not sent to the supplier, just for your records"
            className="w-full font-serif text-base text-ink bg-card border border-rule px-3 py-2.5 focus:outline-none focus:border-gold"
          />
        ) : notes ? (
          <p className="font-serif italic text-base text-ink-soft bg-card border border-rule px-3 py-2.5">
            {notes}
          </p>
        ) : (
          <p className="font-serif italic text-sm text-muted">No notes.</p>
        )}
      </div>

      {editable && (
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark disabled:opacity-60 transition-colors"
          >
            {pending ? 'Saving…' : 'Save changes'}
          </button>
          {savedTick > 0 && !pending && (
            <span className="font-serif italic text-sm text-healthy">
              Saved.
            </span>
          )}
          {error && (
            <span className="font-serif italic text-sm text-urgent">
              {error}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
