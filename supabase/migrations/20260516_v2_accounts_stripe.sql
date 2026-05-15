-- v2 migration: accounts stripe columns
-- Date: 2026-05-16
--
-- Per-account Stripe subscription state. The /api/stripe/webhook handler
-- writes these on checkout.session.completed and clears on
-- customer.subscription.deleted. accounts.tier is mirrored from the
-- price_key metadata sent through the checkout session.
--
-- Founder accounts are never billed: the webhook short-circuits when
-- accounts.is_founder = true so jack@palateandpen.co.uk stays
-- enterprise even if a stray Stripe webhook arrives.

alter table v2.accounts
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

create unique index if not exists accounts_stripe_customer_unique
  on v2.accounts(stripe_customer_id)
  where stripe_customer_id is not null;

comment on column v2.accounts.stripe_customer_id is
  'cus_xxx — set on first checkout, kept across plan changes';
comment on column v2.accounts.stripe_subscription_id is
  'sub_xxx — current active subscription; cleared when cancelled';
