import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ConnectionStatus =
  | 'disconnected'
  | 'connected'
  | 'error'
  | 'expired';

export type Connection = {
  id: string;
  service: string;
  display_name: string | null;
  status: ConnectionStatus;
  has_credential: boolean;
  last_synced_at: string | null;
  notes: string | null;
};

/**
 * Catalog of services chefs/bartenders can paste keys for. Order
 * matters — rendered in this order in the UI. `tagline` is the
 * one-liner under the title, kept honest (no "AI-powered" puff).
 */
export type ServiceDef = {
  service: string;
  name: string;
  category: 'pos' | 'reservations' | 'accounting' | 'calendar' | 'payments' | 'palatable' | 'other';
  tagline: string;
  /** True for services chefs typically have on the bar side (Resy,
   *  spirits suppliers' portals etc.) — used for the bar-shell default
   *  filter. Chef shell shows everything. */
  bar_relevant?: boolean;
};

export const SERVICE_CATALOG: ServiceDef[] = [
  {
    service: 'square',
    name: 'Square',
    category: 'pos',
    tagline: 'POS sales data — paste your Square access token.',
  },
  {
    service: 'eposnow',
    name: 'ePOSnow',
    category: 'pos',
    tagline: 'POS sales feed — paste your ePOSnow API key.',
  },
  {
    service: 'resy',
    name: 'Resy',
    category: 'reservations',
    tagline: 'Reservation feed for cover forecasting.',
    bar_relevant: true,
  },
  {
    service: 'gcal',
    name: 'Google Calendar',
    category: 'calendar',
    tagline: 'Service times + private events sync into Looking Ahead.',
  },
  {
    service: 'xero',
    name: 'Xero',
    category: 'accounting',
    tagline: 'Send invoice + waste totals to the bookkeeper.',
  },
  {
    service: 'stripe',
    name: 'Stripe',
    category: 'payments',
    tagline: "Independent from Palatable's own billing — for direct order payment.",
  },
  {
    service: 'palatable_api',
    name: 'Palatable API',
    category: 'palatable',
    tagline: 'Outgoing API key for your own integrations. Kitchen+ tier.',
  },
];

export function serviceDef(service: string): ServiceDef | null {
  return SERVICE_CATALOG.find((s) => s.service === service) ?? null;
}

export async function getConnections(
  siteId: string,
): Promise<Map<string, Connection>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('connections')
    .select('id, service, display_name, status, credential, last_synced_at, notes')
    .eq('site_id', siteId);

  const out = new Map<string, Connection>();
  for (const row of data ?? []) {
    out.set(row.service as string, {
      id: row.id as string,
      service: row.service as string,
      display_name: (row.display_name as string | null) ?? null,
      status: row.status as ConnectionStatus,
      has_credential:
        typeof row.credential === 'string' && row.credential.trim().length > 0,
      last_synced_at: (row.last_synced_at as string | null) ?? null,
      notes: (row.notes as string | null) ?? null,
    });
  }
  return out;
}
