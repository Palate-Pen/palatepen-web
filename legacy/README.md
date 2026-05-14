# Legacy v1 Palatable App

This directory contains the v1 Palatable web app that ran at `app.palateandpen.co.uk`
prior to the v2 greenfield rewrite (decision: 2026-05-14, Path B).

The v2 build supersedes this code at the repo root. This directory is kept as a
reference implementation, not a working deployment.

## What's here

- `src/` — Next.js 14 App Router app (chef-facing /app routes, admin, marketing, public API)
- `supabase/migrations/` — legacy schema migrations targeting the `public` Postgres schema
- `workers/inbound-email/` — Cloudflare Worker for inbound-email webhook
- Config: `next.config.js`, `tsconfig.json`, `tailwind.config.js`, `package.json`, `vercel.json`

## What it's for

Reference for non-obvious patterns the v2 rewrite needs to re-establish:

- Inbound email Resend / Postmark / Mailgun payload normalisation (`workers/inbound-email/`)
- Stripe webhook handling (`src/app/api/stripe/webhook/route.ts`)
- Anthropic vision integration for invoice scanning (`src/app/api/palatable/scan-invoice/route.ts`)
- Multi-outlet scoping via entity-level `outletId` in JSONB
- Supabase RLS + account/member model (`supabase/migrations/007_accounts_and_team_membership.sql`)
- Tier gating (`src/lib/tierGate.ts`, `src/types/tiers.ts`)

## Running it locally

It is no longer wired to a production deployment. To run locally:

```
cd legacy
npm install
npm run dev
```

You'll need to restore `.env.local` separately — it's gitignored and was not moved
with the rename commit. The legacy app continues to talk to the existing Supabase
project's `public` schema; v2 lives alongside in a new `v2` schema.

## Deletion

This directory stays until v2 has feature parity for everything documented in
`../docs/strategy/working-notes/feature-inventory-2026-05-14.md`, at which point
it can be removed in a single commit.
