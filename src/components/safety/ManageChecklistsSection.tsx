'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setOpeningCheckGroupsAction } from '@/lib/safety/actions';
import type { OpeningCheckGroup } from '@/lib/safety/standards';
import {
  DEPARTMENT_LABEL,
} from '@/lib/safety/checklists';

/**
 * Manage Opening Checks — chef-editable checklist per department.
 *
 * Hidden behind a toggle at the top of /safety. Expands into one
 * panel per department (Kitchen / Bar / Management) with editable
 * blurb + question list + add/remove rows. Save fires
 * setOpeningCheckGroupsAction which atomically replaces the
 * accounts.preferences.opening_check_groups config.
 *
 * Authorisation lives on the action (owner/manager). The button
 * always renders — chefs without permission will see the error inline
 * if they try to save.
 */
export function ManageChecklistsSection({
  accountId,
  groups,
}: {
  accountId: string;
  groups: OpeningCheckGroup[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [draft, setDraft] = useState<OpeningCheckGroup[]>(() => clone(groups));

  function reset() {
    setError(null);
    setInfo(null);
  }

  function updateBlurb(deptIndex: number, blurb: string) {
    setDraft((prev) => {
      const next = clone(prev);
      next[deptIndex].blurb = blurb;
      return next;
    });
  }

  function updateQuestion(
    deptIndex: number,
    qIndex: number,
    patch: Partial<{ label: string; detail: string }>,
  ) {
    setDraft((prev) => {
      const next = clone(prev);
      const q = next[deptIndex].questions[qIndex];
      if (patch.label !== undefined) q.label = patch.label;
      if (patch.detail !== undefined) q.detail = patch.detail;
      return next;
    });
  }

  function removeQuestion(deptIndex: number, qIndex: number) {
    setDraft((prev) => {
      const next = clone(prev);
      next[deptIndex].questions.splice(qIndex, 1);
      return next;
    });
  }

  function addQuestion(deptIndex: number) {
    setDraft((prev) => {
      const next = clone(prev);
      next[deptIndex].questions.push({
        key: 'q_' + randomShortId(),
        label: '',
        detail: '',
      });
      return next;
    });
  }

  function resetToOriginal() {
    if (
      !confirm(
        'Discard your edits and reset to the last saved configuration?',
      )
    )
      return;
    reset();
    setDraft(clone(groups));
    setInfo('Reset to saved configuration.');
  }

  function save() {
    reset();
    startTransition(async () => {
      const res = await setOpeningCheckGroupsAction({
        accountId,
        groups: draft.map((g) => ({
          department: g.department,
          label: g.label,
          blurb: g.blurb,
          questions: g.questions.map((q) => ({
            key: q.key,
            label: q.label.trim(),
            detail: q.detail.trim(),
          })),
        })),
      });
      if (!res.ok) {
        setError(res.error ?? 'Could not save checklists.');
        return;
      }
      setInfo('Saved.');
      router.refresh();
    });
  }

  // Track if there are unsaved edits — used to nudge the user.
  const dirty = JSON.stringify(draft) !== JSON.stringify(groups);

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
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          {open ? 'Close manage checklists' : 'Manage checklists'}
        </button>
        <span className="font-serif italic text-sm text-muted">
          {flatCount(groups)} question{flatCount(groups) === 1 ? '' : 's'} across {groups.length} departments
        </span>
      </div>

      {!open ? null : (
        <div className="bg-card border border-rule">
          {(error || info) && (
            <div
              className={
                'px-5 py-3 font-serif italic text-sm border-b border-rule ' +
                (error
                  ? 'bg-urgent/[0.05] text-urgent'
                  : 'bg-healthy/[0.05] text-healthy')
              }
            >
              {error ?? info}
            </div>
          )}

          {draft.map((g, gi) => (
            <div
              key={g.department}
              className="px-6 py-5 border-b border-rule last:border-b-0"
            >
              <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
                <div className="font-display font-semibold text-[12px] tracking-[0.25em] uppercase text-gold">
                  {DEPARTMENT_LABEL[g.department]}
                </div>
                <div className="font-sans text-xs text-muted">
                  {g.questions.length} question
                  {g.questions.length === 1 ? '' : 's'}
                </div>
              </div>
              <input
                type="text"
                value={g.blurb}
                onChange={(e) => updateBlurb(gi, e.target.value)}
                placeholder="Department description (optional)"
                disabled={pending}
                className="w-full font-serif italic text-sm text-muted bg-paper border border-rule px-3 py-1.5 mb-4 focus:border-gold focus:outline-none"
              />

              <div className="space-y-2">
                {g.questions.map((q, qi) => (
                  <div
                    key={q.key}
                    className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr_auto] gap-2 items-start"
                  >
                    <input
                      type="text"
                      value={q.label}
                      onChange={(e) =>
                        updateQuestion(gi, qi, { label: e.target.value })
                      }
                      placeholder="Question label"
                      disabled={pending}
                      className="font-serif text-sm text-ink bg-paper border border-rule px-3 py-1.5 focus:border-gold focus:outline-none"
                    />
                    <input
                      type="text"
                      value={q.detail}
                      onChange={(e) =>
                        updateQuestion(gi, qi, { detail: e.target.value })
                      }
                      placeholder="Detail / what to check"
                      disabled={pending}
                      className="font-sans text-xs text-muted bg-paper border border-rule px-3 py-1.5 focus:border-gold focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeQuestion(gi, qi)}
                      disabled={pending}
                      title="Remove question"
                      className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-3 py-1.5 border border-rule text-muted hover:text-urgent hover:border-urgent transition-colors disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => addQuestion(gi)}
                disabled={pending}
                className="mt-3 font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-3 py-1.5 border border-dashed border-rule text-muted hover:text-gold hover:border-gold transition-colors disabled:opacity-50"
              >
                + Add question
              </button>
            </div>
          ))}

          <div className="px-6 py-4 bg-paper-warm border-t border-rule flex items-center justify-between gap-3 flex-wrap">
            <div className="font-serif italic text-sm text-muted">
              {dirty ? 'Unsaved edits — save to publish.' : 'No unsaved changes.'}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetToOriginal}
                disabled={pending || !dirty}
                className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-4 py-2 border border-rule text-muted hover:text-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending || !dirty}
                className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-4 py-2 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {pending ? 'Saving…' : 'Save checklists'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function clone(groups: OpeningCheckGroup[]): OpeningCheckGroup[] {
  return groups.map((g) => ({
    ...g,
    questions: g.questions.map((q) => ({ ...q })),
  }));
}

function flatCount(groups: OpeningCheckGroup[]): number {
  return groups.reduce((acc, g) => acc + g.questions.length, 0);
}

function randomShortId(): string {
  // Avoid collision with default keys like 'fridge_temps'. 8 hex chars
  // is plenty for one account's checklist scale.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(16).slice(2, 10);
}
