'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  removeMembershipAction,
  removeUserFromAllOwnedSitesAction,
  deleteUserAccountAction,
} from '@/app/owner/team/actions';

type SiteRow = {
  membership_id: string;
  site_name: string;
  role: string;
};

/**
 * Three-tier destructive footer on the user-detail page:
 *
 *  1. Remove from this site  — one membership row
 *  2. Remove from all sites  — every membership across the owner's sites
 *  3. Delete account         — auth.users + cascade
 *
 * Each button requires a confirm tap before firing. Errors land inline
 * so a failed founder-protect or out-of-scope check is visible without
 * a toast system.
 */
export function MemberActions({
  userId,
  userLabel,
  sites,
  canDeleteAccount,
  deleteBlockedReason,
}: {
  userId: string;
  userLabel: string;
  sites: SiteRow[];
  /** True when target's memberships sit entirely within caller's owned
   *  sites — i.e. it's safe to fully delete the auth user. */
  canDeleteAccount: boolean;
  /** Human-readable reason when canDeleteAccount is false. */
  deleteBlockedReason?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function reset() {
    setError(null);
    setInfo(null);
  }

  function removeSite(membershipId: string, siteName: string) {
    reset();
    startTransition(async () => {
      const res = await removeMembershipAction(membershipId);
      if (!res.ok) {
        setError(res.error ?? 'Could not remove member from site.');
        setConfirmId(null);
        return;
      }
      setInfo(userLabel + ' removed from ' + siteName + '.');
      setConfirmId(null);
      // If that was their last site under us, the user-detail page no
      // longer has anything to show — bounce to the list.
      if (sites.length === 1) {
        router.push('/owner/team');
      } else {
        router.refresh();
      }
    });
  }

  function removeAll() {
    reset();
    startTransition(async () => {
      const res = await removeUserFromAllOwnedSitesAction(userId);
      if (!res.ok) {
        setError(res.error ?? 'Could not remove member from all sites.');
        setConfirmId(null);
        return;
      }
      setInfo(
        userLabel +
          ' removed from ' +
          (res.removed ?? sites.length) +
          ' site' +
          ((res.removed ?? sites.length) === 1 ? '' : 's') +
          '.',
      );
      router.push('/owner/team');
    });
  }

  function deleteAccount() {
    reset();
    startTransition(async () => {
      const res = await deleteUserAccountAction(userId);
      if (!res.ok) {
        setError(res.error ?? 'Could not delete account.');
        setConfirmId(null);
        return;
      }
      setInfo(userLabel + "'s account has been deleted.");
      router.push('/owner/team');
    });
  }

  return (
    <div className="bg-card border border-rule mt-10">
      <div className="px-7 py-4 border-b border-rule">
        <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-urgent">
          Danger Zone
        </div>
        <p className="font-serif italic text-sm text-muted mt-1">
          Removing a member is reversible — they can be re-invited. Deleting
          the account is permanent.
        </p>
      </div>

      <div className="divide-y divide-rule-soft">
        {sites.map((s) => {
          const cid = 'site:' + s.membership_id;
          const isConfirming = confirmId === cid;
          return (
            <div key={s.membership_id} className="px-7 py-4 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="font-serif font-semibold text-base text-ink">
                  Remove from {s.site_name}
                </div>
                <div className="font-serif italic text-sm text-muted">
                  Their membership ({roleLabel(s.role)}) at this site will be
                  deleted. Other sites are unaffected.
                </div>
              </div>
              {isConfirming ? (
                <div className="flex items-center gap-2">
                  <span className="font-serif italic text-sm text-urgent">
                    Sure?
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSite(s.membership_id, s.site_name)}
                    disabled={pending}
                    className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 bg-urgent text-paper hover:bg-urgent/85 transition-colors disabled:opacity-50"
                  >
                    Yes, remove
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    disabled={pending}
                    className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 border border-rule text-muted hover:text-ink transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setConfirmId(cid);
                  }}
                  disabled={pending}
                  className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 border border-urgent text-urgent hover:bg-urgent hover:text-paper transition-colors disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          );
        })}

        {sites.length > 1 && (
          <div className="px-7 py-4 flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="font-serif font-semibold text-base text-ink">
                Remove from all {sites.length} sites
              </div>
              <div className="font-serif italic text-sm text-muted">
                Every membership this person holds across sites you own will be
                deleted in one shot.
              </div>
            </div>
            {confirmId === 'all' ? (
              <div className="flex items-center gap-2">
                <span className="font-serif italic text-sm text-urgent">
                  Sure?
                </span>
                <button
                  type="button"
                  onClick={removeAll}
                  disabled={pending}
                  className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 bg-urgent text-paper hover:bg-urgent/85 transition-colors disabled:opacity-50"
                >
                  Yes, remove all
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmId(null)}
                  disabled={pending}
                  className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 border border-rule text-muted hover:text-ink transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  reset();
                  setConfirmId('all');
                }}
                disabled={pending}
                className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 border border-urgent text-urgent hover:bg-urgent hover:text-paper transition-colors disabled:opacity-50"
              >
                Remove from all
              </button>
            )}
          </div>
        )}

        <div className="px-7 py-4 flex items-center gap-4 flex-wrap bg-urgent/[0.03]">
          <div className="flex-1 min-w-[200px]">
            <div className="font-serif font-semibold text-base text-ink">
              Delete account permanently
            </div>
            <div className="font-serif italic text-sm text-muted">
              {canDeleteAccount
                ? 'Removes the login itself, every membership, and every audit row tied to ' +
                  userLabel +
                  '. Cannot be undone.'
                : (deleteBlockedReason ??
                  'This user has memberships on sites outside your ownership. You can only delete users that exist entirely inside your account.')}
            </div>
          </div>
          {canDeleteAccount &&
            (confirmId === 'delete' ? (
              <div className="flex items-center gap-2">
                <span className="font-serif italic text-sm text-urgent">
                  Type-anywhere confirm:
                </span>
                <button
                  type="button"
                  onClick={deleteAccount}
                  disabled={pending}
                  className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 bg-urgent text-paper hover:bg-urgent/85 transition-colors disabled:opacity-50"
                >
                  Delete forever
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmId(null)}
                  disabled={pending}
                  className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 border border-rule text-muted hover:text-ink transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  reset();
                  setConfirmId('delete');
                }}
                disabled={pending}
                className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 bg-urgent text-paper hover:bg-urgent/85 transition-colors disabled:opacity-50"
              >
                Delete account
              </button>
            ))}
        </div>
      </div>

      {(error || info) && (
        <div className="px-7 py-4 border-t border-rule">
          {error && (
            <div className="font-serif italic text-sm text-urgent">{error}</div>
          )}
          {info && (
            <div className="font-serif italic text-sm text-healthy">{info}</div>
          )}
        </div>
      )}
    </div>
  );
}

function roleLabel(r: string): string {
  const map: Record<string, string> = {
    owner: 'Owner',
    manager: 'Manager',
    chef: 'Head Chef',
    sous_chef: 'Sous Chef',
    commis: 'Commis',
    bartender: 'Bartender',
    head_bartender: 'Head Bartender',
    bar_back: 'Bar Back',
    viewer: 'Viewer',
  };
  return map[r] ?? r;
}
