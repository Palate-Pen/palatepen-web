import { createSupabaseServerClient } from '@/lib/supabase/server';

export type StockTakeStatus = 'in_progress' | 'completed' | 'cancelled';

export type StockTakeScope = 'bar' | 'kitchen' | 'all';

export type StockTakeRow = {
  id: string;
  site_id: string;
  conducted_at: string;
  variance_total_value: number | null;
  status: StockTakeStatus;
  completed_at: string | null;
  notes: string | null;
  scope: StockTakeScope;
  line_count: number;
};

export type StockTakeLine = {
  id: string;
  ingredient_id: string;
  ingredient_name: string;
  category: string | null;
  unit: string | null;
  unit_type: string | null;
  current_price: number | null;
  expected_quantity: number | null;
  counted_quantity: number | null;
  variance_quantity: number | null;
  variance_value: number | null;
  reason: string | null;
  position: number;
};

export type StockTakeDetail = StockTakeRow & {
  lines: StockTakeLine[];
};

const BAR_UNIT_TYPES = ['bottle', 'case', 'keg', 'cask', 'L', 'ml'];

/**
 * Infer scope from line composition. We don't store scope on the
 * stock_takes row — instead, derive it from the unit_types of the
 * counted lines. Mixed = 'all'.
 */
function inferScope(unitTypes: Array<string | null>): StockTakeScope {
  const present = unitTypes.filter((u): u is string => !!u);
  if (present.length === 0) return 'kitchen';
  const barCount = present.filter((u) => BAR_UNIT_TYPES.includes(u)).length;
  if (barCount === present.length) return 'bar';
  if (barCount === 0) return 'kitchen';
  return 'all';
}

export async function listStockTakes(siteId: string): Promise<StockTakeRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('stock_takes')
    .select(
      'id, site_id, conducted_at, variance_total_value, status, completed_at, notes, stock_take_lines (ingredient_id, ingredients:ingredient_id (unit_type))',
    )
    .eq('site_id', siteId)
    .order('conducted_at', { ascending: false });
  if (!data) return [];
  return data.map((r): StockTakeRow => {
    const lines = (r.stock_take_lines ?? []) as unknown as Array<{
      ingredient_id: string;
      ingredients: { unit_type: string | null } | null;
    }>;
    return {
      id: r.id as string,
      site_id: r.site_id as string,
      conducted_at: r.conducted_at as string,
      variance_total_value:
        r.variance_total_value == null
          ? null
          : Number(r.variance_total_value),
      status: r.status as StockTakeStatus,
      completed_at: (r.completed_at as string | null) ?? null,
      notes: (r.notes as string | null) ?? null,
      scope: inferScope(lines.map((l) => l.ingredients?.unit_type ?? null)),
      line_count: lines.length,
    };
  });
}

export async function getStockTake(
  takeId: string,
): Promise<StockTakeDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('stock_takes')
    .select(
      'id, site_id, conducted_at, variance_total_value, status, completed_at, notes, stock_take_lines (id, ingredient_id, expected_quantity, counted_quantity, variance_quantity, variance_value, reason, position, ingredients:ingredient_id (name, category, unit, unit_type, current_price))',
    )
    .eq('id', takeId)
    .single();
  if (!data) return null;

  const rawLines = (data.stock_take_lines ?? []) as unknown as Array<{
    id: string;
    ingredient_id: string;
    expected_quantity: number | null;
    counted_quantity: number | null;
    variance_quantity: number | null;
    variance_value: number | null;
    reason: string | null;
    position: number;
    ingredients: {
      name: string;
      category: string | null;
      unit: string | null;
      unit_type: string | null;
      current_price: number | null;
    } | null;
  }>;

  const lines: StockTakeLine[] = rawLines
    .map((l) => ({
      id: l.id,
      ingredient_id: l.ingredient_id,
      ingredient_name: l.ingredients?.name ?? '(deleted ingredient)',
      category: l.ingredients?.category ?? null,
      unit: l.ingredients?.unit ?? null,
      unit_type: l.ingredients?.unit_type ?? null,
      current_price:
        l.ingredients?.current_price != null
          ? Number(l.ingredients.current_price)
          : null,
      expected_quantity:
        l.expected_quantity != null ? Number(l.expected_quantity) : null,
      counted_quantity:
        l.counted_quantity != null ? Number(l.counted_quantity) : null,
      variance_quantity:
        l.variance_quantity != null ? Number(l.variance_quantity) : null,
      variance_value:
        l.variance_value != null ? Number(l.variance_value) : null,
      reason: l.reason ?? null,
      position: l.position,
    }))
    .sort((a, b) => a.position - b.position);

  return {
    id: data.id as string,
    site_id: data.site_id as string,
    conducted_at: data.conducted_at as string,
    variance_total_value:
      data.variance_total_value == null
        ? null
        : Number(data.variance_total_value),
    status: data.status as StockTakeStatus,
    completed_at: (data.completed_at as string | null) ?? null,
    notes: (data.notes as string | null) ?? null,
    scope: inferScope(lines.map((l) => l.unit_type)),
    line_count: lines.length,
    lines,
  };
}

/**
 * Resolve the set of ingredient IDs that should appear in a new stock
 * take for a given scope. Used by the start action.
 */
export async function ingredientIdsForScope(
  siteId: string,
  scope: StockTakeScope,
): Promise<
  Array<{ id: string; name: string; current_stock: number | null }>
> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('ingredients')
    .select('id, name, current_stock, unit_type, category')
    .eq('site_id', siteId);

  if (scope === 'bar') {
    query = query.in('unit_type', BAR_UNIT_TYPES);
  } else if (scope === 'kitchen') {
    // Exclude bar-flavoured unit types; null unit_type counts as kitchen.
    query = query.or(
      `unit_type.is.null,unit_type.not.in.(${BAR_UNIT_TYPES.join(',')})`,
    );
  }

  const { data } = await query.order('name', { ascending: true });
  return ((data ?? []) as unknown as Array<{
    id: string;
    name: string;
    current_stock: number | null;
  }>).map((r) => ({
    id: r.id,
    name: r.name,
    current_stock:
      r.current_stock != null ? Number(r.current_stock) : null,
  }));
}

export function isBarUnitType(unit: string | null | undefined): boolean {
  if (!unit) return false;
  return BAR_UNIT_TYPES.includes(unit);
}
