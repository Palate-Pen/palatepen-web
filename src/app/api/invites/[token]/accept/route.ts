import { NextResponse } from 'next/server';
import { verifyAuthed } from '@/lib/team';

export const dynamic = 'force-dynamic';

// POST /api/invites/[token]/accept  body: { merge?: boolean }
//
// Authenticated user accepts an invite. Always inserts the team membership
// and marks the invite accepted. When body.merge === true, additionally:
//   - Reads the user's personal Free-tier owned account (recipes, notes,
//     costings, bank, invoices, stock, menus, waste log).
//   - Tags every item with addedBy = userId for chef-space attribution.
//   - Appends to the team account's user_data arrays. Bank ingredients are
//     deduped by lowercase name (team's existing entry wins; we don't
//     overwrite price or allergen data).
//   - Deletes the personal user_data row, then the personal account
//     (membership row cascades).
//
// Email match between invite + signed-in user is soft-checked (warned, not
// blocked) so a user signing up with a slightly different address doesn't
// get locked out of the invite they paid for.
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const auth = await verifyAuthed(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const wantMerge = body?.merge === true;

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

  // Membership upsert (idempotent — already a member is fine).
  const { error: memberErr } = await supabase
    .from('account_members')
    .upsert({
      account_id: invite.account_id,
      user_id: userId,
      role: invite.role,
      added_by: userId,
    }, { onConflict: 'account_id,user_id' });
  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 });

  // Mark invite accepted before any merge work — even if merge fails the
  // membership exists, which is the contract.
  const { error: inviteErr } = await supabase
    .from('account_invites')
    .update({ accepted_at: new Date().toISOString(), accepted_by: userId })
    .eq('id', invite.id);
  if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 });

  let mergeResult: { merged: boolean; itemCount?: number; reason?: string } = { merged: false };
  if (wantMerge) {
    mergeResult = await mergePersonalIntoTeam(supabase, userId, invite.account_id);
  }

  return NextResponse.json({
    ok: true,
    accountId: invite.account_id,
    role: invite.role,
    emailMatch,
    merge: mergeResult,
  });
}

async function mergePersonalIntoTeam(supabase: any, userId: string, teamAccountId: string) {
  // Find personal Free-tier owned account (not the team being joined).
  const { data: ownedRows } = await supabase
    .from('account_members')
    .select('account_id, accounts!inner(id, tier, owner_user_id)')
    .eq('user_id', userId)
    .eq('role', 'owner');
  const personal = (ownedRows || [])
    .map((r: any) => r.accounts)
    .find((a: any) => a && a.id !== teamAccountId && a.tier === 'free');
  if (!personal) return { merged: false, reason: 'No mergeable personal account' };

  const [{ data: personalData }, { data: teamData }] = await Promise.all([
    supabase.from('user_data').select('*').eq('account_id', personal.id).maybeSingle(),
    supabase.from('user_data').select('*').eq('account_id', teamAccountId).maybeSingle(),
  ]);

  if (!personalData) {
    // No data → just delete the empty account
    await supabase.from('accounts').delete().eq('id', personal.id);
    return { merged: true, itemCount: 0 };
  }

  const tag = (item: any) => ({ ...item, addedBy: item?.addedBy || userId });
  const tagAll = (arr: any[]) => (arr || []).map(tag);

  // Bank dedupe: keep team's existing entries by lowercase name; only add
  // names that don't exist in team's bank yet (still tagged with addedBy).
  const teamBankNames = new Set<string>(
    (teamData?.ingredients_bank || []).map((i: any) => String(i?.name || '').toLowerCase().trim()).filter(Boolean)
  );
  const newBank = (personalData.ingredients_bank || []).filter((i: any) => {
    const n = String(i?.name || '').toLowerCase().trim();
    return n && !teamBankNames.has(n);
  });

  const merged = {
    recipes:          [...tagAll(personalData.recipes          || []), ...(teamData?.recipes          || [])],
    notes:            [...tagAll(personalData.notes            || []), ...(teamData?.notes            || [])],
    gp_history:       [...tagAll(personalData.gp_history       || []), ...(teamData?.gp_history       || [])],
    ingredients_bank: [...tagAll(newBank),                              ...(teamData?.ingredients_bank || [])],
    invoices:         [...tagAll(personalData.invoices         || []), ...(teamData?.invoices         || [])],
    price_alerts:     [...tagAll(personalData.price_alerts     || []), ...(teamData?.price_alerts     || [])],
    stock_items:      [...tagAll(personalData.stock_items      || []), ...(teamData?.stock_items      || [])],
    menus:            [...tagAll(personalData.menus            || []), ...(teamData?.menus            || [])],
    waste_log:        [...tagAll(personalData.waste_log        || []), ...(teamData?.waste_log        || [])],
  };

  // We never overwrite the team's profile (their kitchen identity stays).
  if (teamData) {
    await supabase.from('user_data').update({
      ...merged,
      updated_at: new Date().toISOString(),
    }).eq('account_id', teamAccountId);
  } else {
    // Edge case: team has no user_data row yet (shouldn't happen post-trigger)
    await supabase.from('user_data').insert({
      user_id: userId, account_id: teamAccountId,
      ...merged,
      profile: personalData.profile || {},
    });
  }

  // Delete the personal account (CASCADE removes account_members + user_data).
  await supabase.from('accounts').delete().eq('id', personal.id);

  const itemCount = Object.values(merged).reduce((sum: number, arr: any) => sum + (arr?.length || 0), 0)
    - Object.values(teamData || {}).reduce((sum: number, val: any) => sum + (Array.isArray(val) ? val.length : 0), 0);

  return { merged: true, itemCount: Math.max(itemCount, 0) };
}
