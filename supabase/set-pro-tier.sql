-- Run this in Supabase SQL Editor to set jack@palateandpen.co.uk to Pro tier
-- First find the user ID, then update their profile

UPDATE public.user_data
SET profile = jsonb_set(
  COALESCE(profile, '{}'),
  '{tier}',
  '"pro"'
)
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'jack@palateandpen.co.uk'
);

-- Verify the change
SELECT u.email, ud.profile->>'tier' as tier, ud.profile->>'name' as name
FROM auth.users u
JOIN public.user_data ud ON ud.user_id = u.id
WHERE u.email = 'jack@palateandpen.co.uk';