-- v2 migration: extend reseed_founder_demo() to shift menu_plans dates
-- Date: 2026-05-15
--
-- The 2026-05-15 reseed RPC was written before menu_plans landed
-- (#91). When /admin/ops "Reseed" runs, all the other surfaces re-
-- anchor to today but the Menu Planner's "target launch" date stays
-- frozen at whatever it was originally seeded with, breaking the
-- "X days to launch" KPI on the Planning surface.
--
-- This migration replaces the function body in-place. Same signature,
-- same return shape — just shifts two extra tables.

create or replace function v2.reseed_founder_demo(
  p_site_id uuid,
  p_delta_seconds integer
) returns jsonb
language plpgsql
security definer
set search_path = v2, public
as $$
declare
  v_interval interval := (p_delta_seconds || ' seconds')::interval;
  v_signals_shifted integer;
  v_prep_shifted integer;
  v_deliveries_shifted integer;
  v_invoices_shifted integer;
  v_price_history_shifted integer;
  v_ingredients_shifted integer;
  v_waste_shifted integer;
  v_notebook_shifted integer;
  v_recipes_shifted integer;
  v_stock_takes_shifted integer;
  v_allocations_shifted integer;
  v_credit_notes_shifted integer;
  v_menu_plans_shifted integer;
begin
  update v2.forward_signals
  set emitted_at = emitted_at + v_interval,
      expires_at = case when expires_at is null then null
                        else expires_at + v_interval end,
      dismissed_at = null,
      acted_at = null
  where site_id = p_site_id;
  get diagnostics v_signals_shifted = row_count;

  update v2.prep_items
  set prep_date = (prep_date::timestamp + v_interval)::date,
      started_at = case when started_at is null then null
                        else started_at + v_interval end,
      finished_at = case when finished_at is null then null
                          else finished_at + v_interval end
  where site_id = p_site_id;
  get diagnostics v_prep_shifted = row_count;

  update v2.deliveries
  set expected_at = case when expected_at is null then null
                         else (expected_at::timestamp + v_interval)::date end,
      arrived_at = case when arrived_at is null then null
                        else (arrived_at::timestamp + v_interval)::date end
  where site_id = p_site_id;
  get diagnostics v_deliveries_shifted = row_count;

  update v2.invoices
  set issued_at = case when issued_at is null then null
                       else (issued_at::timestamp + v_interval)::date end,
      received_at = received_at + v_interval
  where site_id = p_site_id;
  get diagnostics v_invoices_shifted = row_count;

  update v2.ingredient_price_history
  set recorded_at = recorded_at + v_interval
  where ingredient_id in (select id from v2.ingredients where site_id = p_site_id);
  get diagnostics v_price_history_shifted = row_count;

  update v2.ingredients
  set last_seen_at = case when last_seen_at is null then null
                          else last_seen_at + v_interval end
  where site_id = p_site_id;
  get diagnostics v_ingredients_shifted = row_count;

  update v2.waste_entries
  set logged_at = logged_at + v_interval
  where site_id = p_site_id;
  get diagnostics v_waste_shifted = row_count;

  update v2.notebook_entries
  set captured_at = captured_at + v_interval
  where site_id = p_site_id;
  get diagnostics v_notebook_shifted = row_count;

  update v2.recipes
  set costed_at = case when costed_at is null then null
                       else costed_at + v_interval end
  where site_id = p_site_id;
  get diagnostics v_recipes_shifted = row_count;

  update v2.stock_takes
  set conducted_at = conducted_at + v_interval
  where site_id = p_site_id;
  get diagnostics v_stock_takes_shifted = row_count;

  update v2.allocations
  set expected_date = case when expected_date is null then null
                            else (expected_date::timestamp + v_interval)::date end
  where ingredient_id in (select id from v2.ingredients where site_id = p_site_id);
  get diagnostics v_allocations_shifted = row_count;

  update v2.credit_notes
  set sent_at = case when sent_at is null then null else sent_at + v_interval end,
      resolved_at = case when resolved_at is null then null else resolved_at + v_interval end,
      cancelled_at = case when cancelled_at is null then null else cancelled_at + v_interval end
  where site_id = p_site_id;
  get diagnostics v_credit_notes_shifted = row_count;

  -- Menu plans: shift target_launch + finalised_at + archived_at so the
  -- planner's "X days to launch" countdown re-centres on today.
  update v2.menu_plans
  set target_launch = case when target_launch is null then null
                            else (target_launch::timestamp + v_interval)::date end,
      finalised_at = case when finalised_at is null then null
                           else finalised_at + v_interval end,
      archived_at = case when archived_at is null then null
                          else archived_at + v_interval end
  where site_id = p_site_id;
  get diagnostics v_menu_plans_shifted = row_count;

  return jsonb_build_object(
    'forward_signals', v_signals_shifted,
    'prep_items', v_prep_shifted,
    'deliveries', v_deliveries_shifted,
    'invoices', v_invoices_shifted,
    'ingredient_price_history', v_price_history_shifted,
    'ingredients', v_ingredients_shifted,
    'waste_entries', v_waste_shifted,
    'notebook_entries', v_notebook_shifted,
    'recipes', v_recipes_shifted,
    'stock_takes', v_stock_takes_shifted,
    'allocations', v_allocations_shifted,
    'credit_notes', v_credit_notes_shifted,
    'menu_plans', v_menu_plans_shifted
  );
end;
$$;
