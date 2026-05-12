-- Migration 009: platform-wide settings table.
--
-- Single-row key/value store for founder-controlled platform config:
--   - feature flags (kill switches for AI features, public menus, API, etc.)
--   - active announcement banner shown to every user
--   - any future platform-level toggle
--
-- One row per logical settings bucket (currently just `global`). The whole
-- value blob is fetched anonymously by the public /api/platform-config
-- endpoint at app load so the client can render features conditionally.
-- Only the service role can write — admin UI authenticates via the existing
-- ADMIN_PASSWORD shared secret.

CREATE TABLE IF NOT EXISTS public.app_settings (
  id text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Public read so the client can fetch feature flags + announcement without auth
DROP POLICY IF EXISTS "app_settings public read" ON public.app_settings;
CREATE POLICY "app_settings public read"
  ON public.app_settings FOR SELECT
  USING (true);

-- Writes are service-role only — no row-level INSERT/UPDATE/DELETE policy.

-- Seed the global row with default flags + dormant announcement
INSERT INTO public.app_settings (id, value) VALUES (
  'global',
  '{
    "featureFlags": {
      "aiRecipeImport": true,
      "aiInvoiceScan": true,
      "aiSpecSheet": true,
      "publicMenus": true,
      "apiAccess": true,
      "emailForwarding": true,
      "csvImport": true,
      "csvExport": true
    },
    "announcement": {
      "active": false,
      "text": "",
      "level": "info",
      "dismissible": true
    }
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;
