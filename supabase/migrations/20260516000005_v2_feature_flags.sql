-- v2 migration: feature_flags overlay
-- Date: 2026-05-16
-- Applied: 2026-05-16 (manual run via Supabase SQL editor)
--
-- Per-membership feature flags. Each row is an override on top of the
-- role-default for a given feature. Owners (Group tier) edit these from
-- /owner/team across every owned site; managers (Kitchen tier) edit
-- inside their single site for up to 5 users.
--
-- The feature key list lives in src/lib/features.ts as FEATURE_REGISTRY.
-- Adding a feature is a code change, not a schema change. The enabled
-- column is the override: NULL is "inherit role default", true/false
-- are explicit overrides.

create table v2.feature_flags (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references v2.memberships(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null,
  set_by uuid references auth.users(id) on delete set null,
  set_at timestamptz not null default now(),

  unique (membership_id, feature_key)
);

create index feature_flags_membership_idx
  on v2.feature_flags(membership_id);

-- RLS: anyone can see flags for memberships at sites they belong to.
-- Only owner+manager can write.
alter table v2.feature_flags enable row level security;

create policy feature_flags_select on v2.feature_flags
  for select using (
    membership_id in (
      select id from v2.memberships
      where site_id in (select v2.user_site_ids())
    )
  );

create policy feature_flags_insert on v2.feature_flags
  for insert with check (
    membership_id in (
      select m.id from v2.memberships m
      join v2.memberships viewer on viewer.site_id = m.site_id
      where viewer.user_id = auth.uid()
        and viewer.role in ('owner', 'manager')
    )
  );

create policy feature_flags_update on v2.feature_flags
  for update using (
    membership_id in (
      select m.id from v2.memberships m
      join v2.memberships viewer on viewer.site_id = m.site_id
      where viewer.user_id = auth.uid()
        and viewer.role in ('owner', 'manager')
    )
  );

create policy feature_flags_delete on v2.feature_flags
  for delete using (
    membership_id in (
      select m.id from v2.memberships m
      join v2.memberships viewer on viewer.site_id = m.site_id
      where viewer.user_id = auth.uid()
        and viewer.role in ('owner', 'manager')
    )
  );

comment on table v2.feature_flags is
  'Per-membership override on top of role-default feature gating. Source of truth for which features each team member can use.';
