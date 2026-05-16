import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { TierSelect } from '@/components/admin/TierSelect';

export const metadata = { title: 'Account — Admin — Palatable' };

import { ROLE_LABEL } from '@/lib/roles';

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/**
 * Founder Admin · Account detail.
 *
 * Counterpart to /admin/users/[userId]: account-centric. Tier control,
 * full member list (per-row link to user detail), every site under
 * the account, Stripe IDs surfaced.
 *
 * Schema note: memberships → account is reached via site_id, not a
 * direct account_id column. "Owner" of an account is any user with
 * role='owner' on a site belonging to that account.
 */
export default async function AdminAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const svc = createSupabaseServiceClient();

  const { data: account } = await svc
    .from('accounts')
    .select(
      'id, name, tier, is_founder, created_at, stripe_customer_id, stripe_subscription_id',
    )
    .eq('id', id)
    .maybeSingle();
  if (!account) notFound();

  const accountId = account.id as string;

  // Sites under this account → memberships keyed by site_id.
  const { data: sites } = await svc
    .from('sites')
    .select('id, name')
    .eq('account_id', accountId);
  const sRows = (sites ?? []) as Array<{ id: string; name: string }>;
  const siteById = new Map(sRows.map((s) => [s.id, s]));
  const siteIds = sRows.map((s) => s.id);

  const { data: memberships } =
    siteIds.length === 0
      ? { data: [] }
      : await svc
          .from('memberships')
          .select('id, user_id, role, site_id, created_at')
          .in('site_id', siteIds)
          .order('created_at', { ascending: true });
  const mRows = (memberships ?? []) as Array<{
    id: string;
    user_id: string;
    role: string;
    site_id: string;
    created_at: string;
  }>;

  const userIds = Array.from(new Set(mRows.map((m) => m.user_id)));
  const { data: authUsers } = await svc.auth.admin.listUsers({
    page: 1,
    perPage: 500,
  });
  const emailById = new Map<string, string>();
  for (const u of authUsers?.users ?? []) {
    if (u.email && userIds.includes(u.id)) emailById.set(u.id, u.email);
  }

  // Group memberships by user.
  const byUser = new Map<
    string,
    {
      user_id: string;
      email: string;
      roles: string[];
      sites: string[];
      earliest: string;
    }
  >();
  for (const m of mRows) {
    const existing = byUser.get(m.user_id);
    const siteName = siteById.get(m.site_id)?.name ?? '—';
    if (existing) {
      if (!existing.roles.includes(m.role)) existing.roles.push(m.role);
      if (!existing.sites.includes(siteName)) existing.sites.push(siteName);
      if (m.created_at < existing.earliest) existing.earliest = m.created_at;
    } else {
      byUser.set(m.user_id, {
        user_id: m.user_id,
        email: emailById.get(m.user_id) ?? m.user_id.slice(0, 8),
        roles: [m.role],
        sites: [siteName],
        earliest: m.created_at,
      });
    }
  }
  const memberRows = Array.from(byUser.values()).sort((a, b) =>
    a.email.localeCompare(b.email),
  );

  // Owner of the account = first user with role='owner' on any of the
  // account's sites (earliest joined).
  const ownerRow = mRows
    .filter((m) => m.role === 'owner')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
  const ownerUserId = ownerRow?.user_id ?? null;
  const ownerEmail = ownerUserId ? emailById.get(ownerUserId) ?? null : null;

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Founder Admin · Account
      </div>
      <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] text-ink flex items-center gap-3 flex-wrap">
        <em className="text-gold font-semibold not-italic">
          {(account.name as string | null) ?? 'Unnamed account'}
        </em>
        {account.is_founder && (
          <span className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-gold border border-gold/40 px-2 py-0.5">
            founder
          </span>
        )}
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-8">
        {memberRows.length} {memberRows.length === 1 ? 'person' : 'people'}{' '}
        across {sRows.length} {sRows.length === 1 ? 'site' : 'sites'}.
      </p>

      <Link
        href="/admin/users"
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors inline-block mb-6"
      >
        ← All users &amp; accounts
      </Link>

      {/* INFO + TIER */}
      <div className="bg-card border border-rule px-7 py-6 mb-8 grid md:grid-cols-[1fr_auto] gap-6 items-start">
        <div>
          <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted mb-2">
            Account
          </div>
          <dl className="grid grid-cols-[140px_1fr] gap-y-2 gap-x-4 font-serif text-sm">
            <dt className="text-muted">Account ID</dt>
            <dd className="font-mono text-xs text-ink-soft break-all">{accountId}</dd>
            <dt className="text-muted">Owner</dt>
            <dd className="text-ink">
              {ownerUserId ? (
                <Link
                  href={'/admin/users/' + ownerUserId}
                  className="hover:text-gold transition-colors"
                >
                  {ownerEmail ?? ownerUserId}
                </Link>
              ) : (
                '—'
              )}
            </dd>
            <dt className="text-muted">Created</dt>
            <dd className="text-ink">
              {dateFmt.format(new Date(account.created_at as string))}
            </dd>
            <dt className="text-muted">Stripe customer</dt>
            <dd className="font-mono text-xs text-ink-soft break-all">
              {(account.stripe_customer_id as string | null) ?? '—'}
            </dd>
            <dt className="text-muted">Stripe sub</dt>
            <dd className="font-mono text-xs text-ink-soft break-all">
              {(account.stripe_subscription_id as string | null) ?? '—'}
            </dd>
          </dl>
        </div>
        <div className="min-w-[200px]">
          <div className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-muted mb-1.5">
            Tier
          </div>
          <TierSelect
            accountId={accountId}
            current={(account.tier as string) ?? 'free'}
            isFounder={Boolean(account.is_founder)}
          />
        </div>
      </div>

      {/* SITES */}
      <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-3">
        Sites
      </div>
      <div className="bg-card border border-rule mb-8">
        {sRows.length === 0 ? (
          <div className="px-7 py-6 font-serif italic text-muted">
            No sites under this account.
          </div>
        ) : (
          sRows.map((s, i) => (
            <div
              key={s.id}
              className={
                'px-7 py-3 font-serif text-base text-ink ' +
                (i < sRows.length - 1 ? 'border-b border-rule-soft' : '')
              }
            >
              {s.name}
            </div>
          ))
        )}
      </div>

      {/* MEMBERS */}
      <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-3">
        People on this account
      </div>
      <div className="bg-card border border-rule">
        <div className="hidden md:grid grid-cols-[1.6fr_1fr_1.4fr_140px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
          {['Member', 'Roles', 'Sites', 'Joined'].map((h) => (
            <div
              key={h}
              className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
            >
              {h}
            </div>
          ))}
        </div>
        {memberRows.length === 0 ? (
          <div className="px-7 py-6 font-serif italic text-muted text-center">
            No memberships yet.
          </div>
        ) : (
          memberRows.map((m, i) => (
            <Link
              key={m.user_id}
              href={'/admin/users/' + m.user_id}
              className={
                'grid grid-cols-1 md:grid-cols-[1.6fr_1fr_1.4fr_140px] gap-4 px-7 py-4 items-center hover:bg-paper-warm transition-colors no-underline text-inherit ' +
                (i < memberRows.length - 1 ? 'border-b border-rule-soft' : '')
              }
            >
              <div className="font-serif font-semibold text-base text-ink truncate">
                {m.email}
              </div>
              <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
                {m.roles.map((r) => ROLE_LABEL[r] ?? r).join(' · ')}
              </div>
              <div className="font-serif italic text-sm text-muted truncate">
                {m.sites.join(' + ')}
              </div>
              <div className="font-serif text-xs text-muted">
                {dateFmt.format(new Date(m.earliest))}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
