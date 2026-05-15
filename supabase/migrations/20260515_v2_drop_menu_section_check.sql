-- v2 migration: drop the menu_section CHECK on v2.recipes
-- Date: 2026-05-15
-- Applied: 2026-05-15 (via MCP execute_sql; logged here for trail completeness)
--
-- The original CHECK was added in an early foundation migration and
-- limited menu_section to a food-flavoured list:
--   ('starters', 'mains', 'grill', 'sides', 'desserts', 'drinks')
--
-- The bar shell needs richer sub-sections (Classics, Signatures, Tonight
-- Only, Wines By Glass, On Draught, etc) and even the chef shell
-- benefits from flexibility (Snacks, Bread Course, Tasting Menu, Brunch
-- Specials). menu_section now stays free-text; the UI can still offer
-- a curated dropdown if desired.

alter table v2.recipes drop constraint if exists recipes_menu_section_check;
