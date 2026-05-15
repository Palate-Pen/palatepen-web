import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { SidebarStateProvider } from '@/components/shell/SidebarState';
import { getShellContext } from '@/lib/shell/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  SAFETY_ACCOUNT_ITEMS,
  SAFETY_SECTIONS,
} from '@/components/shell/nav-config';
import { SafetyShellGate } from '@/components/safety/SafetyShellGate';

/**
 * Safety viewer shell — peer of the chef / bar / manager / owner
 * shells. Each role sees Safety the same way: a focused diary + EHO
 * surface. The SafetyShellGate inside enforces the £20/site uplift,
 * onboarding ack, and liability ack.
 */
export default async function SafetyLayout({
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
          sections={SAFETY_SECTIONS}
          accountItems={SAFETY_ACCOUNT_ITEMS}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar
            tier={tier}
            view="safety"
            isFounder={isFounder}
            role={ctx.role}
            email={ctx.email}
          />
          <main className="flex-1 overflow-y-auto">
            <SafetyShellGate>{children}</SafetyShellGate>
          </main>
        </div>
      </div>
    </SidebarStateProvider>
  );
}
