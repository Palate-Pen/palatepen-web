-- v2 migration: connections — third-party integration credentials
-- Date: 2026-05-15
--
-- Per the founder's lock: integrations are CHEF-INPUT (paste their own
-- keys), not us building OAuth pipelines. This table holds those
-- pasted credentials per site + service, plus an enabled flag for the
-- account's API access key (Kitchen+ tier feature).
--
-- The credential column is plaintext for v1. When we add real OAuth
-- flows, switch to encrypted-at-rest via Supabase Vault or a
-- pgsodium-backed wrapper. For "chef pastes an API key" the threat
-- model is the chef themselves losing the key, not a leaked DB.
--
-- service values:
--   square        POS — pasted Square access token
--   resy          reservations
--   stripe        payments (independent from our subscription Stripe)
--   gcal          Google Calendar
--   xero          accounting
--   eposnow       POS — different from Square
--   palatable_api outgoing API key for the chef's own integrations
--   custom        free-form integration the chef wants tracked

create table v2.connections (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,
  service text not null,
  display_name text,
  status text not null default 'disconnected' check (status in ('disconnected', 'connected', 'error', 'expired')),
  credential text,
  last_synced_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, service)
);

create index connections_site_idx on v2.connections(site_id, status);

create trigger connections_touch_updated_at
  before update on v2.connections
  for each row execute function v2.touch_updated_at();

alter table v2.connections enable row level security;

create policy connections_select on v2.connections
  for select using (site_id in (select v2.user_site_ids()));

create policy connections_insert on v2.connections
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager')
    )
  );

create policy connections_update on v2.connections
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager')
    )
  );

create policy connections_delete on v2.connections
  for delete using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager')
    )
  );
