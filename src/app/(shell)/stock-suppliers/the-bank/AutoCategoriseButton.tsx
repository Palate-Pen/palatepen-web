'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { autoCategoriseBank } from './actions';

export function AutoCategoriseButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function go() {
    setResult(null);
    start(async () => {
      const res = await autoCategoriseBank();
      if (!res.ok) {
        setResult(`error: ${res.error}`);
        return;
      }
      setResult(
        res.categorised === 0
          ? 'All ingredients are already categorised.'
          : `Categorised ${res.categorised} ingredient${res.categorised === 1 ? '' : 's'}.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-transparent text-ink border border-rule hover:border-gold hover:text-gold transition-colors disabled:opacity-40 whitespace-nowrap"
        title="Bulk-apply a best-fit category to every ingredient that doesn't have one. Chef-set categories are left alone."
      >
        {pending ? 'Categorising…' : '⌁ Auto-categorise'}
      </button>
      {result && (
        <span className="font-serif italic text-xs text-muted">{result}</span>
      )}
    </div>
  );
}
