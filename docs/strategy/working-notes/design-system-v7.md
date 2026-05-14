# Palatable design system — v7

*Supersedes v6. Captured 2026-05-14 after Stock & Suppliers hub design work.*

Reference mockups:
- `chef-home-mockup-v5.html` (visual baseline)
- `chef-margins-mockup-v3.html` (three-layer pattern + mode-shifted voice)
- `chef-stock-suppliers-hub-mockup-v3.html` (four-layer hub pattern, Looking Ahead, Working severity)

This is the visual canon for the Palatable customer product. Every customer-facing surface builds to this system.

This document keeps the structure of v6 and adds what's been learned from Stock & Suppliers work. New material is flagged `[v7]` for ease of comparison.

---

## 1. Brand identity

Unchanged from v6. Editorial-magazine, not SaaS-dashboard. Cream paper, deep ink, gold accents. *Tidy station = tidy mind = clean good food.*

---

## 2. Colour tokens

Unchanged from v6. Five colours doing 80% of the work: `--paper`, `--ink`, `--gold`, `--muted`, `--rule`. See v6 for full token list.

---

## 3. Typography

Unchanged from v6. Cormorant Garamond for content, Cinzel for structure (always uppercase + letter-spaced), Jost for micro-UI. Italic-gold for the noun that matters.

---

## 4. Voice — mode-shifted

Unchanged from v6. Voice tracks severity of the content beneath it. Serious for Urgent/Watch, dry warmth for Healthy/steady. Page's most severe content sets dominant register; warmth lives in unflagged details.

### [v7] New severity: Working / Celebrating

Introduced on Stock & Suppliers hub. **Info-severity (gold bar) cards for system-intelligence moments** — when the system has been doing work and the chef should know.

**Voice rule:** dry-warm, observational, never boastful.
- ✅ *"Bank's been busy keeping itself tidy."*
- ✅ *"148 prices auto-updated this week from your scans."*
- ❌ *"Look what I did for you!"*
- ❌ *"Your AI assistant has automatically..."*

**Frequency rule:** at most one Working card per surface visit. Surfacing too many turns intelligence into noise. If the surface has more than one celebrate-worthy state, pick the most useful one.

**Visual:** standard attention card pattern but with gold (info) severity bar instead of red (urgent) or amber (attention). Severity label reads "Working" or contextually-appropriate variant.

---

## 5. [v7] Looking Ahead — required surface section

**The most important new architectural pattern.** Every customer-facing surface in the product gets a Looking Ahead section. This is not optional.

### The rule

Every surface answers three questions, not two:
1. **See your data** — what's the current state (KPIs, counts)
2. **See your insights** — what's drifted, what's exposed, what needs sorting (attention cards)
3. **[v7] Plan accordingly** — what's coming, what to prep for, what to anticipate (Looking Ahead)

Without all three, the surface is analytical, not sous-chef-like. Most kitchen software stops at job 1. Doing 1+2 makes us analytical. Doing 1+2+3 makes us intelligent.

### Placement rules

- Looking Ahead lives *below* the operational sections (attention cards, destination cards, detail tables)
- It's the *last* section on the surface before any footnote or meta
- This top-down reading pattern: *forensic → operational → strategic*

### Card pattern

Same structure as attention cards (see §6) but with:
- **Info-severity gold bar** (visually distinct from forensic intelligence)
- **Tag label instead of severity:** "PLAN FOR IT", "GET READY", "WORTH KNOWING", "ON THE HORIZON", "HEADS UP", contextual variants
- **Section label describing category:** "Market Move", "Next Week", "Seasonal", "Trajectory", etc.

### Content rules

- **Always actionable.** Each card includes a "worth doing X" or "here's what to plan for" line. Forward signals without actions don't belong here.
- **Always grounded in data.** No speculation, no "the AI thinks" framing. The card explains *what the system noticed* + *what that suggests*.
- **Mode-shifted same as attention cards.** Worrying patterns get serious voice. Neutral patterns get dry warmth.

### Per-surface examples

Each surface will need its own forward-intelligence content. Quick reference:

- **Chef home** — tonight's covers vs prep state, weekly forecast, weather impact
- **Margins** — dish trajectory ("if this holds, you're below 60% in 2 weeks"), supplier exposure forecasts
- **Stock & Suppliers** — market moves (cross-supplier price patterns), delivery week ahead, seasonal triggers
- **Recipes** — costing staleness flags, seasonal ingredient triggers, dish anniversary reminders
- **Inbox** — anticipated next-day workload, follow-ups due
- **Notebook** — experiment revisit triggers (sumac season, dish anniversaries, seasonal opportunities)
- **Costing** — ingredients with prices that haven't been refreshed, costings nearing staleness threshold

### Empty state for Looking Ahead

When the system has no forward intelligence to surface, the section is **absent** (per the empty-state-as-section-absent principle). Don't show "all calm" — let the operational content lead instead. The Looking Ahead section reappears the moment the system has something worth saying.

---

## 6. [v7] Hub-with-destinations pattern

A new surface type introduced on Stock & Suppliers. Used when a single tab needs to consolidate multiple sub-pages while still providing intelligence at the top level.

### Structure

Four-layer pattern (extension of three-layer):

1. **Page header** — title + KPIs + page-level quick action
2. **Attention cards** — forensic intelligence (three-up grid)
3. **Open A Workspace** — destination cards leading to sub-pages
4. **Looking Ahead** — forward-looking intelligence

### Destination card pattern

Each destination card represents a sub-page and shows live state at a glance:

```
┌────────────────────────────────┐
│ [icon] DESTINATION NAME        │
│        tagline italic muted    │
├────────────────────────────────┤
│ State line 1 (count)           │
│ State line 2 (status)          │
│ State line 3 (attention/etc)   │
├────────────────────────────────┤
│ Open Destination →  meta info  │
└────────────────────────────────┘
```

- Icon: 40×40 gold-bordered square, stroked SVG icon matching the destination
- Name: Cinzel 600 small caps gold
- Tagline: Cormorant italic 13px muted
- State rows: 3-4 rows, Cormorant 14px with strong values, optional em-italic context, can be coloured (attention/urgent/healthy)
- Foot: action link left + meta context right

### Featured destination pattern

When one destination is significantly more daily-use than the others, it can be **featured** — spanning more grid space (e.g. 1.6fr instead of 1fr) and including inline content rather than just state lines.

Example: Stock & Suppliers featured Deliveries spans two rows and includes a 5-row inline delivery list. The user sees the next week's incoming without leaving the hub.

### Grid layout

Asymmetric grid is fine and often correct: `grid-template-columns: 1.6fr 1fr 1fr` with the featured card spanning two rows. Avoid over-symmetrising — the asymmetry tells the user which destination matters most.

---

## 7. [v7] Device-aware quick action pattern

When a primary action is best performed on a specific device (e.g. mobile camera for invoice scan, desktop for bulk uploads), the quick action card surfaces device-awareness visually.

### Visual

```
[icon] Primary action label
       [USE PHONE] or upload PDF
```

- Icon: matches the device-optimal flow (camera icon for photo capture, not generic scanner)
- Label: imperative ("Scan an invoice")
- Hint: small Cinzel-styled pill ("USE PHONE", "ON DESKTOP", "ON MOBILE") + fallback option

### Behaviour

- **On touch device:** primary action opens device-native flow (camera, file picker with capture)
- **On desktop:** primary action opens desktop flow + offers "send to phone" via QR/short URL

### Where this pattern applies

- Stock & Suppliers: Scan an invoice
- Notebook: Voice memo, Photo capture
- Chef home (future): Quick photo of today's special
- Anywhere camera/mic input is part of the primary flow

---

## 8. Layout

Unchanged from v6. App shell with 252px/72px sidebar + main flex. Header row both 76px (`--header-row-height`). Page padding 48px 56px 80px, max-width 1280px for content-dense surfaces (Margins, Stock & Suppliers).

---

## 9. Components

Unchanged from v6 except for additions in §5 (Looking Ahead card pattern) and §6 (destination card pattern, featured destination pattern). See v6 for sidebar nav, attention card base, KPI card, section heads, buttons, live indicator, tooltip patterns.

### [v7] Delivery row — day-not-time rule

For surfaces showing scheduled deliveries:

- **Day column** (Mon / Tue / Wed / Thu / Fri / Sat / Sun) — *not* time
- Time-of-day implies precision the system doesn't have (Aubrey delivers "Tuesday morning", not "07:00")
- Status pill carries the urgency where it matters ("Due soon", "Arrived", "Expected", "Tomorrow", "Saturday")

This rule applies to any surface showing forecasted/scheduled timing. Specific time only when the system has *actual* time data (e.g. live invoice timestamp, last-scanned-at).

---

## 10. Motion

Unchanged from v6.

---

## 11. Empty states — the principle

Unchanged from v6. Section-absent over present-but-empty. Subtitle tone adjusts ("a quiet one", "everyone behaving"). Quiet means the system is working, page celebrates it.

### [v7] Empty state for Looking Ahead specifically

Looking Ahead is **always** section-absent when empty. Never "all calm" copy. The forward intelligence section reappears when the system has something worth surfacing.

---

## 12. Iconography

Unchanged from v6. Stroked, 1.5 stroke-width, no fills. Same family across the product.

### [v7] New icons used on Stock & Suppliers

- Delivery truck (Deliveries destination)
- Document with lines (Invoices destination)
- Building / supplier (Suppliers destination)
- Stacked cylinders / database (The Bank destination)
- Trash can (Waste destination)
- Camera (Scan an invoice quick action — photo camera body+lens, not generic scanner)
- Phone outline (device hint pill)

---

## 13. Architectural patterns

### From v6

- Sous chef intelligence at the top of surfaces (interpretation above data)
- Empty state as section absent
- Live indicator for real-time surfaces

### [v7] New patterns

- **Looking Ahead as required surface section** (§5)
- **Hub-with-destinations** for multi-page consolidation (§6)
- **Working/Celebrating severity** for system-intelligence visibility (§4)
- **Device-aware quick actions** (§7)
- **Day-not-time** for forecasted scheduling (§9)

---

## 14. Voice and content patterns

Unchanged from v6 (casual supplier names, menu order discipline, italic-gold for the noun that matters, voice has product capabilities).

### [v7] Voice for Looking Ahead

- Informative not alarmist
- Always actionable ("worth stocking", "worth clearing space")
- Grounded — never "the AI thinks", always "the system noticed X"
- Mode-shifted same as attention cards

### [v7] Voice for Working/Celebrating

- Dry-warm, observational
- Describes what happened in plain terms ("11 prices updated automatically this week")
- Never bragging, never sycophantic

---

## 15. Surface-specific notes pattern

Each locked surface gets a per-surface design note. Format mirrors `surface-chef-margins.md` and `surface-chef-stock-suppliers.md`.

Captured surface notes to date:
- `surface-chef-home.md` (still to write up from v5 mockup)
- `surface-chef-margins.md` (v6 era — still current)
- `surface-chef-stock-suppliers.md` (new with this design system version)

---

## 16. Quick reference

```css
/* Five colours that do 80% of the work */
--paper:   #F8F4ED;
--ink:     #1A1612;
--gold:    #B8923C;
--muted:   #7A6F5E;
--rule:    rgba(26,22,18,0.08);

/* Three fonts */
'Cormorant Garamond' — content
'Cinzel' — structure (ALWAYS uppercase + letter-spaced)
'Jost' — micro-UI

/* Four spacings */
10px 24px;    /* nav item */
22px 28px;    /* card */
48px 56px;    /* page */
margin-bottom: 48px;  /* section */

/* Two transitions */
all 0.15s;        /* hover */
0.25s ease;       /* structural */
```

That's v7. Build to it.
