import { createSupabaseServiceClient } from '@/lib/supabase/service';

/**
 * Resolve a list of `user_id` values into short display labels for the
 * Safety surfaces. Matches the brand voice memory: casual first names,
 * never full emails.
 *
 * Falls back to:
 *   - `display_name` from user_metadata if present
 *   - the local-part of the email, title-cased
 *   - 'Unknown' if neither
 *
 * Returns a Map keyed by user_id. Missing ids resolve to 'Unknown'.
 */
export async function resolveSafetyUsers(
  userIds: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const ids = Array.from(
    new Set(userIds.filter((u): u is string => Boolean(u))),
  );
  const out = new Map<string, string>();
  if (ids.length === 0) return out;

  const svc = createSupabaseServiceClient();
  const { data: page } = await svc.auth.admin.listUsers({
    page: 1,
    perPage: 500,
  });
  for (const u of page?.users ?? []) {
    if (!ids.includes(u.id)) continue;
    out.set(u.id, displayLabel(u));
  }
  return out;
}

function displayLabel(u: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): string {
  const meta = (u.user_metadata ?? {}) as { display_name?: string; name?: string };
  const explicit = (meta.display_name || meta.name || '').toString().trim();
  if (explicit) return firstName(explicit);
  if (u.email) return firstName(localPart(u.email));
  return 'Unknown';
}

function localPart(email: string): string {
  return (email.split('@')[0] ?? email).replace(/[._-]+/g, ' ').trim();
}

function firstName(s: string): string {
  const first = s.split(/\s+/)[0] ?? s;
  if (!first) return 'Unknown';
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}
