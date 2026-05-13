import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { svc } from '@/lib/admin';
import { isAdminEmail } from '@/lib/adminEmails';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Self-serve account deletion. Hard-deletes:
// 1) every user_data row belonging to accounts the user owns,
// 2) every account_members row referencing the user (so their non-owner
//    memberships go away too),
// 3) every account they own (accounts.owner_user_id is ON DELETE RESTRICT,
//    so we MUST delete account_members + user_data first),
// 4) the auth.users row itself.
//
// Guards: refuses if the caller owns a team account that still has another
// active member — those need a manual ownership transfer first. Refuses
// outright for admin/operator emails so we can't accidentally self-delete
// the founder console.
//
// Stripe is intentionally NOT cancelled here. If you delete your account
// while paying, your subscription keeps running until the next renewal —
// follow up via Stripe customer portal or contact support. TODO when we
// have a clean cancel flow.

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 });

  // Verify the caller via their session token.
  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: 'Bearer ' + token } } },
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  if (isAdminEmail(user.email)) {
    return NextResponse.json(
      { error: 'Admin/operator accounts cannot be self-deleted. Contact engineering.' },
      { status: 403 },
    );
  }

  const supabase = svc();

  // Find every account this user owns.
  const { data: ownedAccounts, error: ownedErr } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('owner_user_id', user.id);
  if (ownedErr) {
    return NextResponse.json({ error: 'Could not load owned accounts' }, { status: 500 });
  }
  const ownedIds = (ownedAccounts || []).map(a => a.id);

  // Block deletion if any owned account has additional active members.
  // The owner's own membership counts, so we look for > 1.
  if (ownedIds.length > 0) {
    const { count, error: membersErr } = await supabase
      .from('account_members')
      .select('user_id', { count: 'exact', head: true })
      .in('account_id', ownedIds)
      .neq('user_id', user.id);
    if (membersErr) {
      return NextResponse.json({ error: 'Could not check team members' }, { status: 500 });
    }
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          error: 'You own a team account with other members. Transfer ownership or remove the other members in My Team first, then try again.',
        },
        { status: 409 },
      );
    }
  }

  // Order matters: user_data → account_members → accounts → auth user.
  // Each FK is ON DELETE RESTRICT in places, so we delete bottom-up.
  if (ownedIds.length > 0) {
    const { error: udErr } = await supabase.from('user_data').delete().in('account_id', ownedIds);
    if (udErr) {
      console.error('[account-delete] user_data delete failed:', udErr.code, udErr.message);
      return NextResponse.json({ error: 'Failed to delete user data: ' + udErr.message }, { status: 500 });
    }
  }

  // Drop every membership row referencing this user (owner and non-owner).
  const { error: memErr } = await supabase.from('account_members').delete().eq('user_id', user.id);
  if (memErr) {
    console.error('[account-delete] account_members delete failed:', memErr.code, memErr.message);
    return NextResponse.json({ error: 'Failed to delete memberships: ' + memErr.message }, { status: 500 });
  }

  // Drop the owned account rows now that their dependents are gone.
  if (ownedIds.length > 0) {
    const { error: acctErr } = await supabase.from('accounts').delete().in('id', ownedIds);
    if (acctErr) {
      console.error('[account-delete] accounts delete failed:', acctErr.code, acctErr.message);
      return NextResponse.json({ error: 'Failed to delete accounts: ' + acctErr.message }, { status: 500 });
    }
  }

  // Finally, delete the auth user.
  const { error: authErr } = await supabase.auth.admin.deleteUser(user.id);
  if (authErr) {
    console.error('[account-delete] auth.deleteUser failed:', authErr.message);
    return NextResponse.json({ error: 'Failed to delete auth user: ' + authErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deletedAccounts: ownedIds.length });
}
