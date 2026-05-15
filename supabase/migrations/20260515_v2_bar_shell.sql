-- v2 migration: bar shell — table extensions + new tables + bar-role RLS
-- Date: 2026-05-15
-- Applied: 2026-05-15 (MCP apply_migration; verified 3 new tables — allocations / stock_takes / stock_take_lines — all RLS-enabled with 4 policies each (SIUD), 6 new columns on recipes, 5 new columns on ingredients, spillage_reason on waste_entries, plus 16 additive bar-role policies on existing tables) The enum extensions live in 20260515_v2_bar_enums.sql;
-- this migration assumes those values exist.
--
-- This migration:
--   1. Extends v2.recipes with bar-specific columns (dish_type + glass /
--      ice / technique / pour_ml).
--   2. Extends v2.ingredients with par/reorder/current_stock + a typed
--      unit + pack_volume_ml (so cost-per-pour can be computed live).
--   3. Extends v2.waste_entries with bar spillage_reason.
--   4. Creates v2.allocations — distributor allocations of rare bottles.
--   5. Creates v2.stock_takes + v2.stock_take_lines — weekly bottle-count
--      workflow specific to the bar (could be reused for kitchen FIFO
--      counts later but the immediate driver is bar pour-cost reconciliation).
--   6. Adds *additive* RLS policies for bartender + head_bartender
--      (separate from existing chef/manager/owner policies — multiple
--      policies are OR'd, so this widens write access without touching
--      the existing working policies).
--
-- Cross-shell write rule reminder: permissive. Bartender + head_bartender
-- get chef-equivalent write access to recipes / ingredients / suppliers /
-- deliveries / invoices / waste / and the bar-specific tables. The shells
-- filter the UI; RLS does not partition by dish_type.

-- ---------------------------------------------------------------------
-- 1. v2.recipes — bar fields
-- ---------------------------------------------------------------------
alter table v2.recipes
  add column if not exists dish_type v2.dish_type not null default 'food',
  add column if not exists glass_type text,
  add column if not exists ice_type text,
  add column if not exists technique v2.cocktail_technique,
  add column if not exists pour_ml numeric(8, 2),
  add column if not exists garnish text;

create index if not exists recipes_site_dish_type_idx
  on v2.recipes(site_id, dish_type);

-- ---------------------------------------------------------------------
-- 2. v2.ingredients — par tracking + typed unit + bottle volume
-- ---------------------------------------------------------------------
alter table v2.ingredients
  add column if not exists par_level numeric(10, 3),
  add column if not exists reorder_point numeric(10, 3),
  add column if not exists current_stock numeric(10, 3),
  add column if not exists unit_type v2.cellar_unit_type,
  add column if not exists pack_volume_ml numeric(10, 2);

-- pack_volume_ml lets us compute cost-per-pour live:
--   cost_per_pour = (current_price / pack_volume_ml) * pour_ml
-- For a £24 bottle of Tanqueray (700ml) and a 25ml pour:
--   (24 / 700) * 25 = £0.857
-- For wine, beer, kegs, casks — same formula.

create index if not exists ingredients_par_breach_idx
  on v2.ingredients(site_id)
  where reorder_point is not null
    and current_stock is not null
    and current_stock <= reorder_point;

-- ---------------------------------------------------------------------
-- 3. v2.waste_entries — bar spillage_reason
-- ---------------------------------------------------------------------
alter table v2.waste_entries
  add column if not exists spillage_reason v2.spillage_reason;

-- ---------------------------------------------------------------------
-- 4. v2.allocations — distributor allocations of rare bottles
-- ---------------------------------------------------------------------
create table if not exists v2.allocations (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,
  ingredient_id uuid references v2.ingredients(id) on delete set null,
  supplier_id uuid references v2.suppliers(id) on delete set null,
  name text not null,
  allocated_quantity numeric(10, 3) not null,
  received_quantity numeric(10, 3),
  unit text not null default 'bottle',
  expected_date date,
  received_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists allocations_site_expected_idx
  on v2.allocations(site_id, expected_date asc);

create trigger allocations_touch_updated_at
  before update on v2.allocations
  for each row execute function v2.touch_updated_at();

-- ---------------------------------------------------------------------
-- 5. v2.stock_takes + v2.stock_take_lines
-- ---------------------------------------------------------------------
create table if not exists v2.stock_takes (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,
  conducted_by uuid references auth.users(id) on delete set null,
  conducted_at timestamptz not null default now(),
  variance_total_value numeric(10, 2),
  notes text,
  status v2.stock_take_status not null default 'in_progress',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stock_takes_site_status_idx
  on v2.stock_takes(site_id, status, conducted_at desc);

create trigger stock_takes_touch_updated_at
  before update on v2.stock_takes
  for each row execute function v2.touch_updated_at();

create table if not exists v2.stock_take_lines (
  id uuid primary key default gen_random_uuid(),
  stock_take_id uuid not null references v2.stock_takes(id) on delete cascade,
  ingredient_id uuid not null references v2.ingredients(id) on delete cascade,
  expected_quantity numeric(10, 3),
  counted_quantity numeric(10, 3),
  variance_quantity numeric(10, 3),
  variance_value numeric(10, 2),
  reason text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists stock_take_lines_st_idx
  on v2.stock_take_lines(stock_take_id, position);

-- ---------------------------------------------------------------------
-- 6. RLS — new tables
-- ---------------------------------------------------------------------
alter table v2.allocations enable row level security;
alter table v2.stock_takes enable row level security;
alter table v2.stock_take_lines enable row level security;

create policy allocations_select on v2.allocations
  for select using (site_id in (select v2.user_site_ids()));
create policy allocations_insert on v2.allocations
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'chef', 'sous_chef',
                       'bartender', 'head_bartender')
    )
  );
create policy allocations_update on v2.allocations
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'chef', 'sous_chef',
                       'bartender', 'head_bartender')
    )
  );
create policy allocations_delete on v2.allocations
  for delete using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'head_bartender')
    )
  );

create policy stock_takes_select on v2.stock_takes
  for select using (site_id in (select v2.user_site_ids()));
create policy stock_takes_insert on v2.stock_takes
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'chef',
                       'bartender', 'head_bartender')
    )
  );
create policy stock_takes_update on v2.stock_takes
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'chef',
                       'bartender', 'head_bartender')
    )
  );
create policy stock_takes_delete on v2.stock_takes
  for delete using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'head_bartender')
    )
  );

create policy stock_take_lines_select on v2.stock_take_lines
  for select using (
    stock_take_id in (
      select id from v2.stock_takes
      where site_id in (select v2.user_site_ids())
    )
  );
create policy stock_take_lines_insert on v2.stock_take_lines
  for insert with check (
    stock_take_id in (
      select st.id from v2.stock_takes st
      join v2.memberships m on m.site_id = st.site_id
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'chef',
                       'bartender', 'head_bartender')
    )
  );
create policy stock_take_lines_update on v2.stock_take_lines
  for update using (
    stock_take_id in (
      select st.id from v2.stock_takes st
      join v2.memberships m on m.site_id = st.site_id
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'chef',
                       'bartender', 'head_bartender')
    )
  );
create policy stock_take_lines_delete on v2.stock_take_lines
  for delete using (
    stock_take_id in (
      select st.id from v2.stock_takes st
      join v2.memberships m on m.site_id = st.site_id
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'head_bartender')
    )
  );

-- ---------------------------------------------------------------------
-- 7. Additive bar-role policies on existing tables
-- ---------------------------------------------------------------------
-- Multiple policies on the same table are OR'd. These widen INSERT and
-- UPDATE access to bartender + head_bartender without touching the
-- existing chef-flavoured policies. Delete stays restricted to manager+.
--
-- Tables touched: recipes, ingredients, suppliers, deliveries, invoices,
-- invoice_lines, waste_entries, prep_items, notebook_entries.

create policy recipes_insert_bar on v2.recipes
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('bartender', 'head_bartender')
    )
  );
create policy recipes_update_bar on v2.recipes
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('bartender', 'head_bartender')
    )
  );

create policy ingredients_insert_bar on v2.ingredients
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('bartender', 'head_bartender')
    )
  );
create policy ingredients_update_bar on v2.ingredients
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('bartender', 'head_bartender')
    )
  );

create policy suppliers_insert_bar on v2.suppliers
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('bartender', 'head_bartender')
    )
  );
create policy suppliers_update_bar on v2.suppliers
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('bartender', 'head_bartender')
    )
  );

create policy deliveries_insert_bar on v2.deliveries
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('bartender', 'head_bartender', 'bar_back')
    )
  );
create policy deliveries_update_bar on v2.deliveries
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('bartender', 'head_bartender', 'bar_back')
    )
  );

create policy invoices_insert_bar on v2.invoices
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('bartender', 'head_bartender')
    )
  );
create policy invoices_update_bar on v2.invoices
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('bartender', 'head_bartender')
    )
  );

create policy invoice_lines_insert_bar on v2.invoice_lines
  for insert with check (
    invoice_id in (
      select inv.id from v2.invoices inv
      join v2.memberships m on m.site_id = inv.site_id
      where m.user_id = auth.uid()
        and m.role in ('bartender', 'head_bartender')
    )
  );
create policy invoice_lines_update_bar on v2.invoice_lines
  for update using (
    invoice_id in (
      select inv.id from v2.invoices inv
      join v2.memberships m on m.site_id = inv.site_id
      where m.user_id = auth.uid()
        and m.role in ('bartender', 'head_bartender')
    )
  );

create policy waste_entries_insert_bar on v2.waste_entries
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('bartender', 'head_bartender', 'bar_back')
    )
  );
create policy waste_entries_update_bar on v2.waste_entries
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('bartender', 'head_bartender', 'bar_back')
    )
  );

create policy notebook_entries_insert_bar on v2.notebook_entries
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('bartender', 'head_bartender', 'bar_back')
    )
  );
create policy notebook_entries_update_bar on v2.notebook_entries
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('bartender', 'head_bartender', 'bar_back')
    )
  );
