import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CellarRow = {
  ingredient_id: string;
  name: string;
  category: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  unit: string | null;
  unit_type: string | null;
  current_price: number | null;
  pack_volume_ml: number | null;
  current_stock: number | null;
  par_level: number | null;
  reorder_point: number | null;
  last_seen_at: string | null;
  /** Stock status derived from current_stock vs reorder_point. */
  par_status: 'breach' | 'low' | 'healthy' | 'unknown';
  /** Cost per 25ml standard single pour, when pack_volume_ml set. */
  cost_per_single: number | null;
};

const BAR_UNIT_TYPES = new Set([
  'bottle',
  'case',
  'keg',
  'cask',
  'L',
  'ml',
]);

export const CELLAR_CATEGORIES = [
  'spirit',
  'wine',
  'beer',
  'mixer',
  'garnish',
] as const;

export type CellarCategory = (typeof CELLAR_CATEGORIES)[number];

export const CELLAR_CATEGORY_LABEL: Record<CellarCategory, string> = {
  spirit: 'Spirits',
  wine: 'Wines',
  beer: 'Beers',
  mixer: 'Mixers',
  garnish: 'Garnish',
};

export async function getCellarRows(siteId: string): Promise<CellarRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data: ingredients } = await supabase
    .from('ingredients')
    .select(
      'id, name, category, supplier_id, suppliers:supplier_id (name), unit, unit_type, current_price, pack_volume_ml, current_stock, par_level, reorder_point, last_seen_at',
    )
    .eq('site_id', siteId)
    .order('category', { ascending: true })
    .order('name', { ascending: true });
  if (!ingredients) return [];

  return ingredients
    .filter((i) => {
      // Default Cellar filter: items with a bar-flavoured unit_type, OR
      // items in bar categories (catches mint/lemons that may not have a
      // unit_type yet).
      const ut = i.unit_type as string | null;
      const cat = (i.category as string | null) ?? '';
      return (
        (ut && BAR_UNIT_TYPES.has(ut)) ||
        ['spirit', 'wine', 'beer', 'mixer', 'garnish'].includes(cat)
      );
    })
    .map((i): CellarRow => {
      const stock =
        i.current_stock != null ? Number(i.current_stock) : null;
      const reorder =
        i.reorder_point != null ? Number(i.reorder_point) : null;
      const par = i.par_level != null ? Number(i.par_level) : null;
      let parStatus: CellarRow['par_status'] = 'unknown';
      if (stock != null && reorder != null) {
        if (stock <= reorder) parStatus = 'breach';
        else if (par != null && stock < par * 0.75) parStatus = 'low';
        else parStatus = 'healthy';
      }
      const price =
        i.current_price != null ? Number(i.current_price) : null;
      const pvml =
        i.pack_volume_ml != null ? Number(i.pack_volume_ml) : null;
      const costPerSingle =
        price != null && pvml != null && pvml > 0
          ? (price / pvml) * 25
          : null;
      return {
        ingredient_id: i.id as string,
        name: i.name as string,
        category: i.category as string | null,
        supplier_id: i.supplier_id as string | null,
        supplier_name:
          (i.suppliers as unknown as { name?: string } | null)?.name ??
          null,
        unit: (i.unit as string | null) ?? null,
        unit_type: (i.unit_type as string | null) ?? null,
        current_price: price,
        pack_volume_ml: pvml,
        current_stock: stock,
        par_level: par,
        reorder_point: reorder,
        last_seen_at: (i.last_seen_at as string | null) ?? null,
        par_status: parStatus,
        cost_per_single: costPerSingle,
      };
    });
}

export async function getCellarRow(
  ingredientId: string,
): Promise<CellarRow | null> {
  const rows = await getAllIngredientsAsCellarRows(ingredientId);
  return rows[0] ?? null;
}

async function getAllIngredientsAsCellarRows(
  ingredientId: string,
): Promise<CellarRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('ingredients')
    .select(
      'id, name, category, supplier_id, suppliers:supplier_id (name), unit, unit_type, current_price, pack_volume_ml, current_stock, par_level, reorder_point, last_seen_at',
    )
    .eq('id', ingredientId)
    .single();
  if (!data) return [];
  const stock = data.current_stock != null ? Number(data.current_stock) : null;
  const reorder =
    data.reorder_point != null ? Number(data.reorder_point) : null;
  const par = data.par_level != null ? Number(data.par_level) : null;
  let parStatus: CellarRow['par_status'] = 'unknown';
  if (stock != null && reorder != null) {
    if (stock <= reorder) parStatus = 'breach';
    else if (par != null && stock < par * 0.75) parStatus = 'low';
    else parStatus = 'healthy';
  }
  const price = data.current_price != null ? Number(data.current_price) : null;
  const pvml =
    data.pack_volume_ml != null ? Number(data.pack_volume_ml) : null;
  const costPerSingle =
    price != null && pvml != null && pvml > 0 ? (price / pvml) * 25 : null;
  return [
    {
      ingredient_id: data.id as string,
      name: data.name as string,
      category: data.category as string | null,
      supplier_id: data.supplier_id as string | null,
      supplier_name:
        (data.suppliers as unknown as { name?: string } | null)?.name ?? null,
      unit: (data.unit as string | null) ?? null,
      unit_type: (data.unit_type as string | null) ?? null,
      current_price: price,
      pack_volume_ml: pvml,
      current_stock: stock,
      par_level: par,
      reorder_point: reorder,
      last_seen_at: (data.last_seen_at as string | null) ?? null,
      par_status: parStatus,
      cost_per_single: costPerSingle,
    },
  ];
}
