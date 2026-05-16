'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { ADMIN_EMAIL } from '@/lib/admin';
import { regenerateSignalsForSite } from '@/lib/signal-detectors';

type SiteSummary = {
  site_id: string;
  site_name: string;
  kind: string;
  counts: Record<string, number>;
  signals_generated: number;
  signal_breakdown: Record<string, number>;
};

export type PopulateAccountResult =
  | {
      ok: true;
      account_id: string;
      account_name: string;
      sites: SiteSummary[];
      timestamp: string;
    }
  | { ok: false; error: string };

/**
 * Founder-only full reseed of a demo or founder account.
 *
 * Wipes every per-site v2.* table for every site of the account, then
 * re-inserts a fresh 30-day shape via the v2.populate_demo_account RPC.
 * Defends in depth — the RPC itself returns an error if the account is
 * neither is_demo nor is_founder, but we also check at the app layer to
 * keep the affordance off non-demo accounts entirely.
 *
 * Different from reseedHelloDemoAction (which time-shifts existing data):
 * this one starts from a clean slate, so it's the right move when the
 * shape has drifted or after a schema change broke the existing fixtures.
 *
 * Idempotent — safe to spam. Re-runs produce the same shape.
 */
export async function populateAccountAction(
  accountId: string,
): Promise<PopulateAccountResult> {
  const supabaseUser = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();
  if (!user) return { ok: false, error: 'unauthenticated' };
  if ((user.email ?? '').toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return { ok: false, error: 'forbidden' };
  }

  if (!accountId) return { ok: false, error: 'missing_account_id' };

  const svc = createSupabaseServiceClient();

  // App-layer gate. RPC repeats this, but we want a friendlier error
  // surface in the UI for the common "wrong account" mistake.
  const { data: acc } = await svc
    .from('accounts')
    .select('id, name, is_demo, is_founder')
    .eq('id', accountId)
    .maybeSingle();
  if (!acc) return { ok: false, error: 'account_not_found' };
  if (!acc.is_demo && !acc.is_founder) {
    return { ok: false, error: 'account_not_demo_or_founder' };
  }

  // Heavy lifting in the RPC. Returns jsonb with per-site counts.
  const { data: rpcRaw, error: rpcErr } = await svc.rpc(
    'populate_demo_account',
    { p_account_id: accountId },
  );
  if (rpcErr) {
    return { ok: false, error: `rpc_failed: ${rpcErr.message}` };
  }

  type RpcResp = {
    ok?: boolean;
    error?: string;
    account_id?: string;
    account_name?: string;
    sites?: Array<{
      site_id: string;
      site_name: string;
      kind: string;
      counts: Record<string, number>;
    }>;
    timestamp?: string;
  };
  const rpc = (rpcRaw ?? {}) as RpcResp;
  if (!rpc.ok) {
    return { ok: false, error: `rpc_returned_error: ${rpc.error ?? 'unknown'}` };
  }

  // Regenerate forward signals per site so detector output reflects
  // the freshly-populated state.
  const sites: SiteSummary[] = [];
  for (const s of rpc.sites ?? []) {
    const gen = await regenerateSignalsForSite(svc, s.site_id);
    sites.push({
      site_id: s.site_id,
      site_name: s.site_name,
      kind: s.kind,
      counts: s.counts,
      signals_generated: gen.total,
      signal_breakdown: gen.by_detector,
    });
  }

  // Revalidate every surface the populate touches.
  revalidatePath('/');
  revalidatePath('/inbox');
  revalidatePath('/prep');
  revalidatePath('/recipes');
  revalidatePath('/menus');
  revalidatePath('/margins');
  revalidatePath('/stock-suppliers');
  revalidatePath('/stock-suppliers/the-bank');
  revalidatePath('/stock-suppliers/invoices');
  revalidatePath('/stock-suppliers/deliveries');
  revalidatePath('/stock-suppliers/suppliers');
  revalidatePath('/stock-suppliers/waste');
  revalidatePath('/stock-suppliers/credit-notes');
  revalidatePath('/stock-suppliers/stock-count');
  revalidatePath('/stock-suppliers/purchase-orders');
  revalidatePath('/notebook');
  revalidatePath('/bartender');
  revalidatePath('/bartender/specs');
  revalidatePath('/bartender/mise');
  revalidatePath('/bartender/margins');
  revalidatePath('/bartender/back-bar');
  revalidatePath('/bartender/back-bar/cellar');
  revalidatePath('/bartender/back-bar/spillage');
  revalidatePath('/bartender/back-bar/stock-take');
  revalidatePath('/bartender/inbox');
  revalidatePath('/bartender/notebook');
  revalidatePath('/manager');
  revalidatePath('/manager/inbox');
  revalidatePath('/owner');
  revalidatePath('/owner/inbox');
  revalidatePath('/owner/sites');
  revalidatePath('/owner/reports');
  revalidatePath('/safety');
  revalidatePath('/safety/probe');
  revalidatePath('/safety/incidents');
  revalidatePath('/safety/cleaning');
  revalidatePath('/safety/training');
  revalidatePath('/safety/eho');
  revalidatePath('/admin/ops');
  revalidatePath(`/admin/accounts/${accountId}`);

  return {
    ok: true,
    account_id: accountId,
    account_name: acc.name ?? 'Account',
    sites,
    timestamp: new Date().toISOString(),
  };
}
