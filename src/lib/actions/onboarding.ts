'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function saveKitchenName(formData: FormData) {
  const kitchenName = String(formData.get('kitchen_name') ?? '').trim();
  if (!kitchenName) {
    redirect('/onboarding?error=name_required');
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    redirect('/signin');
  }

  // Find the user's owner membership; rename both the site and the account.
  // Free/Pro/Kitchen tiers have exactly one auto-created site, so the rename
  // applies to it. Group/Enterprise users (when supported) rename only the
  // account here and pick a per-site name in a later onboarding step.
  const { data: memberships, error: memErr } = await supabase
    .from('memberships')
    .select('site_id')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .limit(1);

  if (memErr || !memberships || memberships.length === 0) {
    redirect('/onboarding?error=no_owner_membership');
  }

  const siteId = memberships[0].site_id as string;

  const { data: site, error: siteErr } = await supabase
    .from('sites')
    .select('account_id')
    .eq('id', siteId)
    .single();

  if (siteErr || !site) {
    redirect('/onboarding?error=site_lookup_failed');
  }

  await supabase.from('sites').update({ name: kitchenName }).eq('id', siteId);
  await supabase
    .from('accounts')
    .update({ name: kitchenName })
    .eq('id', site.account_id);

  redirect('/');
}
