# Surface design note — chef Stock & Suppliers (hub)

*Locked 2026-05-14 after v1 → v3 iteration. Reference mockup: `chef-stock-suppliers-hub-mockup-v3.html`.*

This is the surface design note for the **Stock & Suppliers hub page** — the entry point that consolidates four previously-separate tabs (Bank, Invoices, Suppliers, Waste) plus a new Deliveries surface into one role-aware operational surface with forward-looking intelligence.

This document is the per-surface companion to `design-system-v7.md`. It covers what's specific to the hub. Each sub-page (Deliveries, Invoices, Suppliers, The Bank, Waste) will get its own surface note when designed.

---

## Purpose of the surface

**The Stock & Suppliers hub answers two questions:**

1. *What's happening across my supply graph right now?* (forensic)
2. *What's coming I should plan for?* (forward-looking)

The hub is not a navigator — it's an intelligent overview. Five destinations live behind it as real sub-pages, but the hub itself delivers value on its own: a chef who reads only the hub still knows the state of their kitchen's supply graph and what to prep for.

---

## Page structure

Four-layer pattern (extension of the three-layer pattern used on chef home + Margins):

1. **Page header** — title + KPI row + the mobile-aware "Scan an invoice" quick action
2. **Attention cards** — three-card grid: forensic intelligence (price spikes, waste patterns, system-working states)
3. **Open A Workspace** — five destination cards leading into sub-pages
4. **Looking Ahead** — forward-looking intelligence (market moves, week-ahead planning)

The four-layer rather than three-layer pattern is because hub surfaces consolidate *and* anticipate, where surfaces like Margins only diagnose. Future hubs (manager Sites overview, owner business pulse) will use the same four-layer pattern.

---

## Layer 1 — Page header

### Eyebrow + title
- Eyebrow: *"The Flow Of Stuff"* — chef-authentic framing for what the surface is about
- Title: *"Stock & Suppliers"* with *Stock & Suppliers* in italic-gold per the design system pattern
- Subtitle: mode-shifted per design system §4. Has flagged content so stays factual-warm: *"Three deliveries today. One price spike to deal with. The rest is moving as it should."*

### Quick action: Scan an invoice (mobile-aware)

Top-right of the page header. The most time-sensitive action on this surface.

**Behaviour:**
- **On touch device with camera:** taps open device camera via `getUserMedia` API or `<input type="file" accept="image/*" capture="environment">` fallback. Chef takes photo, system parses.
- **On desktop:** tap opens file picker (PDF or image), with an option to "Send to phone" — generates short-lived URL + QR code for phone capture.

**Visual:** camera-icon (proper photo camera, not generic scanner). Below the label, a Cinzel-styled gold pill reads *"USE PHONE"* next to "or upload PDF." Device-awareness is signalled visually, not hidden in logic.

### Flow KPI row

Four KPIs across the supply flow:

1. **Today's Deliveries** — count + supplier names ("3 · Aubrey · Reza · Mediterranean")
2. **Suppliers Active** — count + status ("8 · all up to date")
3. **Invoices Pending** — count, attention-coloured if discrepancies exist
4. **Waste This Week** — value + trend ("£148 · up 12% — mostly herbs")

These are the *current state* KPIs. They don't forecast — that's Layer 4's job.

---

## Layer 2 — Attention cards (three-card grid)

Three columns. Each card uses the standard attention card pattern from `design-system-v7.md` §6 but extends it with a new severity introduced on this surface.

### The three severities present on the v3 reference mockup

**1. Urgent — Price Spike**
*"Lamb shoulder up 12% at Aubrey."* Cross-references Margins. Concrete numbers, casual supplier name, the "Margins flagged it this morning too" detail showing the system cross-references its own intelligence.

**2. Watch — Waste Pattern**
*"Herbs are walking out the bin this week."* Personality but not flippant. The "£62 of herbs binned in four days — twice last week" detail makes the pattern concrete and the action obvious.

**3. NEW: Working / Celebrating — The Bank**
*"Bank's been busy keeping itself tidy."* This is a new attention card severity introduced on this surface and now documented in the design system. **Info-bar severity (gold) for system-intelligence moments** — the system is doing work, and the chef should know.

The auto-Bank card describes the system's behaviour: *"11 prices updated automatically this week from the invoices you scanned. Three new ingredients added — saffron threads, sumac, Aleppo pepper. No duplicates, all matched to existing suppliers."*

### Why a Working severity is a real pattern

The "intelligent sous chef" claim requires the system to *show its work occasionally*. If the auto-Bank population just happens silently, the chef never knows it's happening — and the system's intelligence becomes invisible. The Working severity card surfaces the intelligence on a cadence that builds trust without becoming noisy.

**Voice rule for Working state:** dry-warm, observational, never boastful. *"Bank's been busy keeping itself tidy"* lands; *"Look at what I did for you!"* doesn't.

**Frequency rule:** at most one Working card per surface visit. Surfacing too many turns intelligence into noise.

---

## Layer 3 — Open A Workspace (destination cards)

Five destinations leading to sub-pages. Asymmetric grid: 1.6fr / 1fr / 1fr across two rows.

### Featured destination: Deliveries

Spans two rows on the left. Larger because deliveries are the *daily-use area* — chefs check what's arriving multiple times per day.

Contains an inline delivery list (5 rows, the next 7 days):
- **Day column** (Thu / Fri / Sat) — not time. The system shows day granularity because that's what chefs actually know. Pinning to 07:00 creates false expectations of minute-precision the system doesn't have.
- **Supplier + sub-line** — name, contents summary, sometimes "auto-banked" tag if invoice has been scanned
- **Status pill** — Arrived / Due soon / Expected / Tomorrow / Saturday. Status carries the urgency where it matters.

### Secondary destinations (four cards in 2×2 grid)

**Invoices** — *"paperwork, discrepancies, credit notes"*
State lines: "In the inbox", "Discrepancies flagged" (attention-coloured if present), "Credit notes in flight"

**Suppliers** — *"who you buy from, when, for how much"*
State lines: "On the books" (count), "Ordering today" (next supplier deadline), "Price lists current" (count complete)
Foot meta: *"+ add new"* — this surface is a write surface, not just a read directory

**The Bank** — *"every ingredient, every price, live"*
State lines: leads with **Live** indicator (pulsing dot matching top-bar) reading *"Updating in real time"*, then "Ingredients on file" (count), then "Prices on the move" (count, attention-coloured) with em-italic "this week"
The Bank destination foreshadows the sub-page's *live price-movement* nature

**Waste** — *"what got binned and why"*
State lines: "This week" (value, attention-coloured if up), "Top category", "Last logged"
Foot meta: *"+ log new"* — also a write surface

### Why asymmetric layout

Symmetric 5-across or 2-3 across would be simpler but wouldn't honour Deliveries' status as the *daily-use* destination. The asymmetry tells the chef which destination they'll open most often without needing to read the cards.

---

## Layer 4 — Looking Ahead (forward-looking intelligence)

**This is the most architecturally significant section of the surface.** It's also a *required* pattern for every surface in the product going forward — see `design-system-v7.md` §5.

Two cards side-by-side on this surface. Each card pattern mirrors attention cards but with:
- **Info-severity (gold) bar** — visually distinct from forensic intelligence above
- **Tag labels:** "PLAN FOR IT", "GET READY", "WORTH KNOWING", "ON THE HORIZON" (vary by card content)
- **Section label** describing the category: "Market Move", "Next Week", "Seasonal", etc.

### Card 1 — Market Move / Plan For It

*"Tahini is drifting up across the market."*

> Reza put it up 8% this week, Mediterranean up 6% — both moving the same direction tells you this isn't a supplier issue, it's the market. Likely to tick again in 2–3 weeks. Worth stocking what you'll need before then. Your hummus and baba ghanoush will both feel it.

**The intelligence:** *cross-supplier pattern detection*. The system knows that when two independent suppliers move the same direction at the same time, it's a market signal, not a supplier-specific issue. The card surfaces both the pattern *and* the actionable interpretation (stock now, here are affected dishes).

### Card 2 — Next Week / Get Ready

*"Next week is a heavy one."*

> Six deliveries booked, £840 across them. Aubrey's running big Monday and Saturday — about £390 of meat between them. Worth clearing walk-in space before the weekend and making sure someone's on the pass for both deliveries.

**The intelligence:** *operational planning*. The system aggregates upcoming bookings and provides prescriptive action (walk-in space, staffing the pass). Forward-looking with concrete next-steps.

### Voice rules for Looking Ahead

- **Always informative, never alarmist.** Forward-looking is not the same as warning. The chef has time to plan, the card respects that.
- **Always actionable.** Each card includes a "worth doing X" line. If a forward signal doesn't have an obvious action, it doesn't belong in Looking Ahead.
- **Mode-shifted same as attention cards.** Worrying patterns get serious voice ("market's moving"). Reassuring or neutral patterns get dry warmth ("next week's a heavy one" — observational, not anxious).

---

## Settings / preferences this surface depends on

- **Casual supplier names** (per design system §11) — drives "Aubrey hit you with" voice
- **Default time window for waste/invoice metrics** (preferences) — "this week" rolls 7 days; could roll-by-month for managers
- **Delivery schedule per supplier** — what days each supplier delivers, used by Looking Ahead delivery week forecasting
- **Integration credentials** (per master-shared-infrastructure §X) — POS, booking, supplier portal connections
- **Notification rules** — which severity flagged signals trigger Inbox notifications

---

## What's deliberately not on this surface (in v1)

- **Detailed waste analytics** (heat-maps, category breakdown over time) — lives in Waste sub-page
- **Supplier price benchmarking** (cross-customer comparison) — owner shell future feature
- **Inventory levels** (current stock counts) — not part of v1 product; v1 doesn't track stock-on-hand, only flow-through
- **Supplier onboarding wizard** — first-time supplier add flow lives in Suppliers sub-page
- **Credit note authoring** — first-class workflow but lives in Invoices sub-page

---

## Build sequence for this surface

In rough order of dependency:

1. **Hub page layout** (this surface itself — four-layer, destination grid, attention card three-up)
2. **Flow KPI aggregation** — counts from existing data (deliveries, suppliers, invoices, waste records)
3. **Attention card data pipeline** — price spike detection (depends on margin leakage engine), waste pattern detection, Bank auto-update reporting
4. **Looking Ahead intelligence engine**:
   - Cross-supplier price pattern detection (compares price movements across suppliers per ingredient)
   - Delivery week aggregation (sums next 7 days of expected deliveries)
   - Operational advice generation (walk-in capacity rules, staffing-on-pass rules)
5. **Mobile invoice scan flow** — camera capture + OCR pipeline + ingredient parsing
6. **Bank auto-population intelligence** — fuzzy matching, supplier-raw-name preservation, learning catalogue
7. **Five sub-pages** — each its own design pass and build, in priority order:
   - Suppliers (highest authoring volume — chef-managed)
   - Invoices (credit note workflow — chef-love feature)
   - The Bank (live price movement UI)
   - Deliveries (mostly displays existing data)
   - Waste (smallest scope)

---

## Open questions for future iteration

- **Manager/owner versions of this hub.** Manager would emphasise multi-supplier cost comparison and procurement timing. Owner would emphasise cross-site supplier benchmarking. Both inherit the four-layer pattern but customize per role.
- **Looking Ahead frequency.** Refresh daily? Weekly? Real-time? Probably daily — chefs don't need market move alerts every hour, but they want them fresh each morning. Worth defining cadence per card type.
- **Empty-state for Looking Ahead.** When the system has no forward intelligence to surface (calm patterns across the supply graph), does the section disappear (per empty-state-as-section-absent principle) or show a "all calm" state? My instinct: section disappears, matching the established pattern.
- **Integration awareness in Looking Ahead.** When the user hasn't connected their POS, the "your hummus will feel it" line can't accurately reference dish popularity. Either the system uses fallback heuristics (which dishes use this ingredient) or it gates that specific intelligence behind POS connection. Worth a separate design decision.

---

## Rationale appendix

### Why a hub rather than four separate tabs

The previous four-tab structure (Bank, Invoices, Suppliers, Waste) forced chefs to context-switch between four views to do what's really one mental task: *managing the flow of stuff into and through the kitchen*. The hub consolidates the operational view above the data destinations, so the chef can see the whole supply graph state in one read and only opens a sub-page when they want to drill in.

The risk of consolidation was that the page would become a "kitchen sink." The four-layer pattern with attention cards and Looking Ahead earns the consolidation by *adding new value* — the intelligence layer surfaces patterns across all four data sources that the separate tabs couldn't.

### Why Looking Ahead as its own section, not woven into attention cards

Forensic intelligence (something's wrong now) and forward intelligence (something's coming you should plan for) are *different mental modes*. Mixing them in the same section would mean the chef has to context-switch between "act now" and "prepare for" while reading. Separate sections let the chef read top-down: *what to fix today → where to go → what to prep for*.

### Why Working/Celebrating severity is genuinely useful

If the auto-Bank intelligence happens silently, the chef never learns to trust it. The Working card occasionally surfaces the system doing its work — *"Bank's been busy keeping itself tidy"* — without becoming noisy or self-congratulatory. The dry-warm voice rule matters: it should never read as the system bragging.

### Why the integration-aware quick action

Invoices arrive on paper. Chef has phone in pocket. The friction-free pattern is: paper arrives → phone scans it → system parses it. The desktop-with-QR fallback handles the chef sitting at their office laptop who got an emailed PDF, but the *primary* mode is mobile camera. Designing the button to surface that primary mode explicitly tells the chef the system thinks about workflow, not just data entry.
