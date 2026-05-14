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

  const { data: memberships, error: memErr } = await supabase
    .from('memberships')
    .select('site_id')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .limit(1);

  if (memErr) {
    console.error('[onboarding] memberships query failed:', memErr);
    redirect(
      `/onboarding?error=query_failed&detail=${encodeURIComponent(memErr.message)}`,
    );
  }
  if (!memberships || memberships.length === 0) {
    redirect('/onboarding?error=no_owner_membership');
  }

  const siteId = memberships[0].site_id as string;

  const { data: site, error: siteErr } = await supabase
    .from('sites')
    .select('account_id')
    .eq('id', siteId)
    .single();

  if (siteErr || !site) {
    console.error('[onboarding] site lookup failed:', siteErr);
    redirect(
      `/onboarding?error=site_lookup_failed&detail=${encodeURIComponent(siteErr?.message ?? 'unknown')}`,
    );
  }

  const { error: siteUpdateErr } = await supabase
    .from('sites')
    .update({ name: kitchenName })
    .eq('id', siteId);

  if (siteUpdateErr) {
    console.error('[onboarding] site update failed:', siteUpdateErr);
    redirect(
      `/onboarding?error=site_update_failed&detail=${encodeURIComponent(siteUpdateErr.message)}`,
    );
  }

  const { error: accountUpdateErr } = await supabase
    .from('accounts')
    .update({ name: kitchenName })
    .eq('id', site.account_id);

  if (accountUpdateErr) {
    console.error('[onboarding] account update failed:', accountUpdateErr);
    redirect(
      `/onboarding?error=account_update_failed&detail=${encodeURIComponent(accountUpdateErr.message)}`,
    );
  }

  redirect('/');
}
