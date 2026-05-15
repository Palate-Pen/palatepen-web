/**
 * Shared types + pure utils for credit notes. Client-safe — no Supabase
 * imports here. The server-side data fetchers live in
 * @/lib/credit-notes.ts and re-export from this file.
 */

export type CreditNoteStatus = 'draft' | 'sent' | 'resolved' | 'cancelled';

export type CreditNoteLineReason =
  | 'short'
  | 'damaged'
  | 'wrong_item'
  | 'wrong_price'
  | 'other';

export const CREDIT_NOTE_LINE_REASON_LABEL: Record<
  CreditNoteLineReason,
  string
> = {
  short: 'Short delivery',
  damaged: 'Damaged',
  wrong_item: 'Wrong item',
  wrong_price: 'Wrong price',
  other: 'Other',
};

export const CREDIT_NOTE_STATUS_LABEL: Record<CreditNoteStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  resolved: 'Resolved',
  cancelled: 'Cancelled',
};

export type CreditNoteLine = {
  id: string;
  source_invoice_line_id: string | null;
  raw_name: string;
  qty: number;
  qty_unit: string;
  unit_price: number;
  line_total: number;
  reason: CreditNoteLineReason;
  note: string | null;
  position: number;
};

export type CreditNoteRow = {
  id: string;
  site_id: string;
  supplier_id: string;
  source_invoice_id: string;
  reference: string;
  status: CreditNoteStatus;
  total: number;
  currency: string;
  sent_at: string | null;
  resolved_at: string | null;
  cancelled_at: string | null;
  notes: string | null;
  created_at: string;
  supplier_name: string | null;
  invoice_number: string | null;
  invoice_issued_at: string | null;
  line_count: number;
};

export type CreditNoteDetail = CreditNoteRow & {
  lines: CreditNoteLine[];
};

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * CN-YYYYMMDD-XXXXXX. Site-unique (DB constraint). Unambiguous alphabet,
 * 6 chars = 32^6 ≈ 1bn possible per day per site — collisions vanishingly
 * rare, retry-safe.
 */
export function generateCreditNoteReference(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += REFERENCE_ALPHABET[Math.floor(Math.random() * REFERENCE_ALPHABET.length)];
  }
  return `CN-${y}${m}${d}-${suffix}`;
}

export type DraftableLine = {
  source_invoice_line_id: string;
  raw_name: string;
  qty: number;
  qty_unit: string;
  unit_price: number;
  reason: CreditNoteLineReason;
  note: string;
};

/**
 * Build line drafts from flagged invoice lines. The chef sees a pre-populated
 * editor — they can adjust quantities / add a note / change reasons, but the
 * computation is theirs once they edit.
 */
export function flaggedInvoiceLinesToDrafts(
  invoiceLines: Array<{
    id: string;
    raw_name: string;
    qty: number;
    qty_unit: string;
    unit_price: number;
    discrepancy_qty: number | null;
    discrepancy_note: string | null;
  }>,
): DraftableLine[] {
  return invoiceLines
    .filter(
      (l) =>
        (l.discrepancy_qty != null && Number(l.discrepancy_qty) !== 0) ||
        (l.discrepancy_note != null && l.discrepancy_note.trim() !== ''),
    )
    .map((l) => {
      const qtyShort = l.discrepancy_qty != null ? Math.abs(Number(l.discrepancy_qty)) : 0;
      const claimQty = qtyShort > 0 ? qtyShort : l.qty;
      const noteLower = (l.discrepancy_note ?? '').toLowerCase();
      let reason: CreditNoteLineReason = 'short';
      if (noteLower.includes('damag')) reason = 'damaged';
      else if (noteLower.includes('wrong item') || noteLower.includes('not what'))
        reason = 'wrong_item';
      else if (noteLower.includes('price') || noteLower.includes('charge'))
        reason = 'wrong_price';
      else if (qtyShort === 0 && l.discrepancy_note) reason = 'other';
      return {
        source_invoice_line_id: l.id,
        raw_name: l.raw_name,
        qty: claimQty,
        qty_unit: l.qty_unit,
        unit_price: Number(l.unit_price),
        reason,
        note: l.discrepancy_note ?? '',
      };
    });
}
