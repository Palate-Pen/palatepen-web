# Surface Notes — May 14 Evening Bundle

Compact design-rationale notes for every surface locked this evening. Each note: what the surface is for, what it isn't for, the key decisions baked in, the cross-surface connections.

---

## Chef Notebook (v1 → v2)

**Surface type:** Write-and-reference (chef captures, later reads back)
**Tab position:** Chef shell tab 8 (after Stock & Suppliers, before Inbox)

**What it's for:** Quick chef-floor capture of thoughts that don't belong in a recipe yet — voice memos, photos, sketches, free-form notes. The chef's running journal.

**What it isn't for:** Formal recipe authoring (that lives in Recipes). Brigade communication (Inbox). Task tracking (Prep).

**Key decisions baked in:**
- Masonry grid layout, mixed entry types (voice with waveform / photo with gradient / sketch with hand-drawn SVG / text notes)
- Four capture buttons in fixed position: Voice (primary gold), Photo, Sketch, Note
- Tag pills distinguish chef-set from system-detected (gold-dot left edge on detected)
- Shared-with-brigade indicator on entries (Kitchen tier+ only; Pro tier sees no sharing UI)
- "Coming Into Season" card section surfaces ingredients from entries that are timely
- Season ribbons appear on individual entries when their detected ingredients have seasonal status

**Cross-surface:**
- → Seasonal calendar (Coming Into Season cards link through; entries also show in calendar's "In your notebook" pills)
- → Recipes (entries can be promoted to recipes; "tested in service" link possible)
- → Prep (voice memos can reference prep adjustments — *"used labneh to thin per Tuesday's voice memo"*)
- ← The Bank (ingredient detection cross-references current pricing)

**v2 changes from v1:**
- Smart ingredient detection added (NLP-light extracts ingredients from voice transcripts, photo captions, sketch annotations)
- System-detected ingredient tags visually distinct from chef-set
- Coming Into Season cards now reference actual entries by name with counts
- Season ribbons added to entries with timely ingredients
- Filter pill "Coming into season" added
- Cross-links to Seasonal calendar

---

## Seasonal Calendar (v1)

**Surface type:** Reference (long-lived editorial dataset)
**Location:** Stock & Suppliers sub-page (also accessible from Notebook)

**What it's for:** UK seasonal produce calendar — what's coming into season, peaking, ending. A hand-curated reference the chef consults when planning menus, ordering, or thinking about specials.

**What it isn't for:** Live availability data from suppliers (that lives in Suppliers / The Bank). Recipe-level ingredient management (Recipes).

**Key decisions baked in:**
- 12-month timeline calendar grid (one column per month)
- 82 UK ingredients hand-curated for v1 (becomes the moat — not a third-party API)
- Season bars in three states: in-season (light gold) / peak (dark gold) / ending (warm amber)
- Current month highlighted with gold-bg cell + gold underline
- 4 KPI cards: In Season Now (37) / At Peak (8) / Ending Soon (3) / Coming Next Month (11)
- Category filters: Vegetables / Fruit / Herbs / Mushrooms / Fish / Game / In your notebook
- "In your notebook" pill on rows where chef has tagged entries
- Search input for finding a specific ingredient fast

**Cross-surface:**
- ← Notebook (entries with seasonal ingredients show ribbons; calendar shows "in your notebook" pills)
- → Looking Ahead in The Bank, Margins, Stock & Suppliers (seasonal triggers fire forward signals)
- → Future: Recipes (seasonal recipe filter)

---

## Suppliers Directory (v1 → v2)

**Surface type:** Write-and-reference
**Location:** Stock & Suppliers sub-page

**What it's for:** Master list of every supplier the kitchen works with — casual name, contact, ordering pattern, payment terms, recent activity. The reference the chef consults to know who to call, when, and what's owed.

**What it isn't for:** Live price tracking (The Bank). Order placement directly (that opens the Order Drafter). Invoice paperwork (Invoices).

**Key decisions baked in:**
- Casual-name first, italic gold, with legal name as sub-line (Aubrey / Aubrey Allen Ltd)
- Category grouping: Meat (41% spend) / Fish (14%) / Produce (22%) / Dry goods (13%) / Dairy (7%) / Drinks (3%)
- Per-row columns: Identity / Contact / Ordering pattern / Payment Terms / Recent activity / Arrow
- Payment terms with balance pill ("£1,240 owed" / "no balance" / COD distinct gold pill)
- Three attention cards: Stale (Reza price list 12 Feb), Dormant (Henstings 74 days), Strong (Aubrey Q1)
- "Add a supplier" quick action top-right of page header
- Page subtitle surfaces total exposure: *"£2,822 owed across the books"*

**Cross-surface:**
- → Order Drafter (each supplier has "Place order" action launching the drafter — future v3)
- → Invoices (payment terms feed payment run forecasting in Invoices Looking Ahead)
- → The Bank (clicking a supplier filters Bank rows to their catalogue)
- ← Deliveries (clicking a delivery's supplier name leads here)

**v2 changes from v1:**
- Payment terms now have their own column (was buried as third line in ordering pattern)
- Balance-owed pill quantifies cash flow exposure per supplier
- COD suppliers get distinct gold pill treatment
- Page subtitle surfaces total exposure

---

## The Bank (v1)

**Surface type:** Read-and-live
**Location:** Stock & Suppliers sub-page

**What it's for:** Live ingredient catalogue with price-movement focus. The chef's pulse on what's moving, what's stable, what just came in. Real-time view, not yesterday's snapshot.

**What it isn't for:** Ordering (Order Drafter). Recipe-level costing (Costing). Historical price analysis (future: Costing > Price History).

**Key decisions baked in:**
- Definite article italic-gold title (*The Bank* — treating it as a place not a feature)
- Top-bar pulsing live indicator + header eyebrow *"Live · last update 07:14"*
- Pending confirmation strip surfaces auto-population intelligence ("3 ingredients waiting on your confirmation")
- 4 KPIs: Ingredients On File (147) / Prices On The Move (11) / Auto-Updated This Week (23) / Multi-Sourced (18)
- Sort defaults to Movement (biggest changes first)
- Six-column row: Ingredient · Supplier · 30-day sparkline · Price · Movement (arrow + %) · Arrow
- Triple-encoding: sparkline (shape) + arrow (direction) + percentage (magnitude)
- "JUST IN" pill + gold-bg row highlighting on freshly auto-banked items
- Multi-supplier badge on ingredients bought from 2+
- View All footer pattern: *"Showing 10 most active. 137 more stable or unchanged."*
- Looking Ahead surfaces cross-pattern intelligence (tahini up at both suppliers = market move)

**Cross-surface:**
- ← Invoices (invoices scanned → ingredients auto-banked → confirmation queue in Inbox)
- ← Suppliers (supplier price-list refreshes feed Bank)
- → Costing (every recipe pulls from Bank prices)
- → Margins (margin calculations use Bank prices)
- → Order Drafter (estimated values pulled live from Bank)

---

## Invoices (v1)

**Surface type:** Write-and-workflow (new type, v8)
**Location:** Stock & Suppliers sub-page

**What it's for:** Paperwork inbox — review what came in, raise credit notes for discrepancies, track responses, reconcile against supplier accounts. The chef-love feature is the credit note workflow.

**What it isn't for:** Live price tracking (The Bank). Payment scheduling (future: Payments / Cash Flow). Live delivery tracking (Deliveries).

**Key decisions baked in:**
- Status-led row design (new pattern, design-system v8)
- Six columns: Supplier · Date · Total · Status pill + context · Action button · Arrow
- Five status states with left-edge coloured bar: Discrepancy (urgent) / Credit In Flight (gold) / Reconciled (healthy 0.5) / Paid (healthy 0.3) / In Review (attention)
- Action prominence matches urgency: gold-filled for "Draft credit note", gold-bordered for "View credit note", subtle for "View"
- Three attention cards: Discrepancy (Aubrey lamb short, cross-references Bank price for £ estimate), In Flight (Reza saffron 4 days, knows Mo's pattern), Working (auto-banking working — Working/Celebrating severity)
- Filter pills with counts: All (14) / Needs action (3) / In flight (2) / Reconciled (9)
- "Scan an invoice" quick action top-right (same affordance as Stock & Suppliers hub)
- View All footer pattern
- Looking Ahead: payment run forecasting (3 invoices due £862, minus £52 pending credit) + supplier behaviour patterns (Mediterranean substitutions creeping up — 3 credits in 42 days)

**Cross-surface:**
- → The Bank (scanned invoices auto-bank ingredient prices; confirmations queue in Inbox)
- → Suppliers (invoices reconcile against supplier accounts; payment terms feed payment run forecasting)
- → Inbox (pending confirmations workflow lives in Inbox)
- ← Deliveries (each delivery's docket photo attaches to the matching invoice)

---

## Deliveries (v1)

**Surface type:** Read-and-live with light write (status updates as deliveries arrive)
**Location:** Stock & Suppliers sub-page

**What it's for:** Day-grouped timeline of upcoming and recent deliveries. What's coming, when, what's already here, what's short. Operational visibility for kitchen receiving.

**What it isn't for:** Placing orders (Order Drafter). Reconciling invoices (Invoices). Tracking ingredient prices (The Bank).

**Key decisions baked in:**
- Day-grouped timeline (Today / Tomorrow / Saturday / Next Week 19-24 May)
- Today's day-header gets healthy-green underline as now-anchor; future days get standard gold
- Five row states with left-edge bar: Discrepancy (urgent) / Arrived (healthy) / Due Soon (attention) / Expected (gold) / Scheduled (muted)
- Five columns: Supplier + arrival window · Contents description · Value (auto-banked indicator) · Status + context · Arrow
- Future deliveries show estimated value in muted text (*"~£390"*) with *"not yet ordered"* / *"est. from PO"* sub-line
- Docket-attached pill on arrived rows (photo of delivery slip on file)
- 4 KPIs: Today (3) / This Week (7, £1,640) / Arrived & Banked past 30 days (23 zero missed) / Discrepancies Q2 (1)
- Looking Ahead: Monday's heavy meat order (operational planning: walk-in space, pass-staffing) + Reza Tuesday order cutoff tonight by 16:00

**Cross-surface:**
- → Order Drafter (scheduled rows have "Draft order" action that launches the drafter)
- → Invoices (delivery docket links to matching invoice)
- → The Bank (delivery values pulled live from Bank prices)
- → Prep (delivery contents inform Friday's prep planning — see Prep Looking Ahead)

---

## Waste (v1)

**Surface type:** Write-and-analyse (smallest sub-page in scope)
**Location:** Stock & Suppliers sub-page

**What it's for:** Logging waste quickly, surfacing patterns, intervening. *Where the prep over-ran, where the herbs walked, where the wins were.*

**What it isn't for:** Real-time stock counts. Prep planning (Prep). Recipe waste calculations (Costing).

**Key decisions baked in:**
- *"Log waste"* quick action top-right with sub-line *"takes 10 seconds"* — speed matters for accurate capture
- 4 KPIs: This Week (£148 attention, up 12%) / This Month (£562 vs £620 budget) / Top Category (Herbs, £62) / Worst Day (Sun, £38 avg)
- Three attention cards: Urgent pattern (herbs walking same path), Recurring (Sundays still worst, scale weekend prep down 15%), Improving (aubergine waste halved — Tom's plating credited)
- Working/Celebrating severity for "improving" — positive signal as counterweight (waste data can be demoralising)
- Two-card analytics: By Category (horizontal bars) + By Day of Week (bar chart, weekends in attention amber)
- Recent Log table with "why" column — the chef's reason text inline (the *why* is the most important column)
- View All footer pattern (5 most recent + 41 more)
- Looking Ahead: weekend over-prep intervention (scale Saturday down 15%) + herb order pattern check (ordering same as April, binning 30% more)

**Cross-surface:**
- ← Prep (over-prepped/short statuses feed waste; suggested-quantity flags reference waste history)
- ← Recipes (waste-per-recipe analysis informs recipe-level intelligence)
- → Margins (waste data feeds margin attribution)
- → Looking Ahead in chef-home (waste patterns surface as morning intelligence)

---

## Prep (v1) — NEW TOP-LEVEL CHEF TAB

**Surface type:** Write-and-workflow + chef-controlled authoring
**Tab position:** Chef shell tab 2 (after Home, before Recipes)

**What it's for:** Day-anchored, station-grouped prep sheet. What's getting made today, by whom, in what quantity, status now. The kitchen-floor surface chefs live in.

**What it isn't for:** Recipe authoring (Recipes). Ordering (Order Drafter). Cost analysis (Costing).

**Key decisions baked in:**
- **Critical principle: the chef sets the prep.** System suggests based on covers × recipes × past patterns, system flags anomalies, system never auto-overrides.
- Day-anchored navigation (Yesterday / Today / Tomorrow / Sat / Sun, today active dark/inverted)
- Station grouping: Garde Manger (Tom) / Grill (Maria) / Pass (Sam) / Pastry (unassigned today)
- Each station head shows assigned chef name + progress summary
- Each prep row: Item · Quantity (chef-set + muted suggested hint) · Assigned avatar+name · Status pill · Notes · Arrow
- Five status states: Not Started / In Progress / Done / Over-Prepped / Short
- Recipe-linked items show recipe pill; one-off items tagged as one-off
- Suggested quantities can flag attention (*"cut back 20% — last 4 weeks binned £62"*) but never override
- Notes column captures running chef thoughts (*"2% brine this time, not 3%"* / *"Used labneh to thin per Tuesday's voice memo"*)
- Covers context strip above stations: tonight's booked + forecast + italic system-read (*"tracking 18% above last Thursday, hummus and shawarma scaled accordingly"*)
- 4 KPIs: Items Today (12) / Done (4) / In Progress (3) / To Start (5 attention)
- Looking Ahead: Friday covers tracking high (scale shawarma + tahini, sea bream unassigned) + weekend over-prep pattern (scale Saturday down 15%)
- Add prep item quick action top-right of page header

**Cross-surface:**
- ← Recipes (recipe-linked prep items pull quantities from recipe × covers)
- ← Deliveries (incoming deliveries inform prep targets via Looking Ahead)
- → Waste (over-prepped/short statuses log directly into waste analysis)
- → Margins (prep targets vs actual feeds food-cost accuracy)
- → Notebook (voice memos can be referenced in prep notes; ingredient detection cross-tags)
- → Looking Ahead (forecast scenarios scale shawarma + tahini for high-covers Friday)

---

## Order Drafter (v1) — MODAL SURFACE

**Surface type:** Modal/sheet (new pattern in v8)
**Launched from:** Deliveries (scheduled rows have *"Draft order"* button) or Suppliers detail page (*"Place order"* primary action)

**What it's for:** Drafting a supplier order through email/WhatsApp/portal/phone with composed message preview. Returns to the launching surface on send.

**What it isn't for:** A standalone page. It is a modal that completes a task and exits.

**Key decisions baked in:**
- Dark scrim over parent surface
- Centered card max-width 920px with shadow
- Header / body / footer structure
- Three sections vertical: Order Items (editable table) / How to Send (4-channel selector) / Your Email (composed preview)
- Order items table: item · +/− qty input · unit · est value (live from The Bank) · remove
- Inline AI suggestion row (new v8 pattern): *"Friday's looking heavy — worth adding chicken wings?"* + Add 4kg button
- Total at bottom with system context (*"£175 ± 10% based on last 4 weeks"*)
- 4-channel selector (new v8 pattern): Email (selected gold treatment) / WhatsApp (available) / Portal (disabled, supplier doesn't have one) / Phone (available)
- Channel meta line per card (sarah@aubreyallen.co.uk / 07734 281 094 / Not available / Just shows number)
- Composed email preview fully editable: To/From/Subject in stacked fields + body in Cormorant reading like a chef writing to a supplier they know
- Footer commits the action: meta line *"Order will log as Expected delivery on Sat 17 May"* + Save as draft + Open in mail (primary gold)
- Open in mail launches mailto: link

**Cross-surface loop:**
- Deliveries scheduled row → Draft order → drafter opens → chef edits + sends via Email → returns to Deliveries → row updates to *"Expected · sent via email to Sarah"* with email icon
- Suppliers detail page → Place order → same drafter, pre-populated for that supplier
