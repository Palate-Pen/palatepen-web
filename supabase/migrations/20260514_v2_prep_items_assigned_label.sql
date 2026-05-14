-- v2 migration: add v2.prep_items.assigned_label
-- Date: 2026-05-14
--
-- Temporary display column for the v1 demo. The Prep page needs to show
-- which brigade member is on each item (Tom / Maria / Sam etc), but
-- proper brigade modelling — adding non-auth-user records to a v2
-- profile/people table that hangs off memberships — is a follow-up.
-- For v1, assigned_user_id stays nullable FK to auth.users, and the
-- Prep page falls back to assigned_label when no real user is linked.
--
-- When brigade modelling lands, a follow-up migration will:
--   1. Backfill assigned_user_id from the new profiles table by
--      matching the label to a profile.display_name.
--   2. DROP COLUMN assigned_label.
-- Until then, the column is the rendering source of truth.

alter table v2.prep_items
  add column assigned_label text;
