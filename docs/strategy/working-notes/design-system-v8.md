# Palatable Design System v8

**Status:** Active
**Supersedes:** v7
**Date:** 14 May 2026 (evening)
**Surfaces locked under v8:** Notebook v1/v2, Seasonal, Suppliers v1/v2, The Bank, Invoices, Deliveries, Waste, Prep, Order Drafter

---

## What changed from v7

v7 locked the core conventions: forward-intelligence as a foundational subsystem, hub-with-destinations pattern, write-and-reference vs read-and-live surface types, working/celebrating attention severity, day-not-time language rule, device-aware quick actions.

v8 codifies the patterns that emerged from designing the full Stock & Suppliers feature area plus the Prep tab and Order Drafter. These patterns now reappear across the product and should be treated as locked components in the design language.

---

## New pattern 1 — Editorial-view-with-full-catalogue-link

**Principle:** Surface defaults to a curated editorial view (10–15 items of meaningful content). Full catalogue is one click away via a "View all N items" footer.

**Where it applies:**
- The Bank — 10 most active, *"View all 147 ingredients"*
- Invoices — 8 most recent, *"View all 14 invoices"*
- Waste — 5 most recent log entries, *"View all 41 entries"*
- Future: Recipes (top movers + recent), Notebook (recent entries + tag search)

**Component anatomy:**
- Italic muted explanation on left: *"Showing the 10 most active. 137 more stable or unchanged."*
- Gold-bordered button on right: *"View all 147 ingredients →"*
- Paper-warm background, top border separating from the list

**Why it works:** The default surface is a 30-second-glance editorial view. The browsing surface is a different mental mode — search, filter, find that specific item — and shouldn't dilute the editorial framing.

---

## New pattern 2 — Status-led row with left-edge bar

**Principle:** Rows in workflow surfaces carry their status visually via a 3px coloured left-edge bar. Status pill (dot + Cinzel label) sits in its own column. Italic Cormorant context line beneath the pill carries specifics.

**Where it applies:**
- Invoices — discrepancy / credit-in-flight / reconciled / paid
- Deliveries — discrepancy / arrived / due-soon / expected / scheduled
- Prep — not-started / in-progress / done / over-prepped / short

**Component anatomy:**
- Left-edge bar 3px wide, full height, coloured by status severity
- Status pill: 6px dot + Cinzel uppercase label, no background
- Context line in italic Cormorant Garamond beneath: *"Lamb shoulder short 4.2kg · ~£60 owed"* / *"Net 14 · due Mon 27 May"* / *"Mo confirmed · driver en route"*

**Severity-to-colour mapping** (consistent with v7 severity language):
- Urgent: `--urgent` (#A14424)
- Attention: `--attention` (#B86A2E)
- Info / In-flight: `--gold` (#B8923C)
- Healthy / Done: `--healthy` (#5D7F4F)
- Muted / Scheduled / Paid: `--muted-soft` (#A99B85) at 0.4–0.5 opacity

**Why it works:** Three resolutions of reading. Glance: colour bar. Scan: pill. Investigate: context line. Each layer does its own job.

---

## New pattern 3 — Write-and-workflow surface type

**Principle:** A new surface type distinct from write-and-reference (Suppliers, Notebook) and read-and-live (The Bank). Write-and-workflow surfaces are where chefs *do paperwork*: review what came in, raise credit notes, track responses, reconcile. Status is the primary mental axis.

**Where it applies:**
- Invoices is the exemplar
- Future: Bills/Payments (when designed), Tasks (if added)

**Hallmarks:**
- Status-led row design (pattern 2 above)
- Action prominence matches action urgency: urgent rows get filled gold buttons, in-flight rows get gold-bordered, reconciled/paid rows get subtle borderless
- Filter pills carry counts: All (14) / Needs action (3) / In flight (2)
- Attention cards lead the page, not just at the foot
- Looking Ahead does workflow forward-intelligence (payment run forecasting, behaviour patterns)

---

## New pattern 4 — Day-anchored navigation

**Principle:** For surfaces where "today" is the natural unit of work, navigation is a horizontal row of day-tabs with prev/next arrows. Active day is dark/inverted (background `--ink`, text `--paper`).

**Where it applies:**
- Prep — Yesterday / Today / Tomorrow / Sat / Sun
- Future: chef-home (if expanded), service reports

**Component anatomy:**
- Day-tab: outlined button, Cinzel uppercase label on top, Cormorant date below
- Active state: filled with `--ink` background, paper text
- Prev/next arrows in matching outlined treatment

**Why it works:** Chefs think in days. Calendar grids assume planning at a week+ horizon; day-tabs assume the workday is the unit.

---

## New pattern 5 — Day-grouped timeline layout

**Principle:** For chronological lists where day boundaries matter, sections are grouped per-day with a day-header carrying day-level metadata. Today's header gets a healthy-green underline as the now-anchor; future days get the standard gold underline.

**Where it applies:**
- Deliveries — Today / Tomorrow / Saturday / Next Week 19–24 May
- Future: Service journal, Brigade roster

**Component anatomy:**
- Day-header: paper-warm background, day-name in Cinzel gold, day-meta in italic Cormorant muted
- Underline: gold by default, healthy-green for the today section
- Rows beneath share the section's border but each carries its own status state

---

## New pattern 6 — Sparkline + arrow + percentage triple-encoding

**Principle:** Where price or magnitude movement matters, each row encodes the same story at three resolutions: a sparkline shows shape, an arrow shows direction, a percentage shows magnitude.

**Where it applies:**
- The Bank — every ingredient row
- Future: Recipe cost trends, supplier price comparisons

**Component anatomy:**
- 30-day sparkline at row height (~36px tall)
- Stroke colour matches direction: `--price-up` (burnt red) / `--price-down` (healthy green) / `--price-flat` (muted)
- Endpoint dot in matching colour
- Arrow icon to the right (up/down/dash) in same colour
- Percentage in Cinzel small caps, same colour

**Why it works:** Chef reading fast sees just arrow + colour. Chef looking carefully sees the shape. Chef investigating sees the exact percentage. The triple-encoding feels rich, not redundant.

---

## New pattern 7 — Just-updated row highlight

**Principle:** Rows that the system has just auto-banked or just changed get a temporary visual highlight: gold-bg fill, thin gold left-edge bar, and a "JUST IN" Cinzel pill near the item name.

**Where it applies:**
- The Bank — freshly auto-banked ingredients
- Future: Notebook (newly tagged), Recipes (recently scaled)

**Component anatomy:**
- Row background `--gold-bg` (rgba(201,168,76,0.06))
- Left-edge bar `--gold` 2px wide
- "JUST IN" pill: Cinzel 7px, paper text on gold background, 2px padding, uppercase

**Lifetime:** Highlight clears on next page load after 24 hours, or when chef explicitly acknowledges (e.g. clicks into the row).

---

## New pattern 8 — Multi-channel selector

**Principle:** When a workflow can resolve through multiple channels, present them as cards with selected state (gold top-bar + gold-bg) and disabled state (0.4 opacity) for unavailable channels.

**Where it applies:**
- Order Drafter — Email / WhatsApp / Portal / Phone
- Future: Comms (when designed), supplier contact preferences

**Component anatomy:**
- 4-card grid, equal width
- Each card: icon (24px), name (Cinzel uppercase), meta line (Cormorant italic with destination)
- Selected: gold-bg, gold top-bar 3px, name in gold-dark
- Disabled: 0.4 opacity, "Not available" or similar meta text

---

## New pattern 9 — Modal/sheet surface

**Principle:** Some workflows are modal — they overlay the current surface, complete a task, return. They are not pages and don't get navigation entries.

**Where it applies:**
- Order Drafter — launched from Deliveries + Suppliers
- Future: Quick add (notebook entry, prep item), Confirm dialogs

**Component anatomy:**
- Dark scrim over the parent surface
- Card centred, max-width 920px, shadow `0 24px 64px rgba(26,22,18,0.4)`
- Header / body / footer structure
- Close button top-right in header

---

## New pattern 10 — Inline AI suggestion row

**Principle:** Within tables or lists, the system can insert a suggestion row that has visually distinct treatment (gold-bg strip) and offers a one-click acceptance affordance.

**Where it applies:**
- Order Drafter — *"Friday's looking heavy — worth adding chicken wings?"*
- Future: Recipe scaling, Prep adjustments

**Component anatomy:**
- Gold-bg full-width strip within the table
- Info icon left (24px gold)
- Italic Cormorant body: system observation
- Gold-bordered "Add X" button right
- Single line preferred; multi-line allowed for richer context

---

## New pattern 11 — Smart ingredient detection visual

**Principle:** System-detected entities (ingredients tagged from voice transcript, photo caption, etc.) get a small gold-dot indicator at the left edge of the tag, distinct from chef-set tags.

**Where it applies:**
- Notebook v2 — system-detected vs chef-set ingredient tags
- Future: Recipe auto-tagging, prep item auto-categorisation

**Component anatomy:**
- Tag pill as normal
- 4px gold dot at left edge of pill, vertical-centered
- Hover reveals tooltip: *"System detected from voice memo"*

---

## New pattern 12 — Season ribbon on entries

**Principle:** Entries that contain ingredients with active seasonal status get a top-right corner pill indicating the seasonal state.

**Where it applies:**
- Notebook v2 — entries with ingredients that are coming-into-season / ending-soon / peaking

**Component anatomy:**
- Top-right corner pill
- Cinzel 8px uppercase, gold colour
- Variants: *"Coming next week · Sumac"* / *"Ending soon · Asparagus"* / *"At peak · Wild garlic"*

---

## New pattern 13 — In-your-notebook indicator

**Principle:** On reference surfaces (Seasonal calendar), rows where the chef has notebook entries about that ingredient get a small pill marker.

**Where it applies:**
- Seasonal — rows for ingredients with chef notebook entries
- Future: Recipe library (chef has cooked this), Supplier directory (chef has ordered from)

**Component anatomy:**
- Cinzel 8px uppercase pill
- Gold background, paper text
- *"In your notebook · 3"*

---

## New pattern 14 — Covers context strip

**Principle:** For surfaces where covers data drives decisions, a horizontal strip sits above the work area carrying tonight's number + forecast + italic system-read context.

**Where it applies:**
- Prep — *"Tonight's covers: 142 booked · Forecast: 156–168 · Tracking 18% above last Thursday..."*
- Future: Service planner (if added)

**Component anatomy:**
- Paper-warm background strip
- KPI blocks for booked + forecast (Cinzel labels, large Cormorant values)
- Vertical dividers between blocks
- Italic Cormorant context line right, flowing freely

---

## New pattern 15 — Five-state status spectrum

**Principle:** For surfaces tracking task or item state, a five-state spectrum applies: Not Started (muted) → In Progress (gold) → Done (healthy) → Over-Prepped (attention) / Short (urgent) as anomalous completions.

**Where it applies:**
- Prep — exemplar
- Future: any task-tracking surface

**Component anatomy:**
- Status pill: dot + Cinzel label
- Colours map to severity language:
  - Not Started: `--muted-soft`
  - In Progress: `--gold`
  - Done: `--healthy`
  - Over-Prepped: `--attention`
  - Short: `--urgent`

---

## Refinements to existing v7 patterns

**Looking Ahead** is now confirmed as a *required surface section* on every page, with one of three tag variants:
- *"Plan For It"* — actionable next step (e.g. payment run, order cutoff)
- *"Worth Knowing"* — pattern detected, no immediate action
- *"Get Ready"* — temporal trigger approaching (e.g. heavy delivery Monday)
- *"Market Move"* — cross-pattern signal from broader data

Always two cards (occasionally three for hubs). Always grid-based, no list of bullet points.

**Working/Celebrating attention severity** appears across more surfaces in v8 (Waste's improving aubergine, Invoices' auto-banking working). Pattern confirmed: this severity uses `--info` (gold) for the left-edge bar with *"Working"* or *"Improving"* tag. Critical for surfaces where data could otherwise feel demoralising.

**Day-not-time rule** holds strict. Throughout this evening's surfaces, every time reference is day-anchored (*"Mon 27 May"* / *"4 days ago"* / *"order today by 16:00"*) and never minute-anchored except inside data-display columns showing arrival times etc.

---

## CSS variable additions

Three new variables introduced for The Bank's price-movement visualisation:

```css
--price-up:        #A14424;        /* same as --urgent, semantic alias */
--price-down:      #5D7F4F;        /* same as --healthy, semantic alias */
--price-flat:      #A99B85;        /* same as --muted-soft, semantic alias */
--price-up-bg:     rgba(161,68,36,0.06);
--price-down-bg:   rgba(93,127,79,0.06);
```

The semantic aliasing keeps the design system colours singular while making cost-related code self-documenting.

---

## Locked v8 surfaces

| Surface | File | Status |
|---|---|---|
| Notebook v1 | `chef-notebook-mockup-v1.html` | Locked |
| Notebook v2 (smart detection) | `chef-notebook-mockup-v2.html` | Locked, supersedes v1 |
| Seasonal calendar | `chef-stock-suppliers-seasonal-mockup-v1.html` | Locked |
| Suppliers directory v1 | `chef-suppliers-directory-mockup-v1.html` | Preserved as iteration |
| Suppliers directory v2 (terms column) | `chef-suppliers-directory-mockup-v2.html` | Locked, supersedes v1 |
| The Bank | `chef-the-bank-mockup-v1.html` | Locked |
| Invoices | `chef-invoices-mockup-v1.html` | Locked |
| Deliveries | `chef-deliveries-mockup-v1.html` | Locked |
| Waste | `chef-waste-mockup-v1.html` | Locked |
| Prep (new chef tab) | `chef-prep-mockup-v1.html` | Locked |
| Order Drafter (modal) | `chef-order-drafter-mockup-v1.html` | Locked |

---

## Chef shell update

Chef shell now carries 9 tabs:

1. Home
2. **Prep** (NEW)
3. Recipes
4. Costing
5. Margins
6. Menus
7. Stock & Suppliers
8. Notebook
9. Inbox

Settings persists at sidebar foot.
