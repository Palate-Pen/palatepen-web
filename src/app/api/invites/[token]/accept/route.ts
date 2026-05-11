import { NextResponse } from 'next/server';
import { verifyAuthed } from '@/lib/team';

export const dynamic = 'force-dynamic';

// POST /api/invites/[token]/accept
// Authenticated user accepts an invite. Creates the account_members row and
// marks the invite accepted. Email match between invite + signed-in user is
// soft-checked — we warn but allow, since users may sign up under a slightly
// different email and we don't want to lock them out of a paid invite.
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const auth = await verifyAuthed(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabase, userId, email } = auth;

  const { data: invite } = await supabase
    .from('account_invites')
    .select('id, account_id, email, role, expires_at, accepted_at')
    .eq('token', params.token)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  if (invite.accepted_at) return NextResponse.json({ error: 'Invite already accepted' }, { status: 410 });
  if (new Date(invite.expires_at).getTime() < Date.now()) return NextResponse.json({ error: 'Invite has expired' }, { status: 410 });

  const emailMatch = !!email && email.toLowerCase() === invite.email.toLowerCase();

  // Idempotent membership insert (already a member is fine, just mark accepted).
  const { error: memberErr } = await supabase
    .from('account_members')
    .upsert({
      account_id: invite.account_id,
      user_id: userId,
      role: invite.role,
      added_by: userId,
    }, { onConflict: 'account_id,user_id' });
  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 });

  const { error: inviteErr } = await supabase
    .from('account_invites')
    .update({ accepted_at: new Date().toISOString(), accepted_by: userId })
    .eq('id', invite.id);
  if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, accountId: invite.account_id, role: invite.role, emailMatch });
}
