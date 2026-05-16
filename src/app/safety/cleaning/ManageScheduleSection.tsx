'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createCleaningTaskAction,
  updateCleaningTaskAction,
  archiveCleaningTaskAction,
} from '@/lib/safety/actions';
import type { CleaningTaskRow } from '@/lib/safety/lib';
import { CLEANING_FREQ_LABEL } from '@/lib/safety/standards';

const FREQUENCIES: CleaningTaskRow['frequency'][] = [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'annually',
];

/**
 * Manage your cleaning schedule — chef-controlled list of every task,
 * with inline edit, archive, and an add-task form at the bottom.
 *
 * Hidden behind a toggle at the top of the cleaning page so the
 * default view stays clean — admin only when you ask for it.
 *
 * Authorisation matches the seed action: owner / manager / chef on the
 * site can manage. The component itself doesn't gate access (the
 * server actions do); we render for everyone with the assumption the
 * caller has the role — chefs always do.
 */
export function ManageScheduleSection({
  siteId,
  tasks,
}: {
  siteId: string;
  tasks: CleaningTaskRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Add-form state
  const [newArea, setNewArea] = useState('');
  const [newTask, setNewTask] = useState('');
  const [newFreq, setNewFreq] = useState<CleaningTaskRow['frequency']>('daily');

  function reset() {
    setError(null);
    setInfo(null);
  }

  function addTask() {
    if (!newArea.trim() || !newTask.trim()) {
      setError('Area and task are both required.');
      return;
    }
    reset();
    startTransition(async () => {
      const res = await createCleaningTaskAction({
        siteId,
        area: newArea.trim(),
        task: newTask.trim(),
        frequency: newFreq,
      });
      if (!res.ok) {
        setError(res.error ?? 'Could not add task.');
        return;
      }
      setInfo(`"${newTask.trim()}" added.`);
      setNewArea('');
      setNewTask('');
      setNewFreq('daily');
      router.refresh();
    });
  }

  function saveEdit(taskId: string, patch: {
    area?: string;
    task?: string;
    frequency?: string;
  }) {
    reset();
    startTransition(async () => {
      const res = await updateCleaningTaskAction({ taskId, ...patch });
      if (!res.ok) {
        setError(res.error ?? 'Could not save.');
        return;
      }
      setEditingId(null);
      setInfo('Saved.');
      router.refresh();
    });
  }

  function archiveTask(taskId: string, label: string) {
    if (!confirm(`Archive "${label}"? Sign-offs are kept on record.`)) return;
    reset();
    startTransition(async () => {
      const res = await archiveCleaningTaskAction({ taskId });
      if (!res.ok) {
        setError(res.error ?? 'Could not archive.');
        return;
      }
      setInfo(`"${label}" archived.`);
      router.refresh();
    });
  }

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen((v) => !v);
          }}
          aria-expanded={open}
          className={
            'font-display font-semibold text-[11px] tracking-[0.25em] uppercase px-4 py-2 border transition-colors inline-flex items-center gap-2 ' +
            (open
              ? 'bg-ink text-paper border-ink hover:bg-ink-soft hover:border-ink-soft'
              : 'bg-paper text-ink border-rule hover:border-gold hover:text-gold')
          }
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="w-3.5 h-3.5"
            aria-hidden
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          {open ? 'Close manage schedule' : 'Manage schedule'}
        </button>
        <span className="font-serif italic text-sm text-muted">
          {tasks.length} task{tasks.length === 1 ? '' : 's'} on the schedule
        </span>
      </div>

      {!open ? null : (
      <>
      {(error || info) && (
        <div
          className={
            'px-5 py-3 mb-3 font-serif italic text-sm border-l-[3px] ' +
            (error
              ? 'bg-urgent/[0.05] border-l-urgent text-urgent'
              : 'bg-healthy/[0.05] border-l-healthy text-healthy')
          }
        >
          {error ?? info}
        </div>
      )}

      <div className="bg-card border border-rule mb-4">
        {tasks.length === 0 ? (
          <div className="px-6 py-6 font-serif italic text-sm text-muted">
            No tasks yet — add the first below.
          </div>
        ) : (
          tasks.map((t, i) => {
            const isEditing = editingId === t.id;
            if (isEditing) {
              return (
                <EditRow
                  key={t.id}
                  task={t}
                  onCancel={() => setEditingId(null)}
                  onSave={(patch) => saveEdit(t.id, patch)}
                  pending={pending}
                  isLast={i === tasks.length - 1}
                />
              );
            }
            return (
              <div
                key={t.id}
                className={
                  'grid grid-cols-1 md:grid-cols-[1.6fr_1fr_100px_180px] gap-3 px-6 py-3 items-center ' +
                  (i < tasks.length - 1 ? 'border-b border-rule-soft' : '')
                }
              >
                <div>
                  <div className="font-serif text-base text-ink">{t.task}</div>
                  <div className="font-sans text-xs text-muted-soft">
                    {t.area}
                  </div>
                </div>
                <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
                  {CLEANING_FREQ_LABEL[t.frequency]}
                </div>
                <div className="font-serif italic text-xs text-muted">
                  {t.last_completed_at ? (
                    new Date(t.last_completed_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                    })
                  ) : (
                    'never'
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      setEditingId(t.id);
                    }}
                    disabled={pending}
                    className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-3 py-1.5 border border-rule text-muted hover:text-ink hover:border-gold transition-colors disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => archiveTask(t.id, t.task)}
                    disabled={pending}
                    className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-3 py-1.5 border border-rule text-muted hover:text-urgent hover:border-urgent transition-colors disabled:opacity-50"
                  >
                    Archive
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add task form */}
      <div className="bg-card border border-rule px-5 py-4">
        <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-3">
          Add a task
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr_140px_auto] gap-3">
          <div>
            <label className="block font-sans text-[10px] uppercase tracking-[0.18em] text-muted mb-1">
              Area
            </label>
            <input
              type="text"
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              placeholder="Kitchen"
              disabled={pending}
              className="w-full font-serif text-base text-ink bg-paper border border-rule px-3 py-2 focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-sans text-[10px] uppercase tracking-[0.18em] text-muted mb-1">
              Task
            </label>
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="What needs cleaning?"
              disabled={pending}
              className="w-full font-serif text-base text-ink bg-paper border border-rule px-3 py-2 focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-sans text-[10px] uppercase tracking-[0.18em] text-muted mb-1">
              Frequency
            </label>
            <select
              value={newFreq}
              onChange={(e) =>
                setNewFreq(e.target.value as CleaningTaskRow['frequency'])
              }
              disabled={pending}
              className="w-full font-serif text-base text-ink bg-paper border border-rule px-3 py-2 focus:border-gold focus:outline-none"
            >
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {CLEANING_FREQ_LABEL[f]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={addTask}
              disabled={pending}
              className="w-full md:w-auto font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2 bg-ink text-paper border border-ink hover:bg-gold hover:border-gold transition-colors disabled:opacity-50"
            >
              {pending ? 'Adding…' : 'Add task'}
            </button>
          </div>
        </div>
      </div>
      </>
      )}
    </section>
  );
}

function EditRow({
  task,
  onCancel,
  onSave,
  pending,
  isLast,
}: {
  task: CleaningTaskRow;
  onCancel: () => void;
  onSave: (patch: {
    area?: string;
    task?: string;
    frequency?: string;
  }) => void;
  pending: boolean;
  isLast: boolean;
}) {
  const [area, setArea] = useState(task.area);
  const [taskText, setTaskText] = useState(task.task);
  const [frequency, setFrequency] = useState<CleaningTaskRow['frequency']>(
    task.frequency,
  );

  return (
    <div
      className={
        'grid grid-cols-1 md:grid-cols-[1.6fr_1fr_100px_180px] gap-3 px-6 py-3 items-end bg-gold-bg/[0.4] ' +
        (isLast ? '' : 'border-b border-rule-soft')
      }
    >
      <div>
        <input
          type="text"
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          disabled={pending}
          className="w-full font-serif text-base text-ink bg-paper border border-rule px-3 py-1.5 focus:border-gold focus:outline-none mb-1"
        />
        <input
          type="text"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          disabled={pending}
          className="w-full font-sans text-xs text-muted bg-paper border border-rule px-3 py-1 focus:border-gold focus:outline-none"
        />
      </div>
      <div>
        <select
          value={frequency}
          onChange={(e) =>
            setFrequency(e.target.value as CleaningTaskRow['frequency'])
          }
          disabled={pending}
          className="w-full font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold bg-paper border border-rule px-3 py-1.5 focus:border-gold focus:outline-none"
        >
          {FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {CLEANING_FREQ_LABEL[f]}
            </option>
          ))}
        </select>
      </div>
      <div />
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() =>
            onSave({
              area: area !== task.area ? area : undefined,
              task: taskText !== task.task ? taskText : undefined,
              frequency: frequency !== task.frequency ? frequency : undefined,
            })
          }
          disabled={pending}
          className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-3 py-1.5 bg-gold text-paper hover:bg-gold-dark transition-colors disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-3 py-1.5 border border-rule text-muted hover:text-ink transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
