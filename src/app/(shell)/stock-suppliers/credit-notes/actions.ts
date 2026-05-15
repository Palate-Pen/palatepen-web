'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  flaggedInvoiceLinesToDrafts,
  generateCreditNoteReference,
  type CreditNoteLineReason,
} from '@/lib/credit-notes';

type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * Create a draft credit note seeded from a flagged invoice. 1:1 — the
 * unique constraint on source_invoice_id will reject a second draft
 * against the same invoice. Returns the new credit_note_id so the caller
 * can redirect into edit mode.
 */
export async function createCreditNoteFromInvoiceAction(
  invoiceId: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .select('id, site_id, supplier_id, status')
    .eq('id', invoiceId)
    .single();
  if (invErr || !invoice) redirect('/stock-suppliers/invoices?error=not_found');
  if (!invoice.supplier_id) {
    redirect(
      '/stock-suppliers/invoices/' + invoiceId + '?error=no_supplier',
    );
  }

  const { data: existing } = await supabase
    .from('credit_notes')
    .select('id')
    .eq('source_invoice_id', invoiceId)
    .maybeSingle();
  if (existing) {
    redirect('/stock-suppliers/credit-notes/' + existing.id);
  }

  const { data: lines } = await supabase
    .from('invoice_lines')
    .select('id, raw_name, qty, qty_unit, unit_price, discrepancy_qty, discrepancy_note, position')
    .eq('invoice_id', invoiceId)
    .order('position', { ascending: true });
  const drafts = flaggedInvoiceLinesToDrafts(
    (lines ?? []).map((l) => ({
      id: l.id as string,
      raw_name: l.raw_name as string,
      qty: Number(l.qty),
      qty_unit: l.qty_unit as string,
      unit_price: Number(l.unit_price),
      discrepancy_qty:
        l.discrepancy_qty != null ? Number(l.discrepancy_qty) : null,
      discrepancy_note: l.discrepancy_note as string | null,
    })),
  );
  if (drafts.length === 0) {
    redirect(
      '/stock-suppliers/invoices/' + invoiceId + '?error=no_flagged_lines',
    );
  }

  const total = drafts.reduce(
    (s, d) => s + Math.round(d.qty * d.unit_price * 100) / 100,
    0,
  );

  const reference = generateCreditNoteReference();

  const { data: cn, error: cnErr } = await supabase
    .from('credit_notes')
    .insert({
      site_id: invoice.site_id as string,
      supplier_id: invoice.supplier_id as string,
      source_invoice_id: invoiceId,
      reference,
      status: 'draft',
      total: Math.round(total * 100) / 100,
      currency: 'GBP',
      created_by: user.id,
    })
    .select('id')
    .single();
  if (cnErr || !cn) {
    redirect(
      '/stock-suppliers/invoices/' + invoiceId + '?error=create_failed',
    );
  }

  const linePayload = drafts.map((d, i) => ({
    credit_note_id: cn.id as string,
    source_invoice_line_id: d.source_invoice_line_id,
    raw_name: d.raw_name,
    qty: d.qty,
    qty_unit: d.qty_unit,
    unit_price: d.unit_price,
    line_total: Math.round(d.qty * d.unit_price * 100) / 100,
    reason: d.reason,
    note: d.note || null,
    position: i,
  }));
  await supabase.from('credit_note_lines').insert(linePayload);

  revalidatePath('/stock-suppliers');
  revalidatePath('/stock-suppliers/invoices/' + invoiceId);
  revalidatePath('/stock-suppliers/credit-notes');
  redirect('/stock-suppliers/credit-notes/' + cn.id);
}

/**
 * Update line + header detail on a draft credit note. Re-tots after.
 * Only allowed on draft credit notes.
 */
export type UpdateCreditNoteInput = {
  creditNoteId: string;
  notes: string;
  lines: Array<{
    id: string;
    qty: number;
    unit_price: number;
    reason: CreditNoteLineReason;
    note: string;
  }>;
};

export async function updateCreditNoteAction(
  input: UpdateCreditNoteInput,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthenticated' };

  const { data: cn } = await supabase
    .from('credit_notes')
    .select('id, status')
    .eq('id', input.creditNoteId)
    .single();
  if (!cn) return { ok: false, error: 'not_found' };
  if (cn.status !== 'draft') {
    return { ok: false, error: 'not_editable_in_status_' + cn.status };
  }

  for (const line of input.lines) {
    const total = Math.round(line.qty * line.unit_price * 100) / 100;
    await supabase
      .from('credit_note_lines')
      .update({
        qty: line.qty,
        unit_price: line.unit_price,
        line_total: total,
        reason: line.reason,
        note: line.note.trim().length > 0 ? line.note.trim() : null,
      })
      .eq('id', line.id)
      .eq('credit_note_id', input.creditNoteId);
  }

  const newTotal = input.lines.reduce(
    (s, l) => s + Math.round(l.qty * l.unit_price * 100) / 100,
    0,
  );

  await supabase
    .from('credit_notes')
    .update({
      total: Math.round(newTotal * 100) / 100,
      notes: input.notes.trim().length > 0 ? input.notes.trim() : null,
    })
    .eq('id', input.creditNoteId);

  revalidatePath('/stock-suppliers/credit-notes');
  revalidatePath('/stock-suppliers/credit-notes/' + input.creditNoteId);
  return { ok: true };
}

export async function markCreditNoteSentAction(
  creditNoteId: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  await supabase
    .from('credit_notes')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', creditNoteId)
    .eq('status', 'draft');
  revalidatePath('/stock-suppliers/credit-notes');
  revalidatePath('/stock-suppliers/credit-notes/' + creditNoteId);
  redirect('/stock-suppliers/credit-notes/' + creditNoteId + '?sent=1');
}

export async function markCreditNoteResolvedAction(
  creditNoteId: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  await supabase
    .from('credit_notes')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', creditNoteId)
    .in('status', ['draft', 'sent']);
  revalidatePath('/stock-suppliers/credit-notes');
  revalidatePath('/stock-suppliers/credit-notes/' + creditNoteId);
  redirect('/stock-suppliers/credit-notes/' + creditNoteId);
}

export async function cancelCreditNoteAction(
  creditNoteId: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  await supabase
    .from('credit_notes')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', creditNoteId)
    .in('status', ['draft', 'sent']);
  revalidatePath('/stock-suppliers/credit-notes');
  revalidatePath('/stock-suppliers/credit-notes/' + creditNoteId);
  redirect('/stock-suppliers/credit-notes/' + creditNoteId);
}

export async function reopenCreditNoteAction(
  creditNoteId: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  await supabase
    .from('credit_notes')
    .update({
      status: 'draft',
      sent_at: null,
      resolved_at: null,
      cancelled_at: null,
    })
    .eq('id', creditNoteId);
  revalidatePath('/stock-suppliers/credit-notes/' + creditNoteId);
  redirect('/stock-suppliers/credit-notes/' + creditNoteId);
}
