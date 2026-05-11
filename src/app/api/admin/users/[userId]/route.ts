import { NextResponse } from 'next/server';
import { isAuthorized, audit, profileDiff, svc } from '@/lib/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { userId: string } }) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body || typeof body !== 'object' || !body.profile) {
    return NextResponse.json({ error: 'profile required' }, { status: 400 });
  }
  const supabase = svc();

  const { data: existing } = await supabase
    .from('user_data')
    .select('profile')
    .eq('user_id', params.userId)
    .maybeSingle();
  const beforeProfile = existing?.profile ?? {};

  const { data, error } = await supabase
    .from('user_data')
    .update({ profile: body.profile, updated_at: new Date().toISOString() })
    .eq('user_id', params.userId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Multi-user: tier + display name now live on the account, not on profile.
  // Mirror the change to the user's owned account so the app reads (which now
  // pull from currentAccount) stay in sync with admin edits.
  const beforeTier = (beforeProfile as any).tier;
  const afterTier  = body.profile.tier;
  const beforeName = (beforeProfile as any).name;
  const afterName  = body.profile.name;
  const accountPatch: Record<string, unknown> = {};
  if (afterTier && afterTier !== beforeTier) accountPatch.tier = afterTier;
  if (afterName && afterName !== beforeName) accountPatch.name = afterName;
  if (Object.keys(accountPatch).length > 0) {
    accountPatch.updated_at = new Date().toISOString();
    const { error: acctErr } = await supabase
      .from('accounts')
      .update(accountPatch)
      .eq('owner_user_id', params.userId);
    if (acctErr) console.error('[admin patch] account sync failed:', acctErr.code, acctErr.message);
  }

  const diff = profileDiff(beforeProfile, body.profile);
  if (Object.keys(diff).length > 0) {
    await audit(req, supabase, 'update_user', params.userId, { diff });
  }
  return NextResponse.json({ user: data });
}

export async function DELETE(req: Request, { params }: { params: { userId: string } }) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = svc();

  const { data: existing } = await supabase
    .from('user_data')
    .select('profile')
    .eq('user_id', params.userId)
    .maybeSingle();

  const { error } = await supabase
    .from('user_data')
    .delete()
    .eq('user_id', params.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit(req, supabase, 'delete_user', params.userId, {
    profile_snapshot: existing?.profile ?? null,
  });
  return NextResponse.json({ ok: true });
}
