-- v2 migration: allergens + nutrition columns + recipe lock state
-- Date: 2026-05-14
-- Applied: 2026-05-14 (run via MCP apply_migration; columns added with non-null defaults so existing rows fill in cleanly)
--
-- Brings back legacy Recipe/Bank features that v2 dropped:
--
-- 1. UK FIR 14-allergen tri-state declarations (contains / mayContain)
--    + nut and gluten cereal sub-types. Required for compliance with
--    UK Food Information Regulations 2014 + Natasha's Law (PPDS).
--
--    Stored as a single jsonb column per row so adding a new allergen
--    field doesn't need another migration. Shape:
--      {
--        "contains":      ["gluten", "milk", "nuts"],
--        "mayContain":    ["eggs"],
--        "nutTypes":      ["almond", "hazelnut"],
--        "glutenTypes":   ["wheat"]
--      }
--    All four arrays default to [] when the recipe/ingredient has no
--    allergen data yet.
--
-- 2. Nutrition per-100g on ingredients (and computed per-recipe via
--    aggregation at query time, not denormalised on the recipe row).
--    Same jsonb pattern:
--      {
--        "kcal": 380, "kj": 1590, "fat": 12, "saturates": 4,
--        "carbs": 55, "sugars": 6, "protein": 11, "salt": 0.8,
--        "fibre": 4
--      }
--    All values numeric per-100g/100ml. Nulls allowed where unknown;
--    the FoP traffic-light renderer skips unknown values.
--
-- 3. Recipe lock state — boolean column. When locked, the recipe form
--    refuses edits except by users with manager/owner role (UI gate).
--    Mirrors the legacy editorial-freeze pattern.

alter table v2.recipes
  add column if not exists allergens jsonb not null default '{"contains":[],"mayContain":[],"nutTypes":[],"glutenTypes":[]}'::jsonb,
  add column if not exists locked boolean not null default false,
  add column if not exists photo_url text;

alter table v2.ingredients
  add column if not exists allergens jsonb not null default '{"contains":[],"mayContain":[],"nutTypes":[],"glutenTypes":[]}'::jsonb,
  add column if not exists nutrition jsonb not null default '{}'::jsonb;

comment on column v2.recipes.allergens is
  'UK FIR tri-state allergens: contains / mayContain / nutTypes / glutenTypes. Chef-edited; recipe-level overrides aggregate from linked ingredients.';
comment on column v2.recipes.locked is
  'When true, the recipe form is read-only. Manager/owner role required to flip.';
comment on column v2.recipes.photo_url is
  'Optional Supabase Storage path (bucket: recipe-photos) for the dish photo. Null until uploaded.';

comment on column v2.ingredients.allergens is
  'UK FIR tri-state allergens (same shape as v2.recipes.allergens). Live linked into recipes via recipe_ingredients.ingredient_id.';
comment on column v2.ingredients.nutrition is
  'Nutrition per 100g/100ml: kcal, kj, fat, saturates, carbs, sugars, protein, salt, fibre. All values nullable.';
