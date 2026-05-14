import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { SidebarStateProvider } from '@/components/shell/SidebarState';
import { getShellContext } from '@/lib/shell/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  CHEF_ACCOUNT_ITEMS,
  CHEF_SECTIONS,
} from '@/components/shell/nav-config';

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getShellContext();
  const supabase = await createSupabaseServerClient();
  const { data: account } = await supabase
    .from('accounts')
    .select('tier, is_founder')
    .eq('id', ctx.accountId)
    .single();
  const tier = (account?.tier as string | undefined) ?? 'free';
  const isFounder = Boolean(account?.is_founder);

  return (
    <SidebarStateProvider>
      <div className="min-h-screen flex bg-paper">
        <Sidebar
          brand={ctx.kitchenName}
          sections={CHEF_SECTIONS}
          accountItems={CHEF_ACCOUNT_ITEMS}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar
            tier={tier}
            view="chef"
            isFounder={isFounder}
            role={ctx.role}
            email={ctx.email}
          />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SidebarStateProvider>
  );
}
