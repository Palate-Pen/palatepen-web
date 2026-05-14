-- v2 schema — Palatable greenfield rewrite
-- Migration: foundation (accounts, sites, memberships)
-- Date: 2026-05-14
--
-- Tenancy primitive: accounts. Sites are children of accounts.
-- Chef-shell users see one site at a time. Manager-shell users may
-- have multi-site access within an account. Owner-shell users see
-- all sites under their account.
--
-- This migration only lands the auth + tenancy primitives. Snapshot
-- tables, forward_signals, activity_events, and integration tables
-- come in subsequent migrations as their features are built.

create schema if not exists v2;

-- ---------------------------------------------------------------------
-- 1. accounts — the tenant root. One billing relationship per account.
-- ---------------------------------------------------------------------
create table v2.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tier text not null default 'free'
    check (tier in ('free', 'pro', 'kitchen', 'group', 'enterprise')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. sites — kitchens / outlets. Children of accounts.
--   Free/Pro/Kitchen accounts have exactly one site (auto-created on
--   signup). Group accounts may have up to 5 sites (UI-enforced).
--   Enterprise: unlimited.
-- ---------------------------------------------------------------------
create table v2.sites (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references v2.accounts(id) on delete cascade,
  name text not null,
  kind text not null default 'restaurant',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sites_account_id_idx on v2.sites(account_id);

-- ---------------------------------------------------------------------
-- 3. memberships — user → site with role.
--   A user can be a member of multiple sites (multi-site managers,
--   group-tier owners). Role determines which shell renders. The
--   (user_id, site_id) unique constraint means one role per site.
-- ---------------------------------------------------------------------
create type v2.shell_role as enum ('owner', 'manager', 'chef', 'viewer');

create table v2.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid not null references v2.sites(id) on delete cascade,
  role v2.shell_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, site_id)
);

create index memberships_user_id_idx on v2.memberships(user_id);
create index memberships_site_id_idx on v2.memberships(site_id);

-- ---------------------------------------------------------------------
-- 4. RLS — all tenant tables on.
-- ---------------------------------------------------------------------
alter table v2.accounts enable row level security;
alter table v2.sites enable row level security;
alter table v2.memberships enable row level security;

-- Helper: site_ids the current user has access to.
create or replace function v2.user_site_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select site_id from v2.memberships where user_id = auth.uid();
$$;

-- Helper: account_ids derived from current user's site memberships.
create or replace function v2.user_account_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct s.account_id
  from v2.sites s
  join v2.memberships m on m.site_id = s.id
  where m.user_id = auth.uid();
$$;

-- accounts: visible if the user has any membership under one of its sites.
create policy accounts_select on v2.accounts
  for select using (id in (select v2.user_account_ids()));

-- accounts: only owners can update their account row.
create policy accounts_update on v2.accounts
  for update using (
    id in (
      select s.account_id from v2.sites s
      join v2.memberships m on m.site_id = s.id
      where m.user_id = auth.uid() and m.role = 'owner'
    )
  );

-- sites: visible if user is a member.
create policy sites_select on v2.sites
  for select using (id in (select v2.user_site_ids()));

-- sites: owners + managers can update sites in their account.
create policy sites_update on v2.sites
  for update using (
    id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager')
    )
  );

-- memberships: users see memberships for sites they have access to.
create policy memberships_select on v2.memberships
  for select using (site_id in (select v2.user_site_ids()));

-- memberships: owners + managers can manage memberships in their sites.
create policy memberships_insert on v2.memberships
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager')
    )
  );

create policy memberships_delete on v2.memberships
  for delete using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager')
    )
  );

-- ---------------------------------------------------------------------
-- 5. Signup hook — on new auth.users row, auto-create account + site
--    + owner membership. Matches the locked signup flow (Q3): bare
--    signup creates a fresh tenant; invite-accept (later migration)
--    will join the inviter's site instead.
--
--    NOTE on the legacy trigger collision: the legacy schema has a
--    public.handle_new_user trigger that fires on the same event. On
--    a fresh signup against this DB, BOTH triggers will run — legacy
--    will create rows in public.profiles + public.accounts, v2 will
--    create rows in v2.accounts + v2.sites + v2.memberships. The two
--    don't conflict but the legacy rows are dead weight. Cleanup
--    (drop the public trigger) handled in a separate migration once
--    v2 signup is wired and tested.
-- ---------------------------------------------------------------------
create or replace function v2.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_account_id uuid;
  new_site_id uuid;
begin
  insert into v2.accounts (name, tier)
  values (
    coalesce(new.raw_user_meta_data->>'account_name', 'My Kitchen'),
    'free'
  )
  returning id into new_account_id;

  insert into v2.sites (account_id, name, kind)
  values (new_account_id, 'My Kitchen', 'restaurant')
  returning id into new_site_id;

  insert into v2.memberships (user_id, site_id, role)
  values (new.id, new_site_id, 'owner');

  return new;
end;
$$;

create trigger v2_on_auth_user_created
  after insert on auth.users
  for each row execute function v2.handle_new_user();

-- ---------------------------------------------------------------------
-- 6. updated_at autotouch.
-- ---------------------------------------------------------------------
create or replace function v2.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger accounts_touch_updated_at
  before update on v2.accounts
  for each row execute function v2.touch_updated_at();

create trigger sites_touch_updated_at
  before update on v2.sites
  for each row execute function v2.touch_updated_at();
