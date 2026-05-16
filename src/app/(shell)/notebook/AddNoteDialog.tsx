'use client';

import { useMemo, useState, useTransition } from 'react';
import { addNoteEntry } from './actions';
import { PhotoUpload } from '@/components/photo/PhotoUpload';

export type RecipeOption = {
  id: string;
  name: string;
  dish_type: string;
};

export function AddNoteDialog({
  defaultShared = true,
  recipeOptions = [],
  siteId,
}: {
  defaultShared?: boolean;
  recipeOptions?: RecipeOption[];
  siteId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [shared, setShared] = useState(defaultShared);
  const [linkedIds, setLinkedIds] = useState<string[]>([]);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [draftEntryId] = useState(() =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle('');
    setBody('');
    setShared(defaultShared);
    setLinkedIds([]);
    setRecipeSearch('');
    setPhotoUrl(null);
    setError(null);
  }

  const optionsById = useMemo(
    () => new Map(recipeOptions.map((r) => [r.id, r])),
    [recipeOptions],
  );

  const filteredOptions = useMemo(() => {
    const q = recipeSearch.trim().toLowerCase();
    return recipeOptions
      .filter((r) => !linkedIds.includes(r.id))
      .filter((r) => (q ? r.name.toLowerCase().includes(q) : true))
      .slice(0, 8);
  }, [recipeOptions, linkedIds, recipeSearch]);

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
        linkedRecipeIds: linkedIds,
        attachmentUrl: photoUrl,
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
              <h2 className="font-serif text-2xl font-normal leading-[1.1] tracking-[-0.015em] text-ink">
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

              {recipeOptions.length > 0 && (
                <Field label="Link to recipes / specs (optional)">
                  <div className="flex flex-col gap-2">
                    {linkedIds.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {linkedIds.map((rid) => {
                          const r = optionsById.get(rid);
                          if (!r) return null;
                          return (
                            <span
                              key={rid}
                              className="inline-flex items-center gap-1.5 font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-2 py-1 bg-gold-bg text-gold-dark border border-gold/40 rounded-sm"
                            >
                              {r.name}
                              <button
                                type="button"
                                onClick={() =>
                                  setLinkedIds((cur) =>
                                    cur.filter((id) => id !== rid),
                                  )
                                }
                                className="text-gold-dark hover:text-urgent transition-colors leading-none"
                                aria-label={`Unlink ${r.name}`}
                                title={`Unlink ${r.name}`}
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <input
                      type="text"
                      value={recipeSearch}
                      onChange={(e) => setRecipeSearch(e.target.value)}
                      placeholder="Search recipes and specs to link…"
                      className="w-full px-3 py-2 border border-rule bg-card font-serif text-sm text-ink focus:outline-none focus:border-gold"
                    />
                    {recipeSearch && filteredOptions.length > 0 && (
                      <div className="border border-rule bg-card max-h-[160px] overflow-y-auto">
                        {filteredOptions.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              setLinkedIds((cur) =>
                                cur.includes(r.id) ? cur : [...cur, r.id],
                              );
                              setRecipeSearch('');
                            }}
                            className="block w-full text-left px-3 py-2 font-serif text-sm text-ink hover:bg-paper-warm transition-colors border-b border-rule-soft last:border-b-0"
                          >
                            {r.name}
                            <span className="ml-2 font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted-soft">
                              {r.dish_type === 'food' ? 'dish' : r.dish_type}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </Field>
              )}

              {siteId && (
                <Field label="Photo (optional)">
                  <PhotoUpload
                    bucket="notebook-attachments"
                    sitePath={siteId}
                    contextId={draftEntryId}
                    initialUrl={photoUrl}
                    label=""
                    hint="JPG, PNG or WebP · up to 10MB"
                    onUploaded={(url) => setPhotoUrl(url)}
                    onRemoved={() => setPhotoUrl(null)}
                  />
                </Field>
              )}

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
      <span className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-muted">
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
