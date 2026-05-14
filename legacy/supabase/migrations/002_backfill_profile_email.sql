-- Backfill profile.email from auth.users.email for any user_data row
-- whose profile is missing it (one-off; new rows get email from the
-- on_auth_user_created trigger in 001).

update public.user_data ud
set profile = jsonb_set(coalesce(ud.profile, '{}'::jsonb), '{email}', to_jsonb(u.email), true),
    updated_at = now()
from auth.users u
where ud.user_id = u.id
  and u.email is not null
  and (ud.profile->>'email' is null or ud.profile->>'email' = '');
