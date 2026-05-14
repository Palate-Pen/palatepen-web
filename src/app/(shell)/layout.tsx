import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards this, but defence in depth.
  if (!user) redirect('/signin');

  const { data: memberships, error: memErr } = await supabase
    .from('memberships')
    .select('site_id, role')
    .eq('user_id', user.id)
    .limit(1);

  if (memErr || !memberships || memberships.length === 0) {
    // No v2 membership yet — first sign-in after migration, or backfill gap
    // for a legacy auth.users row. Push them through onboarding to create one.
    redirect('/onboarding');
  }

  const siteId = memberships[0].site_id as string;
  const { data: site } = await supabase
    .from('sites')
    .select('name, account_id')
    .eq('id', siteId)
    .single();

  const kitchenName = site?.name ?? 'My Kitchen';

  return (
    <div className="min-h-screen flex bg-paper">
      <Sidebar kitchenName={kitchenName} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar userEmail={user.email ?? ''} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
