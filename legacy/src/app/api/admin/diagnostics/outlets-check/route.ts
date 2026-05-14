import { NextResponse } from 'next/server';
import { isAuthorized, svc } from '@/lib/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Diagnostic — answers "why doesn't the outlet UI show data for this user?"
// Returns a structured report of every check we'd want to run by hand:
//
// - tableExists.outlets          → did the Phase 3 migration apply at all?
// - tableExists.purchase_orders  → did it apply fully?
// - accountsTierConstraint       → does the CHECK allow 'group' + 'enterprise'?
// - user                         → resolved auth user + email match
// - account                      → owned account + tier + members
// - outlets                      → rows for this account
// - userData                     → row presence + entity counts + outletId
//                                  distribution on invoices/stock/waste/menus
//                                  so we can see whether the seed actually
//                                  stamped outlet ids.
//
// Usage: GET /api/admin/diagnostics/outlets-check?email=jack@palateandpen.co.uk
//   with the standard admin bearer header.

export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'email query param required' }, { status: 400 });

  const supabase = svc();
  const out: any = { email };

  // ── 1. Does the outlets table exist?
  // We probe with a HEAD + count query. PostgREST returns 42P01 when the
  // relation doesn't exist; treat that as "missing", everything else as
  // "exists" (count may be 0).
  async function tableExists(name: string): Promise<{ exists: boolean; error?: string }> {
    const { error } = await supabase.from(name).select('*', { count: 'exact', head: true });
    if (!error) return { exists: true };
    const code = (error as any)?.code;
    if (code === '42P01' || /relation .* does not exist/i.test(error.message)) {
      return { exists: false, error: error.message };
    }
    // Some other error — table likely exists but the query failed for
    // another reason (RLS, permission, etc). Surface the detail.
    return { exists: true, error: `${code}: ${error.message}` };
  }
  out.tableExists = {
    outlets:              await tableExists('outlets'),
    purchase_orders:      await tableExists('purchase_orders'),
    purchase_order_items: await tableExists('purchase_order_items'),
  };

  // ── 2. accounts.tier CHECK constraint — does it allow group/enterprise?
  // We can't read pg_constraint directly via supabase-js easily, but we can
  // attempt a no-op update with the value 'enterprise' to a non-existent
  // id and check the error code. 23514 = check_violation; PGRST116 = no
  // rows affected (which is what we want — means CHECK passed).
  const probe = await supabase
    .from('accounts')
    .update({ tier: 'enterprise', updated_at: new Date().toISOString() })
    .eq('id', '00000000-0000-0000-0000-000000000000');
  out.accountsTierConstraint = {
    allowsEnterprise: (probe.error as any)?.code !== '23514',
    error: probe.error ? `${(probe.error as any).code}: ${probe.error.message}` : null,
  };

  // ── 3. User + account lookup
  const { data: usersRes } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const user = (usersRes?.users || []).find(u => (u.email || '').toLowerCase() === email);
  if (!user) {
    out.user = { found: false };
    return NextResponse.json(out);
  }
  out.user = { found: true, id: user.id, metadata_tier: user.user_metadata?.tier ?? null };

  const { data: account } = await supabase
    .from('accounts')
    .select('id, name, tier, owner_user_id, logo_url')
    .eq('owner_user_id', user.id)
    .maybeSingle();
  out.account = account ? {
    id: account.id,
    name: account.name,
    tier: account.tier,
    logo_url: account.logo_url ?? null,
  } : null;

  if (!account) return NextResponse.json(out);

  // ── 4. account_members
  const { count: memberCount } = await supabase
    .from('account_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('account_id', account.id);
  out.account.memberCount = memberCount ?? 0;

  // ── 5. Outlets for this account
  if (out.tableExists.outlets.exists) {
    const { data: outletRows, error: outletErr } = await supabase
      .from('outlets')
      .select('id, name, type, is_central_kitchen, address')
      .eq('account_id', account.id)
      .order('created_at', { ascending: true });
    out.outlets = outletErr
      ? { error: `${(outletErr as any).code}: ${outletErr.message}` }
      : { count: outletRows?.length ?? 0, rows: outletRows ?? [] };
  } else {
    out.outlets = { tableMissing: true };
  }

  // ── 6. user_data — entity counts + outletId distribution
  const { data: userData } = await supabase
    .from('user_data')
    .select('user_id, account_id, profile, recipes, gp_history, ingredients_bank, invoices, stock_items, menus, notes, waste_log')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!userData) {
    out.userData = { found: false };
    return NextResponse.json(out);
  }

  // Helper: count items + tally how many carry an outletId.
  function tally(arr: any[] | undefined | null): { total: number; withOutletId: number; outletIds: string[] } {
    const list = arr || [];
    const withOutletId = list.filter(i => i && typeof i.outletId === 'string').length;
    const outletIds = Array.from(new Set(list.map(i => i?.outletId).filter(Boolean)));
    return { total: list.length, withOutletId, outletIds };
  }

  out.userData = {
    found: true,
    accountIdOnRow: userData.account_id,
    profileTier: (userData.profile as any)?.tier ?? null,
    recipes:    tally(userData.recipes as any[]),
    costings:   tally(userData.gp_history as any[]),
    bank:       tally(userData.ingredients_bank as any[]),
    invoices:   tally(userData.invoices as any[]),
    stock:      tally(userData.stock_items as any[]),
    menus:      tally(userData.menus as any[]),
    notes:      tally(userData.notes as any[]),
    waste:      tally(userData.waste_log as any[]),
  };

  return NextResponse.json(out);
}
