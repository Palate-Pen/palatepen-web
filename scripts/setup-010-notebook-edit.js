/* eslint-disable no-console */
/*
 * setup-010-notebook-edit.js
 *
 * Notebook edit + tag-to-recipe + tag-to-menu mega-batch:
 *
 *   src/components/notebook/NoteDetailEditor.tsx
 *      Single shared client editor — used by chef + bar detail pages.
 *      Edits title, body, archived flag, linked recipe ids, menu tags.
 *
 *   src/app/(shell)/notebook/[id]/page.tsx
 *   src/app/bartender/notebook/[id]/page.tsx
 *      Server detail pages that load the entry + the relevant recipe/menu
 *      pickers and render NoteDetailEditor.
 *
 *   src/lib/notebook-detail.ts
 *      getNotebookEntry(id, siteId) + getMenuPlanOptions(siteId) +
 *      getRecipeOptions(siteId, dishType).
 *
 *   src/app/(shell)/notebook/edit-actions.ts
 *      updateNoteAction, archiveNoteAction, linkRecipeAction,
 *      unlinkRecipeAction, addMenuTagAction, removeMenuTagAction.
 *
 * Run: node scripts/setup-010-notebook-edit.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function write(rel, body) {
  const out = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, body, { encoding: 'utf8' });
  console.log('wrote', out);
}

// ---------------------------------------------------------------------
// src/lib/notebook-detail.ts
// ---------------------------------------------------------------------
const detailLib = `import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { NotebookTag } from '@/lib/notebook-shared';

export type NotebookDetailEntry = {
  id: string;
  site_id: string;
  kind: string;
  title: string;
  body_md: string | null;
  attachment_url: string | null;
  voice_duration_seconds: number | null;
  tags: NotebookTag[];
  linked_recipe_ids: string[];
  season_label: string | null;
  season_tone: string | null;
  shared: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getNotebookEntry(
  id: string,
  siteId: string,
): Promise<NotebookDetailEntry | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('notebook_entries')
    .select(
      'id, site_id, kind, title, body_md, attachment_url, voice_duration_seconds, tags, linked_recipe_ids, season_label, season_tone, shared, archived_at, created_at, updated_at',
    )
    .eq('id', id)
    .eq('site_id', siteId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id as string,
    site_id: data.site_id as string,
    kind: data.kind as string,
    title: (data.title as string | null) ?? '',
    body_md: (data.body_md as string | null) ?? null,
    attachment_url: (data.attachment_url as string | null) ?? null,
    voice_duration_seconds:
      (data.voice_duration_seconds as number | null) ?? null,
    tags: Array.isArray(data.tags) ? (data.tags as NotebookTag[]) : [],
    linked_recipe_ids: Array.isArray(data.linked_recipe_ids)
      ? (data.linked_recipe_ids as string[])
      : [],
    season_label: (data.season_label as string | null) ?? null,
    season_tone: (data.season_tone as string | null) ?? null,
    shared: Boolean(data.shared),
    archived_at: (data.archived_at as string | null) ?? null,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  };
}

export type RecipeOption = {
  id: string;
  name: string;
  category: string | null;
  dish_type: string;
};

export async function getRecipeOptions(
  siteId: string,
  dishType: 'food' | 'bar' | 'all' = 'all',
): Promise<RecipeOption[]> {
  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from('recipes')
    .select('id, name, category, dish_type')
    .eq('site_id', siteId)
    .is('archived_at', null)
    .order('name', { ascending: true });
  if (dishType === 'food') q = q.eq('dish_type', 'food');
  else if (dishType === 'bar') q = q.eq('dish_type', 'bar');
  const { data } = await q;
  return ((data ?? []) as unknown as Array<{
    id: string;
    name: string;
    category: string | null;
    dish_type: string;
  }>).map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category ?? null,
    dish_type: r.dish_type,
  }));
}

export type MenuPlanOption = {
  id: string;
  name: string;
  launch_date: string | null;
  status: string;
};

export async function getMenuPlanOptions(
  siteId: string,
): Promise<MenuPlanOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('menu_plans')
    .select('id, name, launch_date, status')
    .eq('site_id', siteId)
    .order('launch_date', { ascending: true, nullsFirst: false });
  return ((data ?? []) as unknown as Array<{
    id: string;
    name: string;
    launch_date: string | null;
    status: string;
  }>).map((p) => ({
    id: p.id,
    name: p.name,
    launch_date: p.launch_date,
    status: p.status,
  }));
}
`;

// ---------------------------------------------------------------------
// src/app/(shell)/notebook/edit-actions.ts
// ---------------------------------------------------------------------
const editActions = `'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { NotebookTag } from '@/lib/notebook-shared';

type ActionResult = { ok: true } | { ok: false; error: string };

async function getMembership() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  const { data: m } = await supabase
    .from('memberships')
    .select('site_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  return { supabase, user, membership: m };
}

function revalidateBoth(id: string) {
  revalidatePath('/notebook');
  revalidatePath('/notebook/' + id);
  revalidatePath('/bartender/notebook');
  revalidatePath('/bartender/notebook/' + id);
}

/** Update title + body. Tags + linked recipes have their own actions
 *  for finer-grained UX (so editing the title doesn't trigger a full
 *  matrix re-render). */
export async function updateNoteAction(input: {
  id: string;
  title: string;
  body_md: string | null;
  shared: boolean;
}): Promise<ActionResult> {
  const { supabase, membership } = await getMembership();
  if (!membership) return { ok: false, error: 'No site membership' };
  if (input.title.trim() === '') {
    return { ok: false, error: 'Title is required' };
  }
  const { error } = await supabase
    .from('notebook_entries')
    .update({
      title: input.title.trim(),
      body_md: input.body_md?.trim() ? input.body_md.trim() : null,
      shared: input.shared,
    })
    .eq('id', input.id)
    .eq('site_id', membership.site_id);
  if (error) return { ok: false, error: error.message };
  revalidateBoth(input.id);
  return { ok: true };
}

/** Archive (soft delete). */
export async function archiveNoteAction(id: string): Promise<ActionResult> {
  const { supabase, membership } = await getMembership();
  if (!membership) return { ok: false, error: 'No site membership' };
  const { error } = await supabase
    .from('notebook_entries')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .eq('site_id', membership.site_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/notebook');
  revalidatePath('/bartender/notebook');
  return { ok: true };
}

/** Link a recipe to a notebook entry. Idempotent (no duplicates). */
export async function linkRecipeAction(
  noteId: string,
  recipeId: string,
): Promise<ActionResult> {
  const { supabase, membership } = await getMembership();
  if (!membership) return { ok: false, error: 'No site membership' };

  const { data: cur } = await supabase
    .from('notebook_entries')
    .select('linked_recipe_ids')
    .eq('id', noteId)
    .eq('site_id', membership.site_id)
    .maybeSingle();
  if (!cur) return { ok: false, error: 'Note not found' };

  const list = Array.isArray(cur.linked_recipe_ids)
    ? (cur.linked_recipe_ids as string[])
    : [];
  if (list.includes(recipeId)) return { ok: true };

  const { error } = await supabase
    .from('notebook_entries')
    .update({ linked_recipe_ids: [...list, recipeId] })
    .eq('id', noteId)
    .eq('site_id', membership.site_id);
  if (error) return { ok: false, error: error.message };

  revalidateBoth(noteId);
  revalidatePath('/recipes/' + recipeId);
  revalidatePath('/bartender/specs/' + recipeId);
  return { ok: true };
}

export async function unlinkRecipeAction(
  noteId: string,
  recipeId: string,
): Promise<ActionResult> {
  const { supabase, membership } = await getMembership();
  if (!membership) return { ok: false, error: 'No site membership' };

  const { data: cur } = await supabase
    .from('notebook_entries')
    .select('linked_recipe_ids')
    .eq('id', noteId)
    .eq('site_id', membership.site_id)
    .maybeSingle();
  if (!cur) return { ok: false, error: 'Note not found' };

  const list = Array.isArray(cur.linked_recipe_ids)
    ? (cur.linked_recipe_ids as string[])
    : [];
  const next = list.filter((x) => x !== recipeId);

  const { error } = await supabase
    .from('notebook_entries')
    .update({ linked_recipe_ids: next })
    .eq('id', noteId)
    .eq('site_id', membership.site_id);
  if (error) return { ok: false, error: error.message };

  revalidateBoth(noteId);
  revalidatePath('/recipes/' + recipeId);
  revalidatePath('/bartender/specs/' + recipeId);
  return { ok: true };
}

/** Add a 'menu' kind tag. The text + optional plan_id ride inside the
 *  notebook_entries.tags JSONB array. */
export async function addMenuTagAction(input: {
  noteId: string;
  text: string;
  plan_id?: string | null;
}): Promise<ActionResult> {
  const { supabase, membership } = await getMembership();
  if (!membership) return { ok: false, error: 'No site membership' };
  const text = input.text.trim();
  if (!text) return { ok: false, error: 'Menu name is required' };

  const { data: cur } = await supabase
    .from('notebook_entries')
    .select('tags')
    .eq('id', input.noteId)
    .eq('site_id', membership.site_id)
    .maybeSingle();
  if (!cur) return { ok: false, error: 'Note not found' };

  const tags = (Array.isArray(cur.tags) ? cur.tags : []) as NotebookTag[];
  const exists = tags.some(
    (t) => t.kind === 'menu' && (t.text ?? '').toLowerCase() === text.toLowerCase(),
  );
  if (exists) return { ok: true };

  const newTag: NotebookTag = {
    kind: 'menu' as NotebookTag['kind'],
    text,
  };
  // Stash plan_id alongside the tag for the picker round-trip.
  if (input.plan_id) {
    (newTag as unknown as Record<string, unknown>).plan_id = input.plan_id;
  }

  const { error } = await supabase
    .from('notebook_entries')
    .update({ tags: [...tags, newTag] })
    .eq('id', input.noteId)
    .eq('site_id', membership.site_id);
  if (error) return { ok: false, error: error.message };

  revalidateBoth(input.noteId);
  return { ok: true };
}

export async function removeMenuTagAction(
  noteId: string,
  tagText: string,
): Promise<ActionResult> {
  const { supabase, membership } = await getMembership();
  if (!membership) return { ok: false, error: 'No site membership' };

  const { data: cur } = await supabase
    .from('notebook_entries')
    .select('tags')
    .eq('id', noteId)
    .eq('site_id', membership.site_id)
    .maybeSingle();
  if (!cur) return { ok: false, error: 'Note not found' };

  const tags = (Array.isArray(cur.tags) ? cur.tags : []) as NotebookTag[];
  const next = tags.filter(
    (t) => !(t.kind === 'menu' && (t.text ?? '') === tagText),
  );

  const { error } = await supabase
    .from('notebook_entries')
    .update({ tags: next })
    .eq('id', noteId)
    .eq('site_id', membership.site_id);
  if (error) return { ok: false, error: error.message };

  revalidateBoth(noteId);
  return { ok: true };
}
`;

// ---------------------------------------------------------------------
// src/components/notebook/NoteDetailEditor.tsx
// ---------------------------------------------------------------------
const editor = `'use client';

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
`;

// ---------------------------------------------------------------------
// /notebook/[id]/page.tsx — chef detail
// ---------------------------------------------------------------------
const chefDetail = `import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getShellContext } from '@/lib/shell/context';
import {
  getNotebookEntry,
  getRecipeOptions,
  getMenuPlanOptions,
} from '@/lib/notebook-detail';
import { NoteDetailEditor } from '@/components/notebook/NoteDetailEditor';

export const metadata = { title: 'Note \\u00b7 Notebook \\u00b7 Palatable' };

export default async function ChefNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getShellContext();
  const entry = await getNotebookEntry(id, ctx.siteId);
  if (!entry) notFound();
  const [recipes, menuPlans] = await Promise.all([
    getRecipeOptions(ctx.siteId, 'food'),
    getMenuPlanOptions(ctx.siteId),
  ]);

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <Link
        href="/notebook"
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
      >
        {String.fromCharCode(0x2190)} Notebook
      </Link>

      <div className="mt-4 mb-8">
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
          Notebook \\u00b7 Note
        </div>
        <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
          {entry.title || 'Untitled'}
        </h1>
      </div>

      <NoteDetailEditor
        entry={entry}
        recipes={recipes}
        menuPlans={menuPlans}
        shell="chef"
      />
    </div>
  );
}
`;

// ---------------------------------------------------------------------
// /bartender/notebook/[id]/page.tsx — bar detail
// ---------------------------------------------------------------------
const barDetail = `import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getShellContext } from '@/lib/shell/context';
import {
  getNotebookEntry,
  getRecipeOptions,
  getMenuPlanOptions,
} from '@/lib/notebook-detail';
import { NoteDetailEditor } from '@/components/notebook/NoteDetailEditor';

export const metadata = { title: 'Note \\u00b7 Bar Notebook \\u00b7 Palatable' };

export default async function BarNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getShellContext();
  const entry = await getNotebookEntry(id, ctx.siteId);
  if (!entry) notFound();
  const [recipes, menuPlans] = await Promise.all([
    getRecipeOptions(ctx.siteId, 'bar'),
    getMenuPlanOptions(ctx.siteId),
  ]);

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <Link
        href="/bartender/notebook"
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
      >
        {String.fromCharCode(0x2190)} Bar Notebook
      </Link>

      <div className="mt-4 mb-8">
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
          Bar Notebook \\u00b7 Build / Note
        </div>
        <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
          {entry.title || 'Untitled'}
        </h1>
      </div>

      <NoteDetailEditor
        entry={entry}
        recipes={recipes}
        menuPlans={menuPlans}
        shell="bar"
      />
    </div>
  );
}
`;

write('src/lib/notebook-detail.ts', detailLib);
write('src/app/(shell)/notebook/edit-actions.ts', editActions);
write('src/components/notebook/NoteDetailEditor.tsx', editor);
write('src/app/(shell)/notebook/[id]/page.tsx', chefDetail);
write('src/app/bartender/notebook/[id]/page.tsx', barDetail);

console.log('\ndone');
