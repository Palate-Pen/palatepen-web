/**
 * Server-side credit-note data fetchers. Client components must import
 * types + utils from @/lib/credit-notes-shared instead — this file
 * pulls in Supabase server client which requires next/headers.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  CreditNoteDetail,
  CreditNoteLine,
  CreditNoteRow,
  CreditNoteStatus,
} from '@/lib/credit-notes-shared';

export type {
  CreditNoteDetail,
  CreditNoteLine,
  CreditNoteLineReason,
  CreditNoteRow,
  CreditNoteStatus,
  DraftableLine,
} from '@/lib/credit-notes-shared';
export {
  CREDIT_NOTE_LINE_REASON_LABEL,
  CREDIT_NOTE_STATUS_LABEL,
  flaggedInvoiceLinesToDrafts,
  generateCreditNoteReference,
} from '@/lib/credit-notes-shared';

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
    .in('status', ['draft', 'sent'])
    .is('cancelled_at', null);
  return count ?? 0;
}
