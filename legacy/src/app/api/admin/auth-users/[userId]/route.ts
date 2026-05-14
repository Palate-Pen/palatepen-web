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
  const { data: ownedAccounts } = await supabase
    .from('accounts')
    .select('id, name, tier')
    .eq('owner_user_id', userId);

  // Dependent-row cleanup, in FK-safe order. Migration 007 set
  // `accounts.owner_user_id` to ON DELETE RESTRICT (not CASCADE — the earlier
  // version of this route claimed CASCADE but the schema actually restricts),
  // so we must explicitly remove every account this user owns before calling
  // auth.admin.deleteUser, or Postgres rejects the delete with "Database
  // error deleting user".
  //
  // Order:
  //   1. user_data keyed on user_id      — no FK, must delete first.
  //   2. account_members where user_id   — memberships in OTHER accounts.
  //   3. accounts where owner_user_id    — cascades to account_members,
  //                                        user_data, account_invites that
  //                                        reference each owned account.
  //   4. auth.users row                  — RESTRICT now satisfied.
  await supabase.from('user_data').delete().eq('user_id', userId);
  await supabase.from('account_members').delete().eq('user_id', userId);
  const { error: accountsErr } = await supabase
    .from('accounts')
    .delete()
    .eq('owner_user_id', userId);
  if (accountsErr) {
    return NextResponse.json({ error: 'accounts cleanup failed: ' + accountsErr.message }, { status: 500 });
  }

  // The auth row last — once it's gone the rest can't be recovered
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await audit(req, supabase, 'hard_delete_user', userId, {
    snapshot: snapshot || null,
    ownedAccounts: ownedAccounts || [],
  });
  return NextResponse.json({ ok: true });
}
