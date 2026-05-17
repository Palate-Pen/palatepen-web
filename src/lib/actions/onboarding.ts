'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function ownerSiteContext() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    redirect('/signin');
  }
  const { data: memberships, error: memErr } = await supabase
    .from('memberships')
    .select('site_id, sites:site_id (account_id)')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .limit(1);
  if (memErr) {
    redirect(
      `/onboarding?error=query_failed&detail=${encodeURIComponent(memErr.message)}`,
    );
  }
  if (!memberships || memberships.length === 0) {
    redirect('/onboarding?error=no_owner_membership');
  }
  const siteId = memberships[0].site_id as string;
  const accountId =
    (memberships[0].sites as unknown as { account_id?: string } | null)
      ?.account_id ?? null;
  if (!accountId) {
    redirect('/onboarding?error=no_owner_membership');
  }
  return { supabase, user, siteId, accountId };
}

export async function saveKitchenName(formData: FormData) {
  const kitchenName = String(formData.get('kitchen_name') ?? '').trim();
  if (!kitchenName) {
    redirect('/onboarding?error=name_required');
  }

  const { supabase, siteId, accountId } = await ownerSiteContext();

  const { error: siteUpdateErr } = await supabase
    .from('sites')
    .update({ name: kitchenName })
    .eq('id', siteId);
  if (siteUpdateErr) {
    redirect(
      `/onboarding?error=site_update_failed&detail=${encodeURIComponent(siteUpdateErr.message)}`,
    );
  }

  const { error: accountUpdateErr } = await supabase
    .from('accounts')
    .update({ name: kitchenName })
    .eq('id', accountId);
  if (accountUpdateErr) {
    redirect(
      `/onboarding?error=account_update_failed&detail=${encodeURIComponent(accountUpdateErr.message)}`,
    );
  }

  redirect('/onboarding?step=2');
}

export async function saveKitchenProfile(formData: FormData) {
  const kitchenType = String(formData.get('kitchen_type') ?? '').trim();
  const teamSizeBand = String(formData.get('team_size_band') ?? '').trim();
  const services = formData.getAll('services').map((s) => String(s));

  if (!kitchenType || !teamSizeBand) {
    redirect('/onboarding?step=2&error=name_required');
  }

  const { supabase, accountId } = await ownerSiteContext();

  // Merge into existing accounts.preferences so we don't clobber
  // gp_target_pct, opening_check_groups, etc.
  const { data: account } = await supabase
    .from('accounts')
    .select('preferences')
    .eq('id', accountId)
    .maybeSingle();
  const prev = (account?.preferences ?? {}) as Record<string, unknown>;
  const nextPrefs = {
    ...prev,
    kitchen_type: kitchenType,
    team_size_band: teamSizeBand,
    services,
    onboarding_profile_complete_at: new Date().toISOString(),
  };

  const { error: updErr } = await supabase
    .from('accounts')
    .update({ preferences: nextPrefs })
    .eq('id', accountId);
  if (updErr) {
    redirect(
      `/onboarding?step=2&error=account_update_failed&detail=${encodeURIComponent(updErr.message)}`,
    );
  }

  redirect('/onboarding?step=3');
}

export async function completeOnboarding() {
  const { supabase, accountId } = await ownerSiteContext();
  const { data: account } = await supabase
    .from('accounts')
    .select('preferences')
    .eq('id', accountId)
    .maybeSingle();
  const prev = (account?.preferences ?? {}) as Record<string, unknown>;
  await supabase
    .from('accounts')
    .update({
      preferences: {
        ...prev,
        onboarding_complete_at: new Date().toISOString(),
      },
    })
    .eq('id', accountId);
  redirect('/');
}
