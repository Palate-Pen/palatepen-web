import { NextResponse } from 'next/server';
import { isAuthorized, svc } from '@/lib/admin';
import { getGlobalFeatureFlags, isFeatureEnabled } from '@/lib/featureFlags';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Diagnostic — replays the loadMenu() pipeline used by /m/[slug] for a given
// slug and returns each step's result. Helps isolate which gate is causing
// the 404 (publicMenus flag / JSONB contains / tier check).
export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug') || '';
  if (!slug) return NextResponse.json({ error: 'slug query param required' }, { status: 400 });

  const supabase = svc();

  // Step 1: feature flag
  const flags = await getGlobalFeatureFlags();
  const publicMenusOn = isFeatureEnabled('publicMenus', flags);

  // Step 2a: try contains-with-published-true (the actual loadMenu query)
  const { data: strictRows, error: strictErr } = await supabase
    .from('user_data')
    .select('account_id, menus, profile')
    .contains('menus', [{ publicSlug: slug, published: true }])
    .limit(2);

  // Step 2b: try a less-strict version (publicSlug only, no published flag)
  // to see if the published=true coercion is the problem.
  const { data: looseRows } = await supabase
    .from('user_data')
    .select('account_id, menus')
    .contains('menus', [{ publicSlug: slug }])
    .limit(2);

  // Step 2c: brute-force — fetch ALL user_data rows and scan in JS for any
  // matching menu. If this finds it but strictRows doesn't, we know contains()
  // is the culprit.
  const { data: allRows } = await supabase.from('user_data').select('account_id, menus').limit(50);
  const jsHit = (allRows || []).find((r: any) =>
    (r.menus || []).some((m: any) => m?.publicSlug === slug && m?.published === true),
  );
  const jsLooseHit = (allRows || []).find((r: any) =>
    (r.menus || []).some((m: any) => m?.publicSlug === slug),
  );

  // Step 3: if we found the row, check the account tier
  let accountTier: string | null = null;
  const refRow = (strictRows && strictRows[0]) || jsHit;
  if (refRow) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id, tier, name')
      .eq('id', refRow.account_id)
      .single();
    accountTier = account?.tier ?? null;
  }

  return NextResponse.json({
    slug,
    publicMenusFlag: publicMenusOn,
    strictRowsCount: strictRows?.length ?? 0,
    strictErr: strictErr ? `${strictErr.code}: ${strictErr.message}` : null,
    looseRowsCount: looseRows?.length ?? 0,
    jsScanStrictHit: !!jsHit,
    jsScanLooseHit: !!jsLooseHit,
    foundAccountId: refRow?.account_id ?? null,
    accountTier,
    matchingMenuOnRow: jsLooseHit ? (jsLooseHit.menus || []).find((m: any) => m?.publicSlug === slug) : null,
  });
}
