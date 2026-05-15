-- v2 migration: safety_event_emitters
-- Date: 2026-05-16
-- Applied: 2026-05-16 (manual run via Supabase SQL editor)
--
-- Triggers on the four daily-use safety tables that fan write events
-- into v2.intelligence_events. The drainer picks them up and routes to
-- the relevant detectors (cert expiry, missing opening check, temp
-- drift) for forward_signals emission.
--
-- Wiring up follow-on detectors for these kinds (safety.probe_logged,
-- safety.incident_logged, safety.cleaning_done, safety.training_added)
-- lives in src/lib/event-drain.ts and src/lib/signal-detectors.ts.
-- This file only emits the events.

create or replace function v2.emit_safety_opening_check_event() returns trigger
  language plpgsql security definer as $$
begin
  insert into v2.intelligence_events (site_id, kind, payload, source_table, source_id)
  values (
    new.site_id, 'safety.cleaning_done',   -- reuses cleaning_done kind for daily check completion
    jsonb_build_object('check_id', new.id, 'check_date', new.check_date),
    'v2.safety_opening_checks', new.id
  );
  return new;
end$$;

create trigger safety_opening_checks_emit_event
  after insert on v2.safety_opening_checks
  for each row execute function v2.emit_safety_opening_check_event();

create or replace function v2.emit_safety_probe_event() returns trigger
  language plpgsql security definer as $$
begin
  insert into v2.intelligence_events (site_id, kind, payload, source_table, source_id)
  values (
    new.site_id, 'safety.probe_logged',
    jsonb_build_object(
      'probe_id', new.id,
      'kind', new.kind,
      'temperature_c', new.temperature_c,
      'passed', new.passed
    ),
    'v2.safety_probe_readings', new.id
  );
  return new;
end$$;

create trigger safety_probe_readings_emit_event
  after insert on v2.safety_probe_readings
  for each row execute function v2.emit_safety_probe_event();

create or replace function v2.emit_safety_incident_event() returns trigger
  language plpgsql security definer as $$
begin
  insert into v2.intelligence_events (site_id, kind, payload, source_table, source_id)
  values (
    new.site_id, 'safety.incident_logged',
    jsonb_build_object('incident_id', new.id, 'kind', new.kind),
    'v2.safety_incidents', new.id
  );
  return new;
end$$;

create trigger safety_incidents_emit_event
  after insert on v2.safety_incidents
  for each row execute function v2.emit_safety_incident_event();

create or replace function v2.emit_safety_cleaning_signoff_event() returns trigger
  language plpgsql security definer as $$
begin
  insert into v2.intelligence_events (site_id, kind, payload, source_table, source_id)
  values (
    new.site_id, 'safety.cleaning_done',
    jsonb_build_object('signoff_id', new.id, 'task_id', new.task_id),
    'v2.safety_cleaning_signoffs', new.id
  );
  return new;
end$$;

create trigger safety_cleaning_signoffs_emit_event
  after insert on v2.safety_cleaning_signoffs
  for each row execute function v2.emit_safety_cleaning_signoff_event();

create or replace function v2.emit_safety_training_event() returns trigger
  language plpgsql security definer as $$
begin
  insert into v2.intelligence_events (site_id, kind, payload, source_table, source_id)
  values (
    new.site_id, 'safety.training_added',
    jsonb_build_object(
      'training_id', new.id,
      'kind', new.kind,
      'expires_on', new.expires_on
    ),
    'v2.safety_training', new.id
  );
  return new;
end$$;

create trigger safety_training_emit_event
  after insert or update of expires_on on v2.safety_training
  for each row execute function v2.emit_safety_training_event();
