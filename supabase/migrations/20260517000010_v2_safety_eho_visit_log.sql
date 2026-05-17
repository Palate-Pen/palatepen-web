-- v2 migration: extend safety_eho_visits for the inspection control desk
-- Date: 2026-05-17
-- Applied: 2026-05-17 (npx supabase db push --include-all)
--
-- The skeleton table landed in 20260516000009 (Week 1 safety mega-batch)
-- with inspector_name + inspector_authority + outcome columns. This
-- migration adds the live-visit pieces the EHO Visit Mode UX needs:
--
--   inspector_id_shown   the EHO's badge / ID number, captured during
--                        the first minute of the visit
--   visit_type           routine / follow_up / complaint / spot_check
--                        / other (the visit category an EHO declares)
--   visit_log            JSONB array of timestamped events captured by
--                        the chef during the inspection:
--                        [{ at: iso, tag: 'arrival'|'note'|'observed'|
--                                       'requested'|'action',
--                           body: text, by: user_id }]
--
-- RLS policy loosened so chefs can append log entries during an active
-- visit (previously owner/manager only). Starting and ending a visit
-- stay locked to owner/manager — chefs can only WRITE the visit_log on
-- an existing row, not insert new visits.

alter table v2.safety_eho_visits
  add column if not exists inspector_id_shown text,
  add column if not exists visit_type text,
  add column if not exists visit_log jsonb not null default '[]'::jsonb;

alter table v2.safety_eho_visits
  drop constraint if exists safety_eho_visits_visit_type_check;
alter table v2.safety_eho_visits
  add constraint safety_eho_visits_visit_type_check
  check (visit_type in (
    'routine', 'follow_up', 'complaint', 'spot_check', 'other'
  ) or visit_type is null);

-- Drop the old owner/manager-only ALL policy and replace with split
-- INSERT/UPDATE-by-role policies, so chefs can append to visit_log
-- on an existing visit but cannot start, end, or delete one.

drop policy if exists safety_eho_visits_all on v2.safety_eho_visits;

create policy safety_eho_visits_select on v2.safety_eho_visits
  for select using (site_id in (select v2.user_site_ids()));

create policy safety_eho_visits_insert on v2.safety_eho_visits
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'deputy_manager')
    )
  );

create policy safety_eho_visits_update on v2.safety_eho_visits
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in (
          'owner', 'manager', 'deputy_manager',
          'head_chef', 'sous_chef', 'chef',
          'head_bartender', 'bartender', 'supervisor'
        )
    )
  );

create policy safety_eho_visits_delete on v2.safety_eho_visits
  for delete using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  );
