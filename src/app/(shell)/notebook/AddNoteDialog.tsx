'use client';

import { useState, useTransition } from 'react';
import { addNoteEntry } from './actions';

export function AddNoteDialog({
  defaultShared = true,
}: {
  defaultShared?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [shared, setShared] = useState(defaultShared);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle('');
    setBody('');
    setShared(defaultShared);
    setError(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function submit() {
    if (pending) return;
    setError(null);
    const t = title.trim();
    if (!t) {
      setError('Give the note a one-line title.');
      return;
    }
    startTransition(async () => {
      const res = await addNoteEntry({
        title: t,
        body_md: body,
        shared,
      });
      if (!res.ok) {
        setError(humaniseError(res.error));
        return;
      }
      close();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-col items-center gap-1.5 px-4 py-3 border transition-colors bg-card border-rule text-ink-soft hover:border-gold hover:text-gold"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 3H6v18h12V7l-4-4z" />
          <path d="M14 3v4h4" />
          <path d="M9 11h6M9 14h6M9 17h4" />
        </svg>
        <span className="font-sans font-semibold text-xs tracking-[0.08em] uppercase">
          Note
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink/40">
          <div
            className="absolute inset-0"
            onClick={close}
            aria-hidden="true"
          />
          <div className="relative bg-paper border border-rule shadow-[0_24px_60px_rgba(26,22,18,0.18)] max-w-[560px] w-full max-h-[90vh] overflow-y-auto">
            <div className="px-7 pt-6 pb-3 border-b border-rule">
              <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold mb-2">
                New note
              </div>
              <h2 className="font-display text-2xl font-semibold uppercase tracking-[0.04em] text-ink">
                Capture a thought
              </h2>
            </div>

            <div className="px-7 py-6 flex flex-col gap-4">
              <Field label="Title">
                <input
                  autoFocus
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Hummus thinning idea, Brigade feedback, Summer menu list"
                  className="w-full px-3 py-2 border border-rule bg-card font-serif font-semibold text-base text-ink focus:outline-none focus:border-gold"
                  maxLength={120}
                />
              </Field>

              <Field label="Body (optional)">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                  placeholder="What's the thought? Detail, context, what to try next."
                  className="w-full px-3 py-2 border border-rule bg-card font-serif italic text-sm text-ink-soft leading-relaxed resize-y min-h-[120px] focus:outline-none focus:border-gold"
                  maxLength={4000}
                />
              </Field>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={shared}
                  onChange={(e) => setShared(e.target.checked)}
                  className="accent-gold w-4 h-4"
                />
                <div>
                  <div className="font-serif text-sm text-ink">
                    Share with brigade
                  </div>
                  <div className="font-serif italic text-xs text-muted">
                    {shared
                      ? 'visible to your team'
                      : 'private to you'}
                  </div>
                </div>
              </label>

              {error && (
                <div className="bg-card border border-l-4 border-l-urgent border-rule px-4 py-3 font-serif italic text-sm text-ink-soft">
                  {error}
                </div>
              )}
            </div>

            <div className="px-7 pb-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-transparent text-muted border border-rule hover:border-gold hover:text-gold transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {pending ? 'Saving…' : 'Save note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function humaniseError(code: string): string {
  switch (code) {
    case 'title_required':
      return 'Give the note a one-line title.';
    case 'no_membership':
      return 'No site membership — try signing back in.';
    case 'insert_failed':
      return "The system couldn't save that. Try again.";
    default:
      return code;
  }
}
