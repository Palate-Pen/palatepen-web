# Master view — shared infrastructure

*Locked 2026-05-14 evening. Adds integration layer and forecasting engine as foundation subsystems.*

The cross-cutting systems that serve both customer product and admin product. This document is the strategic architecture; tactical implementation specs come later.

---

## Foundation systems

Five major foundation subsystems sit beneath both products:

1. **Notification engine** — event ingestion, role-routed dispatching, persistent notification records
2. **Activity event stream** — unified event log (admin + customer + system sources)
3. **Role detection + role-aware shell rendering** — determines which shell each user sees
4. **Daily snapshots infrastructure** — historical state captures (margins, stock, supplier prices)
5. **[NEW] Integration layer** — user-credential-based connectors to POS, booking, supplier systems
6. **[NEW] Forward-intelligence / forecasting engine** — consumes data from across the system to surface forward-looking patterns

---

## 1. Notification engine

Unchanged from previous lock. Events flow in from anywhere in the system → dispatcher routes by role → recipients see role-appropriate framing.

Powers chef morning brief, manager site status, owner business pulse, admin Needs Attention feed.

---

## 2. Activity event stream

Unchanged. One `activity_events` table with a `source` column (admin / customer / system). Cross-source queries possible. Same schema, same indexes, three uses.

---

## 3. Role detection + role-aware shell rendering

Unchanged. Separate from permission gating. Outputs *which shell to render*; permissions handle *what actions are allowed*.

---

## 4. Daily snapshots infrastructure

Unchanged. Schema: `dish_margin_snapshots`, `supplier_price_snapshots`, `waste_snapshots`. Written nightly via cron. Enable time-window comparisons across all analytical surfaces.

---

## 5. [NEW] Integration layer

**The largest addition to the infrastructure architecture.** Enables self-serve, user-credential-based connection to external systems (POS, bookings, supplier portals).

### Architectural principles

- **User owns their credentials.** Stored encrypted at rest per tenant, never shared cross-tenant.
- **No B2B partnerships required.** Where the third-party exposes a public API or OAuth, we integrate. Where they don't, we provide manual fallback (CSV import, manual entry).
- **Graceful degradation.** Surfaces work without integrations; they get richer when integrations are connected.
- **Health monitoring per integration.** Each connection has status tracking (Connected / Disconnected / Needs reauth / Failing).

### Schema

```
integration_providers
  id text                -- 'square', 'resy', 'opentable', etc
  category text          -- 'pos' | 'bookings' | 'supplier'
  display_name text
  auth_type text         -- 'oauth' | 'api_key' | 'csv_import'
  status text            -- 'live' | 'beta' | 'planned'

integration_connections
  id uuid
  tenant_id uuid
  provider_id text       -- FK integration_providers
  credentials_encrypted bytea
  connected_at timestamp
  last_sync_at timestamp
  status text            -- 'connected' | 'disconnected' | 'reauth_needed' | 'failing'
  failure_count int
  ...

integration_sync_log
  connection_id
  synced_at
  records_synced int
  errors jsonb
  ...
```

### Integration provider directory at v1

**POS:**
- Square (primary — clean OAuth, best UK and US coverage)
- Lightspeed
- Toast
- Epos Now
- TouchBistro
- Generic CSV import

**Bookings:**
- Resy
- OpenTable (where the user's account exposes API)
- SevenRooms (enterprise)
- DesignMyNight
- Manual covers entry fallback

**Supplier ordering:**
- Brakes portal export
- Bidfood portal export
- Reynolds portal export
- Generic "log your order" fallback for non-portal suppliers

### Per-integration build pattern

Each integration follows a standard pattern:
1. **Provider record** in `integration_providers` table
2. **Auth flow** — OAuth callback or API-key form per provider
3. **Sync worker** — periodic poll or webhook receiver, pulls data into Palatable's normalised tables
4. **Health monitor** — tracks last successful sync, failure counts, reauth needs
5. **Surfacing** — connection appears in user's Connections page; data flows to relevant surfaces

Adding a new POS integration is a 1-2 week engineering build per provider. Adding a booking integration similar. Supplier integrations vary widely based on what the supplier exposes.

### Why this matters architecturally

Without the integration layer, forward-looking intelligence is severely limited. *"Tonight's covers"* needs booking data. *"Tahini's market move — your hummus sells 40/day"* needs POS sales data. *"Heavy delivery week ahead"* needs aggregated supplier ordering data.

The integration layer is what makes the "intelligent sous chef" claim deliverable rather than aspirational.

---

## 6. [NEW] Forward-intelligence / forecasting engine

The subsystem that consumes data from across the platform (recipes, costings, suppliers, invoices, integrations) and surfaces forward-looking intelligence to every customer surface.

### What it produces

Forward-intelligence outputs feed every surface's Looking Ahead section. Specifically:

- **Margin trajectory projection** — given current drift rate, project when GP crosses target threshold
- **Cross-supplier pattern detection** — when multiple suppliers move same direction same time, flag as market signal
- **Delivery week aggregation** — sum next-7-day expected deliveries from booking + ordering records
- **Cover forecasting** — predict tonight/this week covers from booking data + historical patterns
- **Seasonal triggers** — flag when an ingredient's prime season starts (sumac, stone fruit, etc) — drives Notebook revisit intel
- **Recipe staleness detection** — flag recipes/costings not refreshed past threshold
- **Cost spike anticipation** — based on supplier price trend lines, flag likely upcoming spikes

### Architectural pattern

Forward-intelligence runs as a set of **detector functions**, each consuming specific data and outputting structured signals. Signals are stored in a `forward_signals` table with metadata (signal type, severity, target surface, freshness window, dismissed-by-user-at).

Each customer surface queries `forward_signals` filtered to its relevant types and renders Looking Ahead cards accordingly.

```
forward_signals
  id uuid
  tenant_id uuid
  detector text          -- 'margin_trajectory', 'cross_supplier_pattern', etc
  surface text           -- 'chef_home' | 'chef_margins' | 'chef_stock_suppliers' | ...
  severity text          -- 'plan_for_it' | 'heads_up' | 'worth_knowing'
  headline text          -- "Tahini is drifting up across the market."
  body text              -- full body text
  action_label text      -- "See affected dishes"
  action_target text     -- URL or surface anchor
  context text           -- "2 suppliers moving in step"
  data_payload jsonb     -- supporting data for drill-down
  created_at timestamp
  expires_at timestamp
  dismissed_at timestamp
```

### Detector cadence

Most detectors run nightly. Some (cover forecasting given fresh booking data) refresh hourly. Margin trajectory refreshes when invoices land. Cadence is per-detector, tuned to data freshness needs.

### Why this is a foundation system, not surface-specific

Every surface consumes forward-signals. Building forecasting logic into each surface separately would mean three implementations of the same patterns (margin trajectory in Margins, in chef home, in owner business pulse). One forecasting engine emitting structured signals, consumed by surfaces, is the right architecture.

---

## Visual design system extraction

Unchanged from previous lock. Tokens get formal extraction into `design-tokens.ts` so customer and admin products stay aligned by infrastructure, not hand-coordination.

---

## Feature flag system

Unchanged from previous lock. Current `FEATURE_MIN_TIER` model evolves rather than rebuilds. Role-aware checks added inline.

---

## Build sequence implications

The two new foundation systems (integration layer + forecasting engine) extend the foundation phase of the build sequence. See `pre-launch-build-sequence.md` for the revised phasing.

---

## Rationale appendix

### Why the integration layer is genuinely foundation work

It's tempting to treat integrations as "features added later." But the forward-intelligence claim — what makes the product feel sous-chef-like — depends on having data the system doesn't author itself (bookings, sales, supplier ordering schedules). Building forward-intelligence as a "feature" on top of data that doesn't exist would mean the surfaces look right but feel hollow. The integration layer ships at foundation so that forward-intelligence has data to consume from day one.

### Why forecasting engine is its own subsystem rather than per-surface logic

The same forecasting patterns appear across multiple surfaces. Margin trajectory shows up on chef home morning brief, on chef Margins Looking Ahead, on owner business pulse. Cross-supplier pattern detection feeds Stock & Suppliers but also flows back to chef home as "supplier of the week to watch." Building this logic per-surface would create three implementations that drift. One engine emitting structured signals consumed by surfaces is the only sustainable architecture.

### Why user-credential rather than B2B partnerships

Three reasons covered in detail in `master-customer-product.md`. Short version: no budget for business development, user already pays the third party, faster to launch.
