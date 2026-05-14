# Master view — Palatable admin product

*The operator cockpit. Final form after all decisions locked 2026-05-14.*

---

## The frame

Palatable is two products: the customer product (chef/manager/owner shells) and the admin product (operator cockpit, Jack only). Shared codebase and database, but different experiences with different users, priorities, design philosophies, and release cadences.

This document covers admin. Customer product lives in its own master view.

---

## What admin is

A founder-grade operations cockpit for running Palatable as a business. Single-user (Jack, for the foreseeable future). Decision support, not data entry. Built for intelligence about the business — what's working, what's not, what needs attention before it becomes a problem.

The existing eight surfaces (Overview, Users, Revenue, Infrastructure, Expenses, Platform, Audit, System) form the foundation. *"Full works"* means expanding this into a comprehensive operator cockpit.

---

## v1 admin surfaces — what ships at launch

### Eight existing surfaces (refined for v1)

1. **Overview** — *Good morning, Jack.* KPI cards, system health, recent signups, tier breakdown, and the **Needs Attention** feed (powered by real signals at v1, not the placeholder "all clear" that currently shows).

2. **Users** — Searchable table, tier filters, bulk email, CSV export. Plus new **drill-in to a single user** showing their full state, recent activity, billing, and impersonation entry point.

3. **Revenue** — Unit economics, per-tier cost/margin, baseline cost reference. No changes for v1.

4. **Infrastructure** — Live capacity, costs, action-required callouts. No changes for v1.

5. **Expenses Timeline** — Chronological upcoming cost events. No changes for v1.

6. **Platform** — Feature flag kill switches, maintenance mode, platform announcement. The **Control Desk** button is removed (no function, no destination, cognitive load with no return).

7. **Activity** — *Merged surface.* Replaces the previous Audit Log tab. Single filterable stream covering admin actions, customer events, and system events. Source filter (admin / customer / system), event type filter, user filter, date range. Less navigation overhead than two separate logs.

8. **System** — Database stats, environment checks, signup trigger diagnostic, cache controls. No changes for v1.

### New v1 surfaces

9. **Customer Activity** — *The proactive intelligence layer.* Reads from the merged Activity stream above but surfaces it as pattern detection rather than raw events.

   Three modes:
   - **Per-user timeline** — drill into one user, see their event stream
   - **Event-pattern view** — *"5 users hit invoice_scan_failed in the last hour"* — surfaces problems before they become tickets
   - **Cohort behaviour** — *"Pro users in the last 14 days have a 32% lower recipe creation rate than 30 days ago"*

   Pattern detection rules are the meaningful work. Start with 10–15 rules covering: error spikes, drop-offs in core flows (recipe creation, invoice scan), at-risk-of-churn signals, tier-limit-approaching warnings.

10. **Support** — User impersonation and per-account diagnostic.
    - **Full read+write impersonation** — admin clicks a button, sees what the user sees, can take any action they could take. Clear banner indicating impersonation mode. Auto-logged in the Activity stream.
    - **Legal cover** — impersonation rights documented in T&Cs and privacy policy. Customer-side notification when impersonation occurs (in-app, after the fact, for transparency).
    - **Per-account diagnostic** — full data state, recent errors, tier limits, feature flags affecting them, billing status, last login. One screen to size up any account quickly.
    - **Quick-actions from impersonation** — reset a stuck state, clear a corrupted recipe, force-resend a verification email.

### Admin authentication — TOTP 2FA at launch

Single-user admin with full read/write on customer data is a security surface. Password alone is thin. TOTP-based 2FA (authenticator app) added before launch. Hardware key support and IP allowlisting are post-launch refinements.

### Skip mobile admin

Admin is desktop work. Design budget reallocated to making desktop admin excellent rather than mobile-responsive admin acceptable.

### Visual register — already there

Admin's visual language is the Palate & Pen identity, already deployed. No design overhaul needed. Customer product catches up to admin's visual register, not the other way round.

The "Needs Attention + KPI cards first" pattern is the right information hierarchy. Don't lose this as features get added. *"You'll actually open admin every morning to read the brief, rather than dreading the wall of numbers."*

---

## v1.1 admin surfaces — 3–6 months post-launch

These build on the v1 foundation but aren't critical for launch.

### Customer Health monitoring
Per-account risk signals: engagement scoring, churn risk, time-to-first-value tracking, feature adoption breadth.

**Built extensibly.** Designed to capture every meaningful signal over time, not constrained to a small fixed set at v1.1. Start with a core scoring formula (engagement frequency × feature breadth × recency × tier trajectory), and architecture so new signals slot in cleanly without rebuilding the scoring framework. *Build the system for tomorrow's signals, not just today's.*

### Billing operations
What admin should add over the Stripe dashboard:
- Failed payment recovery workflow
- Refund / credit handling with audit trail
- Subscription anomaly surfacing
- Pre-billing visibility (projected MRR change)

### Data exports for accounting
P&L periodisation. VAT/tax reporting helpers. Stripe revenue reconciliation. Anthropic cost attribution per customer. Built before the first tax year ends; not before there's revenue to report.

---

## v1.2+ admin surfaces — when growth demands

### Marketing operations
Waitlist management, signup funnel analytics, conversion tracking by source, UTM-tagged signup analysis. When Jack's brother becomes involved, this becomes essential.

### Content / communications
In-app announcements (extension of the existing Platform announcement banner). Email campaigns to specific cohorts. In-app onboarding flow management.

### Multi-admin permissions
When there's a team beyond Jack. Premature pre-launch.

---

## What admin deliberately won't do

Scope boundaries worth being explicit about:

- **No Xero / accounting replacement.** Admin exports data; accounting software does accounting.
- **No CRM.** Customer relationships happen in email, phone, in-person. Admin shows you customer state; HubSpot isn't the goal.
- **No A/B testing framework.** Premature.
- **No public-facing analytics.** Customer-facing analytics live in the customer product (their kitchen's GP, their margins), not in admin.

---

## Final admin v1 navigation

After the changes above:

1. Overview
2. Users
3. Revenue
4. Infrastructure
5. Expenses Timeline
6. Platform
7. Activity *(merged Audit + Customer events + System)*
8. System
9. Customer Activity *(new — pattern detection)*
10. Support *(new — impersonation + diagnostic)*

Ten surfaces. Each answering a specific operator question. Same calm low-density principle as the customer product — *density is role-aware, not universal.* Admin tolerates more density than chef shell, less than typical enterprise SaaS admin.

---

## What this document is and isn't

**Is:** the operator product's final strategic shape — what's there at v1, what's coming at v1.1, what's out of scope.

**Isn't:** the build sequence (see `pre-launch-build-sequence.md`), the customer product (see `master-customer-product.md`), or design specs (Jack's visual work).

---

## Appendix — Rationale behind the admin product shape

*Added after the master view landed, to preserve the reasoning behind structural decisions.*

### Why admin is treated as a separate product

Customer product and admin product share a codebase, a database, and a visual language. But they're different experiences:

- **Different users.** Customer product: chefs, managers, owners. Admin: Jack only.
- **Different priorities.** Customer product: calm, low-density, anticipatory. Admin: comprehensive, operator-grade intelligence.
- **Different design philosophies.** Customer: editorial-magazine, calm typography. Admin: same aesthetic, but tolerating more density (operators want power; chefs want calm).
- **Different release cadences.** Customer features ship slowly with chef testing. Admin features ship as soon as Jack needs them.

Treating them as one product would force-blend their priorities. Treating them as separate products with shared infrastructure means each gets calibrated to its actual users.

### Why full read+write impersonation (with T&Cs cover)

Read-only impersonation lets you *see* what a customer sees. Read+write lets you *fix* what they're stuck on. The first time a customer has a corrupted recipe or a stuck workflow, read-only frustrates everyone — Jack can see the problem, can describe the fix, but can't actually do it. Customer has to do it themselves, with talk-through, slowly.

Read+write impersonation means Jack can take action on the customer's behalf. *"I've cleared that stuck stock count for you. Try again now."* — that's a 30-second support interaction. With read-only it would be 15 minutes of walking the customer through clicks.

The T&Cs cover this explicitly. The customer gets notified after the fact (in-app banner) for transparency. The action is logged in the audit stream. Power with accountability. Standard pattern for serious SaaS support.

### Why merged Activity surface (Audit + Customer events + System)

Three separate surfaces meant three different navigation destinations, three different mental models, three different sets of filters to learn. But the underlying *data* is one stream — every event that happens, source-tagged (admin / customer / system).

One filterable surface is less navigation overhead, less code to maintain, and lets Jack cross-reference between sources. *"What admin action did I take just before that customer's data corrupted?"* — that question requires both streams. Merged Activity makes it answerable in one query.

### Why TOTP 2FA at launch

Admin has full read+write on customer data. That's a real security surface. Password alone is thin — phished, leaked, or guessed credentials would compromise every customer.

TOTP via authenticator app is ~half a day of build, doesn't change daily UX (you set it once, then it's just one extra step at login), and brings the admin security posture up to enterprise SaaS baseline. The moment Palatable signs its first Group/Enterprise customer, that customer's procurement team will ask about admin security. Having 2FA in place from launch means the answer is *"yes, TOTP 2FA, audit logged"* rather than a scramble.

Hardware key support and IP allowlisting are post-launch refinements when the user base justifies them.

### Why skip mobile admin

Admin is desktop work. Reviewing unit economics, investigating customer issues, managing feature flags — all of it is multi-window, multi-tab, requires real screen real estate. A phone-responsive admin would be technically possible but functionally unused.

Skipping mobile admin reallocates design and engineering budget to making *desktop* admin excellent rather than mobile-responsive admin acceptable. Same total effort, better outcome. If a future state actually requires phone-accessible admin (Jack on holiday, customer crisis), the customer-side support tooling could be sufficient.

### Why Control Desk removed

A button on every admin page that didn't do anything. *"Could have a function but not sure what."*

Cognitive load isn't free. Every UI element costs the user's attention, even when they've stopped consciously noticing it. A button that does nothing is worse than no button — it implies meaning, gets clicked occasionally, returns nothing.

The right answer: remove it. If a quick-action menu becomes useful later, build it then with a clear purpose. Don't preserve cruft because it might one day mean something.

### Why customer health monitoring is v1.1, not v1

At v1 launch, there aren't enough customers for pattern detection on health to fire meaningfully. With 5 customers, "engagement frequency drop" is noise. With 50, it becomes signal.

Build the *plumbing* in v1 (event logging via the activity stream) so the data accumulates. Surface the *health intelligence* in v1.1 once there's enough data for the patterns to mean something. Premature health monitoring fires false alarms and trains operators to ignore the system.

### What this appendix doesn't capture

The exact set of pattern detection rules for the Customer Activity Log (those are tactical and will grow over time). The specific scoring formula for Customer Health (extensible architecture; specific weights TBD). The pricing on potential admin tier upgrades.

---

# Master view — admin product

*Locked 2026-05-14 evening. Small addition from morning lock: admin visibility into customer integration health.*

The admin product is the operator tool Jack uses to run Palatable as a business. Separate from the customer product, shares infrastructure, lives in its own design register (operator-grade density rather than calm-chef-low-density).

---

## Existing structure (unchanged from morning lock)

- Comprehensive read+write impersonation with T&Cs cover
- Merged Activity surface (audit + customer events + system in one filterable view)
- TOTP 2FA at launch
- Desktop-only (no mobile admin)
- Control Desk removed
- Customer health monitoring as v1.1 (needs data accumulation)

See morning lock for full structure. This document captures only the additions from the evening session.

---

## [NEW] Integration health visibility

With the customer product now including self-serve integration architecture (POS, bookings, supplier portals — see `master-customer-product.md`), admin gains visibility into integration health across the customer base.

### Where it lives

A new section in the admin Activity surface filterable by source = "integration." Plus a dedicated **Integration Health** panel on the admin Home surface showing aggregated metrics:

- Connections by provider (e.g. "12 customers connected to Square, 3 to Resy")
- Failing integrations across customers (auth expired, repeated sync failures)
- Customer-specific drill-down to see which customers have which integrations and their health

### Why admin needs this visibility

When a customer reports "the system isn't showing tonight's covers," the first diagnostic is "is your Resy connection working?" Admin needs to see this without impersonating into the customer's session.

Similarly, when a new POS provider integration ships, admin sees adoption metrics ("how many customers have connected Toast since we launched the integration?").

### Implementation

Reads from `integration_connections` table (per `master-shared-infrastructure.md` §5). Aggregates by provider, status, last-sync-age. Surfaces failures into admin's "Needs Attention" feed via the notification engine.

---

## Open questions

Unchanged from morning lock. The integration health addition is a clean extension rather than a structural change.

---

## Rationale

### Why this is admin visibility, not customer-facing

The customer sees *their own* integration health on their Connections page (per `master-customer-product.md`). Admin needs the *aggregated* view — which customers across the platform have which integrations connected, where things are failing in patterns, when a particular provider's API has had widespread issues.

Different concerns, different surfaces. Customer sees their own. Admin sees the fleet.
