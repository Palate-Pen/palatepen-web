'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  generateTransferReference,
  applySentSideEffects,
  applyReceivedSideEffects,
  type TransferPool,
} from '@/lib/stock-transfers';
import { getShellContext } from '@/lib/shell/context';

type LineInput = {
  source_ingredient_id: string | null;
  raw_name: string;
  qty: number;
  qty_unit: string;
  unit_cost: number | null;
  notes: string | null;
};

function lineTotal(qty: number, cost: number | null): number | null {
  if (cost == null) return null;
  return Math.round(qty * cost * 100) / 100;
}

function sumLines(lines: LineInput[]): number {
  let total = 0;
  for (const l of lines) {
    const lt = lineTotal(l.qty, l.unit_cost);
    if (lt != null) total += lt;
  }
  return Math.round(total * 100) / 100;
}

export async function draftTransferAction(formData: FormData): Promise<void> {
  const sourcePool = String(formData.get('source_pool') ?? '').trim() as TransferPool;
  const destSiteId = String(formData.get('dest_site_id') ?? '').trim();
  const destPool = String(formData.get('dest_pool') ?? '').trim() as TransferPool;
  const notes = String(formData.get('notes') ?? '').trim() || null;

  if (!sourcePool || !destSiteId || !destPool) return;
  const ctx = await getShellContext();
  if (sourcePool === destPool && destSiteId === ctx.siteId) return;

  const supabase = await createSupabaseServerClient();
  const reference = generateTransferReference();
  const { data, error } = await supabase
    .from('stock_transfers')
    .insert({
      source_site_id: ctx.siteId,
      source_pool: sourcePool,
      dest_site_id: destSiteId,
      dest_pool: destPool,
      reference,
      status: 'draft',
      total_value: 0,
      notes,
    })
    .select('id')
    .single();
  if (error || !data) return;
  revalidatePath('/stock-suppliers/transfers');
  revalidatePath('/bartender/back-bar/transfers');
  revalidatePath('/owner/transfers');
  redirect(`/stock-suppliers/transfers/${data.id}`);
}

export async function updateTransferLinesAction(payload: {
  id: string;
  notes: string | null;
  lines: LineInput[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const { error: delErr } = await supabase
    .from('stock_transfer_lines')
    .delete()
    .eq('transfer_id', payload.id);
  if (delErr) return { ok: false, error: delErr.message };

  if (payload.lines.length > 0) {
    const rows = payload.lines.map((l, i) => ({
      transfer_id: payload.id,
      source_ingredient_id: l.source_ingredient_id,
      raw_name: l.raw_name,
      qty: l.qty,
      qty_unit: l.qty_unit,
      unit_cost: l.unit_cost,
      line_total: lineTotal(l.qty, l.unit_cost),
      position: i,
      notes: l.notes,
    }));
    const { error: insErr } = await supabase
      .from('stock_transfer_lines')
      .insert(rows);
    if (insErr) return { ok: false, error: insErr.message };
  }

  const total = sumLines(payload.lines);
  const { error: headerErr } = await supabase
    .from('stock_transfers')
    .update({ notes: payload.notes, total_value: total })
    .eq('id', payload.id);
  if (headerErr) return { ok: false, error: headerErr.message };

  revalidatePath(`/stock-suppliers/transfers/${payload.id}`);
  revalidatePath(`/bartender/back-bar/transfers/${payload.id}`);
  return { ok: true };
}

export async function sendTransferAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;
  const supabase = await createSupabaseServerClient();
  await supabase
    .from('stock_transfers')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id);
  await applySentSideEffects(id);
  revalidatePath(`/stock-suppliers/transfers/${id}`);
  revalidatePath(`/bartender/back-bar/transfers/${id}`);
  revalidatePath('/stock-suppliers/transfers');
  revalidatePath('/bartender/back-bar/transfers');
  revalidatePath('/owner/transfers');
  revalidatePath('/stock-suppliers');
}

export async function receiveTransferAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;
  const supabase = await createSupabaseServerClient();
  await supabase
    .from('stock_transfers')
    .update({ status: 'received', received_at: new Date().toISOString() })
    .eq('id', id);
  await applyReceivedSideEffects(id);
  revalidatePath(`/stock-suppliers/transfers/${id}`);
  revalidatePath(`/bartender/back-bar/transfers/${id}`);
  revalidatePath('/stock-suppliers/transfers');
  revalidatePath('/bartender/back-bar/transfers');
  revalidatePath('/owner/transfers');
  revalidatePath('/stock-suppliers');
}

export async function cancelTransferAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;
  const supabase = await createSupabaseServerClient();
  await supabase
    .from('stock_transfers')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', id);
  revalidatePath(`/stock-suppliers/transfers/${id}`);
  revalidatePath(`/bartender/back-bar/transfers/${id}`);
  revalidatePath('/stock-suppliers/transfers');
  revalidatePath('/bartender/back-bar/transfers');
  revalidatePath('/owner/transfers');
}
