'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { NotebookTag } from '@/lib/notebook';

type ActionResult = { ok: true; id: string } | { ok: false; error: string };

const TAG_RE = /[#@]?[a-zA-Z][a-zA-Z0-9-]+/g;

/**
 * Create a text-only Notebook note. First-pass capture path —
 * voice / photo / sketch capture lands once the Storage bucket is
 * wired and their dedicated client components are built.
 *
 * Tags are auto-extracted lightly from the body (any space-separated
 * word longer than 3 chars that looks like a tag — chef references
 * dishes inline). Detected vs plain isn't classified yet; everything
 * the auto-extractor finds is marked 'plain' for now.
 */
export async function addNoteEntry(input: {
  title: string;
  body_md: string;
  shared: boolean;
}): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id, role')
    .eq('user_id', user.id)
    .limit(1);
  const membership = memberships?.[0];
  if (!membership) return { ok: false, error: 'no_membership' };

  const title = input.title.trim();
  if (!title) return { ok: false, error: 'title_required' };
  const body = input.body_md.trim();

  const tags: NotebookTag[] = extractTags(`${title} ${body}`);

  const { data, error } = await supabase
    .from('notebook_entries')
    .insert({
      site_id: membership.site_id as string,
      authored_by: user.id,
      kind: 'note',
      title,
      body_md: body || null,
      tags: tags as unknown as object,
      shared: input.shared,
    })
    .select('id')
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? 'insert_failed' };
  }

  revalidatePath('/notebook');
  return { ok: true, id: data.id as string };
}

export async function archiveNotebookEntry(
  id: string,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { error } = await supabase
    .from('notebook_entries')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/notebook');
  return { ok: true, id };
}

function extractTags(text: string): NotebookTag[] {
  const seen = new Set<string>();
  const out: NotebookTag[] = [];
  const matches = text.match(TAG_RE) ?? [];
  for (const raw of matches) {
    const clean = raw.replace(/^[#@]/, '').toLowerCase();
    if (clean.length <= 3) continue;
    if (STOP_WORDS.has(clean)) continue;
    if (seen.has(clean)) continue;
    seen.add(clean);
    out.push({ kind: 'plain', text: clean });
    if (out.length >= 6) break;
  }
  return out;
}

const STOP_WORDS = new Set([
  'with',
  'from',
  'into',
  'over',
  'when',
  'then',
  'that',
  'this',
  'their',
  'they',
  'them',
  'there',
  'where',
  'have',
  'will',
  'just',
  'about',
  'after',
  'before',
  'because',
  'should',
  'could',
  'would',
  'today',
  'tomorrow',
  'yesterday',
]);
