-- v2 migration: recipe tags + notebook→recipe linking
-- Date: 2026-05-15
-- Applied: 2026-05-15 (MCP apply_migration; verified recipes.tags + notebook_entries.linked_recipe_ids + 2 GIN indexes)
--
-- Two small adds that unlock the Tier A cross-shell batch:
--
-- 1. v2.recipes.tags jsonb default '[]'::jsonb — ad-hoc tags on recipes
--    + cocktail specs. Chef shell filters /recipes by tag; bar shell
--    filters /bartender/specs the same way. Stored as a JSON string
--    array; UI surfaces as chip input.
--
-- 2. v2.notebook_entries.linked_recipe_ids uuid[] default '{}' —
--    array of recipe IDs the entry references. Lets notebook entries
--    point at the dishes/specs they're notes about. Used for the
--    bidirectional "Linked notes" panel on recipe + spec detail pages.
--    No FK enforced (uuid[] doesn't support per-element FK); we filter
--    out stale ids at read time.
--
-- Indexes:
--   - GIN on recipes.tags so 'where tags @> ["seasonal"]' is fast.
--   - GIN on notebook_entries.linked_recipe_ids for reverse lookup
--     'where linked_recipe_ids && ARRAY[recipe_id]'.

alter table v2.recipes
  add column if not exists tags jsonb not null default '[]'::jsonb;

alter table v2.notebook_entries
  add column if not exists linked_recipe_ids uuid[] not null default '{}';

create index if not exists recipes_tags_idx
  on v2.recipes using gin (tags);

create index if not exists notebook_entries_linked_recipe_ids_idx
  on v2.notebook_entries using gin (linked_recipe_ids);
