'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  ACCOUNT_PREFERENCE_DEFAULTS,
  parseAccountPreferences,
  type AccountPreferences,
} from '@/lib/account-preferences';

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Owner-only update of account-level preferences. Manager/chef roles
 * see the values but can't change them (gated UI-side; double-checked
 * here because RLS doesn't differentiate within accounts).
 */
export async function setAccountPreferences(
  patch: Partial<AccountPreferences>,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id, role, sites:site_id (account_id)')
    .eq('user_id', user.id)
    .eq('role', 'owner');
  const accountId =
    (memberships?.[0] as unknown as {
      sites: { account_id: string } | null;
    } | undefined)?.sites?.account_id ?? null;
  if (!accountId) return { ok: false, error: 'not_owner' };

  const { data: existing } = await supabase
    .from('accounts')
    .select('preferences')
    .eq('id', accountId)
    .single();
  const current = parseAccountPreferences(existing?.preferences);
  const next: AccountPreferences = {
    ...ACCOUNT_PREFERENCE_DEFAULTS,
    ...current,
    ...patch,
  };

  // Validate inside the action — UI also validates but never trust it.
  if (next.gp_target_pct <= 0 || next.gp_target_pct > 100) {
    return { ok: false, error: 'invalid_gp_target' };
  }
  if (next.currency.length !== 3) {
    return { ok: false, error: 'invalid_currency' };
  }

  const { error } = await supabase
    .from('accounts')
    .update({ preferences: next as unknown as object })
    .eq('id', accountId);
  if (error) return { ok: false, error: error.message };

  // These prefs affect rendering everywhere — revalidate liberally.
  revalidatePath('/settings');
  revalidatePath('/recipes');
  revalidatePath('/margins');
  revalidatePath('/manager');
  revalidatePath('/owner');
  return { ok: true };
}
