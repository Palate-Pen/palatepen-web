'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type ActionResult =
  | { ok: true; token: string }
  | { ok: false; error: string };

// 16-char token from an unambiguous alphabet (no 0/O/I/1) so chefs
// can read it aloud without losing characters. ~85 bits of entropy.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnopqrstuvwxyz23456789';

function generateToken(): string {
  let token = '';
  const buf = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < buf.length; i++) {
      buf[i] = Math.floor(Math.random() * 256);
    }
  }
  for (let i = 0; i < 16; i++) {
    token += ALPHABET[buf[i] % ALPHABET.length];
  }
  return token;
}

/**
 * Generate or rotate the account's inbound-email token. Owner-only —
 * the token is per-account, not per-user, because invoices belong to
 * the kitchen and any chef/manager on the account should be able to
 * forward to the address. Owner gates the rotation so a chef can't
 * accidentally break the address every other team member is using.
 */
export async function rotateInboxToken(): Promise<ActionResult> {
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
    (memberships?.[0] as unknown as { sites: { account_id: string } | null } | undefined)
      ?.sites?.account_id ?? null;
  if (!accountId) {
    return { ok: false, error: 'not_owner' };
  }

  // Retry a few times on the vanishingly-rare unique-index collision.
  for (let attempt = 0; attempt < 4; attempt++) {
    const token = generateToken();
    const { error } = await supabase
      .from('accounts')
      .update({ inbox_token: token })
      .eq('id', accountId);
    if (!error) {
      revalidatePath('/settings');
      return { ok: true, token };
    }
    if (!error.message.toLowerCase().includes('duplicate')) {
      return { ok: false, error: error.message };
    }
  }
  return { ok: false, error: 'token_collision' };
}
