-- v2 migration: safety_* tables + menu_versions
-- Date: 2026-05-16
--
-- The Palatable Safety v1 backbone. Eight tables that together replace
-- the FSA paper SFBB diary every UK kitchen is legally obliged to keep,
-- plus menu_versions which gives probe readings a stable audit-trail
-- pointer back to whatever menu was live the day a temperature was logged.
--
-- Liability stance: Palatable holds the records; the operator is the
-- legal record-keeper. Every safety surface renders a LiabilityFooter
-- with locked wording. The accounts.safety_enabled flag gates access
-- (added in the companion migration 20260516_v2_accounts_safety_flag);
-- routes refuse to render when the flag is false.
--
-- Pricing: this module is the £20/site uplift on the Kitchen tier
-- (Kitchen+Safety = GBP 99/site/mo, Group+Safety = GBP 149/site/mo).
-- The upsell webhook on the Stripe checkout flips safety_enabled on
-- the account.
--
-- Author note: the handoff doc used venue_id/staff conventions; this
-- file translates everything to v2 (site_id/auth.users + memberships).

-- ---------------------------------------------------------------------
-- 1.1 menu_versions — publish-snapshot for probe audit trail
-- ---------------------------------------------------------------------
-- Probe readings attach to a specific dish at a specific moment. If
-- the menu changes tomorrow, the historical reading still points at
-- the version that was live the day it was logged. v1 stores menu_id
-- as a soft reference (v2.menus doesn't exist yet — chef menus are
-- recipe-category-derived). When v2.menus lands, an after-insert
-- trigger will populate this automatically.

create table v2.menu_versions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,
  menu_id uuid,                            -- nullable until v2.menus exists
  version_number int not null default 1,

  -- Snapshot of the menu state at publish time. JSONB so we don't pin
  -- a schema before the menu shape stabilises. v1 callers can store
  -- [{ recipe_id, name, sell_price, allergens }, ...].
  snapshot jsonb not null default '[]'::jsonb,

  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz not null default now()
);

create index menu_versions_site_published_idx
  on v2.menu_versions(site_id, published_at desc);
create index menu_versions_menu_version_idx
  on v2.menu_versions(menu_id, version_number desc);

alter table v2.menu_versions enable row level security;

create policy menu_versions_select on v2.menu_versions
  for select using (site_id in (select v2.user_site_ids()));

create policy menu_versions_insert on v2.menu_versions
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'chef')
    )
  );

-- ---------------------------------------------------------------------
-- 1.2 safety_opening_checks — daily pre-service SFBB checklist
-- ---------------------------------------------------------------------
-- Five mandatory questions per the FSA SFBB pack:
--   1. Fridges and freezers running at correct temperature
--   2. Probes calibrated
--   3. Cleaning completed yesterday signed off
--   4. No staff sickness in last 48 hours
--   5. Hand-wash stations stocked
-- Stored as a single jsonb so future questions don't need a migration.

create table v2.safety_opening_checks (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,
  completed_by uuid references auth.users(id) on delete set null,

  check_date date not null default current_date,

  -- {fridge_temps: true, probes_calibrated: true, cleaning_signed_off: true,
  --  staff_health: true, handwash_stocked: true, notes: 'optional'}
  answers jsonb not null,

  notes text,
  created_at timestamptz not null default now(),

  unique (site_id, check_date)
);

create index safety_opening_checks_site_date_idx
  on v2.safety_opening_checks(site_id, check_date desc);

alter table v2.safety_opening_checks enable row level security;

create policy safety_opening_checks_select on v2.safety_opening_checks
  for select using (site_id in (select v2.user_site_ids()));

create policy safety_opening_checks_insert on v2.safety_opening_checks
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'chef', 'sous_chef')
    )
  );

create policy safety_opening_checks_update on v2.safety_opening_checks
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'chef', 'sous_chef')
    )
  );

-- ---------------------------------------------------------------------
-- 1.3 safety_probe_readings — temperature logs with menu-version snapshot
-- ---------------------------------------------------------------------

create type v2.probe_kind as enum (
  'fridge', 'freezer', 'hot_hold', 'cooking', 'cooling', 'reheat',
  'delivery', 'core_temp', 'ambient', 'other'
);

create table v2.safety_probe_readings (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,
  logged_by uuid references auth.users(id) on delete set null,

  -- Snapshot pointer for traceability. Optional in v1 (probe may not
  -- attach to a specific dish — e.g. a fridge sweep).
  menu_version_id uuid references v2.menu_versions(id) on delete set null,
  recipe_id uuid references v2.recipes(id) on delete set null,

  kind v2.probe_kind not null,
  -- Where the reading was taken: 'walk-in fridge 1', 'pass holding box', etc.
  location text not null,
  temperature_c numeric(5, 2) not null,

  -- Was the reading within acceptable bounds at the moment of logging?
  -- The lib derives this from FSA standards (fridge <= 8C, freezer <= -18C,
  -- hot hold >= 63C, cooked to >= 75C, etc.). Stored snapshot so a future
  -- change to the FSA reference doesn't rewrite history.
  passed boolean not null,
  threshold_note text,

  notes text,
  logged_at timestamptz not null default now()
);

create index safety_probe_readings_site_logged_idx
  on v2.safety_probe_readings(site_id, logged_at desc);
create index safety_probe_readings_kind_idx
  on v2.safety_probe_readings(site_id, kind, logged_at desc);
create index safety_probe_readings_failed_idx
  on v2.safety_probe_readings(site_id, logged_at desc)
  where passed = false;

alter table v2.safety_probe_readings enable row level security;

create policy safety_probe_readings_select on v2.safety_probe_readings
  for select using (site_id in (select v2.user_site_ids()));

create policy safety_probe_readings_insert on v2.safety_probe_readings
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'chef', 'sous_chef', 'commis')
    )
  );

-- ---------------------------------------------------------------------
-- 1.4 safety_incidents — complaints / allergens / near-misses / illness
-- ---------------------------------------------------------------------

create type v2.incident_kind as enum (
  'complaint', 'allergen', 'near_miss', 'illness'
);

create type v2.allergen_code as enum (
  'celery', 'cereals_with_gluten', 'crustaceans', 'eggs', 'fish',
  'lupin', 'milk', 'molluscs', 'mustard', 'peanuts', 'sesame',
  'soybeans', 'sulphites', 'tree_nuts'
);

create table v2.safety_incidents (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,
  logged_by uuid references auth.users(id) on delete set null,

  kind v2.incident_kind not null,
  occurred_at timestamptz not null default now(),

  summary text not null,
  body_md text,

  -- Dish reference + menu version snapshot for traceability
  recipe_id uuid references v2.recipes(id) on delete set null,
  menu_version_id uuid references v2.menu_versions(id) on delete set null,

  -- For 'allergen' incidents, which of the 14 UK FIR allergens.
  allergens v2.allergen_code[],

  -- Customer context. Optional but useful when an EHO inspector reviews.
  customer_name text,
  customer_contact text,

  -- Resolution log.
  resolved_at timestamptz,
  resolution_md text,

  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create index safety_incidents_site_occurred_idx
  on v2.safety_incidents(site_id, occurred_at desc);
create index safety_incidents_kind_idx
  on v2.safety_incidents(site_id, kind, occurred_at desc);
create index safety_incidents_unresolved_idx
  on v2.safety_incidents(site_id, occurred_at desc)
  where resolved_at is null and archived_at is null;

alter table v2.safety_incidents enable row level security;

create policy safety_incidents_select on v2.safety_incidents
  for select using (site_id in (select v2.user_site_ids()));

create policy safety_incidents_insert on v2.safety_incidents
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'chef', 'sous_chef')
    )
  );

create policy safety_incidents_update on v2.safety_incidents
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'chef')
    )
  );

-- ---------------------------------------------------------------------
-- 1.5 safety_cleaning_tasks + safety_cleaning_signoffs
-- ---------------------------------------------------------------------
-- Tasks are the schedule template ('Mop kitchen floor — daily').
-- Signoffs are the actual completions ('mopped at 23:14 on 2026-05-16').

create type v2.cleaning_frequency as enum (
  'daily', 'weekly', 'monthly', 'quarterly', 'annually'
);

create table v2.safety_cleaning_tasks (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,

  area text not null,                      -- e.g. 'Kitchen', 'Front of house', 'Walk-in'
  task text not null,                      -- e.g. 'Mop floor', 'Deep clean ice machine'
  frequency v2.cleaning_frequency not null,
  notes_md text,

  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index safety_cleaning_tasks_site_freq_idx
  on v2.safety_cleaning_tasks(site_id, frequency)
  where archived_at is null;

create trigger safety_cleaning_tasks_touch_updated_at
  before update on v2.safety_cleaning_tasks
  for each row execute function v2.touch_updated_at();

alter table v2.safety_cleaning_tasks enable row level security;

create policy safety_cleaning_tasks_select on v2.safety_cleaning_tasks
  for select using (site_id in (select v2.user_site_ids()));

create policy safety_cleaning_tasks_insert on v2.safety_cleaning_tasks
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy safety_cleaning_tasks_update on v2.safety_cleaning_tasks
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'chef')
    )
  );

create table v2.safety_cleaning_signoffs (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,
  task_id uuid not null references v2.safety_cleaning_tasks(id) on delete cascade,
  completed_by uuid references auth.users(id) on delete set null,

  completed_at timestamptz not null default now(),
  notes text
);

create index safety_cleaning_signoffs_site_completed_idx
  on v2.safety_cleaning_signoffs(site_id, completed_at desc);
create index safety_cleaning_signoffs_task_idx
  on v2.safety_cleaning_signoffs(task_id, completed_at desc);

alter table v2.safety_cleaning_signoffs enable row level security;

create policy safety_cleaning_signoffs_select on v2.safety_cleaning_signoffs
  for select using (site_id in (select v2.user_site_ids()));

create policy safety_cleaning_signoffs_insert on v2.safety_cleaning_signoffs
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'chef', 'sous_chef', 'commis')
    )
  );

-- ---------------------------------------------------------------------
-- 1.6 safety_training — staff certifications with expiry tracking
-- ---------------------------------------------------------------------

create type v2.training_kind as enum (
  'food_hygiene_l1', 'food_hygiene_l2', 'food_hygiene_l3',
  'allergen_awareness', 'haccp', 'first_aid', 'manual_handling',
  'fire_safety', 'other'
);

create table v2.safety_training (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,

  -- Free text fallback so we can record certs for non-app staff.
  staff_name text not null,

  kind v2.training_kind not null,
  certificate_name text,
  awarding_body text,
  certificate_number text,

  awarded_on date not null,
  expires_on date,

  -- Optional photo / PDF reference in Supabase Storage
  certificate_url text,

  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index safety_training_site_expires_idx
  on v2.safety_training(site_id, expires_on)
  where archived_at is null and expires_on is not null;
create index safety_training_user_idx
  on v2.safety_training(user_id, expires_on)
  where archived_at is null;

create trigger safety_training_touch_updated_at
  before update on v2.safety_training
  for each row execute function v2.touch_updated_at();

alter table v2.safety_training enable row level security;

create policy safety_training_select on v2.safety_training
  for select using (site_id in (select v2.user_site_ids()));

create policy safety_training_insert on v2.safety_training
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  );

create policy safety_training_update on v2.safety_training
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  );

-- ---------------------------------------------------------------------
-- 1.7 safety_haccp_plans + safety_haccp_steps — Week 3 skeletons
-- ---------------------------------------------------------------------
-- Schema lands now so the foreign keys + RLS are ready. UI lives in
-- Slice 7 (the HACCP wizard + EHO Visit batch).

create table v2.safety_haccp_plans (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,

  name text not null,
  scope_md text,                           -- Which products / processes this plan covers

  status text not null default 'draft'     -- draft, active, archived
    check (status in ('draft', 'active', 'archived')),

  reviewed_on date,
  review_due_on date,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index safety_haccp_plans_site_idx on v2.safety_haccp_plans(site_id, status);

create trigger safety_haccp_plans_touch_updated_at
  before update on v2.safety_haccp_plans
  for each row execute function v2.touch_updated_at();

alter table v2.safety_haccp_plans enable row level security;

create policy safety_haccp_plans_all on v2.safety_haccp_plans
  for all using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'chef')
    )
  )
  with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'chef')
    )
  );

create table v2.safety_haccp_steps (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references v2.safety_haccp_plans(id) on delete cascade,

  step_number int not null,                -- 1..9 typically
  step_kind text not null,                 -- 'hazard_analysis', 'ccp', 'limit', 'monitoring', 'corrective', 'verification', 'records', 'review', 'training'
  body_md text not null,

  critical_limit text,                     -- '<= 8C' / '>= 75C' / etc.
  monitoring_procedure text,
  corrective_action text,

  position int not null default 0,
  created_at timestamptz not null default now()
);

create index safety_haccp_steps_plan_idx on v2.safety_haccp_steps(plan_id, position);

alter table v2.safety_haccp_steps enable row level security;

create policy safety_haccp_steps_select on v2.safety_haccp_steps
  for select using (
    plan_id in (
      select id from v2.safety_haccp_plans
      where site_id in (select v2.user_site_ids())
    )
  );

create policy safety_haccp_steps_write on v2.safety_haccp_steps
  for all using (
    plan_id in (
      select p.id from v2.safety_haccp_plans p
      join v2.memberships m on m.site_id = p.site_id
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'chef')
    )
  )
  with check (
    plan_id in (
      select p.id from v2.safety_haccp_plans p
      join v2.memberships m on m.site_id = p.site_id
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'chef')
    )
  );

-- ---------------------------------------------------------------------
-- 1.8 safety_eho_visits — Week 3 skeleton
-- ---------------------------------------------------------------------

create table v2.safety_eho_visits (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,

  visit_start_at timestamptz not null default now(),
  visit_end_at timestamptz,

  inspector_name text,
  inspector_authority text,                -- e.g. 'Camden Council'

  outcome text                             -- 'pass', 'improvements_required', 'failed'
    check (outcome in ('pass', 'improvements_required', 'failed') or outcome is null),
  rating_after int check (rating_after between 0 and 5),

  notes_md text,
  snapshot_url text,                       -- pointer to the exported PDF bundle

  due_at date,                             -- the Looking-Ahead-eligible due date

  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index safety_eho_visits_site_started_idx
  on v2.safety_eho_visits(site_id, visit_start_at desc);
create index safety_eho_visits_due_idx
  on v2.safety_eho_visits(site_id, due_at)
  where due_at is not null and archived_at is null;

create trigger safety_eho_visits_touch_updated_at
  before update on v2.safety_eho_visits
  for each row execute function v2.touch_updated_at();

alter table v2.safety_eho_visits enable row level security;

create policy safety_eho_visits_all on v2.safety_eho_visits
  for all using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  )
  with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  );
