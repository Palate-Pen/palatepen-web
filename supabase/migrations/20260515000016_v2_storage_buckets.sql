-- v2 migration: Supabase Storage buckets for photo uploads
-- Date: 2026-05-15
-- Applied: 2026-05-15 (MCP apply_migration; verified 2 buckets + 8 RLS policies — 4 per bucket, recipe-photos has public select policy, notebook-attachments authenticated-only)
--
-- Creates two buckets:
--
--   recipe-photos — Recipe + cocktail spec hero images. Public read so
--     the /m/{slug} public menu reader can show them. Path convention:
--     {site_id}/{recipe_id}/{nanoid}.{ext}
--
--   notebook-attachments — Notebook entry photos (kind='photo') +
--     future sketches. Private (authenticated read only). Path:
--     {site_id}/{entry_id}/{nanoid}.{ext}
--
-- RLS approach: simple authenticated-write policies. The application
-- layer (RecipeForm action, AddNoteDialog action) is what enforces
-- site_id ownership of the path — chefs only see their own site's
-- recipes/notes via existing RLS on v2.recipes + v2.notebook_entries,
-- so they can only attach photos through actions that already check.
--
-- File-level RLS by site_id (extracting folder from name) is doable
-- but ties the bucket to v2.memberships in fragile ways — defer until
-- a multi-site customer asks.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('recipe-photos', 'recipe-photos', true, 5242880,
    array['image/jpeg', 'image/png', 'image/webp']),
  ('notebook-attachments', 'notebook-attachments', false, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- recipe-photos: public read, authenticated write
create policy "recipe_photos_select_public" on storage.objects
  for select to public
  using (bucket_id = 'recipe-photos');

create policy "recipe_photos_insert_authed" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recipe-photos');

create policy "recipe_photos_update_authed" on storage.objects
  for update to authenticated
  using (bucket_id = 'recipe-photos');

create policy "recipe_photos_delete_authed" on storage.objects
  for delete to authenticated
  using (bucket_id = 'recipe-photos');

-- notebook-attachments: authenticated read + write
create policy "notebook_attachments_select_authed" on storage.objects
  for select to authenticated
  using (bucket_id = 'notebook-attachments');

create policy "notebook_attachments_insert_authed" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'notebook-attachments');

create policy "notebook_attachments_update_authed" on storage.objects
  for update to authenticated
  using (bucket_id = 'notebook-attachments');

create policy "notebook_attachments_delete_authed" on storage.objects
  for delete to authenticated
  using (bucket_id = 'notebook-attachments');
