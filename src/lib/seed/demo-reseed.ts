import type { SupabaseClient } from '@supabase/supabase-js';
import { regenerateSignalsForSite } from '@/lib/signal-detectors';

/**
 * Re-anchor every demo account back to "now".
 *
 * Walks `v2.accounts` for any row with `is_demo = true`, calls the
 * `v2.reseed_demo_account(account_id)` RPC for each, then regenerates
 * detector signals per site so the Looking Ahead bars + Inbox feed
 * always read fresh.
 *
 * Shared between:
 *   - `/admin/ops` Reseed-Hello-Demo card (called from an action with
 *     a founder gate in front of it)
 *   - `/api/cron/reseed-demo` (called daily with Bearer auth)
 *
 * Service-role client expected — the RPC is security-definer so any
 * authenticated caller would work, but we don't want to depend on the
 * cookie session for the cron path. Caller passes the client to keep
 * imports server-only-safe.
 */
export type DemoReseedAccount = {
  account_id: string;
  account_name: string;
  site_count: number;
  delta_seconds: number;
  delta_days: number;
  anchor_iso: string | null;
  per_site_tables: Array<{
    site_id: string;
    tables: Record<string, number>;
  }>;
  safety: {
    opening_checks: number;
    probe_readings: number;
    cleaning_signoffs: number;
    incidents: number;
    training: number;
  };
  signals_generated: number;
  signal_breakdown: Record<string, number>;
};

export type DemoReseedResult =
  | { ok: true; accounts: DemoReseedAccount[]; timestamp: string }
  | { ok: false; error: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Svc = SupabaseClient<any, 'v2', any>;

export async function reseedHelloDemoOnSupabase(
  svc: Svc,
): Promise<DemoReseedResult> {
  const { data: demoAccounts, error: aErr } = await svc
    .from('accounts')
    .select('id, name')
    .eq('is_demo', true)
    .order('created_at', { ascending: true });
  if (aErr) {
    return { ok: false, error: `accounts_fetch_failed: ${aErr.message}` };
  }
  if (!demoAccounts || demoAccounts.length === 0) {
    return { ok: false, error: 'no_demo_accounts_found' };
  }

  const accounts: DemoReseedAccount[] = [];

  for (const a of demoAccounts) {
    const accountId = a.id as string;
    const accountName = (a.name as string) ?? 'Demo account';

    const { data: rpcRaw, error: rpcErr } = await svc.rpc(
      'reseed_demo_account',
      { p_account_id: accountId },
    );
    if (rpcErr) {
      return {
        ok: false,
        error: `rpc_failed (${accountName}): ${rpcErr.message}`,
      };
    }

    // rpc returns jsonb; supabase-js leaves it as an object on the data field
    type RpcResp = {
      account_id?: string;
      site_count?: number;
      delta_seconds?: number;
      delta_days?: number;
      anchor?: string;
      per_site?: Array<{ site_id: string; tables: Record<string, number> }>;
      safety?: {
        opening_checks?: number;
        probe_readings?: number;
        cleaning_signoffs?: number;
        incidents?: number;
        training?: number;
      };
      error?: string;
    };
    const rpc = (rpcRaw ?? {}) as RpcResp;

    if (rpc.error) {
      return {
        ok: false,
        error: `rpc_returned_error (${accountName}): ${rpc.error}`,
      };
    }

    // Regenerate signals per site so detector output reflects the
    // freshly-shifted state. Aggregate across sites for the response.
    const perSiteRaw = rpc.per_site ?? [];
    let signalsTotal = 0;
    const breakdown: Record<string, number> = {};
    for (const entry of perSiteRaw) {
      const gen = await regenerateSignalsForSite(svc, entry.site_id);
      signalsTotal += gen.total;
      for (const [k, v] of Object.entries(gen.by_detector)) {
        breakdown[k] = (breakdown[k] ?? 0) + v;
      }
    }

    accounts.push({
      account_id: accountId,
      account_name: accountName,
      site_count: rpc.site_count ?? perSiteRaw.length,
      delta_seconds: Number(rpc.delta_seconds ?? 0),
      delta_days: Number(rpc.delta_days ?? 0),
      anchor_iso: rpc.anchor ?? null,
      per_site_tables: perSiteRaw,
      safety: {
        opening_checks: rpc.safety?.opening_checks ?? 0,
        probe_readings: rpc.safety?.probe_readings ?? 0,
        cleaning_signoffs: rpc.safety?.cleaning_signoffs ?? 0,
        incidents: rpc.safety?.incidents ?? 0,
        training: rpc.safety?.training ?? 0,
      },
      signals_generated: signalsTotal,
      signal_breakdown: breakdown,
    });
  }

  return {
    ok: true,
    accounts,
    timestamp: new Date().toISOString(),
  };
}
