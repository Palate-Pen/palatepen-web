import { NextResponse } from 'next/server';
import { verifyMember, type Role } from '@/lib/team';

export const dynamic = 'force-dynamic';

// PATCH /api/accounts/[id]/members/[userId]  { role }
// Manager+ changes a member's role. Owners can transfer ownership (sets the
// caller to manager and the target to owner). Owners cannot self-demote.
export async function PATCH(req: Request, { params }: { params: { id: string; userId: string } }) {
  const accountId = params.id;
  const auth = await verifyMember(req, accountId, 'manager');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const newRole = String(body?.role || '') as Role;
  if (!['owner', 'manager', 'chef', 'viewer'].includes(newRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const { supabase } = auth;
  const { data: target } = await supabase.from('account_members').select('role').eq('account_id', accountId).eq('user_id', params.userId).maybeSingle();
  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  // Promoting to owner = ownership transfer. Only an existing owner can do it.
  // Caller becomes manager and accounts.owner_user_id moves to the target.
  if (newRole === 'owner') {
    if (auth.role !== 'owner') return NextResponse.json({ error: 'Only an owner can transfer ownership' }, { status: 403 });
    if (params.userId === auth.userId) return NextResponse.json({ error: 'You are already the owner' }, { status: 400 });
    const { error: e1 } = await supabase.from('account_members').update({ role: 'owner' }).eq('account_id', accountId).eq('user_id', params.userId);
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
    const { error: e2 } = await supabase.from('account_members').update({ role: 'manager' }).eq('account_id', accountId).eq('user_id', auth.userId);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
    const { error: e3 } = await supabase.from('accounts').update({ owner_user_id: params.userId, updated_at: new Date().toISOString() }).eq('id', accountId);
    if (e3) return NextResponse.json({ error: e3.message }, { status: 500 });
    return NextResponse.json({ ok: true, transferred: true });
  }

  // Owners cannot be demoted directly — must transfer ownership first
  if (target.role === 'owner') {
    return NextResponse.json({ error: 'Cannot demote the owner. Transfer ownership first.' }, { status: 400 });
  }

  const { error } = await supabase.from('account_members').update({ role: newRole }).eq('account_id', accountId).eq('user_id', params.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/accounts/[id]/members/[userId]
// Manager+ removes a non-owner member. Owners cannot be removed; transfer first.
export async function DELETE(req: Request, { params }: { params: { id: string; userId: string } }) {
  const accountId = params.id;
  const auth = await verifyMember(req, accountId, 'manager');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabase } = auth;
  const { data: target } = await supabase.from('account_members').select('role').eq('account_id', accountId).eq('user_id', params.userId).maybeSingle();
  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  if (target.role === 'owner') return NextResponse.json({ error: 'Cannot remove the owner. Transfer ownership first.' }, { status: 400 });
  if (params.userId === auth.userId) return NextResponse.json({ error: 'Use leave-account to remove yourself' }, { status: 400 });

  const { error } = await supabase.from('account_members').delete().eq('account_id', accountId).eq('user_id', params.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
