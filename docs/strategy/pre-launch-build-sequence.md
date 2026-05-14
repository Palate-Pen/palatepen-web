# Pre-launch build sequence

*Locked 2026-05-14 evening. Adds integration layer and forecasting engine to foundation phase. Honest about timeline implications.*

The build sequence from current state to v1 launch. This document is the strategic ordering; specific weekly task lists are tactical and refine as work progresses.

---

## Honest framing

This timeline is **scope-honest, not date-honest**. The sequencing is right; the absolute weeks depend on actual capacity (you're self-funded and solo). Treat the phase counts as relative effort, not calendar weeks.

The previous build sequence (morning lock) targeted ~14 weeks to v1. This version is honest that the integration layer + forecasting engine add real engineering. **Realistic v1 launch is probably 18-22 weeks** of focused build from the foundation start. That's the honest scope. The strategic call (per the customer product master view) is *worth doing — full scope, ship when ready, no half-arsing*.

---

## Phase 1 — Foundation infrastructure

The plumbing every surface depends on. **Nothing customer-facing ships until this phase is solid.**

### Components

1. **Notification engine** — schema, dispatcher, role-routing rules
2. **Activity event stream** — unified events table, source tagging, query patterns
3. **Role detection + role-aware shell rendering** — three shells, surface switcher, per-role state
4. **Daily snapshots infrastructure** — margin snapshots, supplier price snapshots, waste snapshots, nightly cron writers
5. **[NEW] Integration layer foundation** — `integration_providers` and `integration_connections` tables, OAuth callback handler, encrypted credential storage, sync worker framework, health monitoring
6. **[NEW] Forward-intelligence engine foundation** — `forward_signals` table, detector function framework, signal expiry/dismissal pattern
7. **Visual design tokens** — formal extraction into `design-tokens.ts`

### Why this phase is bigger than the morning lock said

The integration layer and forecasting engine foundations weren't in the morning lock as foundation work. Adding them here means foundation is larger but every subsequent phase ships faster. The math works out the same total effort either way — foundation just gets a bigger up-front investment.

---

## Phase 2 — Chef shell core surfaces

With foundation in place, chef shell surfaces ship in priority order.

### Priority order

1. **Chef home** (v5 designed, build straightforward) — morning brief consuming notification engine signals
2. **Chef Margins** (v3 designed, depends on daily margin snapshots) — three-layer pattern, mode-shifted voice, time window selector
3. **Chef Stock & Suppliers hub** (v3 designed, four-layer pattern) — depends on:
   - Bank auto-population intelligence (OCR + fuzzy matching + learning catalogue) — *significant build*
   - Mobile invoice scan flow
   - Cross-supplier pattern detector (part of forecasting engine)
4. **Costing** — refresh of existing surface, ingredient drift detection
5. **Recipes** — existing surface + Looking Ahead retrofit (costing staleness, seasonal triggers)
6. **Menus** — existing surface + service-day mapping refinement
7. **Inbox** — new surface, consumes notification engine output
8. **Notebook** — design pass needed before build, then build

### Honest scoping note

The chef shell has eight tabs. Building all of them well is months of work. Some will be "good enough at v1, iterate after launch." Honest ordering above puts Margins and Stock & Suppliers high (genuine differentiators) and accepts that Notebook (high-novelty but lower-frequency-use) ships in a less polished form initially.

---

## Phase 3 — Integration providers

With integration layer foundation in place, individual integration providers ship.

### Priority order

1. **Square POS** (clean OAuth, biggest market) — anchor POS integration
2. **Resy bookings** (clean API for users with API access)
3. **Lightspeed POS** (second POS for market coverage)
4. **Manual covers entry fallback** (ensures product works without booking integration)
5. **Generic CSV import for POS sales data** (fallback for users on POS without API access)
6. **OpenTable bookings** (where accessible)
7. **Toast POS, Epos Now** (UK market coverage)
8. **Supplier portal exports** (Brakes, Bidfood, Reynolds) — manual upload first, automated polling later

### Pattern

Each integration is a 1-2 week build following the standard pattern (see `master-shared-infrastructure.md` §5). Many can ship in parallel as the build progresses. Don't gate launch on having all of them — launch with Square + Resy + manual fallback + CSV import covering the majority of cases.

---

## Phase 4 — Forecasting engine detectors

With foundation + chef surfaces + at least Square integration in place, forecasting detectors come online.

### Priority order

1. **Margin trajectory projector** (chef home, Margins)
2. **Cross-supplier pattern detector** (Stock & Suppliers, chef home)
3. **Delivery week aggregator** (Stock & Suppliers, chef home)
4. **Cover forecasting** (chef home — depends on booking integration)
5. **Recipe staleness detector** (Recipes)
6. **Cost spike anticipation** (Margins, Stock & Suppliers)
7. **Seasonal triggers** (Notebook, Recipes)

Each detector outputs structured forward_signals consumed by surface Looking Ahead sections.

---

## Phase 5 — Manager and owner shells

Once chef shell is solid and integrations are flowing data, manager and owner shells ship.

Manager shell inherits the chef surfaces but role-calibrates. Adds Reports as 9th tab. Owner shell uses chef + Sites overview + cross-site Margins + group business pulse home.

Build pattern: each manager/owner surface is a role-aware variant of an existing chef surface plus role-specific additions. Substantial work but every surface has a chef-shell ancestor to learn from.

---

## Phase 6 — Onboarding + Connections + Settings

Once core product works, the wrapping ships:

1. **First-run onboarding flow** — tour-based, walks new user through connecting tools, importing existing data, setting preferences
2. **Connections page** — surface for managing integrations (Connect / Disconnect / Reauth / View health)
3. **Settings** — preferences UI for the system that other surfaces have been reading from
4. **Account / billing** — Stripe integration, tier management
5. **Help + docs** — basic in-app docs, links to public help

---

## Phase 7 — Beta + launch prep

3-5 friendly operators test for 2-4 weeks. Structured feedback. At least one multi-site customer covering chef + manager + owner roles. Fix what surfaces. Lock launch readiness.

Then launch.

---

## What's deliberately out of v1

- **Native mobile apps** (web responsive only)
- **Multi-currency / multi-region tax handling** (UK only v1)
- **Inventory stock-on-hand tracking** (v1 tracks flow not stock)
- **Multi-tenant supplier benchmarking** (privacy + trust required first)
- **Machine-learning cover forecasting** (v1 uses simpler patterns)
- **Customer health monitoring in admin** (v1.1)
- **Hardware keys / IP allowlist for admin 2FA** (TOTP only at v1)
- **Group/Enterprise advanced features** (multi-site rollups exist but cross-customer benchmarking deferred)

---

## What v1 launch ships with

- Foundation infrastructure (notification engine, activity stream, role-aware shells, daily snapshots, integration layer, forecasting engine)
- Three role-aware shells (chef + manager + owner) with surface switcher
- Eight chef tabs + Reports for manager + Sites overview for owner
- Stock & Suppliers hub + five sub-pages
- Looking Ahead on every surface (with surface-specific intelligence)
- Self-serve integrations: Square + Resy + Lightspeed + manual fallbacks + CSV import
- Bank auto-population intelligence
- Credit note workflow
- Casual supplier names, mode-shifted voice, all design system patterns
- Onboarding + Connections + Settings
- Admin product with merged Activity, integration health visibility, impersonation, TOTP 2FA
- 3-5 friendly-operator beta tested

---

## Honest timeline read

- Foundation (Phase 1): 6-8 weeks
- Chef shell core (Phase 2): 6-8 weeks (parallelisable with Phase 3 once foundation done)
- Integrations (Phase 3): 4-6 weeks (parallelisable with Phase 2)
- Forecasting detectors (Phase 4): 3-4 weeks (parallelisable with Phase 3)
- Manager + owner shells (Phase 5): 4-6 weeks
- Onboarding + Connections + Settings (Phase 6): 2-3 weeks
- Beta + launch prep (Phase 7): 3-4 weeks

**Total: roughly 18-24 weeks of focused solo build to v1 launch.** Plus realistic life and context-switching overhead. Honest expectation: 6-9 months from foundation start.

---

## Rationale appendix

### Why integration layer is foundation rather than later

If integrations were deferred to post-launch, the forward-intelligence layer would ship hollow. *"Tonight's covers"* with no booking integration means manual entry only — the chef enters their cover forecast, the system shows it back. That's not intelligence; that's notes. Including the integration layer in foundation means forecasting has real data from launch.

### Why forecasting engine is its own subsystem

Per `master-shared-infrastructure.md` rationale: forecasting patterns repeat across surfaces. Building per-surface would create three implementations of margin trajectory, three of cross-supplier detection, three of cover forecasting. One engine emitting structured signals is the only sustainable architecture for a product with Looking Ahead on every surface.

### Why the timeline is honest about being longer

The morning's 14-week target was optimistic and predated the integration/forecasting architectural decisions. Honest scoping with those subsystems puts realistic launch at 6-9 months. The strategic call (full scope, no half-arsing) means we accept this. Better to ship a real product at month 8 than a half-built one at month 4.

### Why we don't gate launch on every integration shipping

Square + Resy + manual fallbacks + CSV import cover the majority of early-customer use cases. Adding Toast, Epos Now, OpenTable, etc, can ship as each customer demand emerges. Don't block launch on integration completeness — block on integration *architecture* completeness, with the most-used providers connected.
