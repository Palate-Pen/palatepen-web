-- v2 migration: deliveries — supplier ETAs the kitchen plans around
-- Date: 2026-05-14
-- Applied: 2026-05-14 (run via MCP apply_migration; MCP-verified table + delivery_status enum + RLS + 4 policies (SIUD) + 3 indexes + touch_updated_at trigger all in place)
--
-- A row per expected delivery from a supplier. The chef logs / the
-- supplier API populates "Reza Tuesday" with an expected_at date and a
-- rough line/value estimate. When the invoice for that delivery is
-- scanned (v2.invoices.delivery_id FK), the delivery's status flips to
-- 'arrived'.
--
-- Day-not-time language: expected_at + arrived_at are both DATE (no
-- timestamps). Chefs know roughly when suppliers come; pretending to
-- minute precision breaks the voice rules.
--
-- Status enum keeps only durable states:
--   expected   default — supplier is on the way
--   arrived    invoice scanned + matched OR chef ticked the delivery
--   missed     expected_at passed and nothing arrived
--   cancelled  explicitly cancelled (rare)
-- "Due soon" / "tomorrow" / "today" are UI labels computed from
-- expected_at vs now() — not durable statuses.

create type v2.delivery_status as enum ('expected', 'arrived', 'missed', 'cancelled');

create table v2.deliveries (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,
  supplier_id uuid not null references v2.suppliers(id) on delete cascade,

  expected_at date not null,
  arrived_at date,

  status v2.delivery_status not null default 'expected',

  -- Pre-arrival estimates the chef sets when planning the week. Don't
  -- need to be precise — they back the hub's "Mon 18 May · £390 of
  -- meat" forecast badges.
  line_count_estimate int,
  value_estimate numeric(10, 2),

  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index deliveries_site_expected_idx
  on v2.deliveries(site_id, expected_at desc);
create index deliveries_supplier_idx on v2.deliveries(supplier_id);
create index deliveries_open_idx
  on v2.deliveries(site_id, expected_at)
  where status = 'expected' and archived_at is null;

create trigger deliveries_touch_updated_at
  before update on v2.deliveries
  for each row execute function v2.touch_updated_at();

-- ---------------------------------------------------------------------
-- RLS — site-scoped via the foundation helper
-- ---------------------------------------------------------------------
alter table v2.deliveries enable row level security;

create policy deliveries_select on v2.deliveries
  for select using (site_id in (select v2.user_site_ids()));

create policy deliveries_insert on v2.deliveries
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy deliveries_update on v2.deliveries
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy deliveries_delete on v2.deliveries
  for delete using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager')
    )
  );
