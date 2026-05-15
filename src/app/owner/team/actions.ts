'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

/** Set or update a feature flag override for a membership. */
export async function toggleFeatureFlagAction(
  membershipId: string,
  featureKey: string,
  enabled: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  // Authorisation: caller must be owner or manager at the target's site.
  const svc = createSupabaseServiceClient();
  const { data: target } = await svc
    .from('memberships')
    .select('id, site_id')
    .eq('id', membershipId)
    .maybeSingle();
  if (!target) return { ok: false, error: 'Member not found' };

  const { data: viewer } = await svc
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('site_id', target.site_id)
    .maybeSingle();
  if (!viewer || (viewer.role !== 'owner' && viewer.role !== 'manager')) {
    return { ok: false, error: 'Not authorised' };
  }

  const { error } = await svc
    .from('feature_flags')
    .upsert(
      {
        membership_id: membershipId,
        feature_key: featureKey,
        enabled,
        set_by: user.id,
        set_at: new Date().toISOString(),
      },
      { onConflict: 'membership_id,feature_key' },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath('/owner/team');
  revalidatePath('/manager/team');
  return { ok: true };
}

/** Change a member's role (owner-level only). */
export async function changeRoleAction(
  membershipId: string,
  role: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const svc = createSupabaseServiceClient();
  const { data: target } = await svc
    .from('memberships')
    .select('id, site_id')
    .eq('id', membershipId)
    .maybeSingle();
  if (!target) return { ok: false, error: 'Member not found' };

  const { data: viewer } = await svc
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('site_id', target.site_id)
    .maybeSingle();
  if (!viewer || viewer.role !== 'owner') {
    return { ok: false, error: 'Only owners can change roles' };
  }

  const allowed = new Set([
    'owner',
    'manager',
    'chef',
    'sous_chef',
    'commis',
    'bartender',
    'head_bartender',
    'bar_back',
    'viewer',
  ]);
  if (!allowed.has(role)) return { ok: false, error: 'Invalid role' };

  const { error } = await svc
    .from('memberships')
    .update({ role })
    .eq('id', membershipId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/owner/team');
  revalidatePath('/manager/team');
  return { ok: true };
}
