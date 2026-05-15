/* eslint-disable no-console */
/*
 * setup-001-intelligence-foundation.js
 *
 * Writes the three SQL migrations that land the intelligence event-bus
 * foundation + per-user feature-flag overlay:
 *
 *   20260516_v2_intelligence_events.sql
 *   20260516_v2_intelligence_event_emitters.sql
 *   20260516_v2_feature_flags.sql
 *
 * Run from the repo root with:
 *   node scripts/setup-001-intelligence-foundation.js
 *
 * Then apply each file in the Supabase SQL editor (in order). Once
 * applied, add an "-- Applied: YYYY-MM-DD (...)" breadcrumb to the file
 * header per the migration convention in CLAUDE.md.
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.resolve(
  __dirname,
  '..',
  'supabase',
  'migrations',
);

function write(filename, body) {
  const out = path.join(MIGRATIONS_DIR, filename);
  fs.writeFileSync(out, body, { encoding: 'utf8' });
  console.log('wrote', out);
}

// ---------------------------------------------------------------------
// 1. intelligence_events queue table
// ---------------------------------------------------------------------
const eventsMigration = `-- v2 migration: intelligence_events outbox queue
-- Date: 2026-05-16
--
-- The transactional outbox for the intelligence layer. Postgres triggers
-- on each significant write-path table insert a row here; a server-side
-- drainer (inline from server actions + a 1-minute cron) consumes rows
-- and routes them to the matching forward-signal detectors.
--
-- Why outbox + drainer rather than direct trigger calls:
--   1. Vercel functions cannot LISTEN on Postgres; we need to materialise
--      the event as a row so any consumer can pick it up.
--   2. Idempotent retry: processed_at lets the drainer skip rows already
--      handled, so the cron is safe to re-run.
--   3. Debug + audit: a chef who asks "why did the system flag this?"
--      can trace through the events queue to the detector that ran.
--
-- The drainer never deletes rows. processed_at marks success; older rows
-- are reaped by a separate retention sweep (>90 days, written later).

create type v2.intelligence_event_kind as enum (
  'invoice.confirmed',
  'invoice.flagged',
  'prep.completed',
  'prep.added',
  'delivery.received',
  'delivery.expected',
  'recipe.updated',
  'recipe.costed',
  'ingredient.price_changed',
  'waste.logged',
  'transfer.received',
  'po.received',
  'menu.published',
  'safety.probe_logged',
  'safety.incident_logged',
  'safety.cleaning_done',
  'safety.training_added'
);

create table v2.intelligence_events (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,
  kind v2.intelligence_event_kind not null,

  -- Free-form context for the detector: row id, qty, supplier_id, etc.
  -- Keep it small; large blobs do not belong here.
  payload jsonb not null default '{}'::jsonb,

  -- The row that triggered the event, when applicable. Lets the drainer
  -- skip work if the row has since been deleted.
  source_table text,
  source_id uuid,

  -- Drainer lifecycle. processed_at != null means a drainer pass handled
  -- this event. error_text records failure for offline inspection.
  emitted_at timestamptz not null default now(),
  processed_at timestamptz,
  error_text text,

  created_at timestamptz not null default now()
);

create index intelligence_events_unprocessed_idx
  on v2.intelligence_events(site_id, emitted_at)
  where processed_at is null;

create index intelligence_events_site_kind_idx
  on v2.intelligence_events(site_id, kind, emitted_at desc);

-- RLS: chefs do not read or write this table directly. The trigger fn
-- runs as security definer; the drainer uses the service role.
alter table v2.intelligence_events enable row level security;

create policy intelligence_events_select on v2.intelligence_events
  for select using (
    site_id in (select v2.user_site_ids())
    and exists (
      select 1 from v2.memberships m
      where m.user_id = auth.uid()
        and m.site_id = intelligence_events.site_id
        and m.role in ('owner', 'manager')
    )
  );

comment on table v2.intelligence_events is
  'Transactional outbox for the intelligence layer. Triggers insert; drainer consumes; LookingAhead reads forward_signals downstream.';
`;

// ---------------------------------------------------------------------
// 2. trigger functions + per-table triggers
// ---------------------------------------------------------------------
const emittersMigration = `-- v2 migration: intelligence_event_emitters
-- Date: 2026-05-16
--
-- One trigger function per write-path table that matters. Each function
-- builds a small payload (row id + the fields the detector needs) and
-- inserts into v2.intelligence_events. The drainer downstream maps event
-- kind to the relevant detectors.
--
-- Triggers are AFTER INSERT/UPDATE because we want the row committed
-- before the drainer can re-read it. Triggers are STATEMENT-level where
-- possible for efficiency; row-level where the per-row payload matters.

-- ---------------------------------------------------------------------
-- 1. invoices: confirmed + flagged are the interesting states.
-- ---------------------------------------------------------------------
create or replace function v2.emit_invoice_event() returns trigger
  language plpgsql security definer as $$
begin
  if (new.status = 'confirmed' and (old is null or old.status <> 'confirmed')) then
    insert into v2.intelligence_events (site_id, kind, payload, source_table, source_id)
    values (
      new.site_id, 'invoice.confirmed',
      jsonb_build_object('invoice_id', new.id, 'supplier_id', new.supplier_id, 'total', new.total),
      'v2.invoices', new.id
    );
  elsif (new.status = 'flagged' and (old is null or old.status <> 'flagged')) then
    insert into v2.intelligence_events (site_id, kind, payload, source_table, source_id)
    values (
      new.site_id, 'invoice.flagged',
      jsonb_build_object('invoice_id', new.id, 'supplier_id', new.supplier_id),
      'v2.invoices', new.id
    );
  end if;
  return new;
end$$;

create trigger invoices_emit_event
  after insert or update of status on v2.invoices
  for each row execute function v2.emit_invoice_event();

-- ---------------------------------------------------------------------
-- 2. prep_items: status changes (added / completed) + new rows.
-- ---------------------------------------------------------------------
create or replace function v2.emit_prep_event() returns trigger
  language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    insert into v2.intelligence_events (site_id, kind, payload, source_table, source_id)
    values (
      new.site_id, 'prep.added',
      jsonb_build_object('prep_id', new.id, 'recipe_id', new.recipe_id, 'prep_date', new.prep_date),
      'v2.prep_items', new.id
    );
  elsif (tg_op = 'UPDATE' and new.status = 'done' and old.status <> 'done') then
    insert into v2.intelligence_events (site_id, kind, payload, source_table, source_id)
    values (
      new.site_id, 'prep.completed',
      jsonb_build_object('prep_id', new.id, 'recipe_id', new.recipe_id, 'prep_date', new.prep_date),
      'v2.prep_items', new.id
    );
  end if;
  return new;
end$$;

create trigger prep_items_emit_event
  after insert or update of status on v2.prep_items
  for each row execute function v2.emit_prep_event();

-- ---------------------------------------------------------------------
-- 3. deliveries: arrival events + expected-date scheduling.
-- ---------------------------------------------------------------------
create or replace function v2.emit_delivery_event() returns trigger
  language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT' and new.expected_at is not null) then
    insert into v2.intelligence_events (site_id, kind, payload, source_table, source_id)
    values (
      new.site_id, 'delivery.expected',
      jsonb_build_object('delivery_id', new.id, 'supplier_id', new.supplier_id, 'expected_at', new.expected_at),
      'v2.deliveries', new.id
    );
  elsif (new.received_at is not null and (old is null or old.received_at is null)) then
    insert into v2.intelligence_events (site_id, kind, payload, source_table, source_id)
    values (
      new.site_id, 'delivery.received',
      jsonb_build_object('delivery_id', new.id, 'supplier_id', new.supplier_id, 'received_at', new.received_at),
      'v2.deliveries', new.id
    );
  end if;
  return new;
end$$;

create trigger deliveries_emit_event
  after insert or update of received_at on v2.deliveries
  for each row execute function v2.emit_delivery_event();

-- ---------------------------------------------------------------------
-- 4. recipes: cost baseline updates + general edits.
-- ---------------------------------------------------------------------
create or replace function v2.emit_recipe_event() returns trigger
  language plpgsql security definer as $$
begin
  if (tg_op = 'UPDATE' and new.cost_baseline is distinct from old.cost_baseline) then
    insert into v2.intelligence_events (site_id, kind, payload, source_table, source_id)
    values (
      new.site_id, 'recipe.costed',
      jsonb_build_object('recipe_id', new.id, 'cost_baseline', new.cost_baseline),
      'v2.recipes', new.id
    );
  elsif (tg_op = 'INSERT' or new.name is distinct from old.name or new.sell_price is distinct from old.sell_price) then
    insert into v2.intelligence_events (site_id, kind, payload, source_table, source_id)
    values (
      new.site_id, 'recipe.updated',
      jsonb_build_object('recipe_id', new.id),
      'v2.recipes', new.id
    );
  end if;
  return new;
end$$;

create trigger recipes_emit_event
  after insert or update on v2.recipes
  for each row execute function v2.emit_recipe_event();

-- ---------------------------------------------------------------------
-- 5. ingredients: price changes are the only event worth emitting.
-- ---------------------------------------------------------------------
create or replace function v2.emit_ingredient_event() returns trigger
  language plpgsql security definer as $$
begin
  if (new.current_price is distinct from old.current_price) then
    insert into v2.intelligence_events (site_id, kind, payload, source_table, source_id)
    values (
      new.site_id, 'ingredient.price_changed',
      jsonb_build_object(
        'ingredient_id', new.id,
        'old_price', old.current_price,
        'new_price', new.current_price
      ),
      'v2.ingredients', new.id
    );
  end if;
  return new;
end$$;

create trigger ingredients_emit_event
  after update of current_price on v2.ingredients
  for each row execute function v2.emit_ingredient_event();

-- ---------------------------------------------------------------------
-- 6. waste_entries: every log is interesting (drives waste_gap detector).
-- ---------------------------------------------------------------------
create or replace function v2.emit_waste_event() returns trigger
  language plpgsql security definer as $$
begin
  insert into v2.intelligence_events (site_id, kind, payload, source_table, source_id)
  values (
    new.site_id, 'waste.logged',
    jsonb_build_object(
      'waste_id', new.id,
      'ingredient_id', new.ingredient_id,
      'value', new.value,
      'logged_at', new.logged_at
    ),
    'v2.waste_entries', new.id
  );
  return new;
end$$;

create trigger waste_entries_emit_event
  after insert on v2.waste_entries
  for each row execute function v2.emit_waste_event();

-- ---------------------------------------------------------------------
-- 7. stock_transfers: received-status flips drive Looking Ahead inbound clears.
-- ---------------------------------------------------------------------
create or replace function v2.emit_transfer_event() returns trigger
  language plpgsql security definer as $$
begin
  if (new.status = 'received' and (old is null or old.status <> 'received')) then
    insert into v2.intelligence_events (site_id, kind, payload, source_table, source_id)
    values (
      new.dest_site_id, 'transfer.received',
      jsonb_build_object(
        'transfer_id', new.id,
        'source_site_id', new.source_site_id,
        'source_pool', new.source_pool,
        'dest_pool', new.dest_pool
      ),
      'v2.stock_transfers', new.id
    );
  end if;
  return new;
end$$;

create trigger stock_transfers_emit_event
  after insert or update of status on v2.stock_transfers
  for each row execute function v2.emit_transfer_event();

-- ---------------------------------------------------------------------
-- 8. purchase_orders: received flips clear inbound alerts.
-- ---------------------------------------------------------------------
create or replace function v2.emit_po_event() returns trigger
  language plpgsql security definer as $$
begin
  if (new.status = 'received' and (old is null or old.status <> 'received')) then
    insert into v2.intelligence_events (site_id, kind, payload, source_table, source_id)
    values (
      new.site_id, 'po.received',
      jsonb_build_object('po_id', new.id, 'supplier_id', new.supplier_id),
      'v2.purchase_orders', new.id
    );
  end if;
  return new;
end$$;

create trigger purchase_orders_emit_event
  after insert or update of status on v2.purchase_orders
  for each row execute function v2.emit_po_event();
`;

// ---------------------------------------------------------------------
// 3. feature_flags overlay
// ---------------------------------------------------------------------
const flagsMigration = `-- v2 migration: feature_flags overlay
-- Date: 2026-05-16
--
-- Per-membership feature flags. Each row is an override on top of the
-- role-default for a given feature. Owners (Group tier) edit these from
-- /owner/team across every owned site; managers (Kitchen tier) edit
-- inside their single site for up to 5 users.
--
-- The feature key list lives in src/lib/features.ts as FEATURE_REGISTRY.
-- Adding a feature is a code change, not a schema change. The enabled
-- column is the override: NULL is "inherit role default", true/false
-- are explicit overrides.

create table v2.feature_flags (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references v2.memberships(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null,
  set_by uuid references auth.users(id) on delete set null,
  set_at timestamptz not null default now(),

  unique (membership_id, feature_key)
);

create index feature_flags_membership_idx
  on v2.feature_flags(membership_id);

-- RLS: anyone can see flags for memberships at sites they belong to.
-- Only owner+manager can write.
alter table v2.feature_flags enable row level security;

create policy feature_flags_select on v2.feature_flags
  for select using (
    membership_id in (
      select id from v2.memberships
      where site_id in (select v2.user_site_ids())
    )
  );

create policy feature_flags_insert on v2.feature_flags
  for insert with check (
    membership_id in (
      select m.id from v2.memberships m
      join v2.memberships viewer on viewer.site_id = m.site_id
      where viewer.user_id = auth.uid()
        and viewer.role in ('owner', 'manager')
    )
  );

create policy feature_flags_update on v2.feature_flags
  for update using (
    membership_id in (
      select m.id from v2.memberships m
      join v2.memberships viewer on viewer.site_id = m.site_id
      where viewer.user_id = auth.uid()
        and viewer.role in ('owner', 'manager')
    )
  );

create policy feature_flags_delete on v2.feature_flags
  for delete using (
    membership_id in (
      select m.id from v2.memberships m
      join v2.memberships viewer on viewer.site_id = m.site_id
      where viewer.user_id = auth.uid()
        and viewer.role in ('owner', 'manager')
    )
  );

comment on table v2.feature_flags is
  'Per-membership override on top of role-default feature gating. Source of truth for which features each team member can use.';
`;

write('20260516_v2_intelligence_events.sql', eventsMigration);
write('20260516_v2_intelligence_event_emitters.sql', emittersMigration);
write('20260516_v2_feature_flags.sql', flagsMigration);

console.log('\ndone. apply in this order in the Supabase SQL editor:');
console.log('  1. 20260516_v2_intelligence_events.sql');
console.log('  2. 20260516_v2_intelligence_event_emitters.sql');
console.log('  3. 20260516_v2_feature_flags.sql');
