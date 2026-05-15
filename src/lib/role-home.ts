/**
 * Default home path per role. Drives:
 *   - the post-sign-in redirect in src/lib/actions/auth.ts
 *   - the auth callback (magic link) redirect
 *   - the chef shell home page (redirects non-kitchen users to their proper home)
 *
 * Bar staff land on /bartender, managers on /manager, owners on /owner,
 * kitchen staff (chef + sous_chef + commis) on / (chef shell home).
 * Viewers fall back to / as a safe default — the in-shell role gates
 * handle finer-grained access if they then try to use write paths.
 */

export type ShellRole =
  | 'owner'
  | 'manager'
  | 'chef'
  | 'sous_chef'
  | 'commis'
  | 'bartender'
  | 'head_bartender'
  | 'bar_back'
  | 'viewer';

export function defaultHomePath(role: ShellRole | string | null | undefined): string {
  switch (role) {
    case 'owner':
      return '/owner';
    case 'manager':
      return '/manager';
    case 'bartender':
    case 'head_bartender':
    case 'bar_back':
      return '/bartender';
    case 'chef':
    case 'sous_chef':
    case 'commis':
    case 'viewer':
    default:
      return '/';
  }
}

/**
 * Returns the default home path for the *currently authed* user, or
 * '/signin' if there is no session. Reads the first membership row to
 * resolve role. Safe to call from server components and route handlers.
 */
export async function defaultHomeForCurrentUser(): Promise<string> {
  const { createSupabaseServerClient } = await import('@/lib/supabase/server');
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return '/signin';

  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) return '/onboarding';
  return defaultHomePath((membership.role as string | null) ?? 'viewer');
}
