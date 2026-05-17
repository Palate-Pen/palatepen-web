-- v2 migration: stock_transfers + stock_transfer_lines — Phase 3 transfer loop
-- Date: 2026-05-15
-- Applied: 2026-05-15 (manual run via Supabase SQL editor; founder demo seed deferred to a follow-up — feature ships live without seed data first)
--
-- Stock transfers between pools. Two flavours fall out of one schema:
--   1. Intra-site:  kitchen <-> bar at the same site
--                   (e.g. chef gives the bar 2L of olive oil for service)
--   2. Inter-site:  any pool at site A -> any pool at site B
--                   (e.g. Palatable Kitchen ships 5 bottles of Tanqueray
--                   to Palatable Cellar Bar across town)
--
-- Source / destination are each {site_id, pool}. Pool is just a text
-- label ('kitchen' | 'bar') captured on the row — RLS still pivots on
-- site_id, not pool, so a chef at site A can see transfers they sent to
-- the bar at site A or to site B.
--
-- Each line points to a source ingredient_id (which row was decremented)
-- and an OPTIONAL dest ingredient_id (which row got credited). The dest
-- link is filled in on receive — for intra-site transfers the source IS
-- the dest. For cross-site, we try to auto-match by name; on miss the
-- line stays unlinked and the receiving site sees a "needs linking" badge.
--
-- Lifecycle:
--   draft       chef started the transfer, not yet committed
--   sent        committed — source stock decremented
--   received    destination has confirmed arrival — dest stock credited
--   cancelled   abandoned before send (post-send => reverse instead)
--
-- RLS uses the same pattern as purchase_orders. Visibility = either
-- source_site_id or dest_site_id in user_site_ids(). Writes need a
-- chef/manager/owner/bartender/head_bartender role at the relevant site.

create type v2.stock_transfer_pool as enum ('kitchen', 'bar');

create type v2.stock_transfer_status as enum
  ('draft', 'sent', 'received', 'cancelled');

-- ---------------------------------------------------------------------
-- 1. stock_transfers — header
-- ---------------------------------------------------------------------
create table v2.stock_transfers (
  id uuid primary key default gen_random_uuid(),

  source_site_id uuid not null references v2.sites(id) on delete cascade,
  source_pool v2.stock_transfer_pool not null,
  dest_site_id uuid not null references v2.sites(id) on delete cascade,
  dest_pool v2.stock_transfer_pool not null,

  reference text not null,
  status v2.stock_transfer_status not null default 'draft',

  -- App-computed total of line.qty * line.unit_cost (when known).
  total_value numeric(10, 2) not null default 0,

  notes text,

  sent_at timestamptz,
  received_at timestamptz,
  cancelled_at timestamptz,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Reject pointless transfers where source and dest are identical.
  constraint stock_transfers_not_self
    check (source_site_id <> dest_site_id or source_pool <> dest_pool)
);

create index stock_transfers_source_idx
  on v2.stock_transfers(source_site_id, status, created_at desc);
create index stock_transfers_dest_idx
  on v2.stock_transfers(dest_site_id, status, created_at desc);

create trigger stock_transfers_touch_updated_at
  before update on v2.stock_transfers
  for each row execute function v2.touch_updated_at();

-- ---------------------------------------------------------------------
-- 2. stock_transfer_lines — line items
-- ---------------------------------------------------------------------
create table v2.stock_transfer_lines (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references v2.stock_transfers(id) on delete cascade,

  -- The ingredient row being decremented at the source. Nullable so we
  -- can capture freehand lines (one-off ad-hoc items), but normally the
  -- chef picks from the source-site Bank/Cellar.
  source_ingredient_id uuid references v2.ingredients(id) on delete set null,

  -- The matched ingredient at the destination. Filled in on receive
  -- (auto-match by name first; manual link if no match). Stays null
  -- when the destination doesn't have a row for this ingredient yet.
  dest_ingredient_id uuid references v2.ingredients(id) on delete set null,

  raw_name text not null,
  qty numeric(10, 3) not null,
  qty_unit text not null,
  unit_cost numeric(10, 4),
  line_total numeric(10, 2),

  position integer not null default 0,
  notes text,

  created_at timestamptz not null default now()
);

create index stock_transfer_lines_transfer_idx
  on v2.stock_transfer_lines(transfer_id, position);

-- ---------------------------------------------------------------------
-- RLS — visibility = either side of the transfer; writes = same shape
-- ---------------------------------------------------------------------
alter table v2.stock_transfers enable row level security;
alter table v2.stock_transfer_lines enable row level security;

create policy stock_transfers_select on v2.stock_transfers
  for select using (
    source_site_id in (select v2.user_site_ids())
    or dest_site_id in (select v2.user_site_ids())
  );

create policy stock_transfers_insert on v2.stock_transfers
  for insert with check (
    source_site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in (
          'owner', 'manager', 'chef',
          'sous_chef', 'commis',
          'bartender', 'head_bartender'
        )
    )
  );

create policy stock_transfers_update on v2.stock_transfers
  for update using (
    source_site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in (
          'owner', 'manager', 'chef',
          'sous_chef', 'commis',
          'bartender', 'head_bartender'
        )
    )
    or dest_site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in (
          'owner', 'manager', 'chef',
          'sous_chef', 'commis',
          'bartender', 'head_bartender'
        )
    )
  );

create policy stock_transfers_delete on v2.stock_transfers
  for delete using (
    source_site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  );

create policy stock_transfer_lines_select on v2.stock_transfer_lines
  for select using (
    transfer_id in (
      select id from v2.stock_transfers
      where source_site_id in (select v2.user_site_ids())
         or dest_site_id in (select v2.user_site_ids())
    )
  );

create policy stock_transfer_lines_insert on v2.stock_transfer_lines
  for insert with check (
    transfer_id in (
      select t.id from v2.stock_transfers t
      join v2.memberships m on m.site_id = t.source_site_id
      where m.user_id = auth.uid()
        and m.role in (
          'owner', 'manager', 'chef',
          'sous_chef', 'commis',
          'bartender', 'head_bartender'
        )
    )
  );

create policy stock_transfer_lines_update on v2.stock_transfer_lines
  for update using (
    transfer_id in (
      select t.id from v2.stock_transfers t
      join v2.memberships m
        on m.site_id = t.source_site_id or m.site_id = t.dest_site_id
      where m.user_id = auth.uid()
        and m.role in (
          'owner', 'manager', 'chef',
          'sous_chef', 'commis',
          'bartender', 'head_bartender'
        )
    )
  );

create policy stock_transfer_lines_delete on v2.stock_transfer_lines
  for delete using (
    transfer_id in (
      select t.id from v2.stock_transfers t
      join v2.memberships m on m.site_id = t.source_site_id
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'chef')
    )
  );
