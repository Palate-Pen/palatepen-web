'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { ADMIN_EMAIL } from '@/lib/admin';

const VALID_TIERS = ['free', 'pro', 'kitchen', 'group', 'enterprise'] as const;
type Tier = (typeof VALID_TIERS)[number];

/** Cookie set when the founder is currently impersonating another user.
 *  Holds the impersonated user's email for display purposes only — the
 *  Stop action never trusts the cookie value; it always routes back to
 *  ADMIN_EMAIL. */
export const IMPERSONATION_LABEL_COOKIE = 'palatable_impersonate_label';
export const IMPERSONATION_FLAG_COOKIE = 'palatable_impersonating';

type GateResult =
  | { ok: true; userEmail: string }
  | { ok: false; error: string };

async function requireFounder(): Promise<GateResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };
  const email = (user.email ?? '').toLowerCase();
  if (email !== ADMIN_EMAIL.toLowerCase()) {
    return { ok: false, error: 'Founder admin only.' };
  }
  return { ok: true, userEmail: email };
}

/** Change an account's tier. Founder-only. */
export async function setAccountTierAction(
  accountId: string,
  tier: string,
): Promise<{ ok: boolean; error?: string }> {
  const gate = await requireFounder();
  if (!gate.ok) return gate;

  if (!VALID_TIERS.includes(tier as Tier)) {
    return { ok: false, error: 'Invalid tier.' };
  }

  const svc = createSupabaseServiceClient();
  const { error } = await svc
    .from('accounts')
    .update({ tier })
    .eq('id', accountId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/users');
  revalidatePath('/admin/business');
  return { ok: true };
}

/**
 * Begin impersonating a user. Generates a Supabase magic link for the
 * target's email; the founder follows the link, which replaces their
 * own session with the target's. A flag cookie is set so the global
 * impersonation banner appears on every surface.
 *
 * The founder cannot reach /admin while impersonating (the gate checks
 * the live email), which is the desired security posture. To return,
 * use the banner's Stop button — that always logs them back in as
 * ADMIN_EMAIL regardless of cookie value.
 */
export async function impersonateUserAction(
  userId: string,
): Promise<{ ok: boolean; error?: string; url?: string }> {
  const gate = await requireFounder();
  if (!gate.ok) return gate;

  const svc = createSupabaseServiceClient();
  const { data: target, error: getErr } = await svc.auth.admin.getUserById(userId);
  if (getErr || !target?.user?.email) {
    return { ok: false, error: 'Target user not found.' };
  }
  const targetEmail = target.user.email;
  if (targetEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return { ok: false, error: "That's already you." };
  }

  const { data: linkData, error: linkErr } = await svc.auth.admin.generateLink({
    type: 'magiclink',
    email: targetEmail,
  });
  if (linkErr || !linkData?.properties?.action_link) {
    return {
      ok: false,
      error: linkErr?.message ?? 'Could not generate impersonation link.',
    };
  }

  // Set banner cookies. NOT HttpOnly because the banner is server-rendered
  // and reads them via Next's cookies() helper anyway; staying readable
  // means a client component can also render the label if needed later.
  const c = await cookies();
  c.set(IMPERSONATION_FLAG_COOKIE, '1', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  c.set(IMPERSONATION_LABEL_COOKIE, targetEmail, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  return { ok: true, url: linkData.properties.action_link };
}

/**
 * End impersonation and return to the founder account. Always issues a
 * magic link for ADMIN_EMAIL — never trusts the impersonation cookie
 * value, so a tampered cookie can't redirect the founder back as a
 * different user.
 */
export async function stopImpersonationAction(): Promise<{
  ok: boolean;
  error?: string;
  url?: string;
}> {
  const svc = createSupabaseServiceClient();
  const { data, error } = await svc.auth.admin.generateLink({
    type: 'magiclink',
    email: ADMIN_EMAIL,
  });
  if (error || !data?.properties?.action_link) {
    return {
      ok: false,
      error: error?.message ?? 'Could not generate return link.',
    };
  }

  // Sign out the current (impersonated) session and clear banner cookies.
  // The next page load will start fresh; the magic-link URL we return
  // logs the founder back in.
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const c = await cookies();
  c.delete(IMPERSONATION_FLAG_COOKIE);
  c.delete(IMPERSONATION_LABEL_COOKIE);

  return { ok: true, url: data.properties.action_link };
}
