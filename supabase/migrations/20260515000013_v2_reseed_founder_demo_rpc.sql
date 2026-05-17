-- v2 migration: reseed_founder_demo() RPC
-- Date: 2026-05-15
-- Applied: 2026-05-15 (MCP apply_migration; verified function exists + security definer + grants to authenticated + service_role)
--
-- Re-anchors every time-sensitive table on a given site by the supplied
-- delta. Called from /admin/ops by the founder; bypasses RLS by virtue
-- of running as the function owner (security definer).
--
-- Returns a jsonb object { table_name: rows_shifted } so the caller can
-- show a breakdown of what moved.
--
-- Why a single function: chef demos need to look live ON DEMAND. The
-- founder clicks one button, every surface re-anchors to today —
-- prep board fills with today's items, signals reappear on Inbox,
-- deliveries land in the right week, price history sparklines slide
-- forward. This is the operational equivalent of "rewind to today".
--
-- Idempotency: calling twice in a row has delta ≈ 0 the second time
-- (the first call moved the anchor to "now") so it's safe to spam.

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
begin
  -- forward_signals: shift dates + clear dismissed/acted so insights reappear
  update v2.forward_signals
  set emitted_at = emitted_at + v_interval,
      expires_at = case when expires_at is null then null
                        else expires_at + v_interval end,
      dismissed_at = null,
      acted_at = null
  where site_id = p_site_id;
  get diagnostics v_signals_shifted = row_count;

  -- prep_items: prep_date is a date (cast through timestamp), started_at /
  -- finished_at are timestamps. No 'due_at' on this table — that was a
  -- mis-spec from earlier; the actual canonical "when" is prep_date.
  update v2.prep_items
  set prep_date = (prep_date::timestamp + v_interval)::date,
      started_at = case when started_at is null then null
                        else started_at + v_interval end,
      finished_at = case when finished_at is null then null
                          else finished_at + v_interval end
  where site_id = p_site_id;
  get diagnostics v_prep_shifted = row_count;

  -- deliveries: expected_at + arrived_at (both dates). Note: column is
  -- expected_at not expected_date — naming inconsistent with allocations
  -- which uses expected_date.
  update v2.deliveries
  set expected_at = case when expected_at is null then null
                         else (expected_at::timestamp + v_interval)::date end,
      arrived_at = case when arrived_at is null then null
                        else (arrived_at::timestamp + v_interval)::date end
  where site_id = p_site_id;
  get diagnostics v_deliveries_shifted = row_count;

  -- invoices: issued_at + received_at (dates)
  update v2.invoices
  set issued_at = case when issued_at is null then null
                       else (issued_at::timestamp + v_interval)::date end,
      received_at = (received_at::timestamp + v_interval)::date
  where site_id = p_site_id;
  get diagnostics v_invoices_shifted = row_count;

  -- ingredient_price_history.recorded_at (joined via ingredients.site_id)
  update v2.ingredient_price_history
  set recorded_at = recorded_at + v_interval
  where ingredient_id in (
    select id from v2.ingredients where site_id = p_site_id
  );
  get diagnostics v_price_history_shifted = row_count;

  -- ingredients.last_seen_at
  update v2.ingredients
  set last_seen_at = case when last_seen_at is null then null
                          else last_seen_at + v_interval end
  where site_id = p_site_id;
  get diagnostics v_ingredients_shifted = row_count;

  -- waste_entries.logged_at
  update v2.waste_entries
  set logged_at = logged_at + v_interval
  where site_id = p_site_id;
  get diagnostics v_waste_shifted = row_count;

  -- notebook_entries.created_at + updated_at
  update v2.notebook_entries
  set created_at = created_at + v_interval,
      updated_at = updated_at + v_interval
  where site_id = p_site_id;
  get diagnostics v_notebook_shifted = row_count;

  -- recipes.costed_at (drives the staleness detector)
  update v2.recipes
  set costed_at = case when costed_at is null then null
                       else costed_at + v_interval end
  where site_id = p_site_id;
  get diagnostics v_recipes_shifted = row_count;

  -- stock_takes
  update v2.stock_takes
  set conducted_at = conducted_at + v_interval,
      completed_at = case when completed_at is null then null
                          else completed_at + v_interval end
  where site_id = p_site_id;
  get diagnostics v_stock_takes_shifted = row_count;

  -- allocations
  update v2.allocations
  set expected_date = case when expected_date is null then null
                           else (expected_date::timestamp + v_interval)::date end,
      received_at = case when received_at is null then null
                         else (received_at::timestamp + v_interval)::date end
  where site_id = p_site_id;
  get diagnostics v_allocations_shifted = row_count;

  -- credit_notes
  update v2.credit_notes
  set created_at = created_at + v_interval,
      updated_at = updated_at + v_interval,
      sent_at = case when sent_at is null then null
                     else sent_at + v_interval end,
      resolved_at = case when resolved_at is null then null
                          else resolved_at + v_interval end,
      cancelled_at = case when cancelled_at is null then null
                          else cancelled_at + v_interval end
  where site_id = p_site_id;
  get diagnostics v_credit_notes_shifted = row_count;

  return jsonb_build_object(
    'forward_signals', v_signals_shifted,
    'prep_items', v_prep_shifted,
    'deliveries', v_deliveries_shifted,
    'invoices', v_invoices_shifted,
    'ingredient_price_history', v_price_history_shifted,
    'ingredients_last_seen', v_ingredients_shifted,
    'waste_entries', v_waste_shifted,
    'notebook_entries', v_notebook_shifted,
    'recipes_costed', v_recipes_shifted,
    'stock_takes', v_stock_takes_shifted,
    'allocations', v_allocations_shifted,
    'credit_notes', v_credit_notes_shifted
  );
end;
$$;

-- Lock the function so only authenticated users can call it. The
-- application-level admin gate is the real protection.
revoke all on function v2.reseed_founder_demo(uuid, integer) from public;
grant execute on function v2.reseed_founder_demo(uuid, integer) to authenticated;
grant execute on function v2.reseed_founder_demo(uuid, integer) to service_role;
