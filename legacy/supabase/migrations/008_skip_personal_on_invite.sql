-- 008_skip_personal_on_invite.sql
-- When a user signs up via an invite, they don't need a personal account —
-- their reason for being on Palatable is to work in the inviting kitchen.
-- AuthPage now sets raw_user_meta_data.skipPersonal = 'true' on invite-driven
-- signups; this trigger honors it and short-circuits the personal-account
-- creation. Direct signups (no invite token in sessionStorage) keep getting
-- a personal account as before.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_account_id uuid := new.id;
  skip_personal  boolean := coalesce(new.raw_user_meta_data->>'skipPersonal', '') = 'true';
begin
  if skip_personal then
    -- Invite-driven signup. The /api/invites/[token]/accept route will add the
    -- user to the inviting account and the chef will work from that account's
    -- shared user_data row. No personal account or user_data row is needed.
    return new;
  end if;

  insert into public.accounts (id, name, owner_user_id, tier)
  values (
    new_account_id,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), 'My Kitchen'),
    new.id,
    coalesce(new.raw_user_meta_data->>'tier', 'free')
  )
  on conflict (id) do nothing;

  insert into public.account_members (account_id, user_id, role, added_by)
  values (new_account_id, new.id, 'owner', new.id)
  on conflict (account_id, user_id) do nothing;

  insert into public.user_data (
    user_id, account_id,
    recipes, notes, gp_history, ingredients_bank, invoices, price_alerts, stock_items,
    profile
  ) values (
    new.id, new_account_id,
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
