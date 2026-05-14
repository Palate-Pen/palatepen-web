import { createSupabaseServerClient } from '@/lib/supabase/server';

export type DeliveryStatus = 'expected' | 'arrived' | 'missed' | 'cancelled';

export type DeliveryRow = {
  id: string;
  supplier_id: string;
  supplier_name: string;
  expected_at: string;
  arrived_at: string | null;
  status: DeliveryStatus;
  line_count_estimate: number | null;
  value_estimate: number | null;
  notes: string | null;
};

export type DeliveriesData = {
  upcoming: DeliveryRow[];
  today: DeliveryRow[];
  recent: DeliveryRow[];
  total_expected_value_7d: number;
  arrived_count_30d: number;
  missed_count_30d: number;
};

type Raw = {
  id: string;
  supplier_id: string;
  expected_at: string;
  arrived_at: string | null;
  status: DeliveryStatus;
  line_count_estimate: number | null;
  value_estimate: number | null;
  notes: string | null;
  suppliers: { name: string } | null;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getDeliveries(
  siteId: string,
): Promise<DeliveriesData> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('deliveries')
    .select(
      'id, supplier_id, expected_at, arrived_at, status, line_count_estimate, value_estimate, notes, suppliers:supplier_id (name)',
    )
    .eq('site_id', siteId)
    .is('archived_at', null)
    .order('expected_at', { ascending: false })
    .limit(80);

  const rows = (data ?? []) as unknown as Raw[];
  const mapped: DeliveryRow[] = rows.map((r) => ({
    id: r.id,
    supplier_id: r.supplier_id,
    supplier_name: r.suppliers?.name ?? 'Unknown supplier',
    expected_at: r.expected_at,
    arrived_at: r.arrived_at,
    status: r.status,
    line_count_estimate: r.line_count_estimate,
    value_estimate:
      r.value_estimate == null ? null : Number(r.value_estimate),
    notes: r.notes,
  }));

  const today = todayIso();
  const weekAhead = new Date();
  weekAhead.setDate(weekAhead.getDate() + 7);
  const weekAheadIso = weekAhead.toISOString().slice(0, 10);
  const thirtyAgo = new Date();
  thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  const thirtyAgoIso = thirtyAgo.toISOString().slice(0, 10);

  const upcoming = mapped
    .filter((r) => r.expected_at > today && r.expected_at <= weekAheadIso && r.status === 'expected')
    .sort((a, b) => a.expected_at.localeCompare(b.expected_at));
  const todayRows = mapped
    .filter((r) => r.expected_at === today && r.status !== 'cancelled')
    .sort((a, b) => a.supplier_name.localeCompare(b.supplier_name));
  const recent = mapped
    .filter((r) => r.expected_at >= thirtyAgoIso && r.expected_at < today)
    .sort((a, b) => b.expected_at.localeCompare(a.expected_at));

  const total_expected_value_7d = upcoming.reduce(
    (s, r) => s + (r.value_estimate ?? 0),
    0,
  );
  const arrived_count_30d = mapped.filter(
    (r) =>
      r.status === 'arrived' &&
      r.arrived_at != null &&
      r.arrived_at >= thirtyAgoIso,
  ).length;
  const missed_count_30d = mapped.filter(
    (r) =>
      r.status === 'missed' &&
      r.expected_at >= thirtyAgoIso &&
      r.expected_at < today,
  ).length;

  return {
    upcoming,
    today: todayRows,
    recent,
    total_expected_value_7d,
    arrived_count_30d,
    missed_count_30d,
  };
}
