'use client';

import { useState, useTransition } from 'react';
import { impersonateUserAction } from '@/app/admin/users/actions';

/**
 * Founder-only button on each user row. Click → generate a Supabase
 * magic link for that user's email → navigate to it → founder is now
 * signed in AS that user. The global ImpersonationBanner appears on
 * every surface so they can Stop and return to the founder account.
 */
export function ImpersonateButton({
  userId,
  userLabel,
  disabled,
  disabledReason,
}: {
  userId: string;
  userLabel: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function go() {
    setError(null);
    startTransition(async () => {
      const res = await impersonateUserAction(userId);
      if (!res.ok || !res.url) {
        setError(res.error ?? 'Could not start impersonation.');
        setConfirming(false);
        return;
      }
      // Hard navigation — following the Supabase magic link replaces
      // our session cookies with the target user's.
      window.location.href = res.url;
    });
  }

  if (disabled) {
    return (
      <span
        className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted-soft cursor-not-allowed"
        title={disabledReason}
      >
        —
      </span>
    );
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={go}
          disabled={pending}
          className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-2.5 py-1 bg-attention text-paper hover:bg-attention/85 transition-colors disabled:opacity-50"
        >
          {pending ? 'Going…' : 'Confirm'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-2.5 py-1 border border-rule text-muted hover:text-ink transition-colors"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => setConfirming(true)}
        title={'Sign in as ' + userLabel}
        className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-2.5 py-1 border border-gold text-gold hover:bg-gold hover:text-paper transition-colors"
      >
        Impersonate
      </button>
      {error && (
        <span className="font-serif italic text-[11px] text-urgent leading-tight">
          {error}
        </span>
      )}
    </span>
  );
}
