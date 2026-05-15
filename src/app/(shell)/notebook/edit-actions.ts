'use server';

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
