-- v2 migration: account-level preferences
-- Date: 2026-05-15
-- Applied: 2026-05-15 (run via MCP apply_migration)
--
-- Kitchen-wide preferences that drive rendering + behaviour across
-- surfaces. Stored as JSONB on v2.accounts so adding a new pref is a
-- code change, not a migration.
--
-- Shape (all fields optional, sensible defaults applied at read time):
--   {
--     "currency": "GBP",                  -- ISO 4217 (only GBP for v1)
--     "gp_target_pct": 72,                -- 1-100, default 72
--     "kitchen_size": "small" | "medium" | "large" | null,
--     "kitchen_location": "London, UK",
--     "stock_day": "monday" | ... | "sunday" | null
--   }
--
-- These get read everywhere the chef sees money or GP percentages —
-- Recipes, Margins, the what-if slider, the cost-spike detector.

alter table v2.accounts
  add column if not exists preferences jsonb not null default '{}'::jsonb;

comment on column v2.accounts.preferences is
  'Kitchen-wide preferences: currency, gp_target_pct, kitchen_size, kitchen_location, stock_day. JSONB so new fields are code changes only.';
