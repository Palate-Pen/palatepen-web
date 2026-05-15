'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signoffCleaningTaskAction } from '@/lib/safety/actions';
import type { CleaningTaskRow } from '@/lib/safety/lib';

export function CleaningTickRow({
  task,
  freqLabel,
  isLast,
}: {
  task: CleaningTaskRow;
  freqLabel: string;
  isLast: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);
  const doneToday =
    task.last_completed_at && task.last_completed_at.slice(0, 10) === today;

  function tick() {
    startTransition(async () => {
      await signoffCleaningTaskAction(task.id);
      router.refresh();
    });
  }

  return (
    <div
      className={
        'grid grid-cols-1 md:grid-cols-[1.6fr_120px_160px_120px] gap-3 px-7 py-4 items-center ' +
        (isLast ? '' : 'border-b border-rule-soft')
      }
    >
      <div className="font-serif text-base text-ink">{task.task}</div>
      <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
        {freqLabel}
      </div>
      <div className="font-serif italic text-xs text-muted">
        {task.last_completed_at
          ? 'Last: ' +
            new Date(task.last_completed_at).toLocaleString('en-GB', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Not yet ticked'}
      </div>
      <button
        type="button"
        onClick={tick}
        disabled={pending}
        className={
          'font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 border transition-colors disabled:opacity-50 ' +
          (doneToday
            ? 'bg-healthy text-paper border-healthy'
            : 'bg-paper text-muted border-rule hover:border-gold hover:text-gold')
        }
      >
        {pending ? 'Saving' + String.fromCharCode(0x2026) : doneToday ? 'Done today' : 'Tick done'}
      </button>
    </div>
  );
}
