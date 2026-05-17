-- v2 migration: The Bank — ingredients + suppliers + price history
-- Date: 2026-05-14
-- Applied: 2026-05-14 (manual run via Supabase SQL editor; file committed after; verified via MCP that DB state matches this file exactly — columns, enum, indexes, RLS, policies, triggers)
--
-- Lands the foundational data model for the chef-shell Stock & Suppliers
-- hub. Three tables, all site-scoped, RLS via the user_site_ids() helper
-- from the foundation migration.
--
--   v2.suppliers — minimal first-pass. Payment terms / balance / COD
--     status / reliability score added when the Suppliers surface is
--     designed in (column-add migrations).
--
--   v2.ingredients — the live ingredient catalogue. Current price is
--     denormalised on the row for fast Bank reads; full history is in
--     ingredient_price_history. last_seen_at drives the "just updated"
--     highlight pattern from design system v8.
--
--   v2.ingredient_price_history — append-only price log. Sparklines and
--     movement % on The Bank read the last 30 days from here.

-- ---------------------------------------------------------------------
-- 1. Suppliers
-- ---------------------------------------------------------------------
create table v2.suppliers (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index suppliers_site_id_idx on v2.suppliers(site_id);

-- ---------------------------------------------------------------------
-- 2. Ingredients
-- ---------------------------------------------------------------------
create table v2.ingredients (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,
  supplier_id uuid references v2.suppliers(id) on delete set null,
  name text not null,
  spec text,
  unit text,
  category text,
  current_price numeric(10, 4),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ingredients_site_id_idx on v2.ingredients(site_id);
create index ingredients_supplier_id_idx on v2.ingredients(supplier_id);

-- ---------------------------------------------------------------------
-- 3. Ingredient price history (append-only)
-- ---------------------------------------------------------------------
create type v2.price_source as enum ('invoice', 'manual', 'auto', 'imported');

create table v2.ingredient_price_history (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references v2.ingredients(id) on delete cascade,
  price numeric(10, 4) not null,
  source v2.price_source not null default 'manual',
  recorded_at timestamptz not null default now(),
  notes text
);

create index ingredient_price_history_ingredient_recorded_idx
  on v2.ingredient_price_history(ingredient_id, recorded_at desc);

-- ---------------------------------------------------------------------
-- 4. RLS — site-scoped via the foundation migration's user_site_ids()
-- ---------------------------------------------------------------------
alter table v2.suppliers enable row level security;
alter table v2.ingredients enable row level security;
alter table v2.ingredient_price_history enable row level security;

-- Suppliers
create policy suppliers_select on v2.suppliers
  for select using (site_id in (select v2.user_site_ids()));

create policy suppliers_insert on v2.suppliers
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy suppliers_update on v2.suppliers
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy suppliers_delete on v2.suppliers
  for delete using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager')
    )
  );

-- Ingredients — same shape as suppliers
create policy ingredients_select on v2.ingredients
  for select using (site_id in (select v2.user_site_ids()));

create policy ingredients_insert on v2.ingredients
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy ingredients_update on v2.ingredients
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy ingredients_delete on v2.ingredients
  for delete using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager')
    )
  );

-- Price history — read/write follows the parent ingredient's site
create policy ingredient_price_history_select on v2.ingredient_price_history
  for select using (
    ingredient_id in (
      select id from v2.ingredients where site_id in (select v2.user_site_ids())
    )
  );

create policy ingredient_price_history_insert on v2.ingredient_price_history
  for insert with check (
    ingredient_id in (
      select i.id from v2.ingredients i
      join v2.memberships m on m.site_id = i.site_id
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

-- No update / delete policy: price history is append-only.

-- ---------------------------------------------------------------------
-- 5. updated_at autotouch (price_history is append-only, no trigger needed)
-- ---------------------------------------------------------------------
create trigger suppliers_touch_updated_at
  before update on v2.suppliers
  for each row execute function v2.touch_updated_at();

create trigger ingredients_touch_updated_at
  before update on v2.ingredients
  for each row execute function v2.touch_updated_at();
