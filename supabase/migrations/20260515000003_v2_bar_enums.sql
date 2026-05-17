-- v2 migration: bar-shell enum additions
-- Date: 2026-05-15
-- Applied: 2026-05-15 (MCP apply_migration; verified shell_role now has 9 values: owner/manager/chef/viewer/sous_chef/commis/bartender/head_bartender/bar_back, plus 5 new types — dish_type / cocktail_technique / spillage_reason / cellar_unit_type / stock_take_status)
--
-- Part 1 of 2. Postgres quirk: an enum value added in tx T can't be used
-- in the same tx (RLS policy expressions etc.). So this migration extends
-- shell_role + creates the new enums; the follow-up migration creates
-- the tables that USE these values in their policies.
--
-- New role values: sous_chef + commis (chef-side hierarchy), bartender +
-- head_bartender + bar_back (bar-side hierarchy). The bar's role triad
-- mirrors the kitchen's (head_bartender ↔ chef, bartender ↔ sous_chef,
-- bar_back ↔ commis) but they're kept as distinct values because some
-- users will hold dual roles (chef-bartender at small venues) and the
-- shell switcher needs to see both.
--
-- Cross-shell write rule (per design lock with founder, 2026-05-15):
-- PERMISSIVE. Bartender role grants chef-equivalent write access to all
-- recipe/ingredient rows. Shells filter the UI by dish_type. No RLS-by-
-- dish_type partition until a customer asks for it.

alter type v2.shell_role add value if not exists 'sous_chef';
alter type v2.shell_role add value if not exists 'commis';
alter type v2.shell_role add value if not exists 'bartender';
alter type v2.shell_role add value if not exists 'head_bartender';
alter type v2.shell_role add value if not exists 'bar_back';

-- dish_type: discriminator on v2.recipes. The Bartender shell filters
-- to (cocktail, wine, beer, soft, spirit). Chef shell filters to food.
-- Manager + Owner see everything.
create type v2.dish_type as enum
  ('food', 'cocktail', 'wine', 'beer', 'soft', 'spirit');

-- Build technique for cocktail specs. Used in spec detail view + Mise
-- station inference (shake → cocktail station; build → service well).
create type v2.cocktail_technique as enum
  ('build', 'stir', 'shake', 'throw', 'rolled', 'blended');

-- Spillage reasons. Bar-specific column on v2.waste_entries. Distinct
-- from the existing waste_category enum (which is food-flavoured) — bar
-- spillage has its own taxonomy because the operational response is
-- different (over_pour is a training signal, breakage is replacement).
create type v2.spillage_reason as enum
  ('over_pour', 'breakage', 'spillage', 'comp', 'returned', 'expired');

-- Unit type extension for v2.ingredients. Existing rows default to 'g'
-- when their qty_unit looks weight-flavoured; bar bottles get 'bottle'.
-- Used by the Cellar to filter the default view to bar-relevant items.
create type v2.cellar_unit_type as enum
  ('kg', 'g', 'L', 'ml', 'bottle', 'case', 'keg', 'cask', 'each');

-- Stock-take session lifecycle.
create type v2.stock_take_status as enum
  ('in_progress', 'completed', 'cancelled');
