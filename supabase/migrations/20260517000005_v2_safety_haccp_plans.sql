-- v2 migration: extend safety_haccp_plans for wizard
-- Date: 2026-05-17
-- Applied: 2026-05-17 (npx supabase db push --include-all)
--
-- The skeleton safety_haccp_plans + safety_haccp_steps tables landed in
-- 20260516000009 (Week 1 safety mega-batch) so foreign keys + RLS were
-- ready ahead of the wizard build. This migration adds the wizard-side
-- fields:
--
--   body          JSONB blob holding per-step content (step_1..step_9
--                 keys; shape documented in src/lib/safety/haccp.ts).
--   current_step  Where the user left off (1..9).
--   signed_off_at signed_off_by — set when the plan moves to signed
--                 status. Required for the EHO-ready document.
--
-- Status check constraint is widened from {draft, active, archived} to
-- {draft, in_progress, review, signed, active, archived} so the wizard
-- can flow draft → in_progress → review → signed; 'active' is kept as
-- an alias the original schema documented for the post-sign-off state.
--
-- A partial apply of an earlier draft of this migration created a
-- v2.haccp_plan_status enum that is no longer referenced by anything.
-- Dropped here so the schema is clean.

drop type if exists v2.haccp_plan_status;

alter table v2.safety_haccp_plans
  alter column name set default 'HACCP plan';

alter table v2.safety_haccp_plans
  add column if not exists body jsonb not null default '{}'::jsonb,
  add column if not exists current_step int not null default 1,
  add column if not exists signed_off_at timestamptz,
  add column if not exists signed_off_by uuid
    references auth.users(id) on delete set null;

alter table v2.safety_haccp_plans
  drop constraint if exists safety_haccp_plans_current_step_check;
alter table v2.safety_haccp_plans
  add constraint safety_haccp_plans_current_step_check
  check (current_step between 1 and 9);

alter table v2.safety_haccp_plans
  drop constraint if exists safety_haccp_plans_status_check;
alter table v2.safety_haccp_plans
  add constraint safety_haccp_plans_status_check
  check (
    status in ('draft', 'in_progress', 'review', 'signed', 'active', 'archived')
  );

-- One active (non-archived) plan per site. Annual review flips the old
-- one to archived before creating the next draft, so the constraint
-- stays satisfied across the rollover.
create unique index if not exists safety_haccp_plans_site_active_idx
  on v2.safety_haccp_plans(site_id) where status != 'archived';
