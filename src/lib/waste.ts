import { createSupabaseServerClient } from '@/lib/supabase/server';

export type WasteCategory =
  | 'over_prep'
  | 'spoilage'
  | 'trim'
  | 'accident'
  | 'customer_return'
  | 'other';

export type WasteRow = {
  id: string;
  ingredient_id: string | null;
  ingredient_name: string | null;
  name: string;
  qty: number;
  qty_unit: string;
  value: number | null;
  category: WasteCategory;
  reason_md: string | null;
  logged_at: string;
};

export type WasteData = {
  recent: WasteRow[];
  total_value_30d: number;
  total_value_7d: number;
  trend_pct: number | null;
  by_category: Array<{ category: WasteCategory; value: number; count: number }>;
  top_offender: { name: string; value: number; count: number } | null;
};

const CATEGORY_LABEL: Record<WasteCategory, string> = {
  over_prep: 'Over-prep',
  spoilage: 'Spoilage',
  trim: 'Trim',
  accident: 'Accident',
  customer_return: 'Returned',
  other: 'Other',
};

export function wasteCategoryLabel(c: WasteCategory): string {
  return CATEGORY_LABEL[c];
}

type Raw = {
  id: string;
  ingredient_id: string | null;
  name: string;
  qty: number;
  qty_unit: string;
  value: number | null;
  category: WasteCategory;
  reason_md: string | null;
  logged_at: string;
  ingredients: { name: string } | null;
};

export async function getWaste(siteId: string): Promise<WasteData> {
  const supabase = await createSupabaseServerClient();
  const thirtyAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const fourteenAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const sevenAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const { data } = await supabase
    .from('waste_entries')
    .select(
      'id, ingredient_id, name, qty, qty_unit, value, category, reason_md, logged_at, ingredients:ingredient_id (name)',
    )
    .eq('site_id', siteId)
    .is('archived_at', null)
    .gte('logged_at', thirtyAgo.toISOString())
    .order('logged_at', { ascending: false })
    .limit(120);

  const rows = (data ?? []) as unknown as Raw[];
  const mapped: WasteRow[] = rows.map((r) => ({
    id: r.id,
    ingredient_id: r.ingredient_id,
    ingredient_name: r.ingredients?.name ?? null,
    name: r.name,
    qty: Number(r.qty),
    qty_unit: r.qty_unit,
    value: r.value == null ? null : Number(r.value),
    category: r.category,
    reason_md: r.reason_md,
    logged_at: r.logged_at,
  }));

  const total_value_30d = mapped.reduce((s, r) => s + (r.value ?? 0), 0);
  const total_value_7d = mapped
    .filter((r) => new Date(r.logged_at) >= sevenAgo)
    .reduce((s, r) => s + (r.value ?? 0), 0);
  const value_prior_7d = mapped
    .filter((r) => {
      const d = new Date(r.logged_at);
      return d < sevenAgo && d >= fourteenAgo;
    })
    .reduce((s, r) => s + (r.value ?? 0), 0);
  const trend_pct =
    value_prior_7d > 0
      ? Math.round(((total_value_7d - value_prior_7d) / value_prior_7d) * 100)
      : null;

  const catMap = new Map<WasteCategory, { value: number; count: number }>();
  for (const r of mapped) {
    const cur = catMap.get(r.category) ?? { value: 0, count: 0 };
    cur.value += r.value ?? 0;
    cur.count += 1;
    catMap.set(r.category, cur);
  }
  const by_category = Array.from(catMap.entries())
    .map(([category, v]) => ({ category, value: v.value, count: v.count }))
    .sort((a, b) => b.value - a.value);

  const offenderMap = new Map<string, { name: string; value: number; count: number }>();
  for (const r of mapped) {
    const key = r.ingredient_name ?? r.name;
    const cur = offenderMap.get(key) ?? { name: key, value: 0, count: 0 };
    cur.value += r.value ?? 0;
    cur.count += 1;
    offenderMap.set(key, cur);
  }
  const top_offender =
    Array.from(offenderMap.values()).sort((a, b) => b.value - a.value)[0] ?? null;

  return {
    recent: mapped.slice(0, 50),
    total_value_30d,
    total_value_7d,
    trend_pct,
    by_category,
    top_offender,
  };
}
