-- v2 migration: waste_entries — what got binned and why
-- Date: 2026-05-14
-- Applied: 2026-05-14 (run via MCP apply_migration; MCP-verified table + waste_category enum + RLS + 4 policies (SIUD) + 3 indexes + touch_updated_at trigger all in place)
--
-- One row per waste event. Drives the Waste sub-page under Stock &
-- Suppliers + feeds the waste-pattern detectors (Sunday over-prep
-- creeping back, herbs binned £62 in 4 days, etc.). The value column
-- snapshots ingredient.current_price × qty at logging time so future
-- price moves on the Bank don't retroactively change historical waste
-- totals.
--
-- Categories (per design system v8 + legacy reporting):
--   over_prep        too much was prepped for the day
--   spoilage         went off in storage
--   trim             unavoidable trim from butchery / prep
--   accident         dropped, overcooked, fired wrong, etc.
--   customer_return  came back from the pass
--   other            chef-flagged with a free-text reason
--
-- ingredient_id is nullable for the "I binned 200g of trim, can't
-- remember which dish it came off" case — chef types a name, no FK.

create type v2.waste_category as enum
  ('over_prep', 'spoilage', 'trim', 'accident', 'customer_return', 'other');

create table v2.waste_entries (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,
  ingredient_id uuid references v2.ingredients(id) on delete set null,
  logged_by uuid references auth.users(id) on delete set null,

  logged_at timestamptz not null default now(),

  -- Free-text fallback so the entry saves even when the chef hasn't
  -- (or can't) matched it to a Bank ingredient.
  name text not null,
  qty numeric(10, 3) not null,
  qty_unit text not null,

  -- Snapshot of value at logging time. Computed as
  -- (ingredient.current_price × qty) when ingredient_id is set;
  -- chef-entered or null otherwise. Snapshotting means trend reports
  -- ("waste up 12% this week") stay stable against Bank price moves.
  value numeric(10, 2),

  category v2.waste_category not null default 'other',
  reason_md text,
  photo_url text,

  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index waste_entries_site_logged_idx
  on v2.waste_entries(site_id, logged_at desc);
create index waste_entries_ingredient_idx
  on v2.waste_entries(ingredient_id) where ingredient_id is not null;
create index waste_entries_category_idx
  on v2.waste_entries(site_id, category, logged_at desc);

create trigger waste_entries_touch_updated_at
  before update on v2.waste_entries
  for each row execute function v2.touch_updated_at();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table v2.waste_entries enable row level security;

create policy waste_entries_select on v2.waste_entries
  for select using (site_id in (select v2.user_site_ids()));

create policy waste_entries_insert on v2.waste_entries
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy waste_entries_update on v2.waste_entries
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy waste_entries_delete on v2.waste_entries
  for delete using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager')
    )
  );
