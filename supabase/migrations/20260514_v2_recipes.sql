-- v2 migration: recipes + recipe_ingredients — the costing primitive
-- Date: 2026-05-14
-- Applied: 2026-05-14 (run via MCP apply_migration; MCP-verified post-run that both tables, RLS, all 8 policies, 3 indexes, and the touch_updated_at trigger landed cleanly)
--
-- A recipe is a dish definition: name, menu section, yield, sell price,
-- prep notes, and an ordered list of ingredients. Ingredients link back
-- to v2.ingredients (so The Bank's live prices flow through to recipe
-- cost) but the link is nullable — chefs can type a free-text ingredient
-- that hasn't been matched to The Bank yet without losing the qty/unit.
--
-- Cost-per-cover is computed at read time from
-- (sum(qty × current_price) / serves × portion_per_cover). The denormalised
-- price on v2.ingredients lets that compute stay fast without joining
-- through ingredient_price_history. When a Bank price moves, every
-- recipe using that ingredient picks up the new cost immediately —
-- this is the "auto-maintained costing" wedge from the strategy doc.

-- ---------------------------------------------------------------------
-- 1. Recipes
-- ---------------------------------------------------------------------
create table v2.recipes (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references v2.sites(id) on delete cascade,

  name text not null,
  menu_section text
    check (menu_section in ('starters', 'mains', 'grill', 'sides', 'desserts', 'drinks')),

  -- yield
  serves int,
  portion_per_cover numeric(5, 2),

  -- pricing
  sell_price numeric(10, 2),

  -- chef-authored prep instructions, free text
  notes text,

  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipes_site_id_idx on v2.recipes(site_id) where archived_at is null;
create index recipes_site_section_idx on v2.recipes(site_id, menu_section) where archived_at is null;

create trigger recipes_touch_updated_at
  before update on v2.recipes
  for each row execute function v2.touch_updated_at();

-- ---------------------------------------------------------------------
-- 2. Recipe ingredients — ordered list per recipe
-- ---------------------------------------------------------------------
-- ingredient_id is nullable so free-text "tahini" still saves even if
-- the chef hasn't yet matched it to a Bank entry. name + qty + unit
-- carry the value until the match happens.
create table v2.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references v2.recipes(id) on delete cascade,
  ingredient_id uuid references v2.ingredients(id) on delete set null,

  name text not null,
  qty numeric(10, 3) not null,
  unit text not null,

  position int not null default 0,
  created_at timestamptz not null default now()
);

create index recipe_ingredients_recipe_idx
  on v2.recipe_ingredients(recipe_id, position);

-- ---------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------
alter table v2.recipes enable row level security;
alter table v2.recipe_ingredients enable row level security;

-- Recipes — same site-scoped pattern as suppliers/ingredients
create policy recipes_select on v2.recipes
  for select using (site_id in (select v2.user_site_ids()));

create policy recipes_insert on v2.recipes
  for insert with check (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy recipes_update on v2.recipes
  for update using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy recipes_delete on v2.recipes
  for delete using (
    site_id in (
      select m.site_id from v2.memberships m
      where m.user_id = auth.uid() and m.role in ('owner', 'manager')
    )
  );

-- Recipe ingredients — derive site scope through the parent recipe
create policy recipe_ingredients_select on v2.recipe_ingredients
  for select using (
    recipe_id in (
      select id from v2.recipes where site_id in (select v2.user_site_ids())
    )
  );

create policy recipe_ingredients_insert on v2.recipe_ingredients
  for insert with check (
    recipe_id in (
      select r.id from v2.recipes r
      join v2.memberships m on m.site_id = r.site_id
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy recipe_ingredients_update on v2.recipe_ingredients
  for update using (
    recipe_id in (
      select r.id from v2.recipes r
      join v2.memberships m on m.site_id = r.site_id
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );

create policy recipe_ingredients_delete on v2.recipe_ingredients
  for delete using (
    recipe_id in (
      select r.id from v2.recipes r
      join v2.memberships m on m.site_id = r.site_id
      where m.user_id = auth.uid() and m.role in ('owner', 'manager', 'chef')
    )
  );
