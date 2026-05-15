-- One-off seed top-up for jack@palateandpen.co.uk founder demo
-- Date: 2026-05-15
--
-- After applying:
--   20260515_v2_connections.sql
--   20260515_v2_admin_announcements.sql
--   20260515_v2_reseed_includes_menu_plans.sql
--
-- run this block to populate the three new surfaces with realistic
-- demo state. Then hit /admin/ops "Reseed" to re-anchor every other
-- surface to today.
--
-- Site id is the locked founder demo site:
--   9dc96352-d0eb-407e-a0aa-e59cbd7c0220

-- ---------------------------------------------------------------------
-- 1. Connections — chef has paired POS + Resy + Calendar; left others
-- ---------------------------------------------------------------------
delete from v2.connections
where site_id = '9dc96352-d0eb-407e-a0aa-e59cbd7c0220';

insert into v2.connections (site_id, service, display_name, status, credential, last_synced_at, notes)
values
  ('9dc96352-d0eb-407e-a0aa-e59cbd7c0220', 'square',  'Square — main floor', 'connected',  'sq0_demo_token_********', now() - interval '14 minutes', 'Live since launch. Pulls hourly sales.'),
  ('9dc96352-d0eb-407e-a0aa-e59cbd7c0220', 'resy',    'Resy — dining room',  'connected',  'resy_demo_********',      now() - interval '3 hours',     'Cover forecast feeds Looking Ahead.'),
  ('9dc96352-d0eb-407e-a0aa-e59cbd7c0220', 'gcal',    'Service calendar',    'connected',  'ya29.demo_********',      now() - interval '45 minutes',  'Private events surface as Get-Ready items.'),
  ('9dc96352-d0eb-407e-a0aa-e59cbd7c0220', 'xero',    null,                  'expired',    'xero_demo_********',      now() - interval '11 days',     'Token expired — needs a refresh from the bookkeeper.');

-- ---------------------------------------------------------------------
-- 2. Admin announcement — a fresh "what shipped today" banner
-- ---------------------------------------------------------------------
update v2.admin_announcements set active = false where active = true;

insert into v2.admin_announcements (title, body, severity, active, expires_at, created_by)
select
  'Sub-recipes are live — your stock bases now reprice every dish that uses them.',
  'Open any recipe, add an ingredient row, hit "→ sub-recipe" and pick a mother sauce / brine / stock. Cost flows automatically. Full notes in Recipes.',
  'info',
  true,
  now() + interval '7 days',
  u.id
from auth.users u
where u.email = 'jack@palateandpen.co.uk'
limit 1;

-- ---------------------------------------------------------------------
-- 3. Sub-recipe wiring — link Hummus to the Tahini sauce sub-recipe
-- ---------------------------------------------------------------------
-- (Only runs if Hummus exists and there's an existing recipe with
-- "tahini" in its name we can use as a component. Idempotent.)
do $$
declare
  v_parent_id uuid;
  v_sub_id uuid;
  v_line_id uuid;
begin
  select id into v_parent_id from v2.recipes
   where site_id = '9dc96352-d0eb-407e-a0aa-e59cbd7c0220'
     and lower(name) = 'hummus'
     and archived_at is null
   limit 1;

  -- Pick any other recipe as a hypothetical sub-recipe component for
  -- the demo. In a real build the chef would have already created a
  -- "Tahini sauce" sub-recipe. We grab the next non-Hummus recipe.
  select id into v_sub_id from v2.recipes
   where site_id = '9dc96352-d0eb-407e-a0aa-e59cbd7c0220'
     and id <> coalesce(v_parent_id, '00000000-0000-0000-0000-000000000000'::uuid)
     and dish_type = 'food'
     and archived_at is null
   order by name
   limit 1;

  if v_parent_id is not null and v_sub_id is not null then
    -- Add a sub-recipe line to Hummus pointing at the picked recipe.
    -- Use the highest existing position + 1 so we land at the end.
    insert into v2.recipe_ingredients
      (recipe_id, ingredient_id, sub_recipe_id, name, qty, unit, position)
    select
      v_parent_id,
      null,
      v_sub_id,
      (select name from v2.recipes where id = v_sub_id),
      0.5,
      'portions',
      coalesce(
        (select max(position) + 1 from v2.recipe_ingredients where recipe_id = v_parent_id),
        100
      )
    on conflict do nothing
    returning id into v_line_id;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4. Refresh menu_plans target_launch to a near-future date
-- ---------------------------------------------------------------------
update v2.menu_plans
set target_launch = current_date + interval '31 days',
    finalised_at = null,
    archived_at = null,
    status = 'draft'
where site_id = '9dc96352-d0eb-407e-a0aa-e59cbd7c0220';

-- ---------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------
select
  (select count(*) from v2.connections where site_id = '9dc96352-d0eb-407e-a0aa-e59cbd7c0220') as connections,
  (select count(*) from v2.admin_announcements where active = true) as active_banners,
  (select count(*) from v2.menu_plans where site_id = '9dc96352-d0eb-407e-a0aa-e59cbd7c0220' and archived_at is null) as menu_plans,
  (select count(*) from v2.recipe_ingredients ri
     join v2.recipes r on r.id = ri.recipe_id
     where r.site_id = '9dc96352-d0eb-407e-a0aa-e59cbd7c0220'
       and ri.sub_recipe_id is not null) as sub_recipe_links;
