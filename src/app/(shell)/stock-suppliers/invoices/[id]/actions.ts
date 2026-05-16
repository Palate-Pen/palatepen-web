'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { requireFeature } from '@/lib/features';

/**
 * Confirm a scanned/flagged invoice via server action. Mirrors the
 * /api/palatable/confirm-invoice route logic — extracted here so the
 * UI's Confirm button doesn't have to round-trip through fetch.
 */
export async function confirmInvoiceAction(invoiceId: string): Promise<void> {
  const gate = await requireFeature('invoices.confirm');
  if (!gate.ok) throw new Error(gate.error);

  const supabaseUser = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();
  if (!user) redirect('/signin');

  // Load via user client so RLS rejects access to invoices on other sites.
  const { data: invoice } = await supabaseUser
    .from('invoices')
    .select('id, site_id, issued_at, status, delivery_id')
    .eq('id', invoiceId)
    .single();
  if (!invoice) {
    redirect('/stock-suppliers/invoices/' + invoiceId + '?error=not_found');
  }
  if (invoice.status === 'confirmed') {
    redirect('/stock-suppliers/invoices/' + invoiceId);
  }

  const service = createSupabaseServiceClient();
  const { data: lines } = await service
    .from('invoice_lines')
    .select('id, ingredient_id, unit_price')
    .eq('invoice_id', invoiceId);

  const issuedAt =
    (invoice.issued_at as string | null) ?? new Date().toISOString();
  const issuedIso = issuedAt.length === 10 ? `${issuedAt}T12:00:00Z` : issuedAt;

  const linesWithIng = (lines ?? []).filter((l) => l.ingredient_id != null);

  if (linesWithIng.length > 0) {
    await service.from('ingredient_price_history').insert(
      linesWithIng.map((l) => ({
        ingredient_id: l.ingredient_id as string,
        price: l.unit_price,
        source: 'invoice' as const,
        recorded_at: issuedIso,
        notes: `Invoice ${invoiceId.slice(0, 8)}`,
      })),
    );
    for (const l of linesWithIng) {
      await service
        .from('ingredients')
        .update({
          current_price: l.unit_price,
          last_seen_at: issuedIso,
        })
        .eq('id', l.ingredient_id as string);
    }
  }

  await service
    .from('invoices')
    .update({
      status: 'confirmed',
      delivery_confirmation: 'confirmed',
    })
    .eq('id', invoiceId);

  if (invoice.delivery_id) {
    await service
      .from('deliveries')
      .update({
        status: 'arrived',
        arrived_at: issuedAt.slice(0, 10),
      })
      .eq('id', invoice.delivery_id as string);
  }

  revalidatePath('/stock-suppliers');
  revalidatePath('/stock-suppliers/the-bank');
  revalidatePath('/stock-suppliers/invoices/' + invoiceId);
  redirect('/stock-suppliers/invoices/' + invoiceId + '?confirmed=1');
}

/**
 * Flag (or un-flag) a single invoice line for discrepancy. Used by the
 * inline button on each invoice-detail line.
 *
 * Semantics:
 *   - If `note` is non-empty or `qtyShort` is non-zero, the line is
 *     considered flagged. Update both columns.
 *   - If both are empty/zero, the line is cleared.
 *   - After every line write, recompute whether the invoice has ANY
 *     flagged lines and flip invoice.status to 'flagged' or back to
 *     'scanned' accordingly. We don't auto-confirm — that's the chef's
 *     explicit action via confirmInvoiceAction.
 *
 * Returns void; caller revalidates via router.refresh().
 */
export type FlagLineInput = {
  invoiceId: string;
  lineId: string;
  qtyShort: number | null;
  note: string;
};

type ActionResult = { ok: true } | { ok: false; error: string };

export async function flagInvoiceLineAction(
  input: FlagLineInput,
): Promise<ActionResult> {
  const gate = await requireFeature('invoices.flag');
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  // Verify the user has access to this invoice (RLS via user client).
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, status')
    .eq('id', input.invoiceId)
    .single();
  if (!invoice) return { ok: false, error: 'invoice_not_found' };
  if (invoice.status === 'confirmed') {
    return { ok: false, error: 'already_confirmed' };
  }

  const trimmedNote = input.note.trim();
  const qty = input.qtyShort != null && Number.isFinite(input.qtyShort)
    ? Math.round(input.qtyShort * 1000) / 1000
    : null;

  const { error: updErr } = await supabase
    .from('invoice_lines')
    .update({
      discrepancy_qty: qty,
      discrepancy_note: trimmedNote.length > 0 ? trimmedNote : null,
    })
    .eq('id', input.lineId)
    .eq('invoice_id', input.invoiceId);
  if (updErr) return { ok: false, error: updErr.message };

  // Recompute flagged state for the parent invoice.
  const { data: lines } = await supabase
    .from('invoice_lines')
    .select('discrepancy_qty, discrepancy_note')
    .eq('invoice_id', input.invoiceId);
  const anyFlagged = (lines ?? []).some(
    (l) =>
      (l.discrepancy_qty != null &&
        Number.isFinite(Number(l.discrepancy_qty)) &&
        Number(l.discrepancy_qty) !== 0) ||
      (typeof l.discrepancy_note === 'string' &&
        l.discrepancy_note.trim() !== ''),
  );

  const nextStatus = anyFlagged ? 'flagged' : 'scanned';
  if (nextStatus !== invoice.status) {
    await supabase
      .from('invoices')
      .update({ status: nextStatus })
      .eq('id', input.invoiceId);
  }

  revalidatePath('/stock-suppliers');
  revalidatePath('/stock-suppliers/invoices');
  revalidatePath('/stock-suppliers/invoices/' + input.invoiceId);
  return { ok: true };
}

export async function rejectInvoiceAction(invoiceId: string): Promise<void> {
  const gate = await requireFeature('invoices.confirm');
  if (!gate.ok) throw new Error(gate.error);

  const supabaseUser = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();
  if (!user) redirect('/signin');

  const service = createSupabaseServiceClient();
  // RLS via user-client lookup first to confirm ownership; the actual
  // mutation runs as service_role for delivery-arrived consistency.
  const { data: invoice } = await supabaseUser
    .from('invoices')
    .select('id')
    .eq('id', invoiceId)
    .single();
  if (!invoice) {
    redirect('/stock-suppliers');
  }

  await service
    .from('invoices')
    .update({ status: 'rejected' })
    .eq('id', invoiceId);

  revalidatePath('/stock-suppliers');
  redirect('/stock-suppliers?rejected=' + invoiceId);
}
