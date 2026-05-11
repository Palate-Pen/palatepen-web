-- 007_accounts_and_team_membership.sql
-- Multi-user foundation. Introduces accounts as the data-owning entity, with
-- role-based membership (owner > manager > chef > viewer). Transitional:
-- existing user_data.user_id stays alongside the new account_id and the
-- existing user_id-based RLS policies are left in place, so the app keeps
-- working unchanged. Stage 2 will switch reads to account_id; Stage 4 drops
-- the legacy path.
--
-- Backfill aliases account.id = user.id for personal accounts so legacy code
-- that keys data by user_id continues to map cleanly during the transition.
-- This is a one-time alignment, not a permanent invariant — invited members
-- and future-created secondary accounts will have their own ids.

-- ============================================================
-- 1. accounts
-- ============================================================
create table if not exists public.accounts (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  owner_user_id          uuid not null references auth.users(id) on delete restrict,
  tier                   text not null default 'free' check (tier in ('free','pro','kitchen','group')),
  stripe_customer_id     text,
  stripe_subscription_id text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists accounts_owner_idx           on public.accounts (owner_user_id);
create index if not exists accounts_stripe_customer_idx on public.accounts (stripe_customer_id);
alter table public.accounts enable row level security;

-- ============================================================
-- 2. account_members
-- ============================================================
create table if not exists public.account_members (
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id    uuid not null references auth.users(id)      on delete cascade,
  role       text not null check (role in ('owner','manager','chef','viewer')),
  added_at   timestamptz not null default now(),
  added_by   uuid references auth.users(id) on delete set null,
  primary key (account_id, user_id)
);
create index if not exists account_members_user_idx on public.account_members (user_id);
alter table public.account_members enable row level security;

-- ============================================================
-- 3. account_invites
-- ============================================================
create table if not exists public.account_invites (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references public.accounts(id) on delete cascade,
  email       text not null,
  -- Owners cannot be invited; ownership is transferred separately.
  role        text not null check (role in ('manager','chef','viewer')),
  token       text not null unique,
  invited_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null
);
create index if not exists account_invites_account_idx on public.account_invites (account_id);
create index if not exists account_invites_email_idx   on public.account_invites (lower(email));
alter table public.account_invites enable row level security;

-- ============================================================
-- 4. RLS helpers — used by policies and by app code
-- ============================================================
create or replace function public.is_account_member(p_account_id uuid)
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from public.account_members
    where account_id = p_account_id and user_id = auth.uid()
  );
$$;

-- Hierarchy: owner > manager > chef > viewer.
-- role_at_least(account, 'chef') is true for chef, manager, owner.
create or replace function public.role_at_least(p_account_id uuid, p_min_role text)
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from public.account_members
    where account_id = p_account_id
      and user_id    = auth.uid()
      and case p_min_role
            when 'viewer'  then role in ('viewer','chef','manager','owner')
            when 'chef'    then role in ('chef','manager','owner')
            when 'manager' then role in ('manager','owner')
            when 'owner'   then role = 'owner'
            else false
          end
  );
$$;

-- ============================================================
-- 5. Backfill: every existing user_data row → account they own
-- ============================================================
insert into public.accounts (id, name, owner_user_id, tier, stripe_customer_id)
select
  ud.user_id,
  coalesce(nullif(ud.profile->>'name', ''), 'My Kitchen'),
  ud.user_id,
  coalesce(ud.profile->>'tier', 'free'),
  u.raw_user_meta_data->>'stripe_customer'
from public.user_data ud
join auth.users u on u.id = ud.user_id
on conflict (id) do nothing;

insert into public.account_members (account_id, user_id, role, added_by)
select id, owner_user_id, 'owner', owner_user_id
from public.accounts
on conflict (account_id, user_id) do nothing;

-- ============================================================
-- 6. user_data.account_id (nullable, backfilled = user_id)
-- ============================================================
alter table public.user_data
  add column if not exists account_id uuid references public.accounts(id) on delete cascade;

update public.user_data set account_id = user_id where account_id is null;

create index if not exists user_data_account_idx on public.user_data (account_id);

-- ============================================================
-- 7. RLS — accounts / members / invites
-- ============================================================
drop policy if exists accounts_select on public.accounts;
create policy accounts_select on public.accounts for select
  using (public.is_account_member(id));

drop policy if exists accounts_update_owner on public.accounts;
create policy accounts_update_owner on public.accounts for update
  using (public.role_at_least(id, 'owner'))
  with check (public.role_at_least(id, 'owner'));

drop policy if exists members_select on public.account_members;
create policy members_select on public.account_members for select
  using (public.is_account_member(account_id));

drop policy if exists members_write_manager on public.account_members;
create policy members_write_manager on public.account_members for all
  using (public.role_at_least(account_id, 'manager'))
  with check (public.role_at_least(account_id, 'manager'));

drop policy if exists invites_select_member on public.account_invites;
create policy invites_select_member on public.account_invites for select
  using (public.is_account_member(account_id));

drop policy if exists invites_write_manager on public.account_invites;
create policy invites_write_manager on public.account_invites for all
  using (public.role_at_least(account_id, 'manager'))
  with check (public.role_at_least(account_id, 'manager'));

-- ============================================================
-- 8. user_data RLS — additive policies (membership grants access)
-- Existing user_id-based policies stay in place; these new policies open
-- the membership path so Stage 2 code can read by account_id.
-- ============================================================
drop policy if exists user_data_select_member on public.user_data;
create policy user_data_select_member on public.user_data for select
  using (account_id is not null and public.is_account_member(account_id));

drop policy if exists user_data_update_chef on public.user_data;
create policy user_data_update_chef on public.user_data for update
  using      (account_id is not null and public.role_at_least(account_id, 'chef'))
  with check (account_id is not null and public.role_at_least(account_id, 'chef'));

drop policy if exists user_data_insert_chef on public.user_data;
create policy user_data_insert_chef on public.user_data for insert
  with check (account_id is not null and public.role_at_least(account_id, 'chef'));

-- ============================================================
-- 9. Updated signup trigger — also creates account + ownership
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_account_id uuid := new.id;  -- alias account.id to user.id for personal accounts
begin
  insert into public.accounts (id, name, owner_user_id, tier)
  values (
    new_account_id,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), 'My Kitchen'),
    new.id,
    coalesce(new.raw_user_meta_data->>'tier', 'free')
  )
  on conflict (id) do nothing;

  insert into public.account_members (account_id, user_id, role, added_by)
  values (new_account_id, new.id, 'owner', new.id)
  on conflict (account_id, user_id) do nothing;

  insert into public.user_data (
    user_id, account_id,
    recipes, notes, gp_history, ingredients_bank, invoices, price_alerts, stock_items,
    profile
  ) values (
    new.id, new_account_id,
    '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    jsonb_build_object(
      'name',           coalesce(new.raw_user_meta_data->>'name', ''),
      'email',          coalesce(new.email, ''),
      'tier',           coalesce(new.raw_user_meta_data->>'tier', 'free'),
      'location',       '',
      'currency',       'GBP',
      'currencySymbol', '£',
      'units',          'metric',
      'gpTarget',       72,
      'stockDay',       1,
      'stockFrequency', 'weekly'
    )
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;
