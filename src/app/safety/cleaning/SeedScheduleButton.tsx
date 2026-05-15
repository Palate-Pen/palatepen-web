'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { seedDefaultCleaningTasksAction } from '@/lib/safety/actions';

/**
 * Client-side seed button that surfaces error / success from the
 * server action. Scoped to the active siteId so multi-site users
 * (founder jack@, group-tier owners) seed against the site they're
 * actually looking at.
 */
export function SeedScheduleButton({ siteId }: { siteId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function go() {
    setError(null);
    startTransition(async () => {
      const res = await seedDefaultCleaningTasksAction({ siteId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark disabled:opacity-50 transition-colors"
      >
        {pending ? 'Seeding…' : 'Seed default schedule'}
      </button>
      {error && (
        <span className="font-serif italic text-sm text-urgent">{error}</span>
      )}
    </div>
  );
}
