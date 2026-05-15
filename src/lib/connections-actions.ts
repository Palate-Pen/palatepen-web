'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ConnectionStatus } from '@/lib/connections';

export type SaveConnectionInput = {
  service: string;
  credential: string;
  displayName: string | null;
  notes: string | null;
  revalidatePathname?: string;
};

/**
 * Upsert a connection (paste a key). Triggers status='connected' if a
 * credential lands; status='disconnected' if the credential field
 * comes in blank. The actual external API is NOT pinged here — we
 * trust the chef's paste. Validation happens on first sync attempt.
 */
export async function saveConnection(
  input: SaveConnectionInput,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id, role')
    .eq('user_id', user.id)
    .in('role', ['owner', 'manager'])
    .limit(1);
  const siteId = memberships?.[0]?.site_id as string | undefined;
  if (!siteId) return { error: 'no_permission' };

  const credential = input.credential.trim();
  const status: ConnectionStatus = credential ? 'connected' : 'disconnected';

  const { error } = await supabase.from('connections').upsert(
    {
      site_id: siteId,
      service: input.service,
      credential: credential || null,
      display_name: input.displayName?.trim() || null,
      notes: input.notes?.trim() || null,
      status,
      last_synced_at: credential ? new Date().toISOString() : null,
    },
    { onConflict: 'site_id,service' },
  );
  if (error) return { error: error.message };

  if (input.revalidatePathname) revalidatePath(input.revalidatePathname);
  return { ok: true };
}

export async function disconnectService(
  service: string,
  revalidatePathname?: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id, role')
    .eq('user_id', user.id)
    .in('role', ['owner', 'manager'])
    .limit(1);
  const siteId = memberships?.[0]?.site_id as string | undefined;
  if (!siteId) return { error: 'no_permission' };

  const { error } = await supabase
    .from('connections')
    .update({
      credential: null,
      status: 'disconnected',
      last_synced_at: null,
    })
    .eq('site_id', siteId)
    .eq('service', service);
  if (error) return { error: error.message };

  if (revalidatePathname) revalidatePath(revalidatePathname);
  return { ok: true };
}
