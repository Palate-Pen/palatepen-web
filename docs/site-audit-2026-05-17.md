# Palatable web — full site audit & build/link map

**Audit date:** 2026-05-17 (updated same day after corrections + first build batch)
**Source of truth for:** every page, every action, every API route, every cross-viewer dependency, every gap. When picking what to build next, read this first.

> **Update 2026-05-17 PM** — Initial audit had several false positives that were corrected during the first build batch:
> - `/coming-soon` is **not dead** — it's the live `palateandpen.co.uk` consulting marketing site.
> - `(flows)/onboarding` is **not a stub** — it's the real kitchen-name onboarding form.
> - Chef `/connections` is a deliberate redirect to `/manager/connections`, not an orphan.
> - `/api/cron/reseed-demo` **is** declared in `vercel.json` and already re-anchors all `is_demo` accounts (including hello@). The `reseed-hello-demo` route the original audit said was missing doesn't exist as a separate route — there's one cron that handles both demo accounts.
> - `/owner/reports` **is** already in `OWNER_SECTIONS`. Only `/owner/bank-comparison` was missing from the sidebar.
>
> See the "Build batches" section at the bottom for what's been shipped since.

---

## TL;DR

| Viewer | Sidebar tabs | Pages (incl. nested) | Status | Notable gaps |
|---|---|---|---|---|
| **Chef shell** (`(shell)/*`) | 9 + Settings | ~32 | Live | Covers forecast hardcoded; Notebook voice/photo/sketch stubbed |
| **Bartender** (`/bartender/*`) | 8 + Settings | ~22 | Live | `mise` station partition pending; transfer detail not deeply inspected |
| **Manager** (`/manager/*`) | 10 + Inbox + 2 footer | ~13 | Live | P&L revenue side waits on POS; rota stub on Home; export PDFs pending |
| **Owner** (`/owner/*`) | 8 + Alerts/Inbox + 2 footer | ~17 | Live | Revenue side POS-pending; Reports PDF export disabled; Bank Comparison + Reports not in sidebar |
| **Safety** (`/safety/*`) | 7 + Settings | 9 | Live (HACCP, EHO export gaps) | HACCP wizard steps 1–9 stubbed; EHO PDF disabled; live dish picker missing on Probe/Incident/Cleaning/Training |
| **Founder Admin** (`/admin/*`) | 1 + 5 domains | 7 | Live | Two demo-reseed cron routes missing from `vercel.json` |

**6 viewers, 13 API routes, 5 declared crons (+2 silent), ~100 routes total.**

---

## Feature summary

Cross-cutting view of every capability the app exposes, grouped by domain. Use this when sales / marketing / a customer asks "does Palatable do X?" — the per-viewer route table above tells you *where* a thing lives; this table tells you *what* it does and whether it's done.

Legend: ✅ live · 🟡 partial · 🔴 stubbed · ⏳ pending data dependency

### Recipes & costing

| Feature | Status | Tier | Entry point |
|---|---|---|---|
| Auto-costed recipes (live ingredient pricing) | ✅ | Free+ | `/recipes/[id]` |
| GP / margin tracking per dish | ✅ | Free+ | `/margins`, `/margins/[id]` |
| What-if cost simulator | ✅ | Free+ | `/margins/[id]` |
| Margin drift detection (cost vs baseline) | ✅ | Free+ | detector `recipe_drift`, surfaces in `/inbox` + Looking Ahead |
| Stale cost baseline detector (>30d old) | ✅ | Free+ | detector `stale_cost_baseline` |
| Menu GP drag detector (section below target) | ✅ | Free+ | detector `menu_gp_drag` |
| Sub-recipes (recipes that reference other recipes) | ✅ | Free+ | `/recipes/[id]/edit` |
| Recipe import from URL (AI extraction) | ✅ | Free+ | `/recipes/new` → `/api/palatable/import-recipe` |
| Supplier spec sheet bulk import (AI vision) | ✅ | Free+ | `/stock-suppliers/the-bank` → `/api/palatable/scan-spec-sheet` |
| Forward menu planner (Kasavana matrix) | ✅ | Kitchen+ | `/manager/menu-builder?mode=planning`, chef + bar `/menus?mode=planning` |
| Live digital menus (sell prices, dietary tags) | ✅ | Kitchen+ | `/menus`, `/bartender/menus` |
| Public menu URLs + QR codes | ✅ | Kitchen+ | `/m/[slug]` |
| Idle recipe detection (30d off menu/plan/prep) | ✅ | Free+ | detector `idle_recipe` |

### Stock & suppliers

| Feature | Status | Tier | Entry point |
|---|---|---|---|
| The Bank — live ingredient master + 90d price history | ✅ | Free+ | `/stock-suppliers/the-bank` |
| Cellar view (bar-side Bank) | ✅ | Free+ | `/bartender/back-bar/cellar` |
| Par level tracking + breach alerts | ✅ | Free+ | detector `par_breach` (food + bar variants) |
| AI invoice scanning (Haiku 4.5 vision) | ✅ | Pro+ | `/stock-suppliers/invoices/scan` → `/api/palatable/scan-invoice` |
| Email invoice forwarding (`invoices+{token}@`) | ✅ | Pro+ | `/api/inbound-email` (provider webhook) |
| Delivery confirmation + line-flagging flow | ✅ | Pro+ | post-scan modal on `/stock-suppliers/invoices/[id]` |
| Supplier reliability score (0–10) | ✅ | Free+ | `/stock-suppliers/suppliers`, `/manager/suppliers` |
| Credit note workflow (draft → sent → received) | ✅ | Free+ | `/stock-suppliers/credit-notes` |
| Purchase orders (lifecycle + mailto compose) | ✅ | Free+ | `/stock-suppliers/purchase-orders` |
| Reorder suggestions (below-par grouped by supplier) | ✅ | Free+ | `/stock-suppliers/purchase-orders` panel |
| Stock takes + variance (£ value) | ✅ | Free+ | `/stock-suppliers/stock-count`, `/bartender/back-bar/stock-take` |
| Inter-site stock transfers | ✅ | Group | `/stock-suppliers/transfers`, `/bartender/back-bar/transfers` |
| Waste log + category breakdown | ✅ | Free+ | `/stock-suppliers/waste` |
| Bar spillage tracking + pattern detection | ✅ | Free+ | `/bartender/back-bar/spillage` (read), waste dialog (write) |
| Live dish picker on waste (linked recipe) | ✅ | Free+ | `LogWasteDialog` |

### Safety

| Feature | Status | Tier | Entry point |
|---|---|---|---|
| Opening checks (Kitchen/Bar/Management side tabs) | ✅ | Safety add-on | `/safety` |
| Per-account custom checklist config | ✅ | Safety add-on | `/safety` → Manage Checklists |
| 12-week diary calendar with per-day detail | ✅ | Safety add-on | `/safety`, `/safety/diary/[date]` |
| Probe readings (FSA-aligned thresholds) | ✅ | Safety add-on | `/safety/probe` |
| Live dish picker on probe + incident | ✅ | Safety add-on | `DishPicker` |
| Incident logging (4 kinds · 14 allergens · severity) | ✅ | Safety add-on | `/safety/incidents` |
| Cleaning schedule (SFBB-aligned defaults) | ✅ | Safety add-on | `/safety/cleaning` |
| Per-frequency overdue detection | ✅ | Safety add-on | detector `cleaning_overdue` |
| Training records + cert expiry ladder | ✅ | Safety add-on | `/safety/training` |
| Expiring training detector (30/14/0 day) | ✅ | Safety add-on | detector `training_expiring` |
| Failing probe location detector | ✅ | Safety add-on | detector `probe_failing_location` |
| Open / aging incident detector | ✅ | Safety add-on | detector `incident_open` |
| Missed opening check detector | ✅ | Safety add-on | detector `opening_check_missing` |
| Compliance Health Card (weighted 5-factor) | ✅ | Safety add-on | `/safety` |
| User attribution stamps on every event row | ✅ | Safety add-on | resolveSafetyUsers helper |
| Locked liability wording + onboarding ack | ✅ | Safety add-on | `SafetyOnboardingModal`, `LiabilityFooter` |
| HACCP wizard | 🔴 intro + step-1 stub | Safety add-on | `/safety/haccp` (steps 1–9 pending) |
| EHO export bundle (preview) | ✅ | Safety add-on | `/safety/eho` |
| EHO export PDF generation | 🔴 button disabled | Safety add-on | needs `react-pdf` wire-up |
| EHO inspector visit log | 🔴 schema only | Safety add-on | `v2.safety_eho_visits` referenced, no UI |
| Cleaning signoff dish link | ✅ | Safety add-on | `/safety/cleaning` → expand caret on any row |
| Training dish/menu link | ✅ | Safety add-on | `/safety/training` → "Linked dish (optional)" |
| Stripe £20/site/mo Safety upsell | 🔴 flag exists, billing not wired | Safety add-on | `accounts.safety_enabled` |

### Intelligence (Looking Ahead)

| Feature | Status | Tier | Entry point |
|---|---|---|---|
| Forward signal inbox per role | ✅ | Free+ | `/inbox`, `/bartender/inbox`, `/manager/inbox`, `/owner/alerts` + `/owner/inbox` |
| Looking Ahead bar (top of every surface) | ✅ | Free+ | every Home / detail page |
| 13 forward-signal detectors (par, drift, market, etc.) | ✅ | Free+ | `src/lib/signal-detectors.ts` |
| Per-surface filtering of signals | ✅ | Free+ | `target_surface` filter on `v2.forward_signals` |
| Severity stripe (urgent · attention · healthy · info) | ✅ | Free+ | signal card component |
| Tagged signals (Plan For It · Get Ready · Worth Knowing · Market Move) | ✅ | Free+ | `tag` column |
| Daily detector regeneration | ✅ | Free+ | cron 08:00 / 08:30 / 09:00 UTC |
| Safety event emitters → intelligence_events | ✅ | Safety add-on | Postgres triggers (5 emitters) |
| intelligence_events → forward_signals drain | ✅ | Free+ | `/api/cron/drain-events` 08:15 UTC |

### Team & multi-site

| Feature | Status | Tier | Entry point |
|---|---|---|---|
| Per-account membership + 8-role catalogue | ✅ | Free+ | `v2.memberships` |
| Owner / manager / chef / bartender / etc. role hierarchy | ✅ | Free+ | `src/lib/roles.ts` |
| Per-feature flag override per member | ✅ | Kitchen+ | `v2.feature_flags`, `MemberPermissions` |
| Tier-gated user / outlet / scan caps | ✅ | All | `src/lib/tierGate.ts`-equivalent in `src/lib/admin.ts` |
| Multi-outlet under one account | ✅ | Group | `v2.sites` FK to `v2.accounts` |
| Group rollup dashboard | ✅ | Group | `/owner/sites` group KPI strip |
| Cross-site Bank Comparison (≥5% spread) | ✅ | Group | `/owner/bank-comparison` |
| Cross-site supplier ledger | ✅ | Group | `/owner/cash`, `/owner/suppliers` |
| Period reports (7d / 30d / 90d) per site + group | ✅ | Kitchen+ | `/manager/reports`, `/owner/reports` |
| Per-site signals / alerts | ✅ | Group | `/owner/alerts` |
| Team detail with per-site permissions | ✅ | Kitchen+ | `/owner/team/u/[userId]`, `/manager/team/[id]` |
| Owner Danger Zone (remove / delete) | ✅ | Group | `/owner/team/u/[userId]` |
| Owner add-site UI | 🔴 admin SQL only | Group | — |
| Reports PDF / CSV export bundle | 🔴 disabled | Kitchen+ | `/manager/reports`, `/owner/reports` |

### Integrations & APIs

| Feature | Status | Tier | Entry point |
|---|---|---|---|
| Stripe subscriptions + webhook | ✅ | Pro+ | `/api/stripe/webhook` |
| Founder + demo billing skip | ✅ | n/a | `accounts.is_founder` + `accounts.is_demo` short-circuit |
| Inbound email webhook (multi-provider) | ✅ | Pro+ | `/api/inbound-email` |
| Anthropic Haiku 4.5 (server-side) | ✅ | varies | `src/lib/anthropic.ts` |
| AI request cache + usage metering | ✅ | n/a | `v2.ai_cache`, `v2.anthropic_usage` |
| Public read-only API (bearer token) | ✅ | Kitchen+ | `/settings` → API Access |
| CSV exports (recipes/bank/stock/waste/invoices) | ✅ | Kitchen+ | `/api/export` |
| POS / Xero / accountant integrations | 🔴 keys UI, no consumers | Kitchen+ | `ConnectionsPanel` on manager + owner |
| Photo upload (Supabase Storage) | 🟡 notebook attachments live, recipe photos pending | Free+ | `PhotoUpload` component |

### Admin & ops

| Feature | Status | Tier | Entry point |
|---|---|---|---|
| Founder admin (5 domains) | ✅ | founder only | `/admin/*` |
| Per-account demo populate RPC | ✅ | founder + is_demo | `/admin/accounts/[id]` |
| User impersonation via magic link + gold pill | ✅ | founder only | `/admin/users` |
| Announcement publisher | ✅ | founder only | `/admin/content` |
| Daily demo reseed cron (re-anchors to today) | ✅ | n/a | `/api/cron/reseed-demo` 08:45 UTC |
| System health dashboard (19 v2 table counts) | ✅ | founder only | `/admin/system` |
| MRR / ARR / tier breakdown | ✅ | founder only | `/admin/business` |
| GitHub Issues integration | ✅ | founder only | `/admin/ops` |
| Maintenance mode (env-toggled) | ✅ | n/a | `/maintenance` + middleware |
| Error reporter | ✅ | n/a | `src/lib/error-reporter.ts` |
| Founder Ops runbook | ✅ | n/a | `docs/runbook.md` |

### Marketing & onboarding

| Feature | Status | Tier | Entry point |
|---|---|---|---|
| Palate & Pen consulting marketing site | ✅ | public | `palateandpen.co.uk` (served from `/coming-soon`) |
| Palatable app landing | ✅ | public | `app.palateandpen.co.uk/landing` |
| Pre-launch CTA stub | ✅ | public | `/coming-soon-feature` |
| Auth flows (sign in / sign up · password + magic link) | ✅ | public | `(flows)/signin`, `(flows)/signup` |
| Kitchen-name onboarding (step 1 of 5) | 🟡 step 1 only | Free+ | `(flows)/onboarding` |
| End-to-end signup smoke test | 🔴 manual | n/a | Founder Ops checklist |

---

## Sidebar maps — canonical, verbatim from `src/components/shell/nav-config.ts`

### CHEF_SECTIONS

| Section | Item | Icon | Href |
|---|---|---|---|
| Kitchen | Home | `home` | `/` |
| Kitchen | Prep | `prep` | `/prep` |
| Kitchen | Safety | `compliance` | `/safety` |
| Kitchen | Recipes | `recipes` | `/recipes` |
| Kitchen | Menus | `menus` | `/menus` |
| Kitchen | Margins | `margins` | `/margins` |
| Kitchen | The Walk-in | `stock-suppliers` | `/stock-suppliers` |
| Kitchen | Notebook | `notebook` | `/notebook` |
| Intelligence | Inbox | `inbox` | `/inbox` |

Footer: Settings `/settings`.

### BARTENDER_SECTIONS

| Section | Item | Icon | Href |
|---|---|---|---|
| Bar | Home | `home` | `/bartender` |
| Bar | Prep | `cocktail-shaker` | `/bartender/mise` |
| Bar | Specs | `recipes` | `/bartender/specs` |
| Bar | Menus | `menus` | `/bartender/menus` |
| Bar | Margins | `margins` | `/bartender/margins` |
| Bar | Back Bar | `stock-suppliers` | `/bartender/back-bar` |
| Bar | Notebook | `notebook` | `/bartender/notebook` |
| Intelligence | Inbox | `inbox` | `/bartender/inbox` |

Footer: Settings `/bartender/settings`.

### MANAGER_SECTIONS

| Section | Item | Icon | Href |
|---|---|---|---|
| Site | Home | — | `/manager` |
| Site | Dishes | — | `/manager/dishes` |
| Site | Menu Builder | — | `/manager/menu-builder` |
| Site | Team | — | `/manager/team` |
| Site | P&L | — | `/manager/pl` |
| Site | Deliveries | — | `/manager/deliveries` |
| Site | Suppliers | — | `/manager/suppliers` |
| Site | Service Notes | — | `/manager/service-notes` |
| Site | Compliance | — | `/manager/compliance` |
| Site | Reports | — | `/manager/reports` |
| Intelligence | Inbox | — | `/manager/inbox` |

Footer: Settings `/manager/settings`, Connections `/manager/connections`.

### OWNER_SECTIONS

| Section | Item | Icon | Href |
|---|---|---|---|
| Business | Home | `home` | `/owner` |
| Business | Sites | `sites` | `/owner/sites` |
| Business | Revenue | `revenue` | `/owner/revenue` |
| Business | Margins | `margins` | `/owner/margins` |
| Business | Suppliers | `suppliers` | `/owner/suppliers` |
| Business | Cash | `cash` | `/owner/cash` |
| Business | Transfers | `prep` | `/owner/transfers` |
| Business | Team | `team` | `/owner/team` |
| Intelligence | Alerts | `inbox` | `/owner/alerts` |
| Intelligence | Inbox | `inbox` | `/owner/inbox` |

Footer: Settings `/owner/settings`, Connections `/owner/connections`.
**Sidebar omissions:** `/owner/reports` and `/owner/bank-comparison` exist but aren't linked in the sidebar — reachable only from Home quick-actions / Sites breadcrumb.

### SAFETY_SECTIONS

| Section | Item | Icon | Href |
|---|---|---|---|
| Daily Diary | Home | `home` | `/safety` |
| Daily Diary | Probe | `prep` | `/safety/probe` |
| Daily Diary | Issues | `service-notes` | `/safety/incidents` |
| Daily Diary | Cleaning | `compliance` | `/safety/cleaning` |
| Daily Diary | Training | `team` | `/safety/training` |
| EHO | HACCP | `reports` | `/safety/haccp` |
| EHO | EHO Export | `inbox` | `/safety/eho` |

Footer: Settings `/safety/settings` (currently redirects to `/settings`).

### AdminSidebar (`src/components/admin/AdminSidebar.tsx`)

| Section | Item | Href |
|---|---|---|
| Overview | Home | `/admin` |
| Domains | Users & Kitchens | `/admin/users` |
| Domains | Business | `/admin/business` |
| Domains | System Health | `/admin/system` |
| Domains | Content & Comms | `/admin/content` |
| Domains | Founder Ops | `/admin/ops` |

---

## Per-viewer route tables

### Chef shell — `src/app/(shell)/*`

| Route | Purpose | Reads (libs / v2.* tables) | Writes (action / RPC) | Cross-viewer | Gating | Gaps |
|---|---|---|---|---|---|---|
| `/` | Day dashboard — deliveries, prep, KPIs, forward calendar | `home`, `safety/forward-calendar`, `prep`, `recipes`, `bank` | — | Quick-action links into every chef tab | — | Covers forecast hardcoded; needs `v2.covers` |
| `/prep` | 5-day prep board, station status | `prep`, `recipes`, `dates` | `submitPrepStatusAction`, `updatePrepNotesAction` | Drives manager Home prep KPI | — | suggested_qty heuristic |
| `/recipes` | Recipe index, tag cloud, GP drift | `recipes`, `bar` | — | Manager Dishes / Owner Margins read same tables | — | — |
| `/recipes/new` | Create form | `recipes` | `createRecipeAction` | — | — | Photo upload pending Supabase Storage |
| `/recipes/[id]` | Detail — ingredients, GP, allergens, linked notebook | `recipes`, `allergens`, `nutrition`, `notebook`, `gp-calculations` | `updateRecipeAction`, `updateRecipeIngredientsAction` | Manager Compliance + Owner Margins drill here; Safety Probe/Incident could link via `recipe_id` (currently free-form) | — | usedIn query unindexed |
| `/recipes/[id]/edit` | Full edit form | `recipes` | `updateRecipeAction` + ingredient CRUD | — | — | — |
| `/menus` | Menu designer — live vs planning | `recipes`, `dietary` | — | `/manager/menu-builder` is the canonical edit; public `/m/[slug]` reads the same | Planning mode Kitchen+ (stubbed) | — |
| `/margins` | GP rollup, section / per-dish | `margins`, `bar`, `account-preferences` | — | Mirrors `/owner/margins` (per-site) and `/manager/pl` | — | — |
| `/margins/[id]` | What-if simulator | `recipes`, `margins`, `account-preferences` | `updateRecipeAction` (sell price inline) | — | — | Simulator output not persisted |
| `/stock-suppliers` | Hub — 8 sub-cards + signal panel | `hub`, `bank`, `credit-notes`, `purchase-orders`, `stock-transfers`, `invoices` | — | Bartender Back Bar reuses every child surface | — | — |
| `/stock-suppliers/deliveries` | Scheduled deliveries | `deliveries` | `confirmDeliveryAction`, `scheduleDeliveryAction` | Bartender Back Bar Deliveries reads same; Manager Deliveries forecast 7d | — | No invoice reconciliation hook |
| `/stock-suppliers/invoices` | Pending / confirmed / flagged | `invoices` | `confirmInvoiceAction`, `flagInvoiceAction` | Bartender invoices view + Manager P&L / Suppliers + Owner Cash / Reports all read `v2.invoices` | — | — |
| `/stock-suppliers/invoices/scan` | AI scan (Haiku 4.5) | Anthropic `scan-invoice` API | `scanInvoiceAction` → `v2.invoices` + `v2.invoice_lines` | Inbound email writes to same table | Pro+ (`requireFeature('invoice_scanning')`) | — |
| `/stock-suppliers/invoices/[id]` | Line reconciliation, draft credit note | `invoices`, `credit-notes` | `flagInvoiceLineAction`, `draftCreditNoteAction`, `confirm-invoice` API | Feeds supplier reliability score | — | — |
| `/stock-suppliers/credit-notes` | Lifecycle: draft / sent / received | `credit-notes` | `draft / send / receive` actions | Owner Cash + Manager Reports surface count | — | — |
| `/stock-suppliers/credit-notes/[id]` | Composer + state bar | `credit-notes` | `update / send / receive` | — | — | — |
| `/stock-suppliers/the-bank` | Live ingredient master | `bank`, `suppliers` | `updateParLevelAction`, `updatePriceAction` | Bartender Cellar reads same `v2.ingredients`; Owner Bank Comparison aggregates | — | — |
| `/stock-suppliers/the-bank/[id]` | Item detail + price history | `bank`, `recipes` | `updateParLevelAction`, `updatePriceAction` | — | — | — |
| `/stock-suppliers/the-bank/new` | Add ingredient | `suppliers` | `createIngredientAction` | — | — | — |
| `/stock-suppliers/suppliers` | Roster + reliability | `suppliers`, `invoices` | `updateSupplierAction` | Bartender Suppliers + Manager Suppliers + Owner Suppliers read same | — | — |
| `/stock-suppliers/suppliers/[id]` | Per-supplier history + trend | `suppliers`, `invoices` | `updateSupplierAction` | — | — | — |
| `/stock-suppliers/purchase-orders` | Reorder suggestions + PO list | `purchase-orders`, `bank` | `createPurchaseOrderAction`, `send / receive` | Owner Sites shows open PO count | — | — |
| `/stock-suppliers/purchase-orders/[id]` | Line editor + mailto compose | `purchase-orders` | line update + lifecycle | — | — | — |
| `/stock-suppliers/stock-count` | Weekly takes | `stock-takes` | `createStockCountAction`, `update / complete` | Bartender Back Bar Stock Take is the bar parallel | — | — |
| `/stock-suppliers/stock-count/[id]` | Tick sheet + variance | `stock-takes` | line update, complete | — | — | — |
| `/stock-suppliers/waste` | Waste log | `waste` | `logWasteAction` | Bartender Spillage reads `v2.waste_entries` with `spillage_reason`; Manager Reports / Owner Reports aggregate | — | Photo upload pending |
| `/stock-suppliers/transfers` | Inter-site moves | `stock-transfers` | `createStockTransferAction`, `update / complete` | Bartender transfers + Owner Transfers read same | Group+ (functionally) | — |
| `/stock-suppliers/transfers/new` | Source/dest picker | `sites`, `ingredients` | `createStockTransferAction` | — | Group+ | — |
| `/stock-suppliers/transfers/[id]` | Line editor + receive | `stock-transfers` | line update, complete | — | Group+ | — |
| `/notebook` | Entry list + filters | `notebook`, `preferences`, `recipes` | `createNotebookEntryAction` | Manager Service Notes reads last 7d; Bartender Notebook is the bar parallel | — | Voice / photo / sketch stubbed |
| `/notebook/[id]` | Entry detail + edit | `notebook` | `updateNotebookEntryAction`, `archiveNotebookEntryAction` | — | — | — |
| `/inbox` | Forward signals (chef-targeted) | `inbox` | `dismissSignalAction`, `markSignalAsActedAction` | Reads `v2.forward_signals`; same table as Manager/Owner/Bartender inboxes filtered by surface | — | Detector consumers for safety events not wired |
| `/settings` | Profile, prefs, tier, inbox token, sign-out | `preferences`, `account-preferences`, `roles`, `tierGate` | `updatePreferenceAction`, `rotateInboxTokenAction`, `updateAccountPreferencesAction` | Surface switcher routes to `/bartender`, `/manager`, `/owner`, `/admin` | Top-role gate on Tier/Billing + account prefs | DataExportPanel — `/api/export` |
| `/connections` | (redirects to `/manager/connections`) | — | — | — | — | — |

### Bartender — `src/app/bartender/*`

| Route | Purpose | Reads | Writes | Cross-viewer | Gaps |
|---|---|---|---|---|---|
| `/bartender` | Bar home — KPIs, Tonight's Specs, Cellar Watch, 14d calendar | `getBarHomeRollup`, `getForwardCalendar`, `v2.recipes` (bar dish types), `v2.ingredients`, `v2.waste_entries` (spillage) | — | — | — |
| `/bartender/mise` | Bar prep — station cards | `v2.prep_items` (filtered today+) | — | Same `v2.prep_items` as chef `/prep` — needs station discriminator | Station partition pending |
| `/bartender/specs` | Spec list, tag cloud | `getRecipes` (bar types), `buildTagCloud` | — | Owner Margins / Manager Dishes read same | — |
| `/bartender/specs/new` | New spec form | `v2.ingredients`, `v2.recipes` (sub-specs), Anthropic import | `submitRecipeAction` | — | — |
| `/bartender/specs/[id]` | Spec detail — pour cost, GP, build | `getRecipe`, `account-preferences`, `notebook`, GP history | — | — | — |
| `/bartender/specs/[id]/edit` | Edit | bank + sub-recipes | `submitRecipeAction` | — | — |
| `/bartender/menus` | Drinks list, sections, planning mode | `getRecipes` (bar types) | `submitMenuPlanAction` via PlannerView | `/m/[slug]` public render | — |
| `/bartender/margins` | Drink margin grid, pour-cost bands | `getRecipes` + `POUR_COST_BANDS` | — | Owner Margins reads `v2.recipes` cost_baseline | — |
| `/bartender/back-bar` | Bar hub — 7 destination cards | `getCellarRows`, `v2.allocations`, `v2.invoices`, `v2.waste_entries`, `v2.stock_takes` | — | Mirrors chef `/stock-suppliers` | — |
| `/bartender/back-bar/cellar` | Cellar inventory by category | `getCellarRows`, CELLAR_CATEGORIES | — | Item rows link into chef `/stock-suppliers/the-bank/[id]` | — |
| `/bartender/back-bar/spillage` | Spillage log + pattern detection | `v2.waste_entries` (spillage_reason) | — | Same `v2.waste_entries` as chef Waste | — |
| `/bartender/back-bar/stock-take` | Takes list (bar scope) | `listStockTakes` | — | Same `v2.stock_takes` | — |
| `/bartender/back-bar/stock-take/[id]` | Session — tick / complete | `getStockTake` | `updateStockCountAction`, `completeStockCountAction`, `cancelStockCountAction` | — | — |
| `/bartender/back-bar/deliveries` | 7d forecast (read-only) | `getDeliveries` | — | Note redirects scheduling to chef `/stock-suppliers/deliveries` | — |
| `/bartender/back-bar/invoices` | Awaiting + recent (read-only) | `getInvoicesList` | — | Scan link routes back to chef `/stock-suppliers/invoices/scan` | — |
| `/bartender/back-bar/suppliers` | Roster (read-only) | `getSuppliers` | — | Full edit on chef `/stock-suppliers/suppliers/[id]` | — |
| `/bartender/back-bar/transfers` | Bar transfers list | `listTransfers` | — | Same `v2.stock_transfers` | — |
| `/bartender/back-bar/transfers/new` | Draft transfer | `v2.memberships` + sites | `draftTransferAction` | — | — |
| `/bartender/back-bar/transfers/[id]` | Detail (not deeply inspected) | shared transfer actions | — | — | — |
| `/bartender/notebook` | Bar notebook | `v2.notebook_entries` | — | Same shared notebook table | — |
| `/bartender/notebook/[id]` | Entry detail | `getNotebookEntry`, recipe + plan picker (bar) | `submitNoteAction` | — | — |
| `/bartender/inbox` | Bar-surface signals | `v2.forward_signals` (target_surface IN bar set) | — | Same `v2.forward_signals` | — |
| `/bartender/settings` | Switch surface, Bar Info, tier, sign-out | shell ctx + account prefs | `updateAccountPreferencesAction` | — | — |
| `/bartender/connections` | Integrations panel | `ConnectionsPanel` (per-site) | server action inside panel | — | — |

### Manager — `src/app/manager/*`

| Route | Purpose | Reads | Writes | Cross-viewer | Gaps |
|---|---|---|---|---|---|
| `/manager` | Operational home — 11 KPIs + forward calendar | `getManagerHomeData`, `getForwardCalendar` | — | Quick-actions across chef shell + safety | Rota staffing card stubbed |
| `/manager/dishes` | Library (food + bar), filter chips | `getRecipes` | — | Click-through to `/recipes/[id]` or `/bartender/specs/[id]` | — |
| `/manager/menu-builder` | Build mode + Planning mode | `v2.menus`, `v2.menu_versions`, `v2.menu_items`, `v2.menu_plans`, `v2.menu_plan_items` | menu + plan update actions | Plan drives chef `/menus` + bar `/bartender/menus` | Custom template upload pending |
| `/manager/team` | Brigade roster, role grid | `v2.memberships`, `auth.users` (service), `v2.feature_flags` | — | Detail mirrors `/owner/team/u/[userId]` | Invite/remove flows pending |
| `/manager/team/[id]` | Per-member detail | same + role selector | role + flag updates, Danger Zone | — | — |
| `/manager/pl` | 7d/30d cost KPIs | `getPeriodSummary` | — | Aggregates `v2.invoices` + `v2.waste_entries` | Revenue side POS-pending |
| `/manager/deliveries` | 7d forecast | `v2.deliveries` | — | Read-only mirror of chef ordering surface | — |
| `/manager/suppliers` | Roster + reliability | `getSuppliers` | — | Edit routes to chef `/stock-suppliers/suppliers/[id]` | — |
| `/manager/service-notes` | 7d notebook digest | `getServiceNotes` (`v2.notebook_entries`) | — | Reads chef/bar notebook | — |
| `/manager/compliance` | UK FIR allergen coverage | `getComplianceRollup` | — | Click-through to chef recipe detail | — |
| `/manager/reports` | 7/30/90d period rollup | `getPeriodSummary` + `getMarginRollup` | — | Same source as Owner Reports | PDF export pending |
| `/manager/inbox` | Site-scoped forward signals | `v2.forward_signals` | dismiss/act actions | Same table | Safety detector consumers pending |
| `/manager/settings` | Account tier + prefs + switch surface | account prefs, role check | tier/billing → Stripe webhook | Surface link to `/`, `/bartender`, `/owner`, `/admin` | — |
| `/manager/connections` | POS / email / accountant keys | `ConnectionsPanel` | save/revoke actions | — | POS integration pending |

### Owner — `src/app/owner/*`

| Route | Purpose | Reads | Writes | Cross-viewer | Gaps |
|---|---|---|---|---|---|
| `/owner` | Multi-site KPIs, group rollup | `getManagerHomeData` per-site, `forward_calendar` | — | Quick-actions to every owner tab | — |
| `/owner/sites` | Per-site cards + group KPI strip | per-site invoices/recipes/POs/waste rollups | — | Per-card "View as Chef / Manager" links | Owner-add-site UI pending (admin SQL only) |
| `/owner/suppliers` | Group leverage view | `getSuppliers` per-site | — | Links to chef supplier detail | — |
| `/owner/margins` | Group dish performance | `getMarginRollup` per-site | — | Drift tiles link to recipe detail | — |
| `/owner/reports` | 7/30/90d cross-site rollup | `getPeriodSummary`, `getMarginRollup` | — | **Not in sidebar** — Home quick-action only | Phase 5 PDF + CSV pending |
| `/owner/cash` | Supplier ledger across sites | `getSupplierLedger` | — | Supplier detail link | A/R + bank feed pending |
| `/owner/revenue` | Cost-side only (POS pending) | `getPeriodSummary` | — | — | Revenue stub |
| `/owner/bank-comparison` | Cross-site ingredient price spread (≥5%) | every ingredient per-site, name-grouped | — | **Not in sidebar** — Sites breadcrumb only; single-site redirects | — |
| `/owner/transfers` | Cross-site movement log | `listTransfers` de-duped | — | Draft/send in chef shell | — |
| `/owner/alerts` | Active urgent + attention signals (80 row limit) | `v2.forward_signals` filtered | dismiss/act via signal card | — | — |
| `/owner/inbox` | Owner-level signals (urgent + attention only) | `v2.forward_signals` | dismiss/act | — | — |
| `/owner/team` | Brigade across all owned sites, de-duped per user | `v2.memberships`, `auth.users`, `v2.feature_flags` | feature flag overrides | — | — |
| `/owner/team/[id]` | Legacy redirect → `/owner/team/u/[userId]` | membership lookup | — | — | — |
| `/owner/team/u/[userId]` | Per-user detail, per-site permissions, Danger Zone | full team context | role + flag + remove + delete | — | — |
| `/owner/settings` | Tier, billing, prefs, switch surface | account prefs | account prefs save, Stripe redirect | Surface link to `/admin` if founder | — |
| `/owner/connections` | Per-site keys + tabs | `ConnectionsPanel` | save/revoke | — | — |

### Safety — `src/app/safety/*`

| Route | Purpose | Reads | Writes | Cross-viewer | Gaps |
|---|---|---|---|---|---|
| `/safety` | Home — opening checks (Kitchen/Bar/Management), 12-week diary calendar, Compliance Health Card | `safety/home`, `safety/forward-calendar`, `safety/compliance`, `safety/standards` | `submitOpeningCheckAction` (upsert `v2.safety_opening_checks` + `_meta` attribution) | Calendar day-click → `/safety/diary/[date]`; manager/chef Home embed Safety status | Manage Checklists CRUD only at dept level |
| `/safety/probe` | Probe reading log | `getRecentProbeReadings`, PROBE_RULES | `logProbeReadingAction` → `v2.safety_probe_readings` (FSA pass/fail) | Emitter fires `v2.intelligence_events` | Live dish picker free-form |
| `/safety/incidents` | 4 incident types · 14 allergen pills · severity · 7-item corrective | `getRecentIncidents`, ALLERGEN_LABEL | `logIncidentAction` → `v2.safety_incidents` | Emitter → `v2.intelligence_events` | Corrective-action checklist not fully interactive |
| `/safety/cleaning` | SFBB tasks by frequency, manage schedule | `getCleaningSchedule`, CLEANING_FREQ_LABEL | `seedDefaultCleaningTasksAction`, `signoffCleaningTaskAction`, `create/update/delete CleaningTaskAction` | Emitter → `v2.intelligence_events` | — |
| `/safety/training` | Cert expiry ladder 30/14/7/0d | `getTrainingRecords` | `addTrainingAction` → `v2.safety_training` (owner/manager only) | Emitter → `v2.intelligence_events` | No edit/delete UI |
| `/safety/haccp` | 9-step wizard (intro + step-1 stub only) | none yet | none yet | — | **Steps 1–9 form fields stubbed.** No `v2.safety_haccp_plans` table yet. |
| `/safety/eho` | 90-day evidence bundle preview | `getSafetyEhoRollup`, per-domain helpers | — | All 8 tiles link to source surfaces | **PDF export disabled** (react-pdf not wired). Inspector visit card pending. |
| `/safety/diary/[date]` | Per-date record + Missed-on-this-day | `getDiaryDay` joins all `v2.safety_*` + cleaning_tasks | — | CTAs link to add/correct | — |
| `/safety/settings` | Redirect to `/settings` | — | — | — | Dedicated settings stub |

**Safety tables touched:** `v2.safety_opening_checks`, `v2.safety_probe_readings`, `v2.safety_incidents`, `v2.safety_cleaning_tasks`, `v2.safety_cleaning_signoffs`, `v2.safety_training`, `v2.safety_eho_visits` (referenced, not yet consumed), `v2.menu_versions` (snapshot ref on probe/incident).

**Event emitters (Supabase triggers):** `emit_safety_opening_check_event`, `emit_safety_probe_event`, `emit_safety_incident_event`, `emit_safety_cleaning_event`, `emit_safety_training_event` → all write to `v2.intelligence_events`. **Detector consumers in `src/lib/signal-detectors.ts` not wired** — `v2.forward_signals` does not yet receive safety-driven rows.

### Founder Admin — `src/app/admin/*`

| Route | Purpose | Reads | Writes | Notes |
|---|---|---|---|---|
| `/admin` | Command-centre KPIs + recent signups | `accounts`, `auth.users`, GitHub API, `forward_signals` | announcement publish | MRR / active kitchens / DAU / open issues |
| `/admin/users` | People + Accounts dual view | `auth.users`, `accounts`, `sites`, `memberships` | `setAccountTierAction`, `impersonateUserAction`, `removeMembershipAction`, `deleteUserAction` | Inline tier dropdown; impersonate via Supabase magic link → gold pill |
| `/admin/users/[userId]` | Per-user detail, owned accounts, Danger Zone | same | tier + remove + delete | Self + founder-account protection |
| `/admin/accounts/[id]` | Account detail, member list, sites, Stripe IDs | full account context | `setAccountTierAction`, `populateAccountAction` (RPC `v2.populate_demo_account`) | **Populate demo data button** (is_founder OR is_demo gate). Two-click confirm. |
| `/admin/business` | MRR by tier, ARR, paying count | `accounts` tier + stripe IDs | — | — |
| `/admin/system` | 19 v2 table row counts + signal mix | row counts + `forward_signals` | — | — |
| `/admin/content` | Announcement publication | custom `announcements` table | `createAnnouncementAction`, `deactivateAnnouncementAction` | Severity pill + expires-at |
| `/admin/ops` | GitHub issues + roadmap + reseed cards | GitHub API + CLAUDE.md + `accounts.is_demo`/`is_founder` | `reseedDemoAction`, `reseedHelloDemoAction` | Manual reseed buttons compensate for unscheduled crons (see API gaps) |

**Gate:** `src/app/admin/layout.tsx` checks email against `ADMIN_EMAIL` env var (jack@palateandpen.co.uk).

### Flows, public, maintenance

| Route | Purpose | Notes |
|---|---|---|
| `(flows)/signin` | Password + magic link | Routes to `/` on success |
| `(flows)/signup` | Password + magic link | 8-char min; routes to `/` |
| `(flows)/onboarding` | **Stub** — purpose unclear, no implementation found |
| `/coming-soon-feature` | Pre-launch gate ("Trials open very soon") | Every landing/flows CTA routes here. Founder uses `/signin` directly. |
| `/coming-soon` | **Dead variant** — exists but unused; `/coming-soon-feature` is canon |
| `/maintenance` | `MAINTENANCE_MODE=true` redirect target | Middleware passthrough for `/api/stripe/webhook`, `/api/inbound-email`, `/api/cron/*` |
| `/landing` | Public landing on `app.palateandpen.co.uk` for unauth | Hero + problem grid + brigade + modules + Margins + Safety (dark) + pricing + final CTA |
| `/m/[slug]` | Public menu reader | Server-rendered, OG meta, revalidate 60s. Demo: `berber-and-q`. |
| `/auth/callback` | Supabase magic-link callback | — |
| `/error.tsx` | App-wide error boundary | — |

---

## API surface — `src/app/api/*`

| Path | Method | Purpose | Auth | Caller |
|---|---|---|---|---|
| `/api/stripe/webhook` | POST | Subscription lifecycle | Stripe HMAC | Stripe platform |
| `/api/inbound-email` | POST | Inbound invoice forwarding | `INBOUND_EMAIL_SECRET` (Bearer or `?secret=`) | Resend / Postmark / Mailgun |
| `/api/palatable/scan-invoice` | POST | AI invoice scan (Haiku 4.5) | Supabase session | `/(shell)/stock-suppliers/invoices/scan` |
| `/api/palatable/confirm-invoice` | POST | Confirm scan → write price history + ingredient current_price | Supabase session | `/(shell)/stock-suppliers/invoices/[id]/actions.ts` |
| `/api/palatable/import-recipe` | POST | URL → JSON-LD recipe extract | Supabase session | `/(shell)/recipes/new/NewRecipeClient.tsx` |
| `/api/palatable/scan-spec-sheet` | POST | Supplier spec sheet → bulk bank | Supabase session | `/(shell)/stock-suppliers/the-bank/ScanSpecSheetDialog.tsx` |
| `/api/export` | GET | CSV export (`?dataset=recipes\|bank\|stock\|waste\|invoices`) | Supabase session, Kitchen+ tier | `/(shell)/settings/DataExportPanel.tsx` |
| `/api/cron/drain-events` | GET | Drain unprocessed `v2.intelligence_events` | `CRON_SECRET` | Vercel cron |
| `/api/cron/detect-market-moves` | GET | Cross-supplier ±4% in 14d → signal | `CRON_SECRET` | Vercel cron |
| `/api/cron/detect-recipe-staleness` | GET | Cost drift >3% AND ≥28d old → signal | `CRON_SECRET` | Vercel cron |
| `/api/cron/detect-cost-spikes` | GET | Cost +4% AND GP <72% → signal | `CRON_SECRET` | Vercel cron |
| `/api/cron/reseed-demo` | GET | Re-anchor founder demo to "today" | `CRON_SECRET` | **Vercel cron — but NOT declared in vercel.json** |
| `/api/cron/reseed-hello-demo` | GET | Re-anchor hello@ customer demo | `CRON_SECRET` | **Vercel cron — but NOT declared in vercel.json** |

### Cron declarations (`vercel.json`)

```
00 08  detect-market-moves
15 08  drain-events
30 08  detect-recipe-staleness
45 08  reseed-demo               ← exists in code, MISSING from file
00 09  detect-cost-spikes
   ??  reseed-hello-demo         ← exists in code, MISSING from file
```

---

## Cross-viewer link graph — what reads from what

```
v2.recipes ───┬─→ chef /recipes, /margins
              ├─→ bartender /specs, /margins
              ├─→ manager /dishes, /menu-builder, /compliance
              ├─→ owner /margins
              ├─→ safety probe/incident (recipe_id ref — UI not wired)
              └─→ public /m/[slug]

v2.ingredients ──┬─→ chef /stock-suppliers/the-bank
                 ├─→ bartender /back-bar/cellar
                 ├─→ owner /bank-comparison
                 └─→ chef /recipes pricing (live cost)

v2.invoices ──┬─→ chef /stock-suppliers/invoices
              ├─→ bartender /back-bar/invoices (read-only)
              ├─→ manager /pl, /reports, /suppliers (reliability)
              └─→ owner /cash, /revenue, /reports, /sites

v2.waste_entries ──┬─→ chef /stock-suppliers/waste
                   ├─→ bartender /back-bar/spillage (filtered)
                   ├─→ manager /pl, /reports
                   └─→ owner /sites, /revenue, /reports

v2.notebook_entries ──┬─→ chef /notebook
                      ├─→ bartender /notebook
                      └─→ manager /service-notes

v2.safety_* ──┬─→ /safety/* (all sub-pages)
              ├─→ /safety/diary/[date]
              ├─→ /safety/eho (90d rollup)
              ├─→ triggers → v2.intelligence_events
              └─→ /(shell)/, /manager/, /bartender/ Home cards

v2.forward_signals ──┬─→ chef /inbox + Looking Ahead on every chef page
                     ├─→ bartender /inbox + Looking Ahead on every bar page
                     ├─→ manager /inbox
                     ├─→ owner /alerts (urgent+attention only) + /inbox
                     └─→ /admin signals snapshot

v2.intelligence_events (raw) ──→ /api/cron/drain-events ──→ v2.forward_signals
   ↑
   ├─ all v2.safety_* triggers              (consumers PENDING — see gaps)
   ├─ /api/cron/detect-market-moves         (active)
   ├─ /api/cron/detect-recipe-staleness     (active)
   └─ /api/cron/detect-cost-spikes          (active)

v2.memberships + auth.users ──┬─→ chef /settings (top role)
                              ├─→ manager /team, /team/[id]
                              ├─→ owner /team, /team/u/[userId]
                              └─→ admin /users, /users/[userId], /accounts/[id]

v2.accounts ──┬─→ flag is_founder + is_demo → admin populate + Stripe skip
              ├─→ inbox_token → /api/inbound-email
              ├─→ safety_enabled → /safety/* gate
              ├─→ preferences.opening_check_groups → /safety opening-check config
              └─→ preferences.gp_target_pct → /margins, /bartender/margins
```

### Same-table-different-view pairs

| Domain | Chef surface | Bar parallel | Manager view | Owner view |
|---|---|---|---|---|
| Recipes | `/recipes` | `/bartender/specs` | `/manager/dishes` | `/owner/margins` |
| Menus | `/menus` | `/bartender/menus` | `/manager/menu-builder` | — |
| Margins | `/margins` | `/bartender/margins` | `/manager/pl` | `/owner/margins` |
| Stock master | `/stock-suppliers/the-bank` | `/bartender/back-bar/cellar` | — | `/owner/bank-comparison` |
| Suppliers | `/stock-suppliers/suppliers` | `/bartender/back-bar/suppliers` | `/manager/suppliers` | `/owner/suppliers` |
| Invoices | `/stock-suppliers/invoices` | `/bartender/back-bar/invoices` | (via P&L) | `/owner/cash` |
| Deliveries | `/stock-suppliers/deliveries` | `/bartender/back-bar/deliveries` | `/manager/deliveries` | — |
| Waste/spillage | `/stock-suppliers/waste` | `/bartender/back-bar/spillage` | (via Reports) | (via Reports) |
| Transfers | `/stock-suppliers/transfers` | `/bartender/back-bar/transfers` | — | `/owner/transfers` |
| Notebook | `/notebook` | `/bartender/notebook` | `/manager/service-notes` | — |
| Team | (via Settings) | (via Settings) | `/manager/team` | `/owner/team` |
| Inbox | `/inbox` | `/bartender/inbox` | `/manager/inbox` | `/owner/alerts` + `/owner/inbox` |

---

## Supabase v2.* table map — who reads/writes

| Table | Read by | Written by |
|---|---|---|
| `recipes` + `recipe_ingredients` | chef, bar, manager, owner, public menu | chef `submitRecipeAction`, bar `submitRecipeAction` |
| `ingredients` + `price_history` | every Bank / Cellar / Recipe surface | chef bank actions, `/api/palatable/confirm-invoice`, `/api/palatable/scan-spec-sheet` |
| `suppliers` | every Suppliers / PO / Invoice surface | chef `updateSupplierAction`, bar create |
| `invoices` + `invoice_lines` | chef, bar (read-only), manager, owner | chef scan + confirm/flag actions, `/api/inbound-email` |
| `credit_notes` | chef credit-notes | chef draft/send/receive actions |
| `purchase_orders` + `lines` | chef PO surfaces, owner Sites | chef PO actions |
| `stock_takes` + `lines` | chef stock-count, bar Stock Take | chef + bar count actions |
| `stock_transfers` + `lines` | chef transfers, bar transfers, owner Transfers | chef + bar transfer actions |
| `deliveries` | chef, bar (read-only), manager | chef schedule/confirm actions |
| `waste_entries` | chef Waste, bar Spillage, manager Reports, owner Reports | chef `logWasteAction`, bar spillage logging |
| `prep_items` | chef `/prep`, bar `/mise` | chef prep actions |
| `notebook_entries` | chef, bar, manager Service Notes | chef + bar create/update |
| `menus`, `menu_versions`, `menu_items` | manager menu-builder, chef + bar menus, public `/m` | manager menu actions |
| `menu_plans` + `menu_plan_items` | chef + bar menus (planning mode), manager menu-builder | manager + chef plan actions |
| `memberships`, `feature_flags` | manager Team, owner Team, admin Users, every shell-context | admin + owner + manager flag/role actions |
| `accounts` | every settings, admin | admin tier action, Stripe webhook, settings actions |
| `sites` | shell context, admin | admin (currently SQL only) |
| `forward_signals` | every Inbox + Looking Ahead | cron detectors, drain-events, admin announcements |
| `intelligence_events` | `/api/cron/drain-events` | safety triggers (5 emitters), other detectors |
| `safety_opening_checks` | safety, manager Home | `submitOpeningCheckAction` |
| `safety_probe_readings` | safety, EHO, diary | `logProbeReadingAction` |
| `safety_incidents` | safety, EHO, diary | `logIncidentAction` |
| `safety_cleaning_tasks` + `signoffs` | safety, EHO, diary | cleaning CRUD + signoff actions |
| `safety_training` | safety, EHO | `addTrainingAction` |
| `safety_eho_visits` | (none yet — pending) | (pending) |
| `anthropic_usage` + `ai_cache` | `/admin/system` infrastructure | Anthropic helper `src/lib/anthropic.ts` |
| `announcements` | `/admin/content`, `/admin` home | admin actions |

---

## Consolidated punch list (gaps & TODOs)

### Blocking / launch-critical

1. ~~**Pricing reconciliation**~~ ✓ Shipped Batch 1. Stripe price IDs still need updating in the Stripe dashboard.
2. ~~**`/api/cron/reseed-demo` not declared in `vercel.json`**~~ ✗ Was a false alarm — already declared. No fix needed.
3. ~~**`/api/cron/reseed-hello-demo` not declared in `vercel.json`**~~ ✗ Was a false alarm — `reseed-demo` already handles all `is_demo` accounts including hello@.

### Wedge / Phase 5 (intelligence layer)

4. ~~**Safety detector consumers**~~ ✓ Shipped Batch 1 — five new detectors in `src/lib/signal-detectors.ts`. The trigger emitters into `v2.intelligence_events` are still in place; the new detectors read `v2.safety_*` directly and emit `v2.forward_signals`. (Plumbing the `intelligence_events` consumer path is a separate future-proofing piece — not blocking.)
5. **Live dish picker** — Probe + Incident + chef Waste ✓ shipped Batch 1. Cleaning signoff / Training records / Menu builder / HACCP wizard / bar spillage dedicated dialog still pending.

### Safety module — Week 3

6. **HACCP Wizard steps 1–9 form fields** — intro + step-1 banner only. No `v2.safety_haccp_plans` table yet.
7. **EHO export PDF generation** — `/safety/eho` renders preview; Export button disabled pending react-pdf wiring.
8. **EHO inspector visit card** — `v2.safety_eho_visits` schema referenced, no UI consumer.
9. **Safety pricing gate** — `accounts.safety_enabled` boolean works at layout; £20/site/mo upsell webhook + Stripe price not yet wired.

### Surface-level pending work

10. **Manager + Owner "pending tab" mockups** — lock design before scaffolding (Founder Ops).
11. **Notebook captures pt 2** — voice / photo / sketch via Supabase Storage. Buttons stubbed in `/notebook`. (Task #50.)
12. **Photo upload + Supabase Storage bucket** — recipes + branding.
13. **`/owner/reports` + `/owner/bank-comparison` not in OWNER_SECTIONS** — reachable only via Home / Sites breadcrumb. Decide: add to sidebar or leave as drill-only.
14. **`/owner/revenue` cost-side only** — POS integration required.
15. **`/owner/cash` A/R + bank-feed** — pending.
16. **`/manager/pl` revenue side** — same POS dep.
17. **Manager + Owner Reports PDF + CSV bundles** — Phase 5 deliverable.
18. **Owner add-site UI** — currently admin SQL only.
19. **Bartender `/mise` station partition** — `v2.prep_items` mixes bar + kitchen; need station discriminator.
20. **Manager team invite / remove flows** — list wired, mutations pending multi-user signup.
21. **Safety `/safety/settings`** — currently redirect; liability ack + team perms scattered.
22. **Safety opening-check question library** — Manage Checklists only edits dept-level groups, not per-question.
23. **Safety training edit / archive UI** — add works, no edit/delete.
24. **Connections POS integration consumers** — keys can be entered, Looking Ahead doesn't yet ingest.

### Smoke tests (Founder Ops checklist)

- Marketing pages at 375 / 768 / 1280 widths
- Impersonation flow round-trip
- Owner team Danger Zone protections
- Invoice scan loop in production
- End-to-end signup → site/account/membership/RLS/defaults

### Orphans & dead routes

(None confirmed. Three apparent orphans in the original audit were false positives — see the correction note at the top of this file.)

---

## Build batches

### Batch 1 — 2026-05-17 PM (shipped)

- **Pricing aligned to £49 / £79 / £119** — updated CLAUDE.md tier block, `src/lib/admin.ts` `TIER_PRICE`, and `src/app/admin/business/page.tsx` `TIER_PRICE`. Landing + coming-soon already used these values. Stripe price IDs still need to be created/swapped in the Stripe dashboard to match — code is ready.
- **Owner sidebar gained Bank Comparison** — added to `OWNER_SECTIONS` in `src/components/shell/nav-config.ts` so it's a first-class tab alongside Reports.
- **Safety detectors wired into `forward_signals`** — five new detectors in `src/lib/signal-detectors.ts`:
  - `detectExpiringTraining` — certs expired / ≤14d / ≤30d, urgent → attention → info.
  - `detectFailingProbes` — locations failing FSA thresholds 2+ times in 14d.
  - `detectOpenIncidents` — high-severity open + items open >3 days.
  - `detectOverdueCleaning` — daily/weekly/etc. tasks past their cycle.
  - `detectMissedOpeningCheck` — no ticked answers for today after 11am server time (urgent after 16:00).
- **Live DishPicker built + wired** to three forms:
  - `src/lib/safety/dish-picker.ts` — server lib returning three bands (Today's Menu / Prep Items / Recipe Library), supports `dishType: 'food' | 'bar' | 'all'` filter.
  - `src/components/safety/DishPicker.tsx` — client component with tabbed picker, name-search, single-select, free-text fallback.
  - Wired into `/safety/probe` (optional for cooking/reheat/cooling/core_temp/hot_hold/delivery kinds).
  - Wired into `/safety/incidents` (replaces the "Dish Involved" free-form input).
  - Wired into chef `/stock-suppliers/waste` LogWasteDialog as an optional "linked dish" field (food filter).
- **Migration file written + applied** — `supabase/migrations/20260517000002_v2_dish_picker_recipe_links.sql` adds nullable `recipe_id` FK to `v2.waste_entries`, `v2.safety_cleaning_signoffs`, and `v2.safety_training`. Applied via Supabase SQL editor 2026-05-17. `safety_probe_readings.recipe_id` + `safety_incidents.recipe_id` already existed in their original schema.

### Batch 2 — 2026-05-17 PM (DishPicker on cleaning + training)

- **Cleaning signoff** — `CleaningTickRow` keeps the single-click "Tick done" UX but gains an expand caret (▾) that reveals an inline DishPicker + notes input. "Tick with details" submits a signoff with optional `recipe_id` + `notes`. `signoffCleaningTaskAction` updated to accept an options bag; page fetches bands and passes them down.
- **Training records** — `TrainingForm` gains a "Linked dish (optional)" field below the existing inputs. `addTrainingAction` accepts `recipe_id`; page fetches bands (`dishType: 'all'` since training spans the whole brigade) and passes them to the form.
- **Deferred — menu builder** — `/manager/menu-builder` is already a dish-management surface (PlannerView + MenuBuilderClient deal exclusively with dishes). Adding the safety-domain DishPicker would be duplicative. Skipped this batch, needs UX investigation before wiring.
- **Deferred — HACCP wizard stubs** — wizard at `/safety/haccp` is mostly stubbed beyond Step 1 intro. Pre-wiring DishPicker on speculative form fields is premature. Will wire when steps 1–9 scaffolding lands.

### Batch 1.5 — 2026-05-17 PM (housekeeping, shipped after Batch 1)

- **Supabase CLI installed as project devDep** — `npx supabase ...` now works from `web/`. Memory entry at `reference_palateandpen_supabase_cli.md`. `.gitignore` updated to exclude `supabase/.temp/`.
- **Migration filenames normalised to 14-digit `YYYYMMDDHHMMSS` format** — all 51 local files renamed from the legacy 8-digit prefix so each has a unique CLI-tracker version. HHMMSS values are synthetic (`000001`, `000002`, ... within each date, alphabetical). Done because the old 8-digit names collide when multiple migrations share a date.
- **Remote `supabase_migrations.schema_migrations` reset + rewritten** — 39 orphan MCP-stamped 14-digit entries reverted, 51 new entries written via `supabase migration repair --status applied` so the tracker matches local files 1:1. `npx supabase migration list --linked` now shows clean Local↔Remote alignment.
- **Caveat preserved for future `db reset`** — alphabetical-within-date ordering doesn't match the original dependency order (e.g. `v2_foundation` should run first on 2026-05-14 but lands at synthetic timestamp `000009`). For the tracker this is fine; if you ever run a clean `db reset` against this schema you'll need to manually reorder some 2026-05-14 files.

### Deferred (still pending after Batch 2)

- **Bar spillage dedicated log dialog** — bar spillage page is read-only today; spillage rows come from the chef LogWasteDialog. A dedicated bar create dialog with `spillage_reason` capture is a separate piece of work.
- **Menu builder DishPicker** — needs UX investigation. `/manager/menu-builder` already manages dishes (Build mode + Planning mode via PlannerView). Adding the safety-domain DishPicker would duplicate existing flows; want to look at the add-dish UX in PlannerView before deciding.
- **HACCP wizard DishPicker stubs** — wizard steps 1–9 are mostly stubbed; pre-wiring is premature until the wizard is scaffolded.
- **Notebook AddNoteDialog** — already has a name-search recipe picker that links via `linked_recipe_ids`. Different shape from the tabbed DishPicker but functionally equivalent. Replace only if you want UX consistency.
- **Prep / Mise add flow** — `prep_items.recipe_id` already exists and the add-prep flow already picks recipes. No change needed.

---

## Build-order recommendation (post-Batch 2)

DishPicker is now live across probe / incident / waste / cleaning / training. Highest-leverage next builds:

1. **HACCP wizard form fields** — completes the Safety wedge and the £20/mo upsell story. DishPicker will land naturally on Step 3 (Critical Control Points) and Step 5 (Monitoring procedures) when the form scaffolding is built.
2. **EHO PDF export** — inspector-ready output is the most concrete safety value-prop.
3. **Menu builder add-dish UX harmonisation** — investigate PlannerView + MenuBuilderClient and decide whether to surface DishPicker there or leave the existing flows.
4. **Bar spillage dedicated log dialog** — bar should have its own create path for spillage with `spillage_reason` capture, instead of relying on the chef LogWasteDialog.
5. **Update Stripe price IDs** to match £49 / £79 / £119 (manual in the Stripe dashboard, not a code change).

Everything else lines up behind these.
