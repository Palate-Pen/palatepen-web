-- v2 migration: inbox token on accounts
-- Date: 2026-05-14
-- Applied: 2026-05-14 (run via MCP apply_migration)
--
-- Per-account opaque token used to address inbound invoice emails:
--   invoices+{inbox_token}@palateandpen.co.uk
--
-- The chef forwards a supplier email to that address; the Cloudflare
-- inbound route delivers the message to /api/inbound-email; the
-- handler looks up the account by inbox_token and attributes the
-- scanned invoice to the right site. Same mechanism legacy used; the
-- only thing missing in v2 was the token column + UI to surface it.
--
-- Token is generated server-side as a 16-char base32-ish string (no
-- ambiguous chars: no 0/O/I/1) so the chef can read it off a screen
-- to a colleague without confusion. Unique constraint catches the
-- vanishingly-rare collision.

alter table v2.accounts
  add column if not exists inbox_token text;

create unique index if not exists accounts_inbox_token_unique
  on v2.accounts(inbox_token)
  where inbox_token is not null;

comment on column v2.accounts.inbox_token is
  'Opaque token addressing inbound invoice email: invoices+{token}@palateandpen.co.uk. Generated on demand via Settings.';
