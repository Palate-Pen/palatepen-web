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
- Colours: Ink #0E0C0A, Gold #C8960A, Cream #F0E8DC, Paper #FAF7F2
- Tiers: Free / Pro £25pm / Kitchen £59pm / Group £129pm

## Issue Tracking

GitHub Issues at https://github.com/Palate-Pen/palatepen-web/issues are reserved for **bugs and problems we hit, with the fix documented inline**. Each issue should describe the symptom, the root cause once known, and the resolution (commit SHA / PR / behaviour change). Apply the `Bug` label by default; add `Website` or `Payments` if it scopes there.

The forward-looking work list lives in the Roadmap section of this file — not in Issues. Tick the box and add a Progress Log entry when something ships.

## Editing key — shared vocabulary

Use these dotted keys when pointing at a specific surface so we both know exactly which view, tab, or component is meant. Add a new row to the relevant table as new features land.

### Top-level (sidebar nav)

| Key       | Surface     |
|-----------|-------------|
| `DASH`    | Dashboard   |
| `REC`     | Recipes     |
| `NOTE`    | Notebook    |
| `COST`    | Costing     |
| `MENU`    | Menus       |
| `INV`     | Invoices    |
| `STK`     | Stock       |
| `BANK`    | Bank        |
| `WASTE`   | Waste       |
| `REP`     | Reports     |
| `TEAM`    | My Team     |
| `SET`     | Settings    |
| `ADMIN`   | /admin panel |

### Invoices · `INV`

| Key                                  | What it refers to |
|--------------------------------------|-------------------|
| `INV.topbar`                         | Title row + Forward email / Scan invoice buttons |
| `INV.nav`                            | Pill strip: Ingredients bank / History / Suppliers / Reports |
| `INV.tiles`                          | 4-tile summary row above the body |
| `INV.banner`                         | Amber 30-day discrepancy banner (bank + history) |
| `INV.bank`                           | Ingredients bank tab body (default) |
| `INV.bank.scan`                      | Big dashed scan/upload card |
| `INV.bank.search`                    | Search input + ingredient list |
| `INV.history`                        | History tab body |
| `INV.history.row`                    | One invoice card in the history list |
| `INV.detail`                         | Drill-in detail page from a history row |
| `INV.detail.priceChanges`            | Red-tinted price-change table on detail |
| `INV.detail.items`                   | All-items grid on detail |
| `INV.detail.discrepancies`           | Flagged-discrepancies card on detail |
| `INV.review`                         | Review screen after scan (pick items, name supplier) |
| `INV.delivery.check`                 | Delivery check initial Yes / Flag / Skip |
| `INV.delivery.flag`                  | Per-line flag editor (qty, toggle, note) |
| `INV.suppliers`                      | Suppliers tab body |
| `INV.suppliers.tiles`                | 4 stat tiles at top of Suppliers |
| `INV.suppliers.help`                 | Gold-bordered help card |
| `INV.suppliers.row`                  | Collapsed supplier card |
| `INV.suppliers.expand`               | Expanded supplier panel |
| `INV.suppliers.expand.stats`         | 4 stat tiles inside expanded |
| `INV.suppliers.expand.issue`         | Most-common-issue callout |
| `INV.suppliers.expand.priceHistory`  | Price-change history list |
| `INV.suppliers.expand.items`         | Items-supplied chips |
| `INV.suppliers.expand.contact`       | Rep / phone / email / notes form |
| `INV.suppliers.expand.actions`       | Action buttons (PO / Call / Email / History) |
| `INV.reports`                        | Reports tab body (period nav + spend) |

### Stock · `STK`

| Key                       | What it refers to |
|---------------------------|-------------------|
| `STK.topbar`              | Title + From bank / Add item / Start count |
| `STK.info`                | "Next stock take" + "Total value" strip |
| `STK.list`                | Main list view (default) |
| `STK.list.filterTiles`    | 4 status tiles (Total / Good / Low / Critical) |
| `STK.list.search`         | Search + category dropdown + auto-categorise row |
| `STK.list.alerts`         | Red critical-items banner |
| `STK.list.row`            | One stock item card |
| `STK.list.edit`           | Inline edit panel on a stock row |
| `STK.add`                 | Add Stock Item modal |
| `STK.bankPicker`          | From Bank modal |
| `STK.count`               | Count view (data entry) |
| `STK.report`              | Report view after a count |
| `STK.report.tiles`        | 4 summary tiles in report |
| `STK.report.byCat`        | By-category table |
| `STK.report.variances`    | Variances & flags section |
| `STK.report.lineDetail`   | Collapsible full line detail |

### Recipes · `REC`

| Key                       | What it refers to |
|---------------------------|-------------------|
| `REC.library`             | Recipe library grid (default) |
| `REC.library.topbar`      | Title + Print Book / Scan Spec / Add Recipe buttons |
| `REC.add`                 | Add Recipe modal (with AI import) |
| `REC.scanSpec`            | Scan Spec Sheet modal |
| `REC.detail`              | Recipe detail page |
| `REC.detail.edit`         | Edit-recipe mode within detail |
| `REC.detail.cost`         | Linked costing panel |
| `REC.detail.allergens`    | Allergen grid + sub-type pills |
| `REC.detail.nutrition`    | Nutrition table + FOP traffic lights |
| `REC.detail.compliance`   | Compliance check modal |
| `REC.detail.spec`         | Printable spec sheet overlay |
| `REC.detail.simulator`    | Cost simulator modal |
| `REC.detail.lock`         | Lock / unlock controls |
| `REC.detail.photo`        | Photo dropzone / replace controls |
| `REC.detail.usedIn`       | "Used in" sub-recipe consumer list |

### Menus · `MENU`

| Key                          | What it refers to |
|------------------------------|-------------------|
| `MENU.list`                  | All-menus list (default) |
| `MENU.detail`                | Single-menu detail |
| `MENU.detail.dishes`         | Dish list with GP summary |
| `MENU.detail.publish`        | Publish card (live URL + QR) |
| `MENU.detail.engineering`    | Engineering section (table + 2×2 quadrants) |
| `MENU.designer`              | Menu Designer overlay |

### Costing · `COST`

| Key             | What it refers to |
|-----------------|-------------------|
| `COST.builder`  | Main costing builder (default) |
| `COST.history`  | Saved costings list |

### Reports · `REP`

| Key              | What it refers to |
|------------------|-------------------|
| `REP.gp`         | GP performance section |
| `REP.waste`      | Waste cost section |
| `REP.stock`      | Stock value by category |
| `REP.menus`      | Menu engineering rollup |
| `REP.benchmark`  | Ingredient price benchmarking |
| `REP.suppliers`  | Supplier performance (Reports-side, separate from `INV.suppliers`) |
| `REP.prices`     | Price changes table |

### Settings · `SET`

| Key                | What it refers to |
|--------------------|-------------------|
| `SET.profile`      | Profile section |
| `SET.preferences`  | Preferences section |
| `SET.data`         | Data export + import |
| `SET.integrations` | Integrations section |
| `SET.email`        | Invoice email forwarding card |
| `SET.api`          | API access card |
| `SET.help`         | Help / Quick start guide |
| `SET.account`     | Account actions (upgrade, delete) |

### Team · `TEAM`

| Key              | What it refers to |
|------------------|-------------------|
| `TEAM.list`      | Member tile grid |
| `TEAM.member`    | Member detail modal |
| `TEAM.invite`    | Invite member modal |

### Notebook / Bank / Waste / Dashboard

| Key              | What it refers to |
|------------------|-------------------|
| `NOTE.list`      | Notes feed |
| `BANK.list`      | Bank ingredient list (`INV.bank` renders the same data inside Invoices) |
| `WASTE.log`      | Waste log list |
| `WASTE.add`      | Log waste form |
| `DASH.tiles`     | Top stat tiles |
| `DASH.alerts`    | Alerts section |
| `DASH.recent`    | Recent activity |

### Admin · `ADMIN`

| Key                    | What it refers to |
|------------------------|-------------------|
| `ADMIN.overview`       | Overview tab |
| `ADMIN.users`          | Users tab |
| `ADMIN.user`           | User detail slideout |
| `ADMIN.user.demoTools` | Demo tools section (Seed showcase button) |
| `ADMIN.user.danger`    | Danger zone |
| `ADMIN.audit`          | Audit tab |
| `ADMIN.platform`       | Platform settings (flags, maintenance, announcement) |
| `ADMIN.orphans`        | Orphan auth-users list (top of Overview) |

### Conventions

- Suffixes: `.modal` for overlays, `.row` for repeating items, `.actions` for button clusters.
- Drill further when needed: e.g. `INV.suppliers.expand.contact.phone` for the phone input specifically.
- When a feature is pre-launch or only seeded, the key still applies — it describes the spot, not the data.

## Roadmap

### Phase 1 — Foundation (In Progress)

- [x] Recipe library with URL import
- [x] Chef notebook linked to recipes
- [x] GP costing calculator
- [x] AI invoice scanning
- [x] Price change alerts
- [x] Stock counting with par levels
- [x] Stock report with CSV download
- [x] Stripe payments
- [x] Admin panel
- [x] Coming soon page
- [x] Stock inline editing
- [x] Stock and ingredient categories
- [x] Remove business min GP bar from CostingView
- [x] Allergen tracking
- [x] Nutritional information
- [x] Make the P logo in the sidebar a home button that navigates back to the dashboard
- [x] Fix duplicate CSV download button in stock report viewer
- [x] Prevent duplicate stock lines — stop the same ingredient being added twice to stock
- [x] Neaten up the allergen section inside the recipe detail view (layout/spacing/visual hierarchy of Contains + May Contain + sub-type rows)
- [x] Edit recipe ingredients inline on the recipe detail page
- [x] "Add costing now" button on recipe detail that opens a costing panel inline without leaving the recipe

### Phase 2 — Pro Feature Depth

- [x] Menu builder with full GP summary per menu
- [x] Menu engineering reports (Star/Plough Horse/Dog/Puzzle)
- [x] Waste tracking with £ cost impact
- [x] Recipe photo upload
- [x] Sub-recipes
- [x] Locked recipe specs
- [x] Traffic light labelling
- [x] Calorie counts per dish and portion
- [x] Dish spec sheets (printable)
- [x] Change printable stock count sheet to a summary report format showing totals, variances and category breakdowns rather than a raw line list
- [x] Create a custom icon set for the Palatable website replacing generic icons with bespoke food and kitchen themed icons
- [x] Make menu backgrounds more graphic and custom with imagery or textured treatments
- [x] CSV export of all recipes, costings and stock as separate downloadable files
- [x] CSV import for recipes, costings and stock with downloadable template files containing the correct headers
- [x] Scan a spec sheet with AI to import recipe data automatically
- [x] Downloadable quick-start guide for new users explaining the CSV templates *(shipped as an interactive in-app guide with auto-trigger on first login + Settings replay button — covers every part of the app, not just CSVs)*

### Phase 3 — Kitchen and Group Tier

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

- [x] GP trend analysis per dish over time *(Reports → GP section, dishes re-costed ≥ 2× show first→latest delta with up/down sorting)*
- [x] Menu profitability dashboard *(Reports → Menu engineering, per-menu projected revenue + profit from sales × dish sell/cost)*
- [x] Ingredient price benchmarking *(Reports → new section; per-ingredient avg/min/max + volatility + last invoice vs bank %, sortable, expand-to-sparkline, per-section CSV + print)*
- [x] Waste cost dashboard *(Reports → Waste, daily average + projected month + 4-week trend bars)*
- [x] Smart reorder alerts *(already shipped — `stock-critical` and `stock-low` notifications surface in the bell whenever currentQty ≤ minLevel or < parLevel)*
- [x] Recipe cost simulator *(recipe detail → 🧪 Simulator button; per-ingredient % adjuster with live GP recompute, never writes the saved costing)*
- [x] Supplier performance tracking *(Reports → new section; per-supplier invoices/spend/avg/Δ-prices/last seen, sortable, expand-to-top-ingredients, CSV + print)*

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

## Tomorrow's punch list — from stress-test 2026-05-12

Surfaced during the system-wide audit at end of day. Tackle top-down.

**Quick wins (~2 hours total)** — all done 2026-05-13, see Progress Log.
- [x] **Lazy-init Stripe**
- [x] **Wire feature-flag enforcement** (UI gates + server gates for all 10 flags)
- [x] **`publicMenus` flag check on `/m/[slug]`**
- [x] **Idempotency on invite accept**

**Medium-priority follow-ups** — all done 2026-05-13, see Progress Log.
- [x] **SettingsView autosave perms-aware** (already in place — `if(!perms.canManageSettings)return;` guards the effect body)
- [x] **Invite expiry check** (accept route blocks at line 39 with 410)
- [x] **Anthropic model into a constant** (`src/lib/anthropic.ts` exports `ANTHROPIC_MODEL`)
- [x] **Inbound-email row guard** (collision detection + account_id-keyed write)

**Config gaps (no code change required)** — all closed.
- [x] **`INBOUND_EMAIL_SECRET`** set on Vercel production 2026-05-13. Unauthenticated POSTs to `/api/inbound-email` now return 401. Value lives only in the Vercel env store and the (eventually-configured) inbound provider's webhook config — mirror them together when wiring up Resend / Postmark / Mailgun.

**Long-tail (no action needed yet, log for memory)**
- API-key lookup via JSONB containment is fine at current scale; revisit if user count > 10k.
- Ownership-transfer endpoint lacks a transaction (3 writes); fine until it breaks.
- `wasteTracking` and `menuBuilder` flag definitions have no enforcement points — that's deliberate, they're there for when the flags need to be flipped during incident response.

**Stress-test positives (audit confirmed OK)**
- All admin routes auth via `isAuthorized` ✓
- All `/api/v1/*` routes auth via `authenticateApi` + tier ✓
- React hook order consistent everywhere (the earlier admin bug stays fixed) ✓
- Supabase clients use lazy `createClient(url!, key!)` — module load succeeds, fails-at-request when env missing ✓
- MaintenanceGate fails open and hard-reloads on restore ✓
- All recent rebuilds (admin, Settings, MenuDesigner, Reports) typecheck clean ✓

## Progress Log

When completing any roadmap item, add an entry here with the date, what was done, and any important technical notes.

### 2026-05-13

- **Delivery confirmation flow on invoice scan.** After a successful scan + review, a mobile-first modal asks "Did everything arrive as expected?" with two big tap buttons (Yes / Flag) and a tertiary "Skip this check" link. Yes-tap saves the invoice with `status: 'confirmed'`. Flag-tap opens an editable line-list seeded from the scanned items: each row has a 44×44 received/not-received toggle (`✓` / `✗`), a numeric received-qty input clamped to the invoiced qty, and a short optional note input. Save stamps `status: 'flagged'` + materialises a `discrepancies[]` array on the invoice with `{name, invoicedQty, receivedQty, received, note, unitPrice, unit}`. Non-blocking: the whole flow is optional, Skip preserves the pre-existing behaviour, and a chef who taps Yes every time isn't slowed down at all. New 30-day discrepancy summary banner sits at the top of the Invoices bank view AND the history view — shows total flagged count + estimated £ value diff, click to jump to the history. Flagged invoices in the history list pick up an amber `⚑` glyph next to the supplier name plus a gold-tinted border; confirmed invoices show a quiet green `✓`.
- **Supplier reliability score.** New `src/lib/supplierReliability.ts` produces a 0-10 score per supplier blending: (a) confirmation ratio (10 × confirmed/total) and (b) discrepancy-severity penalty (avg flagged-invoice discrepancy £ as fraction of avg invoice £, scaled to max 4 points off). Legacy invoices without a status field are treated as confirmed so the feature is opt-in — a chef who never opens the delivery check doesn't see their suppliers' scores collapse. Score colour ramp: green ≥8.5, gold ≥6.5, red below. Rendered as a small chip next to every history row's supplier name. New Suppliers tab in `InvoicesView` (linked from both bank + history) shows a ranked list (worst score first — the actionable signal) with score · total invoices · total value · 45d-vs-prior-45d trend (improving/declining/stable/insufficient_data) · last-invoice date. Click any row to expand: shows split scores for both windows, total discrepancy £, and the most-flagged ingredient name (counted from `discrepancies[].name` where qty was reduced or `received: false`). Feeds the existing Phase 5 supplier performance section in Reports — both surfaces read the same `state.invoices` array, so re-flagging anywhere updates everything.
- **Showcase seed updated** (per the durable rule). `src/lib/seedShowcase/invoices.ts` now stamps explicit `status` on every seeded invoice and carries realistic discrepancies on 4 of 21 (1 Brakes / 2 Borough Market / 1 Cuisine de France). Reliability spread: Smithfield + Bidfood land at 10/10, Brakes ~8, Cuisine de France ~6-7, Borough Market ~6 (matches the "produce is the noisiest supplier" reality). Two of the four flagged are inside the last 30 days so the discrepancy banner shows signal. The Cuisine de France flag carries the same `source: 'email'` payload it already had — proves the delivery-check works on email-forwarded invoices too.

- **Lazy-init Stripe.** New `src/lib/stripe.ts` exposes `getStripe()` — memoised singleton that throws `STRIPE_SECRET_KEY is not configured` only when first called rather than at module load. `apiVersion: '2026-04-22.dahlia'` lives in this one place now. `src/app/api/stripe/webhook/route.ts` and `src/app/api/stripe/create-checkout/route.ts` switched from top-level `new Stripe(process.env.STRIPE_SECRET_KEY!, …)` to calling `getStripe()` inside their POST handlers (webhook: just before `constructEvent`; checkout: just before `sessions.create`, after user auth). Webhook still imports `type Stripe` for the `Stripe.Event` type annotation. Unblocks local `next build` when the env var isn't present.

- **Feature-flag enforcement wired end-to-end.** Flags stored in `app_settings.value.featureFlags` (global) + `user_data.profile.featureOverrides` (per-user) are now honoured by both UI and API. Default for every flag is ON — admins toggle OFF to disable.
  - **Foundation.** New `src/lib/featureFlags.ts` defines the 10 flag keys (`aiRecipeImport`, `aiInvoiceScan`, `aiSpecSheet`, `emailForwarding`, `publicMenus`, `apiAccess`, `csvImport`, `csvExport`, `wasteTracking`, `menuBuilder`), with `isFeatureEnabled(key, globalFlags, userOverrides)` resolution (user override > global > default-true), `getGlobalFeatureFlags()` for server-side reads from `app_settings`, and `denyIfFlagOff(key, userOverrides)` convenience that returns a NextResponse 403 to short-circuit API routes when off. Settings outages fail-open — a missing/erroring row returns `{}` so default-true behaviour kicks in and no one accidentally locks features for the whole platform.
  - **Client hook.** New `src/lib/usePlatformConfig.ts` exposes `usePlatformConfig()` and `useFeatureFlag(key, userOverrides)`. Module-level cache + subscriber set so `/api/platform-config` is fetched exactly once per session and every component subscribed to a flag re-renders when the cache fills.
  - **UI gates applied.** RecipesView (Scan Spec Sheet button, Import URL/file panel), InvoicesView (Upload Invoice button — entire scan UI), SettingsView (Email Forwarding card, API Access card, Export Data card, Import Data card), MenuBuilderView (Publish card hidden entirely when flag off — including the existing "upgrade" nudge, since that wording would mislead Kitchen/Group users), Sidebar (Waste + Menus nav items filtered), `/app/page.tsx` views map (when waste/menus flags off, direct URL navigation to those tabs falls through to DashboardView so a bookmarked link doesn't render a disabled feature), mobile More sheet items filtered too.
  - **Server gates applied.** `/api/palatable/import-recipe` (aiRecipeImport), `/api/palatable/scan-invoice` (aiInvoiceScan), `/api/palatable/scan-spec-sheet` (aiSpecSheet) — each returns 403 at the top of POST before any work. `/api/inbound-email` (emailForwarding) — still returns 200 to the inbound provider so it doesn't retry-storm, but skips the expensive Anthropic vision pass + DB write. `/m/[slug]/page.tsx` `loadMenu()` (publicMenus) — returns null at the very top, which causes the caller's `notFound()` to fire, so every existing public menu URL goes dark instantly when admin flips the switch. `/api/v1/*` (apiAccess) — gated centrally in `src/lib/apiAuth.ts`'s `authenticateApi()` so every v1 endpoint inherits the kill switch with zero per-route changes.
  - **What's NOT gated server-side** (deliberate): `wasteTracking`, `menuBuilder`, `csvImport`, `csvExport`. These flags are UI-only — they hide entry points, but there's no remote endpoint exclusively guarding waste/menu/CSV data writes (writes go through the generic user_data autosave). If admin needs hard enforcement on those they'd need either app_settings-side data scrubbing or per-feature endpoints, neither of which is in scope for v1.

- **Invite accept idempotency.** `src/app/api/invites/[token]/accept/route.ts` membership insert now passes `{ onConflict: 'account_id,user_id', ignoreDuplicates: true }` so a double-click on Accept issues an `INSERT ... ON CONFLICT DO NOTHING` rather than overwriting role/added_by on an existing membership. Previously a second call could silently change the membership row if anything else had touched it between request 1 and request 2. The merge path is already idempotent (second call finds no personal account, returns early) and the `accepted_at` check at the top short-circuits any other re-runs.

- **Anthropic model pulled into a constant.** New `src/lib/anthropic.ts` exports `ANTHROPIC_MODEL = 'claude-sonnet-4-6'`. The 4 endpoints that fan out to Claude — `/api/palatable/import-recipe`, `/api/palatable/scan-invoice`, `/api/palatable/scan-spec-sheet`, `/api/inbound-email` — now reference the constant. Future model swap (Haiku for cost, Opus for accuracy on hand-written spec sheets) is a one-line change.

- **Inbound-email row guard + write tightening.** `src/app/api/inbound-email/route.ts` lookup now fetches up to 2 rows matching the JSONB-contained `invoiceInboxToken` and refuses to route when more than one matches — defends against theoretical token collisions. Additionally added an explicit `account.id === row.account_id` assertion (true by construction today but guards against future refactors that change the lookup path), and the final invoices write was switched from `.eq('user_id', row.user_id)` to `.eq('account_id', row.account_id)` since account_id is the more specific identity in the multi-account world (a single user could own multiple accounts on Group tier). All failure paths still return `{ ok: true, skipped: '...' }` so the inbound provider doesn't retry-storm.

- **Punch-list verifications (no code change needed).** SettingsView autosave at `SettingsView.tsx:183` already guards on `perms.canManageSettings` at the top of the effect body — punch-list note was based on a stale read. Invite accept at `accept/route.ts:39` already blocks expired invites with a 410 — defense-in-depth in place.

- **Ingredient price benchmarking (Phase 5).** Closes the open Phase 5 bullet. New `src/lib/priceBenchmark.ts` walks `state.invoices` + `state.ingredientsBank` and produces a `Map<nameKey, IngredientHistory>` where `nameKey` is a normalised (lowercased, whitespace-collapsed) ingredient name. Each entry carries `points: [{ ts, unitPrice, unit, supplier, invoiceId }]` plus the current bank price for comparison. `statsFor(entry, windowMs)` returns avg / min / max / last / volatilityPct (coefficient of variation: sample stddev / avg × 100, n−1 denominator) / vsBankPct over a window — pass `windowMs=0` for all-time. Bank-only ingredients (no invoice history yet) are folded into the map so the chef sees their current paid price even without scan data, then filtered out by the UI's "≥2 points in window" gate. Match logic is deliberately strict (normalisedName equality only) — fuzzy matching (Levenshtein / token overlap) belongs in a future Bank reconciliation surface where the chef can merge variant spellings manually; doing it here would produce honest "no benchmark" outcomes on noisy data instead of spurious aggregates. UI: new `'benchmark'` section in `ReportsView` between Stock-by-cat / Menu-engineering row and Price changes, sorted by volatility desc by default so the noisiest ingredients surface first. Table columns: Ingredient (with normalised unit pill) · Bank · Last · Avg · Min · Max · vs Bank · Volatility. Volatility coloured red ≥15%, gold ≥7%, green otherwise. Click any row to expand into an inline sparkline (last up to 12 invoice points) with the current bank price overlaid as a dashed gold reference line so the chef can immediately see "I'm paying above/below where the market for this ingredient sits." Sparkline hover tooltip shows supplier + exact date for each bar. Per-section CSV export (Ingredient · Unit · Bank · Last · Avg · Min · Max · vs Bank % · Volatility % · Data points · Last seen ISO) and A4 print modal both wired through the existing `Section` / `PrintModal` plumbing.

### 2026-05-12

- **CSV export — Recipes / Costings / Stock.** New `src/lib/csv.ts` module with three exposed exports (`exportRecipesCsv`, `exportCostingsCsv`, `exportStockCsv`) backed by a shared `toCsv(headers, rows)` + `downloadCsv(filename, content)` pair. RFC-4180 quoting: any cell containing `"`, `,`, `\n`, or `\r` is wrapped in double quotes with internal `"` doubled. Line ending is `\r\n` for Excel-friendly opening. `downloadCsv` prepends a UTF-8 BOM (`﻿`) so Excel auto-detects the encoding without a manual import dialog, builds a `Blob` with `type: 'text/csv;charset=utf-8'`, creates an `<a download>` programmatically, clicks it, and cleans up the object URL after 100ms. Filenames are date-stamped (`palatable-recipes-YYYY-MM-DD.csv`) so multiple snapshots don't collide.
  - **Recipes columns (18):** ID, Title, Category, Servings, Prep Time, Cook Time, Source URL, Notes, Ingredients (` | ` separated), Method (` || ` separated), Contains Allergens, May Contain Allergens, Tree Nut Types, Cereal Types, Locked (Yes/No), Linked Costing ID, Photo URL, Created At (ISO).
  - **Costings columns (11):** ID, Dish Name, Sell Price, Cost per Cover, GP £, GP %, Target %, Portions, Currency, Saved At, Ingredients (each as `name × qty unit @price = line`, ` | ` separated).
  - **Stock columns (10):** ID, Name, Category, Unit, Current Qty, Par Level, Min Level, Unit Price (£), Last Counted, Created At.
  - UI: new "Export Data" card in `SettingsView`, sits between Defaults and Account Actions. Three stacked buttons (Recipes / Costings / Stock), each showing row count next to the label and disabled when the collection is empty. Available to every role — no perms gate, since this is the user's own data going to their own machine. The pre-existing stock report CSV download in `StockView.tsx:141` is unchanged (it's a different report — usage / variances over a period — not a raw table dump).

- **Allergen section rebuilt + immediate-edit visibility.** Replaces the previous two-section layout (Contains computed-only block + dashed May-Contain pill row + separate tree-nut/cereal name rows) with a single 14-row grid (2 cols on desktop, 1 on mobile). Each allergen has its own tri-state segmented control: `None` / `May` / `Contains`. **Effective state =** bank-computed contains ∪ user-manual override (`sel.allergens.contains`) for Contains, plus `sel.allergens.mayContain` for May. When a Bank-matched ingredient already implies Contains, the row buttons lock (no manual downgrade — change the Bank entry instead) and the row shows a `From Bank: chicken, butter` caption derived from the first 2 source ingredients. When the user sets Contains without bank backing, the row shows `Manual override` instead. Tree-nut and cereal sub-type pills appear inline beneath the grid only when the relevant allergen is contained; user can toggle additional types on top of bank-locked ones. Setting an allergen back to None / May clears the corresponding sub-type list. Compliance modal and Spec Sheet both now read **effective** contains + nut/cereal types (bank ∪ user) so manual overrides flow through. Recipe-list cards likewise show the union — the small short-code badges on each card now reflect bank-computed allergens, not just the legacy `r.allergens.contains` field.
- **Immediate edit visibility.** New `useEffect` synchronises the local `sel` snapshot from `state.recipes` whenever the recipe-state slice changes. Previously several mutations (allergen toggles, lock/unlock, photo upload/remove) dispatched `actions.updRecipe(sel.id, …)` but never called `setSel`, so the detail view kept showing stale data until the user navigated away and back. Now any `updRecipe` dispatch propagates into the open recipe view on the same render — toggle a state, see the colour and caption change instantly without flicker. The autosave effect's explicit `setSel` is still in place (it gives an immediate optimistic update before the dispatch round-trips through the reducer), so there's no regression on edit responsiveness either.

- **Inline ingredient editing on recipe detail** (commit `8ec1631`). Entering Edit Recipe mode now exposes the imported ingredient list as a vertical stack of text inputs with a `+ Add ingredient` button and a per-row remove (✕). State held in `editIngredients: string[]`, seeded from `sel.imported?.ingredients` when `openEdit()` fires. The existing 500ms autosave effect was extended to include ingredients — on each keystroke it debounces, then `actions.updRecipe(sel.id, { ..., imported: { ...(sel.imported||{}), ingredients: cleanIngs } })`. Whitespace-only rows are dropped before save. If the recipe had no prior `imported` block, the update only writes one when at least one ingredient is non-empty (avoids creating phantom `imported: { ingredients: [] }` rows). Allergens + nutrition still derive from the linked costing's Bank-matched ingredients — the imported string list is informational/printable only.
- **Inline costing builder on recipe detail** (commit `8ec1631`). When a recipe has no linked costing, the costing panel's empty state now shows an `+ Add costing for this dish` button. Clicking it expands an inline costing form inside the same card with: sell price + portions inputs, an editable ingredient table (name / qty / unit kg-g-L-ml-each-bunch-tbsp / cost-per-unit / computed line / remove), `+ Add ingredient` button, live 4-cell GP summary (Sell / Cost-per-cover / GP £ / GP %) coloured against `gpTarget`, and Save. Ingredients are seeded from `sel.imported?.ingredients` (each imported string lands in the `name` field; user fills qty/unit/price). Portions default to `sel.imported.servings` if parseable, else 1. Line cost uses the same g→kg / ml→L conversion as `CostingView`. On save, calls `actions.addGP({ id, name: sel.title, sell, cost, gp, pct, target, portions, ingredients, currency: 'GBP' })` then `actions.updRecipe(sel.id, { linkedCostingId: newId })` so the new costing is immediately linked and the existing costing panel takes over. Ingredient name `onBlur` autofills `price` from the Bank when the name matches — same pattern as `CostingView.autofillPrice`. Disabled when `sel.locked` is true. Save button gated by "at least one named ingredient + sell > 0".
- **Roadmap additions.** Phase 1: inline ingredient editing + Add-costing-now button (both shipped same commit, ticked above). Phase 2: CSV export of recipes/costings/stock as separate files, CSV import with downloadable templates, AI spec-sheet scan into a recipe, and a downloadable quick-start guide explaining the CSV templates (all open).

### 2026-05-11

- Project initiated, full stack live
- Stripe integrated with Pro/Kitchen/Group tiers
- Palatable brand locked in (renamed from Mise)
- Admin panel built (Overview/Users/Audit/Settings, light theme, gold accent)
- Anthropic API wired server-side
- on_auth_user_created Postgres trigger: signup auto-creates user_data row (migration 001), with email backfill (002) and admin_audit_log table (003)
- Comp-tier mechanism in admin: tier dropdown (Free/Pro/Kitchen/Group) + "Free upgrade — no Stripe charge" toggle; profile.comp excluded from MRR
- Audit log: server-side audit() helper records update_user / initialize_user / delete_user / test_signup with before→after diff, viewable in Audit tab with action filter + per-user filter
- Diagnosed Next.js fetch cache issue masking admin GET reads (see Important Notes)
- Audit confirmed already-shipped Phase 1 items: stock inline editing, stock/ingredient categories, business-min-GP-bar removed from CostingView
- Allergen tracking: per-recipe toggle UI in RecipesView, two tag sets (Contains red / May contain dashed gold), 14 UK FIR allergens, compact short-code pills on recipe list cards
- Allergen sub-types: when Nuts is contained, name-the-nut sub-row (Almond/Hazelnut/Walnut/Cashew/Pecan/Brazil/Pistachio/Macadamia); when Gluten is contained, name-the-cereal sub-row (Wheat/Rye/Barley/Oats/Spelt/Kamut). Per UK FIR 2014.
- Run Compliance Check button on each recipe — modal scores against UK FIR 2014 (14 allergens, name-the-nut, name-the-cereal) plus Natasha's Law (recipe name, full ingredient list). Pass/Warn/Fail per check, summary banner Compliant / Not Compliant.
- Bank promoted to first-class tab (`BankView`) with full CRUD per ingredient: name, category, unit, price, allergens (with name-the-nut and name-the-cereal sub-types), Big-7+fibre nutrition per 100g/ml. Bank is the source of truth for ingredient facts.
- Recipe Contains-allergens are now COMPUTED from the linked costing's ingredients matched to Bank entries (was per-recipe). Per-recipe `mayContain` (cross-contamination) stays editable. Removes per-recipe Contains UI entirely (existing data ignored). Compliance check reads computed values + reports unmatched ingredients.
- Recipe nutrition table (Big 7 + fibre) computed by scaling each Bank ingredient's per-100g values by the costing-line grams. Coverage % shown when some ingredients lack nutrition data. Per-portion = total ÷ costing portions.
- Categories restructured to 18 specific items (Meat & Poultry, Fish & Seafood, Dairy & Eggs, Fresh Produce, Fresh Herbs, Dry Goods & Grains, Tinned & Preserved, Oils & Vinegars, Condiments & Sauces, Spices & Seasonings, Bakery & Pastry, Frozen Meat & Fish, Frozen Produce, Frozen Pastry, Beverages, Cleaning & Chemicals, Disposables & Packaging, Other). Single source of truth in src/lib/categorize.ts. Bank/Stock/Invoices all import from there. Auto-categorize keywords updated. migrateCategory() runs on load to remap legacy names (Meat & Fish → Meat & Poultry, Dairy → Dairy & Eggs, Produce → Fresh Produce, etc.).
- UK FOP traffic light labels on the recipe nutrition table — fat / saturates / sugars / salt get LOW/MED/HIGH pills coloured green/amber/red per the 2013 DH thresholds, computed per 100g of finished dish (using the bank-matched ingredient weight). Energy and fibre stay info-only.
- Printable dish spec sheets — "Spec Sheet" button on recipe detail opens an A4-styled overlay with title/category/portions/sell/GP, ingredient list, computed Contains allergens (with name-the-nut/cereal sub-types), May Contain, and a nutrition table per portion + per 100g + FOP traffic lights. Print button uses `window.print()`; `@media print` CSS hides everything except `#spec-sheet-print` so the rest of the app doesn't print. Always rendered in light mode for paper readability regardless of the user's app theme.
- Locked recipe specs — `recipe.locked: boolean` (jsonb, no schema migration). Lock button in recipe detail header, instant lock; unlock requires a confirm step. When locked: Edit button disabled, costing reassignment disabled, May Contain toggles disabled, notes textarea readonly, Delete button hidden. Lock icon (🔒) shown in detail header AND on the recipe card in the list. In a future multi-user world this becomes role-checked; for now the user is implicitly the admin.
- Sub-recipes — costing's ingredient autocomplete lists matching recipes (with linked costing) under a "Sub-recipes" header. Picking one sets unit=each, price = cost-per-portion of the linked costing, stamps `ing.sourceRecipeId`. Sub-recipe ingredient lines show a gold "RECIPE" chip. Recipe detail has a "Used in" section listing dishes that consume this recipe via `sourceRecipeId`. Cost is snapshotted at pick time — sub-recipe price changes don't auto-propagate; users re-open dependent dishes.
- Recipe photo upload — Supabase Storage bucket `recipe-photos` (public read, owner-only write per `auth.uid()` folder). Path: `{user_id}/{recipe_id}-{ts}.jpg`. Client-side resize to 1600px JPEG q0.85 before upload. UI in two places: dropzone in the Add Recipe modal (preview only, uploads after Save) and on the recipe detail (immediate upload, with Replace/Remove). Photo URL stored on `recipe.photoUrl`; storage path on `recipe.photoPath` for delete-on-replace. Migration 006_recipe_photos_bucket.sql provisions the bucket + RLS.
- Menu engineering reports — Kasavana & Smith Star / Plough Horse / Puzzle / Dog classification on each menu detail. Per-dish covers entry, sales mix % computed from total. Profitability split = above/below menu average contribution margin (sell − cost). Popularity split = mix ≥ 70% × fair share (1/N). 2×2 quadrant grid with dishes listed per cell, sortable table with quadrant badges, plus advice per quadrant. Sales data persists as `menu.salesData: { recipeId: covers }` on the menu jsonb — no migration.
  - **Sales data dependency:** today covers are entered manually per menu per period. Phase 4's POS integration (Square / ePOSnow — see roadmap) needs to populate `menu.salesData` automatically when an order syncs. Mapping: POS line item → match by recipe.title (or a future `recipe.posSku` field) → increment covers for the live menu. Manual entry stays as the fallback. The in-app engineering panel already shows a Coming-in-Phase-4 note pointing at this so the chef knows what's planned.
- Audit tick on already-shipped Phase 2 items: Menu builder with full GP summary (MenuBuilderView shows blended GP, total sell, total cost, lowest-GP dish, uncosted count per menu) and Waste tracking with £ cost impact (WasteView — per-ingredient log, 9 reasons, cost auto-computed from bank, CSV export, summary cards, dashboard rollup).
- Menu orphan handling: deleting a recipe now cascades into menus — the id is stripped from `menu.recipeIds` and `menu.salesData` in the `DEL_RECIPE` reducer. Pre-existing orphan rows render with red tint, italic "Recipe no longer exists" text, a Removed pill, and a one-click Clean Up banner above the dish table that prunes all orphans for that menu. Replaces the silent "(deleted recipe)" label.
- **My Team promoted to full team-management dashboard.** The team-management UI (invite, change role, remove, pending invites) moved out of Settings → TeamSection (file deleted) and lives entirely in the My Team tab. Access widened from Owner-only to Owner + Manager (Chef and Viewer still don't see the tab) so Manager's "invite team" capability is preserved post-move. Layout follows the Dashboard aesthetic: top stats row of 4 tiles (Members / Seats available / Pending invites / Contributions), member tile grid (`auto-fill, minmax(260px, 1fr)`) where each tile shows avatar, name, email, role pill, joined date, and contribution count; click opens a centered modal with full role/joined/contribution-total header, contribution breakdown stat grid, recent activity (last 8 across recipes/costings/menus/notes), and Remove from team button. Role select sits inside the modal; "Transfer ownership →" option is only shown when `yourRole === 'owner'`. Pending invites render below the tile grid in a compact list with copy-link / revoke. Invite modal preserved (email + role select + post-create URL with copy button). + Invite member button at the top-right is hidden when seat limit is reached, replaced by an inline upgrade nudge below the grid.
- **Owner-only "My Team" tab** shipped. New sidebar item between Reports and Settings, visible only when `currentRole === 'owner'` AND `tier ∈ {kitchen, group}` (filtered in `Sidebar.tsx`'s NAV.filter step). View at `/app/?tab=team` (well, internal `tab` state) renders one expandable card per team member with avatar, name, email, role pill, joined date, and a per-member contribution count derived from items in `state.*` whose `addedBy` matches the member's user_id. Click expands to a 4×2 stat grid (Recipes / Costings / Menus / Notes / Bank / Stock / Waste / Invoices) plus a "Recent" list of their last 8 items across recipes/costings/menus/notes. Owner viewing themselves shows "(you)". For attribution, AppContext now stamps `addedBy = user.id` on every newly-created item across all 9 collections — `addRecipe`, `addNote`, `addGP`, `addStock`, `addInvoice`, `addMenu`, `addWaste`, plus `addBank` / `upsertBank`. Existing items predating this commit don't have `addedBy`, so contribution counts will show 0 for everyone initially and build up as the team uses the app. The merge flow from the previous commit also tags merged items with `addedBy` — those will surface immediately in My Team. Tab is gated defensively in the view component too (renders an "owner-only" message if reached by URL on a non-owner role) so the perm check holds even if Sidebar filtering misses something.
- **Free → paid invite: ask + merge** shipped. When an existing Free-tier user is invited to a Kitchen/Group team, the invite acceptance page (`/invite/[token]`) now offers a choice: **Keep my account separate** (today's behaviour, two memberships, two switcher entries) or **Merge into [Team Name]** (their personal data is folded into the team's `user_data` and the personal account is deleted). Merge logic in `/api/invites/[token]/accept` (when body `{ merge: true }`): looks up the user's owned Free-tier account, reads its user_data, tags every item with `addedBy = userId` for chef-space attribution (forward-compat for "filter by chef" UI later), appends to the team's arrays. Bank ingredients dedupe by lowercase name (team's existing entry wins — we don't overwrite price or allergen data). After the merge, the personal account row is deleted (cascade removes membership + user_data). The GET `/api/invites/[token]` endpoint extended: when an `Authorization: Bearer` header is present, the response includes `userContext` with `hasMergeablePersonal`, item counts, and a `totalItems` summary so the page can render a meaningful "Move 12 recipes, 5 costings into Team" preview. The acceptance page only shows the merge prompt when the user has a Free-tier owned account distinct from the team — paid personal accounts are never auto-dissolved (people pay for them deliberately). New invite-signups (skipPersonal flag from Stage 4) have no personal account so they don't see the prompt either. `/app`'s pending-invite handler simplified: instead of auto-accepting, it redirects to `/invite/[token]` so the merge choice is never bypassed.
- **Multi-user — Stage 4 of 4 (role gating + Stripe→accounts + invite-signup polish)** shipped. (a) Stripe webhook now mirrors `tier`, `stripe_customer_id`, `stripe_subscription_id` to `public.accounts` on every owned account when `checkout.session.completed` fires; on `customer.subscription.deleted` it looks up the account via `accounts.stripe_customer_id` first (source of truth) and falls back to `auth.users.user_metadata.stripe_customer` for legacy customers — accounts get downgraded to `free` and `stripe_subscription_id` cleared. (b) New `src/lib/perms.ts` with `permsForRole(role)` returning a fully-typed perms record (`canEditContent`, `canEditPricing`, `canEditMenus`, `canEditInvoices`, `canManageBank`, `canManageTeam`, `canManageBilling`, `canManageSettings`, `isReadOnly`, plus a `reason` string for tooltips) and `usePerms()` hook reading from `useAuth().currentRole`. (c) New `RoleBanner` component renders a sticky strip at the top of `/app` for Chef and Viewer roles only (Owner/Manager get clean UI) showing their role, the constraint reason, and the active account name. (d) Gates applied: SettingsView (Defaults card hidden for non-managers, Account name/location disabled for non-managers, Upgrade button hidden for non-owners, Delete Account hidden for non-owners), CostingView (Save Costing button + Delete from history disabled for non-managers with tooltip), MenuBuilderView (+ Add Menu, + Add Dish, Menu Designer, Delete Menu, row arrows + remove buttons all hidden for non-managers — viewing menus + engineering still works), Sidebar (Upgrade CTA hidden for non-owners). (e) Invite-driven signup polish: `/invite/[token]` stashes the token in sessionStorage before the auth bounce; `/app` reads it on mount (URL param OR sessionStorage) and redeems it once auth resolves; AuthContext.signUp accepts `{ skipPersonal: boolean }`; AuthPage detects pending invite and passes `skipPersonal=true`; migration 008 updates the `handle_new_user` trigger to honor `raw_user_meta_data.skipPersonal` and short-circuit personal-account creation. Net: invited chefs end up with exactly one membership (the team they joined), no orphan personal account, no sidebar switcher noise. (f) Admin PATCH route (`/api/admin/users/[userId]`) now mirrors `tier` and `name` from profile to the user's owned accounts so admin tier/name edits propagate to the live app reads. **Not yet done in Stage 4:** dropping the legacy `user_data.user_id`-based RLS policies (parked — keeping them additive means no risk of locking ourselves out, and the membership-path policies are doing the real work). BankView per-ingredient unit-price gating for Chef vs Manager (Chef can edit allergens/nutrition but not price). Viewer-mode banner showing across all writable views (currently they just see Chef-equivalent disabled buttons, which is functionally correct but not maximally clear).
- **Multi-user — Stage 3 of 4 (Team UI + invite/accept flow)** shipped. New `src/lib/team.ts` central helpers: `verifyMember(req, accountId, minRole)` (bearer-token check + RLS-equivalent role gate), `verifyAuthed(req)` (just-authed, no account check), `seatUsage(supabase, accountId, tier)` (counts members + non-expired pending invites against `SEAT_LIMITS = { free: 1, pro: 1, kitchen: 10, group: undefined }`), `roleAtLeast`, `genInviteToken` (32 bytes hex via crypto.getRandomValues). API routes added under `/api/accounts/[id]/`: `team` (GET — enriched members + invites + seats, viewer+), `invites` (POST — create with seat/dup checks, manager+), `invites/[inviteId]` (DELETE revoke, manager+), `members/[userId]` (PATCH change role / transfer ownership, DELETE remove, manager+). Public-with-token routes: `/api/invites/[token]` (GET — anonymous lookup for landing page) and `/api/invites/[token]/accept` (POST — authed, idempotent membership upsert + invite mark-accepted). Owner cannot be demoted directly; promoting another member to owner is treated as ownership transfer (target → owner, caller → manager, accounts.owner_user_id moves). `TeamSection` component renders inside SettingsView for Owner/Manager only — members table with avatar/role-select/remove, pending invites table with copy-link/revoke, "+ Invite member" button (disabled at seat limit) opens modal that creates the invite and shows the URL with a copy button. Email delivery isn't wired yet (deliberately — keeps the dependency surface small for v1); inviter copies the link and shares via their preferred channel. Invite landing page at `/invite/[token]` renders the account name + role + email, prompts sign-in if anonymous, accept button if authed → calls accept → refreshAccounts + switchAccount + redirects to /app. New `src/app/invite/layout.tsx` wraps the route with AuthProvider since it sits outside /app. `next.config.js` host-rewrite exclusion regex extended to keep /invite from being rewritten on app.palateandpen.co.uk. Stage 4 (role-based UI gating across the app, Stripe webhook → accounts.tier, drop legacy user_id RLS) still ahead.
- **Multi-user — Stage 2 of 4 (account-aware contexts + sidebar switcher)** shipped. AuthContext now exposes `accounts: Membership[]`, `currentAccount`, `currentRole`, `switchAccount(id)` and `refreshAccounts()` alongside the original surface (existing `{user, loading, tier, signIn, signUp, signOut}` consumers untouched). Active account id is persisted to `localStorage.palatable_active_account_id` so the choice survives reloads. Default pick: stored choice if still a member, else first owned account, else first membership. `tier` is now sourced from `currentAccount.tier` first, falling back to `user_metadata.tier`. AppContext loads `user_data` by `account_id` instead of `user_id`; upserts always write `user_id = account.owner_user_id` so the unique row resolves to the same record regardless of who's editing (chef on employer's account writes the owner's row, RLS allows via membership policy). New `RESET` reducer action clears state when account changes mid-session so the loader shows during the swap. Sidebar gets an account switcher chip below the brand block — only renders when `accounts.length > 1`, click opens a dropdown with role pills and a checkmark on current. Loader-vs-AuthPage flow restructured: if loading → loader; if !user → AuthPage; if !currentAccount or !state.ready → loader. Stage 3 (Team UI + invite flow + email) and Stage 4 (role-based UI gating + Stripe webhook → accounts.tier, drop legacy user_id RLS) still ahead.
- **Multi-user — Stage 1 of 4 (schema + backfill)** shipped via migration 007. Introduces `accounts`, `account_members`, `account_invites` tables with role hierarchy `owner > manager > chef > viewer`. Roles: Owner = billing + delete; Manager = edit everything + invite; Chef = edit recipes/notes/waste/stock counts but not menus/pricing; Viewer = read-only. Tier seat limits: Free 1 / Pro 1 / Kitchen 10 / Group unlimited (enforced in Stage 3 invite flow, not yet at SQL level). Backfill: every existing user_data row → account they own, `account.id` aliased to `user.id` for clean transition. `user_data.account_id` column added (nullable, backfilled). Two RLS helpers — `is_account_member(account_id)` and `role_at_least(account_id, min_role)` — power additive RLS policies; legacy `user_id`-based policies stay so the app keeps working unchanged. `handle_new_user` trigger now creates account + owner-membership alongside the user_data row. Stage 2 (AuthContext loads accounts list + currentRole, AppContext loads by account_id, sidebar account switcher), Stage 3 (Team UI + invite flow + email), Stage 4 (role-based UI gating + Stripe webhook → accounts.tier, drop legacy user_id RLS) still ahead.

## Known Issues

- ~~Menu Designer layout broken in mobile view.~~ **Fixed** — mobile now gets a Design/Preview tab switcher at the top, full-width controls in Design mode, and a CSS-transform-scaled A4 sheet in Preview mode so the whole page fits without horizontal scroll.

## Important Notes

- All file writes use Node.js scripts to avoid Windows encoding issues
- Settings persist via localStorage key palatable_settings_v2
- App root div ID is palatable-app-root for zoom-based font scaling
- Stripe webhook endpoint: app.palateandpen.co.uk/api/stripe/webhook
- Invoice scanning requires Pro tier — checked server-side
- Demo account: jack@palateandpen.co.uk (Pro tier)
- **Inbound email infra (for email-forwarded invoices):** the webhook lives at `app.palateandpen.co.uk/api/inbound-email`. It expects an `INBOUND_EMAIL_SECRET` env var (Vercel) and accepts either `Authorization: Bearer <secret>` or `?secret=<secret>`. Inbound provider needs to deliver POST JSON with `to`, `from`, `subject`, `attachments[].content` (base64). Tested-against payload shapes: Resend (lowercase keys), Postmark (Title-case), Mailgun (after JSON conversion). DNS-side: chefs forward to `invoices+{token}@palateandpen.co.uk` — you need the MX record on that domain pointing at the inbound provider, plus a route in the provider's dashboard that catches `invoices*` (catch-all on the local part) and forwards to the webhook URL. Without that DNS wire-up the in-app UI still works (chefs see their address and can copy it) but no emails actually arrive.
- **supabase-js + Next.js fetch cache**: supabase-js calls global `fetch()` internally, and Next.js auto-caches GET `fetch()` calls in route handlers — even with `dynamic = 'force-dynamic'`. Symptom: server-side reads return phantom rows that no longer exist in Postgres. Fix: pass a custom `global.fetch` to `createClient` that wraps `fetch` with `cache: 'no-store'`. Centralized as `svc()` in `src/lib/admin.ts` — use it for any admin/server-role Supabase client. (Writes via PATCH/POST/DELETE are not cached, so this only affects GETs.)
- **AppContext load effect must depend on `user?.id`, not `user`**: the `user` object reference changes on every Supabase auth event including silent token refreshes (~hourly). If the load effect lists `[user]` in its deps, every refresh re-fetches user_data and overwrites in-flight local edits. Use `[user?.id]` so the effect only re-runs when the actual user changes. Same for the autosave effect.
- **Autosave**: 500ms debounced upsert in AppContext. Surfaces a save-status pill (Saving / Saved / ✗ Save failed) in the bottom-right of /app. Errors are logged via `console.error('[user_data save]', code, message)`. A `visibilitychange → hidden` listener flushes pending writes when the tab is about to close — best-effort, no sendBeacon (Supabase auth header isn't supported there).
- supabase-js `.insert(...)` without `.select()` can resolve before PostgREST commits when RLS is enabled. The shared `audit()` helper uses `.insert(...).select().single()` so the await fully round-trips.
- Sensitive Vercel env vars (Stripe, Supabase service role, Anthropic) cannot be pulled to local `.env.local`. To run admin/server routes locally that need them, paste manually. Pulled values come back as empty strings.
- **Migrations run manually in Supabase SQL editor.** No supabase-cli pipeline yet — when a new migration lands in `supabase/migrations/NNN_*.sql`, paste it into the Supabase SQL editor and run it. Latest is migration 009 (app_settings) which adds the platform-wide settings row used by the admin Platform section + the public `/api/platform-config` endpoint. Run it before using the new admin Platform controls.
- **Anthropic credit balance is a live operational dependency.** Recipe import (`/api/palatable/import-recipe`) and invoice scanning (`/api/palatable/scan-invoice`) both call Sonnet 4.6 via api.anthropic.com. If the balance hits £0 the API returns HTTP 400 "Your credit balance is too low" — the UI surfaces this as a clear error pill but the feature is dead until topped up. Top-up: https://console.anthropic.com/settings/plans. Cost is roughly $0.005 per import or scan with Sonnet 4.6 — small refills go a long way.
