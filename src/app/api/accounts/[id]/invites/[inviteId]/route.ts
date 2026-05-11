import { NextResponse } from 'next/server';
import { verifyMember } from '@/lib/team';

export const dynamic = 'force-dynamic';

// DELETE /api/accounts/[id]/invites/[inviteId]  — Manager+ revokes a pending invite.
export async function DELETE(req: Request, { params }: { params: { id: string; inviteId: string } }) {
  const accountId = params.id;
  const auth = await verifyMember(req, accountId, 'manager');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { error } = await auth.supabase.from('account_invites').delete().eq('id', params.inviteId).eq('account_id', accountId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
