import { createSupabaseServerClient } from '@/lib/supabase/server';

export type InvoiceListStatus =
  | 'draft'
  | 'scanned'
  | 'confirmed'
  | 'flagged'
  | 'rejected';

export type InvoiceListRow = {
  id: string;
  invoice_number: string | null;
  issued_at: string | null;
  received_at: string;
  total: number | null;
  status: InvoiceListStatus;
  source: string;
  supplier_name: string | null;
  line_count: number;
  matched_count: number;
  flagged_count: number;
};

export type InvoicesListData = {
  awaiting: InvoiceListRow[];
  recent: InvoiceListRow[];
  awaiting_value: number;
  awaiting_flagged_value: number;
};

type RawRow = {
  id: string;
  invoice_number: string | null;
  issued_at: string | null;
  received_at: string;
  subtotal: number | null;
  total: number | null;
  status: InvoiceListStatus;
  source: string;
  supplier_id: string | null;
  suppliers: { name: string } | null;
  invoice_lines: {
    id: string;
    ingredient_id: string | null;
    line_total: number | null;
    qty: number;
    unit_price: number;
    discrepancy_qty: number | null;
    discrepancy_note: string | null;
  }[];
};

export async function getInvoicesList(
  siteId: string,
): Promise<InvoicesListData> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('invoices')
    .select(
      'id, invoice_number, issued_at, received_at, subtotal, total, status, source, supplier_id, suppliers:supplier_id (name), invoice_lines (id, ingredient_id, line_total, qty, unit_price, discrepancy_qty, discrepancy_note)',
    )
    .eq('site_id', siteId)
    .order('received_at', { ascending: false })
    .limit(60);

  const rows = (data ?? []) as unknown as RawRow[];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const mapped: InvoiceListRow[] = rows.map((r) => {
    const lines = r.invoice_lines ?? [];
    const matched = lines.filter((l) => l.ingredient_id != null).length;
    const flagged = lines.filter(
      (l) =>
        (l.discrepancy_qty != null && l.discrepancy_qty !== 0) ||
        (l.discrepancy_note != null && l.discrepancy_note !== ''),
    ).length;
    const computedTotal =
      r.total ??
      lines.reduce((s, l) => s + (l.line_total ?? l.qty * l.unit_price), 0);
    return {
      id: r.id,
      invoice_number: r.invoice_number,
      issued_at: r.issued_at,
      received_at: r.received_at,
      total: computedTotal || null,
      status: r.status,
      source: r.source,
      supplier_name: r.suppliers?.name ?? null,
      line_count: lines.length,
      matched_count: matched,
      flagged_count: flagged,
    };
  });

  const awaiting = mapped.filter(
    (r) => r.status === 'scanned' || r.status === 'flagged',
  );
  const recent = mapped.filter(
    (r) =>
      (r.status === 'confirmed' || r.status === 'rejected') &&
      new Date(r.received_at) >= cutoff,
  );

  const awaiting_value = awaiting.reduce((s, r) => s + (r.total ?? 0), 0);
  const awaiting_flagged_value = awaiting
    .filter((r) => r.status === 'flagged')
    .reduce((s, r) => s + (r.total ?? 0), 0);

  return {
    awaiting,
    recent,
    awaiting_value,
    awaiting_flagged_value,
  };
}
