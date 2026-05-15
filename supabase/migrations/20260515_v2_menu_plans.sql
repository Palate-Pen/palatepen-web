-- v2 migration: menu_plans + menu_plan_items — forward menu planner
-- Date: 2026-05-15
-- Applied: 2026-05-15 (MCP apply_migration; both tables + 8 RLS policies + 2 indexes + touch_updated_at trigger)
--
-- Forward menu planning surface, nested inside the Menus tab (Live |
-- Planning toggle on chef + bar; manager Menu Builder gets a parallel
-- Planning sub-view). Answers "what should the next menu look like,
-- and what risks sit on the path to launch."
--
-- One active draft plan per surface (kitchen / bar) per site at any
-- time. When chef finalises (status -> finalised), the items get
-- materialised into the live menu in a separate step (out of scope for
-- this migration — handled in the finalise action).
--
-- Menu engineering quadrant is computed at read time from the item's
-- popularity_rating + the linked recipe's GP %. No quadrant column is
-- stored — keeping it derived means a Bank price move or a chef
-- re-rate immediately re-classifies the item.
--
-- Action values:
--   keep      currently on the menu, staying on the next one
--   add       not on the menu yet (recipe_id may be null + a
--             placeholder_name set — a TBD dish)
--   remove    on the menu now, dropping for the next
--   revise    on the menu now, but needs rework before next launch
--             (typically a "plowhorse" with bad GP)
--
-- popularity_rating: 1-5, chef-entered. POS integration replaces this
-- with real sales data later; until then it's the chef's honest
-- estimate.

create table v2.menu_plans (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,
  surface text not null check (surface in ('kitchen', 'bar')),

  name text not null,
  target_launch date,
  status text not null default 'draft' check (status in ('draft', 'finalised', 'archived')),
  notes text,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finalised_at timestamptz,
  archived_at timestamptz
);

create index menu_plans_site_surface_idx
  on v2.menu_plans(site_id, surface, status)
  where archived_at is null;

create trigger menu_plans_touch_updated_at
  before update on v2.menu_plans
  for each row execute function v2.touch_updated_at();

create table v2.menu_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references v2.menu_plans(id) on delete cascade,
  recipe_id uuid references v2.recipes(id) on delete set null,

  -- When recipe_id is null, this is a placeholder for a dish not yet
  -- in v2.recipes (e.g. "summer salad — TBD"). The chef can flesh
  -- it into a real recipe later and back-link via recipe_id.
  placeholder_name text,

  action text not null check (action in ('add', 'keep', 'remove', 'revise')),
  popularity_rating int check (popularity_rating between 1 and 5),
  notes text,

  position int not null default 0,
  created_at timestamptz not null default now(),

  -- One row per recipe per plan (a recipe can't be both 'keep' and
  -- 'remove' on the same plan). Placeholder rows aren't constrained.
  unique (plan_id, recipe_id)
);

create index menu_plan_items_plan_idx
  on v2.menu_plan_items(plan_id, position);

-- ---------------------------------------------------------------------
-- RLS — same site-scoped pattern as credit_notes
-- ---------------------------------------------------------------------
alter table v2.menu_plans enable row level security;
alter table v2.menu_plan_items enable row level security;

create policy menu_plans_select on v2.menu_plans
  for select using (site_id in (select v2.user_site_ids()));

create policy menu_plans_insert on v2.menu_plans
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy menu_plans_update on v2.menu_plans
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy menu_plans_delete on v2.menu_plans
  for delete using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager')
    )
  );

create policy menu_plan_items_select on v2.menu_plan_items
  for select using (
    plan_id in (
      select id from v2.menu_plans
      where site_id in (select v2.user_site_ids())
    )
  );

create policy menu_plan_items_insert on v2.menu_plan_items
  for insert with check (
    plan_id in (
      select p.id from v2.menu_plans p
      join v2.memberships m on m.site_id = p.site_id
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy menu_plan_items_update on v2.menu_plan_items
  for update using (
    plan_id in (
      select p.id from v2.menu_plans p
      join v2.memberships m on m.site_id = p.site_id
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy menu_plan_items_delete on v2.menu_plan_items
  for delete using (
    plan_id in (
      select p.id from v2.menu_plans p
      join v2.memberships m on m.site_id = p.site_id
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );
