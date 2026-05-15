'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { ADMIN_EMAIL } from '@/lib/admin';
import { regenerateSignalsForSite } from '@/lib/signal-detectors';

export type ReseedResult =
  | {
      ok: true;
      site_id: string;
      site_name: string;
      delta_seconds: number;
      delta_days: number;
      signals_refreshed: number;
      signals_generated: number;
      signal_breakdown: Record<string, number>;
      tables: Array<{ name: string; rows_shifted: number }>;
      timestamp: string;
    }
  | { ok: false; error: string };

/**
 * Re-anchor the founder demo data to "now".
 *
 * Why: chef demos work best when the data feels live. After a few days
 * untouched, prep_items.due_at is in the past, forward_signals have
 * expired, deliveries are weeks-late. This action computes the delta
 * between the most recent timestamp in the founder site and right now,
 * then shifts every time-sensitive table forward by that delta. Result:
 * the most recent record is "now", everything else trails behind in
 * the same shape it always had.
 *
 * Also resets forward_signals.dismissed_at + acted_at to null so any
 * insights that were dismissed reappear (otherwise the chef demos a
 * mostly-empty Inbox after using the surface once).
 *
 * Gated to ADMIN_EMAIL only — both the layout and this action check.
 * Uses the service-role client to bypass RLS (admin op).
 */
export async function reseedFounderDemoAction(): Promise<ReseedResult> {
  const supabaseUser = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();
  if (!user) return { ok: false, error: 'unauthenticated' };
  if ((user.email ?? '').toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return { ok: false, error: 'forbidden' };
  }

  const svc = createSupabaseServiceClient();

  // Find the founder site. Single founder account for v1; if multiple
  // ever exist, this reseeds the first one returned — we'd want a site
  // selector at that point.
  const { data: founderAccounts } = await svc
    .from('accounts')
    .select('id, name')
    .eq('is_founder', true)
    .limit(1);
  const founderAccountId = founderAccounts?.[0]?.id as string | undefined;
  if (!founderAccountId) {
    return { ok: false, error: 'no_founder_account' };
  }
  const { data: sites } = await svc
    .from('sites')
    .select('id, name')
    .eq('account_id', founderAccountId)
    .limit(1);
  const site = sites?.[0];
  if (!site) {
    return { ok: false, error: 'no_founder_site' };
  }
  const siteId = site.id as string;
  const siteName = (site.name as string) ?? 'Founder site';

  // Compute the global delta: shift everything so the latest timestamp
  // across all time-sensitive tables becomes "now". This means the data
  // keeps its internal cadence (eg "Friday stock take 3 days before
  // today's signals") but slides forward in time as a block.
  //
  // We sample forward_signals.emitted_at as the anchor because signals
  // are always the most recent thing on the demo site. Fall back to
  // ingredient_price_history if no signals exist.

  const { data: sigSample } = await svc
    .from('forward_signals')
    .select('emitted_at')
    .eq('site_id', siteId)
    .order('emitted_at', { ascending: false })
    .limit(1);
  let anchorIso = sigSample?.[0]?.emitted_at as string | undefined;
  if (!anchorIso) {
    const { data: priceSample } = await svc
      .from('ingredient_price_history')
      .select('recorded_at, ingredients!inner (site_id)')
      .eq('ingredients.site_id', siteId)
      .order('recorded_at', { ascending: false })
      .limit(1);
    anchorIso = (priceSample?.[0] as { recorded_at?: string })?.recorded_at;
  }
  if (!anchorIso) {
    return { ok: false, error: 'no_anchor_timestamp_found' };
  }

  const now = new Date();
  const anchor = new Date(anchorIso);
  const deltaSeconds = Math.round((now.getTime() - anchor.getTime()) / 1000);
  const deltaDays = Math.round(deltaSeconds / 86400);

  // The heavy lifting lives in v2.reseed_founder_demo() — one stored
  // procedure that shifts every time-sensitive table by the supplied
  // delta in a single transaction. The function is SECURITY DEFINER so
  // it bypasses RLS; application-level admin gate + the RPC grant
  // restrict invocation. See 20260515_v2_reseed_founder_demo_rpc.sql.
  const { data: shiftResult, error: shiftErr } = await svc.rpc(
    'reseed_founder_demo',
    { p_site_id: siteId, p_delta_seconds: deltaSeconds },
  );
  if (shiftErr) {
    return { ok: false, error: `rpc_failed: ${shiftErr.message}` };
  }

  // RPC returns jsonb { table_name: rows_shifted }
  const summary = (shiftResult ?? {}) as Record<string, number>;
  const tableNames = [
    'forward_signals',
    'prep_items',
    'deliveries',
    'invoices',
    'ingredient_price_history',
    'ingredients_last_seen',
    'waste_entries',
    'notebook_entries',
    'recipes_costed',
    'stock_takes',
    'allocations',
    'credit_notes',
  ];
  const results = tableNames.map((name) => ({
    name,
    rows_shifted: Number(summary[name] ?? 0),
  }));

  // Regenerate fresh detector-emitted signals based on the now-shifted
  // state. Wipes existing detector_kind='auto' signals and re-inserts
  // from 8 production detectors (par breach, allocations arriving,
  // flagged invoices without credit notes, recipe drift, spillage
  // patterns, stock-take variance, today's deliveries, tonight's prep).
  // The previously-shifted manual signals stay in place.
  const signalGen = await regenerateSignalsForSite(svc, siteId);

  // Revalidate everything that might display this data.
  revalidatePath('/');
  revalidatePath('/inbox');
  revalidatePath('/prep');
  revalidatePath('/recipes');
  revalidatePath('/margins');
  revalidatePath('/stock-suppliers');
  revalidatePath('/stock-suppliers/the-bank');
  revalidatePath('/stock-suppliers/invoices');
  revalidatePath('/stock-suppliers/deliveries');
  revalidatePath('/stock-suppliers/suppliers');
  revalidatePath('/stock-suppliers/waste');
  revalidatePath('/stock-suppliers/credit-notes');
  revalidatePath('/stock-suppliers/stock-count');
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
  revalidatePath('/admin/ops');

  return {
    ok: true,
    site_id: siteId,
    site_name: siteName,
    delta_seconds: deltaSeconds,
    delta_days: deltaDays,
    signals_refreshed: Number(summary['forward_signals'] ?? 0),
    signals_generated: signalGen.total,
    signal_breakdown: signalGen.by_detector,
    tables: results,
    timestamp: new Date().toISOString(),
  };
}
