-- v2 migration: gp_calculations table
-- Date: 2026-05-15
-- Applied: 2026-05-15 (MCP apply_migration; verified table + RLS + 3 policies + 1 index)
--
-- Persists the ad-hoc GP calculator results from the legacy app. Chefs
-- spin up a dish-by-dish costing as part of menu development, and the
-- legacy version kept the last 30 saved calcs per profile for quick
-- recall. We're matching that pattern.
--
-- The Calc modal lives on chef Recipe detail + bar Spec detail; both
-- read history scoped to the site.
--
-- Stored fields mirror the modal's outputs:
--   dish_name — what the chef called this scratch calc
--   sell_price — what they were costing it at
--   total_cost — computed from lines
--   gp_pct + pour_cost_pct — derived; stored so we don't recompute on read
--   lines jsonb — the per-component breakdown (name, qty, unit, unit_price)
--   notes — optional free text
--
-- No FK back to v2.recipes — these are intentionally separate scratch
-- pads. If the chef wants to make a calc into a real recipe, they
-- create the recipe through the regular form.

create table v2.gp_calculations (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,
  authored_by uuid references auth.users(id) on delete set null,
  dish_name text not null,
  sell_price numeric(10, 2),
  total_cost numeric(10, 2) not null,
  gp_pct numeric(5, 2),
  pour_cost_pct numeric(5, 2),
  lines jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create index gp_calculations_site_recent_idx
  on v2.gp_calculations(site_id, created_at desc);

alter table v2.gp_calculations enable row level security;

create policy gp_calculations_select on v2.gp_calculations
  for select using (site_id in (select v2.user_site_ids()));

create policy gp_calculations_insert on v2.gp_calculations
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'chef', 'sous_chef',
                       'bartender', 'head_bartender')
    )
  );

create policy gp_calculations_delete on v2.gp_calculations
  for delete using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager', 'head_bartender')
    )
  );
