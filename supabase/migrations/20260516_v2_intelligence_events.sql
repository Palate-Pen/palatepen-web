-- v2 migration: intelligence_events outbox queue
-- Date: 2026-05-16
-- Applied: 2026-05-16 (manual run via Supabase SQL editor)
--
-- The transactional outbox for the intelligence layer. Postgres triggers
-- on each significant write-path table insert a row here; a server-side
-- drainer (inline from server actions + a 1-minute cron) consumes rows
-- and routes them to the matching forward-signal detectors.
--
-- Why outbox + drainer rather than direct trigger calls:
--   1. Vercel functions cannot LISTEN on Postgres; we need to materialise
--      the event as a row so any consumer can pick it up.
--   2. Idempotent retry: processed_at lets the drainer skip rows already
--      handled, so the cron is safe to re-run.
--   3. Debug + audit: a chef who asks "why did the system flag this?"
--      can trace through the events queue to the detector that ran.
--
-- The drainer never deletes rows. processed_at marks success; older rows
-- are reaped by a separate retention sweep (>90 days, written later).

create type v2.intelligence_event_kind as enum (
  'invoice.confirmed',
  'invoice.flagged',
  'prep.completed',
  'prep.added',
  'delivery.received',
  'delivery.expected',
  'recipe.updated',
  'recipe.costed',
  'ingredient.price_changed',
  'waste.logged',
  'transfer.received',
  'po.received',
  'menu.published',
  'safety.probe_logged',
  'safety.incident_logged',
  'safety.cleaning_done',
  'safety.training_added'
);

create table v2.intelligence_events (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,
  kind v2.intelligence_event_kind not null,

  -- Free-form context for the detector: row id, qty, supplier_id, etc.
  -- Keep it small; large blobs do not belong here.
  payload jsonb not null default '{}'::jsonb,

  -- The row that triggered the event, when applicable. Lets the drainer
  -- skip work if the row has since been deleted.
  source_table text,
  source_id uuid,

  -- Drainer lifecycle. processed_at != null means a drainer pass handled
  -- this event. error_text records failure for offline inspection.
  emitted_at timestamptz not null default now(),
  processed_at timestamptz,
  error_text text,

  created_at timestamptz not null default now()
);

create index intelligence_events_unprocessed_idx
  on v2.intelligence_events(site_id, emitted_at)
  where processed_at is null;

create index intelligence_events_site_kind_idx
  on v2.intelligence_events(site_id, kind, emitted_at desc);

-- RLS: chefs do not read or write this table directly. The trigger fn
-- runs as security definer; the drainer uses the service role.
alter table v2.intelligence_events enable row level security;

create policy intelligence_events_select on v2.intelligence_events
  for select using (
    site_id in (select v2.user_site_ids())
    and exists (
      select 1 from v2.memberships m
      where m.user_id = auth.uid()
        and m.site_id = intelligence_events.site_id
        and m.role in ('owner', 'manager')
    )
  );

comment on table v2.intelligence_events is
  'Transactional outbox for the intelligence layer. Triggers insert; drainer consumes; LookingAhead reads forward_signals downstream.';
