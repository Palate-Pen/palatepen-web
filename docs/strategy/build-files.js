// build-files.js
// Generates the four Palatable strategy documents.
// Run with: node build-files.js
// Follows Jack's convention: all file writes via Node.js setup scripts to avoid Windows encoding issues.

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'output');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const write = (filename, content) => {
  const filepath = path.join(OUT_DIR, filename);
  fs.writeFileSync(filepath, content, { encoding: 'utf8' });
  console.log(`Wrote ${filepath}`);
};

// ============================================================
// FILE 1: THE PALATABLE WAY (principles)
// ============================================================
const palatableWay = `# The Palatable Way

*How we build, and why.*

---

## The story

Palatable was built by a chef who got tired of paperwork stealing time from cooking. Tired of costing every dish on a calculator. Tired of chasing suppliers for credit notes that never came. Tired of the manager walking into the kitchen at 4pm asking what the food cost was last week. Tired of software built by people who'd never worked a service.

So we built something different. A system that handles the admin, so chefs can cook. A system that gives managers and owners what they need, without making chefs do extra work to feed it. A system built in the kitchen, useful to the whole business.

Palatable is the digital sous chef nobody else built — because nobody else knew it needed to exist.

---

## What we believe

**Chefs cook. The system handles the admin.**
Every minute a chef spends on paperwork is a minute not spent on food. Our job is to take admin off the pass, not add to it.

**Software should work like a good sous chef.**
A good sous chef anticipates. Doesn't ask questions they should know the answer to. Handles the boring stuff without being asked. Knows their place. Makes the head chef look good. Palatable behaves the same way.

**The kitchen is sacred.**
We protect it from interruption. Managers and owners get their own way to find what they need, so they stop walking into the kitchen at stupid times asking questions.

**Build bottom-up, not top-down.**
Other hospitality software is built for managers, and chefs are forced to do data entry to feed it. We build for the chef first. Managers and owners get their reports as a byproduct of the chef doing their normal work.

**Nobody works for anyone else.**
The chef never does work for the manager. The manager never does work for the owner. The system does the connecting. One person's normal work feeds everyone else's view, automatically.

**Suggestions, not commands.**
Chefs hate being told what to do. The system suggests, flags, surfaces — it doesn't boss. Trust is earned over time. Autonomous action is a feature you earn the right to, not one you launch with.

**Intelligence comes to you, not the other way round.**
The chef shouldn't have to go hunting for insight. The system surfaces what matters when it matters. Dashboards are where you look something up, not where intelligence lives.

**Don't ask what you could already know.**
Every form field is a failure of intelligence. If the system has the data, it shouldn't ask. If it can figure it out, it should.

**Operational, calm, fast.**
The kitchen is stressful enough. The product should feel like a steady hand, not another source of noise. Low-click workflows. Mobile-friendly because chefs are on their feet. Visual hierarchy that reads at a glance.

**Stay operational. Don't become an ERP.**
We don't do payroll. We don't do HR. We don't replace accounting. We integrate with the tools that do those things well. We stay in our lane — the operational layer where kitchens, suppliers, and margins live.

---

## How this shows up in the product

**Three surfaces, one system.**
Chef surface: the sous chef. Manager surface: operational status. Owner surface: financial intelligence and multi-site visibility. Same underlying data, role-aware experience.

**Costing maintains itself.**
You enter a recipe once. Palatable keeps the cost current forever, every time a supplier price changes, without the chef opening a calculator.

**Margins are watched, not reported.**
When GP slips, the system tells you — with the root cause. "Burger margin down 4.1% this month, brioche up 18% at Bidfood." Not buried in a dashboard.

**Supplier admin is handled.**
Credit notes chased. Discrepancies flagged. Delivery checks logged. The chef stops being the supplier's debt collector.

**The chef's work feeds everyone's view.**
The recipe the chef writes becomes the owner's GP report. The invoice the chef scans becomes the supplier benchmark. The stock count becomes the reorder suggestion. One action, many outcomes.

---

## What we don't do

We don't do payroll. We don't do HR. We don't replace accounting software. We don't try to be a POS. We don't build for finance teams. We don't make chefs do work for managers. We don't interrupt service with notifications. We don't bury the answer in a dashboard. We don't sound like SaaS. We don't pretend we weren't built by a chef.

---

## The test

Every feature decision answers one question:

*Does this make Palatable a better sous chef — or does it make it admin software?*

If it's the first, we build it. If it's the second, we don't.

---

*Let chefs be chefs, managers be managers, and owners watch the money pile in.*
`;

// ============================================================
// FILE 2: ROLE-AWARE SURFACES
// ============================================================
const roleAwareSurfaces = `# Role-Aware Surfaces

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
`;

// ============================================================
// FILE 3: PRE-LAUNCH BUILD SEQUENCE
// ============================================================
const buildSequence = `# Pre-Launch Build Sequence

*Working back from the v1 we'd be proud to launch.*

The constraint: Palatable hasn't launched. The goal isn't to ship the next thing — it's to launch with something category-defining that justifies the positioning as the digital sous chef.

Estimated 10–12 weeks of focused work.

---

## Foundation work (weeks 1–2)

Decisions and small jobs that unblock everything else. Do these first.

### Strategic decisions
- **Costing tab decision.** Do not kill it — reframe it as part of the chef surface and confirm it's not duplicated elsewhere. The "is it redundant" instinct came from confusion, not from the feature being wrong.
- **Finalise role-aware surface design.** Sketch the three home screens properly (see \`role-aware-surfaces.md\`). This is the spec for everything that follows.
- **Run the backfill migration in Supabase** to default-account existing users. Ten-minute job that closes a real risk before launch.

### Architectural decisions
- Confirm role detection logic and how it drives surface rendering. Phase 3 team perms work is the foundation — this extends it into experience design.
- Decide notification architecture. Where do alerts live, how does the chef get the morning brief, how do role-aware notifications get routed?

---

## The headline build (weeks 2–7) — Margin Leakage Detection

The category-defining feature. Transforms Palatable from "good operational tooling" to "intelligent sous chef." Entirely buildable from data we already have.

### What it needs
- Daily/weekly margin calculation per dish, tracked over time
- Detection logic — what counts as a meaningful margin slip (not noise)
- Root cause attribution — link the margin change to specific ingredient price movements
- Surface design — appears in chef morning brief, manager site status, owner business pulse, all three with role-appropriate framing
- Notification design — when to alert, how to alert, who to alert
- "What you could do about it" — surfacing supplier alternatives, recipe swaps, price negotiation prompts

### Why 4–6 weeks
The data is all there. The work is the analytics layer (margin time series), the attribution logic (what changed and why), the surface design (this is the new flagship UX), and the notification infrastructure (which is reusable for other intelligence features later).

### Demo moment this unlocks
> *"Nory tells you what your sales might be tomorrow. Palatable tells you why your burger margin dropped 4% this month, and which supplier is responsible. We catch the money that's already leaving."*

---

## The chef-love build (weeks 4–8, parallel) — Credit Note Workflow

Runs in parallel with margin work because they touch different parts of the codebase.

### What it needs
- Automatic discrepancy detection (already built) → automatic credit note request drafting
- Email template generation per supplier with line-item detail
- Send and track workflow — supplier responds, credit applied, status updated
- Manager view — outstanding credit notes by supplier and value
- Chef view — "handled" reassurance, just see that it's in progress
- Reporting impact — credit notes recovered as a real business outcome

### Why this matters
Pure admin removal. Every kitchen loses thousands a year to uncollected credit notes. Recovering that money is a tangible ROI story for owners and a tangible "thank god something handles this" story for chefs.

### Size
3–4 weeks because the discrepancy logic exists. The new work is the supplier communication and tracking workflow.

---

## The owner surface build (weeks 6–9) — Group Dashboard, Intelligence-First

The dashboard from the existing roadmap, but designed as the owner surface from the principles, not as a static reporting tab.

### What it needs
- Business pulse top section — group GP, margin alerts, COGS trend
- Multi-site comparison views — GP by site, waste by site, menu performance by site, supplier spend by site
- Owner-level alerts feed — the strategic version of the chef's morning brief
- Drill-down into any site
- Foundation for benchmarking (even if data isn't rich enough at launch, build the surface)

### Why now
Reuses the role-aware architecture. Provides the demo surface for Group/Enterprise sales. Showcases the margin leakage feature at portfolio level (not just per dish, but across the whole group).

---

## The polish and launch sweep (weeks 8–11)

### Design consistency pass
- Font colours and contrast in light/dark mode
- Four-grid line spacing fix (Star/Plough/Dog/Puzzle)
- Styling standardisation across tabs
- Allergen and dietary tag work (universal allergens, V/Vg/GF)
- Dashboard friendliness audit — but now checking that the role-aware design actually works, not just generic polish

### Seeded accounts
- Add kcals to seed data
- Replace hello@ with demo@
- Tiered seeding (Free / Pro / Group / Enterprise demo accounts so each role view can be demonstrated)

### Security and legal — non-negotiable for launch
- Full T&Cs and privacy policy (UK GDPR-compliant)
- Data Processing Agreement template for B2B customers
- Security posture document (Supabase RLS, encryption at rest/in transit, backup posture)
- Cookie/consent compliance
- Decide and document IP protection approach (trademark Palatable, copyright the codebase, accept the rest)

### Website redesign
- Palate & Pen consultancy first impression
- Heavy Palatable focus with the three-surface story
- Chef-voice hero, role-by-role sections
- Pricing page — Free / Pro / Group / Enterprise tiers articulated
- Demo booking flow

---

## Beta and launch prep (weeks 11–12)

### Friendly beta
- 3–5 operators across single-site and multi-site
- Cover all three roles — at least one beta site with active chef, manager, and owner users
- Two-week structured feedback period with specific questions per role
- Iterate on what breaks, what confuses, what nobody uses

### Launch readiness
- Stress test (the version that matters — not "break the system" but "what happens at 50 concurrent users and 1000 invoices a day")
- Support process and documentation
- Onboarding flow tested with non-Jack users
- Pricing live, billing tested
- POS integration scaffold started (post-launch v1.1 priority — Square first for simplest auth)

---

## What's deliberately not in v1

- **POS integration** — post-launch, v1.1
- **Forecasting engine** — requires POS data first
- **Central kitchen management** — Phase 7+, niche segment, not the wedge
- **Supplier intelligence benchmarking** — requires customer invoice volume; build the data pipeline now, surface the feature 6–12 months post-launch
- **Native mobile** — web responsive surface is enough for v1
- **Autonomous ordering** — trust isn't earned yet; v3 territory
- **Xero integration** — post-launch, valuable but not differentiating

---

## What this sequence achieves

A v1 that launches with three things no competitor has:

1. **Costing that maintains itself forever**, without chef effort
2. **Margin leakage detection** — the headline intelligence feature, role-aware surfaced
3. **Credit note automation** — pure chef-love, real ROI

Plus a role-aware architecture that justifies the positioning across chef, manager, and owner, and a Group dashboard that makes the Group/Enterprise tier credible from day one.

The supplier intelligence moat starts accumulating data from day one of customer acquisition, ready to become the flagship v2 feature when there's enough volume.
`;

// ============================================================
// FILE 4: CLAUDE.md ADDENDUM (for Claude Code)
// ============================================================
const claudeMdAddendum = `# Palatable — Strategic Direction (May 2026)

This file gives Claude Code the strategic context to build in the right direction. Read all three referenced docs before making non-trivial product decisions.

## The product, in one sentence

Palatable is the hospitality platform where chefs do their work in the kitchen, managers see what they need to see, and owners watch the money — without anyone having to do extra work for anyone else.

## The positioning

**Chef-facing:** "The digital sous chef that handles the admin so you can cook."
**Owner-facing:** "Software your chefs will actually use — so you finally get the data you need."
**Internal:** Built in the kitchen. Useful to the whole business.

## The core architectural insight

One system, three role-aware surfaces:
- **Chef surface** — the sous chef. Calm, mobile-first, hides finance.
- **Manager surface** — site operational status. Exception management.
- **Owner surface** — business pulse, multi-site intelligence, financial reports.

Same underlying data. Role-aware experience. The chef's normal work feeds the manager and owner views automatically. **Nobody does work for anyone else.**

## The v1 wedge (what we launch with that no competitor has)

1. **Auto-maintained costing** — recipe costed once, kept current forever as supplier prices change
2. **Margin leakage detection** — proactive alerts when GP slips, with root cause identified
3. **Credit note workflow** — discrepancies drafted, sent, tracked without chef chasing

## Principles for every product decision

- Does this make Palatable a better sous chef, or does it make it admin software?
- Is this work the chef needs to do anyway, or are we asking them to do work for someone else?
- Is this surfaced to the right person in the right way for their role?
- Suggestions, not commands. Trust is earned over time.
- Don't ask the system to remember what it could figure out from data it already has.
- The kitchen is sacred. The system protects it from interruption.

## What we don't do

Payroll. HR. Accounting replacement. POS replacement. Generic ERP. Anything that makes chefs do work for managers. Anything that interrupts the kitchen.

## Reference documents

Full strategy lives in:
- \`docs/strategy/palatable-way.md\` — principles and brand voice
- \`docs/strategy/role-aware-surfaces.md\` — chef / manager / owner surface design
- \`docs/strategy/pre-launch-build-sequence.md\` — 10–12 week pre-launch plan

When in doubt about a product or UX decision, read these first.

## Build conventions (unchanged)

- All file writes via Node.js setup scripts to avoid Windows encoding issues
- Repo: Palate-Pen/palatepen-web, branch master
- Palatable app lives at \`/mise\` and \`/mise/app\` (folder rename pending)
- Stack: Next.js 14.2.5, React 18, Supabase (EU West London, project \`xbnsytrcvyayzdxezpha\`), Stripe, Tailwind, Anthropic Sonnet 4.6 server-side
`;

// ============================================================
// WRITE FILES
// ============================================================
write('palatable-way.md', palatableWay);
write('role-aware-surfaces.md', roleAwareSurfaces);
write('pre-launch-build-sequence.md', buildSequence);
write('CLAUDE-strategy-addendum.md', claudeMdAddendum);

console.log('\nDone. Four files written to:', OUT_DIR);
console.log('\nSuggested repo placement:');
console.log('  docs/strategy/palatable-way.md');
console.log('  docs/strategy/role-aware-surfaces.md');
console.log('  docs/strategy/pre-launch-build-sequence.md');
console.log('  CLAUDE.md (append CLAUDE-strategy-addendum.md to existing CLAUDE.md, or replace)');
