-- Cleanup migration: drop the legacy public.handle_new_user signup trigger + fn
-- Date: 2026-05-14
--
-- The v2 foundation migration (20260514_v2_foundation.sql) added a parallel
-- signup hook (v2_on_auth_user_created → v2.handle_new_user) that creates the
-- v2.accounts/v2.sites/v2.memberships rows for every new auth.users insert.
-- The legacy public.handle_new_user trigger is still firing on the same event
-- and writing duplicate-but-stale rows into public.accounts,
-- public.account_members, and public.user_data — tables that nothing in the
-- current src/ codebase reads (the v2 Supabase clients pin db.schema = 'v2').
--
-- Verified before authoring:
--   - public.handle_new_user is referenced by exactly one trigger
--     (on_auth_user_created on auth.users); no other triggers, no other PL
--     functions, no live code under src/ calls it.
--   - The v2 trigger is in place and writes the data the running app actually
--     uses (verified via MCP introspection of v2.handle_new_user + the
--     v2_on_auth_user_created trigger).
--
-- This migration does NOT touch the legacy public.* tables themselves —
-- they still hold real pre-rewrite user history. Archival/drop is a
-- separate decision.

drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.handle_new_user();
