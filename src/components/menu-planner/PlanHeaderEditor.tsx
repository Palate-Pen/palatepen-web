'use client';

import { useState, useTransition } from 'react';
import { updatePlan } from '@/lib/menu-plan-actions';

export function PlanHeaderEditor({
  planId,
  initialName,
  initialTargetLaunch,
  revalidatePathname,
}: {
  planId: string;
  initialName: string;
  initialTargetLaunch: string | null;
  revalidatePathname: string;
}) {
  const [name, setName] = useState(initialName);
  const [target, setTarget] = useState(initialTargetLaunch ?? '');
  const [pending, start] = useTransition();

  function saveName() {
    if (name.trim() === initialName) return;
    start(async () => {
      await updatePlan({
        planId,
        name: name.trim(),
        revalidatePathname,
      });
    });
  }

  function saveTarget(next: string) {
    setTarget(next);
    start(async () => {
      await updatePlan({
        planId,
        targetLaunch: next || null,
        revalidatePathname,
      });
    });
  }

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={saveName}
        className="font-display text-2xl font-semibold uppercase tracking-[0.04em] text-ink bg-transparent border-b border-rule focus:border-gold focus:outline-none px-1 py-0.5 min-w-[200px]"
        disabled={pending}
      />
      <label className="flex items-center gap-2">
        <span className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-muted">
          Target launch
        </span>
        <input
          type="date"
          value={target}
          onChange={(e) => saveTarget(e.target.value)}
          className="font-serif text-sm text-ink bg-transparent border border-rule px-2 py-1 focus:border-gold focus:outline-none"
          disabled={pending}
        />
      </label>
    </div>
  );
}
