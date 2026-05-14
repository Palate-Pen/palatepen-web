# CLAUDE.md — Palatable by Palate & Pen

Master project tracker. Keep this current — when work ships, update the relevant Roadmap checkbox and add an entry to the Progress Log below.

## Project Overview

Palatable by Palate & Pen — Back office work you can stomach. A professional chef toolkit built with Next.js, Supabase, Vercel, Cloudflare, Stripe and Anthropic API. Live at app.palateandpen.co.uk. Marketing site at palateandpen.co.uk. GitHub: Palate-Pen/palatepen-web.

## Tech Stack

- Frontend: Next.js 14, TypeScript, Tailwind CSS
- Backend/DB: Supabase (EU West London) project xbnsytrcvyayzdxezpha
- Hosting: Vercel
- Payments: Stripe (sandbox, switching to live before launch)
- AI: Anthropic API (server-side only, ANTHROPIC_API_KEY in Vercel)
- Email: Microsoft 365 jack@palateandpen.co.uk

## Brand

- Name: Palatable
- Tagline: Back office work you can stomach
- By Palate & Pen
- Logo: italic P + gold dot + alatable
- Colours (v8, chef-shell canon): Ink #1A1612, Gold #B8923C, Paper #F8F4ED, Card #FFFFFF, Muted #7A6F5E, Muted-soft #A99B85, Urgent #A14424, Attention #B86A2E, Healthy #5D7F4F, Rule rgba(26,22,18,0.08). Full palette and severity language in `docs/strategy/working-notes/design-system-v8.md`.
- Type stack: Cormorant Garamond (serif, headings + italic context), Cinzel (display, uppercase labels + small caps), Jost (sans, body)
- Tiers: Free / Pro £25pm / Kitchen £59pm / Group £129pm / Enterprise (price on request — contact_sales route to hello@palateandpen.co.uk)
- Tier limits (maxUsers · maxOutlets · maxScans/mo):
  - Free: 1 · 1 · 0
  - Pro: 1 · 1 · 80
  - Kitchen: 5 · 1 · 200
  - Group: **25 · 5 · 500** (5 users per outlet · 5 outlets max — upgrade to Enterprise for unlimited)
  - Enterprise: unlimited · unlimited · unlimited
- Full breakdown lives in [`docs/TIER_SCHEMA.md`](docs/TIER_SCHEMA.md); enforced via `TIER_LIMITS` in `src/lib/tierGate.ts` and `SEAT_LIMITS` in `src/lib/team.ts`.

## Issue Tracking

GitHub Issues at https://github.com/Palate-Pen/palatepen-web/issues are reserved for **bugs and problems we hit, with the fix documented inline**. Each issue should describe the symptom, the root cause once known, and the resolution (commit SHA / PR / behaviour change). Apply the `Bug` label by default; add `Website` or `Payments` if it scopes there.

The forward-looking work list lives in the Roadmap section of this file — not in Issues. Tick the box and add a Progress Log entry when something ships.

## Key Documentation

- [`docs/TIER_SCHEMA.md`](docs/TIER_SCHEMA.md) — source of truth for tier ladder (Free/Pro/Kitchen/Group/Enterprise), per-feature minimum tier, hard limits per tier (maxRecipes/maxNotebook/maxUsers/maxOutlets), and the canonical TypeScript shapes for Account/Outlet/Membership. Mirrored in code at `src/types/tiers.ts` and `src/lib/tierGate.ts`. When adding a feature, add a `FEATURE_MIN_TIER` entry there first — gating starts at the schema, not at the call site.

## Editing key — shared vocabulary

Lives in docs/editing-keys.md. When the user references a key like INV.bank.scan or REC.detail.cost, look it up there.

## Roadmap

### Phase 1 — Foundation
Complete. See docs/roadmap-archive.md for full checklist.

### Phase 2 — Pro Feature Depth
Complete. See docs/roadmap-archive.md for full checklist.

### Phase 3 — Kitchen and Group Tier

- [ ] Costing → Margins rename: complete in design — Costing folded entirely into Margins as part of 10-tab chef shell (2026-05-14 final lock). Build still pending. Recon: docs/strategy/working-notes/costing-margins-recon-2026-05-14.md.
- [x] Multi-user access with team permissions *(All 4 stages shipped — schema + contexts + Team UI + invite/accept + role gating + Stripe webhook to accounts.tier; legacy user_id RLS still in place pending cleanup, see Progress Log)*
- [ ] Multiple outlets under one account
- [ ] Central kitchen management
- [ ] Supplier ordering from par levels
- [ ] Purchase order tracking
- [ ] Automated reorder suggestions
- [ ] Group-level reporting across all sites
- [ ] Demand forecasting
- [ ] Inter-site stock transfer
- [ ] Group outlets in dashboard to show summary information per outlet including GP, stock value and alerts
- [ ] Allow Group tier users to create and manage multiple restaurants, pubs and outlets under one account
- [x] Outlet creation UI — add/name/type outlets from Settings *(shipped 2026-05-13 — see progress log)*
- [x] Data scoping per outlet — recipes, stock, invoices, waste all filter by active outlet *(shipped 2026-05-13 — entity-level outletId in JSONB, see progress log)*
- [ ] Group dashboard — Overview, Outlets, Alerts, Cross-outlet stock, Purchase orders, Reports tabs
- [x] Backfill migration — run in Supabase SQL editor to create default accounts for existing users

### Phase 4 — Digital and Integration

- [x] Live digital menus *(Kitchen/Group only — public URL renders live menu data, no re-publish needed)*
- [x] Menus published to website with public URL *(`/m/{slug}` route, server-rendered with OG meta)*
- [x] QR code menus *(rendered inline from QR API + downloadable PNG)*
- [ ] POS integration (Square, ePOSnow)
- [ ] Xero integration
- [x] Email invoice forwarding *(Pro+ — per-account `invoices+{token}@palateandpen.co.uk` address. Webhook at `/api/inbound-email` accepts Resend/Postmark/Mailgun-shaped JSON, runs each PDF/image attachment through Claude vision, appends to user_data.invoices. Requires `INBOUND_EMAIL_SECRET` env var + DNS/inbound provider configured on the domain.)*
- [x] API access *(read-only v1 — Kitchen/Group only. Bearer-token API key generated from Settings → API Access. Endpoints: /me, /recipes, /recipes/{id}, /costings, /costings/{id}, /stock, /menus, /menus/{id}, /bank)*
- [x] Delivery confirmation step on invoice scan *(modal after scan; Yes-tap stamps `status: 'confirmed'`, Flag opens an editable line-list capturing received qty / not-received toggle / per-line note; saved as `status: 'flagged'` with a `discrepancies[]` array. Non-blocking — Skip preserves the legacy behaviour. Mobile-first big tap targets. 30-day banner on the bank + history views surfaces total flagged count and £ discrepancy value.)*
- [x] Supplier reliability score *(0–10 per supplier from confirmed/flagged ratio + £-discrepancy-severity penalty. Renders next to the supplier name on every history row + as the primary sort on a new Suppliers tab inside `InvoicesView`. Expandable per-supplier panel shows last-45d vs prior-45d trend and the most-flagged ingredient. Feeds into the Phase 5 supplier performance section in Reports — both surfaces read the same invoices state.)*

### Phase 5 — Intelligence Layer
Complete. See docs/roadmap-archive.md for full checklist.

### Mobile — Responsive Web Polish

Near-term tweaks to the responsive web layout (≤768px). Distinct from the native iOS/Android effort below.

- [x] Move alerts out of main navigation on mobile into a More tab
- [ ] Show invoice scanning prominently on mobile home screen *(partially addressed — Invoices is now one of the 5 primary bottom-bar slots, so scanning is 1 tap from anywhere)*
- [x] Fix menu designer layout in mobile view

### Phase 6 — Mobile (Native)

- [ ] iOS app
- [ ] Android app
- [ ] RevenueCat for App Store and Google Play
- [ ] Offline mode
- [ ] Camera invoice scanning from phone

## Recent activity

**Last shipped (foundation week 1):**
- Backfill migration applied (defensive no-op, schema invariants verified intact)
- MCP tooling added — GitHub MCP and Supabase MCP (read-only), both proven functional
- Strategic direction locked — three role-aware surfaces, four sous chef tabs (Recipes/Costing/Margins/Reports), see Palatable — Strategic Direction section below
- CLAUDE.md cleanup commits 1 and 2 — reference material extracted, Progress Log moved to docs/progress-log.md
- 2026-05-14 PM: Locked final strategy spec across customer + admin + build sequence; captured design system v6 with chef-home and chef-margins mockups as visual canon for any UI work going forward. See docs/strategy/working-notes/design-system-v6.md and docs/strategy/mockups/.
- 2026-05-14 PM (late): Locked Stock & Suppliers hub design at v3, captured design system v7 with Looking Ahead pattern and Working severity, expanded master views with self-serve integration architecture (user-credential-based, no B2B partnerships needed) and forward-intelligence engine as foundation subsystem. Honest revised build sequence at 6-9 months solo-build to v1 launch. See docs/strategy/working-notes/design-system-v7.md.
- 2026-05-14 PM (evening lock): Stock & Suppliers complete — hub + 7 sub-pages locked (Notebook, Seasonal, Suppliers, The Bank, Invoices, Deliveries, Waste). Added Prep tab (chef shell then 9 tabs — Prep at position 2, after Home) and Order Drafter modal (launched from Deliveries + Suppliers, 4-channel). Design system v8 captures 15 new patterns + write-and-workflow surface type. See docs/strategy/working-notes/design-system-v8.md and surface-notes-2026-05-14-evening.md; mockups under docs/strategy/mockups/.
- 2026-05-14 PM (final lock): Chef shell complete — 10 tabs locked (Home / Prep / Recipes / Menus / Margins / Stock & Suppliers / Notebook / Inbox / Settings / Connections). Costing folded into Margins; Reports dropped; Notebook promoted from Stock & Suppliers sub-page; Settings + Connections promoted from cross-shell to chef-shell. Manager Home locked (manager shell 10 tabs, others pending detail design). Onboarding flow locked. Path B greenfield rewrite decision made — legacy app stays in `legacy/` for reference, v2 builds at standard `src/` root with a new `v2` Supabase schema. See docs/strategy/mockups/.

**In flight:**
- Manager shell detail design (9 tabs remaining after Home)
- v2 scaffold: `legacy/` move + `v2` Supabase schema + new Next.js project structure

**Next:**
- Owner shell with Sites + group rollups
- Open question: Cash Flow / Payments surface has no single home yet
- Build phase: Foundation + chef shell scaffolding — see docs/strategy/pre-launch-build-sequence.md (honest 6-9 month plan)

Full Progress Log lives in docs/progress-log.md. Add new entries there going forward; keep this section curated and terse.

## Known Issues

- ~~Menu Designer layout broken in mobile view.~~ **Fixed** — mobile now gets a Design/Preview tab switcher at the top, full-width controls in Design mode, and a CSS-transform-scaled A4 sheet in Preview mode so the whole page fits without horizontal scroll.

## Important Notes

- All file writes use Node.js scripts to avoid Windows encoding issues
- Settings persist via localStorage key palatable_settings_v2
- App root div ID is palatable-app-root for zoom-based font scaling
- Stripe webhook endpoint: app.palateandpen.co.uk/api/stripe/webhook
- **Enterprise tier is sales-led.** `/api/stripe/create-checkout` short-circuits when `priceKey === 'enterprise'` and returns `{ contact_sales: true, url: 'mailto:hello@palateandpen.co.uk?subject=Enterprise%20enquiry' }` instead of creating a Stripe session. No Stripe price ID exists for Enterprise. Onboarding for an Enterprise deal is manual after the contract closes — set the user's `profile.tier = 'enterprise'` in admin and mirror to the relevant `accounts.tier`.
- Invoice scanning requires Pro tier — checked server-side
- Demo account: jack@palateandpen.co.uk (Pro tier)
- **Inbound email infra (for email-forwarded invoices):** the webhook lives at `app.palateandpen.co.uk/api/inbound-email`. It expects an `INBOUND_EMAIL_SECRET` env var (Vercel) and accepts either `Authorization: Bearer <secret>` or `?secret=<secret>`. Inbound provider needs to deliver POST JSON with `to`, `from`, `subject`, `attachments[].content` (base64). Tested-against payload shapes: Resend (lowercase keys), Postmark (Title-case), Mailgun (after JSON conversion). DNS-side: chefs forward to `invoices+{token}@palateandpen.co.uk` — you need the MX record on that domain pointing at the inbound provider, plus a route in the provider's dashboard that catches `invoices*` (catch-all on the local part) and forwards to the webhook URL. Without that DNS wire-up the in-app UI still works (chefs see their address and can copy it) but no emails actually arrive.
- **supabase-js + Next.js fetch cache**: supabase-js calls global `fetch()` internally, and Next.js auto-caches GET `fetch()` calls in route handlers — even with `dynamic = 'force-dynamic'`. Symptom: server-side reads return phantom rows that no longer exist in Postgres. Fix: pass a custom `global.fetch` to `createClient` that wraps `fetch` with `cache: 'no-store'`. Centralized as `svc()` in `src/lib/admin.ts` — use it for any admin/server-role Supabase client. (Writes via PATCH/POST/DELETE are not cached, so this only affects GETs.)
- **AppContext load effect must depend on `user?.id`, not `user`**: the `user` object reference changes on every Supabase auth event including silent token refreshes (~hourly). If the load effect lists `[user]` in its deps, every refresh re-fetches user_data and overwrites in-flight local edits. Use `[user?.id]` so the effect only re-runs when the actual user changes. Same for the autosave effect.
- **Autosave**: 500ms debounced upsert in AppContext. Surfaces a save-status pill (Saving / Saved / ✗ Save failed) in the bottom-right of /app. Errors are logged via `console.error('[user_data save]', code, message)`. A `visibilitychange → hidden` listener flushes pending writes when the tab is about to close — best-effort, no sendBeacon (Supabase auth header isn't supported there).
- supabase-js `.insert(...)` without `.select()` can resolve before PostgREST commits when RLS is enabled. The shared `audit()` helper uses `.insert(...).select().single()` so the await fully round-trips.
- Sensitive Vercel env vars (Stripe, Supabase service role, Anthropic) cannot be pulled to local `.env.local`. To run admin/server routes locally that need them, paste manually. Pulled values come back as empty strings.
- **Migrations run manually in Supabase SQL editor.** No supabase-cli pipeline yet — when a new migration lands in `supabase/migrations/YYYYMMDD_descriptive_name.sql`, paste it into the Supabase SQL editor and run it. (Historical migrations 001–010 use the older `NNN_*.sql` form; new files use the date-prefixed convention starting with `20260513_phase3_multi_outlet.sql`.) Migration `010_anthropic_usage.sql` adds the per-call metering table the admin Infrastructure dashboard reads to show actual Anthropic spend vs the formula estimate — run it before usage data will populate; without it the admin endpoint returns zeros + a `tableMissing` flag and the UI prompts you to run it.
- **Anthropic credit balance is a live operational dependency.** Recipe import (`/api/palatable/import-recipe`) and invoice scanning (`/api/palatable/scan-invoice`) both call Sonnet 4.6 via api.anthropic.com. If the balance hits £0 the API returns HTTP 400 "Your credit balance is too low" — the UI surfaces this as a clear error pill but the feature is dead until topped up. Top-up: https://console.anthropic.com/settings/plans. Cost is roughly $0.005 per import or scan with Sonnet 4.6 — small refills go a long way.

## Palatable — Strategic Direction (May 2026)

This file gives Claude Code the strategic context to build in the right direction. Read all three referenced docs before making non-trivial product decisions.

### The product, in one sentence

Palatable is the hospitality platform where chefs do their work in the kitchen, managers see what they need to see, and owners watch the money — without anyone having to do extra work for anyone else.

### The positioning

**Chef-facing:** "The digital sous chef that handles the admin so you can cook."
**Owner-facing:** "Software your chefs will actually use — so you finally get the data you need."
**Internal:** Built in the kitchen. Useful to the whole business.

### The core architectural insight

Two layered ideas.

**1. Role determines surface set.** One system, three role-aware surface sets:
- **Chef surface** — the sous chef. Calm, mobile-first, hides finance.
- **Manager surface** — site operational status. Exception management.
- **Owner surface** — business pulse, multi-site intelligence, financial reports.

**2. Within the chef set, ten tabs cover the chef's day:** Home, Prep, Recipes, Menus, Margins, Stock & Suppliers, Notebook, Inbox, Settings, Connections. Each surface answers one sous chef question; the chef's normal work feeds manager and owner views automatically. Full per-surface design rationale in `docs/strategy/working-notes/surface-notes-2026-05-14-evening.md` (locked 2026-05-14 final, supersedes earlier nine-tab and four-tab shapes).

**3. Manager shell — ten tabs, parallel structure to chef shell.** Manager Home locked 2026-05-14; remaining nine tabs pending detail design.

Same underlying data. Role-aware experience. **Nobody does work for anyone else.**

### The v1 wedge (what we launch with that no competitor has)

1. **Auto-maintained costing** — recipe costed once, kept current forever as supplier prices change
2. **Margin leakage detection** — proactive alerts when GP slips, with root cause identified
3. **Credit note workflow** — discrepancies drafted, sent, tracked without chef chasing

### Principles for every product decision

- Does this make Palatable a better sous chef, or does it make it admin software?
- Is this work the chef needs to do anyway, or are we asking them to do work for someone else?
- Is this surfaced to the right person in the right way for their role?
- Suggestions, not commands. Trust is earned over time.
- Don't ask the system to remember what it could figure out from data it already has.
- The kitchen is sacred. The system protects it from interruption.

### What we don't do

Payroll. HR. Accounting replacement. POS replacement. Generic ERP. Anything that makes chefs do work for managers. Anything that interrupts the kitchen.

### Reference documents

Full strategy lives in:
- `docs/strategy/palatable-way.md` — principles and brand voice
- `docs/strategy/role-aware-surfaces.md` — chef / manager / owner surface design
- `docs/strategy/pre-launch-build-sequence.md` — 10–12 week pre-launch plan

When in doubt about a product or UX decision, read these first.

## Project conventions

### Build conventions

- All file writes via Node.js setup scripts to avoid Windows encoding issues
- Repo: Palate-Pen/palatepen-web, branch main
- Palatable web app lives at `Documents/palateandpen/web/`; mobile sibling at `Documents/palateandpen/app/`
- Stack: Next.js 14.2.5, React 18, Supabase (EU West London, project `xbnsytrcvyayzdxezpha`), Stripe, Tailwind, Anthropic Sonnet 4.6 server-side

### MCP Tooling

- **GitHub MCP** — configured at project-local scope. Authenticated via a fine-grained PAT scoped to `Palate-Pen/palatepen-web` only. Used for reading repo files, viewing commits and PRs, and managing issues. **Token expires 90 days from generation — set a calendar reminder for rotation.**
- **Supabase MCP** — configured at project-local scope. Read-only enforced at the Postgres transaction layer (`BEGIN READ ONLY` wrapping all queries — verified 2026-05-14 with a `CREATE TABLE _readonly_probe` that returned SQLSTATE `25006 read_only_sql_transaction`). Scoped to project `xbnsytrcvyayzdxezpha` only. Used for verifying schema, running `SELECT` queries, reading the migrations folder. Migrations still run manually in the Supabase SQL editor per the existing convention.
- **Misleading tool list.** The Supabase MCP advertises write tools (`execute_sql`, `apply_migration`, `deploy_edge_function`, branch tools) regardless of the `--read-only` flag. They fail at the database layer, not at the MCP boundary. The actual safety boundary is the Postgres role / transaction mode, not tool availability — don't infer read-only-vs-not from which tools are listed.
- **Future sessions.** Prefer MCP tools over filesystem-only or paste-based workflows when working with repo state or DB schema context. Use the GitHub MCP to verify file contents post-write — that catches the Windows file encoding issues that bit us during the strategy doc work.

### CLAUDE.md size discipline

Keep this file lean — it's loaded on every Claude Code session, and bloat costs tokens. Rules:

- Reference material (vocabularies, completed work, historical entries) goes in `docs/`. CLAUDE.md gets a one-line pointer.
- The "Recent activity" stub stays terse — three short blocks (last shipped, in flight, next). Don't append; curate. Full detail goes in `docs/progress-log.md` and git commits.
- New Roadmap phases stay inline only while active. Completed phases move to `docs/roadmap-archive.md` with a one-line pointer in their place.
- Target: keep CLAUDE.md under 30k chars. If it crosses 40k, audit and extract.
