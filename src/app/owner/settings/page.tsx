import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { OwnerPageHeader } from '@/components/owner/OwnerScaffold';
import { SectionHead } from '@/components/shell/SectionHead';
import { getAccountPreferences } from '@/lib/account-preferences';
import { AccountPreferencesPanel } from '@/app/(shell)/settings/AccountPreferencesPanel';
import { TierBillingSection } from '@/components/settings/TierBillingSection';

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
    .select(
      'id, name, tier, is_founder, created_at, stripe_customer_id',
    )
    .in('id', accountIds.length ? accountIds : ['00000000-0000-0000-0000-000000000000']);

  const accountRows =
    (accounts ?? []) as Array<{
      id: string;
      name: string;
      tier: string;
      is_founder: boolean;
      created_at: string;
      stripe_customer_id: string | null;
    }>;

  const primaryAccountId = accountRows[0]?.id;
  const accountPrefs = primaryAccountId
    ? await getAccountPreferences(primaryAccountId)
    : null;

  const isFounder = user.email === 'jack@palateandpen.co.uk';
  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1000px] mx-auto">
      <OwnerPageHeader
        eyebrow="The Business, Not The Kitchen"
        title="Settings"
        subtitle="Account · tier · billing · team across the business. Personal preferences live in chef Settings."
        activeSlug="settings"
      />

      <section className="mb-10">
        <SectionHead title="Switch Surface" meta="every role this user can wear" />
        <div className="bg-card border border-rule divide-y divide-rule">
          <SurfaceLink
            href="/"
            eyebrow="Chef access"
            title="Chef surface"
            body="The kitchen view — recipes, prep, stock & suppliers."
          />
          <SurfaceLink
            href="/bartender"
            eyebrow="Bar access"
            title="Bartender surface"
            body="The bar view — specs, cellar, pour-cost margins."
          />
          <SurfaceLink
            href="/manager"
            eyebrow="Manager access"
            title="Manager surface"
            body="Site command — menu builder, P&L, team, deliveries oversight."
          />
          {isFounder && (
            <SurfaceLink
              href="/admin"
              eyebrow="Founder only"
              title="Founder admin"
              body="Cross-account command centre. Users · business · system · ops."
            />
          )}
        </div>
      </section>

      <section className="mb-10">
        <SectionHead title="Team & Permissions" meta="who can do what, where" />
        <Link
          href="/owner/team"
          className="block bg-card border border-rule px-7 py-6 hover:bg-paper-warm transition-colors group"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-gold mb-1.5">
                Across every site
              </div>
              <div className="font-serif font-semibold text-base text-ink leading-tight mb-1">
                Manage the brigade
              </div>
              <div className="font-serif italic text-sm text-muted">
                Click any member to see their role, site, and per-feature permissions. Roles set defaults — overrides give you precision.
              </div>
            </div>
            <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted group-hover:text-gold transition-colors">
              Open →
            </span>
          </div>
        </Link>
      </section>

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

      {accountPrefs && (
        <section className="mb-10">
          <SectionHead
            title="Business Defaults"
            meta="currency · GP target · stock day"
          />
          <div className="bg-card border border-rule">
            <AccountPreferencesPanel initial={accountPrefs} canEdit={true} />
          </div>
        </section>
      )}

      <section className="mb-10">
        <SectionHead title="Tier & Billing" meta="manage in Stripe portal" />
        {accountRows.length === 0 ? (
          <div className="bg-card border border-rule px-7 py-6 font-serif italic text-muted">
            No accounts on file yet.
          </div>
        ) : (
          accountRows.map((a) => (
            <div key={a.id} className="mb-4">
              {accountRows.length > 1 && (
                <div className="font-display font-semibold text-[11px] tracking-[0.25em] uppercase text-muted mb-2">
                  {a.name}
                </div>
              )}
              <TierBillingSection
                accountId={a.id}
                tier={a.tier}
                isFounder={a.is_founder}
                hasStripeCustomer={Boolean(a.stripe_customer_id)}
                returnPath="/owner/settings"
              />
            </div>
          ))
        )}
      </section>

    </div>
  );
}

function SurfaceLink({
  href,
  eyebrow,
  title,
  body,
}: {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="px-7 py-5 flex items-center justify-between gap-4 hover:bg-paper-warm transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-gold mb-1.5">
          {eyebrow}
        </div>
        <div className="font-serif font-semibold text-base text-ink leading-tight">
          {title}
        </div>
        <div className="font-serif italic text-sm text-muted mt-1">{body}</div>
      </div>
      <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted group-hover:text-gold transition-colors">
        Open →
      </span>
    </Link>
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
        <span className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-2.5 py-1 border border-rule rounded-sm text-ink">
          {account.tier}
        </span>
        {account.is_founder && (
          <span className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-2.5 py-1 bg-gold-bg border border-gold/40 text-gold-dark rounded-sm">
            Founder · zero cost
          </span>
        )}
      </div>
    </div>
  );
}
