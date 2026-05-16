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
- Logo: "Palatable" wordmark with a gold dot after the word. Cinzel display, semibold, uppercase, `tracking-[0.3em]` at the small marketing size and `tracking-[0.16em]` at the 24px sidebar size. Collapsed sidebar shows just "P" + dot. Canonical render lives in `src/components/shell/Sidebar.tsx` (chef/bar/manager/owner), `src/components/admin/AdminSidebar.tsx` (founder admin), `src/app/(flows)/layout.tsx` (signin/signup), and the marketing pages (`/landing`, `/coming-soon-feature`).
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

- [x] Costing → Margins rename *(superseded 2026-05-15 — chose a tighter path. Recipe tiles now surface dish GP + drift directly (commit 3ac496b), and a Margins tab already exists. The "rename Costing → Margins" rebuild is unnecessary because Costing-as-authoring stays inside the recipe edit form and Margins-as-analysis sits across the Recipes list, /margins, and the per-recipe detail. Original recon at docs/strategy/working-notes/costing-margins-recon-2026-05-14.md is now historical.)*
- [x] Multi-user access with team permissions *(All 4 stages shipped — schema + contexts + Team UI + invite/accept + role gating + Stripe webhook to accounts.tier; legacy user_id RLS still in place pending cleanup, see Progress Log)*
- [x] Multiple outlets under one account *(shipped 2026-05-15 — founder account now has Palatable Kitchen + Palatable Cellar Bar under one account_id, owner role on both. /owner/sites lists every site this owner has membership on with full per-site stats.)*
- [ ] Central kitchen management
- [x] Supplier ordering from par levels *(shipped 2026-05-15 — items below par grouped by supplier on /stock-suppliers/purchase-orders, one-click "Draft PO" from each suggestion card or from the per-supplier detail page)*
- [x] Purchase order tracking *(shipped 2026-05-15 — `v2.purchase_orders` + `v2.purchase_order_lines`, full lifecycle draft→sent→confirmed→received with mailto: compose, inline line editor, expected-date, supplier notes, print)*
- [x] Automated reorder suggestions *(shipped 2026-05-15 — Reorder Suggestions panel on the PO list groups every below-par Bank item by its primary supplier with estimated shortfall value; one-click drafts a PO with sensible qty defaults)*
- [x] Group-level reporting across all sites *(shipped 2026-05-15 — /owner/sites surfaces a Group totals KPI strip (sites · 30d spend · par breaches · open POs across the group) when >1 site present; /owner/reports already had per-site row breakdowns; /owner/bank-comparison adds cross-site price reconciliation.)*
- [ ] Demand forecasting
- [ ] Inter-site stock transfer
- [x] Group outlets in dashboard to show summary information per outlet including GP, stock value and alerts *(shipped 2026-05-15 — /owner/sites SiteCard now shows per-site avg GP with tone, par breach count, open PO count, spend 30d, waste 30d, ingredients, recipes — full operational snapshot per site.)*
- [x] Allow Group tier users to create and manage multiple restaurants, pubs and outlets under one account *(architecturally shipped 2026-05-15 — multiple v2.sites under one v2.accounts FK with owner role on each works end-to-end. UI for an owner to *add* a new site from the dashboard is a follow-up; for now this is admin-only via SQL.)*
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
- [x] Forward menu planner *(Nested mode inside Menus on chef + bar, parallel Planning tab inside manager Menu Builder. Classical Kasavana & Smith menu engineering matrix — Stars / Plowhorses / Puzzles / Dogs derived from chef-entered popularity 1–5 + live GP %. Schema `v2.menu_plans` + `v2.menu_plan_items`. Action lifecycle keep/add/revise/remove per dish. Looking Ahead surfaces plan-specific risks: plowhorses needing intervention, surviving dogs, missing launch date, unrated items. POS integration replaces popularity entry when wired.)*

### Phase 5 — Intelligence Layer
Complete. See docs/roadmap-archive.md for full checklist.

### Phase — Safety Module (v1 wedge piece #4)

Three-week build deferred — backlog. Full spec lives in [`docs/CLAUDE-CODE-SAFETY-HANDOFF.md`](docs/CLAUDE-CODE-SAFETY-HANDOFF.md). Note: that doc is written against a legacy folder layout (`mise/app/`, `venues`, `staff`) and must be adapted to v2 conventions (`web/src/`, `v2.sites`, `auth.users`, `v2.recipes`) when the build starts.

- [ ] Week 1 — schema (8 `v2.safety_*` tables + `v2.menu_versions` audit trail + `accounts.safety_enabled` flag + RLS) + shared components (LiabilityFooter, FsaReferenceStrip, SafetyOnboardingModal, fsa-links lib) + sidebar route between Prep and Recipes + liability-ack onboarding gate
- [ ] Week 2 — Safety home (opening checks grid + 12-week diary calendar) · Probe Reading (menu-version snapshot per reading) · Log an Issue (4 incident types + 14 UK allergen pills) · Cleaning Schedule (SFBB-aligned default tasks) · Training Records (cert expiry tracking + 30/14/7/0-day notifications)
- [ ] Week 3 — HACCP Wizard (9 steps, FSA-default critical limits, react-pdf output) · EHO Visit (snapshot + live timer + 4-second 47-page export bundle)
- [ ] Pricing: gate via `accounts.safety_enabled` boolean. £20/site/mo uplift via Stripe upsell webhook. Kitchen + Safety = £99/site/mo; Group + Safety = £149/site/mo
- [ ] Legal: locked liability wording on every page, stronger urgent-red treatment on HACCP, ack required before entering Safety tab. Never softened.

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

**Last shipped (2026-05-16 night session):**
- Heading typography migration — every h1/h2 across chef / bar / manager / owner / admin / safety / marketing migrated from the v8 `font-display text-{N}xl font-semibold uppercase tracking-[0.04em]` (Cinzel — uppercase-only) pattern to `font-serif text-{N}xl font-normal text-ink leading-[1.1] tracking-[-0.015em]` (Cormorant Garamond sentence-case). 110 files touched. Cinzel now reserved exclusively for small fixed-px uppercase labels (eyebrows, badges, button text) as the brand spec always intended. Memory entry: `palatable-heading-typography.md`. If you're tempted to type `font-display text-{N}xl` again — don't, it's been eradicated.

**Last shipped (2026-05-16 evening session):**
- Public marketing live — `palateandpen.co.uk` now serves the full Palate & Pen consulting site (hero · about · 6 services grid · Palatable showcase · 3-way approach · contact · footer). `app.palateandpen.co.uk` root for unauthenticated visitors renders the Palatable landing (hero with Looking Ahead mockup · problem grid · 8 modules · Margins showcase · dark Safety section with EHO mockup · 4-tier pricing · final CTA). All trial / sign-in / sign-up buttons route to `/coming-soon-feature` ("Trials open very soon" stub with mailto early-access CTA). `/signin` remains directly reachable for the founder. Middleware rewrites unauth `/` on app host to `/landing`. Commit `8180f6b`.
- Safety as its own viewer — promoted from a chef tab to a first-class peer of Chef / Bar / Manager / Owner. New SAFETY_SECTIONS sidebar (Daily Diary: Home / Probe / Issues / Cleaning / Training, plus EHO: HACCP / EHO Export). Topbar viewer chip gained "Safety view". Route group moved from `(shell)/safety/*` to top-level `safety/*` so it gets its own layout. Mockup-matched home page: date strip · Looking Ahead bar · Opening Checks card grid with autosave · During Service auto-logged grid pulling deliveries / probe readings / waste · 12-week diary calendar (day-num + dot, today gold ring) · Quick Actions list · dark EHO Mode export card · full FSA reference strip. Commits `347ea74` + `e6b0f30`.
- Safety sub-pages mockup-matched — Probe (form + today's-readings sidebar), Cleaning (frequency-grouped tasks + overdue detector + today's sign-offs feed), Training (per-staff cards with cert expiry-band colouring), Incidents (4-tile issue type picker · 3-tile severity · 14 UK FIR allergen pills · 7-item corrective-action checklist · severity encoded into body_md preamble), new EHO export page (evidence tile grid · dark hero · disabled PDF export), new HACCP wizard intro (9-step sidebar · step-1 pre-fill banner). Looking Ahead detectors on each surface. Commit `609a42b` for incidents.
- Opening Checks attribution — `submitOpeningCheckAction` stamps per-question `{ by, at }` into `answers._meta` (diff-aware, autosaves don't overwrite original sign-off timestamps). Diary classifier + EHO rollup + behavioural-gap detector all filter `_meta` out before iterating. Surface meta as "✓ HH:MM · Jack" per tile.
- Team UI refactor — TeamMatrix → TeamList + click-through detail at `/owner/team/[id]` + `/manager/team/[id]` (MemberHeader avatar + role selector over MemberPermissions grouped by domain with override badges). Switch Surface + Team & Permissions sections surfaced from owner/manager/chef/bar Settings. Commit `c028e03`.
- Cleaning seed-schedule fix — action now takes a `siteId` arg (was picking arbitrary first membership, wrong site for multi-site users); new `SeedScheduleButton` client component surfaces errors so silent failures stop. Commit `41df10a`.
- Sidebar icons refreshed — settings (aperture), connections (globe), compliance/safety (shield + check) match the chef-safety-mockup-v1.html glyphs.

**In flight:**
- Pricing reconciliation — marketing landing shows Pro £49 / Kitchen £79 / Group £119; CLAUDE.md still says Pro £25 / Kitchen £59 / Group £129. Resolve before launch.
- Apply migrations queued for Supabase SQL editor: `20260516_v2_safety_tables.sql`, `20260516_v2_accounts_stripe.sql`, `20260516_v2_intelligence_event_emitters.sql`, `20260516_v2_anthropic_usage.sql` (if not already done).
- Vercel env vars + Stripe / inbound-email webhook configuration confirmed in place from legacy carry-over.
- Smoke-test the new marketing pages post-deploy at mobile + tablet + desktop widths.

**Next:**
- Probe / Incident / Cleaning / Training pages have the data primitives wired but no live menu/recipe picker — currently free-form input. Wire the dish picker tabs (Today's Menu / Prep Items / Recipes Library) from the mockup as a follow-up batch.
- HACCP wizard form fields (steps 1–9) — currently just the intro + step-1 stub. Auto-populate from settings, menu, recipes, suppliers, training.
- EHO export PDF generation — page is a live preview of the bundle but the actual PDF export is disabled. Next batch.
- Photo upload + Supabase Storage bucket (recipes + branding).
- Notebook captures pt 2 (voice/photo/sketch via Storage — task #50).
- Manager and Owner pending tabs need mockups locked before scaffolding the rest.

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
- **Founder demo account: jack@palateandpen.co.uk.** Internal zero-cost account that poses as a top-tier owner customer for live demos and day-to-day founder use. State: `v2.accounts.is_founder = true`, `tier = 'enterprise'`, owner role on its site (`9dc96352-d0eb-407e-a0aa-e59cbd7c0220`), founder admin access via the email gate in `src/app/admin/layout.tsx`. Stripe must never charge this account — every billing path needs an `is_founder` short-circuit before tier-gates or subscription writes. Every new feature should land with seed data on this account so the surface renders end-to-end in demo. Contract documented in `supabase/migrations/20260514_v2_accounts_is_founder.sql`.
- **Inbound email infra (for email-forwarded invoices):** the webhook lives at `app.palateandpen.co.uk/api/inbound-email`. It expects an `INBOUND_EMAIL_SECRET` env var (Vercel) and accepts either `Authorization: Bearer <secret>` or `?secret=<secret>`. Inbound provider needs to deliver POST JSON with `to`, `from`, `subject`, `attachments[].content` (base64). Tested-against payload shapes: Resend (lowercase keys), Postmark (Title-case), Mailgun (after JSON conversion). DNS-side: chefs forward to `invoices+{token}@palateandpen.co.uk` — you need the MX record on that domain pointing at the inbound provider, plus a route in the provider's dashboard that catches `invoices*` (catch-all on the local part) and forwards to the webhook URL. Without that DNS wire-up the in-app UI still works (chefs see their address and can copy it) but no emails actually arrive.
- **supabase-js + Next.js fetch cache**: supabase-js calls global `fetch()` internally, and Next.js auto-caches GET `fetch()` calls in route handlers — even with `dynamic = 'force-dynamic'`. Symptom: server-side reads return phantom rows that no longer exist in Postgres. Fix: pass a custom `global.fetch` to `createClient` that wraps `fetch` with `cache: 'no-store'`. Centralized as `svc()` in `src/lib/admin.ts` — use it for any admin/server-role Supabase client. (Writes via PATCH/POST/DELETE are not cached, so this only affects GETs.)
- **AppContext load effect must depend on `user?.id`, not `user`**: the `user` object reference changes on every Supabase auth event including silent token refreshes (~hourly). If the load effect lists `[user]` in its deps, every refresh re-fetches user_data and overwrites in-flight local edits. Use `[user?.id]` so the effect only re-runs when the actual user changes. Same for the autosave effect.
- **Autosave**: 500ms debounced upsert in AppContext. Surfaces a save-status pill (Saving / Saved / ✗ Save failed) in the bottom-right of /app. Errors are logged via `console.error('[user_data save]', code, message)`. A `visibilitychange → hidden` listener flushes pending writes when the tab is about to close — best-effort, no sendBeacon (Supabase auth header isn't supported there).
- supabase-js `.insert(...)` without `.select()` can resolve before PostgREST commits when RLS is enabled. The shared `audit()` helper uses `.insert(...).select().single()` so the await fully round-trips.
- Sensitive Vercel env vars (Stripe, Supabase service role, Anthropic) cannot be pulled to local `.env.local`. To run admin/server routes locally that need them, paste manually. Pulled values come back as empty strings.
- **Migrations run manually in Supabase SQL editor.** No supabase-cli pipeline yet — when a new migration lands in `supabase/migrations/YYYYMMDD_descriptive_name.sql`, paste it into the Supabase SQL editor and run it. (Historical migrations 001–010 use the older `NNN_*.sql` form; new files use the date-prefixed convention starting with `20260513_phase3_multi_outlet.sql`.) Migration `010_anthropic_usage.sql` adds the per-call metering table the admin Infrastructure dashboard reads to show actual Anthropic spend vs the formula estimate — run it before usage data will populate; without it the admin endpoint returns zeros + a `tableMissing` flag and the UI prompts you to run it.
- **Anthropic credit balance is a live operational dependency.** Recipe import (`/api/palatable/import-recipe`) and invoice scanning (`/api/palatable/scan-invoice`) both call Haiku 4.5 via api.anthropic.com — model ID `claude-haiku-4-5-20251001`, centralised in `src/lib/anthropic.ts` (swap once there to change tier). If the balance hits £0 the API returns HTTP 400 "Your credit balance is too low" — the UI surfaces this as a clear error pill but the feature is dead until topped up. Top-up: https://console.anthropic.com/settings/plans. Cost on Haiku 4.5 is a fraction of a penny per call (~13× cheaper than the previous Sonnet 4.6 default). Switched site-wide on 2026-05-14.

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

**1. Role determines surface set.** One system, three role-aware customer surface sets plus an internal founder surface:
- **Chef surface** — the sous chef. Calm, mobile-first, hides finance.
- **Manager surface** — site operational status. Exception management.
- **Owner surface** — business pulse, multi-site intelligence, financial reports.
- **Founder Admin (`/admin`)** — internal command centre, locked to jack@palateandpen.co.uk via Supabase auth. Five domains: Users & Kitchens, Business, System Health, Content & Comms, Founder Ops. v8-styled. Not a customer surface — exists so the operator of the business has one place to see everything.

**2. Within the chef set, ten tabs cover the chef's day:** Home, Prep, Recipes, Menus, Margins, Stock & Suppliers, Notebook, Inbox, Settings, Connections. Each surface answers one sous chef question; the chef's normal work feeds manager and owner views automatically. Full per-surface design rationale in `docs/strategy/working-notes/surface-notes-2026-05-14-evening.md` (locked 2026-05-14 final, supersedes earlier nine-tab and four-tab shapes).

**3. Manager shell — ten tabs, parallel structure to chef shell.** Manager Home + Menu Builder (top-level tab — v2 mockup locked, includes Layout controls, Engineering Overlays with Chef/Customer view toggle, and Custom Template Upload backed by the semantic layer naming convention in the formatting guide) locked. Remaining 8 tabs pending detail design.

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
- `docs/strategy/role-hierarchy.svg` — visual reference: Founder → Owner → Manager → Chef + Bartender (peers). Data flows up, permissions flow down.
- `docs/strategy/pre-launch-build-sequence.md` — 10–12 week pre-launch plan

When in doubt about a product or UX decision, read these first.

## Project conventions

### Build conventions

- All file writes via Node.js setup scripts to avoid Windows encoding issues
- Repo: Palate-Pen/palatepen-web, branch main
- Palatable web app lives at `Documents/palateandpen/web/`; mobile sibling at `Documents/palateandpen/app/`
- Stack: Next.js 14.2.5, React 18, Supabase (EU West London, project `xbnsytrcvyayzdxezpha`), Stripe, Tailwind, Anthropic Haiku 4.5 server-side

### MCP Tooling

- **GitHub MCP** — configured at project-local scope. Authenticated via a fine-grained PAT scoped to `Palate-Pen/palatepen-web` only. Used for reading repo files, viewing commits and PRs, and managing issues. **Token expires 90 days from generation — set a calendar reminder for rotation.**
- **Supabase MCP** — configured at project-local scope. Scoped to project `xbnsytrcvyayzdxezpha` only. **Read-write against production** — verified 2026-05-14 PM with a `CREATE TABLE _readwrite_probe; DROP TABLE _readwrite_probe;` round-trip that completed without error (previously read-only; boundary lifted since the earlier 25006 probe). There is no staging — every MCP write hits live data. Discipline below is **not optional**:
  - **DDL / schema changes:** author as a migration file in `supabase/migrations/YYYYMMDD_descriptive_name.sql` first, get it reviewed, then run via `apply_migration` or paste into the Supabase SQL editor. Never run ad-hoc DDL via `execute_sql` against production. **Once applied, add an `-- Applied: YYYY-MM-DD (...)` line to the migration's header comment** so future sessions don't re-run it. Before applying any migration that already has objects in the target schema, MCP-verify that the live state matches the file — if it matches exactly, just add the `Applied:` breadcrumb instead of re-running.
  - **DML on user/account data:** confirm with the user before running anything that mutates more than one row, or any `UPDATE`/`DELETE` without a tight `WHERE`. Show the affected row count from a `SELECT` first.
  - **Read queries (`SELECT`, `list_tables`, `get_advisors`, `get_logs`):** run freely.
  - **Hard stops — never run without explicit, scoped say-so in the same turn:** `DROP TABLE` / `DROP SCHEMA` on real tables, `TRUNCATE`, anything touching `auth.*`, anything irreversible. A standing "you can edit Supabase" does not authorize these.
- **Future sessions.** Prefer MCP tools over filesystem-only or paste-based workflows when working with repo state or DB schema context. Use the GitHub MCP to verify file contents post-write — that catches the Windows file encoding issues that bit us during the strategy doc work.

### CLAUDE.md size discipline

Keep this file lean — it's loaded on every Claude Code session, and bloat costs tokens. Rules:

- Reference material (vocabularies, completed work, historical entries) goes in `docs/`. CLAUDE.md gets a one-line pointer.
- The "Recent activity" stub stays terse — three short blocks (last shipped, in flight, next). Don't append; curate. Full detail goes in `docs/progress-log.md` and git commits.
- New Roadmap phases stay inline only while active. Completed phases move to `docs/roadmap-archive.md` with a one-line pointer in their place.
- Target: keep CLAUDE.md under 30k chars. If it crosses 40k, audit and extract.
