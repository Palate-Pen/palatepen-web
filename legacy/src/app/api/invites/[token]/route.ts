import { NextResponse } from 'next/server';
import { svc } from '@/lib/admin';

export const dynamic = 'force-dynamic';

// GET /api/invites/[token]
// Public lookup: anyone with the link can read basic invite metadata.
// Optionally takes an Authorization: Bearer <user_token> header — when
// present and valid, the response also includes `userContext` describing
// the signed-in user's personal Free-tier account (if any) so the
// acceptance page can offer a merge choice.
export async function GET(req: Request, { params }: { params: { token: string } }) {
  const supabase = svc();

  const { data: invite, error } = await supabase
    .from('account_invites')
    .select('id, account_id, email, role, created_at, expires_at, accepted_at')
    .eq('token', params.token)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });

  const expired  = new Date(invite.expires_at).getTime() < Date.now();
  const accepted = !!invite.accepted_at;

  const { data: account } = await supabase
    .from('accounts')
    .select('id, name, tier')
    .eq('id', invite.account_id)
    .single();

  // Optional user context for the merge prompt.
  let userContext: any = null;
  const auth = req.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7);
    const { data: userData } = await supabase.auth.getUser(token);
    if (userData?.user) {
      const userId = userData.user.id;
      const { data: ownedRows } = await supabase
        .from('account_members')
        .select('account_id, accounts!inner(id, tier, owner_user_id)')
        .eq('user_id', userId)
        .eq('role', 'owner');

      // A "personal" account is one this user owns that isn't the inviting team.
      // Only Free-tier personal accounts are eligible for merge prompts —
      // people pay for their own paid accounts deliberately and shouldn't be
      // nudged to dissolve them.
      const personal = (ownedRows || [])
        .map((r: any) => r.accounts)
        .find((a: any) => a && a.id !== invite.account_id && a.tier === 'free');

      if (personal) {
        const { data: ud } = await supabase
          .from('user_data')
          .select('recipes, notes, gp_history, ingredients_bank, invoices, stock_items, menus, waste_log')
          .eq('account_id', personal.id)
          .maybeSingle();
        const counts = {
          recipes:  (ud?.recipes          || []).length,
          notes:    (ud?.notes            || []).length,
          costings: (ud?.gp_history       || []).length,
          bank:     (ud?.ingredients_bank || []).length,
          invoices: (ud?.invoices         || []).length,
          stock:    (ud?.stock_items      || []).length,
          menus:    (ud?.menus            || []).length,
          waste:    (ud?.waste_log        || []).length,
        };
        const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);
        userContext = {
          hasMergeablePersonal: true,
          personalAccountId: personal.id,
          counts,
          totalItems,
        };
      } else {
        userContext = { hasMergeablePersonal: false };
      }
    }
  }

  return NextResponse.json({
    invite: {
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expires_at,
    },
    accountName: account?.name || 'a Palatable account',
    accountTier: account?.tier || 'free',
    expired,
    accepted,
    userContext,
  });
}
