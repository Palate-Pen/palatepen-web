-- Add a `waste_log` jsonb column to user_data for the Waste Tracking feature.
-- Each entry: { id, ingredientName, qty, unit, unitPrice, totalCost, reason,
--               notes, supplier, category, createdAt }

alter table public.user_data
  add column if not exists waste_log jsonb default '[]'::jsonb;
