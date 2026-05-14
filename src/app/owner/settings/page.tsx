import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { OwnerPageHeader } from '@/components/owner/OwnerScaffold';
import { SectionHead } from '@/components/shell/SectionHead';

export const metadata = { title: 'Settings — Owner — Palatable' };

export default async function OwnerSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  // Pull the account row(s) the owner has access to via their site
  // memberships. Account-level info — tier, billing — lives here rather
  // than the per-user settings under /settings.
  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id, sites:site_id (account_id, name)')
    .eq('user_id', user.id)
    .eq('role', 'owner');

  const accountIds = Array.from(
    new Set(
      (memberships ?? [])
        .map(
          (m) =>
            ((m.sites as unknown as { account_id: string } | null) ?? null)
              ?.account_id,
        )
        .filter((id): id is string => !!id),
    ),
  );

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, tier, is_founder, created_at')
    .in('id', accountIds.length ? accountIds : ['00000000-0000-0000-0000-000000000000']);

  const accountRows =
    (accounts ?? []) as Array<{
      id: string;
      name: string;
      tier: string;
      is_founder: boolean;
      created_at: string;
    }>;

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1000px] mx-auto">
      <OwnerPageHeader
        eyebrow="The Business, Not The Kitchen"
        title="Settings"
        subtitle="Account · tier · billing · users across the business. Personal preferences live in chef Settings."
        activeSlug="settings"
      />

      <section className="mb-10">
        <SectionHead
          title="Accounts"
          meta={`${accountRows.length} ${accountRows.length === 1 ? 'account' : 'accounts'}`}
        />
        {accountRows.length === 0 ? (
          <div className="bg-card border border-rule px-10 py-10 text-center">
            <p className="font-serif italic text-muted">
              No accounts on file.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-rule divide-y divide-rule">
            {accountRows.map((a) => (
              <AccountRow key={a.id} account={a} />
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <SectionHead title="Tier & Billing" meta="manage in Stripe portal" />
        <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-6">
          <p className="font-serif italic text-base text-ink-soft leading-relaxed">
            Billing controls — upgrade / downgrade tier, payment method, invoices — live in the Stripe customer portal. Pre-launch this surface stays minimal; the founder account is zero-cost (
            <code className="font-mono text-xs bg-paper-warm px-1.5 py-0.5 rounded">is_founder = true</code>) and bypasses billing entirely.
          </p>
        </div>
      </section>

      <section>
        <SectionHead title="Users" meta="account-level user list pending" />
        <div className="bg-card border border-rule px-7 py-6">
          <p className="font-serif italic text-base text-ink-soft leading-relaxed">
            Inviting / removing users across the business surfaces here once the multi-user flow lands. For now, single-site owner accounts manage themselves at{' '}
            <Link href="/settings" className="text-gold hover:text-gold-dark transition-colors not-italic font-semibold">
              chef Settings
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function AccountRow({
  account,
}: {
  account: {
    id: string;
    name: string;
    tier: string;
    is_founder: boolean;
    created_at: string;
  };
}) {
  return (
    <div className="px-7 py-4 flex justify-between items-center gap-4 flex-wrap">
      <div className="min-w-0">
        <div className="font-serif font-semibold text-base text-ink">
          {account.name}
        </div>
        <div className="font-serif italic text-xs text-muted mt-0.5">
          Created {dateFmt.format(new Date(account.created_at))}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase px-2.5 py-1 border border-rule rounded-sm text-ink">
          {account.tier}
        </span>
        {account.is_founder && (
          <span className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase px-2.5 py-1 bg-gold-bg border border-gold/40 text-gold-dark rounded-sm">
            Founder · zero cost
          </span>
        )}
      </div>
    </div>
  );
}
