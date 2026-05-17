-- v2 migration: accounts.safety_enabled + safety_liability_acked_at
-- Date: 2026-05-16
-- Applied: 2026-05-16 (manual run via Supabase SQL editor)
--
-- Tier gate for the Safety module. False by default; set true when the
-- account ticks the £20/site upsell. The Stripe checkout webhook flips
-- this on completed payment; founder demo accounts can be set manually.
--
-- The liability ack stamps when an owner of the account first viewed
-- and accepted the SafetyOnboardingModal. Locked-wording legal copy is
-- stored in code (src/lib/safety/legal.ts); this column just records
-- that they saw it on a given day.

alter table v2.accounts
  add column if not exists safety_enabled boolean not null default false,
  add column if not exists safety_liability_acked_at timestamptz,
  add column if not exists safety_liability_acked_by uuid references auth.users(id) on delete set null;

comment on column v2.accounts.safety_enabled is
  'True if the account has paid for + activated the Safety module (£20/site uplift).';
comment on column v2.accounts.safety_liability_acked_at is
  'When an owner of the account first acknowledged the Safety liability footer wording. Required before any safety_* writes.';
