import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { SidebarStateProvider } from '@/components/shell/SidebarState';
import {
  MANAGER_ACCOUNT_ITEMS,
  MANAGER_SECTIONS,
} from '@/components/shell/nav-config';

/**
 * Manager shell. Mirrors the chef shell pattern — Sidebar + Topbar +
 * scrollable main. Manager-specific nav (10 tabs, most pending design)
 * + Topbar view='manager' so the view dropdown reflects the current
 * surface.
 */
export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id, role, sites:site_id (name, account_id)')
    .eq('user_id', user.id)
    .limit(1);
  const membership = memberships?.[0];
  if (!membership) redirect('/onboarding');

  const role = membership.role as string;
  if (role !== 'manager' && role !== 'owner') {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold mb-3">
            Manager Surface
          </div>
          <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] text-ink mb-3">
            Not your room
          </h1>
          <p className="font-serif italic text-lg text-muted mb-6">
            The manager surface is for site managers and owners. You're signed in as a {role}.
          </p>
          <Link
            href="/"
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors inline-block"
          >
            ← Back to your kitchen
          </Link>
        </div>
      </div>
    );
  }

  const site =
    (membership.sites as unknown as {
      name: string;
      account_id: string;
    } | null) ?? null;
  const siteName = site?.name ?? 'My Kitchen';
  const accountId = site?.account_id;

  let tier = 'free';
  let isFounder = false;
  if (accountId) {
    const { data: account } = await supabase
      .from('accounts')
      .select('tier, is_founder')
      .eq('id', accountId)
      .single();
    tier = (account?.tier as string | undefined) ?? 'free';
    isFounder = Boolean(account?.is_founder);
  }

  return (
    <SidebarStateProvider>
      <div className="min-h-screen flex bg-paper">
        <Sidebar
          brand={siteName}
          surfaceTag="Manager"
          homeHref="/manager"
          sections={MANAGER_SECTIONS}
          accountItems={MANAGER_ACCOUNT_ITEMS}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar
            tier={tier}
            view="manager"
            isFounder={isFounder}
            role={role as 'owner' | 'manager' | 'chef' | 'viewer'}
            email={user.email ?? ''}
          />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SidebarStateProvider>
  );
}
