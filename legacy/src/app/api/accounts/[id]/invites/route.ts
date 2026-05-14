import { NextResponse } from 'next/server';
import { verifyMember, seatUsage, genInviteToken, type Role } from '@/lib/team';

export const dynamic = 'force-dynamic';

// POST /api/accounts/[id]/invites  { email, role }
// Manager+ creates an invite. Enforces tier seat limits.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const accountId = params.id;
  const auth = await verifyMember(req, accountId, 'manager');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || '').trim().toLowerCase();
  const role = String(body?.role || '') as Role;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }
  if (!['manager', 'chef', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Role must be manager, chef, or viewer' }, { status: 400 });
  }

  const { supabase } = auth;

  // Look up account tier for seat check
  const { data: account } = await supabase.from('accounts').select('tier, name').eq('id', accountId).single();
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  const usage = await seatUsage(supabase, accountId, account.tier);
  if (!usage.hasRoom) {
    // Direct the inviter at the right next tier rather than a generic
    // "upgrade" — Group caps at 25, so the next step is Enterprise.
    const nextTier =
      account.tier === 'free'    ? 'Kitchen (5 users)' :
      account.tier === 'pro'     ? 'Kitchen (5 users)' :
      account.tier === 'kitchen' ? 'Group (25 users)' :
      account.tier === 'group'   ? 'Enterprise (unlimited users)' :
      'a higher plan';
    return NextResponse.json({
      error: `Seat limit reached for ${account.tier} tier (${usage.used} of ${usage.limit}). Upgrade to ${nextTier} to invite more.`,
      seatLimitReached: true,
      currentTier: account.tier,
      nextTier: account.tier === 'group' ? 'enterprise' : (account.tier === 'kitchen' ? 'group' : 'kitchen'),
    }, { status: 403 });
  }

  // Reject if email already a member of this account
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existingUser = list.users.find(u => u.email?.toLowerCase() === email);
  if (existingUser) {
    const { data: existingMember } = await supabase.from('account_members').select('user_id').eq('account_id', accountId).eq('user_id', existingUser.id).maybeSingle();
    if (existingMember) {
      return NextResponse.json({ error: 'That email is already a member' }, { status: 409 });
    }
  }

  // Reject if there's already a pending invite for this email/account
  const { data: existingInvite } = await supabase.from('account_invites').select('id').eq('account_id', accountId).eq('email', email).is('accepted_at', null).gt('expires_at', new Date().toISOString()).maybeSingle();
  if (existingInvite) {
    return NextResponse.json({ error: 'A pending invite already exists for that email' }, { status: 409 });
  }

  const token = genInviteToken();
  const { data: invite, error } = await supabase.from('account_invites').insert({
    account_id: accountId,
    email,
    role,
    token,
    invited_by: auth.userId,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ invite, accountName: account.name });
}
