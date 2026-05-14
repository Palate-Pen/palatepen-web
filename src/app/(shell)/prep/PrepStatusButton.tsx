'use client';

import { useTransition } from 'react';
import { cyclePrepStatus } from './actions';
import type { PrepStatus } from '@/lib/prep';

const STATUS_PILL: Record<PrepStatus, { dot: string; label: string; text: string }> = {
  not_started: { dot: 'bg-muted-soft', label: 'Not Started', text: 'text-muted' },
  in_progress: { dot: 'bg-gold', label: 'In Progress', text: 'text-gold' },
  done: { dot: 'bg-healthy', label: 'Done', text: 'text-healthy' },
  over_prepped: { dot: 'bg-attention', label: 'Over-Prepped', text: 'text-attention' },
  short: { dot: 'bg-urgent', label: 'Short', text: 'text-urgent' },
};

const NEXT_HINT: Record<PrepStatus, string> = {
  not_started: 'Tap to start',
  in_progress: 'Tap when done',
  done: 'Tap to reopen',
  over_prepped: 'Tap to reopen',
  short: 'Tap to reopen',
};

export function PrepStatusButton({
  itemId,
  status,
}: {
  itemId: string;
  status: PrepStatus;
}) {
  const [pending, startTransition] = useTransition();
  const cfg = STATUS_PILL[status];

  function onClick() {
    startTransition(async () => {
      await cyclePrepStatus(itemId);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title={pending ? 'Updating…' : NEXT_HINT[status]}
      className={
        'inline-flex items-center gap-1.5 font-sans font-semibold text-xs tracking-[0.08em] uppercase bg-transparent border-0 p-0 cursor-pointer hover:opacity-70 transition-opacity ' +
        cfg.text +
        (pending ? ' opacity-50' : '')
      }
    >
      <span className={'w-1.5 h-1.5 rounded-full ' + cfg.dot} />
      {cfg.label}
    </button>
  );
}
