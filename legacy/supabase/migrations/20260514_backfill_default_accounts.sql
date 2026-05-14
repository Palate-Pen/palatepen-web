-- 20260513_backfill_default_accounts.sql
--
-- Defensive backfill: ensure every auth.users row has an account row and an
-- owner membership in account_members. Run from the Supabase SQL editor.
--
-- WHY (even though migration 007 already runs a backfill)
-- Migration 007's backfill joins through public.user_data:
--   from public.user_data ud join auth.users u on u.id = ud.user_id
-- so any auth user whose user_data row never materialised (failed signup
-- trigger, manual auth.users insert, pre-007 user with a cleared user_data
-- row) was skipped. Phase 3's outlet-scoped queries assume every user has
-- a default account; without this, those queries return empty or 500 for
-- skipped users.
--
-- This migration walks auth.users directly so it catches users that 007
-- missed. It does NOT create user_data rows — that's out of scope; if an
-- orphan auth user needs a user_data row, invoke handle_new_user() for
-- them after this runs (handle_new_user is idempotent on user_data via
-- ON CONFLICT DO NOTHING).
--
-- IDEMPOTENT — safe to re-run. ON CONFLICT DO NOTHING on both inserts;
-- WHERE NOT EXISTS gates so a re-run is a no-op on already-bootstrapped
-- users.

-- ============================================================
-- 1. Backfill accounts + memberships in a single transactional block.
--    Notices land in the SQL editor's Messages tab.
-- ============================================================
do $$
declare
  v_accounts_inserted    int := 0;
  v_memberships_inserted int := 0;
begin
  -- 1a. Create an account for every auth user that doesn't have one.
  -- Aliases account.id = user.id, matching migration 007's pattern so
  -- joins keyed by either column resolve to the same row.
  with ins as (
    insert into public.accounts (id, name, owner_user_id, tier, stripe_customer_id)
    select
      u.id,
      coalesce(
        nullif(ud.profile->>'name', ''),               -- 1st: user_data.profile.name
        nullif(u.raw_user_meta_data->>'name', ''),     -- 2nd: auth.users.raw_user_meta_data.name
        nullif(split_part(u.email, '@', 1), ''),       -- 3rd: email local-part
        'My Kitchen'                                   -- 4th: final fallback
      ) as name,
      u.id as owner_user_id,
      coalesce(
        nullif(ud.profile->>'tier', ''),
        u.raw_user_meta_data->>'tier',
        'free'
      ) as tier,
      u.raw_user_meta_data->>'stripe_customer' as stripe_customer_id
    from auth.users u
    left join public.user_data ud on ud.user_id = u.id
    where not exists (
      select 1 from public.accounts a where a.id = u.id
    )
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into v_accounts_inserted from ins;

  -- 1b. Create an owner membership for every account that doesn't have one.
  -- Covers (a) the accounts inserted above, and (b) the edge case of a
  -- pre-existing account whose member row was somehow removed.
  with ins as (
    insert into public.account_members (account_id, user_id, role, added_by)
    select a.id, a.owner_user_id, 'owner', a.owner_user_id
    from public.accounts a
    where not exists (
      select 1 from public.account_members am
      where am.account_id = a.id and am.user_id = a.owner_user_id
    )
    on conflict (account_id, user_id) do nothing
    returning 1
  )
  select count(*) into v_memberships_inserted from ins;

  raise notice 'Backfill complete: % new account(s), % new owner membership(s)',
    v_accounts_inserted, v_memberships_inserted;
end$$;

-- ============================================================
-- 2. Final report — post-state of the backfill.
--    After a successful run, the last two columns should both be 0.
--    Non-zero means something is wrong (or auth.users grew mid-run).
-- ============================================================
select
  (select count(*) from auth.users) as total_auth_users,
  (select count(*) from public.accounts) as total_accounts,
  (select count(*) from public.account_members where role = 'owner') as total_owner_memberships,
  (select count(*) from auth.users u
    where not exists (
      select 1 from public.accounts a where a.id = u.id
    )) as users_still_missing_account,
  (select count(*) from public.accounts a
    where not exists (
      select 1 from public.account_members am
      where am.account_id = a.id and am.user_id = a.owner_user_id
    )) as accounts_still_missing_owner_membership;
