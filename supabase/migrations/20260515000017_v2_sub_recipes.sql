-- v2 migration: sub-recipe support on recipe_ingredients
-- Date: 2026-05-15
-- Applied: 2026-05-15 (MCP apply_migration; verified sub_recipe_id column + partial index)
--
-- A recipe line can reference EITHER:
--   - a Bank ingredient (ingredient_id set)
--   - a free-text ingredient (ingredient_id null, no sub_recipe_id)
--   - another recipe as a sub-recipe (sub_recipe_id set, ingredient_id null)
--
-- The third case is the new one. Mother sauces, stocks, brines —
-- components that the chef builds once and reuses across multiple
-- dishes. Without this, the chef has to retype every component every
-- time, and the cost stays stale when the component's price moves.
--
-- Cost computation walks the chain at read time. To avoid infinite
-- loops (A → B → A), the application layer caps recursion at depth
-- 5 + carries a visited-set. We don't enforce that at the DB layer
-- — a cycle in the data won't crash anything, just stops recursing.
--
-- ON DELETE behaviour: set null. If a chef archives a recipe that
-- another recipe used as a component, the line stays but loses its
-- link and the chef gets a "missing component" indicator on the
-- parent recipe.

alter table v2.recipe_ingredients
  add column if not exists sub_recipe_id uuid
    references v2.recipes(id) on delete set null;

create index if not exists recipe_ingredients_sub_recipe_idx
  on v2.recipe_ingredients(sub_recipe_id)
  where sub_recipe_id is not null;
