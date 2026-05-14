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
