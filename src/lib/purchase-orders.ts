/**
 * Server-side purchase order data fetchers + helpers.
 *
 * The PO is Phase 3's ordering loop: chef spots items below par, drafts
 * a PO grouped by supplier (or supplier-by-supplier), reviews lines,
 * sends, and marks received when stock arrives. Auto-reorder
 * suggestions are surfaced via `getReorderSuggestionsBySupplier()` —
 * items below par grouped by their default supplier.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getBankRows, type BankRow } from '@/lib/bank';

export type PurchaseOrderStatus =
  | 'draft'
  | 'sent'
  | 'confirmed'
  | 'received'
  | 'cancelled';

export type PurchaseOrderLine = {
  id: string;
  purchase_order_id: string;
  ingredient_id: string | null;
  raw_name: string;
  qty: number;
  qty_unit: string;
  unit_price: number | null;
  line_total: number | null;
  position: number;
  notes: string | null;
};

export type PurchaseOrderRow = {
  id: string;
  site_id: string;
  supplier_id: string;
  reference: string;
  status: PurchaseOrderStatus;
  total: number;
  currency: string;
  expected_at: string | null;
  sent_at: string | null;
  confirmed_at: string | null;
  received_at: string | null;
  cancelled_at: string | null;
  notes: string | null;
  created_at: string;
  supplier_name: string | null;
  line_count: number;
};

export type PurchaseOrderDetail = PurchaseOrderRow & {
  lines: PurchaseOrderLine[];
};

export const PO_STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  confirmed: 'Confirmed',
  received: 'Received',
  cancelled: 'Cancelled',
};

const NANO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** PO-YYYYMMDD-XXXXXX format. Unique per site. */
export function generatePurchaseOrderReference(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += NANO[Math.floor(Math.random() * NANO.length)];
  }
  return `PO-${yyyy}${mm}${dd}-${suffix}`;
}

export async function listPurchaseOrders(
  siteId: string,
): Promise<PurchaseOrderRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(
      'id, site_id, supplier_id, reference, status, total, currency, expected_at, sent_at, confirmed_at, received_at, cancelled_at, notes, created_at, suppliers:supplier_id (name), purchase_order_lines (id)',
    )
    .eq('site_id', siteId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id as string,
    site_id: r.site_id as string,
    supplier_id: r.supplier_id as string,
    reference: r.reference as string,
    status: r.status as PurchaseOrderStatus,
    total: Number(r.total),
    currency: r.currency as string,
    expected_at: r.expected_at as string | null,
    sent_at: r.sent_at as string | null,
    confirmed_at: r.confirmed_at as string | null,
    received_at: r.received_at as string | null,
    cancelled_at: r.cancelled_at as string | null,
    notes: r.notes as string | null,
    created_at: r.created_at as string,
    supplier_name:
      (r.suppliers as unknown as { name?: string } | null)?.name ?? null,
    line_count: Array.isArray(r.purchase_order_lines)
      ? (r.purchase_order_lines as unknown as unknown[]).length
      : 0,
  }));
}

export async function getPurchaseOrder(
  poId: string,
): Promise<PurchaseOrderDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(
      'id, site_id, supplier_id, reference, status, total, currency, expected_at, sent_at, confirmed_at, received_at, cancelled_at, notes, created_at, suppliers:supplier_id (name), purchase_order_lines (id, purchase_order_id, ingredient_id, raw_name, qty, qty_unit, unit_price, line_total, position, notes)',
    )
    .eq('id', poId)
    .single();
  if (error || !data) return null;
  const lines = (
    (data.purchase_order_lines as unknown as PurchaseOrderLine[]) ?? []
  )
    .map((l) => ({
      ...l,
      qty: Number(l.qty),
      unit_price: l.unit_price == null ? null : Number(l.unit_price),
      line_total: l.line_total == null ? null : Number(l.line_total),
    }))
    .sort((a, b) => a.position - b.position);
  return {
    id: data.id as string,
    site_id: data.site_id as string,
    supplier_id: data.supplier_id as string,
    reference: data.reference as string,
    status: data.status as PurchaseOrderStatus,
    total: Number(data.total),
    currency: data.currency as string,
    expected_at: data.expected_at as string | null,
    sent_at: data.sent_at as string | null,
    confirmed_at: data.confirmed_at as string | null,
    received_at: data.received_at as string | null,
    cancelled_at: data.cancelled_at as string | null,
    notes: data.notes as string | null,
    created_at: data.created_at as string,
    supplier_name:
      (data.suppliers as unknown as { name?: string } | null)?.name ?? null,
    line_count: lines.length,
    lines,
  };
}

export async function countOpenPurchaseOrders(siteId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from('purchase_orders')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', siteId)
    .in('status', ['draft', 'sent', 'confirmed']);
  return count ?? 0;
}

export type ReorderSuggestion = {
  supplier_id: string;
  supplier_name: string;
  rows: BankRow[];
  estimated_value: number;
};

/** Items below par grouped by their primary supplier — the input for
 *  one-click "Draft PO" from the Suppliers / The Bank surface. */
export async function getReorderSuggestionsBySupplier(
  siteId: string,
): Promise<ReorderSuggestion[]> {
  const rows = await getBankRows(siteId);
  const breaches = rows.filter(
    (r) => r.par_status === 'breach' || r.par_status === 'low',
  );

  const bySupplier = new Map<string, ReorderSuggestion>();
  for (const r of breaches) {
    if (!r.supplier_id) continue;
    const supplierName = r.supplier_name ?? 'Unknown supplier';
    const entry = bySupplier.get(r.supplier_id) ?? {
      supplier_id: r.supplier_id,
      supplier_name: supplierName,
      rows: [],
      estimated_value: 0,
    };
    entry.rows.push(r);
    // Cost the shortfall × unit price; coarse estimate, chef refines.
    const par = r.par_level ?? 0;
    const cur = r.current_stock ?? 0;
    const shortfall = Math.max(0, par - cur);
    if (r.current_price != null && shortfall > 0) {
      entry.estimated_value += shortfall * r.current_price;
    }
    bySupplier.set(r.supplier_id, entry);
  }

  return Array.from(bySupplier.values()).sort(
    (a, b) => b.rows.length - a.rows.length,
  );
}
