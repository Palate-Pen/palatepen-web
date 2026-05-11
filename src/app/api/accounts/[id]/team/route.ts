import { NextResponse } from 'next/server';
import { verifyMember, seatUsage } from '@/lib/team';

export const dynamic = 'force-dynamic';

// GET /api/accounts/[id]/team
// Returns enriched member list + pending invites + seat usage.
// Anyone in the account (viewer+) can see the team.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const accountId = params.id;
  const auth = await verifyMember(req, accountId, 'viewer');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabase } = auth;

  const [{ data: account }, { data: members }, { data: invites }] = await Promise.all([
    supabase.from('accounts').select('id,name,owner_user_id,tier').eq('id', accountId).single(),
    supabase.from('account_members').select('user_id, role, added_at, added_by').eq('account_id', accountId).order('added_at', { ascending: true }),
    supabase.from('account_invites').select('id, email, role, token, created_at, expires_at, accepted_at, invited_by').eq('account_id', accountId).is('accepted_at', null).order('created_at', { ascending: false }),
  ]);

  // Enrich members with auth.users data (name + email)
  const userIds = (members || []).map(m => m.user_id);
  const enrichedMembers: any[] = [];
  if (userIds.length > 0) {
    // listUsers doesn't take an id filter — page through and match
    const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const byId = new Map(list.users.map(u => [u.id, u]));
    for (const m of members || []) {
      const u = byId.get(m.user_id);
      enrichedMembers.push({
        userId: m.user_id,
        role: m.role,
        addedAt: m.added_at,
        email: u?.email || null,
        name: u?.user_metadata?.name || null,
      });
    }
  }

  const usage = account ? await seatUsage(supabase, accountId, account.tier) : { used: 0, limit: null, hasRoom: false };

  return NextResponse.json({
    account,
    members: enrichedMembers,
    invites: invites || [],
    seats: usage,
    yourRole: auth.role,
  });
}
