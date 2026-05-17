-- v2: founder demo account marker
-- Applied: 2026-05-14 (jack@palateandpen.co.uk flagged is_founder, tier='enterprise')
--
-- Adds an is_founder boolean to v2.accounts so the founder's demo account
-- (currently jack@palateandpen.co.uk) is durably distinguished from regular
-- customer accounts. The flag:
--
--   - Marks the account as a zero-cost internal account: any future Stripe
--     webhook handler / billing path must short-circuit when is_founder = true
--     and never create a subscription against it. The tier value is decorative
--     for these accounts — it controls feature gating UX so the founder can
--     demo every surface, but no money ever changes hands.
--
--   - Tells future seeding scripts that this account is the canonical demo
--     surface and should be kept hydrated with realistic data after every
--     new feature ships. Seeding is part of feature done-ness on this
--     account (codified in CLAUDE.md + memory).
--
--   - Does NOT change membership role or any RLS policy. The founder is still
--     just an owner on their site for everything that touches site data; they
--     hold a separate path to /admin via the email gate in admin/layout.tsx.
--
-- The pairing is: is_founder + tier='enterprise' + owner role on the site +
-- email-gated admin access. That gives the founder full chef/manager surface
-- experience for demos while keeping the admin command centre separate.

ALTER TABLE v2.accounts
  ADD COLUMN IF NOT EXISTS is_founder boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN v2.accounts.is_founder IS
  'True for internal founder/demo accounts. These are never billed and have full feature access regardless of tier. Currently only jack@palateandpen.co.uk''s account is flagged.';

-- Flag the founder account + bump it to enterprise tier so feature gates
-- behave like a top-tier customer during demos.
UPDATE v2.accounts
SET
  is_founder = true,
  tier = 'enterprise'
WHERE id = '1299af05-8556-4011-b059-12e353d6f833';
