-- v2 migration: add cost_baseline + costed_at to v2.recipes
-- Date: 2026-05-14
--
-- The recipe-staleness detector needs to know what the dish cost was
-- when the chef set its sell_price, so it can flag drift when current
-- Bank prices have moved the dish far enough that the margin is no
-- longer what the chef thinks it is.
--
-- - cost_baseline: cost-per-cover at the time sell_price was last set.
--   Recomputed whenever the chef updates sell_price OR explicitly
--   re-prices the dish. Nullable for recipes that haven't been costed.
-- - costed_at: when the baseline was set. Detector uses this to require
--   a minimum age (4 weeks) before flagging drift — prevents noise on
--   newly-priced dishes whose Bank prices haven't had time to move.

alter table v2.recipes
  add column cost_baseline numeric(10, 4),
  add column costed_at timestamptz;
