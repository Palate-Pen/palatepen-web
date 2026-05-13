import { NextResponse } from 'next/server';
import { isAuthorized, audit, svc } from '@/lib/admin';
import { buildShowcasePayload, showcaseSummary } from '@/lib/seedShowcase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — preview the seed payload counts so the admin UI can show "this will
// replace X recipes, Y costings..." before the user confirms.
export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ summary: showcaseSummary() });
}

// POST — replace the showcase entity arrays on a target user_data row.
// Body: { userId: string }
//
// Replaces ALL entity arrays + profile fields with the canonical showcase
// set. Account-owning user_id stays intact. Idempotent: re-running produces
// the same end-state with stable seed-* IDs. Destructive — wipes whatever
// was previously on the account; the admin UI is responsible for confirming
// the user understands this.
export async function POST(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const userId = body?.userId;
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const supabase = svc();

  // Verify the target user_data row exists. If not, refuse — we don't want
  // to silently create a stranded row that doesn't match an auth user.
  const { data: existing } = await supabase
    .from('user_data')
    .select('user_id, account_id, profile')
    .eq('user_id', userId)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: 'user_data row not found for that user — initialize first via the orphan list.' }, { status: 404 });
  }

  const payload = buildShowcasePayload();

  // Merge profile: preserve fields the showcase doesn't touch (like avatar /
  // theme settings), overwrite the showcase-specific ones.
  const beforeProfile = (existing.profile && typeof existing.profile === 'object') ? existing.profile : {};
  const mergedProfile = { ...beforeProfile, ...payload.profile };

  const { error: updateErr } = await supabase
    .from('user_data')
    .update({
      profile:           mergedProfile,
      recipes:           payload.recipes,
      gp_history:        payload.gp_history,
      ingredients_bank:  payload.ingredients_bank,
      stock_items:       payload.stock_items,
      invoices:          payload.invoices,
      price_alerts:      payload.price_alerts,
      menus:             payload.menus,
      notes:             payload.notes,
      waste_log:         payload.waste_log,
      updated_at:        new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Mirror the profile tier to accounts owned by this user — in the multi-
  // user world `accounts.tier` is the source of truth (Stripe webhook writes
  // here, the app reads from currentAccount). Without this, the seed leaves
  // the account on whatever tier was there before and Kitchen-gated features
  // (public menus, API access, My Team) don't light up.
  const targetTier = (payload.profile as any)?.tier;
  let acctErrMsg: string | null = null;
  if (targetTier && typeof targetTier === 'string') {
    const { error: acctErr } = await supabase
      .from('accounts')
      .update({ tier: targetTier, updated_at: new Date().toISOString() })
      .eq('owner_user_id', userId);
    if (acctErr) {
      acctErrMsg = `${acctErr.code}: ${acctErr.message}`;
      console.error('[seed-showcase] account tier mirror failed:', acctErrMsg);
    }
  }

  // Read back the account row so the caller can verify the mirror landed.
  // accounts.id is aliased to user.id for personal accounts (per migration
  // 007 backfill) so we look up either by id or owner_user_id.
  const { data: acctRow } = await supabase
    .from('accounts')
    .select('id, owner_user_id, tier, name')
    .eq('owner_user_id', userId)
    .maybeSingle();

  await audit(req, supabase, 'seed_showcase', userId, {
    counts: showcaseSummary(),
    target_account_id: existing.account_id,
    account_tier_after: acctRow?.tier ?? null,
  });

  return NextResponse.json({
    ok: true,
    counts: showcaseSummary(),
    account: acctRow ? { id: acctRow.id, tier: acctRow.tier, name: acctRow.name } : null,
    accountUpdateError: acctErrMsg,
  });
}
