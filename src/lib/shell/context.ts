import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ShellContext = {
  userId: string;
  email: string;
  firstName: string;
  siteId: string;
  accountId: string;
  kitchenName: string;
  role: 'owner' | 'manager' | 'chef' | 'viewer';
};

function derivedFirstName(email: string): string {
  const local = email.split('@')[0] ?? '';
  const candidate = local.split(/[._-]/)[0] ?? local;
  if (!candidate) return 'Chef';
  return candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
}

export const getShellContext = cache(async (): Promise<ShellContext> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin');

  const { data: memberships, error: memErr } = await supabase
    .from('memberships')
    .select('site_id, role')
    .eq('user_id', user.id)
    .limit(1);

  if (memErr || !memberships || memberships.length === 0) {
    redirect('/onboarding');
  }

  const siteId = memberships[0].site_id as string;
  const role = memberships[0].role as ShellContext['role'];

  const { data: site } = await supabase
    .from('sites')
    .select('name, account_id')
    .eq('id', siteId)
    .single();

  return {
    userId: user.id,
    email: user.email ?? '',
    firstName: derivedFirstName(user.email ?? ''),
    siteId,
    accountId: (site?.account_id as string) ?? '',
    kitchenName: (site?.name as string) ?? 'My Kitchen',
    role,
  };
});
