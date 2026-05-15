import { createSupabaseServerClient } from '@/lib/supabase/server';
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
