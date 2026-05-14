import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { SidebarStateProvider } from '@/components/shell/SidebarState';
import {
  OWNER_ACCOUNT_ITEMS,
  OWNER_SECTIONS,
} from '@/components/shell/nav-config';

/**
 * Owner shell. Same Sidebar + Topbar pattern as chef + manager.
 * Owner-specific nav (8 tabs — Home + Sites live, rest pending design).
 * Topbar view='owner' so the surface switcher reflects the current view.
 *
 * Role gate: owner-only. Managers/chefs see "Not your room".
 */
export default async function OwnerLayout({
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
    .eq('user_id', user.id);

  const ownerMemberships = (memberships ?? []).filter(
    (m) => m.role === 'owner',
  );
  if (ownerMemberships.length === 0) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold mb-3">
            Owner Surface
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
            Not your room
          </h1>
          <p className="font-serif italic text-lg text-muted mb-6">
            The owner surface is for business owners — whole-business pulse, multi-site rollups, the financial picture.
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

  // Derive brand label + account for tier badge from the first owner
  // membership. Multi-site rollup will fan over all of them once a real
  // multi-site customer onboards.
  const firstSite =
    (ownerMemberships[0].sites as unknown as {
      name: string;
      account_id: string;
    } | null) ?? null;
  const brandLabel =
    ownerMemberships.length === 1
      ? (firstSite?.name ?? 'My Business')
      : `${ownerMemberships.length} sites`;
  const accountId = firstSite?.account_id;

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
          brand={brandLabel}
          surfaceTag="Owner"
          homeHref="/owner"
          sections={OWNER_SECTIONS}
          accountItems={OWNER_ACCOUNT_ITEMS}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar
            tier={tier}
            view="owner"
            isFounder={isFounder}
            role="owner"
            email={user.email ?? ''}
          />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SidebarStateProvider>
  );
}
