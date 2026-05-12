# CLAUDE.md — Palatable by Palate & Pen

Master project tracker. Keep this current — when work ships, update the relevant Roadmap checkbox and add an entry to the Progress Log below.

## Project Overview

Palatable by Palate & Pen — Back office work you can stomach. A professional chef toolkit built with Next.js, Supabase, Vercel, Cloudflare, Stripe and Anthropic API. Live at app.palateandpen.co.uk. Marketing site at palateandpen.co.uk. GitHub: Palate-Pen/palatepen-web.

## Tech Stack

- Frontend: Next.js 14, TypeScript, Tailwind CSS
- Backend/DB: Supabase (EU West London) project xbnsytrcvyayzdxezpha
- Hosting: Vercel
- Payments: Stripe (sandbox, switching to live before launch)
- AI: Anthropic API (server-side only, ANTHROPIC_API_KEY in Vercel)
- Email: Microsoft 365 jack@palateandpen.co.uk

## Brand

- Name: Palatable
- Tagline: Back office work you can stomach
- By Palate & Pen
- Logo: italic P + gold dot + alatable
- Colours: Ink #0E0C0A, Gold #C8960A, Cream #F0E8DC, Paper #FAF7F2
- Tiers: Free / Pro £25pm / Kitchen £59pm / Group £129pm

## Issue Tracking

GitHub Issues at https://github.com/Palate-Pen/palatepen-web/issues are reserved for **bugs and problems we hit, with the fix documented inline**. Each issue should describe the symptom, the root cause once known, and the resolution (commit SHA / PR / behaviour change). Apply the `Bug` label by default; add `Website` or `Payments` if it scopes there.

The forward-looking work list lives in the Roadmap section of this file — not in Issues. Tick the box and add a Progress Log entry when something ships.

## Roadmap

### Phase 1 — Foundation (In Progress)

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

### Phase 2 — Pro Feature Depth

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
- [ ] Make menu backgrounds more graphic and custom with imagery or textured treatments
- [x] CSV export of all recipes, costings and stock as separate downloadable files
- [x] CSV import for recipes, costings and stock with downloadable template files containing the correct headers
- [x] Scan a spec sheet with AI to import recipe data automatically
- [ ] Downloadable quick-start guide for new users explaining the CSV templates

### Phase 3 — Kitchen and Group Tier

- [x] Multi-user access with team permissions *(All 4 stages shipped — schema + contexts + Team UI + invite/accept + role gating + Stripe webhook to accounts.tier; legacy user_id RLS still in place pending cleanup, see Progress Log)*
- [ ] Multiple outlets under one account
- [ ] Central kitchen management
- [ ] Supplier ordering from par levels
- [ ] Purchase order tracking
- [ ] Automated reorder suggestions
- [ ] Group-level reporting across all sites
- [ ] Demand forecasting
- [ ] Inter-site stock transfer
- [ ] Group outlets in dashboard to show summary information per outlet including GP, stock value and alerts
- [ ] Allow Group tier users to create and manage multiple restaurants, pubs and outlets under one account

### Phase 4 — Digital and Integration

- [ ] Live digital menus
- [ ] Menus published to website with public URL
- [ ] QR code menus
- [ ] POS integration (Square, ePOSnow)
- [ ] Xero integration
- [ ] Email invoice forwarding
- [ ] API access

### Phase 5 — Intelligence Layer

- [ ] GP trend analysis per dish over time
- [ ] Menu profitability dashboard
- [ ] Ingredient price benchmarking
- [ ] Waste cost dashboard
- [ ] Smart reorder alerts
- [ ] Recipe cost simulator
- [ ] Supplier performance tracking

### Mobile — Responsive Web Polish

Near-term tweaks to the responsive web layout (≤768px). Distinct from the native iOS/Android effort below.

- [ ] Move alerts out of main navigation on mobile into a More tab
- [ ] Show invoice scanning prominently on mobile home screen
- [ ] Fix menu designer layout in mobile view

### Phase 6 — Mobile (Native)

- [ ] iOS app
- [ ] Android app
- [ ] RevenueCat for App Store and Google Play
- [ ] Offline mode
- [ ] Camera invoice scanning from phone

## Progress Log

When completing any roadmap item, add an entry here with the date, what was done, and any important technical notes.

### 2026-05-12

- **CSV export — Recipes / Costings / Stock.** New `src/lib/csv.ts` module with three exposed exports (`exportRecipesCsv`, `exportCostingsCsv`, `exportStockCsv`) backed by a shared `toCsv(headers, rows)` + `downloadCsv(filename, content)` pair. RFC-4180 quoting: any cell containing `"`, `,`, `\n`, or `\r` is wrapped in double quotes with internal `"` doubled. Line ending is `\r\n` for Excel-friendly opening. `downloadCsv` prepends a UTF-8 BOM (`﻿`) so Excel auto-detects the encoding without a manual import dialog, builds a `Blob` with `type: 'text/csv;charset=utf-8'`, creates an `<a download>` programmatically, clicks it, and cleans up the object URL after 100ms. Filenames are date-stamped (`palatable-recipes-YYYY-MM-DD.csv`) so multiple snapshots don't collide.
  - **Recipes columns (18):** ID, Title, Category, Servings, Prep Time, Cook Time, Source URL, Notes, Ingredients (` | ` separated), Method (` || ` separated), Contains Allergens, May Contain Allergens, Tree Nut Types, Cereal Types, Locked (Yes/No), Linked Costing ID, Photo URL, Created At (ISO).
  - **Costings columns (11):** ID, Dish Name, Sell Price, Cost per Cover, GP £, GP %, Target %, Portions, Currency, Saved At, Ingredients (each as `name × qty unit @price = line`, ` | ` separated).
  - **Stock columns (10):** ID, Name, Category, Unit, Current Qty, Par Level, Min Level, Unit Price (£), Last Counted, Created At.
  - UI: new "Export Data" card in `SettingsView`, sits between Defaults and Account Actions. Three stacked buttons (Recipes / Costings / Stock), each showing row count next to the label and disabled when the collection is empty. Available to every role — no perms gate, since this is the user's own data going to their own machine. The pre-existing stock report CSV download in `StockView.tsx:141` is unchanged (it's a different report — usage / variances over a period — not a raw table dump).

- **Allergen section rebuilt + immediate-edit visibility.** Replaces the previous two-section layout (Contains computed-only block + dashed May-Contain pill row + separate tree-nut/cereal name rows) with a single 14-row grid (2 cols on desktop, 1 on mobile). Each allergen has its own tri-state segmented control: `None` / `May` / `Contains`. **Effective state =** bank-computed contains ∪ user-manual override (`sel.allergens.contains`) for Contains, plus `sel.allergens.mayContain` for May. When a Bank-matched ingredient already implies Contains, the row buttons lock (no manual downgrade — change the Bank entry instead) and the row shows a `From Bank: chicken, butter` caption derived from the first 2 source ingredients. When the user sets Contains without bank backing, the row shows `Manual override` instead. Tree-nut and cereal sub-type pills appear inline beneath the grid only when the relevant allergen is contained; user can toggle additional types on top of bank-locked ones. Setting an allergen back to None / May clears the corresponding sub-type list. Compliance modal and Spec Sheet both now read **effective** contains + nut/cereal types (bank ∪ user) so manual overrides flow through. Recipe-list cards likewise show the union — the small short-code badges on each card now reflect bank-computed allergens, not just the legacy `r.allergens.contains` field.
- **Immediate edit visibility.** New `useEffect` synchronises the local `sel` snapshot from `state.recipes` whenever the recipe-state slice changes. Previously several mutations (allergen toggles, lock/unlock, photo upload/remove) dispatched `actions.updRecipe(sel.id, …)` but never called `setSel`, so the detail view kept showing stale data until the user navigated away and back. Now any `updRecipe` dispatch propagates into the open recipe view on the same render — toggle a state, see the colour and caption change instantly without flicker. The autosave effect's explicit `setSel` is still in place (it gives an immediate optimistic update before the dispatch round-trips through the reducer), so there's no regression on edit responsiveness either.

- **Inline ingredient editing on recipe detail** (commit `8ec1631`). Entering Edit Recipe mode now exposes the imported ingredient list as a vertical stack of text inputs with a `+ Add ingredient` button and a per-row remove (✕). State held in `editIngredients: string[]`, seeded from `sel.imported?.ingredients` when `openEdit()` fires. The existing 500ms autosave effect was extended to include ingredients — on each keystroke it debounces, then `actions.updRecipe(sel.id, { ..., imported: { ...(sel.imported||{}), ingredients: cleanIngs } })`. Whitespace-only rows are dropped before save. If the recipe had no prior `imported` block, the update only writes one when at least one ingredient is non-empty (avoids creating phantom `imported: { ingredients: [] }` rows). Allergens + nutrition still derive from the linked costing's Bank-matched ingredients — the imported string list is informational/printable only.
- **Inline costing builder on recipe detail** (commit `8ec1631`). When a recipe has no linked costing, the costing panel's empty state now shows an `+ Add costing for this dish` button. Clicking it expands an inline costing form inside the same card with: sell price + portions inputs, an editable ingredient table (name / qty / unit kg-g-L-ml-each-bunch-tbsp / cost-per-unit / computed line / remove), `+ Add ingredient` button, live 4-cell GP summary (Sell / Cost-per-cover / GP £ / GP %) coloured against `gpTarget`, and Save. Ingredients are seeded from `sel.imported?.ingredients` (each imported string lands in the `name` field; user fills qty/unit/price). Portions default to `sel.imported.servings` if parseable, else 1. Line cost uses the same g→kg / ml→L conversion as `CostingView`. On save, calls `actions.addGP({ id, name: sel.title, sell, cost, gp, pct, target, portions, ingredients, currency: 'GBP' })` then `actions.updRecipe(sel.id, { linkedCostingId: newId })` so the new costing is immediately linked and the existing costing panel takes over. Ingredient name `onBlur` autofills `price` from the Bank when the name matches — same pattern as `CostingView.autofillPrice`. Disabled when `sel.locked` is true. Save button gated by "at least one named ingredient + sell > 0".
- **Roadmap additions.** Phase 1: inline ingredient editing + Add-costing-now button (both shipped same commit, ticked above). Phase 2: CSV export of recipes/costings/stock as separate files, CSV import with downloadable templates, AI spec-sheet scan into a recipe, and a downloadable quick-start guide explaining the CSV templates (all open).

### 2026-05-11

- Project initiated, full stack live
- Stripe integrated with Pro/Kitchen/Group tiers
- Palatable brand locked in (renamed from Mise)
- Admin panel built (Overview/Users/Audit/Settings, light theme, gold accent)
- Anthropic API wired server-side
- on_auth_user_created Postgres trigger: signup auto-creates user_data row (migration 001), with email backfill (002) and admin_audit_log table (003)
- Comp-tier mechanism in admin: tier dropdown (Free/Pro/Kitchen/Group) + "Free upgrade — no Stripe charge" toggle; profile.comp excluded from MRR
- Audit log: server-side audit() helper records update_user / initialize_user / delete_user / test_signup with before→after diff, viewable in Audit tab with action filter + per-user filter
- Diagnosed Next.js fetch cache issue masking admin GET reads (see Important Notes)
- Audit confirmed already-shipped Phase 1 items: stock inline editing, stock/ingredient categories, business-min-GP-bar removed from CostingView
- Allergen tracking: per-recipe toggle UI in RecipesView, two tag sets (Contains red / May contain dashed gold), 14 UK FIR allergens, compact short-code pills on recipe list cards
- Allergen sub-types: when Nuts is contained, name-the-nut sub-row (Almond/Hazelnut/Walnut/Cashew/Pecan/Brazil/Pistachio/Macadamia); when Gluten is contained, name-the-cereal sub-row (Wheat/Rye/Barley/Oats/Spelt/Kamut). Per UK FIR 2014.
- Run Compliance Check button on each recipe — modal scores against UK FIR 2014 (14 allergens, name-the-nut, name-the-cereal) plus Natasha's Law (recipe name, full ingredient list). Pass/Warn/Fail per check, summary banner Compliant / Not Compliant.
- Bank promoted to first-class tab (`BankView`) with full CRUD per ingredient: name, category, unit, price, allergens (with name-the-nut and name-the-cereal sub-types), Big-7+fibre nutrition per 100g/ml. Bank is the source of truth for ingredient facts.
- Recipe Contains-allergens are now COMPUTED from the linked costing's ingredients matched to Bank entries (was per-recipe). Per-recipe `mayContain` (cross-contamination) stays editable. Removes per-recipe Contains UI entirely (existing data ignored). Compliance check reads computed values + reports unmatched ingredients.
- Recipe nutrition table (Big 7 + fibre) computed by scaling each Bank ingredient's per-100g values by the costing-line grams. Coverage % shown when some ingredients lack nutrition data. Per-portion = total ÷ costing portions.
- Categories restructured to 18 specific items (Meat & Poultry, Fish & Seafood, Dairy & Eggs, Fresh Produce, Fresh Herbs, Dry Goods & Grains, Tinned & Preserved, Oils & Vinegars, Condiments & Sauces, Spices & Seasonings, Bakery & Pastry, Frozen Meat & Fish, Frozen Produce, Frozen Pastry, Beverages, Cleaning & Chemicals, Disposables & Packaging, Other). Single source of truth in src/lib/categorize.ts. Bank/Stock/Invoices all import from there. Auto-categorize keywords updated. migrateCategory() runs on load to remap legacy names (Meat & Fish → Meat & Poultry, Dairy → Dairy & Eggs, Produce → Fresh Produce, etc.).
- UK FOP traffic light labels on the recipe nutrition table — fat / saturates / sugars / salt get LOW/MED/HIGH pills coloured green/amber/red per the 2013 DH thresholds, computed per 100g of finished dish (using the bank-matched ingredient weight). Energy and fibre stay info-only.
- Printable dish spec sheets — "Spec Sheet" button on recipe detail opens an A4-styled overlay with title/category/portions/sell/GP, ingredient list, computed Contains allergens (with name-the-nut/cereal sub-types), May Contain, and a nutrition table per portion + per 100g + FOP traffic lights. Print button uses `window.print()`; `@media print` CSS hides everything except `#spec-sheet-print` so the rest of the app doesn't print. Always rendered in light mode for paper readability regardless of the user's app theme.
- Locked recipe specs — `recipe.locked: boolean` (jsonb, no schema migration). Lock button in recipe detail header, instant lock; unlock requires a confirm step. When locked: Edit button disabled, costing reassignment disabled, May Contain toggles disabled, notes textarea readonly, Delete button hidden. Lock icon (🔒) shown in detail header AND on the recipe card in the list. In a future multi-user world this becomes role-checked; for now the user is implicitly the admin.
- Sub-recipes — costing's ingredient autocomplete lists matching recipes (with linked costing) under a "Sub-recipes" header. Picking one sets unit=each, price = cost-per-portion of the linked costing, stamps `ing.sourceRecipeId`. Sub-recipe ingredient lines show a gold "RECIPE" chip. Recipe detail has a "Used in" section listing dishes that consume this recipe via `sourceRecipeId`. Cost is snapshotted at pick time — sub-recipe price changes don't auto-propagate; users re-open dependent dishes.
- Recipe photo upload — Supabase Storage bucket `recipe-photos` (public read, owner-only write per `auth.uid()` folder). Path: `{user_id}/{recipe_id}-{ts}.jpg`. Client-side resize to 1600px JPEG q0.85 before upload. UI in two places: dropzone in the Add Recipe modal (preview only, uploads after Save) and on the recipe detail (immediate upload, with Replace/Remove). Photo URL stored on `recipe.photoUrl`; storage path on `recipe.photoPath` for delete-on-replace. Migration 006_recipe_photos_bucket.sql provisions the bucket + RLS.
- Menu engineering reports — Kasavana & Smith Star / Plough Horse / Puzzle / Dog classification on each menu detail. Per-dish covers entry, sales mix % computed from total. Profitability split = above/below menu average contribution margin (sell − cost). Popularity split = mix ≥ 70% × fair share (1/N). 2×2 quadrant grid with dishes listed per cell, sortable table with quadrant badges, plus advice per quadrant. Sales data persists as `menu.salesData: { recipeId: covers }` on the menu jsonb — no migration.
  - **Sales data dependency:** today covers are entered manually per menu per period. Phase 4's POS integration (Square / ePOSnow — see roadmap) needs to populate `menu.salesData` automatically when an order syncs. Mapping: POS line item → match by recipe.title (or a future `recipe.posSku` field) → increment covers for the live menu. Manual entry stays as the fallback. The in-app engineering panel already shows a Coming-in-Phase-4 note pointing at this so the chef knows what's planned.
- Audit tick on already-shipped Phase 2 items: Menu builder with full GP summary (MenuBuilderView shows blended GP, total sell, total cost, lowest-GP dish, uncosted count per menu) and Waste tracking with £ cost impact (WasteView — per-ingredient log, 9 reasons, cost auto-computed from bank, CSV export, summary cards, dashboard rollup).
- Menu orphan handling: deleting a recipe now cascades into menus — the id is stripped from `menu.recipeIds` and `menu.salesData` in the `DEL_RECIPE` reducer. Pre-existing orphan rows render with red tint, italic "Recipe no longer exists" text, a Removed pill, and a one-click Clean Up banner above the dish table that prunes all orphans for that menu. Replaces the silent "(deleted recipe)" label.
- **My Team promoted to full team-management dashboard.** The team-management UI (invite, change role, remove, pending invites) moved out of Settings → TeamSection (file deleted) and lives entirely in the My Team tab. Access widened from Owner-only to Owner + Manager (Chef and Viewer still don't see the tab) so Manager's "invite team" capability is preserved post-move. Layout follows the Dashboard aesthetic: top stats row of 4 tiles (Members / Seats available / Pending invites / Contributions), member tile grid (`auto-fill, minmax(260px, 1fr)`) where each tile shows avatar, name, email, role pill, joined date, and contribution count; click opens a centered modal with full role/joined/contribution-total header, contribution breakdown stat grid, recent activity (last 8 across recipes/costings/menus/notes), and Remove from team button. Role select sits inside the modal; "Transfer ownership →" option is only shown when `yourRole === 'owner'`. Pending invites render below the tile grid in a compact list with copy-link / revoke. Invite modal preserved (email + role select + post-create URL with copy button). + Invite member button at the top-right is hidden when seat limit is reached, replaced by an inline upgrade nudge below the grid.
- **Owner-only "My Team" tab** shipped. New sidebar item between Reports and Settings, visible only when `currentRole === 'owner'` AND `tier ∈ {kitchen, group}` (filtered in `Sidebar.tsx`'s NAV.filter step). View at `/app/?tab=team` (well, internal `tab` state) renders one expandable card per team member with avatar, name, email, role pill, joined date, and a per-member contribution count derived from items in `state.*` whose `addedBy` matches the member's user_id. Click expands to a 4×2 stat grid (Recipes / Costings / Menus / Notes / Bank / Stock / Waste / Invoices) plus a "Recent" list of their last 8 items across recipes/costings/menus/notes. Owner viewing themselves shows "(you)". For attribution, AppContext now stamps `addedBy = user.id` on every newly-created item across all 9 collections — `addRecipe`, `addNote`, `addGP`, `addStock`, `addInvoice`, `addMenu`, `addWaste`, plus `addBank` / `upsertBank`. Existing items predating this commit don't have `addedBy`, so contribution counts will show 0 for everyone initially and build up as the team uses the app. The merge flow from the previous commit also tags merged items with `addedBy` — those will surface immediately in My Team. Tab is gated defensively in the view component too (renders an "owner-only" message if reached by URL on a non-owner role) so the perm check holds even if Sidebar filtering misses something.
- **Free → paid invite: ask + merge** shipped. When an existing Free-tier user is invited to a Kitchen/Group team, the invite acceptance page (`/invite/[token]`) now offers a choice: **Keep my account separate** (today's behaviour, two memberships, two switcher entries) or **Merge into [Team Name]** (their personal data is folded into the team's `user_data` and the personal account is deleted). Merge logic in `/api/invites/[token]/accept` (when body `{ merge: true }`): looks up the user's owned Free-tier account, reads its user_data, tags every item with `addedBy = userId` for chef-space attribution (forward-compat for "filter by chef" UI later), appends to the team's arrays. Bank ingredients dedupe by lowercase name (team's existing entry wins — we don't overwrite price or allergen data). After the merge, the personal account row is deleted (cascade removes membership + user_data). The GET `/api/invites/[token]` endpoint extended: when an `Authorization: Bearer` header is present, the response includes `userContext` with `hasMergeablePersonal`, item counts, and a `totalItems` summary so the page can render a meaningful "Move 12 recipes, 5 costings into Team" preview. The acceptance page only shows the merge prompt when the user has a Free-tier owned account distinct from the team — paid personal accounts are never auto-dissolved (people pay for them deliberately). New invite-signups (skipPersonal flag from Stage 4) have no personal account so they don't see the prompt either. `/app`'s pending-invite handler simplified: instead of auto-accepting, it redirects to `/invite/[token]` so the merge choice is never bypassed.
- **Multi-user — Stage 4 of 4 (role gating + Stripe→accounts + invite-signup polish)** shipped. (a) Stripe webhook now mirrors `tier`, `stripe_customer_id`, `stripe_subscription_id` to `public.accounts` on every owned account when `checkout.session.completed` fires; on `customer.subscription.deleted` it looks up the account via `accounts.stripe_customer_id` first (source of truth) and falls back to `auth.users.user_metadata.stripe_customer` for legacy customers — accounts get downgraded to `free` and `stripe_subscription_id` cleared. (b) New `src/lib/perms.ts` with `permsForRole(role)` returning a fully-typed perms record (`canEditContent`, `canEditPricing`, `canEditMenus`, `canEditInvoices`, `canManageBank`, `canManageTeam`, `canManageBilling`, `canManageSettings`, `isReadOnly`, plus a `reason` string for tooltips) and `usePerms()` hook reading from `useAuth().currentRole`. (c) New `RoleBanner` component renders a sticky strip at the top of `/app` for Chef and Viewer roles only (Owner/Manager get clean UI) showing their role, the constraint reason, and the active account name. (d) Gates applied: SettingsView (Defaults card hidden for non-managers, Account name/location disabled for non-managers, Upgrade button hidden for non-owners, Delete Account hidden for non-owners), CostingView (Save Costing button + Delete from history disabled for non-managers with tooltip), MenuBuilderView (+ Add Menu, + Add Dish, Menu Designer, Delete Menu, row arrows + remove buttons all hidden for non-managers — viewing menus + engineering still works), Sidebar (Upgrade CTA hidden for non-owners). (e) Invite-driven signup polish: `/invite/[token]` stashes the token in sessionStorage before the auth bounce; `/app` reads it on mount (URL param OR sessionStorage) and redeems it once auth resolves; AuthContext.signUp accepts `{ skipPersonal: boolean }`; AuthPage detects pending invite and passes `skipPersonal=true`; migration 008 updates the `handle_new_user` trigger to honor `raw_user_meta_data.skipPersonal` and short-circuit personal-account creation. Net: invited chefs end up with exactly one membership (the team they joined), no orphan personal account, no sidebar switcher noise. (f) Admin PATCH route (`/api/admin/users/[userId]`) now mirrors `tier` and `name` from profile to the user's owned accounts so admin tier/name edits propagate to the live app reads. **Not yet done in Stage 4:** dropping the legacy `user_data.user_id`-based RLS policies (parked — keeping them additive means no risk of locking ourselves out, and the membership-path policies are doing the real work). BankView per-ingredient unit-price gating for Chef vs Manager (Chef can edit allergens/nutrition but not price). Viewer-mode banner showing across all writable views (currently they just see Chef-equivalent disabled buttons, which is functionally correct but not maximally clear).
- **Multi-user — Stage 3 of 4 (Team UI + invite/accept flow)** shipped. New `src/lib/team.ts` central helpers: `verifyMember(req, accountId, minRole)` (bearer-token check + RLS-equivalent role gate), `verifyAuthed(req)` (just-authed, no account check), `seatUsage(supabase, accountId, tier)` (counts members + non-expired pending invites against `SEAT_LIMITS = { free: 1, pro: 1, kitchen: 10, group: undefined }`), `roleAtLeast`, `genInviteToken` (32 bytes hex via crypto.getRandomValues). API routes added under `/api/accounts/[id]/`: `team` (GET — enriched members + invites + seats, viewer+), `invites` (POST — create with seat/dup checks, manager+), `invites/[inviteId]` (DELETE revoke, manager+), `members/[userId]` (PATCH change role / transfer ownership, DELETE remove, manager+). Public-with-token routes: `/api/invites/[token]` (GET — anonymous lookup for landing page) and `/api/invites/[token]/accept` (POST — authed, idempotent membership upsert + invite mark-accepted). Owner cannot be demoted directly; promoting another member to owner is treated as ownership transfer (target → owner, caller → manager, accounts.owner_user_id moves). `TeamSection` component renders inside SettingsView for Owner/Manager only — members table with avatar/role-select/remove, pending invites table with copy-link/revoke, "+ Invite member" button (disabled at seat limit) opens modal that creates the invite and shows the URL with a copy button. Email delivery isn't wired yet (deliberately — keeps the dependency surface small for v1); inviter copies the link and shares via their preferred channel. Invite landing page at `/invite/[token]` renders the account name + role + email, prompts sign-in if anonymous, accept button if authed → calls accept → refreshAccounts + switchAccount + redirects to /app. New `src/app/invite/layout.tsx` wraps the route with AuthProvider since it sits outside /app. `next.config.js` host-rewrite exclusion regex extended to keep /invite from being rewritten on app.palateandpen.co.uk. Stage 4 (role-based UI gating across the app, Stripe webhook → accounts.tier, drop legacy user_id RLS) still ahead.
- **Multi-user — Stage 2 of 4 (account-aware contexts + sidebar switcher)** shipped. AuthContext now exposes `accounts: Membership[]`, `currentAccount`, `currentRole`, `switchAccount(id)` and `refreshAccounts()` alongside the original surface (existing `{user, loading, tier, signIn, signUp, signOut}` consumers untouched). Active account id is persisted to `localStorage.palatable_active_account_id` so the choice survives reloads. Default pick: stored choice if still a member, else first owned account, else first membership. `tier` is now sourced from `currentAccount.tier` first, falling back to `user_metadata.tier`. AppContext loads `user_data` by `account_id` instead of `user_id`; upserts always write `user_id = account.owner_user_id` so the unique row resolves to the same record regardless of who's editing (chef on employer's account writes the owner's row, RLS allows via membership policy). New `RESET` reducer action clears state when account changes mid-session so the loader shows during the swap. Sidebar gets an account switcher chip below the brand block — only renders when `accounts.length > 1`, click opens a dropdown with role pills and a checkmark on current. Loader-vs-AuthPage flow restructured: if loading → loader; if !user → AuthPage; if !currentAccount or !state.ready → loader. Stage 3 (Team UI + invite flow + email) and Stage 4 (role-based UI gating + Stripe webhook → accounts.tier, drop legacy user_id RLS) still ahead.
- **Multi-user — Stage 1 of 4 (schema + backfill)** shipped via migration 007. Introduces `accounts`, `account_members`, `account_invites` tables with role hierarchy `owner > manager > chef > viewer`. Roles: Owner = billing + delete; Manager = edit everything + invite; Chef = edit recipes/notes/waste/stock counts but not menus/pricing; Viewer = read-only. Tier seat limits: Free 1 / Pro 1 / Kitchen 10 / Group unlimited (enforced in Stage 3 invite flow, not yet at SQL level). Backfill: every existing user_data row → account they own, `account.id` aliased to `user.id` for clean transition. `user_data.account_id` column added (nullable, backfilled). Two RLS helpers — `is_account_member(account_id)` and `role_at_least(account_id, min_role)` — power additive RLS policies; legacy `user_id`-based policies stay so the app keeps working unchanged. `handle_new_user` trigger now creates account + owner-membership alongside the user_data row. Stage 2 (AuthContext loads accounts list + currentRole, AppContext loads by account_id, sidebar account switcher), Stage 3 (Team UI + invite flow + email), Stage 4 (role-based UI gating + Stripe webhook → accounts.tier, drop legacy user_id RLS) still ahead.

## Known Issues

- **Menu Designer layout broken in mobile view.** `MenuDesigner.tsx` (the full-screen overlay opened from a menu detail) was built around the desktop A4 preview + side controls panel and hasn't been touched in the mobile responsive pass. Below 768px the controls + preview overlap and become unusable. Needs a mobile layout — either stack controls above preview, or make controls a slide-up sheet over the preview, then hide the overlay's print preview at small widths.

## Important Notes

- All file writes use Node.js scripts to avoid Windows encoding issues
- Settings persist via localStorage key palatable_settings_v2
- App root div ID is palatable-app-root for zoom-based font scaling
- Stripe webhook endpoint: app.palateandpen.co.uk/api/stripe/webhook
- Invoice scanning requires Pro tier — checked server-side
- Demo account: jack@palateandpen.co.uk (Pro tier)
- **supabase-js + Next.js fetch cache**: supabase-js calls global `fetch()` internally, and Next.js auto-caches GET `fetch()` calls in route handlers — even with `dynamic = 'force-dynamic'`. Symptom: server-side reads return phantom rows that no longer exist in Postgres. Fix: pass a custom `global.fetch` to `createClient` that wraps `fetch` with `cache: 'no-store'`. Centralized as `svc()` in `src/lib/admin.ts` — use it for any admin/server-role Supabase client. (Writes via PATCH/POST/DELETE are not cached, so this only affects GETs.)
- **AppContext load effect must depend on `user?.id`, not `user`**: the `user` object reference changes on every Supabase auth event including silent token refreshes (~hourly). If the load effect lists `[user]` in its deps, every refresh re-fetches user_data and overwrites in-flight local edits. Use `[user?.id]` so the effect only re-runs when the actual user changes. Same for the autosave effect.
- **Autosave**: 500ms debounced upsert in AppContext. Surfaces a save-status pill (Saving / Saved / ✗ Save failed) in the bottom-right of /app. Errors are logged via `console.error('[user_data save]', code, message)`. A `visibilitychange → hidden` listener flushes pending writes when the tab is about to close — best-effort, no sendBeacon (Supabase auth header isn't supported there).
- supabase-js `.insert(...)` without `.select()` can resolve before PostgREST commits when RLS is enabled. The shared `audit()` helper uses `.insert(...).select().single()` so the await fully round-trips.
- Sensitive Vercel env vars (Stripe, Supabase service role, Anthropic) cannot be pulled to local `.env.local`. To run admin/server routes locally that need them, paste manually. Pulled values come back as empty strings.
- **Migrations run manually in Supabase SQL editor.** No supabase-cli pipeline yet — when a new migration lands in `supabase/migrations/NNN_*.sql`, paste it into the Supabase SQL editor and run it. Migration 007 (multi-user accounts) is the most recent and must be run before Stage 2 work begins.
- **Anthropic credit balance is a live operational dependency.** Recipe import (`/api/palatable/import-recipe`) and invoice scanning (`/api/palatable/scan-invoice`) both call Sonnet 4.6 via api.anthropic.com. If the balance hits £0 the API returns HTTP 400 "Your credit balance is too low" — the UI surfaces this as a clear error pill but the feature is dead until topped up. Top-up: https://console.anthropic.com/settings/plans. Cost is roughly $0.005 per import or scan with Sonnet 4.6 — small refills go a long way.
