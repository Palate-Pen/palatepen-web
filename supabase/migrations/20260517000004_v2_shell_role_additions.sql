-- v2 migration: shell_role enum additions for the locked role hierarchy
-- Date: 2026-05-17
-- Applied: 2026-05-17 (via Supabase MCP apply_migration)
--
-- Locks in the role list per the role-hierarchy spec discussion:
--   Owner / Manager / Deputy Manager / Head Chef / Sous Chef / Chef /
--   Head Bartender / Bartender / Supervisor
--
-- Adds three new enum values:
--   - deputy_manager (same power as Manager, different title)
--   - head_chef      (the new explicit Head Chef label; existing 'chef'
--                     rows will keep working — see compatibility note)
--   - supervisor     (cross-domain read+write, no settings)
--
-- Legacy values left in the enum (no rows reference them in prod
-- 2026-05-17 — verified via SELECT COUNT before this migration):
--   - viewer / commis / bar_back — leaving in the enum is cheap; the
--     UI no longer offers them in the role picker and the rank table
--     in src/lib/roles.ts maps them to safe positions.
--
-- Compatibility:
--   - Existing 'chef' memberships continue to behave as Head Chef in
--     the codebase until the role picker rewrites them on save. The
--     UI label for 'chef' is now "Chef" (the read+prep tier) per the
--     new spec; rename via the role-edit UI on a per-member basis.
--   - 'bartender' carries the same dual-meaning risk — was full bar
--     access, now is read+prep only. Same rewrite-on-edit pattern.
--
-- Why not rename in place: Postgres enums don't support value renames
-- without rebuilding the type + updating every column that references
-- it. Cheaper to add the new explicit keys + use them going forward;
-- migrate legacy rows lazily as the role picker touches them.

alter type v2.shell_role add value if not exists 'deputy_manager';
alter type v2.shell_role add value if not exists 'head_chef';
alter type v2.shell_role add value if not exists 'supervisor';
