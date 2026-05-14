import { createSupabaseServerClient } from '@/lib/supabase/server';

export type SupplierRow = {
  id: string;
  name: string;
  ingredient_count: number;
  active_in_30d: boolean;
  last_seen_at: string | null;
  reliability_score: number | null;
  confirmed_count: number;
  flagged_count: number;
};

export type SuppliersData = {
  suppliers: SupplierRow[];
  active_count: number;
  total_count: number;
};

export async function getSuppliers(siteId: string): Promise<SuppliersData> {
  const supabase = await createSupabaseServerClient();

  const [
    { data: suppliers },
    { data: ingredients },
    { data: invoices },
  ] = await Promise.all([
    supabase
      .from('suppliers')
      .select('id, name')
      .eq('site_id', siteId)
      .order('name', { ascending: true }),
    supabase
      .from('ingredients')
      .select('id, supplier_id, last_seen_at')
      .eq('site_id', siteId),
    supabase
      .from('invoices')
      .select('id, supplier_id, status, received_at')
      .eq('site_id', siteId)
      .gte(
        'received_at',
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
      ),
  ]);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const ingsBySupplier = new Map<string, { count: number; latest: Date | null }>();
  for (const ing of ingredients ?? []) {
    const sid = ing.supplier_id as string | null;
    if (!sid) continue;
    const cur = ingsBySupplier.get(sid) ?? { count: 0, latest: null };
    cur.count += 1;
    const seen = ing.last_seen_at
      ? new Date(ing.last_seen_at as string)
      : null;
    if (seen && (!cur.latest || seen > cur.latest)) {
      cur.latest = seen;
    }
    ingsBySupplier.set(sid, cur);
  }

  const invStats = new Map<string, { confirmed: number; flagged: number }>();
  for (const inv of invoices ?? []) {
    const sid = inv.supplier_id as string | null;
    if (!sid) continue;
    const cur = invStats.get(sid) ?? { confirmed: 0, flagged: 0 };
    if (inv.status === 'confirmed') cur.confirmed += 1;
    if (inv.status === 'flagged') cur.flagged += 1;
    invStats.set(sid, cur);
  }

  const rows: SupplierRow[] = (suppliers ?? []).map((s) => {
    const sid = s.id as string;
    const ing = ingsBySupplier.get(sid) ?? { count: 0, latest: null };
    const inv = invStats.get(sid) ?? { confirmed: 0, flagged: 0 };
    const total = inv.confirmed + inv.flagged;
    const reliability =
      total === 0 ? null : Math.round((inv.confirmed / total) * 100) / 10;
    return {
      id: sid,
      name: s.name as string,
      ingredient_count: ing.count,
      active_in_30d: ing.latest != null && ing.latest >= thirtyDaysAgo,
      last_seen_at: ing.latest ? ing.latest.toISOString() : null,
      reliability_score: reliability,
      confirmed_count: inv.confirmed,
      flagged_count: inv.flagged,
    };
  });

  rows.sort((a, b) => {
    if (a.active_in_30d !== b.active_in_30d) return a.active_in_30d ? -1 : 1;
    return b.ingredient_count - a.ingredient_count;
  });

  return {
    suppliers: rows,
    active_count: rows.filter((r) => r.active_in_30d).length,
    total_count: rows.length,
  };
}

export type SupplierIngredientRow = {
  id: string;
  name: string;
  unit: string | null;
  category: string | null;
  current_price: number | null;
  last_seen_at: string | null;
};

export type SupplierInvoiceRow = {
  id: string;
  invoice_number: string | null;
  issued_at: string | null;
  received_at: string;
  total: number | null;
  status: 'draft' | 'scanned' | 'confirmed' | 'flagged' | 'rejected';
  source: string;
  flagged_lines: number;
};

export type SupplierDetail = {
  id: string;
  name: string;
  reliability_score: number | null;
  confirmed_count: number;
  flagged_count: number;
  total_spend_90d: number;
  ingredients: SupplierIngredientRow[];
  invoices: SupplierInvoiceRow[];
};

type RawInvoiceWithLines = {
  id: string;
  invoice_number: string | null;
  issued_at: string | null;
  received_at: string;
  total: number | null;
  status: SupplierInvoiceRow['status'];
  source: string;
  invoice_lines: Array<{
    discrepancy_qty: number | null;
    discrepancy_note: string | null;
  }>;
};

export async function getSupplierDetail(
  siteId: string,
  supplierId: string,
): Promise<SupplierDetail | null> {
  const supabase = await createSupabaseServerClient();

  const { data: supplier } = await supabase
    .from('suppliers')
    .select('id, name, site_id')
    .eq('id', supplierId)
    .single();
  if (!supplier || supplier.site_id !== siteId) return null;

  const ninetyAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [ingResp, invResp] = await Promise.all([
    supabase
      .from('ingredients')
      .select('id, name, unit, category, current_price, last_seen_at')
      .eq('site_id', siteId)
      .eq('supplier_id', supplierId)
      .order('name', { ascending: true }),
    supabase
      .from('invoices')
      .select(
        'id, invoice_number, issued_at, received_at, total, status, source, invoice_lines (discrepancy_qty, discrepancy_note)',
      )
      .eq('site_id', siteId)
      .eq('supplier_id', supplierId)
      .gte('received_at', ninetyAgo)
      .order('received_at', { ascending: false })
      .limit(30),
  ]);

  const ingredients: SupplierIngredientRow[] = (ingResp.data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    unit: (r.unit as string | null) ?? null,
    category: (r.category as string | null) ?? null,
    current_price: r.current_price == null ? null : Number(r.current_price),
    last_seen_at: (r.last_seen_at as string | null) ?? null,
  }));

  const invoiceRows = (invResp.data ?? []) as unknown as RawInvoiceWithLines[];
  const invoices: SupplierInvoiceRow[] = invoiceRows.map((r) => {
    const flaggedLines = (r.invoice_lines ?? []).filter(
      (l) =>
        (l.discrepancy_qty != null && Number(l.discrepancy_qty) !== 0) ||
        (typeof l.discrepancy_note === 'string' &&
          l.discrepancy_note.trim() !== ''),
    ).length;
    return {
      id: r.id,
      invoice_number: r.invoice_number,
      issued_at: r.issued_at,
      received_at: r.received_at,
      total: r.total == null ? null : Number(r.total),
      status: r.status,
      source: r.source,
      flagged_lines: flaggedLines,
    };
  });

  let confirmed = 0;
  let flagged = 0;
  let spend90d = 0;
  for (const i of invoices) {
    if (i.status === 'confirmed') {
      confirmed += 1;
      spend90d += i.total ?? 0;
    }
    if (i.status === 'flagged') flagged += 1;
  }
  const total = confirmed + flagged;
  const reliability =
    total === 0 ? null : Math.round((confirmed / total) * 100) / 10;

  return {
    id: supplier.id as string,
    name: supplier.name as string,
    reliability_score: reliability,
    confirmed_count: confirmed,
    flagged_count: flagged,
    total_spend_90d: spend90d,
    ingredients,
    invoices,
  };
}
