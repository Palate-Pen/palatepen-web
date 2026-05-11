import { NextResponse } from 'next/server';
import { svc } from '@/lib/admin';

export const dynamic = 'force-dynamic';

// GET /api/invites/[token]
// Public lookup. The token IS the auth — anyone with the link can read it.
// Returns enough info to render the acceptance page.
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const supabase = svc();

  const { data: invite, error } = await supabase
    .from('account_invites')
    .select('id, account_id, email, role, created_at, expires_at, accepted_at')
    .eq('token', params.token)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });

  const expired = new Date(invite.expires_at).getTime() < Date.now();
  const accepted = !!invite.accepted_at;

  const { data: account } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('id', invite.account_id)
    .single();

  return NextResponse.json({
    invite: {
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expires_at,
    },
    accountName: account?.name || 'a Palatable account',
    expired,
    accepted,
  });
}
