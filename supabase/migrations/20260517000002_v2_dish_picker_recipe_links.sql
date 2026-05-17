-- v2 migration: dish-picker recipe_id columns
-- Date: 2026-05-17
-- Applied: 2026-05-17 (run via Supabase SQL editor; adds nullable recipe_id FK + filtered index to v2.waste_entries, v2.safety_cleaning_signoffs, v2.safety_training)
--
-- Adds nullable recipe_id FK to three event tables so the new live
-- DishPicker component can link records back to the dish they belong to.
-- All three columns are nullable on delete set null — the link is
-- contextual, never load-bearing, and a recipe being archived shouldn't
-- orphan history.
--
--   v2.waste_entries.recipe_id           — "200g lamb trim binned during
--                                          slow-cooked lamb shoulder prep"
--   v2.safety_cleaning_signoffs.recipe_id — "ice cream machine cleaned
--                                          after dairy service for knafeh"
--   v2.safety_training.recipe_id         — cert signed off against the
--                                          active menu's allergen profile
--
-- No row-level policies change — site-scoped RLS on each table already
-- gates reads/writes, and recipe_id never widens the visibility scope.

alter table v2.waste_entries
  add column if not exists recipe_id uuid
    references v2.recipes(id) on delete set null;

create index if not exists waste_entries_recipe_idx
  on v2.waste_entries(recipe_id) where recipe_id is not null;

alter table v2.safety_cleaning_signoffs
  add column if not exists recipe_id uuid
    references v2.recipes(id) on delete set null;

create index if not exists safety_cleaning_signoffs_recipe_idx
  on v2.safety_cleaning_signoffs(recipe_id) where recipe_id is not null;

alter table v2.safety_training
  add column if not exists recipe_id uuid
    references v2.recipes(id) on delete set null;

create index if not exists safety_training_recipe_idx
  on v2.safety_training(recipe_id) where recipe_id is not null;
