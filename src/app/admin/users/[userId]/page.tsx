import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { ADMIN_EMAIL } from '@/lib/admin';
import { TierSelect } from '@/components/admin/TierSelect';
import { ImpersonateButton } from '@/components/admin/ImpersonateButton';
import { AdminUserActions } from '@/components/admin/AdminUserActions';

export const metadata = { title: 'User — Admin — Palatable' };

import { ROLE_LABEL } from '@/lib/roles';

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/**
 * Founder Admin · User detail.
 *
 * Single source of truth for everything a founder can do to one user:
 *   - View identity (email, ID, joined, last sign-in)
 *   - Impersonate
 *   - See every membership across every site and account
 *   - Change tier on any account they own
 *   - Remove any membership
 *   - Delete the auth account
 *
 * Founder protection sits on every destructive path.
 *
 * Schema note: v2.memberships does NOT have account_id. Account is
 * reached via site_id → v2.sites.account_id.
 */
export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const svc = createSupabaseServiceClient();
  const { data: targetAuth } = await svc.auth.admin.getUserById(userId);
  if (!targetAuth?.user) notFound();
  const target = targetAuth.user;
  const targetEmail = target.email ?? '';

  // Memberships across all sites (account reached via sites join).
  const { data: memberships } = await svc
    .from('memberships')
    .select('id, role, site_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  const mRows = ((memberships ?? []) as Array<{
    id: string;
    role: string;
    site_id: string;
    created_at: string;
  }>);

  const siteIds = Array.from(new Set(mRows.map((m) => m.site_id)));
  const { data: sites } =
    siteIds.length === 0
      ? { data: [] }
      : await svc.from('sites').select('id, name, account_id').in('id', siteIds);
  const sRows = (sites ?? []) as Array<{
    id: string;
    name: string;
    account_id: string;
  }>;
  const siteById = new Map(sRows.map((s) => [s.id, s]));
  const accountIdBySiteId = new Map(sRows.map((s) => [s.id, s.account_id]));

  const accountIds = Array.from(new Set(sRows.map((s) => s.account_id)));
  const { data: accounts } =
    accountIds.length === 0
      ? { data: [] }
      : await svc
          .from('accounts')
          .select('id, name, tier, is_founder, created_at')
          .in('id', accountIds);
  const accountById = new Map(
    ((accounts ?? []) as Array<{
      id: string;
      name: string | null;
      tier: string;
      is_founder: boolean;
      created_at: string;
    }>).map((a) => [a.id, a]),
  );

  // Owned accounts: accounts where this user has role='owner' on any site.
  const ownedAccountIds = Array.from(
    new Set(
      mRows
        .filter((m) => m.role === 'owner')
        .map((m) => accountIdBySiteId.get(m.site_id))
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const isFounderAccountUser = Array.from(accountById.values()).some(
    (a) => a.is_founder,
  );
  const isSelf = viewer?.id === userId;
  const isAdminEmail =
    targetEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const canDelete = !isSelf && !isFounderAccountUser && !isAdminEmail;
  const blockedReason = isSelf
    ? "You can't delete your own account from here."
    : isAdminEmail
      ? 'The founder login is protected.'
      : isFounderAccountUser
        ? 'This user owns a founder account.'
        : undefined;

  const totalMemberships = mRows.length;
  const ownerCount = mRows.filter((m) => m.role === 'owner').length;

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Founder Admin · User
      </div>
      <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] text-ink">
        <em className="text-gold font-semibold not-italic">{targetEmail || 'Unknown'}</em>
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-8">
        {totalMemberships === 0
          ? 'No memberships on file — orphan user account.'
          : totalMemberships +
            ' membership' +
            (totalMemberships === 1 ? '' : 's') +
            ' across ' +
            accountIds.length +
            ' account' +
            (accountIds.length === 1 ? '' : 's') +
            (ownerCount > 0
              ? ' · ' + ownerCount + ' owner role' + (ownerCount === 1 ? '' : 's')
              : '')}
      </p>

      <Link
        href="/admin/users"
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors inline-block mb-6"
      >
        ← All users
      </Link>

      {/* IDENTITY */}
      <div className="bg-card border border-rule px-7 py-6 mb-8 grid md:grid-cols-[1fr_auto] gap-6 items-start">
        <div>
          <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted mb-2">
            Identity
          </div>
          <dl className="grid grid-cols-[140px_1fr] gap-y-2 gap-x-4 font-serif text-sm">
            <dt className="text-muted">Email</dt>
            <dd className="text-ink">{targetEmail || '—'}</dd>
            <dt className="text-muted">User ID</dt>
            <dd className="font-mono text-xs text-ink-soft break-all">
              {userId}
            </dd>
            <dt className="text-muted">Created</dt>
            <dd className="text-ink">
              {dateFmt.format(new Date(target.created_at))}
            </dd>
            <dt className="text-muted">Last sign-in</dt>
            <dd className="text-ink">
              {target.last_sign_in_at
                ? dateFmt.format(new Date(target.last_sign_in_at))
                : 'never'}
            </dd>
            {isFounderAccountUser && (
              <>
                <dt className="text-gold-dark font-semibold">Status</dt>
                <dd className="text-gold-dark font-semibold">
                  Founder account · protected
                </dd>
              </>
            )}
          </dl>
        </div>
        <div className="flex flex-col items-end gap-3">
          <ImpersonateButton
            userId={userId}
            userLabel={targetEmail}
            disabled={isSelf || isFounderAccountUser}
            disabledReason={
              isSelf
                ? "That's your own account."
                : 'Founder accounts cannot be impersonated.'
            }
          />
        </div>
      </div>

      {/* OWNED ACCOUNTS — tier control */}
      {ownedAccountIds.length > 0 && (
        <>
          <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-3">
            Owns
          </div>
          <div className="bg-card border border-rule mb-8">
            {ownedAccountIds.map((aid, i) => {
              const a = accountById.get(aid);
              if (!a) return null;
              return (
                <div
                  key={aid}
                  className={
                    'px-7 py-4 flex items-center gap-4 flex-wrap ' +
                    (i < ownedAccountIds.length - 1
                      ? 'border-b border-rule-soft'
                      : '')
                  }
                >
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-serif font-semibold text-base text-ink">
                      <Link
                        href={'/admin/accounts/' + aid}
                        className="hover:text-gold transition-colors"
                      >
                        {a.name ?? 'Unnamed account'}
                      </Link>
                      {a.is_founder && (
                        <span className="ml-2 font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-gold border border-gold/40 px-1.5 py-0.5">
                          founder
                        </span>
                      )}
                    </div>
                    <div className="font-serif italic text-xs text-muted">
                      Account created {dateFmt.format(new Date(a.created_at))}
                    </div>
                  </div>
                  <div className="min-w-[200px]">
                    <div className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-muted mb-1">
                      Tier
                    </div>
                    <TierSelect
                      accountId={aid}
                      current={a.tier}
                      isFounder={a.is_founder}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* MEMBERSHIPS */}
      <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-3">
        Memberships
      </div>
      {mRows.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-12 text-center font-serif italic text-muted">
          This user is not on any site.
        </div>
      ) : (
        <div className="bg-card border border-rule">
          <div className="hidden md:grid grid-cols-[1.5fr_1.5fr_1fr_140px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
            {['Site', 'Account', 'Role', 'Joined'].map((h) => (
              <div
                key={h}
                className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
              >
                {h}
              </div>
            ))}
          </div>
          {mRows.map((m, i) => {
            const site = siteById.get(m.site_id);
            const aid = accountIdBySiteId.get(m.site_id);
            const account = aid ? accountById.get(aid) : null;
            return (
              <div
                key={m.id}
                className={
                  'grid grid-cols-1 md:grid-cols-[1.5fr_1.5fr_1fr_140px] gap-4 px-7 py-4 items-center ' +
                  (i < mRows.length - 1 ? 'border-b border-rule-soft' : '')
                }
              >
                <div className="font-serif text-base text-ink truncate">
                  {site?.name ?? '—'}
                </div>
                <div className="font-serif text-sm text-muted truncate">
                  {aid ? (
                    <Link
                      href={'/admin/accounts/' + aid}
                      className="hover:text-gold transition-colors"
                    >
                      {account?.name ?? '—'}
                    </Link>
                  ) : (
                    '—'
                  )}
                </div>
                <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
                  {ROLE_LABEL[m.role] ?? m.role}
                </div>
                <div className="font-serif text-xs text-muted">
                  {dateFmt.format(new Date(m.created_at))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DANGER ZONE */}
      <AdminUserActions
        userId={userId}
        userLabel={targetEmail || userId.slice(0, 8)}
        memberships={mRows.map((m) => {
          const site = siteById.get(m.site_id);
          const aid = accountIdBySiteId.get(m.site_id);
          const account = aid ? accountById.get(aid) : null;
          return {
            membership_id: m.id,
            account_name: account?.name ?? '—',
            site_name: site?.name ?? '—',
            role: m.role,
          };
        })}
        canDelete={canDelete}
        blockedReason={blockedReason}
      />
    </div>
  );
}
