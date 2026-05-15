-- v2 migration: purchase_orders + purchase_order_lines — Phase 3 ordering loop
-- Date: 2026-05-15
-- Applied: pending
--
-- The Phase 3 deliverables on the roadmap include:
--   - Supplier ordering from par levels
--   - Purchase order tracking
--   - Automated reorder suggestions
--
-- All three converge on a single PO entity. This migration is the
-- foundation. The chef sees ingredients below par on The Bank → can
-- one-click drafts a PO grouped by supplier → reviews lines → sends
-- (mailto: or just records "sent") → marks received when stock arrives.
-- Receipt updates the linked deliveries / triggers an invoice-scan
-- prompt downstream (out of scope for this migration).
--
-- Status lifecycle:
--   draft       chef started, not sent — editable
--   sent        chef has emailed / printed / phoned the order — locked
--   confirmed   supplier has confirmed they'll fulfil it — informational
--   received    stock arrived — chef closed the loop
--   cancelled   chef abandoned the order before send
--
-- Reference format is generated app-side as PO-YYYYMMDD-{6-char nanoid}.
-- Unique per site for chef-visible numbering.

create type v2.purchase_order_status as enum
  ('draft', 'sent', 'confirmed', 'received', 'cancelled');

-- ---------------------------------------------------------------------
-- 1. purchase_orders — header
-- ---------------------------------------------------------------------
create table v2.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,
  supplier_id uuid not null references v2.suppliers(id) on delete restrict,

  reference text not null,
  status v2.purchase_order_status not null default 'draft',

  -- Header-level totals are app-computed from lines; cached here so
  -- list views don't need a join + sum on every render.
  total numeric(10, 2) not null default 0,
  currency text not null default 'GBP',

  -- The chef's intended delivery date when drafting. Once received,
  -- received_at is the actual.
  expected_at date,

  sent_at timestamptz,
  confirmed_at timestamptz,
  received_at timestamptz,
  cancelled_at timestamptz,

  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (site_id, reference)
);

create index purchase_orders_site_status_idx
  on v2.purchase_orders(site_id, status, created_at desc);
create index purchase_orders_supplier_idx
  on v2.purchase_orders(supplier_id, created_at desc);

create trigger purchase_orders_touch_updated_at
  before update on v2.purchase_orders
  for each row execute function v2.touch_updated_at();

-- ---------------------------------------------------------------------
-- 2. purchase_order_lines — line-item detail
-- ---------------------------------------------------------------------
create table v2.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references v2.purchase_orders(id) on delete cascade,

  -- Optional link to a Bank ingredient. Free-text when null (chef
  -- typed a non-Bank line, e.g. a sample / one-off).
  ingredient_id uuid references v2.ingredients(id) on delete set null,

  raw_name text not null,
  qty numeric(10, 3) not null,
  qty_unit text not null,

  -- Best estimate at order time. Real price lands when the invoice
  -- scans — that's where supplier reliability gets graded.
  unit_price numeric(10, 4),
  line_total numeric(10, 2),

  position integer not null default 0,
  notes text,

  created_at timestamptz not null default now()
);

create index purchase_order_lines_order_idx
  on v2.purchase_order_lines(purchase_order_id, position);

-- ---------------------------------------------------------------------
-- RLS — site-scoped, same pattern as credit_notes
-- ---------------------------------------------------------------------
alter table v2.purchase_orders enable row level security;
alter table v2.purchase_order_lines enable row level security;

create policy purchase_orders_select on v2.purchase_orders
  for select using (site_id in (select v2.user_site_ids()));

create policy purchase_orders_insert on v2.purchase_orders
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy purchase_orders_update on v2.purchase_orders
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy purchase_orders_delete on v2.purchase_orders
  for delete using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager')
    )
  );

-- Lines inherit access from their parent header.
create policy purchase_order_lines_select on v2.purchase_order_lines
  for select using (
    purchase_order_id in (
      select id from v2.purchase_orders
      where site_id in (select v2.user_site_ids())
    )
  );

create policy purchase_order_lines_insert on v2.purchase_order_lines
  for insert with check (
    purchase_order_id in (
      select po.id from v2.purchase_orders po
      join v2.memberships m on m.site_id = po.site_id
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy purchase_order_lines_update on v2.purchase_order_lines
  for update using (
    purchase_order_id in (
      select po.id from v2.purchase_orders po
      join v2.memberships m on m.site_id = po.site_id
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy purchase_order_lines_delete on v2.purchase_order_lines
  for delete using (
    purchase_order_id in (
      select po.id from v2.purchase_orders po
      join v2.memberships m on m.site_id = po.site_id
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );
