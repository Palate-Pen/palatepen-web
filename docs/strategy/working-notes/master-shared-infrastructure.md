# Master view — shared infrastructure

*The cross-cutting systems that serve both customer product and admin product.*

Working document. The plumbing layer. What gets built once and reused everywhere.

---

## Why this document exists

The customer product and admin product share a codebase, a database, and increasingly, a set of architectural primitives. Building the same plumbing twice is waste. Building it inconsistently creates bugs and drift.

This document captures the cross-cutting systems and the design principles that govern them.

---

## System 1 — The Notification Engine *(the Inbox)*

### The realisation

Yesterday we sketched the Inbox as a *customer-product surface* — chef gets margin alerts, owner gets weekly digest. Today we've added: admin also has Needs Attention, which is the *same product pattern*. Build it once, route to four audiences (chef / manager / owner / operator).

### The pattern

A persistent, role-aware intelligence feed:
- Events flow in from many sources (margin engine, stock engine, supplier engine, billing engine, system health, etc.)
- The dispatcher routes each event to the right recipient(s) based on role + outlet + account
- The recipient sees the item in their Inbox surface (with role-appropriate framing)
- Push to native channels (mobile push, email digest, optional SMS at higher tiers)

### Schema

```
inbox_items
  id uuid
  recipient_user_id uuid          -- who sees this
  recipient_role text              -- 'chef' | 'manager' | 'owner' | 'operator'
  account_id uuid                  -- scoping
  outlet_id uuid null              -- null if account-level, set if outlet-specific
  event_type text                  -- 'margin_alert' | 'price_change' | 'stock_alert' |
                                   --  'credit_note_pending' | 'po_pending' | 'weekly_digest' |
                                   --  'system_message' | 'needs_attention' | etc.
  severity text                    -- 'info' | 'attention' | 'urgent'
  title text                       -- short headline
  body_md text                     -- markdown body, optional
  payload jsonb                    -- structured data for the item (specifics vary by type)
  action_url text null             -- where clicking takes the user
  expires_at timestamptz null      -- some items are time-bound
  read_at timestamptz null
  actioned_at timestamptz null
  dismissed_at timestamptz null
  created_at timestamptz default now()
```

Indexed on (recipient_user_id, created_at desc) for the main inbox query, and on (recipient_role, account_id, created_at desc) for the dispatcher.

### The dispatcher

A server-side service that:
1. Receives events from any source (`dispatch({ event_type, account_id, outlet_id, payload })`)
2. Determines the relevant recipients based on routing rules (e.g. *margin_alert* routes to chef + manager for that outlet, plus owner for the account; *system_message* routes to operator only; etc.)
3. Creates one inbox_item per recipient
4. Optionally triggers push/email/SMS based on severity and user notification preferences

### The four routing flavours

**Chef-routed:** margin slips, price spikes, supplier delivery issues, stock running low, credit notes pending. Things affecting *their kitchen today*.

**Manager-routed:** PO approvals needed, credit notes pending, weekly summaries, anything requiring a decision. Things requiring *operational action*.

**Owner-routed:** weekly business digest, significant margin movements across sites, exceptional supplier behaviour, billing events. Things affecting *the business*.

**Operator-routed (admin):** system health alerts, customer health signals, failed signups, infrastructure capacity warnings, anomalous behaviour. Things requiring *founder attention*.

### Why this matters

This single piece of infrastructure powers:
- Chef morning brief (curated view of recent chef-routed items)
- Manager site status (similar, for manager-routed items)
- Owner business pulse (similar, for owner-routed items)
- Admin Needs Attention feed (similar, for operator-routed items)

Build it once, four flagship surfaces light up. This is the highest-leverage piece of foundation work in the entire pre-launch build.

### Build estimate

- Stage 1 — schema, dispatcher service, RLS policies: 1–2 days
- Stage 2 — base Inbox UI (list, item detail, mark read/dismissed): 2–3 days
- Stage 3 — push/email/SMS routing infrastructure: 2–3 days

**Total: ~1 week**, before any actual intelligence-producing engine (margin leakage detection, etc.) is built. The Inbox is the *delivery mechanism*; the engines that produce events are separate builds on top of it.

---

## System 2 — The Activity / Event Logging Stream

### The pattern

A structured event stream capturing what users (and admin actions) do across the system. Feeds three different uses:

1. **Customer Activity Log** in admin (the "LogRocket alternative") — pattern detection on customer behaviour
2. **Admin Audit Log** — record of admin-initiated changes for security and traceability
3. **Inbox dispatcher source** — many events become inbox items via dispatch rules

### Schema

```
activity_events
  id uuid
  source text                      -- 'customer' | 'admin' | 'system'
  actor_user_id uuid null          -- who did it; null for system events
  actor_role text                  -- 'chef' | 'manager' | 'owner' | 'operator' | 'system'
  account_id uuid null
  outlet_id uuid null
  event_type text                  -- 'signed_in' | 'recipe_created' | 'invoice_scanned' |
                                   --  'platform_setting_updated' | 'user_impersonated' | etc.
  event_payload jsonb              -- structured event data
  ip inet null
  user_agent text null
  session_id uuid null
  created_at timestamptz default now()
```

Indexed on (account_id, created_at desc), (event_type, created_at desc), and (source, actor_role, created_at desc).

### Why this matters

Three uses, one schema. The admin Audit Log we built earlier is essentially a special case of this stream (`source = 'admin'`). The Customer Activity Log is another case (`source = 'customer'`). The system itself logs to the same stream for diagnostics.

### Build estimate

- Schema migration: 1 hour
- Dispatcher integration: 1 day (every existing audit-log write becomes an activity_events write)
- Pattern detection rules for customer activity: 2–3 days (the meaningful work)
- Admin surface for browsing/filtering: 1–2 days

**Total: ~1 week**, with the highest-value piece being pattern detection.

---

## System 3 — Role Detection and Shell Rendering

### The pattern

Every user has a primary role per outlet. The app uses this to decide which shell to render at session start. A surface switcher in the header allows the user to flip between shells they have permission for.

### Schema additions

The existing team membership / account_members tables provide `role per outlet`. What's missing:

```
user_preferences
  user_id uuid primary key
  active_outlet_id uuid null       -- the outlet they're currently viewing
  active_shell text                -- 'chef' | 'manager' | 'owner' | null (defaults to primary role)
  notification_prefs jsonb         -- push/email/SMS preferences per event_type
  ui_density text                  -- 'compact' | 'comfortable' (future)
  updated_at timestamptz
```

### The hook

`useActiveSurface()` returns the shell to render for the current user. Logic:

1. Read user_preferences.active_shell — if set and the user has permission for it, use it
2. Otherwise, read user's primary role in the active_outlet_id and use that as the default
3. For owners at Group/Enterprise tier with no active outlet, default to *group view* (a special owner-shell mode showing cross-site data)

### Surface switcher

Header dropdown showing the shells the user is entitled to. Selecting one updates user_preferences and re-renders. Sticky per session.

### Why this matters

Without this, the whole role-aware-shells architecture from the customer product master view is just talk. This is the plumbing that makes "chef sees chef shell, owner sees owner shell" actually happen.

### Build estimate

- Schema migration: 1 hour
- Hook + provider: 1 day
- Switcher component in header: 1 day
- Shell-gating logic for routes/components: 1–2 days

**Total: ~3–4 days**

### Important note

This builds *on top of* the existing Phase 3 multi-user team-permissions work. The team perms work established the data model (roles per outlet). This system adds the *experience layer* on top of that data model.

---

## System 4 — Feature Flags and Tier Gating

### What exists

Per the recon: `FEATURE_MIN_TIER` in `src/lib/tierGate.ts` is a flat `Record<string, Tier>`. About a dozen feature flags currently defined (mostly `costing_*` and other category prefixes). Pattern: add a key, check with `canAccess(tier, 'feature_name')`.

Platform announcement banner in admin lets you toggle feature flags globally as kill switches.

### What needs to evolve

As shells become role-aware and the customer product gains new features, the flag taxonomy should be:

- **Tier flags** — `margins_view: 'pro'`, `margin_leakage_alerts: 'kitchen'` — gate features by subscription tier
- **Role flags** — separate from tier, gate features by user role within an account
- **Kill switches** — global on/off for risky features (already exist in Platform admin)
- **Beta flags** — per-user opt-in for new features (currently nothing; useful pre-launch)

### Build estimate

- The current flag system is fine for v1. The evolution above is post-v1 unless beta flags become urgent.

---

## System 5 — Cross-Product Visual Language

### The pattern

The customer product and admin product share one visual language: Palate & Pen's identity. Cormorant Garamond + Cinzel + clean sans. Deep ink black. Warm cream text. Gold accents. Editorial whitespace.

Currently, this exists across the admin (per screenshots) and the consultancy proposal (per the HTML), but the *customer product* hasn't yet been brought into the same register cohesively. The Stripe billing pages, the legacy parts of the app, the marketing pages — varying fidelity to the same identity.

### What needs to happen

A **design system extraction**:
- Documented colour tokens (--ink, --cream, --gold, --rule, etc.)
- Typography scale (display sizes, body sizes, eyebrow sizes)
- Spacing scale
- Component primitives (KPI card, section header, table, alert banner, modal, button — both primary gold and secondary outline)
- Motion primitives (fade-up duration and easing, twinkle animation, etc.)
- Light/dark mode tokens (admin appears to be dark-mode primarily; customer should support both)

The admin product can drive this — the design language already lives there. Extract it as design tokens, apply to the customer product as it's built.

### Build estimate

- Design token extraction from current admin: 1 day (Jack)
- Component library scaffolding: 2–3 days (engineering)
- Light-mode variants: 1–2 days
- Application to customer product: ongoing, integrated into each feature build

---

## System 6 — Audit, Privacy, GDPR posture

### The pattern

Everything that touches customer data needs an audit trail. Everything that processes personal data needs a privacy-by-design posture. Pre-launch in the UK, this matters legally and reputationally.

### What's needed

- Audit trail on data modifications (covered by the activity_events stream)
- Data export per customer (GDPR right of portability)
- Data deletion per customer (GDPR right to erasure) — already exists in admin
- Privacy policy and DPA (separate from infrastructure — legal docs)
- Cookie consent (UK GDPR / PECR)
- Subprocessor list (Supabase, Vercel, Stripe, Anthropic, Cloudflare, Microsoft)

### Build estimate

Mostly already exists or is documentation work. The activity_events stream covers the audit posture. Legal docs and cookie consent are pre-launch checklist items, not engineering builds.

---

## Cross-system priorities

If everything above were built before launch, that's ~3–4 weeks of pure foundation work. Not all of it is required for v1. Honest prioritisation:

### Critical for v1 (must build)
1. **Notification engine** — powers all four flagship home/inbox surfaces
2. **Role detection and shell rendering** — without this, the role-aware product isn't role-aware
3. **Activity / event logging stream** — for the customer activity log + admin audit trail
4. **Visual language extraction and application** — design system tokens, applied to customer product

### Important for v1, but smaller scope (1–3 days each)
5. Feature flag evolution (additive — not blocking, but tidy as we go)
6. GDPR/privacy documentation (legal, not engineering)

### v1.1+ (post-launch refinement)
- Advanced notification preferences per user
- Pattern detection rules for customer activity (start with 5–10 rules, grow)
- Multi-admin permissions

---

## What this document is and isn't

**Is:** the plumbing decisions that govern both products. The shared spine. What gets built once and reused everywhere.

**Isn't:** the product surfaces themselves (covered by customer + admin master views), the design language details (your visual work), or the implementation order (build sequence work).

This is the architectural foundation. Read it. Mark up. Push back. Marked-up version becomes the technical spec for the foundation builds.

---

## Appendix — Rationale behind the infrastructure architecture

*Added after the master view landed, to preserve the reasoning behind the shared infrastructure design.*

### Why the notification engine is the highest-leverage build

The notification engine powers four flagship surfaces:
1. Chef morning brief (the customer product's first impression)
2. Manager site status (the operational manager surface)
3. Owner business pulse (the strategic owner surface, key to Group/Enterprise sales demos)
4. Admin "Needs Attention" feed (operator survival)

Build it once, four surfaces light up. Build any of them separately, you rebuild the engine three times — and they drift apart over time because the implementations diverge.

The architectural pattern (events flow in → dispatcher routes by role → recipients see role-appropriate framing) is also the pattern for almost every intelligent surface in the product. Margin leakage detection feeds it. Stock alerts feed it. Credit note workflows feed it. Cost spike alerts feed it. The engine is infrastructure that surfaces will keep finding new uses for.

Foundation week 1 of the build sequence is *largely* about getting this engine right.

### Why one activity event stream rather than separate logs

Three uses for an event log:
1. **Admin audit log** — what admin actions happened, for security and traceability
2. **Customer activity log** — what customers did, for support and pattern detection
3. **System diagnostic log** — what the system itself did, for debugging

Three separate tables would mean: three migrations, three sets of RLS policies, three dispatcher integration points, three query patterns. And cross-source queries (*"what admin action preceded that customer's issue?"*) become joins between tables that look almost identical.

One `activity_events` table with a `source` column captures all three. Same schema, same indexes, same query patterns, one place to look. The cost is a single column of overhead per row; the gain is dramatically simpler infrastructure.

### Why role detection is separate from permission gating

Two different concerns:
- **Role detection** decides *which shell to render*. Output: chef shell vs manager shell vs owner shell. A user might be entitled to multiple shells (Jack is both owner and active chef); the surface switcher lets them flip.
- **Permission gating** decides *what actions are allowed*. Output: can this user create a recipe? Edit a menu? View billing? Independent of shell.

Conflating them would mean rendering decisions get tangled with access decisions. Cleanly separated: shell is the *experience*, permissions are the *access control*. They share a data source (the user's role per outlet) but they read from it differently.

### Why daily GP snapshots are foundation work

Margins, in any form beyond *"current state right now"*, requires historical data. To say *"GP dropped 4 points this week"* the system needs a snapshot from a week ago to compare against.

The cheapest place to capture this is **daily**, run via a cron job: at midnight UTC, for every dish, compute current cost (from current Bank prices), current GP, and save to `dish_margin_snapshots`. One row per dish per day. Manageable storage even at scale.

Without this snapshot infrastructure: every time window selector option (7D vs 7D, Month vs Last, etc) becomes impossible. With it: any historical comparison is just a query on the snapshot table.

This is genuinely foundation work — has to exist before the Margins surface can function meaningfully. Listed as Step 1 of the Margins build sequence.

### Why feature flags evolve rather than rebuild

Current flag system (`FEATURE_MIN_TIER` as a flat record, kill switches in Platform admin) is simple and works. The temptation when adding role-aware features is to refactor the flag system to handle role-based flags alongside tier-based.

Better approach: keep the current system, *add* role-aware checks where needed, evolve naturally. Premature abstraction of the flag system would slow down v1 features. The flag taxonomy can be refactored when the patterns are clear from real use, not before.

### Why visual design system extraction matters

The admin product has the design language. The customer product (current state) doesn't fully share it. Without extracted design tokens, the two products will drift visually over time — small inconsistencies that compound until they feel like different products from different companies.

Extracting tokens (colour vars, type scale, component primitives) once and applying them to both means: when something changes (a colour tone refines, the type scale adjusts), it changes everywhere. The two products stay aligned by *infrastructure*, not by hand-coordination.

Cost: a few days of token extraction work. Payoff: every future surface built to the same standard.

### What this appendix doesn't capture

The implementation specifics of each system — schema-level decisions, indexing strategies, dispatcher rules, the exact event taxonomy. Those become per-system specs when the builds start. This document is the *strategic* architecture; the *tactical* specs come later.
