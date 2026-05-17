-- v2 migration: accounts.is_demo flag for the hello@ live-demo account
-- Date: 2026-05-17
-- Applied: 2026-05-17 (via Supabase MCP apply_migration)
--
-- The hello@palateandpen.co.uk account is the live customer demo.
-- Mirror of the founder pattern (accounts.is_founder) but with
-- different semantics:
--   - is_founder: zero-cost internal account, Stripe never charges it
--   - is_demo: data is re-seeded periodically so the dashboards stay
--     populated; Stripe still skips it the same way as founder accounts
--
-- The reseed cron + button on /admin/ops will operate on any account
-- with is_demo = true. Settings UI hides Stripe portal controls for
-- both flags the same way.

alter table v2.accounts
  add column if not exists is_demo boolean not null default false;

create index if not exists accounts_is_demo_idx
  on v2.accounts (is_demo) where is_demo = true;

comment on column v2.accounts.is_demo is
  'When true: account is part of the live customer demo set. Data is reseeded periodically; Stripe billing bypassed like is_founder accounts. See src/lib/seed/demo-account.ts.';
