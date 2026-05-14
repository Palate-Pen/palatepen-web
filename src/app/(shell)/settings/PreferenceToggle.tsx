'use client';

import { useState, useTransition } from 'react';
import { setUserPreference } from './actions';
import type { UserPreferences } from '@/lib/preferences';

export function PreferenceToggle<K extends keyof UserPreferences>({
  prefKey,
  label,
  description,
  initial,
}: {
  prefKey: K;
  label: string;
  description: string;
  initial: UserPreferences[K];
}) {
  const [on, setOn] = useState<boolean>(initial as unknown as boolean);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    if (pending) return;
    const next = !on;
    // Optimistic flip — server action revalidates /settings, which gives
    // the canonical value back on next render. If the action fails we
    // restore the previous state and surface a small error line.
    setOn(next);
    setError(null);
    startTransition(async () => {
      const res = await setUserPreference(
        prefKey,
        next as unknown as UserPreferences[K],
      );
      if (!res.ok) {
        setOn(!next);
        setError(res.error);
      }
    });
  }

  return (
    <div className="px-7 py-4 flex justify-between items-start gap-4">
      <div className="min-w-0 flex-1">
        <div className="font-serif text-sm text-ink">{label}</div>
        <div className="font-serif italic text-xs text-muted mt-0.5">
          {description}
        </div>
        {error && (
          <div className="font-serif italic text-xs text-urgent mt-1">
            Couldn't save: {error}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={on}
        aria-label={`${label} ${on ? 'on' : 'off'}`}
        className={
          'w-10 h-6 rounded-full relative transition-colors flex-shrink-0 cursor-pointer disabled:opacity-60 ' +
          (on ? 'bg-gold' : 'bg-rule')
        }
      >
        <span
          className={
            'absolute w-5 h-5 bg-paper rounded-full top-0.5 transition-[left] ' +
            (on ? 'left-[18px]' : 'left-0.5')
          }
        />
      </button>
    </div>
  );
}
