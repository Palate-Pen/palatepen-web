import { NextResponse } from 'next/server';
import { isAuthorized, audit, svc } from '@/lib/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Hard-delete an auth user — wipes the auth.users row AND any user_data,
// accounts, and account_members rows that hang off it. Used by the admin
// "Delete fully" action on orphaned auth users. Audit-logged before the
// auth row goes away so the diff is preserved.
export async function DELETE(req: Request, { params }: { params: { userId: string } | Promise<{ userId: string }> }) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { userId } = await Promise.resolve(params as any);
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }
  const supabase = svc();

  // Snapshot anything we're about to nuke so the audit log has context
  const { data: snapshot } = await supabase
    .from('user_data')
    .select('profile, account_id')
    .eq('user_id', userId)
    .maybeSingle();

  // Best-effort cleanup of dependent rows. accounts.owner_user_id has ON
  // DELETE CASCADE in migration 007 so deleting the auth user should cascade
  // most of this — but we wipe user_data explicitly because it's keyed on
  // user_id directly (no FK constraint).
  await supabase.from('user_data').delete().eq('user_id', userId);
  await supabase.from('account_members').delete().eq('user_id', userId);
  // accounts owned by this user are cascaded when the auth row is deleted
  // (FK ON DELETE CASCADE on accounts.owner_user_id); no manual call needed.

  // The auth row last — once it's gone the rest can't be recovered
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await audit(req, supabase, 'hard_delete_user', userId, {
    snapshot: snapshot || null,
  });
  return NextResponse.json({ ok: true });
}
