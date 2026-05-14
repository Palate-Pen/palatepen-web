# Pre-launch build sequence

*The order things get built to ship v1, given everything decided 2026-05-14.*

Working back from a v1 that ships the role-aware customer product (chef / manager / owner shells, seven chef tabs, the new Notebook, the chef Margins dashboard, the Sites overview for owner) plus the admin v1 surfaces (Activity merged surface, Customer Activity, Support with impersonation, 2FA, etc.).

Substantially rewritten from the May 13 version. The previous sequence assumed adding features to an existing shape. This sequence builds the shape itself.

---

## The reframed plan, at a glance

Roughly 12–14 weeks of focused work to ship. Three phases:

1. **Foundation infrastructure** (weeks 1–3) — the plumbing that everything else depends on
2. **Role-aware surfaces and core features** (weeks 4–10) — the surfaces customers actually use
3. **Polish, security, launch** (weeks 11–14) — making it ready for paying customers

---

## Phase 1 — Foundation infrastructure (weeks 1–3)

### Why this comes first

Everything else depends on three pieces of plumbing: the notification engine (Inbox), the role-aware shell rendering, and the activity/event stream. None of the flagship surfaces (chef morning brief, owner business pulse, admin Needs Attention) work without these. They share a codebase across customer and admin products — built once, used everywhere.

### Week 1 — Foundation decisions and database

**Activity / event stream schema and dispatcher** (2 days)
- Schema: `activity_events` table per the shared infrastructure doc
- Dispatcher service taking events from any source, routing to the right recipients
- RLS policies

**Inbox schema and dispatcher routing** (2 days)
- Schema: `inbox_items` table per the shared infrastructure doc
- Routing rules: chef / manager / owner / operator
- RLS policies

**Role-aware shell rendering — schema** (1 day)
- `user_preferences` table with active_outlet, active_shell, notification_prefs
- Confirmed the existing `account_members` schema covers role-per-outlet

### Week 2 — Shell architecture and base Inbox UI

**Role detection hook and surface switcher** (3 days)
- `useActiveSurface()` hook
- `<SurfaceProvider>` wrapping the app
- Header surface switcher component
- Route gating logic
- Per-role surface preference persistence

**Base Inbox UI** (2 days)
- List view with grouping and severity
- Item detail view (markdown body + optional action buttons)
- Mark read / dismiss / action workflow
- Unread badge in nav
- Empty state

### Week 3 — Push/email infrastructure and design system extraction

**Notification delivery channels** (3 days)
- Push notification infrastructure (Expo is partially set up — wire it through)
- Email digest scheduler
- Optional SMS routing (paid tier)
- Per-user notification preferences

**Visual design system extraction** (2 days, Jack-led)
- Token extraction from admin and the P&P proposal: colour palette, typography scale, spacing scale, component primitives, motion primitives
- Light-mode variants where admin currently lacks them
- This is Jack's work; engineering integrates the tokens into the codebase

### Foundation phase exit criteria

- All three shell types can be rendered (even with placeholder content)
- The surface switcher works
- The Inbox can receive an event and display it in the right user's surface
- Activity stream captures events
- Push and email channels work end-to-end with a test event
- Design tokens are in code

---

## Phase 2 — Role-aware surfaces and core features (weeks 4–10)

### The order matters

Build chef shell first (most-used surface, highest-impact differentiator). Then owner shell (the Group/Enterprise demo surface). Then manager shell (smallest user group at launch). Within each shell, build the home surface first, then the substantive tabs.

### Week 4 — Chef home morning brief

The first real flagship surface.

- Chef home page with morning brief at the top, quick actions below
- First few inbox item types: margin_slip, price_change, stock_low, credit_note_pending, delivery_due
- Empty-state design ("you're all caught up")
- Mobile-first responsive layout

### Weeks 5–6 — Chef Margins dashboard

The chef's menu performance dashboard. Higher priority than I had it in the earlier sequence — this is chef-primary, not owner-only.

- Margins tab in chef nav
- Per-dish GP %, trend arrows, drift flags
- Supplier exposure per dish (which suppliers drive which dish costs)
- Click-through from dish to its Costing entry
- Time-series storage so trends actually mean something (daily GP snapshot per dish)

### Weeks 6–7 — Stock & Suppliers consolidation

Folding four current tabs into one consolidated chef/manager surface.

- New "Stock & Suppliers" route and component
- Sections for ingredient catalogue, supplier directory, invoices, waste log
- "Invoice scan" stays as a prominent quick action on home, but the invoice inventory moves here
- Removes Bank, Invoices, Suppliers, Waste from chef nav

### Weeks 7–8 — Costing as library overview

Refactor Costing tab from authoring workbench to library overview.

- New library grid: all costings, sortable by GP, filterable by menu section
- Click-through from grid into individual costing detail (which can still edit)
- Authoring flow lives inline in Recipes (already partially exists at `RecipesView.tsx:1379-1542`)
- The standalone `CostingView` workbench either retires or shrinks to a "scratch pad" for ad-hoc costings not yet tied to a recipe — *decision needed during this build*

### Weeks 8–10 — Margin leakage detection

The headline v1 intelligence feature. Transforms Palatable from operational tooling to operational intelligence.

- Time-series storage of dish margins (already started in Margins dashboard build)
- Detection logic: what counts as a meaningful margin slip (not noise)
- Root cause attribution: link the margin change to specific ingredient price movements
- Dispatcher integration: surfaces alerts in chef Inbox + manager Inbox + owner Inbox at appropriate frame
- "What to do about it" — suggestions for supplier alternatives, recipe swaps, price negotiation prompts

### Weeks 9–10 (parallel) — Owner shell and Sites overview

Runs in parallel with margin leakage because they touch different parts of the codebase.

- Owner home: business pulse top section, multi-site comparison panels
- Sites overview surface: group-level view of all sites at a glance, performance comparison, drill-into-any-one
- Drill-down into any site shows that site's manager-shell view
- Reuses Jack's pre-reframing Sites work where applicable

### Weeks 10 (parallel) — Manager home

Smaller scope than chef or owner home; manager is smallest user group at launch.

- Site status surface
- Routes manager-relevant inbox items to manager home
- PO approval workflow surfaced here

### Weeks 9–10 (parallel) — Credit note workflow

Pure chef-love feature. Builds on existing discrepancy detection.

- Automatic credit note request drafting from flagged discrepancies
- Email template per supplier with line-item detail
- Send + track workflow with status updates
- Manager view: outstanding credit notes by supplier and value
- Chef view: handled reassurance in Inbox

---

## Phase 3 — Notebook expansion, admin v1, polish, launch (weeks 11–14)

### Weeks 11–12 — Notebook expansion

Promoted from "tab that exists" to "key product feature." Significant build.

- Mobile-first redesign for chef-on-feet use
- Voice memos with transcription
- Photo capture and attachment
- Stylus / handwritten notes (where device supports)
- Sketches and drawings
- Sharing model: private by default, optional share-into-account
- Search across notebook content
- Linkability to dishes, recipes, suppliers, ingredients
- Cross-device sync
- Taggable outcomes for experiments

This is its own meaningful build. Could compress to one week or extend to three depending on how deep the v1 notebook goes. The principle: ship enough to genuinely replace a paper notebook for the chefs who would use one.

### Weeks 12–13 — Admin v1 completions

The admin v1 surfaces that aren't already there:

- Merge Audit Log + Customer events + System events into the single "Activity" surface with filters
- Customer Activity surface — pattern detection rules (start with 10–15)
- Support surface — full read+write impersonation, per-account diagnostic, quick-actions
- TOTP 2FA on admin authentication
- Remove the Control Desk button
- Drill-in on Users tab
- Wire Needs Attention feed to real signals

### Week 13 — Security, legal, T&Cs

Non-negotiable for launch.

- Full T&Cs covering impersonation rights, customer activity logging, data retention
- Privacy policy and DPA (UK GDPR-compliant)
- Cookie/consent compliance
- Security posture document (Supabase RLS, encryption at rest/in transit, backup posture)
- Subprocessor list
- IP protection decisions (trademark Palatable, copyright the codebase)

### Week 14 — Friendly beta and launch prep

- 3–5 friendly operators, ideally including at least one multi-site customer
- Cover all three customer roles in the beta — at least one site with active chef, manager, and owner users
- Two-week structured feedback period with specific questions per role
- Onboarding flow tested with non-Jack users
- Pricing live, billing tested with real charge → refund cycle
- Public website finalised (Palate & Pen consultancy first impression, heavy Palatable focus, role-aware product story, pricing tiers)

---

## What's deliberately not in v1

- **POS integration** — post-launch v1.1, Square first for simplest auth
- **Forecasting engine** — requires POS sales data first; v1.1+
- **Central kitchen management** — Phase 7+ scope, niche segment
- **Supplier intelligence benchmarking across customers** — requires customer invoice volume to be meaningful; build the data pipeline now (it's part of Bank + invoices), surface the cross-customer feature 6–12 months post-launch
- **Native mobile apps** — web-responsive is enough for v1; Expo mobile app at `/app` stays parked until post-launch
- **Autonomous ordering** — trust isn't earned yet; v3 territory
- **Xero integration** — post-launch, valuable but not differentiating
- **Customer Health monitoring** — admin v1.1
- **Billing operations** — admin v1.1, Stripe dashboard is fine for current scale
- **Marketing operations** — admin v1.2+, when Jack's brother joins go-to-market
- **Multi-admin permissions** — premature until there's a team

---

## What v1 actually ships

Working backward from this sequence, v1 launches with:

**For chefs:**
- A digital sous chef that handles the admin so they can cook
- The chef's menu performance dashboard (Margins)
- A genuine digital kitchen notebook that replaces paper
- Auto-maintained costing that updates itself as supplier prices change
- One consolidated Stock & Suppliers surface instead of four tabs
- Morning brief that tells them what they need to know before they ask

**For managers:**
- Site operational status at a glance
- All chef tools available, plus site-level reporting and PO management
- Margins for the site with operational drill-down

**For owners (Group/Enterprise):**
- Business pulse showing group performance
- Sites overview comparing all sites at a glance
- Multi-site Margins with supplier benchmarking
- Strategic reporting and accounting exports

**For the operator (Jack):**
- A founder-grade cockpit running the business
- Pattern-detection intelligence on customer behaviour
- Full support tooling (impersonation, diagnostic)
- Secure admin behind 2FA

**The intelligence layer:**
- Margin leakage detection — proactive alerts on slipping GP with root cause attribution
- Credit note workflow — automated supplier chase

**The shared foundation:**
- Notification engine routing intelligence to the right people in the right surface
- Role-aware shells calibrated to chef, manager, owner respectively
- Activity stream capturing what happens for support and intelligence

This is meaningfully more product than "another stock/recipe/costing tool." It's the digital sous chef the strategy docs have been describing, plus the operator cockpit, plus the foundation infrastructure that makes both possible.

---

## What this document is and isn't

**Is:** the build order for v1, in weeks, working back from a coherent launch. Replaces the May 13 build sequence which assumed a different product shape.

**Isn't:** detailed engineering specs (those come per-feature), the visual design (Jack's work), or a guarantee that 14 weeks is exact — real estimates always slip; this is the *order*, not a contract.

---

## Appendix — Rationale behind the build sequence

*Added after the sequence landed, to preserve the reasoning behind why this order rather than another.*

### Why foundation infrastructure first (weeks 1-3)

Three pieces of plumbing — notification engine, role-aware shell rendering, activity event stream — are dependencies for *everything else*. Every flagship surface needs them. Every intelligence feature needs them. Build them first, even though they're invisible at first, because:

1. **Building any surface without them means rebuilding parts of them later.** A chef home built before the notification engine has to fake the morning brief. When the engine arrives, the fake gets replaced — more work than building it once correctly.
2. **They take real time to get right.** Notification engine schema and dispatcher routing rules need design thinking; activity event stream needs schema decisions; role-aware shell rendering touches every route. Trying to slot these in mid-build creates fragile foundations.
3. **They're not visible features.** Customers won't see "Phase 1 — foundation infrastructure" as a thing. They'll see the surfaces that get built on top. So the foundation has to be *done* before customer-visible features begin, otherwise it gets squeezed by feature pressure.

Front-loading foundation work feels slow but actually accelerates everything that comes after.

### Why chef home before owner home before manager home

Three priority calls:
- **Chef home is most-used.** Every chef on the platform opens chef home daily. Owner home gets opened weekly at most. Manager home depends on operation type — some sites have active managers, others don't.
- **Owner home is the B2B demo surface.** When selling Group/Enterprise tier, the owner home is what the buyer wants to see. *"What will my operations team see?"* — the answer is owner home. Building it second means the demo is real, not mockup.
- **Manager home is smallest user group at launch.** Honest reality: most early customers will be single-site operations where the chef is also the manager. Manager shell users are a future audience. Build it third — competent but not the priority.

Same total effort, different ordering, much better strategic positioning.

### Why margin leakage detection is the headline v1 intelligence feature

The whole product positions itself as *"the intelligent sous chef."* That claim either lives or dies on what intelligence the product actually delivers.

Most kitchen software is reactive: chef enters data, software displays it. The differentiator is *proactive* intelligence — the system notices things and surfaces them before the chef has to look. Margin leakage detection is the clearest example: the system watches GP per dish over time, detects drift, attributes it to specific ingredient cost movements, surfaces it to the chef with a one-sentence diagnostic.

Without this working at v1, Palatable is just another stock/recipe/costing tool. With it, the "intelligent sous chef" claim is real — and the rest of the surfaces (morning brief, owner business pulse) become demonstrations of it.

### Why credit note workflow stays in v1

It's a chef-love feature. Every chef has experienced the friction of:
1. Receive a delivery that's short or wrong
2. Notice it manually (or, worse, not notice it)
3. Email the supplier with the discrepancy
4. Track whether the credit was issued
5. Reconcile against the invoice

This is unrewarding manual work. The current system already detects discrepancies (Invoice vs PO comparison). Automating the chase — draft the email, track status, surface in chef Inbox when handled — is a small build on existing infrastructure. The chef-love payoff is disproportionate to the build cost.

Also: it's a perfect demonstration of the "system handles the admin so the chef can cook" positioning. Customers tell other customers about this feature.

### Why POS integration is deferred to post-launch

POS integration is genuinely valuable — it enables menu engineering (sales × margin), enables forecasting (predict next week's prep from last week's sales), enables the manager Margins surface to be properly strategic.

But:
1. **Every POS is different.** Square has a clean API. Lightspeed has a half-API. Some legacy systems have nothing. Each POS is a separate integration project.
2. **No POS integration works for everyone.** Whichever POS we integrate first serves only the customers on that POS. Others are excluded.
3. **The features that depend on POS (menu engineering, forecasting) are *enhancement* features, not core.** Margin leakage works without POS data. Credit note workflow works without POS data. The core proposition stands without POS.

So: ship v1 without POS, validate the core proposition, then add POS integrations one at a time (Square first because of clean API + market share). The deferred features become reasons to upgrade to a higher tier.

### Why Notebook expansion gets its own dedicated build phase

Notebook isn't a sub-feature of another surface. It's its own product within the product — different mental model, different design pattern (more like a content app), different content types (voice, photo, sketch, text), different access patterns (mobile-first, private-by-default).

Compressing it into the schedule of another surface would either undersize it (it becomes the half-built notes page that exists currently) or compromise the other surface. Giving it dedicated weeks (Phase 3, weeks 11-12) means it gets the attention it deserves as the operational moat it's positioned to be.

### Why the friendly beta is week 14, not earlier

Operators are a finite resource. Asking them to test an unfinished product wastes their patience and yields feedback on things you already know are unfinished. Better to ship them something close to v1 and ask them to find the *real* issues — the ones you don't already know about.

Three-to-five operators, two weeks of structured feedback, with at least one multi-site customer covering all three roles (chef, manager, owner). That gives meaningful coverage of the role-aware design before public launch.

### What this appendix doesn't capture

Specific week-by-week task lists (those are tactical and will adjust as work progresses). The exact selection of beta operators. The detailed list of pre-launch legal/T&Cs/GDPR items (those have their own checklist).
