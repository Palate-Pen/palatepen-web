# Palatable design system — v6

*Supersedes v5. Captured 2026-05-14 after chef Margins design work.*

Reference mockups:
- `chef-home-mockup-v5.html` (the original v5 baseline)
- `chef-margins-mockup-v3.html` (Margins surface, mode-shifted voice)

This is the visual canon for the Palatable customer product. Every customer-facing surface builds to this system. The admin product already lives in this register.

This document keeps the structure of v5 and adds what's been learned. New material is flagged `[v6]` for ease of comparison.

---

## 1. Brand identity

Palatable shares its visual identity with Palate & Pen. One brand, two products. Same typography, same colour palette, same compositional discipline.

**The aesthetic in one line:** editorial-magazine, not SaaS-dashboard. Cormorant Garamond elegance paired with Cinzel small-caps structure. Cream paper, deep ink, gold accents. Calm whitespace. Restrained motion. *Tidy station = tidy mind = clean good food.*

---

## 2. Colour tokens

Light mode is the default. Dark mode is a user preference (preferences system, separate spec).

### Surfaces
- `--paper: #F8F4ED` — main background
- `--paper-warm: #F2EDE0` — sidebar background
- `--card: #FFFFFF` — card surfaces
- `--card-warm: #FDFAF2` — secondary card / hover

### Text
- `--ink: #1A1612` — primary text
- `--ink-soft: #3D362C` — secondary text
- `--muted: #7A6F5E` — tertiary text
- `--muted-soft: #A99B85` — faint text

### Gold (brand)
- `--gold: #B8923C` — primary brand gold
- `--gold-light: #C9A84C` — gradient companion
- `--gold-dark: #8B6914` — emphasis numbers, hover
- `--gold-bg: rgba(201,168,76,0.06)` — tinted backgrounds

### Rules
- `--rule: rgba(26,22,18,0.08)` — primary rules
- `--rule-soft: rgba(26,22,18,0.04)` — inner dividers
- `--rule-gold: rgba(201,168,76,0.25)` — hover borders

### Status / semantic
- `--attention: #B86A2E` — warm amber, Watch severity
- `--urgent: #A14424` — warm red-brown, Urgent severity
- `--healthy: #5D7F4F` — soft green, healthy status
- `--info: #B8923C` — informational (matches gold)

**Warm, earthy variants — not saturated SaaS red/amber/green.** Status colours sit *inside* the brand palette rather than fighting it.

---

## 3. Typography

Three families, each with a specific role.

### Cormorant Garamond — content type
Greetings, page titles, alert titles, dish names, supplier names, KPI values, user names, nav labels, quick action labels.

Weights:
- 400 — display (52px greeting)
- 500 — most content (default)
- 600 — emphasis (user names, week-body, italic-gold)

### Cinzel — structural type
**Always uppercase. Always letter-spaced (0.3em – 0.5em).** Section eyebrows, panel titles, KPI labels, alert types, breadcrumbs, status labels, tooltips.

Weights: 500 (light structural), 600 (default), 700 (rare emphasis).

### Jost — UI micro-type
Body micro-copy, delivery lines, week notes, quick action sub-labels, descriptive small text within cards.

Weights: 300 (light), 400 (default), 500/600 (when needed).

### The italic-gold pattern

Italic Cormorant in gold marks **the noun that matters** in a sentence. *"the **lamb shawarma** GP has dropped to 64%"*, *"Tahini up **18%**"*, *"**New dish** — Saffron-cured trout"*. Use sparingly: one to two per sentence max, otherwise the emphasis stops meaning anything.

---

## 4. [v6] Voice — mode-shifted

The most important architectural pattern that emerged from Margins design. Voice tracks the severity of the content beneath it. The system isn't one tone — it's two tones, shifted by the situation. *This mirrors how kitchens actually communicate.*

### The rule

**Voice tracks severity. The page's most severe content sets the dominant register. Warmth lives in unflagged details, never above flagged ones.**

### The two registers

**Serious / direct (Urgent + Watch states):**
- Short, direct sentences. Kitchen-floor problem-solving.
- No softening, no jokes, no decoration.
- Concrete numbers, named suppliers (casual names), specific causes.
- *"Your lamb shawarma's hurting you. Aubrey hit you with £14.20/kg on lamb shoulder Tuesday."*
- *"The burger's drifting on you. Beef mince up 6% at Aubrey, brioche up 8% at Reza."*

**Dry warmth (Healthy + steady states):**
- Allowed personality. Observational, not performative.
- Brief, in line with the surrounding tone — never overshadows.
- *"steady as ever"*, *"all behaving"*, *"pulling weight"*, *"Chicken doing what chicken does"*, *"Best margin on the menu"*.

### Where each lives

- **Page subtitle, KPI sub-text, section heads** — neutral when flagged content exists, dry-warm when everything's healthy
- **Alert / attention cards** — always serious, even on Watch severity
- **Section summaries (healthy)** — dry-warm welcome
- **Per-row exposure text on healthy dishes** — dry-warm allowed, kept short
- **Section summaries (flagged)** — stay factual, no levity

### What this means architecturally

The sous chef voice has **product capabilities, not just opinions.** When the system writes *"same story as the hummus"* in the baba ghanoush row, it's because the margin leakage detection engine *knows* both dishes share a root cause (tahini supplier price spike). The voice can call this out because the data backs it. Voice is downstream of intelligence, not separate from it.

This means voice is something we tune and test as the intelligence engine grows. Early version: surface the cause sentence per-card. Mid: cross-reference between cards / rows when shared root causes exist. Later: surface patterns ("Aubrey's the issue this week — three dishes flagged that all source through them").

---

## 5. Layout

### App shell — two columns
```
[sidebar: 252px expanded / 72px collapsed]  [main: flex]
```

### Header row alignment

Sidebar brand row and main top bar are **both exactly 76px tall** (`--header-row-height`). Their bottom rules sit on the same baseline.

### Sidebar collapse

- Expanded: 252px
- Collapsed: 72px
- Toggle: **top-left of the top bar** (not in the sidebar, prevents clipping)
- Transition: 0.25s ease on grid-template-columns
- Brand collapses to "P•" pattern (letter P + small gold dot)
- Auto-collapse below 980px viewport; user preference persists per device

### Page padding
```
.page { padding: 48px 56px 80px; max-width: 1200px; }
```

For surfaces with more content (Margins), max-width extends to 1280px. Adjust per surface.

### Section spacing
```
.section { margin-bottom: 48px; }
.section-head { margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px solid var(--rule); }
```

---

## 6. Components

### Sidebar nav item
```
[2px left border][16px][icon][14px gap][label]                [badge]
```
Active: gold left border + gold-bg tint + gold icon.

### Card
White background, hairline rule border, 22-32px padding. Hover: rule tints gold, background warms, optional 1px lift with soft shadow.

### KPI card
```
[label: Cinzel 600 8px caps]
[value: Cormorant 500 32-36px]   <- can be coloured healthy/attention/urgent/gold
[sub: Cormorant italic 13px]
```

### Alert card / Attention card
Three-zone grid: `[3px severity bar][1fr body][auto action]`.
- Severity bar coloured by severity (urgent/attention/info)
- Body: type label + time, title with italic-gold emphasis, sub-line cause
- Action: Cinzel arrow text bottom-right
- Hover: tints, lifts 1px, shadow softens

### [v6] Attention card extended (Margins variant)
Adds a numbers row between dish title and cause:
```
[GP big serif number] [movement label + value]
```
With border-top + border-bottom rules creating a clean numbers band. GP coloured by severity. This is the "diagnostic" pattern — three things visible at a glance: dish, number, cause.

### [v6] Time window selector
A specific card pattern for pages where comparison period matters (Margins, future analytics surfaces).
```
[label: COMPARING]
[pills: 7D | 7D vs 7D | Month vs Last | Quarter | YTD]
[detail: "8 May – 14 May vs 1 May – 7 May"]
```
Active pill gets gold-fill. The active range echoes below in Cormorant italic so the user sees the explicit dates, not just the relative label.

### [v6] Section summary row
Six-card horizontal grid (1px gap on rule background) showing per-section performance summary. Each card:
```
[section name: Cinzel 600 gold caps]
[GP value: Cormorant 500 26px, coloured by status]
[detail: italic 12px count]
[flags: dot + label, "all behaving" / "2 flagged"]
```
Flagged section gets gold-bg tint (the "active" state) but stays in menu position — does not get promoted out of order.

### [v6] Per-dish row
Six-column grid for menu detail:
```
[Dish name][GP%][vs 7D trend][Plate Price][Exposed To][chevron]
```
- Dish: Cormorant 500 17px
- GP: Cormorant 600 20px, coloured by status
- Trend: arrow + number, matching colour
- Price: ink-soft, right-aligned
- Exposed To: muted Jost with **strong** highlights on the exposure cause
- Chevron: muted-soft, goes gold on row hover
- Row hover: warm-card background tint

### Section head
Always: section title left (Cinzel 600 small caps gold) + section meta right (Cormorant italic muted). Hairline rule below.

### Quick action
Icon-box (36×36 gold-bordered) + label + sub-label. Hover treatment matches cards.

### Buttons
- Primary: solid gold bg, paper-cream text, Cinzel caps
- Secondary: transparent, rule border, ink text, Cinzel caps, gold on hover
- Inline arrow CTAs in cards: no chrome, just Cinzel gold arrow text

### Live indicator
Small green dot pulsing on 2.5s ease, paired with "LIVE" Cinzel caps. Always top-right of top bar for real-time surfaces.

### Tooltip (collapsed sidebar)
Dark ink bg, paper text, Cinzel 600 10px, triangular pointer to the icon. Appears on hover with no delay.

---

## 7. Motion

Restrained. Standard transitions:
- `transition: all 0.15s` — hover changes
- `transition: 0.25s ease` — structural shifts (sidebar collapse)
- `transition: opacity 0.2s` — content fading

Specific animations:
- Live dot pulse: `@keyframes pulse` 2.5s ease-in-out, opacity 1 → 0.35 → 1
- Hover lift on interactive cards: `translateY(-1px)` + soft shadow

What we don't do: bouncy easing, decorative motion, attention-grabbing transitions.

---

## 8. Empty states — the principle

**Pattern A — section absent.** When alerts is empty on chef home, the entire section is removed from the layout. Not present-but-empty.

**Pattern B — orientation content fills the space.** When section-absent isn't an option, show baseline orientation content (deliveries, week ahead, etc).

**Tone for empty / quiet states:** the subtitle adjusts to match (*"a quiet one"*, *"everyone behaving"*). Quiet means the system is working — the page celebrates it, never apologises.

---

## 9. Iconography

Stroked, 1.5 stroke-width, no fills (except small detail dots). Same family across the product.

**Chef shell nav icons:**
- Home: house with chimney
- Recipes: open book
- Costing: price tag with corner cut
- Margins: rising bar chart
- Menus: document with horizontal lines
- Stock & Suppliers: stacked crate
- Notebook: notebook with binding rings
- Inbox: envelope with mail-line

**Utility:**
- Settings: gear (8-tooth)
- Collapse toggle: double chevron (≪/≫)
- Status: dot
- Row chevron: small right-arrow

Never mix outline + filled. Never mix stroke weights within a set. The icon set is part of Palatable's identity.

---

## 10. Architectural patterns (not just visual)

Three patterns from the surfaces designed so far are *architectural*, not just visual.

### The morning brief / sous chef intelligence pattern

At the top of any surface with intelligence to deliver, there's a curated read in attention cards or prose. Below that, the data tables and detail. **Top is interpretation, bottom is fact.** This pattern repeats on chef home (morning brief), Margins (attention cards + section summary + dish detail), and will repeat on future surfaces (Stock & Suppliers, Inbox, Reports, manager and owner home variants).

### The empty state as section-absent

Whenever an alert/intelligence layer has nothing to surface, the section is removed from the layout rather than rendered empty. The day/orientation layer leads.

### The live indicator

Any surface showing real-time data has the "LIVE" indicator with green pulse in the top bar. Lets the user know they're not on stale data. **Implies the system is actively watching on their behalf** — same principle as the sous chef metaphor.

---

## 11. [v6] Voice and content patterns

### Mode-shifted voice (Section 4) — primary new pattern

### Casual supplier names

The system uses casual names (e.g. "Aubrey" instead of "Aubrey Allen Ltd") when speaking conversationally about suppliers. Implementation:

```
suppliers
  legal_name text      -- "Aubrey Allen Ltd"
  casual_name text     -- "Aubrey" (user-set, optional)
```

Falls back to legal name if casual not set. Set on the supplier detail page. Prompt during supplier creation: *"What do you call them in the kitchen?"*

Applies to suppliers in v1. Likely extends to ingredients (e.g. "shoulder" instead of "lamb shoulder cut, bone-in") in future.

### Menu order discipline

Menu surfaces order content the way the menu reads top-to-bottom on the actual menu: Starters → Mains → Grill → Sides → Desserts. *Not* alphabetical. *Not* flagged-first. Menu order respects how chefs think about their food. Flagged sections get visual highlight (gold-bg tint) but don't get promoted out of position.

### Italic-gold for the noun that matters

Reinforced from v5. Used consistently for dish names, key numbers, key actions (*"New dish"*, *"Removing"*). One to two per sentence max.

### Voice has product capabilities

The voice can reference shared root causes ("same story as the hummus") *because the system knows it*. Voice is downstream of the intelligence engine. As detection grows, copy gets richer.

---

## 12. Surface-specific notes pattern

Going forward, every locked surface gets its own design note in `docs/strategy/working-notes/surface-{name}.md` documenting decisions specific to that surface that don't generalise to system level:

- `surface-chef-home.md` (still to write up from v5)
- `surface-chef-margins.md` (writing now alongside this update)
- Future: surface-chef-recipes, surface-chef-costing, surface-chef-stock-suppliers, surface-chef-notebook, surface-chef-inbox, surface-settings, surface-manager-*, surface-owner-*

The design system (this doc) covers patterns that repeat. Surface notes cover specific decisions, copy choices, edge cases. The two together are the spec.

---

## 13. Quick reference

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

That's v6. Build to it.

---

## Appendix — Rationale behind the architectural decisions

*Added after the design system landed, to preserve the reasoning behind decisions that future Claude Code sessions might second-guess. The decisions themselves are documented above; this captures the **why**.*

### Why light mode as default

The admin product was built in light mode and reads cleaner than the dark v1 of chef home. Light cream paper with deep warm ink and gold accents matches the Palate & Pen consultancy proposal — same brand identity across the consultancy and the software. Dark mode lives in user preferences for chefs who work late-night service or want it for environmental reasons, but the default is light because the editorial-magazine register reads more confident there.

### Why mode-shifted voice (Section 4)

Kitchens have two operating modes. Mise en place is banter — chefs joke, prep, take the piss out of each other. Service is intense — short sentences, direct communication, no time for jokes. The system that lives in a chef's pocket should mirror this rhythm. When something's wrong, the sous chef voice gets serious. When everything's holding, it has permission to be dry. Most software has one tone regardless of context. Palatable has two, and the shift is what makes it feel like it understands kitchens rather than just reports on them.

### Why italic-gold for the noun that matters

Consistent with the Palate & Pen consultancy proposal — the brand already does this. Functionally: the reader's eye lands on the meaningful word without having to scan the whole sentence. In *"the **lamb shawarma** GP has dropped to 64%"*, the chef knows the *what* (lamb shawarma) and the *number* (64%) in less than a second of glance. Limited to 1-2 per sentence — overuse kills the emphasis.

### Why Cinzel always uppercase + letter-spaced

Cinzel is a display face that performs at small sizes when given air. Uppercase + 0.3-0.5em letter-spacing gives it the editorial-magazine architectural feel — section labels read like the small-caps headers in a serious magazine, not like generic SaaS UI labels. The discipline is non-negotiable because as soon as Cinzel goes sentence-case or tight, it looks wrong.

### Why casual supplier names

Chefs don't refer to suppliers by legal name. *"Aubrey hit you with £14.20"* is what a chef would say to another chef; *"Aubrey Allen Ltd has increased pricing by 12%"* sounds like a procurement email. The casual_name field is optional, falls back to legal name when unset, and gets prompted during supplier creation with *"what do you call them in the kitchen?"*. Small piece of product, real authenticity payoff.

### Why menu order discipline

Chefs think about their menu in menu order, not alphabetical order. When a chef opens Margins and sees performance grouped by section, they read it the same way a guest reads the menu — top to bottom, Starters → Mains → Grill → Sides → Desserts. Alphabetical would force them to mentally re-order. Flagged sections get visual highlight (gold tint) but don't get promoted out of menu position, because promoting them breaks the chef's mental map.

### Why empty-state-as-section-absent

When the alerts section is rendered as "nothing to flag — all clear" it reads as broken. Either the data hasn't loaded, the system isn't watching, or something's failed silently. Removing the section entirely when there's nothing to flag means the page leads with the day/orientation layer instead — which is meaningful content. The visual rhythm of the page reads as healthy rather than empty.

### Why sidebar collapse via top-bar toggle

The previous approach (collapse button floating on the sidebar edge) clipped against the page boundary. Multiple iterations tried to fix it inside the sidebar. The cleanest solution was to move the toggle out of the sidebar entirely — into the top bar at the top-left, the same place Gmail, Notion, and Linear put their sidebar toggles. Standard pattern, no clipping, always in the same place regardless of state.

### Why surface-specific design notes pattern

The design system covers *patterns that repeat*. Surface-specific decisions (copy choices, edge cases, settings dependencies, build sequencing) don't generalise. Forcing them into the design system would bloat it and make patterns harder to find. The two-document pattern (system + per-surface notes) keeps each scannable and gives surface design its own clear home.

### What this appendix doesn't capture

Micro-tuning decisions — specific colour values, exact font sizes, specific letter-spacing values, individual copy phrases. Those were iterated through chef-home v1→v5 and Margins v1→v3. They're documented in the mockups themselves (which are reference implementations, not just visual examples). Future sessions can iterate further on these without needing the rationale — they're not architectural.
