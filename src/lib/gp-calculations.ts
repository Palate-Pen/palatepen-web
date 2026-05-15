import { createSupabaseServerClient } from '@/lib/supabase/server';

export type GPCalcRow = {
  id: string;
  dish_name: string;
  sell_price: number | null;
  total_cost: number;
  gp_pct: number | null;
  pour_cost_pct: number | null;
  lines: Array<{
    name: string;
    qty: number;
    unit: string;
    unit_price: number | null;
  }>;
  notes: string | null;
  created_at: string;
};

export async function getGPHistory(
  siteId: string,
  limit = 30,
): Promise<GPCalcRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('gp_calculations')
    .select(
      'id, dish_name, sell_price, total_cost, gp_pct, pour_cost_pct, lines, notes, created_at',
    )
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return ((data ?? []) as unknown as GPCalcRow[]).map((r) => ({
    ...r,
    sell_price: r.sell_price == null ? null : Number(r.sell_price),
    total_cost: Number(r.total_cost),
    gp_pct: r.gp_pct == null ? null : Number(r.gp_pct),
    pour_cost_pct:
      r.pour_cost_pct == null ? null : Number(r.pour_cost_pct),
  }));
}
