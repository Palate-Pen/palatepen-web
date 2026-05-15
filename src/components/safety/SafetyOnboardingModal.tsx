'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ONBOARDING_COPY } from '@/lib/safety/legal';
import { ackLiabilityAction } from '@/lib/safety/actions';

/**
 * Liability acknowledgement gate. The Safety layout renders this when
 * the current account has safety_liability_acked_at = null and the
 * caller is an owner. The modal is non-dismissable — accept or leave.
 *
 * Once accepted, the layout re-fetches the account state and unblocks
 * the safety surfaces.
 */
export function SafetyOnboardingModal({
  showSeedCleaning,
}: {
  /** When true, the modal explains the cleaning-schedule seed in the
   *  same flow. The seed action runs after liability ack on the server. */
  showSeedCleaning?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function accept() {
    setError(null);
    startTransition(async () => {
      const res = await ackLiabilityAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/70 flex items-center justify-center px-4 print-hide">
      <div className="bg-paper border-2 border-urgent max-w-[640px] w-full">
        <div className="bg-urgent text-paper px-7 py-4 font-display font-semibold text-xs tracking-[0.3em] uppercase">
          {ONBOARDING_COPY.title}
        </div>
        <div className="px-7 py-7">
          <div
            className="font-serif text-base text-ink leading-relaxed space-y-3"
            dangerouslySetInnerHTML={{
              __html: renderOnboarding(ONBOARDING_COPY.body_md),
            }}
          />
          {showSeedCleaning && (
            <p className="font-serif italic text-sm text-muted mt-5">
              We'll seed a default SFBB-aligned cleaning schedule for you on
              accept. You can change every task afterwards.
            </p>
          )}
          {error && (
            <p className="font-serif italic text-sm text-urgent mt-5">
              {error}
            </p>
          )}
          <div className="mt-7 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={accept}
              disabled={pending}
              className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-urgent text-paper border border-urgent hover:bg-urgent/90 disabled:opacity-50 transition-colors"
            >
              {pending ? 'Saving' + String.fromCharCode(0x2026) : ONBOARDING_COPY.ackLabel}
            </button>
            <a
              href="/"
              className="font-serif italic text-sm text-muted hover:text-ink"
            >
              Leave Safety
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderOnboarding(md: string): string {
  return md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .split(/\n\n+/)
    .map(
      (p) =>
        '<p>' +
        p.replace(
          /\*\*(.+?)\*\*/g,
          '<strong class="font-semibold not-italic">$1</strong>',
        ) +
        '</p>',
    )
    .join('');
}
