import { createSupabaseServerClient } from '@/lib/supabase/server';

export type DeliveryPreview = {
  id: string;
  day_label: string; // 'Thu' / 'Tue' / etc.
  supplier_name: string;
  sub: string;
  status: 'arrived' | 'expected' | 'missed' | 'cancelled';
  tone: 'healthy' | 'attention' | 'normal';
};

export type HubSupplyGraphSignal = {
  id: string;
  section_label: string;
  severity_label: string;
  severity: 'urgent' | 'attention' | 'healthy' | 'info';
  headline_pre: string | null;
  headline_em: string | null;
  headline_post: string | null;
  body_md: string;
  action_label: string | null;
  action_target: string | null;
  action_context: string | null;
};

export type HubSummary = {
  todays_deliveries: number;
  todays_delivery_suppliers: string[];
  suppliers_active: number;
  suppliers_with_recent_updates: number;
  invoices_pending: number;
  invoices_with_discrepancy: number;
  waste_this_week_value: number;
  waste_change_pct: number | null;
  upcoming_deliveries: DeliveryPreview[];
  supply_graph_signals: HubSupplyGraphSignal[];
};

const dayShort = new Intl.DateTimeFormat('en-GB', { weekday: 'short' });

const SEVERITY_RANK: Record<HubSupplyGraphSignal['severity'], number> = {
  urgent: 0,
  attention: 1,
  healthy: 2,
  info: 3,
};

export async function getHubSummary(siteId: string): Promise<HubSummary> {
  const supabase = await createSupabaseServerClient();
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
  const inSevenDays = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 1. Suppliers active
  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, name')
    .eq('site_id', siteId);
  const suppliersById = new Map(
    (suppliers ?? []).map((s) => [s.id as string, s.name as string]),
  );

  // 2. Upcoming deliveries (today + next 7d)
  const { data: deliveries } = await supabase
    .from('deliveries')
    .select('id, supplier_id, expected_at, status, line_count_estimate, value_estimate')
    .eq('site_id', siteId)
    .gte('expected_at', todayIso)
    .lte('expected_at', inSevenDays.toISOString().slice(0, 10))
    .is('archived_at', null)
    .order('expected_at', { ascending: true })
    .limit(8);

  const todaysDeliveries =
    (deliveries ?? []).filter((d) => d.expected_at === todayIso).length;
  const todaysSuppliers = (deliveries ?? [])
    .filter((d) => d.expected_at === todayIso)
    .map((d) => suppliersById.get(d.supplier_id as string))
    .filter((n): n is string => !!n);

  const upcomingDeliveries: DeliveryPreview[] = (deliveries ?? []).map((d) => {
    const date = new Date(d.expected_at as string);
    const supplierName = suppliersById.get(d.supplier_id as string) ?? '—';
    const lines = d.line_count_estimate as number | null;
    const value = d.value_estimate == null ? null : Number(d.value_estimate);
    const sub = [
      lines == null ? null : `${lines} lines`,
      value == null ? null : `£${value.toFixed(0)} est.`,
    ]
      .filter(Boolean)
      .join(' · ');
    return {
      id: d.id as string,
      day_label: dayShort.format(date),
      supplier_name: supplierName,
      sub: sub || 'no lines logged',
      status: d.status as DeliveryPreview['status'],
      tone:
        d.status === 'arrived'
          ? 'healthy'
          : d.expected_at === todayIso
            ? 'attention'
            : 'normal',
    };
  });

  // 3. Invoices pending
  const { data: pendingInvoices } = await supabase
    .from('invoices')
    .select('id, status, delivery_confirmation')
    .eq('site_id', siteId)
    .in('status', ['scanned', 'flagged'])
    .is('archived_at', null);
  const invoicesPending = pendingInvoices?.length ?? 0;
  const invoicesFlagged =
    (pendingInvoices ?? []).filter((i) => i.status === 'flagged').length;

  // 4. Waste this week
  const { data: wasteThisWeek } = await supabase
    .from('waste_entries')
    .select('value')
    .eq('site_id', siteId)
    .gte('logged_at', sevenDaysAgo.toISOString())
    .is('archived_at', null);
  const wasteValue = (wasteThisWeek ?? []).reduce(
    (sum, w) => sum + (w.value == null ? 0 : Number(w.value)),
    0,
  );

  const { data: wastePrior } = await supabase
    .from('waste_entries')
    .select('value')
    .eq('site_id', siteId)
    .gte('logged_at', fourteenDaysAgo.toISOString())
    .lt('logged_at', sevenDaysAgo.toISOString())
    .is('archived_at', null);
  const wastePriorValue = (wastePrior ?? []).reduce(
    (sum, w) => sum + (w.value == null ? 0 : Number(w.value)),
    0,
  );
  const wasteChangePct =
    wastePriorValue > 0
      ? ((wasteValue - wastePriorValue) / wastePriorValue) * 100
      : null;

  // 5. Suppliers with updates this week (proxy: ingredients whose last_seen_at < 7 days)
  const { data: recentIngredients } = await supabase
    .from('ingredients')
    .select('supplier_id, last_seen_at')
    .eq('site_id', siteId)
    .gte('last_seen_at', sevenDaysAgo.toISOString());
  const suppliersWithUpdates = new Set(
    (recentIngredients ?? [])
      .map((i) => i.supplier_id as string | null)
      .filter((s): s is string => !!s),
  ).size;

  // 6. Supply-graph signals — severity-led forward_signals filtered to
  //    "current issues" tones (urgent + attention) and excluding the
  //    'info'-severity ones (those go to Looking Ahead at the bottom).
  const { data: signalRows } = await supabase
    .from('forward_signals')
    .select(
      'id, section_label, severity, headline_pre, headline_em, headline_post, body_md, action_label, action_target, action_context, emitted_at',
    )
    .eq('site_id', siteId)
    .eq('target_surface', 'stock-suppliers')
    .in('severity', ['urgent', 'attention', 'healthy'])
    .is('dismissed_at', null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('emitted_at', { ascending: false })
    .limit(6);

  const supplyGraphSignals: HubSupplyGraphSignal[] = (signalRows ?? [])
    .map((s) => {
      const severity = s.severity as HubSupplyGraphSignal['severity'];
      return {
        id: s.id as string,
        section_label: s.section_label as string,
        severity_label:
          severity === 'urgent'
            ? 'Urgent'
            : severity === 'attention'
              ? 'Watch'
              : severity === 'healthy'
                ? 'Working'
                : 'Info',
        severity,
        headline_pre: (s.headline_pre as string | null) ?? null,
        headline_em: (s.headline_em as string | null) ?? null,
        headline_post: (s.headline_post as string | null) ?? null,
        body_md: s.body_md as string,
        action_label: (s.action_label as string | null) ?? null,
        action_target: (s.action_target as string | null) ?? null,
        action_context: (s.action_context as string | null) ?? null,
      };
    })
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    .slice(0, 3);

  return {
    todays_deliveries: todaysDeliveries,
    todays_delivery_suppliers: todaysSuppliers,
    suppliers_active: suppliers?.length ?? 0,
    suppliers_with_recent_updates: suppliersWithUpdates,
    invoices_pending: invoicesPending,
    invoices_with_discrepancy: invoicesFlagged,
    waste_this_week_value: wasteValue,
    waste_change_pct: wasteChangePct,
    upcoming_deliveries: upcomingDeliveries,
    supply_graph_signals: supplyGraphSignals,
  };
}
