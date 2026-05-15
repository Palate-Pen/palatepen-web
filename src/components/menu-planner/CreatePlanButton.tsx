'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ensureActivePlan } from '@/lib/menu-plan-actions';
import type { MenuPlanSurface } from '@/lib/menu-plan';

export function CreatePlanButton({
  siteId,
  surface,
}: {
  siteId: string;
  surface: MenuPlanSurface;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function go() {
    start(async () => {
      await ensureActivePlan(siteId, surface);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={pending}
      className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors whitespace-nowrap disabled:opacity-50"
    >
      {pending ? 'Starting…' : 'Start planning the next menu'}
    </button>
  );
}
