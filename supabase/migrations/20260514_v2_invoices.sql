-- v2 migration: invoices + invoice_lines — the operational moat
-- Date: 2026-05-14
-- Applied: 2026-05-14 (run via MCP apply_migration; MCP-verified both tables + 3 enums (invoice_status / invoice_source / delivery_confirmation) + RLS on both + 8 policies (SIUD per table) + 6 indexes + touch_updated_at trigger on invoices)
--
-- The strategy doc names "auto-maintained costing" as the v1 wedge.
-- This schema is the data plane for it: every invoice scanned by the
-- chef (PDF / photo / email forward / manual entry) lands here. When
-- the invoice is confirmed (chef verified the lines), each line writes
-- to v2.ingredient_price_history, which updates the corresponding
-- v2.ingredients.current_price + last_seen_at — and from there the
-- Bank, recipe costs, and Looking Ahead detectors all see the new
-- prices automatically.
--
-- Status lifecycle:
--   draft       chef started but hasn't saved yet (rare for v1)
--   scanned     AI / OCR extracted lines, awaiting chef confirmation
--   confirmed   chef confirmed → prices banked, recipe costs updated
--   flagged     chef flagged a discrepancy on at least one line
--   rejected    invoice was wrong / duplicate / spam; won't be banked
--
-- Source:
--   scanned     chef uploaded a PDF / photo and hit Scan
--   email       came in via the inbound-email webhook
--   manual      chef typed in by hand (no AI extraction)
--   api         pulled from a supplier API (future)
--
-- Delivery confirmation (chef's "did everything arrive?" check):
--   pending     chef hasn't confirmed delivery match yet
--   confirmed   chef said yes, all good
--   flagged     chef noted at least one discrepancy
--   skipped     chef chose not to do the check this time
--
-- The line-level discrepancy fields on invoice_lines hold the actual
-- detail when delivery_confirmation = 'flagged'.

create type v2.invoice_status as enum
  ('draft', 'scanned', 'confirmed', 'flagged', 'rejected');
create type v2.invoice_source as enum
  ('scanned', 'email', 'manual', 'api');
create type v2.delivery_confirmation as enum
  ('pending', 'confirmed', 'flagged', 'skipped');

-- ---------------------------------------------------------------------
-- 1. invoices — header
-- ---------------------------------------------------------------------
create table v2.invoices (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,
  supplier_id uuid references v2.suppliers(id) on delete set null,
  delivery_id uuid references v2.deliveries(id) on delete set null,

  invoice_number text,
  issued_at date,           -- supplier's printed date — used as recorded_at when writing to price history
  received_at date not null default current_date,

  subtotal numeric(10, 2),  -- net before VAT
  vat numeric(10, 2),
  total numeric(10, 2),

  status v2.invoice_status not null default 'scanned',
  source v2.invoice_source not null default 'manual',
  delivery_confirmation v2.delivery_confirmation not null default 'pending',

  -- raw source pointers — kept for the "open original" link from the
  -- invoice detail view. Storage adapter is application-level (Supabase
  -- Storage, S3, whatever) — this is just the opaque pointer.
  raw_pdf_path text,
  raw_email_id text,

  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index invoices_site_received_idx
  on v2.invoices(site_id, received_at desc);
create index invoices_supplier_idx on v2.invoices(supplier_id);
create index invoices_delivery_idx
  on v2.invoices(delivery_id) where delivery_id is not null;
create index invoices_pending_idx
  on v2.invoices(site_id, status)
  where status in ('scanned', 'flagged');

create trigger invoices_touch_updated_at
  before update on v2.invoices
  for each row execute function v2.touch_updated_at();

-- ---------------------------------------------------------------------
-- 2. invoice_lines — line-item detail
-- ---------------------------------------------------------------------
-- ingredient_id is nullable: AI / chef might log a line we don't have
-- in The Bank yet. Once confirmed, the chef can match it to an existing
-- bank entry OR auto-create a new one, then the FK fills in.
create table v2.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references v2.invoices(id) on delete cascade,
  ingredient_id uuid references v2.ingredients(id) on delete set null,

  raw_name text not null,       -- what the supplier called it on the invoice
  qty numeric(10, 3) not null,
  qty_unit text not null,
  unit_price numeric(10, 4) not null,
  line_total numeric(10, 2),
  vat_rate numeric(5, 2),

  -- Delivery confirmation detail. When delivery_confirmation='flagged'
  -- on the parent invoice, these hold what was wrong with this line.
  --   discrepancy_qty   how much was short (negative) or extra (positive)
  --                     vs what was invoiced
  --   discrepancy_note  chef's free-text reason ("3 packs missing",
  --                     "wrong size came")
  discrepancy_qty numeric(10, 3),
  discrepancy_note text,

  position int not null default 0,
  created_at timestamptz not null default now()
);

create index invoice_lines_invoice_idx
  on v2.invoice_lines(invoice_id, position);
create index invoice_lines_ingredient_idx
  on v2.invoice_lines(ingredient_id)
  where ingredient_id is not null;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table v2.invoices enable row level security;
alter table v2.invoice_lines enable row level security;

create policy invoices_select on v2.invoices
  for select using (site_id in (select v2.user_site_ids()));

create policy invoices_insert on v2.invoices
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy invoices_update on v2.invoices
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy invoices_delete on v2.invoices
  for delete using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager')
    )
  );

-- Invoice lines derive site scope through their parent invoice.
create policy invoice_lines_select on v2.invoice_lines
  for select using (
    invoice_id in (
      select id from v2.invoices where site_id in (select v2.user_site_ids())
    )
  );

create policy invoice_lines_insert on v2.invoice_lines
  for insert with check (
    invoice_id in (
      select inv.id from v2.invoices inv
      join v2.memberships m on m.site_id = inv.site_id
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy invoice_lines_update on v2.invoice_lines
  for update using (
    invoice_id in (
      select inv.id from v2.invoices inv
      join v2.memberships m on m.site_id = inv.site_id
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy invoice_lines_delete on v2.invoice_lines
  for delete using (
    invoice_id in (
      select inv.id from v2.invoices inv
      join v2.memberships m on m.site_id = inv.site_id
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );
