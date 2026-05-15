'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  generatePurchaseOrderReference,
  getReorderSuggestionsBySupplier,
} from '@/lib/purchase-orders';
import { getShellContext } from '@/lib/shell/context';

type ActionResult = { ok: true; id: string } | { ok: false; error: string };

type LineInput = {
  ingredient_id: string | null;
  raw_name: string;
  qty: number;
  qty_unit: string;
  unit_price: number | null;
  notes: string | null;
};

function lineTotal(qty: number, price: number | null): number | null {
  if (price == null) return null;
  return Math.round(qty * price * 100) / 100;
}

function sumLines(lines: LineInput[]): number {
  let total = 0;
  for (const l of lines) {
    const lt = lineTotal(l.qty, l.unit_price);
    if (lt != null) total += lt;
  }
  return Math.round(total * 100) / 100;
}

/** Auto-draft a PO from the items below par for a given supplier. */
export async function draftPurchaseOrderFromBreaches(
  supplierId: string,
): Promise<ActionResult> {
  const ctx = await getShellContext();
  const supabase = await createSupabaseServerClient();

  const suggestions = await getReorderSuggestionsBySupplier(ctx.siteId);
  const match = suggestions.find((s) => s.supplier_id === supplierId);
  if (!match || match.rows.length === 0) {
    return {
      ok: false,
      error: 'No items below par for that supplier — nothing to draft.',
    };
  }

  const lines: LineInput[] = match.rows.map((r) => {
    const par = r.par_level ?? 0;
    const cur = r.current_stock ?? 0;
    const shortfall = Math.max(0, par - cur);
    // Round up to a sensible whole unit; chef refines on the detail page.
    const qty = Math.max(1, Math.ceil(shortfall));
    return {
      ingredient_id: r.ingredient_id,
      raw_name: r.name,
      qty,
      qty_unit: r.unit ?? 'each',
      unit_price: r.current_price ?? null,
      notes: null,
    };
  });

  const total = sumLines(lines);
  const reference = generatePurchaseOrderReference();

  const { data: header, error: headerErr } = await supabase
    .from('purchase_orders')
    .insert({
      site_id: ctx.siteId,
      supplier_id: supplierId,
      reference,
      status: 'draft',
      total,
      currency: 'GBP',
      notes: `Auto-drafted from ${lines.length} ${lines.length === 1 ? 'item' : 'items'} below par. Review qty and price before sending.`,
    })
    .select('id')
    .single();
  if (headerErr || !header) {
    return { ok: false, error: headerErr?.message ?? 'PO insert failed' };
  }

  const lineRows = lines.map((l, i) => ({
    purchase_order_id: header.id as string,
    ingredient_id: l.ingredient_id,
    raw_name: l.raw_name,
    qty: l.qty,
    qty_unit: l.qty_unit,
    unit_price: l.unit_price,
    line_total: lineTotal(l.qty, l.unit_price),
    position: i,
    notes: l.notes,
  }));
  const { error: linesErr } = await supabase
    .from('purchase_order_lines')
    .insert(lineRows);
  if (linesErr) {
    // Roll back the header.
    await supabase.from('purchase_orders').delete().eq('id', header.id);
    return { ok: false, error: linesErr.message };
  }

  revalidatePath('/stock-suppliers/purchase-orders');
  revalidatePath('/stock-suppliers');
  return { ok: true, id: header.id as string };
}

/** Draft a blank PO for the supplier. Chef fills in lines manually. */
export async function draftBlankPurchaseOrderAction(
  formData: FormData,
): Promise<void> {
  const supplierId = String(formData.get('supplier_id') ?? '').trim();
  if (!supplierId) return;
  const ctx = await getShellContext();
  const supabase = await createSupabaseServerClient();
  const reference = generatePurchaseOrderReference();
  const { data, error } = await supabase
    .from('purchase_orders')
    .insert({
      site_id: ctx.siteId,
      supplier_id: supplierId,
      reference,
      status: 'draft',
      total: 0,
      currency: 'GBP',
    })
    .select('id')
    .single();
  if (error || !data) return;
  revalidatePath('/stock-suppliers/purchase-orders');
  revalidatePath('/stock-suppliers');
  redirect(`/stock-suppliers/purchase-orders/${data.id}`);
}

export async function sendPurchaseOrderAction(
  formData: FormData,
): Promise<void> {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;
  const supabase = await createSupabaseServerClient();
  await supabase
    .from('purchase_orders')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id);
  revalidatePath(`/stock-suppliers/purchase-orders/${id}`);
  revalidatePath('/stock-suppliers/purchase-orders');
  revalidatePath('/stock-suppliers');
}

export async function markConfirmedAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;
  const supabase = await createSupabaseServerClient();
  await supabase
    .from('purchase_orders')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', id);
  revalidatePath(`/stock-suppliers/purchase-orders/${id}`);
  revalidatePath('/stock-suppliers/purchase-orders');
}

export async function markReceivedAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;
  const supabase = await createSupabaseServerClient();
  await supabase
    .from('purchase_orders')
    .update({ status: 'received', received_at: new Date().toISOString() })
    .eq('id', id);
  revalidatePath(`/stock-suppliers/purchase-orders/${id}`);
  revalidatePath('/stock-suppliers/purchase-orders');
  revalidatePath('/stock-suppliers');
}

export async function cancelPurchaseOrderAction(
  formData: FormData,
): Promise<void> {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;
  const supabase = await createSupabaseServerClient();
  await supabase
    .from('purchase_orders')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', id);
  revalidatePath(`/stock-suppliers/purchase-orders/${id}`);
  revalidatePath('/stock-suppliers/purchase-orders');
}

export async function updatePurchaseOrderLinesAction(payload: {
  id: string;
  notes: string | null;
  expected_at: string | null;
  lines: LineInput[];
}): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  // Replace lines wholesale — simpler than tracking diffs, and PO line
  // counts are small (10–30 typical max).
  const { error: delErr } = await supabase
    .from('purchase_order_lines')
    .delete()
    .eq('purchase_order_id', payload.id);
  if (delErr) return { ok: false, error: delErr.message };

  if (payload.lines.length > 0) {
    const rows = payload.lines.map((l, i) => ({
      purchase_order_id: payload.id,
      ingredient_id: l.ingredient_id,
      raw_name: l.raw_name,
      qty: l.qty,
      qty_unit: l.qty_unit,
      unit_price: l.unit_price,
      line_total: lineTotal(l.qty, l.unit_price),
      position: i,
      notes: l.notes,
    }));
    const { error: insErr } = await supabase
      .from('purchase_order_lines')
      .insert(rows);
    if (insErr) return { ok: false, error: insErr.message };
  }

  const total = sumLines(payload.lines);
  const { error: headerErr } = await supabase
    .from('purchase_orders')
    .update({
      notes: payload.notes,
      expected_at: payload.expected_at,
      total,
    })
    .eq('id', payload.id);
  if (headerErr) return { ok: false, error: headerErr.message };

  revalidatePath(`/stock-suppliers/purchase-orders/${payload.id}`);
  return { ok: true, id: payload.id };
}
