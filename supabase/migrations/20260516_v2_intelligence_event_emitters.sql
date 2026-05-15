-- v2 migration: intelligence_event_emitters
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
  elsif (new.arrived_at is not null and (old is null or old.arrived_at is null)) then
    insert into v2.intelligence_events (site_id, kind, payload, source_table, source_id)
    values (
      new.site_id, 'delivery.received',
      jsonb_build_object('delivery_id', new.id, 'supplier_id', new.supplier_id, 'arrived_at', new.arrived_at),
      'v2.deliveries', new.id
    );
  end if;
  return new;
end$$;

create trigger deliveries_emit_event
  after insert or update of arrived_at on v2.deliveries
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
