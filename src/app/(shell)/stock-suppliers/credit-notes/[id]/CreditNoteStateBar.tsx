'use client';

import { useState } from 'react';
import {
  markCreditNoteSentAction,
  markCreditNoteResolvedAction,
  cancelCreditNoteAction,
  reopenCreditNoteAction,
} from '../actions';
import {
  CREDIT_NOTE_LINE_REASON_LABEL,
  type CreditNoteLineReason,
  type CreditNoteStatus,
} from '@/lib/credit-notes';

/**
 * State-aware action bar for a single credit note. Shows the right set of
 * buttons for the current status:
 *
 *   draft    → [Email to supplier] [Send] [Cancel] [Print]
 *   sent     → [Email reminder] [Mark resolved] [Cancel] [Print]
 *   resolved → [Print] [Reopen]
 *   cancelled→ [Reopen]
 *
 * "Email to supplier" opens the chef's mail client via mailto: with the
 * credit note body pre-filled. "Send" is the in-app status flip — the
 * chef hits it once they've actually emailed/printed/handed it over.
 */

type LineSummary = {
  raw_name: string;
  qty: number;
  qty_unit: string;
  unit_price: number;
  line_total: number;
  reason: CreditNoteLineReason;
  note: string | null;
};

export function CreditNoteStateBar({
  creditNoteId,
  status,
  reference,
  supplierName,
  invoiceNumber,
  total,
  lines,
}: {
  creditNoteId: string;
  status: CreditNoteStatus;
  reference: string;
  supplierName: string;
  sourceInvoiceId: string;
  invoiceNumber: string | null;
  total: number;
  lines: LineSummary[];
}) {
  const [printing, setPrinting] = useState(false);

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 50);
  };

  const mailtoHref = buildMailto({
    reference,
    supplierName,
    invoiceNumber,
    total,
    lines,
  });

  return (
    <div className="bg-card border border-rule px-5 py-4 flex flex-wrap items-center gap-3 print:hidden">
      {(status === 'draft' || status === 'sent') && (
        <>
          <a
            href={mailtoHref}
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors"
          >
            ✉ Email to {supplierName.split(' ')[0]}
          </a>
        </>
      )}

      <button
        type="button"
        onClick={handlePrint}
        disabled={printing}
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-transparent text-ink border border-rule hover:border-gold hover:text-gold transition-colors"
      >
        ⎙ Print / Save PDF
      </button>

      {status === 'draft' && (
        <form action={markCreditNoteSentAction.bind(null, creditNoteId)}>
          <button
            type="submit"
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-transparent text-attention border border-attention/40 hover:bg-attention/10 transition-colors"
          >
            Mark as sent →
          </button>
        </form>
      )}

      {status === 'sent' && (
        <form action={markCreditNoteResolvedAction.bind(null, creditNoteId)}>
          <button
            type="submit"
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-transparent text-healthy border border-healthy/40 hover:bg-healthy/10 transition-colors"
          >
            ✓ Mark resolved
          </button>
        </form>
      )}

      {(status === 'draft' || status === 'sent') && (
        <form
          action={cancelCreditNoteAction.bind(null, creditNoteId)}
          className="ml-auto"
        >
          <button
            type="submit"
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2.5 bg-transparent text-muted border border-rule hover:border-urgent hover:text-urgent transition-colors"
          >
            Cancel
          </button>
        </form>
      )}

      {(status === 'resolved' || status === 'cancelled') && (
        <form
          action={reopenCreditNoteAction.bind(null, creditNoteId)}
          className="ml-auto"
        >
          <button
            type="submit"
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2.5 bg-transparent text-muted border border-rule hover:border-gold hover:text-gold transition-colors"
          >
            Re-open
          </button>
        </form>
      )}
    </div>
  );
}

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

function buildMailto(args: {
  reference: string;
  supplierName: string;
  invoiceNumber: string | null;
  total: number;
  lines: LineSummary[];
}): string {
  const { reference, supplierName, invoiceNumber, total, lines } = args;
  const subject = `Credit note ${reference}${
    invoiceNumber ? ` against invoice #${invoiceNumber}` : ''
  }`;
  const lineBlock = lines
    .map(
      (l, i) =>
        `${i + 1}. ${l.raw_name} — ${l.qty} ${l.qty_unit} @ ${gbp.format(
          l.unit_price,
        )} = ${gbp.format(l.line_total)} (${
          CREDIT_NOTE_LINE_REASON_LABEL[l.reason]
        }${l.note ? `: ${l.note}` : ''})`,
    )
    .join('\n');
  const body =
    `Hi ${supplierName},\n\n` +
    `Please raise a credit note against ${
      invoiceNumber ? `invoice #${invoiceNumber}` : 'the most recent invoice'
    } for the items below.\n\n` +
    `Reference: ${reference}\n\n` +
    `${lineBlock}\n\n` +
    `Total: ${gbp.format(total)}\n\n` +
    `Thanks,\n`;
  return (
    'mailto:?subject=' +
    encodeURIComponent(subject) +
    '&body=' +
    encodeURIComponent(body)
  );
}
