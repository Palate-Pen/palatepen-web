'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signoffCleaningTaskAction } from '@/lib/safety/actions';
import type { CleaningTaskRow } from '@/lib/safety/lib';
import { DishPicker, type DishPickerValue } from '@/components/safety/DishPicker';
import type { DishPickerBands } from '@/lib/safety/dish-picker';

export function CleaningTickRow({
  task,
  freqLabel,
  isLast,
  lastByLabel,
  bands,
}: {
  task: CleaningTaskRow;
  freqLabel: string;
  isLast: boolean;
  /** Display name of the user who last completed this task, if known. */
  lastByLabel?: string | null;
  /** Live menu / prep / library bands for the optional dish-link picker. */
  bands: DishPickerBands;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [dish, setDish] = useState<DishPickerValue>({ recipe_id: null, text: '' });
  const [notes, setNotes] = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const doneToday =
    task.last_completed_at && task.last_completed_at.slice(0, 10) === today;

  function tick(includeDetails: boolean) {
    startTransition(async () => {
      await signoffCleaningTaskAction(task.id, {
        recipe_id: includeDetails ? dish.recipe_id : null,
        notes: includeDetails && notes.trim() !== '' ? notes.trim() : null,
      });
      setDish({ recipe_id: null, text: '' });
      setNotes('');
      setExpanded(false);
      router.refresh();
    });
  }

  return (
    <div className={isLast ? '' : 'border-b border-rule-soft'}>
      <div className="grid grid-cols-1 md:grid-cols-[1.6fr_120px_160px_180px] gap-3 px-7 py-4 items-center">
        <div className="font-serif text-base text-ink">{task.task}</div>
        <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
          {freqLabel}
        </div>
        <div className="font-serif italic text-xs text-muted">
          {task.last_completed_at ? (
            <>
              Last:{' '}
              {new Date(task.last_completed_at).toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {lastByLabel && (
                <>
                  {' · '}
                  <span className="not-italic text-ink-soft">{lastByLabel}</span>
                </>
              )}
            </>
          ) : (
            'Not yet ticked'
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => tick(false)}
            disabled={pending}
            className={
              'flex-1 font-display font-semibold text-xs tracking-[0.18em] uppercase px-3 py-2 border transition-colors disabled:opacity-50 ' +
              (doneToday
                ? 'bg-healthy text-paper border-healthy'
                : 'bg-paper text-muted border-rule hover:border-gold hover:text-gold')
            }
          >
            {pending ? 'Saving' + String.fromCharCode(0x2026) : doneToday ? 'Done today' : 'Tick done'}
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            disabled={pending}
            aria-label="Add details to this signoff"
            className={
              'font-display font-semibold text-xs tracking-[0.18em] uppercase px-2 py-2 border transition-colors disabled:opacity-50 ' +
              (expanded
                ? 'bg-gold text-paper border-gold'
                : 'bg-paper text-muted border-rule hover:border-gold hover:text-gold')
            }
          >
            {expanded ? String.fromCharCode(0x25b4) : String.fromCharCode(0x25be)}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-7 pb-5 pt-1 bg-paper-warm/40 border-t border-rule-soft">
          <div className="mb-3">
            <DishPicker
              bands={bands}
              value={dish}
              onChange={setDish}
              label="Linked dish (optional)"
              meta="link the signoff to a dish — e.g. ice cream machine cleaned after dairy service"
              placeholder="e.g. all dairy desserts · fryer for fish course"
            />
          </div>
          <label className="block">
            <span className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-muted mb-1.5 block">
              Note (optional)
            </span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="anything worth flagging"
              className="w-full px-3 py-2 border border-rule bg-paper font-serif text-sm text-ink focus:outline-none focus:border-gold"
            />
          </label>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => tick(true)}
              disabled={pending}
              className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 bg-gold text-paper border border-gold hover:bg-gold-dark disabled:opacity-50 transition-colors"
            >
              {pending ? 'Saving' + String.fromCharCode(0x2026) : 'Tick with details'}
            </button>
            <button
              type="button"
              onClick={() => {
                setDish({ recipe_id: null, text: '' });
                setNotes('');
                setExpanded(false);
              }}
              disabled={pending}
              className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-3 py-2 bg-transparent text-muted border border-rule hover:text-ink disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
