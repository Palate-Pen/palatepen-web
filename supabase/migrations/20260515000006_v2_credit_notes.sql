-- v2 migration: credit_notes + credit_note_lines — the third v1 wedge piece
-- Date: 2026-05-15
-- Applied: 2026-05-15 (run via MCP apply_migration; MCP-verified both tables + 2 enums (credit_note_status / credit_note_line_reason) + RLS on both + 8 policies (SIUD per table) + 3 indexes + touch_updated_at trigger on credit_notes + unique on (site_id, reference) and source_invoice_id)
--
-- The strategy doc names three v1 wedge pieces no competitor has:
--   1. Auto-maintained costing (invoices → price history → recipe cost)
--   2. Margin leakage detection (cost spike anticipation)
--   3. Credit note workflow — discrepancies drafted, sent, tracked without chef chasing
--
-- This migration is piece #3. The data flows like this:
--
--   1. Chef flags lines on a scanned invoice (discrepancy_qty / note on
--      v2.invoice_lines — already in place).
--   2. Invoice status flips to 'flagged' on the parent (already in place).
--   3. From the flagged-invoice page, the chef hits "Draft credit note".
--      A row lands in v2.credit_notes (status='draft') with one
--      v2.credit_note_lines per flagged source line.
--   4. Chef reviews, edits, prints (PDF) and emails the supplier — status
--      moves to 'sent' with sent_at = now().
--   5. When the supplier acknowledges / credits the account, chef marks
--      it 'resolved' with resolved_at.
--
-- Status lifecycle:
--   draft       chef started, not sent
--   sent        chef has emailed / printed and sent to supplier
--   resolved    supplier has credited the account (chef confirmed)
--   cancelled   chef abandoned the credit note (e.g. line was correct after all)
--
-- Reasons (per line, why the chef is claiming credit):
--   short       received less qty than invoiced
--   damaged     arrived damaged / unusable
--   wrong_item  not what was ordered
--   wrong_price the price on the invoice doesn't match the agreed price
--   other       free-text reason
--
-- The 1:1 invoice→credit_note relationship is enforced by a unique
-- constraint on source_invoice_id. If a chef needs to raise a second
-- credit note against the same invoice later, the path is to cancel the
-- first one or extend the existing draft — not split into two.
--
-- Reference format is generated app-side as CN-YYYYMMDD-{6-char nanoid}.
-- Unique per site for chef-visible numbering.

create type v2.credit_note_status as enum
  ('draft', 'sent', 'resolved', 'cancelled');

create type v2.credit_note_line_reason as enum
  ('short', 'damaged', 'wrong_item', 'wrong_price', 'other');

-- ---------------------------------------------------------------------
-- 1. credit_notes — header
-- ---------------------------------------------------------------------
create table v2.credit_notes (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,
  supplier_id uuid not null references v2.suppliers(id) on delete restrict,
  source_invoice_id uuid not null references v2.invoices(id) on delete cascade,

  reference text not null,
  status v2.credit_note_status not null default 'draft',
  total numeric(10, 2) not null default 0,
  currency text not null default 'GBP',

  sent_at timestamptz,
  resolved_at timestamptz,
  cancelled_at timestamptz,

  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (site_id, reference),
  unique (source_invoice_id)
);

create index credit_notes_site_status_idx
  on v2.credit_notes(site_id, status, created_at desc);
create index credit_notes_supplier_idx
  on v2.credit_notes(supplier_id, created_at desc);

create trigger credit_notes_touch_updated_at
  before update on v2.credit_notes
  for each row execute function v2.touch_updated_at();

-- ---------------------------------------------------------------------
-- 2. credit_note_lines — line-item detail
-- ---------------------------------------------------------------------
create table v2.credit_note_lines (
  id uuid primary key default gen_random_uuid(),
  credit_note_id uuid not null references v2.credit_notes(id) on delete cascade,
  source_invoice_line_id uuid references v2.invoice_lines(id) on delete set null,

  raw_name text not null,
  qty numeric(10, 3) not null,
  qty_unit text not null,
  unit_price numeric(10, 4) not null,
  line_total numeric(10, 2) not null,

  reason v2.credit_note_line_reason not null default 'short',
  note text,

  position int not null default 0,
  created_at timestamptz not null default now()
);

create index credit_note_lines_cn_idx
  on v2.credit_note_lines(credit_note_id, position);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table v2.credit_notes enable row level security;
alter table v2.credit_note_lines enable row level security;

create policy credit_notes_select on v2.credit_notes
  for select using (site_id in (select v2.user_site_ids()));

create policy credit_notes_insert on v2.credit_notes
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy credit_notes_update on v2.credit_notes
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy credit_notes_delete on v2.credit_notes
  for delete using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager')
    )
  );

create policy credit_note_lines_select on v2.credit_note_lines
  for select using (
    credit_note_id in (
      select id from v2.credit_notes
      where site_id in (select v2.user_site_ids())
    )
  );

create policy credit_note_lines_insert on v2.credit_note_lines
  for insert with check (
    credit_note_id in (
      select cn.id from v2.credit_notes cn
      join v2.memberships m on m.site_id = cn.site_id
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy credit_note_lines_update on v2.credit_note_lines
  for update using (
    credit_note_id in (
      select cn.id from v2.credit_notes cn
      join v2.memberships m on m.site_id = cn.site_id
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy credit_note_lines_delete on v2.credit_note_lines
  for delete using (
    credit_note_id in (
      select cn.id from v2.credit_notes cn
      join v2.memberships m on m.site_id = cn.site_id
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );
