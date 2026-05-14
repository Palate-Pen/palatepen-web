# Costing → Margins rename — recon report

> Historical working note captured 2026-05-14 to support the shape decision. Line references to other docs are accurate as of this date and not maintained — see live docs for current state.

**Date:** 2026-05-14
**Status:** Recon complete. Shape decision pending. No code changes made.
**Picking up tomorrow.**

This is a working note, not a strategy doc. It captures the state of investigation so the next session can resume without re-running the codebase grep.

---

## Background

The strategy docs (`docs/strategy/role-aware-surfaces.md`, plus the CLAUDE.md *Strategic Direction* addendum) establish **Margins** as a top-level analytical surface — recipe cost simulator, ingredient benchmarking, GP trends, supplier price tracking, and (soon) margin leakage alerts. **Recipes** stays for authoring. Two surfaces, linked but distinct mental modes.

Question: is the rename mechanical, or does it require restructuring?

**Answer: restructuring.** Current `CostingView` is an authoring surface (build/edit/save a costing for a dish, manage saved history, link to recipes). The analytical content the strategy describes for "Margins" lives elsewhere — in `ReportsView` and as a modal inside `RecipesView`. So renaming Costing → Margins without moving content would mislead users; the tab labelled "Margins" would not contain margin analytics.

---

## Evidence scope

348 case-insensitive matches for `costing` across 43 files. Zero matches in `supabase/migrations/`, `next.config.js`, `package.json`, or any other config file.

---

## 1. ROUTES

**No `/costing` Next.js route exists at the filesystem level.** The Costing UI is rendered inside the in-app SPA, keyed by tab state `'costing'`, dispatched from `src/app/app/page.tsx:134`.

**API routes (public, Kitchen/Group tier):**
- `src/app/api/v1/costings/route.ts` — `GET /api/v1/costings` (list)
- `src/app/api/v1/costings/[id]/route.ts` — `GET /api/v1/costings/{id}` (single, line 12 returns `{ error: 'Costing not found' }`)

Other API files only reference costings as a join result (`/api/v1/recipes/[id]/route.ts:14-47`, `/api/v1/menus/[id]/route.ts:17-28`) or as a count (`/api/v1/me/route.ts:25`, `/api/invites/[token]/route.ts:63`).

---

## 2. COMPONENT FILES

- `src/app/app/components/CostingView.tsx` — the only filename containing "Costing"

---

## 3. UI LABELS (user-facing strings)

### Navigation chrome
- `Sidebar.tsx:30` — `{ id: 'costing', label: 'Costing', icon: '£' }`
- `app/page.tsx:160` — `{ id: 'costing', label: 'Costing', icon: <IconCalc /> }` (mobile bottom-bar)

### CostingView page (`CostingView.tsx`)
- L119 — `<h1>Costing</h1>`
- L120 — "Editing saved costing"
- L124 — Button: "Save Costing" / "Update"
- L258, L326 — Empty state: "No saved costings yet"

### Recipe detail Costing panel (`RecipesView.tsx`)
- L920, L1176 — Heading: "Costing"
- L1187 — "Remove link"
- L1192 — Button: "+ Assign Costing" / "Change" / "Cancel"
- L1199 — Label: "Linked costing:"
- L1210 — Option: "— No costing linked —"
- L1288 — "No ingredients in this costing yet — add one below."
- L1315, L1452 — Warning: "⚠ Already in this costing"
- L1368-1369 — "No costing linked to this recipe." / "Link a saved costing above, or build one here without leaving the recipe."
- L1373 — Button: "+ Add costing for this dish"
- L1392 — Inline builder heading: `Build a costing for "{title}"`
- L1468 — "No bank match — saves as new on costing save"
- L1527 — "Saves to your costing history and links to this recipe."
- L1534 — Button: "Save Costing" / "Saving…"
- L1637 — "No costing linked — Bank auto-detection is inactive."
- L1846 — "If you change this recipe's costing, re-open these dishes in the Costing tab…"
- L1925 — "from linked costing"
- L1926 — "PPDS food must show every ingredient. Import the recipe or link a costing."
- L1933 — "Allergens cannot be computed without a linked costing"
- L2306 — "This costing has no ingredients to adjust." (cost simulator empty state)
- L2409 — `title="Scan a spec sheet with AI to import recipe + costing in one shot"`
- L2615 — "AI reads a printed spec sheet and creates the recipe + costing in one shot"
- L2682 — Section label: "Costing preview"
- L2708 — "Save creates a recipe + costing pair…"
- L2728 — Button: "Save Recipe + Costing"

### DashboardView
- L122 — Tile: `{ id: 'costing', icon: '£', title: 'Costing', subtitle: 'Avg X% GP' or 'No costings yet' }`

### ReportsView
- L355 — Tile sub: `'no costings yet'`
- L369 — `<Empty text="No costings yet" />`
- L904 — "No costings in this range."

### SettingsView (CSV import/export + API docs section)
- L448 — Quick-start tip: "Scan a spec sheet from the Recipes tab to create recipe + costing in one shot."
- L550 — "A read-only public API for pulling your recipes, costings, stock and menus…"
- L595-597 — API endpoint descriptions: "One recipe + linked costing", "List all costings", "One costing with ingredients"
- L634 — Export button: `{label:'Costings', count, run: exportCostingsCsv}`
- L656 — Template download: `{key:'costings', label:'Costings'}`
- L698 — Import preview: "About to import N costing(s)"
- L733 — "Recipes and costings stay shared across the account."
- L802 — Delete confirm: "all your recipes, costings, stock, invoices and menus"

### QuickStartGuide (in-app onboarding)
- L47, L49 — "fill in ingredients in the costing panel" / "AI extracts the recipe AND costing in one shot"
- L51 — "Edit ingredients inline — changes save into the linked costing"
- L59-74 — **Whole section** with `id: 'costing'`, title **"Costing & GP"**, CTA "Open Costing", goto target `'costing'`
- L72 — Tip: "When you save a costing, every named ingredient is added to your Bank automatically…"
- L102, L104 — Bank section: "Every ingredient you add through a recipe or costing…", "recipes inherit them from the linked costing"
- L154 — Data section: "download Recipes / Costings / Stock as CSVs"
- L160 — "For costings, the Ingredients column expects format…"
- L175 — "flags duplicates as you type in costing rows"

### MyTeamView (team contribution tracking)
- L320 — Activity type label: `'Costing'`
- L379 — Stat tile: `<Stat label="Costings" value={counts.costings} />`

### Admin page
- L282 — Sort option type
- L780 — `<option value="costings">Most costings</option>`
- L732 — CSV header: `'Costings'`
- L896 — User detail tile: `{ label: 'Costings', value: ... }`
- L1030 — Seed summary text: `N costings`
- L2147 — Feature flag description: "Spec sheet → recipe + costing in one shot"

### Marketing surfaces (public, pre-auth)
- `PalatablePromo.tsx:7` — Autoplay slide: `{ id: 'costing', label: 'Feature 02', headline: ['Know your numbers.', 'Instantly.'], desc: 'Build dish costings ingredient by ingredient. See GP %…' }`
- `PalatablePromo.tsx:85` — "Recipes · Costing · Invoices · Stock"
- `PalatablePromo.tsx:118` — `<MacBar label="Costing" />`
- `AuthPage.tsx:30` — `{ icon: '£', title: 'GP Costing', desc: 'Ingredient-level costs with target GP analysis.' }`
- `AuthPage.tsx:101` — "Recipes, costing, AI invoice scanning and stock control"
- `palatable/page.tsx:133` — Free tier feature: "Basic costing"
- `UpgradeModal.tsx:34` — Free tier feature: "Basic costing"
- `app/layout.tsx:8` — Site metadata description: "Back office work you can stomach. Recipes, costing, invoices and stock…"

### Other UI strings
- `ProfileView.tsx:46` — "Average GP across saved costings"
- `MaintenanceGate.tsx:87` — "Your recipes, costings and stock counts are exactly where you left them."
- `BankView.tsx:264` — "Existing costings keep their copy of the data."
- `AddOutletModal.tsx:57` — "Recipes and costings stay shared across the account."
- `invite/[token]/page.tsx:167` — "${c.costings} costing(s)" (data-driven invite preview)
- `blog/gp-margins-explained/page.tsx:50` — *verb* "the steak is costing them money" — NOT a system reference; ignore

---

## 4. EDITING KEYS

**Documentation-only — no code reads these.** Found only in `CLAUDE.md`:
- L55 — `| \`COST\` | Costing |` (top-level sidebar nav key in master table)
- L155 — `| \`REC.detail.cost\` | Linked costing panel |` (REC namespace, not COST — this is the costing panel inside a recipe detail)
- L176 — `### Costing · \`COST\`` (section header)
- L180 — `| \`COST.builder\` | Main costing builder (default) |`
- L181 — `| \`COST.history\` | Saved costings list |`

No grep hits for `COST.` in any `.ts`/`.tsx` file. These are shared shorthand for human-to-human pointing.

---

## 5. INTERNAL CODE (not user-visible)

### Type and interface names
- `ShowcaseCosting` interface (`seedShowcase/recipes.ts:450`)
- `Dish` and `EngDish` types with `costing: any` fields (`MenuBuilderView.tsx:85, 107`, `MenuDesigner.tsx`)

### Function names
- `recipeCosting`, `saveCosting`, `getLinkedCosting`, `assignCosting`, `removeCosting`, `openInlineCosting`, `saveInlineCosting` (RecipesView)
- `getCosting` (MenuBuilderView, MenuDesigner)
- `buildCosting`, `buildShowcaseRecipesAndCostings` (seedShowcase/recipes.ts)
- `exportCostingsCsv`, `downloadCostingsTemplate`, `rowsToCostings` (lib/csv.ts)

### Constants and field names
- `COSTING_HEADERS` constant (`lib/csv.ts:123`)
- `linkedCostingId` — recipe-side foreign reference; **stored in user data, persisted in `user_data.gp_history`**. Referenced in: RecipesView, MenuBuilderView, MenuDesigner, CostingView, csv.ts, api/v1/recipes, api/v1/menus, m/[slug], DashboardView, seedShowcase/recipes.ts
- `costingId` local variables (RecipesView:606, 628)
- `editCostingIngs`, `setEditCostingIngs`, `showInlineCosting`, `setShowInlineCosting`, `assigningCosting`, `setAssigningCosting` (RecipesView component state)
- `recostings` field on `RecipeSpec` (seedShowcase/recipes.ts:35) — array of historical re-costs for GP trend seeding
- `latestCosting`, `baseCosting` (seedShowcase/recipes.ts:508-518)
- `costing` and `costed` (loop/local vars in many files)

### Tier-flag feature keys (`src/lib/tierGate.ts:20-24` + `docs/TIER_SCHEMA.md:146-150`)
- `costing_full`
- `costing_ingredients_bank`
- `costing_menu_builder`
- `costing_menu_engineering`
- `costing_price_benchmarking`

### Internal tab identifier
- String `'costing'` (lowercase) used as tab/section id in: `app/page.tsx`, `Sidebar.tsx`, `DashboardView.tsx`, `QuickStartGuide.tsx` (`goto: 'costing'`), `PalatablePromo.tsx`, `icons/PalatableIcons.tsx:11,85`

### Component name
- `CostingView` (imported in `app/page.tsx:13`)

### Permissions copy
- `lib/perms.ts:7` — comment: `canEditPricing: boolean; // manager+ — costing sheets, bank unit prices, GP target`

### Storage shape (notable!)
Saved costings are persisted in `user_data.gp_history` (jsonb array), **not in a field called `costings`**. The word `costings` is used everywhere user-facing, but the column is `gp_history`. So no DB migration is needed for a rename; the persistence shape is already abstracted.

---

## 6. DATABASE

**Zero matches** in `supabase/migrations/*.sql`. Costings live in `user_data.gp_history` (jsonb array on the existing user_data row) — no dedicated table, no enum, no column named `costing*`.

---

## 7. COMMENTS / DOCS

### Code comments (selected — pervasive in the recipe/menu/seed files)
- `RecipesView.tsx` carries ~20 explanatory comments about "the linked costing", "inline costing builder", "edit-mode costing-ingredient buffer", etc.
- `MenuBuilderView.tsx`, `MenuDesigner.tsx`, `CostingView.tsx`, `lib/csv.ts`, `lib/seedShowcase/recipes.ts`, `lib/seedShowcase/bank.ts`, `api/v1/recipes/[id]/route.ts`, `api/admin/db-stats/route.ts`, `api/admin/seed-showcase/route.ts` all use "costing" in domain-level comments.

### CLAUDE.md
~30 references including: roadmap items (`[x] GP costing calculator`, `[x] Remove business min GP bar from CostingView`, `[x] "Add costing now" button on recipe detail`, `[x] Recipe cost simulator`, `[x] CSV export of all recipes, costings and stock`, `[x] API access … /costings, /costings/{id}`), Progress Log entries detailing CostingView/costing builder/inline costing work, and the editing-key table.

### Strategy docs (just merged, PR #52)
- `docs/strategy/palatable-way.md:9` — "Tired of costing every dish on a calculator" (verb, scene-setting)
- `docs/strategy/palatable-way.md:56` — "**Costing maintains itself.**"
- `docs/strategy/role-aware-surfaces.md:26` — Chef-surface available items: "Recipe library, costings, menus, spec sheets…"
- `docs/strategy/role-aware-surfaces.md:55` — Manager surface: "Recipe and costing depth"
- `docs/strategy/pre-launch-build-sequence.md:16` — **"Costing tab decision. Do not kill it — reframe it as part of the chef surface and confirm it's not duplicated elsewhere."**
- `docs/strategy/pre-launch-build-sequence.md:145` — v1 wedge: "Costing that maintains itself forever"
- `CLAUDE.md:542` (Strategic Direction addendum) — v1 wedge bullet: "Auto-maintained costing"
- `docs/TIER_SCHEMA.md:146-150` — 5 `costing_*` feature-flag keys

### Other
- `blog/gp-margins-explained/page.tsx` — the blog title already uses **"margins"** (rename-friendly)

---

## 8. CONFIG

**Zero matches** in `next.config.js`, `package.json`, `tsconfig.json`, `vercel.json`, `tailwind.config.js`, `postcss.config.js`, `.env*`. The `/mise` legacy redirects in `next.config.js` don't touch costing.

---

# Ambiguities — decisions needed before any rename

## A. The big one: what is "Margins" actually replacing?

Per the brief, Margins is "the analytical surface — recipe cost simulator, ingredient benchmarking, GP trends, supplier price tracking, margin leakage alerts." But the **current `CostingView` is NOT analytical** — it's a costing **editor** (build/edit/save a costing for a dish, manage saved history, link to recipes). The analytical content described currently lives in **ReportsView** (GP trend section, benchmarking section, supplier performance) and as a modal **inside RecipesView** (the recipe Cost Simulator).

The pre-launch build sequence explicitly says: *"Costing tab decision. Do not kill it — reframe it as part of the chef surface."*

So three possible shapes — pick one before any code moves:

| Shape | What changes in nav | Where Costing editor lives | Where Margins lives |
|---|---|---|---|
| **(a) Margins = renamed Costing tab** | "Costing" sidebar item → "Margins" | Same place, same component, just relabelled | Same component (but contents wrong for the name — would mislead users until rebuilt) |
| **(b) Costing stays + add new Margins tab** | Costing stays. New "Margins" item added to sidebar | Unchanged | New top-level surface, takes over ReportsView's GP/benchmark/supplier sections |
| **(c) Costing folded into Recipes; new Margins tab replaces Costing slot** | "Costing" removed; "Margins" takes its slot | Inline builder inside recipe detail (already exists at `RecipesView.tsx:1379-1542`) becomes the only path | New analytical surface in the slot |

Shape (a) is misleading. Shape (c) contradicts the build-sequence doc. **Shape (b) matches the strategic intent** and is the recommendation — but the call is Jack's before any scoping.

## B. Treat-as-untouchable (would be breaking changes)

Do NOT touch these without a separate, explicit decision:

1. **`user_data.gp_history` storage shape** — the persistent jsonb array name. No DB migration needed for a rename of the surface; this is fine to leave.
2. **`linkedCostingId` field on recipe objects** — also persisted in jsonb. Renaming would require a data migration touching every existing recipe row. Probably worth keeping as-is even if the UI says "Margins".
3. **API v1 routes `/api/v1/costings` and `/api/v1/costings/{id}`** — public, documented in SettingsView's API panel, third-party scripts may consume. Rename would be a breaking change; if needed, add `/api/v1/margins` aliases with both alive during a deprecation window.
4. **CSV export filename `palatable-costings-{date}.csv` + CSV headers (`Linked Costing ID`, `Costings`)** — anyone scripting against exports breaks. Could rename in a future version with a note in QuickStartGuide.

## C. Strategy docs need a downstream pass

If a Margins surface ships, four docs need updates beyond the rename itself:

- `docs/strategy/pre-launch-build-sequence.md` — the "Costing tab decision" bullet at line 16 has to be updated/extended to reflect the new shape (the "do not kill it" reasoning was about leaving costing entry alive, not about leaving the tab branded "Costing")
- `docs/strategy/role-aware-surfaces.md` — chef/manager bullet lists mention "costings" but should they say "margins" or stay as "costings" since chefs still build them? Probably stay — chefs author costings, owners see margins. Worth flagging.
- `CLAUDE.md` — editing-key vocab (lines 55, 176, 180-181) needs MARGIN.* entries if going shape (b); COST.* may stay or get retired
- `CLAUDE.md` Roadmap and v1 wedge — "Auto-maintained costing" wording is fine, that's a feature description not a tab name

## D. The five `costing_*` feature-flag keys (`tierGate.ts`)

These are documentation-style flag keys gating Pro features. They describe capabilities (`costing_menu_builder`, `costing_price_benchmarking`) rather than tab names. **Read:** keep them as-is — they're flag identifiers, not labels — but consider whether `costing_price_benchmarking` should be renamed to `margins_price_benchmarking` if benchmarking moves out of "Costing" into "Margins". Flag-key renames typically need a migration of the `featureFlags` and `featureOverrides` jsonb where toggled overrides are stored.

## E. The "GP Costing" landing-page card (`AuthPage.tsx:30`)

Marketing-facing. Reads "GP Costing" with subtitle "Ingredient-level costs with target GP analysis." If Margins is the wedge, this card probably becomes "Margin Intelligence" or similar — different copy, different positioning. **Out of scope for a mechanical rename**; a copy rewrite is its own task.

## F. The blog post `/blog/gp-margins-explained`

Already uses "margins" in URL and content. Good signal — rename-friendly. No change needed.

## G. The `Quick Start Guide` "Costing & GP" section

If shape (b), this section stays as "Costing & GP" because it's teaching authoring (build a costing). A separate Margins section may need adding for the new analytical surface. Decide once shape is picked.

---

# Recommendation (Jack to push back on)

1. **Pick shape (b)** — Costing tab stays as the editing/authoring surface (renamed to **"Cost a Dish"** or similar to clarify intent, or just leave as "Costing"); add a new **Margins** top-level sidebar item that hosts the analytical content currently dispersed across ReportsView and the Cost Simulator modal.
2. **First PR (mechanical):** rename in NEW or EXTENDED places only — add the "Margins" sidebar slot wired to a placeholder MarginsView, add MARGIN.* editing keys to CLAUDE.md, update strategy docs to describe the two-surface split. Don't yet move analytical content out of ReportsView.
3. **Second PR (move):** migrate GP-trend / benchmarking / supplier-performance sections from ReportsView into MarginsView. ReportsView shrinks to waste + stock-value + menu-engineering rollup (operational reporting, not margin intelligence).
4. **Leave alone (no PR yet):** persistence shape, API routes, CSV format, marketing pages. These are downstream once the in-app surface stabilises.

Awaiting Jack's call on shape + scope before any edits in the next session.
