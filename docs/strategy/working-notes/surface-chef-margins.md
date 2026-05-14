# Surface design note — chef Margins

*Locked 2026-05-14 after v1 → v3 iteration. Reference mockup: `chef-margins-mockup-v3.html`.*

This is the per-surface companion to `design-system-v6.md`. The design system covers patterns that repeat across the product. This document covers what's specific to chef Margins: the time window selector, the attention card structure, the section summary, the dish detail rows, copy decisions, and the underlying data model implications.

---

## Purpose of the surface

**Chef Margins answers one question:** *how is my menu performing?*

Not finance reporting. Not menu engineering (that's manager shell). Not detailed cost analysis (that's Costing). Operational diagnostic: which dishes are healthy, which are slipping, which are exposed, what should the chef do today.

The chef opens Margins when they want to know if their menu is in good shape — usually weekly, sometimes daily after a flagged alert in the morning brief drops them here.

---

## Page structure

Three-layer sous chef pattern (per design system §10):

1. **Headline overview** — page header + time window selector + four KPIs across the menu
2. **Attention cards** — the dishes that need attention, sous chef voice
3. **Menu section summary + per-dish detail** — full menu in menu order, drill-down available

---

## Layer 1 — Headline and time window

### Page title
*"Margins — how your menu is doing"*

Cormorant 400 48px, *Margins* in italic gold. Subtitle reflects state — neutral-warm when flagged content exists ("Two dishes need sorting. Everything else is in good shape."), drier when everything's healthy.

### Time window selector — *the key interactive element on this surface*

A card top-right of the page header containing:
- "COMPARING" label
- Pills: `7 D` / `7 D vs 7 D` / `Month vs Last` / `Quarter` / `YTD`
- Explicit date range echo below in italic ("8 May – 14 May vs 1 May – 7 May")

Default: 7 D vs 7 D. Persisted per user. **Selection drives every number and trend on the page.**

#### What the time window options mean

- **7 D** — last 7 days as a single window. Show current state, no comparison. Trend arrows hidden or flat.
- **7 D vs 7 D** (default) — last 7 days compared to prior 7 days. Best default for catching recent drift.
- **Month vs Last** — current month-to-date vs last month same period
- **Quarter** — current quarter vs prior quarter
- **YTD** — year-to-date vs prior year YTD

#### Architectural implication

For any of this to work, the system needs **daily GP snapshots stored per dish**. Without that, "7 days vs prior 7 days" can't be reconstructed. This is part of foundation infrastructure — `dish_margin_snapshots` table or similar, written daily by a cron job that computes current cost-from-current-Bank-prices, current sale price, GP, and saves per dish.

Without this snapshot data: the time window selector is the UI; the historic comparison is the backend; both ship together.

---

## Layer 2 — Headline KPI row

Four KPIs across the menu, in this order:

1. **Menu GP** — overall blended GP across all dishes, with movement from prior period
2. **Dishes Healthy** — count of dishes meeting their GP target ("15 / 17")
3. **Needs Attention** — count of flagged dishes, with a note about which section
4. **Worst Drift** — biggest single-dish point drop, named

Each is a KPI card per design system §6. Values can be coloured (healthy / attention / urgent / gold) to reinforce status at a glance.

---

## Layer 3 — Attention cards

The diagnostic. Two columns. One card per flagged dish. Severity-ordered: Urgent first, then Watch.

### Card structure

```
[severity bar — 3px coloured]
[section label]                 [severity label]
[Dish title with italic-gold emphasis on dish name]
[━ rule ━]
[GP big serif] [Movement label + value]
[━ rule ━]
[Cause sentence — italic Cormorant, **bold** the diagnostic]
[━ rule ━]
[Action link →]                 [Last-costed metadata]
```

### Voice rules

**Always serious in attention cards.** Never funny in this surface area. Examples:

- Urgent: *"Your lamb shawarma's hurting you."* / *"Your hummus has gone sideways."*
- Watch: *"The burger's drifting on you."* / *"Tabbouleh's slipping a bit."*

The cause sentence is always concrete, with the supplier on casual name and a specific number:
> *"Aubrey hit you with £14.20/kg on lamb shoulder Tuesday — up from £12.70. You costed it at £11.50. Every plate's down £1.85."*

### Action

Always *"Sort the dish →"* (informal). Clicking takes the chef to that dish's Costing entry to investigate or re-cost.

### Severity rules

- **Urgent** — GP drop ≥ 4 points in the comparison window, OR GP has fallen below target, OR a single ingredient price spike ≥ 10%. Red-brown severity bar.
- **Watch** — GP drop 1-3 points over comparison window with sustained pattern (3+ weeks). Amber bar.
- **Healthy** — anything not flagged.

These thresholds are **preferences** (per the preferences system). Default values above; chef can tune.

---

## Layer 4 — Menu section summary

Six-card horizontal grid showing per-section performance:

- Starters
- Mains
- Grill
- Sides
- Desserts
- Drinks *(if tracked; "list only" if not)*

**Menu order, left to right.** Flagged section (currently Mains in the mockup) gets gold-bg "active" tint to draw the eye but stays in menu position.

Each card shows:
- Section name (gold Cinzel caps)
- Section average GP (coloured by status)
- Dish count
- Flag summary ("all behaving" / "2 flagged" / "steady as ever")

Click a section card to jump to that section in the detail below. *(Behaviour: smooth-scroll, not navigate.)*

### Voice rules — dry warmth allowed here for healthy sections

The flag summary line gets dry warmth when the section is healthy:
- *"all behaving"*
- *"steady as ever"*
- *"pulling weight"*
- *"all good"*

Flagged sections stay factual:
- *"2 flagged"*
- *"1 urgent"*

---

## Layer 5 — All Dishes detail

Full menu in menu order: Starters → Mains → Grill → Sides → Desserts. Each section has its own header row + table.

### Section header

```
[Section name — Cinzel caps gold]            [Summary — italic Cormorant]
```

Summary line is dry-warm when healthy, factual when flagged. Examples:
- *"4 dishes · avg GP 72% · two soft drifts on tahini, rest behaving"*
- *"5 dishes · avg GP 63% · 2 flagged · 3 holding"*
- *"6 dishes · avg GP 76% · making good money, all six"*
- *"3 dishes · avg GP 70% · sweet end to the menu"*

### Dish row

Six columns:

1. **Dish name** — Cormorant 500 17px
2. **GP %** — Cormorant 600 20px, coloured by status (healthy / attention / urgent), right-aligned
3. **vs comparison window** — arrow + delta, matching colour
4. **Plate price** — Cormorant 500 15px ink-soft, right-aligned
5. **Exposed To** — Jost 12px muted, with **strong** for the exposure cause. Conversational allowed: *"Chicken doing what chicken does"*, *"same story as the hummus"*, *"Best margin on the menu"*
6. **Chevron** — muted-soft, goes gold on hover

Row hover: warm-card background tint. Click: drill into that dish's Costing entry.

### Voice rule for exposure column

Dry warmth allowed for healthy and stable dishes. Stays factual when the dish is flagged.

When the system can cross-reference (e.g. baba ghanoush has same root cause as hummus above it), it should: *"same story as the hummus"*. This requires the margin leakage engine to know shared root causes, not just per-dish drift.

---

## Settings / preferences this surface depends on

Multiple things on this surface come from the preferences system:

- **Default time window** (e.g. "Always open Margins on 7 D vs 7 D")
- **GP targets** — overall and per-section (default 65%, customisable per kitchen)
- **Severity thresholds** — what counts as Urgent vs Watch (point drops, percentage)
- **Section taxonomy** — which menu sections this kitchen has (default Starters/Mains/Grill/Sides/Desserts; customisable)
- **Whether to track Drinks** — most kitchens won't bother in v1

---

## What's deliberately not on this surface (in v1)

- **Menu engineering** (stars / plowhorses / puzzles / dogs) — manager shell future build, dependent on POS sales data
- **Sales volume per dish** — no POS integration in v1, so can't show "what's selling"
- **Cost component breakdown** (which ingredient contributes how much per dish) — lives in the Costing surface, not Margins. Drill-down to Costing from a flagged dish.
- **Multi-site comparison** — owner shell, not chef
- **Year-on-year trends** — needs more historical data than v1 will have
- **Forecasting** — needs POS data; v1.1+

---

## Build sequencing for this surface

In rough order of dependency:

1. **`dish_margin_snapshots` schema + daily writer job** (foundation work — without this, no time-window comparisons)
2. **Time window selector component** (reusable across analytics surfaces)
3. **KPI overview row** (simplest)
4. **Per-dish detail table** (read from snapshots, group by menu section)
5. **Menu section summary** (aggregation of per-dish data)
6. **Margin leakage detection engine** (the intelligence that powers attention cards — biggest single build, see master-shared-infrastructure)
7. **Attention card UI** (consumes leakage detection output)
8. **Cross-dish root cause referencing** (the *"same story as the hummus"* feature — depends on detection engine being sophisticated enough)
9. **Voice copy library** (mode-shifted, parameterised for dynamic copy)

Items 1-7 are v1. Items 8-9 are nice-to-have for v1, definite for v1.1.

---

## Open questions for future iteration

- **How does Margins behave when the chef has just signed up and has no historical data?** Probably needs a "still learning your menu" empty state for the first few weeks until snapshots accumulate.
- **What about menu changes?** When a dish is added or removed mid-comparison-window, how is GP averaged? Probably: pro-rate by days-on-menu. Worth deciding before build.
- **Mobile responsiveness?** Margins is dense — works on tablet, harder on phone. Phone view probably collapses the section summary row to a horizontal scroll and the dish rows to a compact card per dish.
- **Notification preferences for Margins alerts?** Already established that the Inbox is push-driven. Margins-specific quiet hours, severity thresholds for push notifications, channels (push/email/SMS) per severity — all live in the preferences system. Worth a separate spec.

---

## What this document is and isn't

**Is:** the canonical reference for what chef Margins is, how it behaves, what feeds it, what voice it speaks, and how it should be built.

**Isn't:** the implementation spec in code, the visual design tokens (those live in design-system-v6.md), the underlying margin leakage detection algorithm (lives in master-shared-infrastructure.md).

Read together with `design-system-v6.md` and `chef-margins-mockup-v3.html`, this is the complete specification for the surface.
