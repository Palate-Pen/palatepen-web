import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { SidebarStateProvider } from '@/components/shell/SidebarState';
import {
  BARTENDER_ACCOUNT_ITEMS,
  BARTENDER_SECTIONS,
} from '@/components/shell/nav-config';

const BAR_ROLES = new Set([
  'bartender',
  'head_bartender',
  'bar_back',
  // Owner + Manager get bar shell access for cross-shell oversight.
  'owner',
  'manager',
]);

/**
 * Bartender shell. Same Sidebar + Topbar pattern as chef + manager + owner.
 * Bar-flavoured nav (9 tabs — Home + Mise + Specs + Menus + Margins + Back Bar
 * + Notebook + Inbox + Settings). Topbar view='bartender'.
 *
 * Role gate: any user with a bar role on at least one site (bartender,
 * head_bartender, bar_back) lands here on access. Owners + managers also
 * see this shell since they oversee bar operations alongside kitchen.
 */
export default async function BartenderLayout({
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

  const barMemberships = (memberships ?? []).filter((m) =>
    BAR_ROLES.has(m.role as string),
  );
  if (barMemberships.length === 0) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold mb-3">
            Bartender Surface
          </div>
          <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] text-ink mb-3">
            Not your room
          </h1>
          <p className="font-serif italic text-lg text-muted mb-6">
            The bar surface is for bartenders, head bartenders, and bar backs — plus the owner and manager who watch over service. Your account doesn't have bar access on any site.
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

  // Prefer bar-native membership for brand label + role context. Fall
  // back to manager/owner if the user only has oversight access.
  const primaryMembership =
    barMemberships.find((m) =>
      ['head_bartender', 'bartender', 'bar_back'].includes(m.role as string),
    ) ?? barMemberships[0];

  const role = primaryMembership.role as string;
  const site =
    (primaryMembership.sites as unknown as {
      name: string;
      account_id: string;
    } | null) ?? null;
  const brandLabel = site?.name ?? 'My Bar';
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
          brand={brandLabel}
          surfaceTag="Bartender"
          homeHref="/bartender"
          sections={BARTENDER_SECTIONS}
          accountItems={BARTENDER_ACCOUNT_ITEMS}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar
            tier={tier}
            view="bartender"
            isFounder={isFounder}
            role={
              role as
                | 'owner'
                | 'manager'
                | 'bartender'
                | 'head_bartender'
                | 'bar_back'
            }
            email={user.email ?? ''}
            hasBarMembership={true}
          />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SidebarStateProvider>
  );
}
