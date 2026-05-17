-- v2 migration: prep_items — the kitchen-floor active workflow
-- Date: 2026-05-14
-- Applied: 2026-05-14 (run via MCP apply_migration; MCP-verified post-run that the table, prep_status enum, RLS, all 4 policies, 2 indexes, and the touch_updated_at trigger landed cleanly)
--
-- One row per prep task per day. Each row is the chef's commitment to
-- making (or finishing) X amount of Y at station Z. The system's job is
-- to suggest — never to override. suggested_qty holds the system's
-- recommendation as free text (so it can be context-rich: "suggested
-- 4.2kg", "cut back 20% — last 4 weeks binned £62"). The chef sets the
-- actual qty + qty_unit. suggested_flag carries whether the suggestion
-- warrants attention styling in the UI.
--
-- recipe_id is nullable: most prep items reference a recipe, but
-- one-offs (parsley garnish, mezze plating mise, station setup) do not.
-- one_off is set true for those so the UI can tag them.
--
-- Depends on v2.recipes (FK).

create type v2.prep_status as enum
  ('not_started', 'in_progress', 'done', 'over_prepped', 'short');

create table v2.prep_items (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,

  -- when + where
  prep_date date not null,
  station text not null,

  -- what
  name text not null,
  recipe_id uuid references v2.recipes(id) on delete set null,
  one_off boolean not null default false,

  -- how much (chef-set; system only suggests)
  qty numeric(10, 3),
  qty_unit text,
  suggested_qty text,
  suggested_flag boolean not null default false,

  -- who
  assigned_user_id uuid references auth.users(id) on delete set null,

  -- progress
  status v2.prep_status not null default 'not_started',
  started_at timestamptz,
  finished_at timestamptz,

  -- chef's running thoughts (always free text — no AI summarisation)
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prep_items_site_date_idx on v2.prep_items(site_id, prep_date);
create index prep_items_site_date_station_idx
  on v2.prep_items(site_id, prep_date, station);

create trigger prep_items_touch_updated_at
  before update on v2.prep_items
  for each row execute function v2.touch_updated_at();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table v2.prep_items enable row level security;

create policy prep_items_select on v2.prep_items
  for select using (site_id in (select v2.user_site_ids()));

create policy prep_items_insert on v2.prep_items
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy prep_items_update on v2.prep_items
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy prep_items_delete on v2.prep_items
  for delete using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );
