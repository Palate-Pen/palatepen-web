import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CalendarItem = {
  id: string;
  date_iso: string;
  source: 'signal' | 'delivery' | 'menu_plan' | 'training_expiry' | 'eho_due';
  title: string;
  action_target: string | null;
};

/**
 * Aggregates dated forward events into a single list, ordered by date.
 * Each source contributes items within the next \`days\` window:
 *
 *   - forward_signals.expires_at  -> signal (only when expires_at falls
 *     in the window AND the signal is still live)
 *   - deliveries.expected_at      -> delivery
 *   - menu_plans.launch_date      -> menu_plan
 *   - safety_training.expires_on  -> training_expiry
 *   - safety_eho_visits.due_at    -> eho_due
 *
 * Surfaces (chef / manager / owner / safety home) read the same
 * aggregator so the calendar is consistent across the platform.
 */
export async function getForwardCalendar(
  siteId: string,
  days = 14,
): Promise<CalendarItem[]> {
  const supabase = await createSupabaseServerClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(today.getDate() + days);

  const todayIso = today.toISOString().slice(0, 10);
  const horizonIso = horizon.toISOString().slice(0, 10);

  const out: CalendarItem[] = [];

  // 1. forward_signals — only emit signals with a real expires_at in the window
  const { data: signals } = await supabase
    .from('forward_signals')
    .select('id, section_label, headline_em, headline_pre, headline_post, expires_at, action_target')
    .eq('site_id', siteId)
    .is('dismissed_at', null)
    .not('expires_at', 'is', null)
    .gte('expires_at', today.toISOString())
    .lt('expires_at', horizon.toISOString());
  for (const s of signals ?? []) {
    const exp = s.expires_at as string;
    out.push({
      id: 'signal:' + (s.id as string),
      date_iso: new Date(exp).toISOString().slice(0, 10),
      source: 'signal',
      title:
        (s.section_label as string) +
        ' \u00b7 ' +
        ((s.headline_pre as string | null) ?? '') +
        ((s.headline_em as string | null) ?? '') +
        ((s.headline_post as string | null) ?? ''),
      action_target: (s.action_target as string | null) ?? null,
    });
  }

  // 2. deliveries
  const { data: deliveries } = await supabase
    .from('deliveries')
    .select('id, expected_at, suppliers:supplier_id (name)')
    .eq('site_id', siteId)
    .is('archived_at', null)
    .gte('expected_at', todayIso)
    .lte('expected_at', horizonIso);
  for (const d of deliveries ?? []) {
    const supplier = (d.suppliers as unknown as { name?: string } | null)?.name ?? 'Supplier';
    out.push({
      id: 'delivery:' + (d.id as string),
      date_iso: d.expected_at as string,
      source: 'delivery',
      title: supplier + ' delivery',
      action_target: '/stock-suppliers/deliveries',
    });
  }

  // 3. menu_plans
  const { data: plans } = await supabase
    .from('menu_plans')
    .select('id, name, launch_date')
    .eq('site_id', siteId)
    .not('launch_date', 'is', null)
    .gte('launch_date', todayIso)
    .lte('launch_date', horizonIso);
  for (const p of plans ?? []) {
    out.push({
      id: 'menu_plan:' + (p.id as string),
      date_iso: p.launch_date as string,
      source: 'menu_plan',
      title: (p.name as string) + ' launches',
      action_target: '/menus/plan/' + (p.id as string),
    });
  }

  // 4. training expiries
  try {
    const { data: trainings } = await supabase
      .from('safety_training')
      .select('id, staff_name, certificate_name, kind, expires_on')
      .eq('site_id', siteId)
      .is('archived_at', null)
      .not('expires_on', 'is', null)
      .gte('expires_on', todayIso)
      .lte('expires_on', horizonIso);
    for (const t of trainings ?? []) {
      out.push({
        id: 'training:' + (t.id as string),
        date_iso: t.expires_on as string,
        source: 'training_expiry',
        title:
          (t.staff_name as string) +
          ' \u00b7 ' +
          ((t.certificate_name as string | null) ?? (t.kind as string)) +
          ' expires',
        action_target: '/safety/training',
      });
    }
  } catch {
    // safety tables may not exist yet in fresh installs
  }

  // 5. EHO due
  try {
    const { data: eho } = await supabase
      .from('safety_eho_visits')
      .select('id, due_at, inspector_authority')
      .eq('site_id', siteId)
      .is('archived_at', null)
      .not('due_at', 'is', null)
      .gte('due_at', todayIso)
      .lte('due_at', horizonIso);
    for (const e of eho ?? []) {
      out.push({
        id: 'eho:' + (e.id as string),
        date_iso: e.due_at as string,
        source: 'eho_due',
        title: 'EHO visit due',
        action_target: '/safety/eho',
      });
    }
  } catch {
    // safety tables may not exist yet
  }

  return out.sort((a, b) => a.date_iso.localeCompare(b.date_iso));
}
