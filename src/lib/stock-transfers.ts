import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export type TransferPool = 'kitchen' | 'bar';
export type TransferStatus =
  | 'draft'
  | 'sent'
  | 'received'
  | 'cancelled';

export const TRANSFER_STATUS_LABEL: Record<TransferStatus, string> = {
  draft: 'Draft',
  sent: 'In Transit',
  received: 'Received',
  cancelled: 'Cancelled',
};

export const TRANSFER_POOL_LABEL: Record<TransferPool, string> = {
  kitchen: 'Kitchen',
  bar: 'Bar',
};

export type TransferLine = {
  id: string;
  transfer_id: string;
  source_ingredient_id: string | null;
  dest_ingredient_id: string | null;
  raw_name: string;
  qty: number;
  qty_unit: string;
  unit_cost: number | null;
  line_total: number | null;
  position: number;
  notes: string | null;
};

export type TransferRow = {
  id: string;
  source_site_id: string;
  source_site_name: string | null;
  source_pool: TransferPool;
  dest_site_id: string;
  dest_site_name: string | null;
  dest_pool: TransferPool;
  reference: string;
  status: TransferStatus;
  total_value: number;
  notes: string | null;
  sent_at: string | null;
  received_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  line_count: number;
};

export type TransferDetail = TransferRow & {
  lines: TransferLine[];
};

export function generateTransferReference(): string {
  const d = new Date();
  const stamp =
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0');
  const tail = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `XF-${stamp}-${tail}`;
}

/**
 * List transfers visible to the current user, optionally filtered by
 * "perspective" — outbound (source_site_id matches) or inbound
 * (dest_site_id matches). When no perspective is given, returns every
 * transfer the user can see (RLS = either side).
 */
export async function listTransfers(
  siteId: string | null,
  perspective: 'outbound' | 'inbound' | 'all' = 'all',
): Promise<TransferRow[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('stock_transfers')
    .select(
      'id, source_site_id, source_pool, dest_site_id, dest_pool, reference, status, total_value, notes, sent_at, received_at, cancelled_at, created_at, ' +
        'source_site:source_site_id (name), ' +
        'dest_site:dest_site_id (name), ' +
        'stock_transfer_lines (id)',
    )
    .order('created_at', { ascending: false });

  if (siteId && perspective === 'outbound') {
    query = query.eq('source_site_id', siteId);
  } else if (siteId && perspective === 'inbound') {
    query = query.eq('dest_site_id', siteId);
  } else if (siteId && perspective === 'all') {
    query = query.or(`source_site_id.eq.${siteId},dest_site_id.eq.${siteId}`);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  const rows = data as unknown as Array<Record<string, unknown>>;
  return rows.map((r): TransferRow => {
    const source = r.source_site as { name: string | null } | null;
    const dest = r.dest_site as { name: string | null } | null;
    const lines = r.stock_transfer_lines as Array<{ id: string }> | null;
    return {
      id: r.id as string,
      source_site_id: r.source_site_id as string,
      source_site_name: source?.name ?? null,
      source_pool: r.source_pool as TransferPool,
      dest_site_id: r.dest_site_id as string,
      dest_site_name: dest?.name ?? null,
      dest_pool: r.dest_pool as TransferPool,
      reference: r.reference as string,
      status: r.status as TransferStatus,
      total_value: Number(r.total_value ?? 0),
      notes: (r.notes as string | null) ?? null,
      sent_at: (r.sent_at as string | null) ?? null,
      received_at: (r.received_at as string | null) ?? null,
      cancelled_at: (r.cancelled_at as string | null) ?? null,
      created_at: r.created_at as string,
      line_count: lines?.length ?? 0,
    };
  });
}

export async function getTransfer(
  transferId: string,
): Promise<TransferDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data: headerRaw } = await supabase
    .from('stock_transfers')
    .select(
      'id, source_site_id, source_pool, dest_site_id, dest_pool, reference, status, total_value, notes, sent_at, received_at, cancelled_at, created_at, ' +
        'source_site:source_site_id (name), ' +
        'dest_site:dest_site_id (name)',
    )
    .eq('id', transferId)
    .maybeSingle();
  if (!headerRaw) return null;
  const header = headerRaw as unknown as Record<string, unknown>;

  const { data: linesRaw } = await supabase
    .from('stock_transfer_lines')
    .select(
      'id, transfer_id, source_ingredient_id, dest_ingredient_id, raw_name, qty, qty_unit, unit_cost, line_total, position, notes',
    )
    .eq('transfer_id', transferId)
    .order('position', { ascending: true });
  const lines = linesRaw as unknown as Array<Record<string, unknown>> | null;

  const source = header.source_site as { name: string | null } | null;
  const dest = header.dest_site as { name: string | null } | null;

  return {
    id: header.id as string,
    source_site_id: header.source_site_id as string,
    source_site_name: source?.name ?? null,
    source_pool: header.source_pool as TransferPool,
    dest_site_id: header.dest_site_id as string,
    dest_site_name: dest?.name ?? null,
    dest_pool: header.dest_pool as TransferPool,
    reference: header.reference as string,
    status: header.status as TransferStatus,
    total_value: Number(header.total_value ?? 0),
    notes: (header.notes as string | null) ?? null,
    sent_at: (header.sent_at as string | null) ?? null,
    received_at: (header.received_at as string | null) ?? null,
    cancelled_at: (header.cancelled_at as string | null) ?? null,
    created_at: header.created_at as string,
    line_count: lines?.length ?? 0,
    lines: (lines ?? []).map(
      (l): TransferLine => ({
        id: l.id as string,
        transfer_id: l.transfer_id as string,
        source_ingredient_id: (l.source_ingredient_id as string | null) ?? null,
        dest_ingredient_id: (l.dest_ingredient_id as string | null) ?? null,
        raw_name: l.raw_name as string,
        qty: Number(l.qty),
        qty_unit: l.qty_unit as string,
        unit_cost: l.unit_cost != null ? Number(l.unit_cost) : null,
        line_total: l.line_total != null ? Number(l.line_total) : null,
        position: Number(l.position ?? 0),
        notes: (l.notes as string | null) ?? null,
      }),
    ),
  };
}

export async function countOpenTransfers(siteId: string): Promise<{
  outbound_in_transit: number;
  inbound_awaiting: number;
}> {
  const supabase = await createSupabaseServerClient();
  const [{ count: outbound }, { count: inbound }] = await Promise.all([
    supabase
      .from('stock_transfers')
      .select('id', { count: 'exact', head: true })
      .eq('source_site_id', siteId)
      .eq('status', 'sent'),
    supabase
      .from('stock_transfers')
      .select('id', { count: 'exact', head: true })
      .eq('dest_site_id', siteId)
      .eq('status', 'sent'),
  ]);
  return {
    outbound_in_transit: outbound ?? 0,
    inbound_awaiting: inbound ?? 0,
  };
}

/**
 * Apply the "sent" side-effect on the source pool.
 *
 * For intra-site transfers (source_site_id == dest_site_id) the inventory
 * is shared across pools at the same site, so no stock change is made —
 * the transfer is recorded but the source row's current_stock stays put.
 * For cross-site, decrement source ingredient.current_stock by the line qty.
 *
 * Uses the service-role client because the source-side decrement may
 * happen from a user without write access to the destination site, and
 * we want the side-effect to be deterministic.
 */
export async function applySentSideEffects(
  transferId: string,
): Promise<void> {
  const admin = createSupabaseServiceClient();
  const { data: header } = await admin
    .from('stock_transfers')
    .select('id, source_site_id, dest_site_id, status')
    .eq('id', transferId)
    .maybeSingle();
  if (!header) return;
  if (header.status !== 'sent') return;
  if (header.source_site_id === header.dest_site_id) return;

  const { data: lines } = await admin
    .from('stock_transfer_lines')
    .select('source_ingredient_id, qty')
    .eq('transfer_id', transferId);
  if (!lines) return;

  for (const l of lines) {
    if (!l.source_ingredient_id) continue;
    const { data: ing } = await admin
      .from('ingredients')
      .select('current_stock')
      .eq('id', l.source_ingredient_id)
      .maybeSingle();
    if (!ing) continue;
    const current = ing.current_stock != null ? Number(ing.current_stock) : 0;
    const next = Math.max(0, current - Number(l.qty));
    await admin
      .from('ingredients')
      .update({ current_stock: next })
      .eq('id', l.source_ingredient_id);
  }
}

/**
 * Apply the "received" side-effect on the destination pool.
 *
 * For intra-site transfers: no stock change (shared inventory).
 * For cross-site: try to match each line to an ingredient at the dest
 * site by name (case-insensitive). If found, set dest_ingredient_id and
 * increment its current_stock by qty. If not, leave dest_ingredient_id
 * null and surface as "needs linking" in the UI.
 */
export async function applyReceivedSideEffects(
  transferId: string,
): Promise<void> {
  const admin = createSupabaseServiceClient();
  const { data: header } = await admin
    .from('stock_transfers')
    .select('id, source_site_id, dest_site_id, status')
    .eq('id', transferId)
    .maybeSingle();
  if (!header) return;
  if (header.status !== 'received') return;
  if (header.source_site_id === header.dest_site_id) return;

  const { data: lines } = await admin
    .from('stock_transfer_lines')
    .select('id, source_ingredient_id, dest_ingredient_id, raw_name, qty')
    .eq('transfer_id', transferId);
  if (!lines) return;

  for (const l of lines) {
    let destId = l.dest_ingredient_id as string | null;
    if (!destId) {
      const { data: match } = await admin
        .from('ingredients')
        .select('id, current_stock')
        .eq('site_id', header.dest_site_id)
        .ilike('name', String(l.raw_name).trim())
        .limit(1)
        .maybeSingle();
      if (match) {
        destId = match.id as string;
        await admin
          .from('stock_transfer_lines')
          .update({ dest_ingredient_id: destId })
          .eq('id', l.id);
      }
    }
    if (!destId) continue;
    const { data: ing } = await admin
      .from('ingredients')
      .select('current_stock')
      .eq('id', destId)
      .maybeSingle();
    if (!ing) continue;
    const current = ing.current_stock != null ? Number(ing.current_stock) : 0;
    const next = current + Number(l.qty);
    await admin
      .from('ingredients')
      .update({ current_stock: next })
      .eq('id', destId);
  }
}
