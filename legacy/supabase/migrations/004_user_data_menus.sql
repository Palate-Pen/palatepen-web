-- Add a `menus` jsonb column to user_data for the Menu Builder feature.
-- Each menu: { id, name, description, recipeIds[], createdAt, updatedAt }.

alter table public.user_data
  add column if not exists menus jsonb default '[]'::jsonb;
