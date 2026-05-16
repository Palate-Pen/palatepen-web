'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setAccountTierAction } from '@/app/admin/users/actions';

const TIERS = ['free', 'pro', 'kitchen', 'group', 'enterprise'] as const;

const LABEL: Record<(typeof TIERS)[number], string> = {
  free: 'Free',
  pro: 'Pro',
  kitchen: 'Kitchen',
  group: 'Group',
  enterprise: 'Enterprise',
};

/**
 * Inline tier dropdown used on the founder admin accounts table.
 * Pessimistically locks while the action runs; reverts and surfaces
 * the error inline if it fails.
 */
export function TierSelect({
  accountId,
  current,
  isFounder,
}: {
  accountId: string;
  current: string;
  isFounder: boolean;
}) {
  const router = useRouter();
  const [tier, setTier] = useState(current);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function pick(next: string) {
    if (next === tier) return;
    const previous = tier;
    setError(null);
    setSavedAt(null);
    setTier(next);
    startTransition(async () => {
      const res = await setAccountTierAction(accountId, next);
      if (!res.ok) {
        setError(res.error ?? 'Could not change tier.');
        setTier(previous);
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
    });
  }

  return (
    <div className="min-w-[110px]">
      <select
        value={tier}
        disabled={pending || isFounder}
        onChange={(e) => pick(e.target.value)}
        title={isFounder ? 'Founder accounts cannot be tier-changed' : undefined}
        className={
          'w-full font-display font-semibold text-xs tracking-[0.08em] uppercase bg-paper border px-2 py-1 focus:border-gold focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed ' +
          (savedAt ? 'border-healthy text-healthy' : 'border-rule text-gold')
        }
      >
        {TIERS.map((t) => (
          <option key={t} value={t}>
            {LABEL[t]}
          </option>
        ))}
      </select>
      {error && (
        <div className="font-serif italic text-[11px] text-urgent mt-1 leading-tight">
          {error}
        </div>
      )}
    </div>
  );
}
