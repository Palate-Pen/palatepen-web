'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  adminRemoveMembershipAction,
  adminDeleteUserAction,
} from '@/app/admin/users/actions';

type MembershipRow = {
  membership_id: string;
  account_name: string;
  site_name: string;
  role: string;
};

import { ROLE_LABEL } from '@/lib/roles';

/**
 * Founder-admin Danger Zone for a single user. Mirrors the owner-side
 * MemberActions but with the founder's cross-account reach.
 */
export function AdminUserActions({
  userId,
  userLabel,
  memberships,
  canDelete,
  blockedReason,
}: {
  userId: string;
  userLabel: string;
  memberships: MembershipRow[];
  canDelete: boolean;
  blockedReason?: string;
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

  function removeMembership(membershipId: string, label: string) {
    reset();
    startTransition(async () => {
      const res = await adminRemoveMembershipAction(membershipId);
      if (!res.ok) {
        setError(res.error ?? 'Could not remove membership.');
        setConfirmId(null);
        return;
      }
      setInfo(userLabel + ' removed from ' + label + '.');
      setConfirmId(null);
      if (memberships.length === 1) {
        router.push('/admin/users');
      } else {
        router.refresh();
      }
    });
  }

  function deleteUser() {
    reset();
    startTransition(async () => {
      const res = await adminDeleteUserAction(userId);
      if (!res.ok) {
        setError(res.error ?? 'Could not delete user.');
        setConfirmId(null);
        return;
      }
      router.push('/admin/users');
    });
  }

  return (
    <div className="bg-card border border-rule mt-10">
      <div className="px-7 py-4 border-b border-rule">
        <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-urgent">
          Danger Zone
        </div>
        <p className="font-serif italic text-sm text-muted mt-1">
          Founder reach. Removing a membership is reversible (re-invite).
          Deleting the account is not.
        </p>
      </div>

      <div className="divide-y divide-rule-soft">
        {memberships.map((m) => {
          const cid = 'm:' + m.membership_id;
          const isConfirming = confirmId === cid;
          const label = m.site_name + ' (' + m.account_name + ')';
          return (
            <div
              key={m.membership_id}
              className="px-7 py-4 flex items-center gap-4 flex-wrap"
            >
              <div className="flex-1 min-w-[200px]">
                <div className="font-serif font-semibold text-base text-ink">
                  Remove from {m.site_name}
                </div>
                <div className="font-serif italic text-sm text-muted">
                  {ROLE_LABEL[m.role] ?? m.role} · in {m.account_name}
                </div>
              </div>
              {isConfirming ? (
                <div className="flex items-center gap-2">
                  <span className="font-serif italic text-sm text-urgent">
                    Sure?
                  </span>
                  <button
                    type="button"
                    onClick={() => removeMembership(m.membership_id, label)}
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

        <div className="px-7 py-4 flex items-center gap-4 flex-wrap bg-urgent/[0.03]">
          <div className="flex-1 min-w-[200px]">
            <div className="font-serif font-semibold text-base text-ink">
              Delete account permanently
            </div>
            <div className="font-serif italic text-sm text-muted">
              {canDelete
                ? 'Removes the auth login, every membership, and every linked row for ' +
                  userLabel +
                  '. Cannot be undone.'
                : (blockedReason ?? 'Cannot be deleted.')}
            </div>
          </div>
          {canDelete &&
            (confirmId === 'delete' ? (
              <div className="flex items-center gap-2">
                <span className="font-serif italic text-sm text-urgent">
                  Permanent. You sure?
                </span>
                <button
                  type="button"
                  onClick={deleteUser}
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
