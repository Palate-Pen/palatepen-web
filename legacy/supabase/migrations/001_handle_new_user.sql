-- Auto-create a user_data row whenever a new auth.users row is inserted.
-- This closes the "signed-up but no data row" gap so admin & app stay in sync.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_data (
    user_id,
    recipes, notes, gp_history, ingredients_bank, invoices, price_alerts, stock_items,
    profile
  ) values (
    new.id,
    '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    jsonb_build_object(
      'name',           coalesce(new.raw_user_meta_data->>'name', ''),
      'email',          coalesce(new.email, ''),
      'tier',           coalesce(new.raw_user_meta_data->>'tier', 'free'),
      'location',       '',
      'currency',       'GBP',
      'currencySymbol', '£',
      'units',          'metric',
      'gpTarget',       72,
      'stockDay',       1,
      'stockFrequency', 'weekly'
    )
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill: create user_data rows for any existing auth users that don't have one
insert into public.user_data (
  user_id,
  recipes, notes, gp_history, ingredients_bank, invoices, price_alerts, stock_items,
  profile
)
select
  u.id,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
  jsonb_build_object(
    'name',           coalesce(u.raw_user_meta_data->>'name', ''),
    'email',          coalesce(u.email, ''),
    'tier',           coalesce(u.raw_user_meta_data->>'tier', 'free'),
    'location',       '',
    'currency',       'GBP',
    'currencySymbol', '£',
    'units',          'metric',
    'gpTarget',       72,
    'stockDay',       1,
    'stockFrequency', 'weekly'
  )
from auth.users u
left join public.user_data d on d.user_id = u.id
where d.user_id is null;
