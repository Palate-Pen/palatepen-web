import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

/**
 * Confirm a scanned invoice — closes the auto-Bank-update loop.
 *
 * Caller sends { invoice_id } in JSON body. Endpoint:
 *   1. Validates the user has owner/manager/chef on the invoice's site.
 *   2. Loads invoice + lines.
 *   3. For each line where ingredient_id is set:
 *      - Writes a row to v2.ingredient_price_history (price=unit_price,
 *        recorded_at=invoice.issued_at, source='invoice').
 *      - Updates v2.ingredients.current_price = unit_price,
 *        last_seen_at = invoice.issued_at.
 *   4. Updates invoice.status = 'confirmed',
 *      delivery_confirmation = 'confirmed'.
 *   5. If invoice.delivery_id is set, updates that delivery.status to
 *      'arrived' and arrived_at = invoice.issued_at.
 *
 * This is the wedge: from this point forward, the next cron run of
 * market-moves and recipe-staleness will see the new Bank prices and
 * emit appropriate forward_signals. Auto-maintained costing in action.
 */

type ConfirmRequest = {
  invoice_id: string;
};

export async function POST(req: Request) {
  // 1. Auth
  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 2. Parse body
  const body = (await req.json().catch(() => null)) as ConfirmRequest | null;
  if (!body?.invoice_id) {
    return NextResponse.json(
      { error: 'missing_invoice_id' },
      { status: 400 },
    );
  }
  const invoiceId = body.invoice_id;

  // 3. Membership check — load invoice via user client so RLS naturally
  //    rejects access to other sites' invoices.
  const { data: invoice, error: invoiceErr } = await supabaseUser
    .from('invoices')
    .select('id, site_id, supplier_id, issued_at, status, delivery_id')
    .eq('id', invoiceId)
    .single();
  if (invoiceErr || !invoice) {
    return NextResponse.json(
      { error: 'invoice_not_found', detail: invoiceErr?.message },
      { status: 404 },
    );
  }
  if (invoice.status === 'confirmed') {
    return NextResponse.json(
      { error: 'already_confirmed' },
      { status: 409 },
    );
  }

  // 4. Load lines and apply price history
  const service = createSupabaseServiceClient();
  const { data: lines, error: linesErr } = await service
    .from('invoice_lines')
    .select('id, ingredient_id, raw_name, qty, qty_unit, unit_price')
    .eq('invoice_id', invoiceId);
  if (linesErr) {
    return NextResponse.json(
      { error: 'lines_load_failed', detail: linesErr.message },
      { status: 500 },
    );
  }

  const issuedAt =
    (invoice.issued_at as string | null) ?? new Date().toISOString();
  const issuedIso = issuedAt.length === 10 ? `${issuedAt}T12:00:00Z` : issuedAt;

  let priceHistoryInserts = 0;
  let ingredientUpdates = 0;

  const linesWithIng = (lines ?? []).filter(
    (l) => l.ingredient_id != null,
  );

  if (linesWithIng.length > 0) {
    const historyRows = linesWithIng.map((l) => ({
      ingredient_id: l.ingredient_id as string,
      price: l.unit_price,
      source: 'invoice' as const,
      recorded_at: issuedIso,
      notes: `Invoice ${invoiceId.slice(0, 8)}`,
    }));
    const { error: historyErr } = await service
      .from('ingredient_price_history')
      .insert(historyRows);
    if (historyErr) {
      return NextResponse.json(
        { error: 'history_insert_failed', detail: historyErr.message },
        { status: 500 },
      );
    }
    priceHistoryInserts = historyRows.length;

    // Update ingredient current_price + last_seen_at one at a time.
    // Supabase doesn't support multi-row UPDATE with different values
    // in a single round-trip without a custom RPC; for the typical
    // invoice (≤30 lines) the per-row update is fine.
    for (const l of linesWithIng) {
      const { error: updErr } = await service
        .from('ingredients')
        .update({
          current_price: l.unit_price,
          last_seen_at: issuedIso,
        })
        .eq('id', l.ingredient_id as string);
      if (!updErr) ingredientUpdates += 1;
    }
  }

  // 5. Flip invoice status + delivery confirmation
  const { error: invoiceUpdateErr } = await service
    .from('invoices')
    .update({
      status: 'confirmed',
      delivery_confirmation: 'confirmed',
    })
    .eq('id', invoiceId);
  if (invoiceUpdateErr) {
    return NextResponse.json(
      { error: 'invoice_update_failed', detail: invoiceUpdateErr.message },
      { status: 500 },
    );
  }

  // 6. Mark linked delivery as arrived
  if (invoice.delivery_id) {
    await service
      .from('deliveries')
      .update({
        status: 'arrived',
        arrived_at: issuedAt.slice(0, 10),
      })
      .eq('id', invoice.delivery_id as string);
  }

  return NextResponse.json({
    ok: true,
    invoice_id: invoiceId,
    price_history_inserts: priceHistoryInserts,
    ingredient_updates: ingredientUpdates,
    lines_unmatched: (lines ?? []).length - linesWithIng.length,
    delivery_marked_arrived: invoice.delivery_id != null,
  });
}
