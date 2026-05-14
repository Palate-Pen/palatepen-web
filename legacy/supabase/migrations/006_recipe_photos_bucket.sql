-- Recipe photo uploads via Supabase Storage.
-- Bucket: recipe-photos (public read, owner-only write).
-- Path scheme: {auth.uid()}/{recipe_id}-{timestamp}.jpg

insert into storage.buckets (id, name, public)
values ('recipe-photos', 'recipe-photos', true)
on conflict (id) do update set public = true;

-- Drop existing policies so this script is idempotent on re-runs
drop policy if exists "Public read recipe photos"        on storage.objects;
drop policy if exists "User can upload recipe photos"    on storage.objects;
drop policy if exists "User can update own recipe photos" on storage.objects;
drop policy if exists "User can delete own recipe photos" on storage.objects;

-- Anyone (including signed-out) can read photos by their public URL
create policy "Public read recipe photos"
  on storage.objects for select
  using (bucket_id = 'recipe-photos');

-- Authenticated users can write only inside a folder named with their own auth.uid()
create policy "User can upload recipe photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'recipe-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "User can update own recipe photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'recipe-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "User can delete own recipe photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'recipe-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
