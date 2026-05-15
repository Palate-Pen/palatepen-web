'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateNoteAction,
  archiveNoteAction,
  linkRecipeAction,
  unlinkRecipeAction,
  addMenuTagAction,
  removeMenuTagAction,
} from '@/app/(shell)/notebook/edit-actions';
import type { NotebookDetailEntry } from '@/lib/notebook-detail';
import type {
  RecipeOption,
  MenuPlanOption,
} from '@/lib/notebook-detail';

type ShellKind = 'chef' | 'bar';

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function NoteDetailEditor({
  entry,
  recipes,
  menuPlans,
  shell,
}: {
  entry: NotebookDetailEntry;
  recipes: RecipeOption[];
  menuPlans: MenuPlanOption[];
  shell: ShellKind;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(entry.title);
  const [body, setBody] = useState(entry.body_md ?? '');
  const [shared, setShared] = useState(entry.shared);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const linkedIds = entry.linked_recipe_ids;
  const linkedRecipes = useMemo(
    () => recipes.filter((r) => linkedIds.includes(r.id)),
    [recipes, linkedIds],
  );
  const recipesForPicker = useMemo(
    () => recipes.filter((r) => !linkedIds.includes(r.id)),
    [recipes, linkedIds],
  );

  const menuTags = entry.tags.filter((t) => t.kind === 'menu');

  function saveTitleBody() {
    setError(null);
    startTransition(async () => {
      const res = await updateNoteAction({
        id: entry.id,
        title,
        body_md: body,
        shared,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedAt(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
      router.refresh();
    });
  }

  function archive() {
    if (!confirm('Archive this note? It will be hidden from the list.')) return;
    startTransition(async () => {
      const res = await archiveNoteAction(entry.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(shell === 'bar' ? '/bartender/notebook' : '/notebook');
    });
  }

  return (
    <>
      <div className="bg-card border border-rule mb-8">
        <div className="px-7 py-5 border-b border-rule">
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSavedAt(null);
            }}
            className="w-full font-display text-2xl font-medium tracking-[0.01em] text-ink bg-paper border border-rule px-4 py-2.5 focus:border-gold focus:outline-none"
          />
        </div>
        <div className="px-7 py-5">
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
            Body
          </label>
          <textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setSavedAt(null);
            }}
            rows={8}
            placeholder="Free-form. Markdown bold + italics are preserved on render."
            className="w-full font-serif text-base text-ink bg-paper border border-rule px-4 py-3 focus:border-gold focus:outline-none leading-relaxed"
          />
        </div>
        <div className="px-7 py-4 border-t border-rule flex items-center justify-between flex-wrap gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={shared}
              onChange={(e) => {
                setShared(e.target.checked);
                setSavedAt(null);
              }}
              className="w-4 h-4"
            />
            <span className="font-serif text-sm text-ink">
              Visible to the brigade
            </span>
          </label>
          <div className="flex items-center gap-3">
            {savedAt && (
              <span className="font-serif italic text-sm text-healthy">
                Saved at {savedAt}
              </span>
            )}
            {error && (
              <span className="font-serif italic text-sm text-urgent">
                {error}
              </span>
            )}
            <button
              type="button"
              onClick={saveTitleBody}
              disabled={pending}
              className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark disabled:opacity-50 transition-colors"
            >
              {pending ? 'Saving' + String.fromCharCode(0x2026) : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <RecipeTagSection
        noteId={entry.id}
        linkedRecipes={linkedRecipes}
        candidates={recipesForPicker}
        shell={shell}
      />

      <MenuTagSection
        noteId={entry.id}
        tags={menuTags}
        menuPlans={menuPlans}
      />

      {entry.attachment_url && (
        <section className="bg-card border border-rule px-7 py-5 mb-8">
          <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-3">
            Attachment
          </div>
          <a
            href={entry.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-serif italic text-sm text-gold hover:text-gold-dark"
          >
            Open attachment {String.fromCharCode(0x2192)}
          </a>
        </section>
      )}

      <section className="bg-card border border-rule px-7 py-5 mb-8 flex items-center justify-between gap-3 flex-wrap">
        <div className="font-serif italic text-sm text-muted">
          Created {dateFmt.format(new Date(entry.created_at))}
          {entry.updated_at !== entry.created_at && (
            <> {String.fromCharCode(0xb7)} edited {dateFmt.format(new Date(entry.updated_at))}</>
          )}
        </div>
        <button
          type="button"
          onClick={archive}
          disabled={pending}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 bg-transparent text-muted border border-rule hover:border-urgent hover:text-urgent disabled:opacity-50 transition-colors"
        >
          Archive note
        </button>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------
// Recipe link section
// ---------------------------------------------------------------------
function RecipeTagSection({
  noteId,
  linkedRecipes,
  candidates,
  shell,
}: {
  noteId: string;
  linkedRecipes: RecipeOption[];
  candidates: RecipeOption[];
  shell: ShellKind;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const recipeLabel = shell === 'bar' ? 'spec' : 'recipe';
  const recipeHrefBase = shell === 'bar' ? '/bartender/specs/' : '/recipes/';

  const filtered = useMemo(() => {
    if (filter.trim() === '') return candidates.slice(0, 20);
    const f = filter.toLowerCase();
    return candidates.filter((r) => r.name.toLowerCase().includes(f)).slice(0, 20);
  }, [candidates, filter]);

  function link(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await linkRecipeAction(noteId, id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setFilter('');
      setPickerOpen(false);
      router.refresh();
    });
  }

  function unlink(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await unlinkRecipeAction(noteId, id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="bg-card border border-rule mb-8">
      <div className="px-7 py-4 border-b border-rule flex items-center justify-between gap-3 flex-wrap">
        <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted">
          Linked {recipeLabel}s
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 bg-transparent text-gold border border-gold hover:bg-gold hover:text-paper transition-colors"
        >
          {pickerOpen ? 'Close' : '+ Add ' + recipeLabel}
        </button>
      </div>
      <div className="px-7 py-5">
        {linkedRecipes.length === 0 ? (
          <p className="font-serif italic text-sm text-muted">
            Not linked to any {recipeLabel}s yet. Tap + to attach this note to one or more.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {linkedRecipes.map((r) => (
              <div
                key={r.id}
                className="inline-flex items-center gap-2 bg-paper-warm border border-rule px-3 py-1.5"
              >
                <Link
                  href={recipeHrefBase + r.id}
                  className="font-serif font-semibold text-sm text-ink hover:text-gold"
                >
                  {r.name}
                </Link>
                <button
                  type="button"
                  onClick={() => unlink(r.id)}
                  disabled={pending}
                  aria-label="Unlink"
                  className="font-display text-xs text-muted hover:text-urgent leading-none"
                >
                  {String.fromCharCode(0xd7)}
                </button>
              </div>
            ))}
          </div>
        )}
        {pickerOpen && (
          <div className="mt-5 pt-5 border-t border-rule">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              autoFocus
              placeholder={'search ' + recipeLabel + 's...'}
              className="w-full px-3 py-2 mb-3 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
            />
            <div className="max-h-[280px] overflow-y-auto border border-rule">
              {filtered.length === 0 ? (
                <div className="px-4 py-3 font-serif italic text-sm text-muted">
                  No {recipeLabel}s match. Try a different search.
                </div>
              ) : (
                filtered.map((r, i) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => link(r.id)}
                    disabled={pending}
                    className={
                      'w-full text-left px-4 py-2.5 hover:bg-paper-warm flex items-center justify-between gap-3 disabled:opacity-50 ' +
                      (i < filtered.length - 1 ? 'border-b border-rule-soft' : '')
                    }
                  >
                    <span className="font-serif font-semibold text-sm text-ink">
                      {r.name}
                    </span>
                    {r.category && (
                      <span className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-muted">
                        {r.category}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
        {error && (
          <p className="font-serif italic text-sm text-urgent mt-3">{error}</p>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// Menu tag section
// ---------------------------------------------------------------------
function MenuTagSection({
  noteId,
  tags,
  menuPlans,
}: {
  noteId: string;
  tags: Array<{ text?: string; plan_id?: string }>;
  menuPlans: MenuPlanOption[];
}) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [freeText, setFreeText] = useState('');
  const [error, setError] = useState<string | null>(null);

  function addPlan(plan: MenuPlanOption) {
    setError(null);
    startTransition(async () => {
      const res = await addMenuTagAction({
        noteId,
        text: plan.name,
        plan_id: plan.id,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPickerOpen(false);
      router.refresh();
    });
  }

  function addFree() {
    setError(null);
    if (freeText.trim() === '') return;
    startTransition(async () => {
      const res = await addMenuTagAction({ noteId, text: freeText });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setFreeText('');
      setPickerOpen(false);
      router.refresh();
    });
  }

  function remove(text: string) {
    setError(null);
    startTransition(async () => {
      const res = await removeMenuTagAction(noteId, text);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="bg-card border border-rule mb-8">
      <div className="px-7 py-4 border-b border-rule flex items-center justify-between gap-3 flex-wrap">
        <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted">
          Menu tags
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 bg-transparent text-gold border border-gold hover:bg-gold hover:text-paper transition-colors"
        >
          {pickerOpen ? 'Close' : '+ Tag menu'}
        </button>
      </div>
      <div className="px-7 py-5">
        {tags.length === 0 ? (
          <p className="font-serif italic text-sm text-muted">
            Not tagged to any menu. Pick from your menu plans below or type a free-form name.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((t, i) => (
              <div
                key={(t.text ?? '') + ':' + i}
                className="inline-flex items-center gap-2 bg-gold-bg border border-gold/40 px-3 py-1.5"
              >
                <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold-dark">
                  {t.text}
                </span>
                <button
                  type="button"
                  onClick={() => remove(t.text ?? '')}
                  disabled={pending}
                  aria-label="Remove tag"
                  className="font-display text-xs text-gold-dark hover:text-urgent leading-none"
                >
                  {String.fromCharCode(0xd7)}
                </button>
              </div>
            ))}
          </div>
        )}
        {pickerOpen && (
          <div className="mt-5 pt-5 border-t border-rule space-y-5">
            {menuPlans.length > 0 && (
              <div>
                <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-3">
                  Active menu plans
                </div>
                <div className="flex flex-wrap gap-2">
                  {menuPlans.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addPlan(p)}
                      disabled={pending}
                      className="inline-flex items-center gap-2 bg-paper-warm border border-rule px-3 py-1.5 hover:border-gold hover:bg-gold-bg disabled:opacity-50 transition-colors"
                    >
                      <span className="font-serif font-semibold text-sm text-ink">
                        {p.name}
                      </span>
                      {p.launch_date && (
                        <span className="font-serif italic text-xs text-muted">
                          launches {new Date(p.launch_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-3">
                Or type a menu name
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  placeholder="e.g. Summer 2026, Tasting £85"
                  className="flex-1 px-3 py-2 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addFree}
                  disabled={pending || freeText.trim() === ''}
                  className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 bg-gold text-paper border border-gold hover:bg-gold-dark disabled:opacity-50 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
        {error && (
          <p className="font-serif italic text-sm text-urgent mt-3">{error}</p>
        )}
      </div>
    </section>
  );
}
