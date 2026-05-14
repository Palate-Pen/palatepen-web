import { createSupabaseServerClient } from '@/lib/supabase/server';

export type PrepStatus =
  | 'not_started'
  | 'in_progress'
  | 'done'
  | 'over_prepped'
  | 'short';

export type PrepItem = {
  id: string;
  station: string;
  name: string;
  recipe_id: string | null;
  recipe_name: string | null;
  one_off: boolean;
  qty: number | null;
  qty_unit: string | null;
  suggested_qty: string | null;
  suggested_flag: boolean;
  assigned_label: string | null;
  status: PrepStatus;
  started_at: string | null;
  finished_at: string | null;
  notes: string | null;
};

export type PrepStation = {
  name: string;
  /** assignee for the station — first non-null assigned_label among its items, falls back to the only label seen, else null. */
  primary_chef: string | null;
  items: PrepItem[];
  /** count of items at each status */
  done: number;
  in_progress: number;
  not_started: number;
};

export type PrepBoard = {
  prep_date: string;
  total_items: number;
  done: number;
  in_progress: number;
  not_started: number;
  unassigned: number;
  stations: PrepStation[];
};

const STATION_ORDER = ['Garde Manger', 'Grill', 'Pass', 'Pastry'];

function stationSortKey(name: string): number {
  const idx = STATION_ORDER.indexOf(name);
  return idx === -1 ? STATION_ORDER.length : idx;
}

export async function getPrepBoard(
  siteId: string,
  prepDate: string,
): Promise<PrepBoard> {
  const supabase = await createSupabaseServerClient();

  const { data: items, error } = await supabase
    .from('prep_items')
    .select(
      'id, station, name, recipe_id, one_off, qty, qty_unit, suggested_qty, suggested_flag, assigned_label, status, started_at, finished_at, notes',
    )
    .eq('site_id', siteId)
    .eq('prep_date', prepDate)
    .order('station', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw new Error(`prep.getPrepBoard: ${error.message}`);

  const recipeIds = Array.from(
    new Set(
      (items ?? [])
        .map((i) => i.recipe_id as string | null)
        .filter((id): id is string => !!id),
    ),
  );
  const { data: recipes } = await supabase
    .from('recipes')
    .select('id, name')
    .in('id', recipeIds.length ? recipeIds : ['00000000-0000-0000-0000-000000000000']);
  const recipeName = new Map(
    (recipes ?? []).map((r) => [r.id as string, r.name as string]),
  );

  const stationMap = new Map<string, PrepItem[]>();
  let done = 0;
  let inProgress = 0;
  let notStarted = 0;
  let unassigned = 0;

  for (const row of items ?? []) {
    const item: PrepItem = {
      id: row.id as string,
      station: row.station as string,
      name: row.name as string,
      recipe_id: (row.recipe_id as string | null) ?? null,
      recipe_name: row.recipe_id
        ? recipeName.get(row.recipe_id as string) ?? null
        : null,
      one_off: row.one_off as boolean,
      qty: row.qty == null ? null : Number(row.qty),
      qty_unit: (row.qty_unit as string | null) ?? null,
      suggested_qty: (row.suggested_qty as string | null) ?? null,
      suggested_flag: row.suggested_flag as boolean,
      assigned_label: (row.assigned_label as string | null) ?? null,
      status: row.status as PrepStatus,
      started_at: (row.started_at as string | null) ?? null,
      finished_at: (row.finished_at as string | null) ?? null,
      notes: (row.notes as string | null) ?? null,
    };
    const arr = stationMap.get(item.station) ?? [];
    arr.push(item);
    stationMap.set(item.station, arr);

    if (item.status === 'done') done += 1;
    else if (item.status === 'in_progress') inProgress += 1;
    else if (item.status === 'not_started') notStarted += 1;
    if (!item.assigned_label) unassigned += 1;
  }

  const stations: PrepStation[] = Array.from(stationMap.entries())
    .sort((a, b) => stationSortKey(a[0]) - stationSortKey(b[0]))
    .map(([name, list]): PrepStation => {
      let stationDone = 0;
      let stationInProgress = 0;
      let stationNotStarted = 0;
      for (const i of list) {
        if (i.status === 'done') stationDone += 1;
        else if (i.status === 'in_progress') stationInProgress += 1;
        else if (i.status === 'not_started') stationNotStarted += 1;
      }
      const labels = list.map((i) => i.assigned_label).filter((l): l is string => !!l);
      const primaryChef = labels[0] ?? null;
      return {
        name,
        primary_chef: primaryChef,
        items: list,
        done: stationDone,
        in_progress: stationInProgress,
        not_started: stationNotStarted,
      };
    });

  return {
    prep_date: prepDate,
    total_items: items?.length ?? 0,
    done,
    in_progress: inProgress,
    not_started: notStarted,
    unassigned,
    stations,
  };
}
