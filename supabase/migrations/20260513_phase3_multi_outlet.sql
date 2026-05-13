-- accounts table (one per subscription, owner is the paying user)
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tier text not null default 'free' check (tier in ('free','pro','kitchen','group','enterprise')),
  owner_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- outlets table (up to 5 per group account)
create table if not exists public.outlets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  type text not null default 'restaurant' check (type in ('restaurant','pub','cafe','bar','hotel','central_kitchen','other')),
  address text,
  timezone text default 'Europe/London',
  is_central_kitchen boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- memberships table (links users to accounts and optionally to a specific outlet)
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  outlet_id uuid references public.outlets(id) on delete set null,
  role text not null default 'editor' check (role in ('owner','admin','editor','viewer')),
  invited_by uuid references auth.users(id),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique(account_id, user_id)
);

-- purchase_orders table
create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  outlet_id uuid references public.outlets(id) on delete set null,
  supplier_name text not null,
  status text not null default 'draft' check (status in ('draft','sent','received','flagged','cancelled')),
  total_amount numeric(10,2),
  notes text,
  raised_by uuid references auth.users(id),
  raised_at timestamptz not null default now(),
  expected_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- purchase_order_items table
create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  ingredient_name text not null,
  quantity numeric(10,3) not null,
  unit text not null,
  unit_price numeric(10,4),
  total_price numeric(10,2),
  received_quantity numeric(10,3),
  notes text
);

-- RLS policies
alter table public.accounts enable row level security;
alter table public.outlets enable row level security;
alter table public.memberships enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;

-- accounts: owner can do everything, members can read
create policy "accounts_owner_all" on public.accounts for all using (auth.uid() = owner_id);
create policy "accounts_member_read" on public.accounts for select using (
  exists (select 1 from public.memberships where account_id = accounts.id and user_id = auth.uid())
);

-- outlets: account owner or member can read, owner/admin can write
create policy "outlets_read" on public.outlets for select using (
  exists (select 1 from public.accounts where id = outlets.account_id and owner_id = auth.uid())
  or exists (select 1 from public.memberships where account_id = outlets.account_id and user_id = auth.uid())
);
create policy "outlets_write" on public.outlets for all using (
  exists (select 1 from public.accounts where id = outlets.account_id and owner_id = auth.uid())
  or exists (select 1 from public.memberships where account_id = outlets.account_id and user_id = auth.uid() and role in ('owner','admin'))
);

-- memberships: own membership visible to self, account owner sees all
create policy "memberships_self" on public.memberships for select using (user_id = auth.uid());
create policy "memberships_account_owner" on public.memberships for all using (
  exists (select 1 from public.accounts where id = memberships.account_id and owner_id = auth.uid())
);

-- purchase orders: account members can read, editors/admins/owners can write
create policy "po_read" on public.purchase_orders for select using (
  exists (select 1 from public.accounts where id = purchase_orders.account_id and owner_id = auth.uid())
  or exists (select 1 from public.memberships where account_id = purchase_orders.account_id and user_id = auth.uid())
);
create policy "po_write" on public.purchase_orders for all using (
  exists (select 1 from public.accounts where id = purchase_orders.account_id and owner_id = auth.uid())
  or exists (select 1 from public.memberships where account_id = purchase_orders.account_id and user_id = auth.uid() and role in ('owner','admin','editor'))
);

-- purchase order items inherit from parent PO via account membership
create policy "poi_read" on public.purchase_order_items for select using (
  exists (
    select 1 from public.purchase_orders po
    join public.accounts a on a.id = po.account_id
    where po.id = purchase_order_items.purchase_order_id
    and (a.owner_id = auth.uid() or exists (select 1 from public.memberships m where m.account_id = a.id and m.user_id = auth.uid()))
  )
);
create policy "poi_write" on public.purchase_order_items for all using (
  exists (
    select 1 from public.purchase_orders po
    join public.accounts a on a.id = po.account_id
    join public.memberships m on m.account_id = a.id
    where po.id = purchase_order_items.purchase_order_id
    and (a.owner_id = auth.uid() or (m.user_id = auth.uid() and m.role in ('owner','admin','editor')))
  )
);

-- useful indexes
create index if not exists outlets_account_id_idx on public.outlets(account_id);
create index if not exists memberships_account_id_idx on public.memberships(account_id);
create index if not exists memberships_user_id_idx on public.memberships(user_id);
create index if not exists purchase_orders_account_id_idx on public.purchase_orders(account_id);
create index if not exists purchase_orders_outlet_id_idx on public.purchase_orders(outlet_id);

-- migration helper: create a default account + outlet for existing Pro/Kitchen/Group users
-- this runs as a one-time backfill. It reads from auth.users via service role.
-- Run this manually in Supabase SQL editor after deploying:
-- insert into public.accounts (name, tier, owner_id)
-- select 'My Kitchen', u.raw_user_meta_data->>'tier', u.id
-- from auth.users u
-- where u.raw_user_meta_data->>'tier' in ('pro','kitchen','group')
-- and not exists (select 1 from public.accounts a where a.owner_id = u.id);
