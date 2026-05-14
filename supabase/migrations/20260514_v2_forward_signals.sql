-- v2 migration: forward_signals — the forward-intelligence engine's output
-- Date: 2026-05-14
-- Applied: 2026-05-14 (run via MCP apply_migration; MCP-verified post-run that the table, signal_tag + signal_severity enums, RLS, both policies (select + update), 2 indexes (dedupe unique + live lookup), and the touch_updated_at trigger landed cleanly)
--
-- One row per detected signal worth surfacing on a Looking Ahead
-- section. Detectors (Vercel cron route handlers under /api/cron/*)
-- compute aggregations on v2.* read-only and upsert rows here keyed by
-- (site_id, detector_kind, detector_key). Looking Ahead components on
-- each shell surface query this table filtered by site + target_surface
-- where dismissed_at is null and (expires_at is null or expires_at > now()).
--
-- Voice rule (see [[palatable-voice]] memory): the system reports what
-- it detected, never what it thinks the chef should do. Detector copy
-- should follow "X is drifting up", "Six deliveries booked next week"
-- not "We recommend X" or "AI suggests Y".
--
-- Tag variants (matching design system v8):
--   plan_for_it  — actionable next step (payment run due, order cutoff)
--   get_ready    — temporal trigger approaching (heavy delivery Monday)
--   worth_knowing — pattern detected, no urgent action (waste creeping)
--   market_move  — cross-pattern signal (tahini up at multiple suppliers)
--
-- Severity stripes the card border + section label colour:
--   urgent     — red, immediate impact (dish bleeding margin today)
--   attention  — amber, soft drift worth watching
--   healthy    — green, positive signal worth celebrating
--   info       — gold (default), forward-looking observation

create type v2.signal_tag as enum
  ('plan_for_it', 'get_ready', 'worth_knowing', 'market_move');

create type v2.signal_severity as enum
  ('urgent', 'attention', 'healthy', 'info');

create table v2.forward_signals (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,

  -- routing: which surface's Looking Ahead this lands on
  target_surface text not null
    check (target_surface in (
      'home', 'prep', 'recipes', 'menus', 'margins',
      'stock-suppliers', 'notebook', 'inbox'
    )),
  -- nullable: when set, only visible to memberships matching the role
  target_role v2.shell_role,

  -- presentation
  tag v2.signal_tag not null,
  severity v2.signal_severity not null default 'info',
  section_label text not null,

  -- copy (headline is split so the emphasised noun can render italic gold)
  headline_pre text,
  headline_em text,
  headline_post text,
  body_md text not null,
  action_label text,
  action_target text,
  action_context text,

  -- lifecycle + dedupe
  detector_kind text not null,
  detector_key text,
  payload jsonb not null default '{}'::jsonb,

  display_priority int not null default 0,

  emitted_at timestamptz not null default now(),
  expires_at timestamptz,
  dismissed_at timestamptz,
  acted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Dedupe upserts from cron re-runs: a detector can claim one signal per key per site
create unique index forward_signals_dedupe_idx
  on v2.forward_signals(site_id, detector_kind, detector_key)
  where detector_key is not null;

-- Fast lookup for Looking Ahead rendering on each surface
create index forward_signals_live_idx
  on v2.forward_signals(site_id, target_surface, display_priority desc, emitted_at desc)
  where dismissed_at is null;

create trigger forward_signals_touch_updated_at
  before update on v2.forward_signals
  for each row execute function v2.touch_updated_at();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
-- INSERT path: cron detectors run with service_role and bypass RLS.
-- Authenticated chefs cannot insert — signals are system-emitted.
-- UPDATE: chefs can mark a signal dismissed_at or acted_at.
-- DELETE: not policy-allowed; signals expire via expires_at instead.
alter table v2.forward_signals enable row level security;

create policy forward_signals_select on v2.forward_signals
  for select using (
    site_id in (select v2.user_site_ids())
    and (
      target_role is null
      or exists (
        select 1 from v2.memberships m
        where m.user_id = auth.uid()
          and m.site_id = forward_signals.site_id
          and m.role = forward_signals.target_role
      )
    )
  );

-- Chefs/managers/owners can mark a signal dismissed or acted-on; nothing else.
create policy forward_signals_update on v2.forward_signals
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );
