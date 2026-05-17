-- v2 migration: user_preferences — per-user functional preferences
-- Date: 2026-05-14
-- Applied: 2026-05-14 (run via MCP apply_migration; table + 4 RLS policies + touch trigger in place)
--
-- Stores per-user toggles that aren't accessibility (those are
-- localStorage-only, handled by AccessibilitySettings.tsx) and aren't
-- entity flags on a row. Things like:
--
--   auto_bank_invoices            after scan + line review, confirm
--                                 immediately rather than parking in
--                                 the awaiting list
--   looking_ahead_notifications   send the user an email digest when
--                                 high-priority forward_signals land
--                                 (notifier not yet implemented)
--   team_view_notebook            controls the DEFAULT 'shared' flag
--                                 when this user creates a notebook
--                                 entry (the per-entry shared column
--                                 still wins — this is the chef's
--                                 starting position)
--
-- Single JSONB blob rather than a column per pref so adding the next
-- toggle doesn't require a migration. If a pref ever needs to be
-- queried across users (e.g., "send the notification digest to everyone
-- with notifications=true"), denormalise into its own column then.
--
-- RLS: each user reads + writes their own row only.

create table v2.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_preferences_touch_updated_at
  before update on v2.user_preferences
  for each row execute function v2.touch_updated_at();

alter table v2.user_preferences enable row level security;

create policy user_preferences_select on v2.user_preferences
  for select using (user_id = auth.uid());

create policy user_preferences_insert on v2.user_preferences
  for insert with check (user_id = auth.uid());

create policy user_preferences_update on v2.user_preferences
  for update using (user_id = auth.uid());

create policy user_preferences_delete on v2.user_preferences
  for delete using (user_id = auth.uid());
