# Role-Aware Surfaces

*What chef, manager, and owner each see when they open Palatable.*

The principle is simple: same data, three experiences, designed for the actual job each person does. Below is what each surface should contain, in priority order, with the design intent for each.

---

## Chef Home — "The Sous Chef Briefing"

The chef opens Palatable in the morning. They get a coffee. They want to know what they need to know, fast, without navigating anywhere.

### Top of the screen — the morning brief
- "Heads up" alerts: margin slips, price changes, supplier issues, credit notes pending
- Today's deliveries expected, with anything flagged
- Stock alerts — what's running low against par, what's expiring
- One-line summary: *"Three things to look at, two deliveries due, all margins healthy."*

### Below that — quick actions
- Scan an invoice
- Count stock
- Open a recipe
- Log waste

### Available but not prominent
- Recipe library, costings, menus, spec sheets, allergens, sub-recipes — all the depth that's already built, just not in your face when you open the app

### Hidden from chef view entirely
- Financial reports, multi-site comparisons, P&L analytics, accounting integrations, billing/subscription management

### Design intent
Calm, low-density, mobile-first. The chef shouldn't have to think about where to look. Most days, the morning brief is "all clear" and the chef closes the app and goes cooking. Some days it surfaces something they need to act on, and the action is one tap away.

---

## Manager Home — "Site Status"

The GM or kitchen manager opens Palatable mid-morning or between services. They want to know how the site is running.

### Top of the screen — site status
- Today's prep status against what's expected
- Stock alerts requiring action (POs to approve, deliveries to chase)
- Outstanding credit notes and supplier issues
- Waste this week vs last
- Any margin movements worth knowing about

### Below that — operational tools
- PO management (approve suggested orders, track outstanding)
- Supplier issue tracker (credit notes in progress)
- Stock counting and par level management
- Team management for this site
- Menu publishing and digital menu management

### Available
- Recipe and costing depth (often the manager needs to look something up rather than create)
- Reports specific to this site — GP trends, waste cost, supplier reliability for this site

### Hidden from manager view
- Multi-site cross-comparisons (unless they manage multiple sites)
- Account billing, plan management, owner-level financial reports
- Group-wide supplier benchmarking

### Design intent
Operational density is fine here — managers are at a desk or in the office, not on the pass. Information-rich but task-organised. The manager's job is to make sure the site runs, so the surface is built around exception management: what needs my attention today.

---

## Owner Home — "The Business View"

The owner or operations director opens Palatable on a Sunday evening, or when they want to check on the business. They're not in the kitchen. They want to know the money is healthy and nothing is on fire.

### Top of the screen — business pulse
- Group GP this week / month / vs last period
- Margin alerts across all sites (where something's slipping, and where)
- Cost of goods trend
- Supplier spend by site and supplier
- Top-line operational alerts (anything serious happening at any site)

### Below that — intelligence and analysis
- Multi-site comparisons (GP by site, waste by site, menu performance by site)
- Supplier benchmarking — where am I overpaying vs the market (the proprietary intelligence layer once it matures)
- Menu engineering across all sites — what's performing where
- Inflation tracking — what's driving cost changes
- Reorder forecasting and procurement intelligence (when forecasting matures)

### Available
- Drill-down into any site to see what the manager sees
- All financial reports, exports for accounting
- Plan and billing management
- Team and outlet administration

### Hidden / de-emphasised
- Day-to-day operational noise — the owner doesn't need to see today's prep list. That's for the manager and chef.
- Recipe authoring (available, but not a primary surface — owners look at recipes occasionally, they don't write them)

### Design intent
Strategic, analytical, calm. The owner is making decisions about money and direction. Surface answers, not raw data. Trend lines, not numbers. Exceptions worth knowing about, not everything that happened. This is the surface that justifies the contract value at Group/Enterprise tier.

---

## The connection between surfaces — the magic

The reason this works is that everything on the manager and owner surface comes from work the chef is already doing.

- The chef enters a recipe → the owner sees GP and menu engineering
- The chef scans an invoice → the manager sees the credit note workflow and the owner sees supplier spend
- The chef counts stock → the manager sees reorder suggestions and the owner sees inventory value
- The chef logs waste → the manager sees the weekly trend and the owner sees the cost
- The chef confirms a delivery → the manager sees the discrepancy flag and the owner sees supplier reliability

Nobody does duplicate work. Nobody does work for someone else. The chef's normal work feeds three views automatically.

This is the architectural truth that everything else flows from. Every feature should be designed with the question: *whose normal work generates the data, and which surfaces does it appear on?*

---

## Role-aware notifications

This matters as much as the surfaces. Different roles get different notifications:

- **Chef gets:** margin slips, price spikes, supplier delivery issues, stock running low — the things that affect their kitchen
- **Manager gets:** PO approvals needed, credit notes pending, weekly summaries, anything requiring decision
- **Owner gets:** weekly business digest, significant margin movements across sites, exceptional supplier behaviour — strategic things, not daily noise

The owner does not get pinged when chicken runs low. The chef does not get pinged when a P&L report is ready. The system knows who needs to know what.

---

## Implementation notes

- Builds on existing Phase 3 multi-user team perms (the 4-stage rollout completed: schema → contexts → Team UI → role gating)
- Role detection logic drives surface rendering; existing role gating extended into experience design
- Group/Enterprise interface mode switch already noted in build backlog fits this perfectly: when active, owner view becomes multi-site by default
- Notification architecture is new build — required for the morning brief / digest / alerts feed
