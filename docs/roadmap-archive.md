# Roadmap archive

Completed phases. Reference material — see CLAUDE.md for active phases.

## Phase 1 — Foundation

- [x] Recipe library with URL import
- [x] Chef notebook linked to recipes
- [x] GP costing calculator
- [x] AI invoice scanning
- [x] Price change alerts
- [x] Stock counting with par levels
- [x] Stock report with CSV download
- [x] Stripe payments
- [x] Admin panel
- [x] Coming soon page
- [x] Stock inline editing
- [x] Stock and ingredient categories
- [x] Remove business min GP bar from CostingView
- [x] Allergen tracking
- [x] Nutritional information
- [x] Make the P logo in the sidebar a home button that navigates back to the dashboard
- [x] Fix duplicate CSV download button in stock report viewer
- [x] Prevent duplicate stock lines — stop the same ingredient being added twice to stock
- [x] Neaten up the allergen section inside the recipe detail view (layout/spacing/visual hierarchy of Contains + May Contain + sub-type rows)
- [x] Edit recipe ingredients inline on the recipe detail page
- [x] "Add costing now" button on recipe detail that opens a costing panel inline without leaving the recipe

## Phase 2 — Pro Feature Depth

- [x] Menu builder with full GP summary per menu
- [x] Menu engineering reports (Star/Plough Horse/Dog/Puzzle)
- [x] Waste tracking with £ cost impact
- [x] Recipe photo upload
- [x] Sub-recipes
- [x] Locked recipe specs
- [x] Traffic light labelling
- [x] Calorie counts per dish and portion
- [x] Dish spec sheets (printable)
- [x] Change printable stock count sheet to a summary report format showing totals, variances and category breakdowns rather than a raw line list
- [x] Create a custom icon set for the Palatable website replacing generic icons with bespoke food and kitchen themed icons
- [x] Make menu backgrounds more graphic and custom with imagery or textured treatments
- [x] CSV export of all recipes, costings and stock as separate downloadable files
- [x] CSV import for recipes, costings and stock with downloadable template files containing the correct headers
- [x] Scan a spec sheet with AI to import recipe data automatically
- [x] Downloadable quick-start guide for new users explaining the CSV templates *(shipped as an interactive in-app guide with auto-trigger on first login + Settings replay button — covers every part of the app, not just CSVs)*

## Phase 5 — Intelligence Layer

- [x] GP trend analysis per dish over time *(Reports → GP section, dishes re-costed ≥ 2× show first→latest delta with up/down sorting)*
- [x] Menu profitability dashboard *(Reports → Menu engineering, per-menu projected revenue + profit from sales × dish sell/cost)*
- [x] Ingredient price benchmarking *(Reports → new section; per-ingredient avg/min/max + volatility + last invoice vs bank %, sortable, expand-to-sparkline, per-section CSV + print)*
- [x] Waste cost dashboard *(Reports → Waste, daily average + projected month + 4-week trend bars)*
- [x] Smart reorder alerts *(already shipped — `stock-critical` and `stock-low` notifications surface in the bell whenever currentQty ≤ minLevel or < parLevel)*
- [x] Recipe cost simulator *(recipe detail → 🧪 Simulator button; per-ingredient % adjuster with live GP recompute, never writes the saved costing)*
- [x] Supplier performance tracking *(Reports → new section; per-supplier invoices/spend/avg/Δ-prices/last seen, sortable, expand-to-top-ingredients, CSV + print)*
