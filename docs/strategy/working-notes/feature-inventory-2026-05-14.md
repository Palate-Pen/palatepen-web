# Feature inventory — Palatable web app

> Snapshot 2026-05-14. Read-only recon. No code changes. Captured to feed the four-tab chef-surface decision (`docs/strategy/role-aware-surfaces.md`). Built from `src/app/app/page.tsx`, the 14 view components, `src/lib/tierGate.ts`, `src/lib/perms.ts`, `src/lib/featureFlags.ts`, the migrations under `supabase/migrations/`, and the API route tree under `src/app/api/`.

---

## 1. Tab inventory

SPA-style routing: every tab lives behind a single `tab` state key in `src/app/app/page.tsx:39`, switched by `setTab`. Views are mapped in the `views` record at `src/app/app/page.tsx:130-145`. Sidebar nav array at `src/app/app/components/Sidebar.tsx:26-41`. No Next.js routes per tab.

| `tab` id     | Sidebar label | Mobile slot      | View component                                          | Min tier to use the page itself        | Role gate (sidebar filter / in-view guard)                                                                                |
|--------------|---------------|------------------|---------------------------------------------------------|----------------------------------------|---------------------------------------------------------------------------------------------------------------------------|
| `dashboard`  | Dashboard     | Home (primary)   | `src/app/app/components/DashboardView.tsx`              | Free (all)                              | none                                                                                                                      |
| `recipes`    | Recipes       | primary          | `src/app/app/components/RecipesView.tsx`                | Free can view; many features Pro+        | none on the tab; in-view perms gate writes                                                                                |
| `notebook`   | Notebook      | More             | `src/app/app/components/NotebookView.tsx`               | Free can view (`notebook_unlimited` Pro) | none                                                                                                                      |
| `costing`    | Costing       | primary          | `src/app/app/components/CostingView.tsx`                | `costing_full` = Pro                     | save/delete gated to `perms.canEditPricing` (manager+) at `CostingView.tsx:124,296`                                       |
| `menus`      | Menus         | More (gated)     | `src/app/app/components/MenuBuilderView.tsx`            | `menus_builder` = Pro                    | hidden when `menuBuilder` flag off (sidebar filter `Sidebar.tsx:370`, page fallback to Dashboard at `page.tsx:135,140`); edits gated to `perms.canEditMenus` |
| `invoices`   | Invoices      | primary          | `src/app/app/components/InvoicesView.tsx`               | `invoices_view` = Pro                    | Pro pill shown in sidebar (`Sidebar.tsx:43`); scan button gated to `aiInvoiceScan` flag + tier                            |
| `stock`      | Stock         | primary          | `src/app/app/components/StockView.tsx`                  | `stock_view` = Pro                       | Pro-pill                                                                                                                  |
| `suppliers`  | Suppliers     | (not in More)    | `src/app/app/components/SuppliersView.tsx`              | `suppliers_view` = Pro                   | none in-view                                                                                                              |
| `bank`       | Bank          | More             | `src/app/app/components/BankView.tsx`                   | `costing_ingredients_bank` = Pro         | none in-view                                                                                                              |
| `waste`      | Waste         | More (gated)     | `src/app/app/components/WasteView.tsx`                  | `waste_view` = Pro                       | hidden when `wasteTracking` flag off (`Sidebar.tsx:369`, `page.tsx:140`)                                                  |
| `reports`    | Reports       | More             | `src/app/app/components/ReportsView.tsx`                | `reports_view` = Kitchen                 | none in-view                                                                                                              |
| `team`       | My Team       | More (gated)     | `src/app/app/components/MyTeamView.tsx`                 | `team_view` = Kitchen                    | sidebar filter limits to (Owner or Manager) AND tier ∈ {kitchen, group} (`Sidebar.tsx:368`); same check repeated in-view at `MyTeamView.tsx:90-95` |
| `profile`    | Profile       | More             | `src/app/app/components/ProfileView.tsx`                | Free (all)                              | none                                                                                                                      |
| `settings`   | Settings      | More             | `src/app/app/components/SettingsView.tsx`               | Free can view                            | section-by-section gating; Account-name + delete-account gated to owner; outlets section Group/Enterprise only            |

Notes:
- `Sidebar.tsx:38` annotates Team as "owner-only, Kitchen/Group" but the filter at line 368 is actually owner+manager (matches `MyTeamView.tsx:90`).
- The mobile bottom bar has 5 fixed slots (`page.tsx:157-163`). Notebook/Menus/Bank/Waste/Reports/Team/Profile/Settings live behind the "More" sheet (`page.tsx:185-194`). Suppliers does not appear in either mobile surface today — only the desktop sidebar.

---

## 2. Per-tab feature list

For each capability: what the user does, tier requirement (from `FEATURE_MIN_TIER` where applicable), implementing file, data path.

### Dashboard — `DashboardView.tsx`
Plain landing surface, all tiers see it.

| Feature                       | Description                                                            | Tier | File:line                                | Data |
|-------------------------------|------------------------------------------------------------------------|------|------------------------------------------|------|
| Greeting + outlet badge       | "Good morning, Jack — Outlet" on Group/Enterprise multi-outlet         | all  | `DashboardView.tsx:130-156`              | `profile.name`, `useOutlet()` |
| 4 quick stats                 | Recipes, average GP, stock value, price alerts                         | all  | `DashboardView.tsx:175-180`              | `state.recipes/gpHistory/stockItems/priceAlerts`, scoped by outlet |
| Recent price alerts banner    | Up to 5 newest from `priceAlerts`, click → invoices                    | all  | `DashboardView.tsx:182-239`              | `state.priceAlerts` (no outlet scope) |
| Feature grid 4×2              | Jump tiles to Recipes/Notebook/Costing/Menus/Invoices/Stock/Waste/Reports | all  | `DashboardView.tsx:119-128, 241-270`  | counts from each scoped array |
| Recent recipes list           | 5 most recently created                                                 | all  | `DashboardView.tsx:273-299`              | `state.recipes` |
| Stock at/below par            | 6 lowest-stock items                                                    | all  | `DashboardView.tsx:301-329`              | `state.stockItems` |
| "Add your first outlet" banner | Empty-state for Group accounts with 0 outlets                          | Group| `DashboardView.tsx:158-172`              | `useOutlet()` |

### Recipes — `RecipesView.tsx` (largest view, 2864 lines)

| Feature                            | Description                                                                                                       | Tier      | File:line                          | Data |
|------------------------------------|-------------------------------------------------------------------------------------------------------------------|-----------|------------------------------------|------|
| Recipe library grid + search       | Filter recipes by title or category                                                                               | all       | `RecipesView.tsx:379-383, body`   | `state.recipes` |
| Add recipe modal                   | Title + category + notes + optional photo                                                                          | all       | `RecipesView.tsx` (Add modal block) | dispatches `addRecipe` |
| AI URL/file recipe import          | Paste URL or upload file → Claude Sonnet 4.6 extracts title/ingredients/method                                     | Pro       | `recipes_url_import` Pro; flag `aiRecipeImport` `RecipesView.tsx:146` | POST `/api/palatable/import-recipe` |
| AI spec-sheet scan                 | Upload a spec sheet photo, AI extracts recipe + costing fields                                                     | Pro       | `recipes_spec_sheet` Pro; flag `aiSpecSheet` `RecipesView.tsx:147` | POST `/api/palatable/scan-spec-sheet` |
| Recipe photo upload                | Resize to 1600px JPEG, upload to Supabase Storage `recipe-photos/{user_id}/...`                                    | Pro       | `recipes_photo_upload` Pro; `RecipesView.tsx` photo helpers + Supabase Storage migration `006_recipe_photos_bucket.sql` | Supabase Storage bucket `recipe-photos`; URL stored on `recipe.photoUrl` |
| Inline edit recipe                 | Title/category/notes + edit imported ingredient list inline                                                        | all (Chef+) | `RecipesView.tsx:407-460`        | `actions.updRecipe` |
| Inline costing builder             | `+ Add costing for this dish` form embedded in the recipe; creates linked `gpHistory` row                          | all       | `RecipesView.tsx:300-352`         | `actions.addGP` + `actions.updRecipe({linkedCostingId})` |
| Linked costing panel + reassign    | Show linked costing's GP/sell/cost; reassign to another saved costing                                              | all       | `RecipesView.tsx:396-405`         | `state.gpHistory` |
| Recipe cost simulator              | Per-ingredient % adjusters, live GP recompute. Doesn't persist.                                                    | Pro       | `recipes_cost_simulator` Pro; `RecipesView.tsx:174-176 + sim modal` | local state only |
| Allergens (computed + override)    | 14 UK FIR allergens with tri-state None/May/Contains. Bank-matched contains lock the row; user can add manual overrides. Sub-pills for nut/cereal types. | Pro | `recipes_allergens` Pro; `RecipesView.tsx:16-31 + grid` | `recipe.allergens` + computed union from bank |
| Compliance check modal             | Scores against UK FIR + Natasha's Law                                                                              | Pro       | `recipes_allergens` Pro; `RecipesView.tsx` Compliance modal | reads computed allergens |
| Nutrition table + FOP labels       | Big 7 + fibre computed from bank-matched ingredient grams. Front-of-pack traffic lights per 100g.                  | Pro       | `recipes_nutrition` Pro; `RecipesView.tsx:38-72, 85-124` | bank nutrition × grams |
| Printable spec sheet               | A4 overlay with FOP labels, allergens, nutrition. Uses `@media print` to hide app.                                 | Pro       | `recipes_spec_sheet` Pro; `RecipesView.tsx` spec modal | local |
| Recipe lock / unlock               | Lock a recipe — disables edit, delete, costing reassign, may-contain toggles. Unlock requires confirm.            | Kitchen   | `recipes_locked_specs` Kitchen; `RecipesView.tsx:183, lock UI` | `recipe.locked` |
| Sub-recipes                        | Costing autocomplete suggests recipes-with-costings; pick one to attach as an ingredient at cost-per-portion       | Pro       | `recipes_sub_recipes` Pro; logic in `CostingView.tsx:50-60, 213-228` and exposed in Recipes | `ing.sourceRecipeId` on costing ingredients |
| "Used in" sub-recipe consumers     | List of dishes that consume this recipe via `sourceRecipeId`                                                       | Pro       | `RecipesView.tsx` Used-in block   | `state.gpHistory` |
| Print recipe / recipe book         | Single-recipe print or whole-library "recipe book" PDF                                                              | Pro       | `recipes_recipe_book` Pro; `RecipesView.tsx:177` | local |
| Delete recipe (cascades to menus)  | Removing a recipe strips it from `menu.recipeIds` + `menu.salesData`                                                | Chef+     | `AppContext.tsx:15-22 DEL_RECIPE` | local |

### Notebook — `NotebookView.tsx`
A single-pane CRUD notebook for free-form ideas, linkable to recipes.

| Feature                       | Description                                                  | Tier | File:line                    | Data |
|-------------------------------|--------------------------------------------------------------|------|------------------------------|------|
| Note list + search            | Filter by title/content                                     | all (`notebook_unlimited` Pro) | `NotebookView.tsx:19` | `state.notes` |
| Create / edit note            | Title + body inline editor                                  | Chef+| `NotebookView.tsx:21-57`     | `actions.addNote`, `updNote` |
| Link note to recipes          | Toggle-pill UI in note detail                               | Chef+| `NotebookView.tsx:29-44`     | `note.linkedRecipeIds` |
| Delete note                   | Confirm step required                                        | Chef+| `NotebookView.tsx:45-55`     | `actions.delNote` |
| Outlet scoping                | New notes stamp `outletId`; legacy notes still visible      | Group| `NotebookView.tsx:18,20`     | `useOutlet()` |

### Costing — `CostingView.tsx`
The standalone costing builder (separate from the inline costing inside Recipes).

| Feature                          | Description                                                                                                | Tier            | File:line                      | Data |
|----------------------------------|------------------------------------------------------------------------------------------------------------|-----------------|--------------------------------|------|
| GP calculator                    | Sell, target, portions, ingredients → live GP £ + %                                                        | Pro (`costing_full`) | `CostingView.tsx:60-67, 134-146` | local |
| Ingredient autocomplete (bank + sub-recipes) | Suggests bank entries with prices and sub-recipes with cost-per-portion                              | Pro             | `CostingView.tsx:204-238`     | `state.ingredientsBank`, `state.recipes` |
| Auto-fill price from bank        | When ingredient name matches a bank entry, price + unit pre-populate                                       | Pro             | `CostingView.tsx:101`         | `state.ingredientsBank` |
| Save / update costing            | Persist to `gpHistory`. Manager+ only.                                                                     | Pro / manager+  | `CostingView.tsx:102-107, 124` | `actions.addGP/updGP`; `perms.canEditPricing` |
| Costing history sidebar          | Saved costings list, click to load + edit. Mobile FAB→sheet.                                              | Pro             | `CostingView.tsx:250-345`     | `state.gpHistory` (outlet-scoped) |
| Link a saved costing to a recipe | Inline select per history row                                                                              | Chef+           | `CostingView.tsx:274-291`     | `recipe.linkedCostingId` |
| Delete saved costing             | Confirm step. Manager+ only.                                                                               | Pro / manager+  | `CostingView.tsx:292-300`     | `actions.delGP` |
| Stale-price alerts               | When loaded costing's ingredient prices have drifted ≥5% vs bank, shows "n price changes since last saved" | Pro             | `CostingView.tsx:68-81, 127-133` | comparison `state.ingredientsBank` |
| Update all to current bank prices | One-click to bring all ingredient prices to current bank value                                            | Pro             | `CostingView.tsx:109-112`     | local |

### Menus — `MenuBuilderView.tsx` + `MenuDesigner.tsx`

| Feature                        | Description                                                                                          | Tier                 | File:line                          | Data |
|--------------------------------|------------------------------------------------------------------------------------------------------|----------------------|------------------------------------|------|
| Menu list (cards)              | Per-menu card with blended GP / total sell / total cost / lowest-GP dish / uncosted count             | Pro (`menus_builder`)| `MenuBuilderView.tsx:84-99 + list` | `state.menus` (outlet-scoped) |
| Add menu                       | Name + description, manager+ only                                                                     | Pro / manager+       | `MenuBuilderView.tsx:151`         | `actions.addMenu` |
| Dish list + GP summary         | Add/remove recipes; per-dish sell/cost/GP%. Orphan handling: deleted recipes show "Removed" pill + Clean-up banner | Pro | `MenuBuilderView.tsx` dish block | `menu.recipeIds`, `state.recipes`, `state.gpHistory` |
| Menu engineering 2×2           | Kasavana & Smith Star / Plough Horse / Puzzle / Dog from `menu.salesData` covers                      | Pro (`menus_engineering`) | engineering section in MenuBuilderView | `menu.salesData` |
| Menu Designer overlay          | A4 designer with backgrounds + typography                                                              | Pro                  | `MenuDesigner.tsx`                | `menu.design` |
| Publish public menu (slug + QR)| `/m/{slug}` public route, QR PNG download                                                              | Group (`menus_live_digital`, `menus_qr_codes`) + flag `publicMenus` | `MenuBuilderView.tsx:36-55`; `src/app/m/[slug]/page.tsx` | `menu.published`, `menu.publicSlug` |
| Mobile responsive Designer     | Design/Preview tab switch; CSS-scaled A4 in Preview                                                    | Pro                  | `MenuDesigner.tsx`                | local |

### Invoices — `InvoicesView.tsx`

| Feature                            | Description                                                                                                | Tier            | File:line                            | Data |
|------------------------------------|------------------------------------------------------------------------------------------------------------|-----------------|--------------------------------------|------|
| Top nav pills                      | Ingredients bank · History · Reports (Suppliers was promoted out of this view 2026-05-13)                  | Pro             | `InvoicesView.tsx:253-275`          | local |
| 4 summary tiles                    | Month spend / invoices scanned / price alerts / 30-day flagged deliveries                                  | Pro             | `InvoicesView.tsx:277-292`          | `invoices`, `alerts`, `discrepancySummary` |
| Forward-email toggle               | Expands a strip showing `invoices+{token}@palateandpen.co.uk` with copy                                    | Pro (`invoices_email_forwarding`, flag `emailForwarding`) | `InvoicesView.tsx:81-82, 244-251`, Settings card; webhook `/api/inbound-email/route.ts` | `profile.invoiceInboxToken` |
| Scan invoice (camera/file)         | PDF or image → Claude Sonnet 4.6 extracts line items                                                       | Pro (`invoices_ai_scan`, flag `aiInvoiceScan`) | `InvoicesView.tsx:84-117`; POST `/api/palatable/scan-invoice` | dispatches `addInvoice` + `upsertBank` |
| Review-after-scan                  | Pick items, name supplier, confirm                                                                          | Pro             | `InvoicesView.tsx:119-139, view==='review'` | local |
| Delivery check (yes / flag / skip) | Big tap targets; "Yes" stamps `status:'confirmed'`; "Flag" opens per-line editor                            | Pro (`invoices_delivery_check`) | `InvoicesView.tsx:141-176, 295-370` | `invoice.status`, `invoice.discrepancies[]` |
| Price-change detection             | Compares scanned unit prices to bank ≥5%, emits `priceAlerts`                                              | Pro (`invoices_price_alerts`) | `InvoicesView.tsx:99-117`         | `state.priceAlerts` |
| 30-day discrepancy banner          | Amber callout in bank + history views                                                                       | Pro             | `InvoicesView.tsx:376-385`          | computed from `discrepancies[]` |
| Ingredients bank list (inside Invoices) | Same data as Bank tab, rendered here as a sub-view                                                    | Pro             | `InvoicesView.tsx` renderBankBody  | `state.ingredientsBank` |
| Invoice history list               | One row per invoice with supplier reliability chip                                                          | Pro             | `InvoicesView.tsx` view==='history' | `state.invoices` |
| Invoice detail drill-in            | All-items grid, price-change table, flagged-discrepancies card                                              | Pro             | `InvoicesView.tsx` view==='detail'  | one invoice |
| Spend report (period nav)          | Week / month spend breakdown                                                                                | Pro             | `InvoicesView.tsx:200-212`          | `state.invoices` |

### Stock — `StockView.tsx`

| Feature                          | Description                                                                       | Tier                          | File:line                  | Data |
|----------------------------------|-----------------------------------------------------------------------------------|-------------------------------|----------------------------|------|
| 4-tile status filter             | Total / Good / Low / Critical                                                     | Pro (`stock_view`)            | `StockView.tsx:92-97`     | `state.stockItems` |
| Search + category filter         | Per-line items                                                                    | Pro                           | `StockView.tsx:105-118`   | local |
| Stock-item list                  | Per-row currentQty / par / min / unit price; status colour                        | Pro                           | `StockView.tsx` list body | `state.stockItems` |
| Add stock item                   | Name + unit + par + min + category                                                | Pro                           | `StockView.tsx:46-52`     | `actions.addStock` |
| From-bank picker                 | Pick a bank ingredient to seed a stock item                                       | Pro                           | `StockView.tsx:55-56`     | `state.ingredientsBank` |
| Inline edit row                  | 400ms-debounced auto-save                                                          | Chef+                         | `StockView.tsx:65-90`     | `actions.updStock` |
| Auto-categorise                  | Bulk-apply `guessCategory()` to uncategorised stock + bank items                  | Pro                           | `StockView.tsx:139-145`   | `actions.updStock`, `upsertBank` |
| Start stock count                | Seeds count buffer, switches to count view                                        | Pro                           | `StockView.tsx:123-128`   | local |
| Stock count entry + save         | Stamps `lastCounted` + `prevQty` per item                                         | Chef+                         | `StockView.tsx:130-137`   | `actions.updStock` |
| Stock report (summary format)    | Totals / by-category / variances / line detail. CSV download.                     | Pro                           | `StockView.tsx:148-265`   | computed |
| Critical-items banner            | Red banner above list when any are below `minLevel`                               | Pro                           | `StockView.tsx:121`       | `state.stockItems` |
| Smart reorder alerts             | Surfaced via Notifications bell as `stock-critical` / `stock-low`                 | Pro (`stock_reorder_alerts` Kitchen per `tierGate.ts:37`, but emission isn't tier-gated in `NotificationsPanel.tsx:55-67`) | `NotificationsPanel.tsx:55-67` | `state.stockItems` |

### Suppliers — `SuppliersView.tsx` (master/detail)
Promoted from a sub-tab of Invoices on 2026-05-13.

| Feature                              | Description                                                                                 | Tier                          | File:line                       | Data |
|--------------------------------------|---------------------------------------------------------------------------------------------|-------------------------------|---------------------------------|------|
| Supplier list (left pane)            | Reliability-scored from invoices; merged with manually-added contacts                       | Pro (`suppliers_view`)        | `SuppliersView.tsx:88-115`      | `buildSupplierReliability(invoices)` + `profile.supplierContacts` |
| Sort by worst score / A-Z            | Toggle in topbar                                                                            | Pro                           | `SuppliersView.tsx:69, 117-`    | local |
| Search list                          | By supplier name                                                                            | Pro                           | `SuppliersView.tsx:68, 118-`    | local |
| Add supplier modal                   | Name + rep + phone + email + delivery-days + notes (no invoice history yet)                 | Pro                           | `SuppliersView.tsx:82-87, modal` | `profile.supplierContacts` |
| Supplier detail right pane           | Avatar + meta + phone/email/PO action buttons                                                | Pro                           | `SuppliersView.tsx detail`      | one supplier merged |
| 4-stat tile row                      | Score (45d) / Prior 45d / Discrepancy £ / Accuracy %                                         | Pro                           | `SuppliersView.tsx detail.stats` | `SupplierReliability` |
| Most-common-issue callout            | Top ingredient flagged for this supplier                                                     | Pro                           | `SuppliersView.tsx detail.issue` | `reliability.topIssue` |
| Price-change history list            | Per-supplier price diffs                                                                     | Pro                           | `SuppliersView.tsx detail.priceHistory` | derived |
| Contact form (editable)              | Rep / phone / email / delivery days / notes; autosaves via profile autosave                  | Pro                           | `SuppliersView.tsx contact form`| `profile.supplierContacts[key]` |
| Items supplied (chip cloud)          | All distinct ingredient names from this supplier's invoices                                  | Pro                           | `SuppliersView.tsx detail.items`| invoices grouped |
| Action row                           | "Create PO" / "View history" / "Full history"                                                | Pro; PO button is a stub      | `SuppliersView.tsx detail.actions` | "View history" routes via `setTab` callback |
| Mobile single-pane with back button  | Collapses split-pane                                                                          | Pro                           | `SuppliersView.tsx` mobile branch | `useIsMobile()` |

### Bank — `BankView.tsx`

| Feature                       | Description                                                                                  | Tier               | File:line                  | Data |
|-------------------------------|----------------------------------------------------------------------------------------------|--------------------|----------------------------|------|
| Ingredient list (left pane)   | All bank entries, search + category filter                                                  | Pro (`costing_ingredients_bank`) | `BankView.tsx:57-66`     | `state.ingredientsBank` |
| Add ingredient                | Just a name; defaults to `Other` category                                                    | Chef+              | `BankView.tsx:77-88`       | `actions.addBank` |
| Right-pane detail edit        | Name / category / unit / unitPrice / allergens (with sub-types) / nutrition per 100g/ml      | Manager+ for price; Chef+ otherwise (no tight in-view enforcement here) | `BankView.tsx:68-75 + detail`  | `actions.updBank` |
| Delete ingredient             | Confirm step                                                                                  | Chef+              | `BankView.tsx:90-95`       | `actions.delBank` |
| 14-allergen + nut/cereal grid | Editable contains list; nut/cereal sub-pills show when the parent allergen is contained      | Pro                | `BankView.tsx:10-28`       | `bank.allergens` |
| Nutrition per 100g            | kcal + kJ + fat + saturates + carbs + sugars + protein + salt + fibre                        | Pro                | `BankView.tsx:29-39`       | `bank.nutrition` |

### Waste — `WasteView.tsx`

| Feature                          | Description                                                                            | Tier                          | File:line                  | Data |
|----------------------------------|----------------------------------------------------------------------------------------|-------------------------------|----------------------------|------|
| Waste log (table)                | Date / ingredient / qty / reason / cost                                                | Pro (`waste_view`); flag `wasteTracking` | `WasteView.tsx:241-290`  | `state.wasteLog` (outlet-scoped) |
| Filters (range, reason, search)  | All-time / today / 7d / 30d × 9 reasons × search                                       | Pro                           | `WasteView.tsx:209-225`    | local |
| Log waste modal                  | Bank autocomplete + qty + unit + reason + notes + override price; auto-computes cost   | Pro                           | `WasteView.tsx:293-366`    | `actions.addWaste`; `computeWasteCost` |
| 4 summary cards                  | Last 7d / last 30d / all time / top ingredient                                          | Pro                           | `WasteView.tsx:202-207`    | `stats` |
| Cost-by-reason breakdown         | Pill row of `{reason}: £cost` for the current filter window                            | Pro                           | `WasteView.tsx:228-238`    | `stats.byReason` |
| CSV export                       | Filtered list to CSV with UTF-8 BOM                                                     | Pro                           | `WasteView.tsx:155-176`    | local |
| Waste cost dashboard             | Daily avg + projected month + 4-week trend bars (lives in Reports view, not here)      | Kitchen (`waste_dashboard`)   | `ReportsView.tsx` waste section | `state.wasteLog` |

### Reports — `ReportsView.tsx`

| Section key | Description                                                                                       | Tier                            | File:line | Data |
|-------------|---------------------------------------------------------------------------------------------------|---------------------------------|-----------|------|
| `gp`        | GP performance + GP-trend-per-dish (first→latest delta sortable). Per-section date range.         | Kitchen (`reports_view`)        | `ReportsView.tsx:70-119` | `state.gpHistory` |
| `waste`     | Daily avg / projected month / 4-week trend bars                                                   | Kitchen                         | waste block | `state.wasteLog` |
| `stock`     | Stock value by category                                                                           | Kitchen                         | stock block | `state.stockItems` + bank prices |
| `menus`     | Menu engineering rollup; per-menu revenue + profit projected from `salesData` × dish sell/cost   | Kitchen                         | menus block | `state.menus`, `state.gpHistory` |
| `prices`    | Price-changes table                                                                               | Kitchen                         | prices block | `state.priceAlerts` |
| `benchmark` | Per-ingredient avg/min/max/volatility/vs-bank; expand-to-sparkline; per-section CSV + print       | Kitchen (`costing_price_benchmarking` Pro per `tierGate.ts:24` — note Reports itself is Kitchen) | `ReportsView.tsx` benchmark section uses `src/lib/priceBenchmark.ts` | invoices + bank |
| `supplier`  | Per-supplier invoices/spend/avg/Δ-prices/last-seen, sortable, expand-to-top-ingredients, CSV+print | Kitchen                         | supplier section uses `src/lib/supplierPerformance.ts` | `state.invoices` |
| Per-section CSV + A4 print | Each section has its own download/print                                                  | Kitchen                         | shared `PrintModal` + `Section` plumbing | local |

### My Team — `MyTeamView.tsx`

| Feature                       | Description                                                                                                       | Tier                                 | File:line                            | Data |
|-------------------------------|-------------------------------------------------------------------------------------------------------------------|--------------------------------------|--------------------------------------|------|
| Stats row (4 tiles)           | Members / Seats available / Pending invites / Contributions                                                       | Kitchen+ (owner/manager) (`team_view`) | `MyTeamView.tsx:121-145ish`         | `TeamApi` from `/api/accounts/[id]/team` |
| Member tile grid              | Avatar / name / email / role pill / joined / contribution count                                                   | Kitchen+                              | `MyTeamView.tsx` grid              | counts via `addedBy` |
| Member detail modal           | Role select + contribution breakdown + last 8 activities + remove button                                          | Kitchen+ / manager+ writes            | `MyTeamView.tsx` modal             | `PATCH /api/accounts/[id]/members/[userId]` |
| Invite member modal           | Email + role select → generates URL with copy button                                                              | Kitchen+ / manager+                   | `MyTeamView.tsx` invite modal      | `POST /api/accounts/[id]/invites` |
| Pending invites list          | Copy link / revoke                                                                                                | Kitchen+ / manager+                   | invites block                      | `DELETE /api/accounts/[id]/invites/[id]` |
| Seat-limit upgrade nudge      | Below grid when seat cap reached; tier-aware upgrade hint                                                         | Kitchen+                              | `MyTeamView.tsx` upgrade card      | `SEAT_LIMITS` from `src/lib/team.ts` |
| Free→paid merge prompt (separate) | Lives on `/invite/[token]` not in this view; offers "merge personal account" choice when accepting an invite | n/a                                   | `src/app/invite/[token]/page.tsx`; `/api/invites/[token]/accept` with `{merge:true}` | folds personal `user_data` into team's arrays |
| Ownership transfer            | "Transfer ownership →" option in member detail when caller is owner                                               | Owner-only                            | `MyTeamView.tsx` modal             | `PATCH .../members/[userId]` |

### Profile — `ProfileView.tsx` (54 lines, small)

| Feature                  | Description                                                              | Tier | File:line                   | Data |
|--------------------------|--------------------------------------------------------------------------|------|-----------------------------|------|
| Upgrade-CTA banner       | Renders for Free users, opens `UpgradeModal`                              | Free | `ProfileView.tsx:20-25`     | n/a |
| Profile card             | Initial avatar + name + email + tier badge                                | all  | `ProfileView.tsx:26-35`     | `state.profile`, `user.email` |
| 4-stat tile row          | Recipes / Notes / GP calcs / Stock items                                   | all  | `ProfileView.tsx:36-43`     | counts |
| Average GP card          | Across all `gpHistory` entries                                            | all  | `ProfileView.tsx:44-49`     | `state.gpHistory` |
| Data-residency note      | "All data stored securely on EU servers."                                  | all  | `ProfileView.tsx:50-53`     | static |

### Settings — `SettingsView.tsx` (sectional)

| Section        | Capabilities                                                                                                              | Tier                                          | Role gate                          |
|----------------|---------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------|------------------------------------|
| `profile`      | Business name + your name + location + logo upload to Supabase Storage                                                    | all (logo upload Kitchen+ via `branding_logo`) | manager+ writes (`canManageSettings`) |
| `preferences`  | Theme + currency + units + GP target + stock cadence (day + frequency)                                                    | all                                            | manager+ writes                    |
| `data`         | Export (Recipes / Costings / Stock CSVs) and Import (with downloadable templates)                                          | Export: Kitchen+ flag `csvExport`; Import: Kitchen+ flag `csvImport` (`tierGate.ts:57-58`) | manager+ writes |
| `integrations` | Email forwarding inbox token (Pro+) + API key generation (Kitchen+ via `integrations_api`)                                | Pro / Kitchen+                                 | manager+ writes                    |
| `outlets`      | Outlets list with add/edit/delete modals (`AddOutletModal`, `EditOutletModal`). Counter `X of N outlets`.                  | Group / Enterprise (`outlets_multi`)           | manager+ writes                    |
| `help`         | Re-open Quick Start Guide                                                                                                  | all                                            | all                                |
| `account`      | Upgrade button (opens UpgradeModal) + delete account (`/api/account/delete`)                                              | all                                            | Owner-only for both                |

### Admin panel — `/admin` (separate route at `src/app/admin/page.tsx`)
Founder/operator only — guarded by `isAdminEmail`. Out of the main 14 sidebar tabs. Sections: Overview / Users / Revenue / Infrastructure / Expenses Timeline / Platform / Audit / System. Key sub-features include user detail slideout, Seed showcase, feature-flag toggles, maintenance gate switch, announcement banner editor.

---

## 3. Role-aware access

### Roles and what they can do

Defined in `src/lib/perms.ts` and reflected in `account_members` (migration 007). Hierarchy: **owner > manager > chef > viewer**.

| Permission              | Owner | Manager | Chef | Viewer | Reason exposed to UI |
|-------------------------|-------|---------|------|--------|----------------------|
| `canRead`               | ✓     | ✓       | ✓    | ✓      | — |
| `canEditContent`        | ✓     | ✓       | ✓    | ✗      | recipes, notes, waste, stock counts |
| `canEditPricing`        | ✓     | ✓       | ✗    | ✗      | "Chef role — pricing and menus locked" |
| `canEditMenus`          | ✓     | ✓       | ✗    | ✗      | — |
| `canEditInvoices`       | ✓     | ✓       | ✓    | ✗      | — |
| `canManageBank`         | ✓     | ✓       | ✓    | ✗      | (price field still gated to pricing — note this is intent, not in-code) |
| `canManageTeam`         | ✓     | ✓       | ✗    | ✗      | — |
| `canManageBilling`      | ✓     | ✗       | ✗    | ✗      | — |
| `canManageSettings`     | ✓     | ✓       | ✗    | ✗      | — |
| `isReadOnly`            | ✗     | ✗       | ✗    | ✓      | "Viewer role — read only" |

Storage shape: `public.account_members(account_id, user_id, role, outlet_id, added_by, added_at)` from migration 007 + extension 20260513.

### Tab-level vs feature-level gating

- **Tab-level (sidebar filter):** Only `team`, `waste`, `menus` are filtered out of the sidebar nav array (`Sidebar.tsx:366-371`). All other tabs are visible to all roles + all tiers. Pro-only tabs (Invoices, Stock) get a "Pro" pill but the click still works.
- **Feature-level (in-view):** Where role matters, `usePerms()` is consulted at the action site, not at the route. Examples:
  - `CostingView.tsx:124` — Save Costing button disabled when `!perms.canEditPricing`
  - `MenuBuilderView.tsx:32` — Designer + Add buttons gated on `perms.canEditMenus`
  - `SettingsView.tsx:33` — section writes gated on `perms.canManageSettings`
- **No view component renders a different *shape* of UI based on role.** The only role-aware surface is `RoleBanner.tsx`, a thin strip across the top for non-owner / non-manager roles that names the role + reason + active-account name.

### Gap statement (relevant to the four-tab chef-surface decision)

**Today, role does not change which tabs exist or what each tab fundamentally is — it only changes which buttons within those tabs are clickable.** A Chef and an Owner both see the same 13–14 sidebar items, the same Recipes view chrome, the same Reports view, the same Settings sections. Chef gets greyed-out Save/Publish/Designer buttons and a sticky banner; Owner gets the same UI without the banner.

This is the gap the strategy docs are designed to close. The four-tab chef surface (Recipes / Costing / Margins / Reports per `docs/strategy/role-aware-surfaces.md`) and the separate Manager and Owner surfaces are not built yet. Today's "role awareness" is entirely capability hiding within a single shared shell.

What does work today as scaffolding for that future split:
- `perms.role` and the perms record are available everywhere via `usePerms()`.
- `currentRole` is on `useAuth()` and is the single source of truth across `/app`.
- The mobile bottom bar (`page.tsx:157-163`) already curates a different 5-tab subset for everyone — it's a chef-friendly slice (Home/Recipes/Costing/Stock/Invoices) but it's currently universal, not role-aware.
- The role hierarchy maps cleanly onto the strategy's chef/manager/owner: chef→chef surface, manager→manager surface, owner→owner surface, viewer→subset of chef surface.

What does not exist:
- No code path that selects a different `views` map based on role.
- No "morning brief" / heads-up surface (the strategy's Chef Home top-of-screen). The closest is the current Dashboard, which is the same for everyone.
- No Manager-specific operational dashboard (PO approvals, credit notes in progress) — most of these features aren't built either.
- No Owner-specific business view (P&L, multi-site rollup) — Group reporting and multi-site rollup are open Phase 3 items.
- No "Margins" tab — analytical content currently lives in `ReportsView` (benchmarking, supplier performance, GP trends) and as a modal inside Recipes (cost simulator). See `docs/strategy/working-notes/costing-margins-recon-2026-05-14.md`.

---

## 4. Cross-tab feature relationships

The data model is a single per-account JSONB row in `public.user_data`, with the following arrays hydrated into `AppContext.state` (`src/context/AppContext.tsx:9`):

`recipes · notes · gpHistory · ingredientsBank · invoices · priceAlerts · stockItems · menus · wasteLog · profile`

Because everything is in-memory after first load, cross-tab data flows are object-reference lookups, not joins.

### Recipe → Costing (linkedCostingId)
- Each `recipe` may carry `linkedCostingId` referencing a `gpHistory.id`. Set by:
  - The Costing history sidebar's "Link to recipe" select (`CostingView.tsx:273-291`)
  - Inline costing builder in Recipes (`RecipesView.tsx:345`)
  - "Add costing for this dish" button
- Read by:
  - `RecipesView.tsx:114, 384-394 getLinkedCosting()` — for nutrition/allergens/GP display
  - `MenuBuilderView.tsx:77-81 getCosting()` — for menu rollup
  - `DashboardView.tsx:112-117 recipeGP()` — for recent-recipes GP pill
- Fallback if no explicit link: name match on lowercased trimmed `recipe.title` against `gpHistory.name`.
- Delete cascade: `DEL_RECIPE` reducer at `AppContext.tsx:15-22` strips the recipe id from `menu.recipeIds` and `menu.salesData`. **No reverse cleanup**: deleting a `gpHistory` row leaves dangling `recipe.linkedCostingId` references.

### Sub-recipes (recipe used inside another costing)
- A costing ingredient line can carry `ing.sourceRecipeId` referencing a recipe id. Set in `CostingView.tsx:97, 218` when the ingredient autocomplete picks a "RECIPE" entry. Cost snapshot taken at pick time as cost-per-portion of the linked costing — does **not** auto-propagate when the sub-recipe is re-priced.
- Read in `RecipesView.tsx` "Used in" block (consumers of this recipe).

### Invoice scan → Bank ingredient price → Costing alert → Dish GP
The single most important data flow in the app, runs entirely through `ingredientsBank`:
1. `InvoicesView.tsx:84-117 handleFile()` POSTs file to `/api/palatable/scan-invoice`; Claude returns line items.
2. `processScanResults()` compares each item's `unitPrice` against the bank entry with the same lowercased name (`InvoicesView.tsx:102-109`). ≥5% difference → push a `priceAlerts` row.
3. `confirmScan()` (line 119) calls `appActions.upsertBank()` — overwrites bank `unitPrice` to the new value.
4. Next time `CostingView.tsx:68-81` is opened on a saved costing, it compares saved-ingredient prices to current `ingredientsBank.unitPrice` and emits stale-price alerts in the UI.
5. Recipe detail's linked-costing panel shows the new GP. Dashboard `recipeGP()` reads the updated value.

### Bank ingredient → Recipe allergens + nutrition (computed)
- `RecipesView.tsx:85-124 computeFromBank(costing, bank)` walks the costing's ingredients; for each, finds the bank entry by lowercased name, unions `allergens.contains / nutTypes / glutenTypes` and scales `nutrition` per-100g values by ingredient grams (g/kg/ml/l converters at `:76-81`).
- Output is the source for:
  - Recipe-card short-code allergen pills (recipe list)
  - Recipe-detail allergen grid (effective state = bank-computed ∪ user manual override)
  - Compliance check modal
  - Nutrition table + FOP traffic lights
  - Printable spec sheet
- Bank is the source of truth. Editing an ingredient in `BankView` immediately changes every consuming recipe's computed values on the next render.

### Stock → Notification bell (reorder alerts)
- `NotificationsPanel.tsx:55-67` iterates `state.stockItems`; emits `stock-critical` (`cur ≤ min`) or `stock-low` (`cur < par`) notifications. Surfaces in:
  - Sidebar notifications popout (`NotificationsTab.tsx`)
  - Mobile More sheet "Alerts" row
  - The desktop nav also reads `unreadCount`.
- No PO emission yet — `stock_reorder_alerts` lists as Kitchen-tier in `tierGate.ts:37`, but the emission isn't tier-gated in code.

### Stock count → reorder suggestion → PO
**Partial.** Stock count writes `currentQty` / `lastCounted` to `stockItems`. Reorder suggestion = the notification described above. **PO step does not exist:** no UI surface anywhere in `/app/components` constructs a `purchase_orders` row. Database tables and helpers (`purchase_orders`, `purchase_order_items`, `createPurchaseOrder()` in `src/lib/outlets.ts:197-208`) are in place but uncalled. The Suppliers detail "Create PO" button (`SUP.detail.actions`) is a stub. See section 5.

### Bank ingredient → Stock seed
- `StockView` "From Bank" picker (`STK.bankPicker`) lets the chef pick a bank entry to create a stock item from. Reads `state.ingredientsBank` and seeds the new stock item's `name / unit / unitPrice / category`. No two-way binding — once seeded, the stock-item record is independent.

### Waste log → Reports waste section + Dashboard tile
- `WasteView` appends to `state.wasteLog` with bank-derived `unitPrice` and computed `totalCost`.
- Dashboard reads last-7-day total at `DashboardView.tsx:79-82` (the "Waste" feature card subtitle).
- Reports `waste` section reads the full log and bucks against `wasteCost7d`, projected month, 4-week trend bars.
- No outlet-aware reporting; `WasteView` scopes by outlet but Reports does not.

### Recipe → Menu
- `menu.recipeIds: string[]` references recipe ids. Set by the menu's "Add dish" picker.
- `menu.salesData: { recipeId: covers }` — manually entered covers per period; powers Menu Engineering 2×2 quadrants and Reports menu profitability rollup.
- Delete cascade: `DEL_RECIPE` strips both. Orphan handling: when a menu row already has a deleted recipe (pre-cascade rows), the dish row renders red with a "Removed" pill and a "Clean Up" banner above the table.

### Menu → Public URL → QR
- `menu.publicSlug` (set on first publish) maps to `/m/[slug]` (`src/app/m/[slug]/page.tsx`).
- QR rendered inline from a QR API + PNG download.
- Gated by both `menus_live_digital` (Group tier) **and** the global `publicMenus` flag — the `/m/[slug]/page.tsx` loader (`loadMenu`) returns null when the flag is off, so existing URLs go dark instantly.

### Account / membership / outlet model
- `auth.users` — Supabase auth row
- `public.accounts` (migration 007 + 20260513) — one per owner; tier, stripe ids, logo. `accounts.id = accounts.owner_user_id` aliased 1:1 by migration 007's backfill (re-confirmed by migration 20260514).
- `public.account_members` — { account_id, user_id, role, outlet_id, added_by, added_at }
- `public.account_invites` — { account_id, email, role, token, expires_at, accepted_at, invited_by }
- `public.outlets` — { id, account_id, name, type, address, timezone, is_central_kitchen }
- `public.user_data` — the single JSONB row per account (`one row per (user_id, account_id)`). All app content lives here.

### Stripe webhook → tier propagation
- `/api/stripe/webhook/route.ts` `checkout.session.completed` → updates `accounts.tier`, `stripe_customer_id`, `stripe_subscription_id` for the owner's accounts (and mirrors to `auth.users.user_metadata` for legacy fallback).
- `customer.subscription.deleted` → look up account by `accounts.stripe_customer_id` (preferred path), else legacy `user_metadata.stripe_customer`. Downgrades to `free`.
- `tier` reads in `AuthContext.tsx:201` — `isAdminEmail` override → `currentAccount.tier` → `user_metadata.tier` → `'free'`. Admin email override applies the same `'enterprise'` upgrade in every server route at `src/app/api/palatable/*/route.ts`.

---

## 5. Honest gaps — planned ≠ built

| Item | Where it's mentioned | Code status |
|------|----------------------|-------------|
| **Multiple outlets under one account** | CLAUDE.md Phase 3 (unchecked). Strategy doc role-aware-surfaces.md ("multi-site"). | **Schema done, UI partial.** `outlets` table + RLS shipped (20260513). `AddOutletModal` / `EditOutletModal` shipped. Sidebar outlet switcher works on Group/Enterprise. But: views only filter via the client-side `scopeByOutlet()` helper on JSONB arrays. No per-outlet `user_data` row, no inter-outlet aggregations. |
| **Central kitchen management** | Phase 3 (unchecked) | Schema has `outlets.is_central_kitchen` boolean. AddOutletModal can toggle it. **No CK-specific UI exists** — no production planning, no inter-site transfer flow. |
| **Supplier ordering from par levels** | Phase 3 (unchecked) | Not built. Stock surfaces `parLevel` and emits low/critical notifications, but no PO suggestion engine or order draft. |
| **Purchase order tracking** | Phase 3 (unchecked) | `purchase_orders` + `purchase_order_items` tables exist (20260513). `createPurchaseOrder()`, `getPurchaseOrders()` helpers exist in `src/lib/outlets.ts:181-208`. **Zero callers.** No UI route. Suppliers detail action button labelled "Create PO" is a stub. |
| **Automated reorder suggestions** | Phase 3 (unchecked) | Notifications surface low/critical stock; no "suggested order list" UI. |
| **Group-level reporting across all sites** | Phase 3 (unchecked) | Reports view does not have an all-outlets aggregator. `reports_group_level = 'group'` in `tierGate.ts:48` is defined but unused. |
| **Demand forecasting** | Phase 3 (unchecked) | Not built. `reports_demand_forecasting = 'group'` defined but no consumer. |
| **Inter-site stock transfer** | Phase 3 (unchecked) | Not built. `stock_inter_site_transfer = 'group'` defined but no consumer. |
| **Group dashboard — Overview/Outlets/Alerts/Cross-outlet/POs/Reports tabs** | Phase 3 (unchecked) | Not built. The single Dashboard view today is per-(outlet OR all) and not role-aware. |
| **POS integration (Square, ePOSnow)** | Phase 4 (unchecked); also mentioned in Menus salesData dependency note | Not built. `integrations_pos = 'group'` defined but no consumer. Menu engineering still expects manual `salesData` entry. |
| **Xero integration** | Phase 4 (unchecked) | Not built. `integrations_xero = 'group'` defined but no consumer. |
| **iOS / Android / RevenueCat / Offline / Camera scan** | Phase 6 (unchecked) | Not built in web repo. Mobile sibling exists at `Documents/palateandpen/app/` (per CLAUDE.md). |
| **Group outlets in dashboard summary** | Phase 3 (unchecked) | Not built. Dashboard greeting shows active-outlet name, but no per-outlet summary tiles. |
| **Manager surface** | strategy `role-aware-surfaces.md` ("Manager Home — Site Status") | Not built — Manager today sees Owner-shaped UI minus billing/delete. No "site status" dashboard, no PO-approval queue, no credit-note tracker. |
| **Owner business-pulse surface** | strategy doc ("Owner Home — Business View") | Not built — Owner today sees the same Dashboard as Chef. Revenue/MRR lives inside the founder-only `/admin` route. |
| **Chef morning brief / four-tab chef surface** | strategy doc Chef Home; CLAUDE.md Strategic Direction; working-note costing-margins-recon-2026-05-14.md | Not built. Today's chef sees the full 14-tab shell with disabled-button gating. |
| **Margins tab (rename + restructure of Costing)** | strategy doc; costing-margins-recon-2026-05-14.md ("Recon complete. Shape decision pending."); CLAUDE.md note "in-flight 2026-05-14" | Not built. Costing today is authoring; analytical surfaces are spread across Reports + the Recipes cost simulator modal. |
| **Auto-maintained costing (v1 wedge)** | CLAUDE.md Strategic Direction | Today: re-opening a saved costing surfaces a "n price changes since last saved — Update all to current prices" affordance (`CostingView.tsx:127-133`). One-click, not automatic — the costing isn't kept current in the background. |
| **Margin leakage detection (v1 wedge)** | CLAUDE.md Strategic Direction | Not built. Reports → GP trend per dish surfaces drift after re-saving; no proactive alert when GP slips below target. |
| **Credit note workflow (v1 wedge)** | CLAUDE.md Strategic Direction | Not built. The Delivery Check flow records `discrepancies[]` per invoice but no credit-note draft, send, or track step exists. |
| **Show invoice scanning prominently on mobile home** | Mobile section (unchecked sub-task) | Partial — Invoices is one of the 5 primary bottom-bar slots, but no dedicated "scan an invoice" button on Dashboard. |
| **Per-feature server enforcement for `wasteTracking` and `menuBuilder` flags** | Explicit punch-list note in CLAUDE.md ("That's deliberate — no enforcement points") | Confirmed: only `Sidebar.tsx`, `page.tsx`, and SettingsView consume those flags. No `/api/*` route gates either flag. Documented as deliberate. |
| **`csvImport` and `csvExport` server enforcement** | Same | Same — UI-only gates in Settings; no server endpoint exclusively guards CSV writes (writes go through generic `user_data` autosave). |

---

## 6. Honest dead code

| Candidate | File / line | Why it looks suspect |
|-----------|-------------|----------------------|
| `purchase_orders` / `purchase_order_items` tables | `supabase/migrations/20260513_phase3_multi_outlet.sql:75-107` | Tables + RLS exist; **zero rows in production** per recon brief; **no UI surface** anywhere in `src/app/app/components` calls `createPurchaseOrder()` or `getPurchaseOrders()`. The Suppliers `SUP.detail.actions` "Create PO" button is a stub. Tables are Phase 3 scaffolding ahead of build. |
| `createPurchaseOrder()` + `getPurchaseOrders()` helpers | `src/lib/outlets.ts:181-208` | Exported, no callers. Same reason as above. |
| `canAddUser()` helper | `src/lib/outlets.ts:156-179` | Exported and complete (enforces 25-user + 5-per-outlet caps). **No callers** — `src/app/api/accounts/[id]/invites/route.ts` uses its own `seatUsage()` helper from `src/lib/team.ts`. Duplicated logic. |
| `branding_logo` feature key | `src/lib/tierGate.ts:62` | Kitchen+ but logo upload in `SettingsView` is not gated on this key — it's gated on `canManageSettings` only. Defined but unenforced. |
| `recipes_templates` feature key | `src/lib/tierGate.ts:17` | Kitchen+. **No code consumer found** — no UI surface or API route references the key. Future feature placeholder. |
| `notebook_shared` feature key | `src/lib/tierGate.ts:19` | Kitchen+. No consumer — Notebook today is just per-account, no "shared" semantics. |
| `reports_flash_pl` feature key | `src/lib/tierGate.ts:46` | Group. No consumer. |
| `reports_group_level` feature key | `src/lib/tierGate.ts:47` | Group. No consumer (Group reporting not built). |
| `reports_demand_forecasting` feature key | `src/lib/tierGate.ts:48` | Group. No consumer. |
| `team_unlimited_users` feature key | `src/lib/tierGate.ts:53` | Group. Defined but enforcement is via `SEAT_LIMITS` in `src/lib/team.ts`, not via this key. |
| `outlets_central_kitchen` feature key | `src/lib/tierGate.ts:55` | Group. The flag exists but no CK-specific UI surface yet — `is_central_kitchen` is a checkbox in AddOutletModal with no downstream consumers. |
| `outlets_group_reporting` feature key | `src/lib/tierGate.ts:56` | Group. No consumer. |
| `integrations_pos`, `integrations_xero` feature keys | `src/lib/tierGate.ts:60-61` | Group. No consumers. Phase 4 placeholders. |
| `white_label`, `sso`, `support_dedicated` feature keys | `src/lib/tierGate.ts:63-65` | Enterprise. No consumers. Pricing-page placeholders. |
| `wasteTracking` and `menuBuilder` runtime flags | `src/lib/featureFlags.ts:19-20` | Have UI consumers (Sidebar nav filter, page.tsx fallback) but no server endpoint enforcement; CLAUDE.md explicitly calls this out as deliberate. Not dead — but enforcement asymmetry worth flagging when reviewing what these flags can actually do during an incident. |
| `recipes_recipe_book` feature key | `src/lib/tierGate.ts:14` | Used in RecipesView "Print Book" button area but the gate logic relies on `recipes_unlimited` Pro for tier checks, not this specific key. |
| Duplicate `'amber'` / `C.amber` definitions | `src/app/admin/page.tsx:22-23, 25-26` vs literal `AMBER = '#E8AE20'` in `InvoicesView.tsx:19`, `StockView.tsx:14`, `SuppliersView.tsx:12` | Same amber value redeclared as a literal in 3 view files rather than imported from a shared token. Cosmetic / theming dead code candidate. |
| Stripe webhook `TIER_MAP` for `enterprise` | `src/app/api/stripe/webhook/route.ts` | CLAUDE.md notes the check route short-circuits before webhook fires for Enterprise (contact-sales). Webhook code path for enterprise is unreachable by design. |
| `MOBILE_PRIMARY` profile-tab handler | `src/app/app/page.tsx:170-194` | The `mobileAvatar` element is built but Profile is in `MOBILE_MORE_ITEMS`, not the primary bar. The avatar variable is consumed only via the More sheet — fine, just confirming the avatar isn't a dead constant. (Genuinely used.) |
| `INV.suppliers.*` editing keys | `docs/editing-keys.md:46-57` and CLAUDE.md editing-key section | Explicitly marked deprecated when Suppliers got promoted out of Invoices on 2026-05-13. Routes/components don't exist anymore; the keys are retained for historical reference. |
| `recipe.allergens.contains` legacy field | `RecipesView.tsx` allergen grid | Per CLAUDE.md Progress Log 2026-05-11: "Removes per-recipe Contains UI entirely (existing data ignored)". The field may still exist on legacy recipes but is no longer the source of truth — computed bank union is. Read but not written. |
| `MaintenanceGate` fails-open code path | `src/app/app/components/MaintenanceGate.tsx` (referenced from `page.tsx:197`) | Defensive — CLAUDE.md notes it "fails open and hard-reloads on restore". Active but rarely triggered. Not dead, flagged because it sits at the very top of the render tree and the fail-open behaviour could be missed during review. |

Two notable items that look suspect but are **not** dead:
- `addedBy` stamping on every action in `AppContext.tsx:160-185` — every collection write tags the editing user. This feeds the Owner-only My Team contributions view. Looks redundant but is consumed by `MyTeamView.tsx:46-58 countContributions()`.
- `recipe.imported.ingredients` (the raw strings list) — orthogonal to costing ingredients. CLAUDE.md says "informational/printable only" — used in the printable spec sheet and as a seed for the inline-costing builder. Live, despite looking like a duplicate of costing data.
