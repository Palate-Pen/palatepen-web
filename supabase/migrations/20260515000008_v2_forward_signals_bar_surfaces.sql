-- v2 migration: widen forward_signals.target_surface CHECK for bar surfaces
-- Date: 2026-05-15
-- Applied: 2026-05-15 (via MCP execute_sql; logged here for trail completeness)
--
-- The original CHECK on v2.forward_signals.target_surface was
--   ('home','prep','recipes','menus','margins','stock-suppliers','notebook','inbox')
-- — chef-only. Bar shell adds bar_home / mise / specs / bar_menus /
-- bar_margins / back_bar / cellar as their own surfaces (matches the
-- LookingAhead TargetSurface union in src/components/shell/LookingAhead.tsx).

alter table v2.forward_signals
  drop constraint if exists forward_signals_target_surface_check;

alter table v2.forward_signals
  add constraint forward_signals_target_surface_check
  check (target_surface = ANY (ARRAY[
    'home', 'prep', 'recipes', 'menus', 'margins',
    'stock-suppliers', 'notebook', 'inbox',
    'bar_home', 'mise', 'specs', 'bar_menus', 'bar_margins',
    'back_bar', 'cellar'
  ]::text[]));
