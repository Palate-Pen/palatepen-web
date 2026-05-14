-- v2 migration: grant Supabase roles access to the v2 schema
-- Date: 2026-05-14
--
-- The foundation migration created the schema, tables, and RLS policies
-- but didn't grant USAGE on the schema or table privileges to the
-- Supabase roles (anon / authenticated / service_role). Without these,
-- PostgREST returns "permission denied for schema v2" on every request
-- regardless of RLS.
--
-- This migration adds the grants. Idempotent — safe to re-run.

-- Schema usage
grant usage on schema v2 to anon, authenticated, service_role;

-- Table CRUD for authenticated (RLS still scopes per-row)
grant select, insert, update, delete on all tables in schema v2 to authenticated;
grant all on all tables in schema v2 to service_role;

-- Sequences
grant usage, select on all sequences in schema v2 to authenticated, service_role;

-- Default privileges — any future table or sequence in v2 inherits these
alter default privileges in schema v2
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema v2
  grant all on tables to service_role;
alter default privileges in schema v2
  grant usage, select on sequences to authenticated, service_role;

-- Enum types
grant usage on type v2.shell_role to anon, authenticated, service_role;

-- Security-definer helper functions
grant execute on function v2.user_site_ids() to authenticated, service_role;
grant execute on function v2.user_account_ids() to authenticated, service_role;
