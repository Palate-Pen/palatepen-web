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
