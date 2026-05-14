'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Sign out the founder admin. Clears the Supabase session cookie and
 * redirects to the public marketing site (palateandpen.co.uk), per the
 * founder-admin v1 spec — admin signout exits the app entirely rather
 * than dropping back to /signin.
 */
export async function adminSignOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('https://palateandpen.co.uk');
}
