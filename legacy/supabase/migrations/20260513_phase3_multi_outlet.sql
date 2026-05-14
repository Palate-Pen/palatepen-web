-- Phase 3 — multi-outlet schema, reconciled against the existing live schema
-- from migration 007 (accounts + account_members + account_invites).
--
-- WHAT THIS DOES
-- 1. Extends the existing `accounts` table with `logo_url`. Updates the tier
--    CHECK constraint to allow 'enterprise' (the new five-tier ladder we
--    rolled out earlier today).
-- 2. Extends the existing `account_members` table with `outlet_id` so a
--    membership can be scoped to a specific outlet on Group-tier accounts.
-- 3. Creates the genuinely new tables — `outlets`, `purchase_orders`,
--    `purchase_order_items` — that didn't exist yet.
-- 4. RLS for the new tables uses the same `public.is_account_member()` +
--    `public.role_at_least()` helpers migration 007 defined, so the role
--    hierarchy stays single-source (owner > manager > chef > viewer).
--
-- WHAT THIS DOES NOT DO
-- - Re-create `accounts` or `account_members` (they exist; renames would
--   break every existing route handler).
-- - Introduce a new `memberships` table (would shadow `account_members`).
-- - Use admin/editor role names (the live schema is manager/chef and the
--   app code throughout reads/writes those values).
--
-- BACKFILL
-- No accounts backfill is needed — migration 007 already seeds one account
-- per existing user. To give every existing account a default outlet, run
-- the commented INSERT at the bottom of this file from the SQL editor.

-- ============================================================
-- 1. Extend accounts: logo_url column + enterprise in tier check
-- ============================================================
alter table public.accounts
  add column if not exists logo_url text;

-- The existing CHECK constraint (created inline in migration 007) is named
-- `accounts_tier_check` by Postgres convention for column-level CHECKs.
-- Drop it by name and reinstate with the five-tier ladder. Idempotent —
-- re-running this migration is safe even if it already ran once.
alter table public.accounts drop constraint if exists accounts_tier_check;
alter table public.accounts
  add constraint accounts_tier_check
  check (tier in ('free','pro','kitchen','group','enterprise'));

-- ============================================================
-- 2. outlets — new table. Up to 5 per Group account; enforcement
--    happens in app code (src/lib/outlets.ts → createOutlet).
-- ============================================================
create table if not exists public.outlets (
  id                  uuid primary key default gen_random_uuid(),
  account_id          uuid not null references public.accounts(id) on delete cascade,
  name                text not null,
  type                text not null default 'restaurant'
                      check (type in ('restaurant','pub','cafe','bar','hotel','central_kitchen','other')),
  address             text,
  timezone            text default 'Europe/London',
  is_central_kitchen  boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists outlets_account_id_idx on public.outlets (account_id);
alter table public.outlets enable row level security;

-- ============================================================
-- 3. Extend account_members: outlet_id (nullable — Group-tier
--    chefs can be scoped to one outlet; managers + owners stay
--    account-wide and leave this null).
-- ============================================================
alter table public.account_members
  add column if not exists outlet_id uuid references public.outlets(id) on delete set null;

create index if not exists account_members_outlet_idx on public.account_members (outlet_id);

-- ============================================================
-- 4. purchase_orders + purchase_order_items
-- ============================================================
create table if not exists public.purchase_orders (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references public.accounts(id) on delete cascade,
  outlet_id       uuid references public.outlets(id) on delete set null,
  supplier_name   text not null,
  status          text not null default 'draft'
                  check (status in ('draft','sent','received','flagged','cancelled')),
  total_amount    numeric(10,2),
  notes           text,
  raised_by       uuid references auth.users(id) on delete set null,
  raised_at       timestamptz not null default now(),
  expected_at     timestamptz,
  received_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists purchase_orders_account_id_idx on public.purchase_orders (account_id);
create index if not exists purchase_orders_outlet_id_idx  on public.purchase_orders (outlet_id);
alter table public.purchase_orders enable row level security;

create table if not exists public.purchase_order_items (
  id                  uuid primary key default gen_random_uuid(),
  purchase_order_id   uuid not null references public.purchase_orders(id) on delete cascade,
  ingredient_name     text not null,
  quantity            numeric(10,3) not null,
  unit                text not null,
  unit_price          numeric(10,4),
  total_price         numeric(10,2),
  received_quantity   numeric(10,3),
  notes               text
);
create index if not exists purchase_order_items_po_idx on public.purchase_order_items (purchase_order_id);
alter table public.purchase_order_items enable row level security;

-- ============================================================
-- 5. RLS — uses the existing public.is_account_member() and
--    public.role_at_least() helpers from migration 007 so the
--    role hierarchy (owner > manager > chef > viewer) stays the
--    single source of truth.
-- ============================================================

-- outlets: any member can read, manager+ can write
drop policy if exists outlets_select_member  on public.outlets;
create policy outlets_select_member on public.outlets for select
  using (public.is_account_member(account_id));

drop policy if exists outlets_write_manager on public.outlets;
create policy outlets_write_manager on public.outlets for all
  using      (public.role_at_least(account_id, 'manager'))
  with check (public.role_at_least(account_id, 'manager'));

-- purchase_orders: any member can read, chef+ can write (raising a PO is
-- content-y, same gate as the user_data content tables in migration 007)
drop policy if exists po_select_member on public.purchase_orders;
create policy po_select_member on public.purchase_orders for select
  using (public.is_account_member(account_id));

drop policy if exists po_write_chef on public.purchase_orders;
create policy po_write_chef on public.purchase_orders for all
  using      (public.role_at_least(account_id, 'chef'))
  with check (public.role_at_least(account_id, 'chef'));

-- purchase_order_items: inherit from parent PO via account membership.
drop policy if exists poi_select_member on public.purchase_order_items;
create policy poi_select_member on public.purchase_order_items for select
  using (exists (
    select 1 from public.purchase_orders po
    where po.id = purchase_order_items.purchase_order_id
      and public.is_account_member(po.account_id)
  ));

drop policy if exists poi_write_chef on public.purchase_order_items;
create policy poi_write_chef on public.purchase_order_items for all
  using (exists (
    select 1 from public.purchase_orders po
    where po.id = purchase_order_items.purchase_order_id
      and public.role_at_least(po.account_id, 'chef')
  ))
  with check (exists (
    select 1 from public.purchase_orders po
    where po.id = purchase_order_items.purchase_order_id
      and public.role_at_least(po.account_id, 'chef')
  ));

-- ============================================================
-- Optional backfill — run from the Supabase SQL editor after
-- applying. Creates one default outlet per existing account that
-- doesn't already have one. New signups will create their outlet
-- via the app the first time they hit a multi-outlet surface.
-- ============================================================
-- insert into public.outlets (account_id, name, type, is_central_kitchen)
-- select a.id, a.name, 'restaurant', false
-- from public.accounts a
-- where not exists (
--   select 1 from public.outlets o where o.account_id = a.id
-- );
