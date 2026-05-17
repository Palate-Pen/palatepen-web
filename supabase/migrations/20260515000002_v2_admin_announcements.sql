-- v2 migration: admin_announcements — founder-controlled site-wide banner
-- Date: 2026-05-15
-- Applied: 2026-05-15 (run by founder via Supabase SQL editor; MCP was offline during the commit session)
--
-- Founder writes a single active announcement that renders on every
-- chef shell page (and bartender / manager / owner if we extend).
-- Schema is intentionally simple — one row per published banner with
-- a status flag. The "active" banner is the most recently published
-- row with active=true and not expired.
--
-- Severities map to v8 severity colours:
--   info       gold accent — feature drop / general announcement
--   attention  amber — maintenance window incoming / known issue
--   urgent     red — incident in progress
--
-- expires_at: optional auto-deactivation. When null, banner runs until
-- the founder manually toggles active=false.
--
-- Insert-only writes (no edits). Founder can publish a new banner;
-- it supersedes the prior. Old banners stay around for audit / "what
-- did we tell users on that day."

create table v2.admin_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  severity text not null default 'info' check (severity in ('info', 'attention', 'urgent')),
  active boolean not null default true,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index admin_announcements_active_idx
  on v2.admin_announcements(active, created_at desc)
  where active = true;

-- RLS: founder-only writes, everyone reads (the banner shows to all
-- authenticated users on the shell layout).
alter table v2.admin_announcements enable row level security;

create policy admin_announcements_select on v2.admin_announcements
  for select using (true);

-- Insert + update + delete locked to founder email by checking
-- auth.email() — strictest possible gate; only jack@ can run these.
create policy admin_announcements_insert on v2.admin_announcements
  for insert with check (auth.email() = 'jack@palateandpen.co.uk');

create policy admin_announcements_update on v2.admin_announcements
  for update using (auth.email() = 'jack@palateandpen.co.uk');

create policy admin_announcements_delete on v2.admin_announcements
  for delete using (auth.email() = 'jack@palateandpen.co.uk');
