-- Migration: archive legacy public.* tables to legacy_archive schema
-- Date: 2026-05-14
-- Applied: 2026-05-14 (run via MCP apply_migration; MCP-verified post-run that all 12 tables relocated to legacy_archive with row counts intact (user_data: 2 rows, 17 recipes in JSONB blob; admin_audit_log: 37 rows), both RLS helper functions moved, anon + authenticated have zero schema USAGE on legacy_archive, service_role retains USAGE)
--
-- Path B greenfield rewrite (2026-05-14 final lock) made the legacy v1 app
-- code frozen under legacy/ and gave v2 its own schema. The public.* tables
-- those legacy migrations created are no longer touched by the live src/
-- app — both Supabase clients pin db.schema='v2'. The previous cleanup
-- migration (20260514_drop_legacy_signup_trigger.sql) removed the duplicate
-- signup trigger, so public.user_data/accounts/account_members stop accruing
-- rows on new signups.
--
-- This migration moves the legacy table inventory + its two RLS helper
-- functions into a separate legacy_archive schema. anon/authenticated lose
-- access entirely; service_role retains USAGE for emergency recovery.
-- Data is preserved verbatim — ALTER ... SET SCHEMA is metadata-only,
-- no row rewrites. Indexes, RLS policies, triggers, and constraints all
-- travel with each table.
--
-- Verified before authoring:
--   - no FKs into these tables from outside public (v2.*, auth.*)
--   - no FKs out of these tables either (legacy relied on app-level
--     integrity, not DB constraints)
--   - no sequences owned by these tables (all PKs are uuid)
--   - the two helper functions move alongside because the RLS policies
--     calling them live on the tables that are moving

create schema if not exists legacy_archive;

-- Schema is the boundary. Default Postgres ACL on a new schema permits
-- only the owner; defensive REVOKEs guard against Supabase auto-grants;
-- service_role keeps USAGE so admin tools can still see the data.
revoke all on schema legacy_archive from public;
revoke usage on schema legacy_archive from anon, authenticated;
grant usage on schema legacy_archive to service_role;

-- Move tables. Order doesn't matter — no FKs to anything outside public,
-- and FKs between these tables travel with the referencing side.
alter table public.accounts             set schema legacy_archive;
alter table public.account_members      set schema legacy_archive;
alter table public.account_invites      set schema legacy_archive;
alter table public.user_data            set schema legacy_archive;
alter table public.outlets              set schema legacy_archive;
alter table public.purchase_orders      set schema legacy_archive;
alter table public.purchase_order_items set schema legacy_archive;
alter table public.admin_audit_log      set schema legacy_archive;
alter table public.anthropic_usage      set schema legacy_archive;
alter table public.app_settings         set schema legacy_archive;
alter table public.blog_posts           set schema legacy_archive;
alter table public.waitlist             set schema legacy_archive;

-- Helper functions used by the (now moved) tables' RLS policies.
alter function public.is_account_member(uuid) set schema legacy_archive;
alter function public.role_at_least(uuid, text) set schema legacy_archive;
