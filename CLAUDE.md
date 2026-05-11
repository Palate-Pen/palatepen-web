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

### Phase 2 — Pro Feature Depth

- [ ] Menu builder with full GP summary per menu
- [ ] Menu engineering reports (Star/Plough Horse/Dog/Puzzle)
- [ ] Waste tracking with £ cost impact
- [ ] Recipe photo upload
- [ ] Sub-recipes
- [ ] Locked recipe specs
- [x] Traffic light labelling
- [x] Calorie counts per dish and portion
- [ ] Dish spec sheets (printable)

### Phase 3 — Kitchen and Group Tier

- [ ] Multi-user access with team permissions
- [ ] Multiple outlets under one account
- [ ] Central kitchen management
- [ ] Supplier ordering from par levels
- [ ] Purchase order tracking
- [ ] Automated reorder suggestions
- [ ] Group-level reporting across all sites
- [ ] Demand forecasting
- [ ] Inter-site stock transfer

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

### Phase 6 — Mobile

- [ ] iOS app
- [ ] Android app
- [ ] RevenueCat for App Store and Google Play
- [ ] Offline mode
- [ ] Camera invoice scanning from phone

## Progress Log

When completing any roadmap item, add an entry here with the date, what was done, and any important technical notes.

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

## Known Issues

Document any bugs or issues found during development here.

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
