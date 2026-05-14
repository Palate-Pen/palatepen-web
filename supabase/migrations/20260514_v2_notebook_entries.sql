-- v2 migration: notebook_entries — where the kitchen's thinking lives
-- Date: 2026-05-14
-- Applied: 2026-05-14 (run via MCP apply_migration; jack@ site seeded with 8 entries — 2 each of voice/photo/sketch/note — verified via count query)
--
-- One row per notebook capture. The Notebook surface is the chef's
-- workshop — voice memos in service, photos of pass plating, sketches
-- of new dish ideas, free-form notes. The system reads everything that
-- lands here, detects ingredients and seasonal threads, and feeds the
-- Looking Ahead detector for the notebook surface.
--
-- kinds (per design system v8 + the locked notebook mockup):
--   note     free-form text written via the dialog
--   voice    audio recorded via MediaRecorder; transcript lives in body_md
--   photo    image of a dish, supplier, or whiteboard
--   sketch   chef-drawn plating or technique notes (PNG)
--
-- attachment_url is a relative path inside the future 'notebook-media'
-- Storage bucket. For 'note' kind it's always null. For voice/photo/
-- sketch, the path resolves to a signed URL at render time. This first
-- migration ships the schema only — the bucket gets configured + the
-- capture UI for voice/photo/sketch lands in a follow-up.
--
-- tags is a JSONB array of {kind, text} objects, kept here rather than
-- a separate tags table because we don't yet query "all entries tagged
-- X" — the page just renders the chips. Denormalise later if needed.

create type v2.notebook_kind as enum ('note', 'voice', 'photo', 'sketch');

create table v2.notebook_entries (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,
  authored_by uuid references auth.users(id) on delete set null,

  kind v2.notebook_kind not null,
  title text not null,
  body_md text,

  -- Relative path inside the 'notebook-media' bucket. Null for kind='note'.
  attachment_url text,

  -- Voice-only: recorded length in seconds. Drives the waveform display
  -- + "0:47" duration label in the rendered entry card.
  voice_duration_seconds integer,

  -- Free-form chips. Stored as [{kind: 'dish'|'detected'|'plain', text: '...'}]
  -- where 'detected' means the ingredient-detection job auto-tagged it.
  tags jsonb not null default '[]'::jsonb,

  -- Seasonal/ingredient detection metadata, set asynchronously by the
  -- season-detector job (not yet running). tone is 'peak' / 'ending' /
  -- 'arriving' to match the v8 ribbon colours.
  season_label text,
  season_tone text check (season_tone in ('peak', 'ending', 'arriving') or season_tone is null),

  -- Visibility — defaults to brigade-visible. Future private notes can
  -- be marked shared=false; the chef-shell read paths filter on this.
  shared boolean not null default true,

  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notebook_entries_site_created_idx
  on v2.notebook_entries(site_id, created_at desc);
create index notebook_entries_kind_idx
  on v2.notebook_entries(site_id, kind, created_at desc);
create index notebook_entries_season_idx
  on v2.notebook_entries(site_id, season_label)
  where season_label is not null;

create trigger notebook_entries_touch_updated_at
  before update on v2.notebook_entries
  for each row execute function v2.touch_updated_at();

-- ---------------------------------------------------------------------
-- RLS — same role mix as waste_entries: owner/manager/chef write, all
-- members read (including viewers so a guest chef can review history).
-- ---------------------------------------------------------------------
alter table v2.notebook_entries enable row level security;

create policy notebook_entries_select on v2.notebook_entries
  for select using (site_id in (select v2.user_site_ids()));

create policy notebook_entries_insert on v2.notebook_entries
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy notebook_entries_update on v2.notebook_entries
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy notebook_entries_delete on v2.notebook_entries
  for delete using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager')
    )
  );
