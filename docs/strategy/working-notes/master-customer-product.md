# Master view — Palatable customer product

*The strategic shape of the customer product. Final form after all decisions locked 2026-05-14.*

---

## The product, restated

Palatable is one product, three role-aware shells. Same underlying data, three different ways into it, each calibrated to who's looking and what they need. The chef opens a calm, low-density kitchen tool. The manager opens an operational site view. The owner opens a strategic business view. Visual language is shared. Information density is role-aware.

The shape below was worked out from a 14-tab capability set down to a clean, purposeful navigation per role. *Tidy station = tidy mind = clean good food.*

---

## Chef shell — *the sous chef*

The chef opens Palatable in the morning, gets a coffee, and wants to know what they need to know fast, without navigating anywhere. Then through the day they reach for specific tools as the work demands.

### Top-level navigation

1. **Home** — morning brief and quick actions. *Default surface; opens when the chef launches the app.*
2. **Recipes** — *what do we make?* Library, authoring, inline costing happens here, simulator runs from inside a recipe.
3. **Costing** — *what does it cost us?* The cost book. Library overview of every costing in the kitchen with grid view, GP %, sale price, last-costed date, drift flags, click-through to recipe.
4. **Margins** — *how is my menu performing?* The chef's menu performance dashboard. Every dish on the menu, GP trends, drift flags, which dishes are exposed to which supplier price moves, which are slipping.
5. **Stock & Suppliers** — what's in the kitchen, who supplies it, what it costs, what's been wasted. Four current tabs (Bank, Invoices, Suppliers, Waste) folded into one consolidated surface.
6. **Notebook** — the digital kitchen notebook. Private by default, optional sharing. Treated as a key product feature, not a freeform notes page (see below).
7. **Inbox** — persistent intelligence feed. Alerts, briefs, actionable items.

Plus *Profile* and *Settings* as bottom-of-nav utilities.

Seven destinations. Down from fourteen. Each answers a specific chef question.

### The chef home surface

**Morning brief** at the top, curated by the Inbox dispatcher:
- Heads-up alerts (margin slips, price spikes, supplier issues, credit notes pending)
- Today's deliveries due and anything flagged
- Stock alerts (running low against par, expiring)
- One-line orientation: *"Three things to look at, two deliveries due, all margins healthy."*

**Quick actions** below:
- Scan an invoice
- Count stock
- Open a recipe
- Log waste

Replaces the current Dashboard tab entirely for chef users.

### Costing vs Margins — different jobs

Both stay as top-level tabs because they answer different questions:

- **Costing** = *edit and maintain the cost book.* Library of every costing, drift detection, authoring inline from recipes. The cost book itself.
- **Margins** = *how is the cost book performing over time?* Performance dashboard. Trends, slipping dishes, supplier exposure, what to investigate.

The flow between them matters: from a slipping dish in Margins, one click should drop you into that dish's Costing entry to investigate or fix.

### Margins — chef version specifically

Margins follows the same role-scoped pattern as Home: same surface, different default scope per role.

- **Chef Margins** — *my menu's performance.* Every dish on the chef's menu, GP %, trend arrows, drift flags, supplier exposure. The chef's daily/weekly view of how their menu is doing.
- **Manager Margins** — *this site's performance plus operational drill-down.* Which supplier is the issue, which PO to renegotiate, which dish to remove.
- **Owner Margins** — *group rollup, supplier benchmarking across all sites, inflation tracking across the basket.*

Same data, role-scoped default scope. Same pattern as Home.

### Stock & Suppliers consolidation

Four current tabs fold into one surface for chef and manager:

- **Bank** (ingredient catalogue with prices, sparkline trends, allergen data)
- **Invoices** (AI-scanned invoices feeding Bank prices)
- **Suppliers** (directory, reliability scores, credit notes)
- **Waste** (waste log feeding cost intelligence and stock reconciliation)

These are four views of the same data graph: *ingredients ← invoices ← suppliers ← prices, with waste closing the loop.* Forcing context-switch between them is friction. One consolidated tab with sections inside is cleaner.

The "Invoice scan" quick action stays prominent on the home screen — it's frequent and time-sensitive — but the inventory of past invoices, the supplier directory, the ingredient bank, and the waste log all live in one consolidated tab.

Naming TBD. "Stock & Suppliers" is descriptive. Could also be "Larder" or "Kitchen" or similar — open question for naming.

### Notebook — promoted to key feature

Notebook is not a freeform notes page that exists because some products have one. It's a deliberate product feature: **the digital kitchen notebook that replaces the oil-stained paper one in every chef's apron.**

What it does:
- **Persistence** — never ruined by oil, water, fire, or the dishwasher
- **Search** — find that thing you wrote three months ago in 2 seconds
- **Linkability** — notes attach to dishes, recipes, suppliers, ingredients
- **Shareability** — private by default, optional sharing into the account so other chefs see what the author chooses to share
- **Syncability** — phone, tablet, desktop, across sites
- **Multi-format** — handwritten notes (touchscreen / stylus), voice memos, photos paired with notes, sketches of plating, ingredient experiments with taggable outcomes
- **Mobile-first** — chefs are on their feet, not at a desk

Privacy model: chef-private by default. The chef chooses what to share into the account. Menu development, prep technique notes, supplier feedback — that's IP the chef may or may not want shared upward to managers or owners.

This is the only feature in Palatable that no competitor has. Operational moat. Worth building properly.

### What's hidden from chef shell entirely

- Reports (operational reporting belongs to manager/owner shells)
- Menus (menu building and publishing is usually GM/owner work — chef can access when working on a new launch, not daily)
- My Team (team management is manager/owner work)
- Financial reports, multi-site comparisons, P&L analytics, accounting integrations
- Account billing, plan management, Admin
- Dashboard (replaced by chef home morning brief)

### Design intent — chef shell

Calm, low-density, mobile-first. The chef shouldn't have to think about where to look. Most days the morning brief is "all clear" and the chef closes the app and goes cooking. Some days it surfaces something to act on, and the action is one tap away.

---

## Manager shell — *site operational status*

The GM or kitchen manager opens Palatable mid-morning or between services. They want to know how the site is running.

### Top-level navigation

1. **Home** — site status. Today's prep, alerts requiring action, this week's waste vs last, margin movements worth knowing about
2. **Recipes** — same library as chef sees, manager often looking up rather than authoring
3. **Costing** — same library overview as chef, often investigating drift or running scenarios
4. **Margins** — this site's performance plus operational drill-down (which supplier is the issue, which PO to renegotiate)
5. **Stock & Suppliers** — full operational tools. POs to approve, credit notes in progress, par level management
6. **Menus** — menu publishing and digital menu management
7. **Reports** — site-specific operational reporting
8. **My Team** — team management for this site
9. **Notebook** — same as chef sees, with visibility into what's been shared into the account
10. **Inbox** — manager-routed intelligence feed

Roughly ten destinations. Higher density than chef, which is acceptable — managers are at desks, not on the pass.

### Design intent — manager shell

Operational density is fine here. Information-rich but task-organised. The manager's job is to make sure the site runs, so the surface is built around exception management: *what needs my attention today.*

---

## Owner shell — *the business view*

Owner or operations director opens Palatable on a Sunday evening, or when they want to check on the business. They're not in the kitchen. Strategic, analytical, calm.

### Top-level navigation

1. **Home** — business pulse. Group GP this week/month/vs last period. Margin alerts across sites. Cost of goods trend. Supplier spend by site. Top-line operational alerts.
2. **Margins** — multi-site analytical surface. Cross-site comparisons, supplier benchmarking, menu engineering across all sites, inflation tracking.
3. **Reports** — financial reports, exports for accounting, period summaries
4. **Sites** — *new surface, group-level sites overview.* Five sites at a glance, performance comparison, drill-into-any-one. (Detail below.)
5. **Suppliers** — group-level supplier intelligence. Where am I overpaying, where contracts could renegotiate, supplier reliability across the group.
6. **Team & Outlets** — administer team, manage outlets, role assignment
7. **Inbox** — owner-routed strategic feed. Weekly digest, significant margin movements, exceptional supplier behaviour
8. **Settings & Billing** — plan, billing, account management

Eight destinations. Strategic-not-operational.

### The Sites overview surface

New build. Currently the multi-outlet feature exists at a data level (outlets are scoped, switcher exists per outlet) but there isn't a group-level sites overview where owners see "here are my five sites at a glance, here's how each is performing, drill into any one."

This is a meaningful build. Jack has existing pre-reframing thinking to reference; this becomes a real v1 build with the role-aware-shell context applied.

### Owner shell tier scoping

Owner shell only renders for users with owner role at **Group or Enterprise tier**. Below that, single-site Pro/Kitchen owner-operators see the chef or manager shell (they typically *are* the chef/manager of their own single-site business). Owner shell is fundamentally a multi-site experience.

### Design intent — owner shell

Strategic, analytical, calm. The owner is making decisions about money and direction. Surface answers, not raw data. Trend lines, not numbers. Exceptions worth knowing about, not everything that happened. This is the surface that justifies the contract value at Group/Enterprise tier.

---

## Cross-shell mechanics

### Role detection and shell rendering

Every user has a primary role per outlet (chef / manager / owner). At session start:

1. Detect the user's primary role
2. Detect their active outlet (or for owner at Group+ tier, default to group view across all outlets)
3. Render the corresponding shell
4. Surface switcher in the header allows flip between shells the user is entitled to

Permission gating stays separate from shell rendering. An owner can flip to chef shell to author a recipe (they have permission). A chef cannot flip to owner shell (they don't).

### Surface switcher behaviour — per role

Each role has its own preferred surface preference. When you switch role, you land in that role's default view, not the surface you last used.

*Example:* Jack is the owner of his business but also writes recipes. He spends most of his time in owner shell. When he switches to chef shell (to write a new recipe), he lands in his chef preferences — chef home, with the morning brief he's configured. He doesn't carry his owner-shell state into chef-shell. Each role has its own context.

### The Inbox surface — shared mechanic

Every shell has an Inbox. Same underlying notification engine routes items to the right recipients based on role + outlet + account. Detailed design lives in the shared infrastructure document.

### The visual register across shells

All three shells share the Palate & Pen visual language: Cormorant Garamond + Cinzel + clean sans, deep ink black backgrounds, warm cream text, gold accents, editorial whitespace, restrained motion. Density and information hierarchy vary by shell; the aesthetic is consistent.

This is what makes it one product, not three. The chef and the owner of the same business should feel they're using the same tool, just in different modes.

---

## What's built vs what's missing

### Built and reusable across shells
Recipes (full), Costing (workbench — to become library overview), Stock counting, Waste log, Invoices with AI scanning, Bank ingredient catalogue, Suppliers directory, Menus, Team management, Multi-outlet scoping, Tier gating, Permissions, Stripe billing, Notebook (basic).

### Built but needs restructuring
- Dashboard → becomes role-aware home (chef / manager / owner home surfaces)
- Costing tab → reframes from authoring workbench to library overview (authoring lives inline in Recipes, where it partially already does)
- Reports → shrinks to operational reporting; analytical content moves to Margins
- Bank + Invoices + Suppliers + Waste → consolidated into Stock & Suppliers for chef/manager shells
- Notebook → expanded from basic notes into the full digital kitchen notebook described above

### Not built — required for v1
- **Role-aware shell rendering** — currently one shell, perms-filtered. Needs to become three shells with surface switcher.
- **Inbox surface** — persistent intelligence feed, role-routed. Currently no equivalent.
- **Chef home morning brief** — curated daily orientation
- **Manager home site status** — site-level operational summary
- **Owner home business pulse** — strategic group-level view
- **Margins tab** — analytical surface across all three shells, role-scoped
- **Margin leakage detection** — proactive alerts when GP slips with root cause attribution. The headline v1 intelligence feature.
- **Credit note workflow** — automated supplier chase. Discrepancy detection exists; automated chase doesn't.
- **Sites overview (owner shell)** — group-level site-comparison surface
- **Notebook expansion** — voice memos, photos, sketches, sharing model, search, linkability

---

## What this document is and isn't

**Is:** the final strategic shape of the customer product. What each shell contains. What's consolidated. What's new. What's hidden.

**Isn't:** the implementation order (see `pre-launch-build-sequence.md` — rewritten to match this shape), the visual design of any surface (your visual work), or the inventory of features (lives in `feature-inventory-2026-05-14.md`).

This is the spec. Build to it.

---

## Appendix — Rationale behind the customer product shape

*Added after the master view landed, to preserve the reasoning behind structural decisions.*

### Why three role-aware shells rather than one shell with permissions

The current product has one shell with 14 sidebar items. Permissions filter behaviour — a chef sees disabled buttons where they don't have access. A chef and an owner see the same shell with different things enabled.

This sounds efficient but creates two real problems:
1. **Navigation density.** 14 items is too many for a chef on a phone. Too few for an owner who needs cross-site analytics. One nav can't serve both.
2. **Mental model mismatch.** A chef thinks about their kitchen; an owner thinks about their business. Showing both the same shell forces both to translate.

Three role-aware shells (chef / manager / owner) give each role a calibrated experience. Same underlying data, three different ways into it. Permission gating stays separate — an owner *can* flip to chef shell to author a recipe (they have permission), they just don't *default* there. The shell is the *experience*; permissions are the *access control*. Different concerns.

### Why Margins as chef-primary tab (and the original push-back was wrong)

Earlier in the strategic session, the read was "Margins is owner/manager-primary, chef gets alerts via Inbox." That was wrong, and Jack corrected it on first sight of the shape.

The chef question Margins answers is *"how is my menu performing dish by dish, right now?"* That's a daily operational question, not an accounting one. Chefs care deeply about which dishes are healthy, which are slipping, which are exposed to which suppliers. They make decisions about menu changes, supplier negotiations, and what to push on service based on this read.

What's different between roles is the *default scope*:
- Chef Margins → my menu's performance
- Manager Margins → this site's performance + operational drill-down
- Owner Margins → group rollup, supplier benchmarking across sites

Same surface, three role-scoped defaults. Same pattern as Home (chef morning brief / manager site status / owner business pulse).

### Why Bank + Invoices + Suppliers + Waste consolidate

Four tabs, but they're four views of the same data graph: *ingredients ← invoices ← suppliers ← prices, with waste closing the loop on consumption.* They were built as separate tabs because they were built separately. Conceptually, they're one mental surface: *managing what you buy and what it costs.*

Forcing the chef to context-switch between four tabs to do what's really one job is friction. Consolidating into a single "Stock & Suppliers" tab with sections inside is cleaner. *Tidy station = tidy mind = clean good food.*

The "Invoice scan" quick action stays prominent on chef home (it's frequent and time-sensitive), but the inventory of past invoices, the supplier directory, the Bank ingredient catalogue, and the waste log all live in one consolidated tab.

### Why Notebook is a key feature, not just a tab

Three reasons:
1. **No competitor has it.** Every other kitchen software treats notes as an afterthought. Operational moat.
2. **Real pain point.** Paper notebooks get ruined by oil, water, fire, the dishwasher. Every chef has lost notes this way. A genuine digital kitchen notebook is something chefs would actually want, not something they'll tolerate.
3. **Chef-authentic.** Built by someone who actually used paper notebooks in kitchens. Voice memos, photos, sketches, taggable experiments — these are what chefs actually want, not what product managers think they want.

This is the only chef-specific feature in Palatable that no other product has. Worth treating as a real product feature, not "freeform notes that link to recipes."

### Why owner shell only at Group+ tier

Single-site Pro/Kitchen owner-operators are *typically the chef* of their own business. Showing them an owner shell with one site in it makes them feel like they're using an enterprise tool designed for someone else. They want the chef shell — they want to be in the kitchen, not above it.

Owner shell is fundamentally a multi-site experience. The Sites overview, cross-site Margins comparisons, group-level supplier benchmarking — none of these make sense for a single site. So owner shell renders only at Group/Enterprise tier. Below that, the user sees chef or manager shell based on their primary role.

### Why surface switcher is per-role rather than per-session

A user who's both an owner *and* an active chef (Jack himself, for instance) has different default preferences in each role. Their "owner me" wants the business pulse home. Their "chef me" wants the morning brief with prep alerts. When they switch role, they should land in *that role's preferred view*, not carry their previous state over.

Per-session would mean: I last looked at Margins, so when I switch to chef shell I land in Margins. That's noise — I switched role for a reason, the system should respect the role.

Per-role means: each role context is independent. My chef context has its own preferences and last-state; my owner context has its own. Cleaner mental model.

### What this appendix doesn't capture

The specific consolidation naming ("Stock & Suppliers" vs alternatives like "Larder" or "Kitchen"). The exact tab order in chef shell. The specific seven-tab count. These are *iterable* — the structural decisions above are the architecture; the naming and ordering will likely refine as the surfaces get built.
