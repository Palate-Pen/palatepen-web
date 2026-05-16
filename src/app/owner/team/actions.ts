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

  // Roles accepted by the role-change action. Includes legacy keys
  // (commis / bar_back / viewer) so historical memberships can still
  // be re-saved without forcing a rename. The role picker only offers
  // ASSIGNABLE_ROLES in the dropdown — see src/lib/roles.ts.
  const allowed = new Set<string>([
    'owner',
    'manager',
    'deputy_manager',
    'head_chef',
    'sous_chef',
    'chef',
    'head_bartender',
    'bartender',
    'supervisor',
    // Legacy
    'commis',
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

// ---------- Destructive actions ----------
//
// Three layers, increasingly destructive:
//   1. removeMembershipAction        — single membership row deleted
//   2. removeUserFromAllOwnedSitesAction — every membership the user has
//                                          *at sites the caller owns*
//   3. deleteUserAccountAction       — auth.users row deleted (cascade)
//
// Guards on all three: caller must be owner, caller can't act on self,
// target can't be a founder demo account.

type OwnedSites = {
  ids: string[];
  set: Set<string>;
};

async function ownedSiteIds(
  svc: ReturnType<typeof createSupabaseServiceClient>,
  callerId: string,
): Promise<OwnedSites> {
  const { data } = await svc
    .from('memberships')
    .select('site_id')
    .eq('user_id', callerId)
    .eq('role', 'owner');
  const ids = ((data ?? []) as Array<{ site_id: string }>).map((m) => m.site_id);
  return { ids, set: new Set(ids) };
}

async function isFounder(
  svc: ReturnType<typeof createSupabaseServiceClient>,
  userId: string,
): Promise<boolean> {
  // Founder flag lives on accounts.is_founder. A user is "a founder" if
  // any account they own is flagged. Defensive default: treat as founder
  // on any error so we never accidentally nuke the demo account.
  const { data: memberships, error } = await svc
    .from('memberships')
    .select('sites:site_id (account_id)')
    .eq('user_id', userId)
    .eq('role', 'owner');
  if (error) return true;
  const accountIds = Array.from(
    new Set(
      ((memberships ?? []) as unknown as Array<{ sites: { account_id?: string } | null }>)
        .map((m) => m.sites?.account_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  if (accountIds.length === 0) return false;
  const { data: accts, error: aErr } = await svc
    .from('accounts')
    .select('is_founder')
    .in('id', accountIds);
  if (aErr) return true;
  return (accts ?? []).some((a) => Boolean(a.is_founder));
}

/** Remove one membership (single user from a single site). */
export async function removeMembershipAction(
  membershipId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const svc = createSupabaseServiceClient();
  const { data: target } = await svc
    .from('memberships')
    .select('id, site_id, user_id')
    .eq('id', membershipId)
    .maybeSingle();
  if (!target) return { ok: false, error: 'Member not found' };

  const owned = await ownedSiteIds(svc, user.id);
  if (!owned.set.has(target.site_id as string)) {
    return { ok: false, error: 'You can only remove members from sites you own.' };
  }

  if (target.user_id === user.id) {
    return { ok: false, error: "You can't remove yourself from a site." };
  }

  if (await isFounder(svc, target.user_id as string)) {
    return { ok: false, error: 'The founder account is protected and cannot be removed.' };
  }

  const { error } = await svc.from('memberships').delete().eq('id', membershipId);
  if (error) return { ok: false, error: error.message };

  // Best-effort: clear feature_flags rows for this membership. If the FK
  // cascades it's a no-op; if it doesn't, we don't want orphan overrides.
  await svc.from('feature_flags').delete().eq('membership_id', membershipId);

  revalidatePath('/owner/team');
  revalidatePath('/manager/team');
  return { ok: true };
}

/** Remove every membership a user holds across the caller's owned sites. */
export async function removeUserFromAllOwnedSitesAction(
  userId: string,
): Promise<{ ok: boolean; error?: string; removed?: number }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };
  if (userId === user.id) {
    return { ok: false, error: "You can't remove yourself from your own sites." };
  }

  const svc = createSupabaseServiceClient();
  const owned = await ownedSiteIds(svc, user.id);
  if (owned.ids.length === 0) {
    return { ok: false, error: 'You do not own any sites.' };
  }

  if (await isFounder(svc, userId)) {
    return { ok: false, error: 'The founder account is protected and cannot be removed.' };
  }

  const { data: toRemove } = await svc
    .from('memberships')
    .select('id')
    .eq('user_id', userId)
    .in('site_id', owned.ids);
  const ids = ((toRemove ?? []) as Array<{ id: string }>).map((m) => m.id);
  if (ids.length === 0) {
    return { ok: true, removed: 0 };
  }

  await svc.from('feature_flags').delete().in('membership_id', ids);
  const { error } = await svc.from('memberships').delete().in('id', ids);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/owner/team');
  revalidatePath('/manager/team');
  return { ok: true, removed: ids.length };
}

/**
 * Permanently delete a user account. Only allowed if every membership
 * the user holds is on a site the caller owns — prevents an owner from
 * nuking a user who also belongs to someone else's account in a future
 * multi-tenant world.
 */
export async function deleteUserAccountAction(
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };
  if (userId === user.id) {
    return { ok: false, error: "You can't delete your own account from here." };
  }

  const svc = createSupabaseServiceClient();
  const owned = await ownedSiteIds(svc, user.id);
  if (owned.ids.length === 0) {
    return { ok: false, error: 'You do not own any sites.' };
  }

  if (await isFounder(svc, userId)) {
    return { ok: false, error: 'The founder account is protected and cannot be deleted.' };
  }

  // Ownership-scope check: every membership the user holds must be at a
  // site the caller owns. If any membership sits outside the caller's
  // scope, refuse.
  const { data: theirMemberships } = await svc
    .from('memberships')
    .select('id, site_id')
    .eq('user_id', userId);
  const memberships = (theirMemberships ?? []) as Array<{ id: string; site_id: string }>;
  const outOfScope = memberships.some((m) => !owned.set.has(m.site_id));
  if (outOfScope) {
    return {
      ok: false,
      error:
        'This user has membership on a site outside your ownership. Ask their other owner to remove them first.',
    };
  }

  // Clean up app-level rows first (defence in depth — most should
  // cascade via FK, but explicit deletes keep behaviour readable).
  const membershipIds = memberships.map((m) => m.id);
  if (membershipIds.length > 0) {
    await svc.from('feature_flags').delete().in('membership_id', membershipIds);
    await svc.from('memberships').delete().in('id', membershipIds);
  }

  const { error } = await svc.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/owner/team');
  return { ok: true };
}
