-- v2 migration: supplier contact + payment + balance fields
-- Date: 2026-05-15
-- Applied: 2026-05-15 (MCP apply_migration; verified 9 new columns on v2.suppliers — contact_person, phone, email, address, website, payment_terms, credit_limit, account_balance, notes_md)
--
-- v2.suppliers was deliberately minimal at first ("payment_terms /
-- balance / COD status added when the Suppliers surface is designed"
-- — the bank migration's own note). The surface is now designed —
-- supplier cards + detail page need richer fields to match legacy
-- operational use:
--
--   contact_person — who you call when something goes wrong
--   phone / email / address / website — actual contact channels
--   payment_terms — free-text ("COD", "30 days net", "weekly")
--   credit_limit + account_balance — running supplier ledger
--   notes_md — free-text history / preferences / quirks
--
-- payment_terms stays text rather than an enum because the variations
-- across UK trade ("nett 30", "monthly EOM", "COD", "pre-pay") aren't
-- worth locking down at this stage. UI offers a suggestion datalist.

alter table v2.suppliers
  add column if not exists contact_person text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists address text,
  add column if not exists website text,
  add column if not exists payment_terms text,
  add column if not exists credit_limit numeric(10, 2),
  add column if not exists account_balance numeric(10, 2),
  add column if not exists notes_md text;
