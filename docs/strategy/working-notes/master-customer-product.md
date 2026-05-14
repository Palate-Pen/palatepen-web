# Master view — customer product

*Locked 2026-05-14 evening. Supersedes the morning lock. Adds self-serve integration architecture, Stock & Suppliers expansion, forward-looking intelligence as architectural requirement.*

This is the canonical reference for what the Palatable customer product **is**, **does**, and **looks like** at v1 launch.

---

## The product in one paragraph

Palatable is an intelligent sous chef in software form. It takes the operational reality of a kitchen — the recipes, the costings, the supplier deliveries, the daily prep — and surfaces what matters: what's slipping, what's exposed, what to plan for. It speaks the language of chefs (not accountants), shows its work without showing off, and grows in intelligence as the user connects the tools they already have (POS, bookings, supplier portals). For users without these tools, the product still works — on what it has — and grows as they add connections.

---

## Three role-aware shells

The customer product renders three different shells based on the user's primary role at their outlet:

- **Chef shell** — operational, kitchen-floor focus
- **Manager shell** — operational + commercial, site-level focus
- **Owner shell** — strategic, business + multi-site focus (Group/Enterprise tier only)

A user with multiple roles (e.g. an owner-operator who's also their own chef) sees a surface switcher in the sidebar foot and can flip between shells. Each shell remembers its own state and preferences.

The shells share data — same underlying recipes, costings, suppliers, etc. — but show **role-calibrated views**. A chef opens Margins to see "how is my menu performing today"; an owner opens the equivalent to see "how is the business performing this quarter."

### Why role-aware rather than permission-filtered

Permission-filtered means one shell with disabled buttons. Role-aware means three calibrated experiences. Same data, different mental models. This is the architectural call we made in the morning's master view and it stands.

---

## Chef shell — eight tabs

1. **Home** — morning brief, today's overview, sous chef intelligence
2. **Recipes** — recipe library + authoring, with seasonal triggers in Looking Ahead
3. **Costing** — recipe-driven costing, ingredient drift detection
4. **Margins** — menu performance, attention cards on slipping dishes, dish trajectory
5. **Menus** — menu authoring + service-day mapping
6. **Stock & Suppliers** — *hub surface* with five sub-pages: Deliveries, Invoices, Suppliers, The Bank, Waste *(see expansion below)*
7. **Notebook** — voice memos, photos, sketches, experiment tracking
8. **Inbox** — push-driven notification stream, action items, follow-ups

Settings lives at the bottom of the sidebar, separate from the eight tabs.

---

## Stock & Suppliers — expanded structure

*Major change from morning lock.* What was a single tab consolidating four previously-separate surfaces becomes a **hub with five sub-pages**:

### Stock & Suppliers Hub (entry point)
Four-layer pattern: page header + KPIs, attention cards (forensic), destination cards (the five sub-pages), Looking Ahead (forward intelligence).

### Sub-page 1: Deliveries
What's arriving today, this week, and next. The daily-use sub-page. Inline delivery list with day-not-time scheduling, status pills (Arrived / Due soon / Expected / Tomorrow). Receives invoice scan triggers.

### Sub-page 2: Invoices
The paperwork inbox. **Includes first-class credit note workflow** — chef raises credit notes for discrepancies (short deliveries, wrong products, quality issues, price disagreements), system drafts and tracks, reconciles when issued. Discrepancy detection feeds in from PO-vs-invoice comparison.

### Sub-page 3: Suppliers
The supplier directory **and authoring surface**. Contact info, casual names, ordering schedules, current price lists, notes. Chef adds new suppliers here. Each supplier record is a real editable thing, not just a read-only list entry.

### Sub-page 4: The Bank
The ingredient catalogue with **live price-movement view**. Every ingredient, current price, supplier, last-updated, price trend. Auto-populated from scanned invoices with fuzzy ingredient matching (chef confirms on first encounter, system learns thereafter). No duplicates.

### Sub-page 5: Waste
Waste log entry + waste pattern analysis. End-of-service-and-week use.

---

## Looking Ahead — required pattern on every surface

**Architectural requirement.** Every customer-facing surface has a Looking Ahead section delivering forward-looking intelligence specific to that surface.

This is the third job alongside *see your data* and *see your insights*: **plan accordingly**.

Examples:
- **Chef home**: tonight's covers vs prep state
- **Margins**: dish trajectory forecasts ("if this holds, shawarma drops below 60% in 2 weeks")
- **Stock & Suppliers**: market moves, delivery week ahead
- **Recipes**: costing staleness, seasonal triggers
- **Inbox**: anticipated next-day workload
- **Notebook**: experiment revisit triggers (sumac season, anniversary reminders)
- **Costing**: prices that haven't been refreshed, costings nearing staleness threshold

Looking Ahead is **section-absent when empty**. It reappears when the system has something worth surfacing.

See `design-system-v7.md` §5 for the canonical pattern.

---

## Self-serve integration architecture

*Major addition to v1 scope, made possible by the architectural decision that integrations are user-credential-based.*

### The model

Palatable does **not** depend on B2B partnerships with POS or booking system vendors. The user brings their own credentials. Where the third-party tool exposes a public API, OAuth flow, or developer integration key, Palatable connects via those mechanisms.

### What this means practically

- **No partnership applications.** No Resy enterprise contract, no Square partner programme.
- **No integration revenue share.** No per-customer fees passed through.
- **User owns their credentials.** Stored encrypted at rest in their tenant, never shared cross-tenant.
- **Graceful degradation.** Users without integrations get the product working on what it has. Users with integrations connected get the product fully expressed.

### Supported integration categories at v1

Three categories, each with its own UI in a *Connect your tools* surface (lives in Settings, sub-page of Stock & Suppliers, or a dedicated Connections page — TBD in Settings design):

**1. POS systems**
- Square (primary — clean OAuth)
- Lightspeed
- Toast
- Epos Now
- TouchBistro
- Generic CSV import as fallback

**2. Booking systems**
- Resy (where the user has API access via their account)
- OpenTable (where exposed)
- SevenRooms (enterprise tier, where exposed)
- DesignMyNight
- Manual covers entry as fallback

**3. Supplier ordering systems**
Most suppliers don't expose APIs. Pattern is *ordering record* rather than API integration: chef logs their order (via WhatsApp, phone, email) into Palatable, and Palatable uses that for delivery forecasting. Some larger suppliers (Brakes, Bidfood, Reynolds, certain meat suppliers) do have portal exports — we accept those where they exist.

### What integrations enable

Forward-looking intelligence depends on data the system needs:

- **POS data** → dish popularity, sales trends, menu engineering, prep forecasting
- **Booking data** → tonight's covers, weekly cover forecast, busy-day planning
- **Supplier ordering data** → delivery week aggregation, supplier exposure forecasting

Without these, the system still works on:
- Scanned invoices (always available)
- Manual cover entry
- PO data (where present)
- Recipe + costing data (user-authored)
- Waste records (user-authored)

The user always gets value. More connections = more intelligence.

### Per-integration health

Each connected integration shows status in the user's Connections page: Connected / Disconnected / Needs reauth / Failing. Admin sees aggregated integration health across all customers (see `master-admin-product.md`).

---

## Bank auto-population intelligence

The Bank (ingredient catalogue) is **automatically maintained from scanned invoices**:

- Invoice scanned (photo from phone or PDF upload) → OCR extracts line items
- Each line item → ingredient name + quantity + unit + price + supplier
- Fuzzy match against existing Bank entries by supplier + ingredient name
- First encounter of new supplier-name-for-ingredient: chef confirms ("Is this the same as Lamb shoulder?"); system learns
- Subsequent encounters: auto-match silently
- Price updates flow to Bank, price history preserved
- New ingredients added with first-encounter metadata

Result: the Bank is **always current** without manual data entry. No duplicates. Real-time price movement visible in The Bank sub-page.

This is one of the largest engineering builds in v1 (OCR pipeline + fuzzy matching + learning catalogue). It's also the feature that most makes the product feel intelligent rather than data-entry.

---

## Manager shell (overview)

Same eight tabs as chef but role-calibrated. Differences:

- **Home** = site status (operational across all stations, not just kitchen)
- **Margins** = site-level performance + operational drill-down (chef sees menu performance; manager sees site profitability)
- **Stock & Suppliers** = adds procurement timing intelligence, multi-supplier comparisons
- **Reports** appears as a 9th tab — operational reports for upward reporting

Manager-specific Looking Ahead: cover forecasts vs staffing, supplier negotiation triggers, period-close prep.

---

## Owner shell (overview — Group/Enterprise only)

Smaller surface count, strategic focus. Sites overview as the primary surface, then group rollups of Margins, Suppliers (with cross-site benchmarking), and a business pulse home. **Owner shell does not render at single-site Pro or Kitchen tier** — single-site operators see chef or manager shell based on their primary role.

---

## What's not in v1 customer product

- **Multi-tenant supplier benchmarking** (cross-customer price comparison) — privacy concerns and trust-building required before this
- **Predictive cover modelling** (machine-learning forecast) — too early; v1 uses simpler forecasting based on observed patterns
- **Mobile-native apps** — v1 is mobile-responsive web only; native apps post-launch
- **Multi-currency / multi-region tax handling** — UK-focused v1
- **Inventory levels** (current stock-on-hand counts) — v1 tracks flow, not stock. Stock-on-hand tracking is v2 territory.
- **POS sales-driven menu engineering** — requires POS at sufficient scale per customer; v1 supports it where POS is connected, no claim made where it isn't

---

## What v1 launch must include

- Three role-aware shells with role detection
- Foundation infrastructure (notification engine, activity stream, daily GP snapshots)
- All eight chef tabs functioning
- Stock & Suppliers hub + five sub-pages
- Looking Ahead pattern on every surface (with surface-specific intelligence)
- Self-serve integration architecture with Square POS and Resy bookings as anchor integrations
- Bank auto-population from invoice scans (fuzzy matching + learning catalogue)
- Credit note workflow (in Invoices sub-page)
- Casual supplier names schema
- Notification preferences system

---

## Open questions for future iteration

- Notebook scope — voice memos, photos, sketches, search, sharing. Highest-novelty surface. Design pass needed before scope locks.
- Manager and owner shells need their own design passes — same patterns, different content priorities
- Settings architecture — preferences system is referenced by every other surface; needs dedicated design
- Connections page UI — where in the IA does "Connect your tools" live? Settings sub-page? Stock & Suppliers sub-page? Dedicated top-level?
- Onboarding flow — first-run experience for a brand new user. Probably tour-based per chef-home v5 pattern but extended for tool connection setup.

---

## Rationale appendix

### Why self-serve integration over partnerships

Three reasons:
1. **No budget.** Partnerships require business development time, lawyer fees, often revenue share. Self-funded build means none of that is available.
2. **User already pays.** A restaurant on Square is already paying Square. A restaurant on Resy is already paying Resy. Palatable doesn't need to insert itself into that commercial relationship — it just needs to be a good citizen of whichever ecosystem the user is on.
3. **Faster to launch and scale.** A partnership integration takes 3-6 months of business development. A self-serve OAuth integration takes 1-2 weeks of engineering. The product can support any tool with an API, not just the partners we've negotiated with.

### Why expand Stock & Suppliers from one tab to a hub with five sub-pages

Earlier consolidation pressure (the four-tabs-into-one decision from the morning) was the right *visual* call but didn't reflect the *depth* each area actually needs. Suppliers is a full authoring surface (contact info, casual names, ordering schedules, price lists). Invoices is a full workflow surface (credit notes, discrepancy resolution, supplier-to-account forwarding). The Bank is a live price-movement view. Each deserves to be a real sub-page with real depth, surfaced through a hub that intelligently surfaces what matters across all five.

### Why Looking Ahead is required on every surface

Most kitchen software is reactive: chef enters data, software displays it. The "intelligent sous chef" positioning requires the system to *anticipate*, not just report. A sous chef doesn't only tell you what happened yesterday — they tell you what to prep for tomorrow. Forward-looking intelligence on every surface is what delivers on that positioning. Without it, we're a costing tool with nice typography.
