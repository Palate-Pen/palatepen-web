'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

/**
 * Confirm a scanned/flagged invoice via server action. Mirrors the
 * /api/palatable/confirm-invoice route logic — extracted here so the
 * UI's Confirm button doesn't have to round-trip through fetch.
 */
export async function confirmInvoiceAction(invoiceId: string): Promise<void> {
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

export async function rejectInvoiceAction(invoiceId: string): Promise<void> {
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
