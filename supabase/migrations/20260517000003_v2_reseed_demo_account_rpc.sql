-- v2 migration: reseed_demo_account() RPC
-- Date: 2026-05-17
-- Applied: 2026-05-17 (via Supabase MCP apply_migration)
--
-- Re-anchors every time-sensitive row on a demo account back to "now".
-- Companion to reseed_founder_demo() which operates on one site at a
-- time; this one fans across every site of a given account AND covers
-- the safety_* tables that the founder RPC doesn't touch.
--
-- Returns a jsonb { total_rows_shifted, delta_seconds, delta_days,
-- per_site_rpc[], safety: { opening_checks, probes, signoffs,
-- incidents, training } } so the caller can show a breakdown.
--
-- The anchor is computed inside the function (most recent timestamp
-- across the account's forward_signals + safety_probe_readings +
-- ingredient_price_history). Caller doesn't need to pre-compute.

create or replace function v2.reseed_demo_account(
  p_account_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = v2, public
as $$
declare
  v_anchor timestamptz;
  v_delta_seconds bigint;
  v_interval interval;
  v_site_ids uuid[];
  v_site_id uuid;
  v_per_site jsonb := '[]'::jsonb;
  v_site_result jsonb;
  v_opening_checks_shifted integer := 0;
  v_probes_shifted integer := 0;
  v_signoffs_shifted integer := 0;
  v_incidents_shifted integer := 0;
  v_training_shifted integer := 0;
begin
  -- Gather the account's sites
  select array_agg(id) into v_site_ids
  from v2.sites
  where account_id = p_account_id;

  if v_site_ids is null or array_length(v_site_ids, 1) = 0 then
    return jsonb_build_object('error', 'no_sites_on_account');
  end if;

  -- Find anchor — the most recent timestamp anywhere on the account.
  -- Look at forward_signals first, then safety probes, then price
  -- history. If all three are empty we can't compute a delta.
  select max(t) into v_anchor from (
    select max(emitted_at) as t
      from v2.forward_signals
      where site_id = any(v_site_ids)
    union all
    select max(logged_at)
      from v2.safety_probe_readings
      where site_id = any(v_site_ids)
    union all
    select max(recorded_at)
      from v2.ingredient_price_history
      where ingredient_id in (
        select id from v2.ingredients where site_id = any(v_site_ids)
      )
    union all
    select max(logged_at)
      from v2.waste_entries
      where site_id = any(v_site_ids)
  ) sources;

  if v_anchor is null then
    return jsonb_build_object('error', 'no_anchor_timestamp');
  end if;

  v_delta_seconds := extract(epoch from (now() - v_anchor))::bigint;
  v_interval := (v_delta_seconds || ' seconds')::interval;

  -- Fan out across each site — delegate the non-safety table shift to
  -- the existing reseed_founder_demo RPC. Same delta across all sites
  -- so they stay in lockstep.
  foreach v_site_id in array v_site_ids loop
    v_site_result := v2.reseed_founder_demo(v_site_id, v_delta_seconds::integer);
    v_per_site := v_per_site || jsonb_build_object(
      'site_id', v_site_id,
      'tables', v_site_result
    );
  end loop;

  -- Safety table shifts (not covered by reseed_founder_demo)

  -- opening checks: check_date is a date, created_at is tstz
  update v2.safety_opening_checks
  set check_date = (check_date::timestamp + v_interval)::date,
      created_at = created_at + v_interval
  where site_id = any(v_site_ids);
  get diagnostics v_opening_checks_shifted = row_count;

  -- probe readings: logged_at tstz
  update v2.safety_probe_readings
  set logged_at = logged_at + v_interval
  where site_id = any(v_site_ids);
  get diagnostics v_probes_shifted = row_count;

  -- cleaning sign-offs: completed_at tstz
  update v2.safety_cleaning_signoffs
  set completed_at = completed_at + v_interval
  where site_id = any(v_site_ids);
  get diagnostics v_signoffs_shifted = row_count;

  -- incidents: occurred_at + resolved_at tstz
  update v2.safety_incidents
  set occurred_at = occurred_at + v_interval,
      resolved_at = case when resolved_at is null then null
                         else resolved_at + v_interval end,
      created_at = created_at + v_interval
  where site_id = any(v_site_ids);
  get diagnostics v_incidents_shifted = row_count;

  -- training: awarded_on + expires_on (both dates)
  update v2.safety_training
  set awarded_on = (awarded_on::timestamp + v_interval)::date,
      expires_on = case when expires_on is null then null
                        else (expires_on::timestamp + v_interval)::date end
  where site_id = any(v_site_ids);
  get diagnostics v_training_shifted = row_count;

  return jsonb_build_object(
    'account_id', p_account_id,
    'site_count', array_length(v_site_ids, 1),
    'delta_seconds', v_delta_seconds,
    'delta_days', round(v_delta_seconds / 86400.0),
    'anchor', v_anchor,
    'per_site', v_per_site,
    'safety', jsonb_build_object(
      'opening_checks', v_opening_checks_shifted,
      'probe_readings', v_probes_shifted,
      'cleaning_signoffs', v_signoffs_shifted,
      'incidents', v_incidents_shifted,
      'training', v_training_shifted
    )
  );
end;
$$;

revoke all on function v2.reseed_demo_account(uuid) from public;
grant execute on function v2.reseed_demo_account(uuid) to authenticated;
grant execute on function v2.reseed_demo_account(uuid) to service_role;
