'use client';

import { useState, useTransition } from 'react';
import { stopImpersonationAction } from '@/app/admin/users/actions';

/**
 * Banner action button. Calls the server action which always signs
 * back in as ADMIN_EMAIL — never trusts the impersonation cookie's
 * value, so a tampered cookie cannot land the founder anywhere
 * unintended.
 */
export function StopImpersonationButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function go() {
    setError(null);
    startTransition(async () => {
      const res = await stopImpersonationAction();
      if (!res.ok || !res.url) {
        setError(res.error ?? 'Could not return to founder.');
        return;
      }
      window.location.href = res.url;
    });
  }

  return (
    <span className="inline-flex items-center gap-2.5">
      {error && (
        <span className="font-serif italic text-[12px] text-paper/90">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-3 py-1.5 bg-gold text-paper border border-gold hover:bg-gold-dark hover:border-gold-dark transition-colors disabled:opacity-60"
      >
        {pending ? 'Heading out…' : "I'm done · go back"}
      </button>
    </span>
  );
}
