-- v2 migration: method steps on recipes
-- Date: 2026-05-15
-- Applied: 2026-05-15 (run via MCP apply_migration)
--
-- Adds a jsonb array of method steps to v2.recipes. Stored as a typed
-- array rather than free text so the renderer can number steps and the
-- import flow can split a page's instructions cleanly into the right
-- shape. Legacy stored method this way too (recipe.imported.method).
--
-- Shape:
--   ["Preheat the oven to 180°C.", "Cube the lamb shoulder...", "..."]
--
-- Empty array = no method yet. Display falls back to "see notes" or
-- the empty-state when length is 0.

alter table v2.recipes
  add column if not exists method jsonb not null default '[]'::jsonb;

comment on column v2.recipes.method is
  'Numbered cooking steps as a jsonb array of strings. Empty = no method captured. Populated by AI import or chef edit.';
