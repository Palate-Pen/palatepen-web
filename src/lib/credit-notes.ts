import { createSupabaseServerClient } from '@/lib/supabase/server';

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

/**
 * Build line drafts from flagged invoice lines. The chef sees a pre-populated
 * editor — they can adjust quantities / add a note / change reasons, but the
 * computation is theirs once they edit.
 */
export type DraftableLine = {
  source_invoice_line_id: string;
  raw_name: string;
  qty: number;
  qty_unit: string;
  unit_price: number;
  reason: CreditNoteLineReason;
  note: string;
};

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

export async function listCreditNotes(siteId: string): Promise<CreditNoteRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('credit_notes')
    .select(
      'id, site_id, supplier_id, source_invoice_id, reference, status, total, currency, sent_at, resolved_at, cancelled_at, notes, created_at, suppliers:supplier_id (name), invoices:source_invoice_id (invoice_number, issued_at), credit_note_lines (id)',
    )
    .eq('site_id', siteId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id as string,
    site_id: r.site_id as string,
    supplier_id: r.supplier_id as string,
    source_invoice_id: r.source_invoice_id as string,
    reference: r.reference as string,
    status: r.status as CreditNoteStatus,
    total: Number(r.total),
    currency: r.currency as string,
    sent_at: r.sent_at as string | null,
    resolved_at: r.resolved_at as string | null,
    cancelled_at: r.cancelled_at as string | null,
    notes: r.notes as string | null,
    created_at: r.created_at as string,
    supplier_name:
      (r.suppliers as unknown as { name?: string } | null)?.name ?? null,
    invoice_number:
      (r.invoices as unknown as {
        invoice_number?: string | null;
      } | null)?.invoice_number ?? null,
    invoice_issued_at:
      (r.invoices as unknown as { issued_at?: string | null } | null)?.issued_at ??
      null,
    line_count: Array.isArray(r.credit_note_lines)
      ? (r.credit_note_lines as unknown as unknown[]).length
      : 0,
  }));
}

export async function getCreditNote(
  creditNoteId: string,
): Promise<CreditNoteDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('credit_notes')
    .select(
      'id, site_id, supplier_id, source_invoice_id, reference, status, total, currency, sent_at, resolved_at, cancelled_at, notes, created_at, suppliers:supplier_id (name), invoices:source_invoice_id (invoice_number, issued_at), credit_note_lines (id, source_invoice_line_id, raw_name, qty, qty_unit, unit_price, line_total, reason, note, position)',
    )
    .eq('id', creditNoteId)
    .single();
  if (error || !data) return null;
  const lines = ((data.credit_note_lines as unknown as CreditNoteLine[]) ?? [])
    .map((l) => ({
      ...l,
      qty: Number(l.qty),
      unit_price: Number(l.unit_price),
      line_total: Number(l.line_total),
    }))
    .sort((a, b) => a.position - b.position);
  return {
    id: data.id as string,
    site_id: data.site_id as string,
    supplier_id: data.supplier_id as string,
    source_invoice_id: data.source_invoice_id as string,
    reference: data.reference as string,
    status: data.status as CreditNoteStatus,
    total: Number(data.total),
    currency: data.currency as string,
    sent_at: data.sent_at as string | null,
    resolved_at: data.resolved_at as string | null,
    cancelled_at: data.cancelled_at as string | null,
    notes: data.notes as string | null,
    created_at: data.created_at as string,
    supplier_name:
      (data.suppliers as unknown as { name?: string } | null)?.name ?? null,
    invoice_number:
      (data.invoices as unknown as {
        invoice_number?: string | null;
      } | null)?.invoice_number ?? null,
    invoice_issued_at:
      (data.invoices as unknown as { issued_at?: string | null } | null)
        ?.issued_at ?? null,
    line_count: lines.length,
    lines,
  };
}

export async function getCreditNoteForInvoice(
  invoiceId: string,
): Promise<CreditNoteRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('credit_notes')
    .select('id, status, reference')
    .eq('source_invoice_id', invoiceId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id as string,
    site_id: '',
    supplier_id: '',
    source_invoice_id: invoiceId,
    reference: data.reference as string,
    status: data.status as CreditNoteStatus,
    total: 0,
    currency: 'GBP',
    sent_at: null,
    resolved_at: null,
    cancelled_at: null,
    notes: null,
    created_at: '',
    supplier_name: null,
    invoice_number: null,
    invoice_issued_at: null,
    line_count: 0,
  };
}

export async function countDraftCreditNotes(siteId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from('credit_notes')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', siteId)
    .in('status', ['draft', 'sent']);
  return count ?? 0;
}
