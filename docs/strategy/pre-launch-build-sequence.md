# Pre-Launch Build Sequence

*Working back from the v1 we'd be proud to launch.*

The constraint: Palatable hasn't launched. The goal isn't to ship the next thing — it's to launch with something category-defining that justifies the positioning as the digital sous chef.

Estimated 10–12 weeks of focused work.

---

## Foundation work (weeks 1–2)

Decisions and small jobs that unblock everything else. Do these first.

### Strategic decisions
- **Costing tab decision.** Do not kill it — reframe it as part of the chef surface and confirm it's not duplicated elsewhere. The "is it redundant" instinct came from confusion, not from the feature being wrong.
- **Finalise role-aware surface design.** Sketch the three home screens properly (see `role-aware-surfaces.md`). This is the spec for everything that follows.
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
