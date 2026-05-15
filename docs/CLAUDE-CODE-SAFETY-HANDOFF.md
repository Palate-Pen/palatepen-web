# Claude Code Handoff — Palatable Safety Module v1

**Generated:** Friday 15 May 2026  
**Scope:** Safety module only (the SFBB digital diary + supporting surfaces)  
**For:** Claude Code running in `C:\Users\jack-\Documents\palateandpen\web\`  
**Repo:** `Palate-Pen/palatepen-web` on GitHub  
**App lives at:** `/mise` and `/mise/app` (folder still uses legacy name — see note below)  
**Target domain:** `app.palateandpen.co.uk` (Vercel + Cloudflare)  
**Supabase project:** `xbnsytrcvyayzdxezpha` (EU West London region)

---

## Read Me First

This document covers the **Palatable Safety module v1 only**. The rest of Palatable (chef shell, manager shell, founder admin, design system) is documented separately. Safety is being scoped as its own focused build because:

1. It's the most distinctive wedge in the competitive landscape
2. It's the v1 upgrade trigger (£99/site Kitchen+Safety vs £79 Kitchen)
3. It has the strictest legal liability framing — needs careful execution
4. The seven surfaces share a consistent component pattern that lifts the whole module if built well

### Naming convention

The product is **Palatable**. The folder is still `/mise` because we haven't renamed the directory tree. New code refers to "Palatable" in UI strings, marketing copy, and database string defaults. File paths stay unchanged for now.

### Critical Windows convention

**All file writes via Node.js setup scripts.** Direct file write tools corrupt Windows file encoding. Write a `setup-NNN-thing.js`, run it with Node. This is non-negotiable across the whole repo.

---

## 1. What Safety Is

Palatable Safety is the **v1 SFBB digital diary** — a record-keeping tool that replaces the FSA's paper diary every UK kitchen is legally obliged to keep. It is not certification. It is not legal advice. It is not a substitute for an EHO inspection. **It is a tool that holds the records, with full liability on the operator.**

The module has seven surfaces:

| # | Surface | Purpose |
|---|---|---|
| 1 | Safety home | Daily-use dashboard, opening checks, 12-week diary calendar |
| 2 | Probe Reading | Log a temperature reading, dish-linked to live menu |
| 3 | Log an Issue | Incident logging (complaint / allergy / near-miss / illness) |
| 4 | Cleaning Schedule | Daily / weekly / monthly cleaning tasks with sign-off |
| 5 | Training Records | Staff certifications with expiry tracking |
| 6 | HACCP Wizard | 9-step guided plan builder (v2 upgrade trigger) |
| 7 | **EHO Visit** | Inspection control desk — pulls everything into one view |

Number 7 is the most strategically important. It's the page that justifies the entire Safety module in every demo conversation.

---

## 2. Why This Matters Commercially

**Pricing.** Safety adds £20/site/month to the Kitchen tier:
- Kitchen: £79/site/mo (without Safety)
- **Kitchen + Safety: £99/site/mo**
- Group + Safety: £149/site/mo

**Competition.** The named players in the UK food safety software space:
- **Food Alert / Alert65** — £150-300+ /site/mo + consultancy fees + 24/7 advice line. 6,000+ UK customers. Enterprise positioning.
- **Navitas** — £117+ /site/mo + hardware (sensors, label printers). Hardware-heavy. Reviews are brutal ("worst software I've used since starting my business 4 years ago").
- **Label It** — single-purpose allergen label printer. Used alongside other tools.

Palatable Safety v1 competes at a fraction of the price, bundled with the chef-shell workflow. Owners replace two or three tools, not just one.

**The strategic story:**
> *"Palatable Safety is the chef's daily kitchen logbook + the inspector's instant evidence bundle. SFBB diary, probe logs, allergen records, cleaning schedules, training certificates, incident logs — one platform, one workflow, one £20/month uplift. When the EHO walks in, you don't reach for a binder. You open the iPad."*

---

## 3. What's In This Bundle

```
palatable-safety-2026-05-15/
├── 01-mockups/                                   # 7 HTML mockups
│   ├── chef-safety-mockup-v1.html                # Safety home
│   ├── chef-safety-probe-mockup-v1.html          # Probe Reading
│   ├── chef-safety-issue-mockup-v1.html          # Log an Issue
│   ├── chef-safety-cleaning-mockup-v1.html       # Cleaning Schedule
│   ├── chef-safety-training-mockup-v1.html       # Training Records
│   ├── chef-safety-haccp-mockup-v1.html          # HACCP Wizard
│   └── chef-safety-eho-mockup-v1.html            # EHO Visit
│
└── 02-handoff/
    └── CLAUDE-CODE-SAFETY-HANDOFF.md             # this file
```

Each HTML mockup is self-contained — open in browser to see the full surface with design notes at the bottom. Claude Code can read the rendered HTML and extract layout, components, and design tokens directly.

---

## 4. Build Sequence — Three Weeks

### Week 1 — Schema, shared components, onboarding

Get the foundation right. Nothing else works without this.

#### 1.1 Migrations to write

Write each as a separate file in `mise/app/supabase/migrations/`:

```
20260515_001_safety_tables.sql
20260515_002_menu_versions.sql            # critical for probe audit trail
20260515_003_safety_rls.sql
```

#### 1.2 Safety schema

```sql
-- 20260515_001_safety_tables.sql

-- Opening checks (fridges, freezers, handwash, pest, cleaning verified)
create table safety_opening_checks (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  check_date date not null,
  check_type text not null,            -- walk_in / fridge_2 / freezer / handwash / pest / cleaning
  reading_numeric numeric,             -- temp in C, null for boolean checks
  reading_text text,                   -- e.g. "Complete", "3/3"
  status text not null,                -- pending / done / flagged
  logged_at timestamptz,
  logged_by uuid references staff(id),
  notes text,
  created_at timestamptz not null default now()
);
create index on safety_opening_checks (venue_id, check_date);

-- Probe readings (linked to menu version for full audit trail)
create table safety_probe_readings (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  reading_at timestamptz not null default now(),
  check_type text not null,            -- cooking_core / hot_holding / cooling / reheating / chilled / frozen
  temperature_c numeric not null,
  target_min_c numeric,                -- for "must be above" checks (e.g. cooking)
  target_max_c numeric,                -- for "must be below" checks (e.g. chilled)
  status text not null,                -- healthy / warn / urgent
  
  -- Dish linkage (one of these is filled; or freeform_item is filled)
  recipe_id uuid references recipes(id),
  prep_item_id uuid references prep_items(id),
  menu_item_id uuid references menu_items(id),
  menu_version_id uuid references menu_versions(id),
  freeform_item text,                  -- "staff lunch chicken", etc
  
  logged_by uuid references staff(id) not null,
  notes text,
  
  -- For v2 digital probe integration (not used in v1, but field exists)
  source text default 'manual',        -- manual / bluetooth_thermapen / bluetooth_eti
  device_id text,
  
  created_at timestamptz not null default now()
);
create index on safety_probe_readings (venue_id, reading_at desc);
create index on safety_probe_readings (recipe_id);
create index on safety_probe_readings (menu_version_id);

-- Incidents (complaints, allergy, near-miss, illness)
create table safety_incidents (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  incident_type text not null,         -- complaint / allergy / near_miss / illness
  severity text not null,              -- low / medium / high
  occurred_at timestamptz not null,
  service_period text,                 -- e.g. "Dinner — 20:45"
  
  -- Allergen linkage (14 UK regulated allergens)
  allergens text[],
  
  -- Dish linkage (same pattern as probe)
  recipe_id uuid references recipes(id),
  menu_item_id uuid references menu_items(id),
  menu_version_id uuid references menu_versions(id),
  freeform_item text,
  
  description text not null,
  corrective_actions jsonb,            -- array of {action_type, taken_bool, taken_at}
  status text not null default 'open', -- open / resolved
  resolved_at timestamptz,
  
  logged_by uuid references staff(id) not null,
  created_at timestamptz not null default now()
);
create index on safety_incidents (venue_id, occurred_at desc);

-- Cleaning schedule definitions (the template)
create table safety_cleaning_tasks (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  task_name text not null,
  frequency text not null,             -- daily / weekly / monthly / quarterly / annual / per_use
  group_name text,                     -- "Opening Clean", "Mid-Day", "Before Service Tonight"
  method text,                         -- the SFBB compliance hook
  is_active boolean not null default true,
  display_order int,
  created_at timestamptz not null default now()
);

-- Cleaning sign-offs (individual completions)
create table safety_cleaning_signoffs (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  task_id uuid not null references safety_cleaning_tasks(id),
  completed_at timestamptz not null default now(),
  completed_by uuid references staff(id) not null,
  notes text,
  created_at timestamptz not null default now()
);
create index on safety_cleaning_signoffs (venue_id, completed_at desc);

-- Training certificates
create table safety_training_certs (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  staff_id uuid not null references staff(id),
  cert_type text not null,             -- level_2_food_hygiene / level_3 / allergen_awareness / haccp / manual_handling
  provider text,                       -- CIEH / Highfield / FSA / internal
  certified_at date not null,
  expires_at date,
  certificate_url text,                -- uploaded PDF in Supabase storage
  notes text,
  created_at timestamptz not null default now()
);
create index on safety_training_certs (venue_id);
create index on safety_training_certs (staff_id);
create index on safety_training_certs (expires_at);

-- HACCP plans (one per venue, versioned)
create table safety_haccp_plans (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  version int not null default 1,
  status text not null default 'draft', -- draft / published / superseded
  
  -- Step 1: Business Profile
  trading_name text,
  legal_entity text,
  fsa_registration text,
  kitchen_type text,
  services_offered text[],
  team_size_band text,
  responsible_person_id uuid references staff(id),
  
  -- Steps 2-7 (structured JSON)
  menu_hazard_analysis jsonb,          -- dish_id -> {risk_level, justification}
  control_points jsonb,                -- ccp definitions per dish
  critical_limits jsonb,               -- target temps etc
  monitoring_procedures jsonb,         -- maps CCPs to Safety tab checks
  corrective_actions jsonb,            -- response playbook
  verification_schedule jsonb,         -- review cadence + sign-offs
  
  published_at timestamptz,
  published_by uuid references staff(id),
  next_review_at date,
  generated_pdf_url text,              -- Supabase storage URL
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- EHO visits (one row per visit, with snapshot)
create table safety_eho_visits (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  visit_start_at timestamptz not null,
  visit_end_at timestamptz,
  
  inspector_name text,
  inspector_authority text,
  inspector_id text,
  visit_type text,                     -- routine / complaint_response / follow_up / unannounced
  
  rating_given text,                   -- 5 / 4 / 3 / 2 / 1 / 0 / pending
  
  visit_log jsonb,                     -- array of {timestamp, tag, text}
  export_pdf_url text,                 -- snapshot of evidence bundle at visit
  data_snapshot jsonb,                 -- frozen copy of all evidence at visit start
  
  status text not null default 'in_progress', -- in_progress / completed
  ended_by uuid references staff(id),
  follow_up_required boolean not null default false,
  follow_up_notes text,
  
  created_at timestamptz not null default now()
);
create index on safety_eho_visits (venue_id, visit_start_at desc);

-- Liability acknowledgement (every user must accept before using Safety)
create table safety_liability_acks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  venue_id uuid not null references venues(id),
  acknowledged_at timestamptz not null default now(),
  ack_version int not null,            -- bump if we change the wording
  ip_address inet,
  user_agent text
);
```

#### 1.3 menu_versions — critical for probe audit trail

```sql
-- 20260515_002_menu_versions.sql
-- This is what makes the dish-linked probe readings audit-proof.

create table menu_versions (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references menus(id) on delete cascade,
  version_number int not null,
  published_at timestamptz not null default now(),
  published_by uuid references staff(id),
  snapshot jsonb not null,             -- frozen state of menu + items + allergens at publish time
  unique (menu_id, version_number)
);
create index on menu_versions (menu_id, version_number desc);

-- Trigger: every time a menu is published, snapshot to menu_versions automatically
create or replace function snapshot_menu_on_publish()
returns trigger as $$
begin
  if new.status = 'published' and (old.status is null or old.status != 'published') then
    insert into menu_versions (menu_id, version_number, published_by, snapshot)
    values (
      new.id,
      coalesce((select max(version_number) from menu_versions where menu_id = new.id), 0) + 1,
      new.published_by,
      to_jsonb((select row_to_json(m) from (select * from menus where id = new.id) m))
    );
  end if;
  return new;
end;
$$ language plpgsql;

create trigger menu_publish_snapshot
  after update on menus
  for each row execute function snapshot_menu_on_publish();
```

Why this matters: when an EHO asks "show me when you served lamb shoulder last Tuesday and what its allergen list was that day," we need to point at the exact menu version that was live, not the current menu (which may have changed).

#### 1.4 RLS policies

Every Safety table needs Row-Level Security. The standard pattern:

```sql
-- 20260515_003_safety_rls.sql

alter table safety_opening_checks enable row level security;
alter table safety_probe_readings enable row level security;
alter table safety_incidents enable row level security;
alter table safety_cleaning_tasks enable row level security;
alter table safety_cleaning_signoffs enable row level security;
alter table safety_training_certs enable row level security;
alter table safety_haccp_plans enable row level security;
alter table safety_eho_visits enable row level security;
alter table safety_liability_acks enable row level security;

-- Standard venue-member access (apply to every safety_* table):
create policy "safety_opening_checks_member_access"
  on safety_opening_checks for all
  to authenticated
  using (
    exists (
      select 1 from venue_members
      where venue_members.venue_id = safety_opening_checks.venue_id
        and venue_members.user_id = auth.uid()
    )
  );
-- Repeat the same pattern for each safety_* table.
-- safety_liability_acks needs additional self-only insert policy.
```

#### 1.5 Shared components

Build these first because every Safety surface uses them:

**`mise/app/components/safety/LiabilityFooter.tsx`** — locked wording, never edit per-page:

```tsx
export function LiabilityFooter() {
  return (
    <div className="liability-footer">
      <div className="liability-label">Important — Your Responsibility</div>
      <div className="liability-body">
        Palatable is a record-keeping tool. <strong>The food business operator remains fully responsible</strong> for compliance with UK food safety law, including the Food Safety Act 1990, Regulation (EC) 852/2004, Natasha's Law, and all guidance from the Food Standards Agency and your local authority. Palatable does not provide legal advice or certification, does not replace EHO inspection, and does not guarantee compliance. We keep the records straight. The decisions, the kitchen, and the responsibility are yours.
      </div>
    </div>
  );
}
```

For the HACCP wizard, build a separate `<HaccpStrongerLiabilityFooter />` with the urgent-red treatment and stronger wording (see `chef-safety-haccp-mockup-v1.html`).

**`mise/app/components/safety/FsaReferenceStrip.tsx`**:

```tsx
type FsaReferenceStripProps = {
  variant?: 'sidebar' | 'fullwidth';
  intro: string;                      // body paragraph
  links: FsaLink[];                   // pick from FSA_LINKS
};

export function FsaReferenceStrip({ variant = 'sidebar', intro, links }: FsaReferenceStripProps) {
  // Renders the gold-bordered card with intro + link grid.
  // sidebar = single column links, fullwidth = 2-col grid
}
```

**`mise/app/lib/safety/fsa-links.ts`** — the canonical link library:

```ts
export const FSA_LINKS = {
  sfbb: {
    title: 'Safer Food, Better Business (SFBB)',
    href: 'https://www.food.gov.uk/business-guidance/safer-food-better-business-sfbb'
  },
  sfbbCooking: {
    title: 'SFBB — Cooking section',
    href: 'https://www.food.gov.uk/business-guidance/safer-food-better-business-sfbb'
  },
  sfbbCleaning: {
    title: 'SFBB — Cleaning section',
    href: 'https://www.food.gov.uk/business-guidance/safer-food-better-business-sfbb'
  },
  fsms: {
    title: 'Food safety management for businesses',
    href: 'https://www.food.gov.uk/business-guidance/business-guidance/food-safety-management-for-businesses'
  },
  allergens: {
    title: 'Allergen guidance for food businesses',
    href: 'https://www.food.gov.uk/business-guidance/allergen-guidance-for-food-businesses'
  },
  training: {
    title: 'Online food safety training (free)',
    href: 'https://www.food.gov.uk/business-guidance/online-food-safety-training'
  },
  reporting: {
    title: 'Report a food problem',
    href: 'https://www.food.gov.uk/contact/consumers/report-a-food-problem'
  },
  hereToHelp: {
    title: 'FSA Here to Help — business hub',
    href: 'https://www.food.gov.uk/here-to-help'
  },
  ratings: {
    title: 'How food hygiene ratings work',
    href: 'https://www.food.gov.uk/business-guidance/how-food-hygiene-ratings-work'
  },
  starting: {
    title: 'Starting a food business',
    href: 'https://www.food.gov.uk/business-guidance/getting-ready-to-start-your-food-business'
  },
  hygiene: {
    title: 'Food hygiene business guidance',
    href: 'https://www.food.gov.uk/food-hygiene'
  },
} as const;

export type FsaLink = typeof FSA_LINKS[keyof typeof FSA_LINKS];
```

**`mise/app/components/safety/SafetyOnboardingModal.tsx`** — first-time gate:

The Safety tab is blocked by a modal until the user clicks "I Acknowledge & Continue." Modal text uses the locked liability wording (see mockup design notes). On accept, insert a row into `safety_liability_acks`. Re-prompt if `ack_version` is ever bumped.

#### 1.6 Routes to add

```
mise/app/(chef)/safety/page.tsx                       → Safety home
mise/app/(chef)/safety/probe/page.tsx                 → Probe Reading
mise/app/(chef)/safety/issue/page.tsx                 → Log an Issue
mise/app/(chef)/safety/cleaning/page.tsx              → Cleaning Schedule
mise/app/(chef)/safety/training/page.tsx              → Training Records
mise/app/(chef)/safety/haccp/page.tsx                 → HACCP Wizard landing
mise/app/(chef)/safety/haccp/step/[n]/page.tsx        → Each wizard step
mise/app/(chef)/safety/eho/page.tsx                   → EHO Visit
```

Sidebar nav: insert "Safety" between **Prep** (position 2) and **Recipes** (position 4). Shield icon. Active state with gold left border.

---

### Week 2 — Daily-use surfaces

Build the four core Safety pages in this order:

#### Day 1-2: Safety home (`chef-safety-mockup-v1.html`)

The dashboard. Reference the mockup for layout. Key elements:

- **Date strip** at top: "Friday 15 May 2026 · Week 20 · Day 5 of 7 · Service in 3hr 40min"
- **Looking Ahead bar** (gold left border, 3 forward-intelligence items)
- **Opening Checks grid** (2×3, 6 cards: walk-in, fridge 2, freezer, cleaning verified, handwash, pest)
- **During Service auto-logged grid** (auto-populated from Deliveries / Prep / Waste)
- **Two-column bottom**: 12-week diary calendar (left), Quick Actions + EHO Mode card (right)
- **FSA Reference Strip** (full-width variant, 6 links)
- **Liability footer**

The diary calendar is a 7-day grid showing the last 12 weeks. Each day has a status dot:
- Green = all checks complete
- Amber = partial
- Red = not logged
- Gold border = today

Compute these statuses from `safety_opening_checks` aggregated by day.

#### Day 3: Probe Reading (`chef-safety-probe-mockup-v1.html`)

The most architecturally important surface in v1. Every probe reading carries a menu version snapshot.

Key elements:
- **Breadcrumb** at top: Safety › Log a Probe Reading
- **Check type picker** (6 cards): cooking core / hot holding / cooling / reheating / chilled / frozen. Each carries FSA target underneath.
- **Dish picker** with three tabs (Today's Menu / Prep Items / Recipes Library). Pull today's menu from `menus` where `status = published` AND `served_on` matches today.
- **Free-form fallback** below dish picker — italic placeholder text
- **Temperature input** — large mono-font, validates live against the selected check type's target. Healthy-green border if above/below target appropriately; attention-amber if out of range.
- **Notes textarea** (optional)
- **Today's Readings panel** in right column (chronological list)
- **FSA Reference Strip** (3 links: SFBB, Food safety management, FSA Here to Help)
- Ghost card for v2 digital probe integration

When chef submits: insert into `safety_probe_readings`. If a dish was selected, look up the current `menu_versions.id` for that menu and snapshot the relationship. If the menu changes tomorrow, this historical record still points at the version that was live today.

#### Day 4: Log an Issue (`chef-safety-issue-mockup-v1.html`)

Incident logging. Key elements:
- **Issue type picker** (4 cards): Complaint / Allergy / Near-Miss / Illness. Each with its own icon. Allergy and Illness use urgent-red active state; Complaint and Near-Miss use attention-amber.
- **Severity picker** (3 cards): Low / Medium / High
- **Allergen pills** — all 14 UK regulated allergens as togglable pills (Celery, Cereals/Gluten, Crustaceans, Eggs, Fish, Lupin, Milk, Molluscs, Mustard, Nuts, Peanuts, Sesame, Soya, Sulphites). Selected pills fill urgent-red.
- **Dish picker** (same component as Probe page) + free-form fallback
- **When-it-happened** (date + service period)
- **Description textarea** — the audit narrative
- **Corrective actions checklist** (7 standard actions)
- **Recent Issues panel** in right column
- **FSA Reference Strip** (3 links: Allergen guidance, Reporting a food problem, Food safety management)

#### Day 5: Cleaning Schedule (`chef-safety-cleaning-mockup-v1.html`)

Key elements:
- **Frequency tabs** at top: Today (8/12) · This Week (5/9) · This Month (2/7) · Quarterly & Annual (1/4). Numbers are live counts from `safety_cleaning_signoffs`.
- **Progress card** with healthy-green bar + Looking-Ahead-style status line
- **Task groups** by service period: Opening Clean Before Service · Mid-Day Between Services · Before Service Tonight
- Each task row: checkbox · task name · **method line in italic** (the SFBB compliance hook) · sign-off · frequency tag
- **Overdue state** in urgent-red border for tasks past their next-due date
- **Today's Sign-Offs panel** in right column
- **FSA Reference Strip** (3 links: SFBB Cleaning, Food hygiene, Food safety management)

When a venue onboards, populate `safety_cleaning_tasks` from a default SFBB-aligned template:
- 12 daily tasks (opening clean × 5, mid-day × 3, evening × 4)
- 9 weekly tasks (deep cleans, filter changes, gasket checks)
- 7 monthly tasks (extractor service, deep-fryer drain, etc)
- 4 quarterly/annual tasks

Chef can edit, add, or remove tasks from the master schedule.

#### Day 6-7: Training Records (`chef-safety-training-mockup-v1.html`)

Key elements:
- **Summary row** (4 cards): Active Staff (healthy) · Expiring Soon (attention) · Expired (urgent) · Total Certificates (neutral)
- **Staff cards** — one per team member. Each card: avatar with initials in gold · name · role · since-date · overall status pill
- **Certificate rows** inside each card: cert name, provider, expiry date in mono font, colour-coded status (valid green / expiring amber / expired red)
- **Expiring & Expired panel** in right column (sorted by urgency)
- **FSA Reference Strip** (3 links: **Online food safety training (free)** — point chefs to FSA's actual free training, Allergen requirements, Food safety management)
- **Why-This-Matters note** at bottom of right column

Certificate types library: `level_2_food_hygiene`, `level_3_food_hygiene`, `allergen_awareness`, `haccp_principles`, `manual_handling`.

Cross-shell loop: 30/14/7/0 days before expiry → Inbox notifications + Looking Ahead Get-Ready tag on Chef Home.

---

### Week 3 — HACCP Wizard + EHO Visit

The two surfaces that complete the module.

#### Day 1-3: HACCP Wizard (`chef-safety-haccp-mockup-v1.html`)

9-step wizard. The full architecture:

```
Step 1: Business profile           5 min   (pre-fill from Settings)
Step 2: Menu & hazard analysis     10 min  (auto-populate from menu)
Step 3: Critical Control Points    8 min   (per high-risk dish)
Step 4: Critical limits            4 min   (FSA defaults pre-filled)
Step 5: Monitoring procedures      5 min   (maps to Safety tab checks)
Step 6: Corrective actions         5 min   (from library)
Step 7: Verification & review      3 min
Step 8: Document generation        2 min   (formatted PDF output)
Step 9: Annual review              3 min   (next-year reminder)
```

Build Step 1 first (the mockup shows this), then 2-7 share the same pattern, then 8 is the PDF generation.

Step 1 — Business Profile fields:
- Trading Name (pre-filled from Settings)
- Legal entity + FSA registration (pre-filled)
- Kitchen type (6 pickable cards: Restaurant / Gastropub / Café / Takeaway / Catering / Food Truck)
- Services offered (8 multi-select boxes)
- Team size band (4 cards, auto-suggested from Training Records count)
- Person responsible (pre-filled from Training Records — head chef with valid HACCP cert)

**Stronger liability footer.** HACCP plans are legal documents. Use the urgent-red treatment from the mockup. The exact wording is locked in `chef-safety-haccp-mockup-v1.html`.

Step 2 — Menu Analysis:
- Pull every published menu item
- Auto-classify each as Low / Medium / High risk based on recipe components:
  - **High-risk**: raw meat, raw eggs, raw fish, dairy in long-cook items, pre-prepared cooked items held warm
  - **Medium-risk**: cooked-then-cooled items, ambient-held items
  - **Low-risk**: dry goods, ambient-stable items, freshly-prepared ready-to-eat
- Chef confirms or overrides each classification
- Output: `safety_haccp_plans.menu_hazard_analysis` JSONB

Step 4 — Critical Limits library (FSA defaults):
- Cooking core: ≥75°C / 30 sec (or equivalent — 70°C/2min, 80°C/6sec)
- Hot holding: ≥63°C
- Chilled storage: ≤5°C
- Frozen storage: ≤-18°C
- Cooling: ≤8°C within 90 min of cooking
- Reheating: ≥75°C

Step 8 — Document generation:
- Server-side React component → PDF via `@react-pdf/renderer` (preferred for lighter Vercel cold start) or Puppeteer (heavier but better HTML fidelity)
- Test with the worked example: Berber & Q · Shoreditch profile
- Three artefacts: full HACCP plan PDF, chef's reference card (printable for kitchen wall), cross-reference doc showing which Safety tab checks satisfy which CCP
- Store in Supabase storage at `safety/haccp/{venue_id}/v{version}.pdf`

#### Day 4-7: EHO Visit (`chef-safety-eho-mockup-v1.html`)

The strategically most important page. Build it last because it depends on everything else being live.

Key elements:
- **Command Header** — ink-black background with gold left border. Unlike every other Safety surface (paper-warm), this signals "this is the moment that matters."
- **Gold-filled "Export 90-Day Bundle" button** at top right with "PDF · 47 pages · 4 seconds to generate" subtitle. The speed claim must be real.
- **Visit Status row** with live timer (re-render every minute) + animated pulsing healthy-green dot
- **Compliance Posture** — 5 metric cards. Honest, not inflated. The two flags in the mockup are real (cleaning gaps + expired training).
- **Evidence Grid** — 10 tiles pulling from across the system: HACCP/SFBB Plan · Daily Diary · Temperature Records · Supplier Deliveries · Allergen Records · Cleaning Schedule · Training Records · Incident Log · Waste Log · Registration & History
- **Inspector Details card** — 4 editable fields (Name, Authority, ID, Visit Type)
- **Live Visit Log** (sticky right column) — chef types events as they happen. Four tag types: Arrival (ink) · Observed (gold) · Requested (amber) · Note (paper). Auto-saves every entry.
- **FSA Reference Strip** with "For the Inspector" framing — 4 links including How Food Hygiene Ratings Work

**The "Visit In Progress" flow:**

When chef hits "Start Visit" toggle:
1. Create row in `safety_eho_visits` with `status = 'in_progress'`
2. **Snapshot every Safety record** into `data_snapshot` JSONB — so anything edited mid-visit doesn't change what was shown to the EHO
3. Pre-generate the export PDF in the background via Inngest (so the "4 seconds" claim works)
4. Surface the live timer (re-render every minute via server action)
5. Route to Manager Home + Inbox as critical alert (if multi-site)

When chef hits "End Visit":
1. Set `status = 'completed'`, `visit_end_at = now()`
2. Prompt for rating note (good visit / minor follow-up / formal issues raised)
3. Auto-create Looking Ahead items from any flagged tiles (e.g. "Address Sunday cleaning gap before next visit")
4. Email visit log + PDF to owner

**The 90-day export PDF bundle** contents:
1. Cover page (FSA reg + current FHRS rating + venue details)
2. Executive summary (one-pager)
3. HACCP plan (or "in development" if wizard not complete)
4. 90 days of daily diary entries
5. All probe readings with menu version references
6. All deliveries with supplier temps
7. Allergen map (recipes × 14 allergens grid)
8. Cleaning schedule sign-offs (chronological)
9. Training records with expiry dates
10. Incident log with corrective actions
11. Waste log summary
12. **Footer on every page**: liability footer + FSA citation for that section's records

---

## 5. Cross-Shell Event Loop

The Safety module is wired into the rest of Palatable. When a Safety event fires, it routes to multiple surfaces:

**Probe reading flagged urgent →** Safety home diary dot turns amber/red · Looking Ahead on Chef Home · Inbox notification · Recipes (probe count on linked dish)

**Allergy incident logged →** Manager Home critical alert · Looking Ahead "review with team" tag · Recipes (incident count on linked dish) · EHO export bundle

**Cleaning task missed Sunday →** Looking Ahead Plan-For-It tag · Safety home calendar dot red · pattern detection ("3 of last 4 Sundays")

**Training expires in 14 days →** Looking Ahead Get-Ready tag · Inbox notification · Training Records expiring panel

**Supplier delivery temp out of spec →** Safety home (temperature deviation) · Suppliers (reliability score drop) · Looking Ahead

Build the event bus as `mise/app/lib/safety/events.ts` using Postgres triggers → Supabase Realtime channels → server actions that revalidate paths.

---

## 6. Liability Framing — Non-Negotiable

Every Safety page carries the same liability footer with exact locked wording. The HACCP Wizard has a stronger version (urgent-red bordered).

First-time users must accept the disclaimer via `SafetyOnboardingModal` before entering the Safety tab. Acceptance is recorded in `safety_liability_acks`.

Settings has the full legal version + link to FSA's free SFBB pack.

EHO export PDF carries the same footer on every page so inspectors see we're not claiming certification.

**Never soften the language. Never remove the footer. Never bypass the acknowledgement modal.**

This is what protects Palatable legally and what makes us a credible record-keeping tool rather than overreaching into territory we're not qualified for.

---

## 7. Design System Reference — Safety Module

The Safety module follows Palatable design system v7. Key tokens specific to Safety:

```css
/* Type — full system: Lora + Inter + Cinzel + JetBrains Mono */

/* Colour — severity palette is critical for Safety */
--healthy: #5D7F4F;          /* compliant, valid, complete */
--attention: #B86A2E;        /* warning, expiring, partial */
--urgent: #A14424;           /* expired, alarm, missed */
--gold: #B8923C;             /* Palatable signature, FSA strip border */

/* Severity backgrounds (for badge / card tints) */
--healthy-bg: rgba(93,127,79,0.08);
--attention-bg: rgba(184,106,46,0.06);
--urgent-bg: rgba(161,68,36,0.08);
```

**Voice tokens specific to Safety:**
- Italic gold em accents for menu-linked dish names: *"lamb shoulder"* in italic gold
- Day-not-time language: *"Friday 15 May 2026 · Service in 3hr 40min"*
- Anticipatory Looking-Ahead voice: *"Fridge 2 has crept up 0.4°C this week — service in 14 days"*
- Page titles end with italic gold em-clauses: *"Today's safety log."*, *"Build your HACCP plan."*, *"Your inspection control desk."*
- Subtitles are italic Lora muted-grey — the writer's voice, not the system voice

---

## 8. Critical Technical Decisions

### 8.1 PDF generation
`@react-pdf/renderer` for lighter Vercel cold start. Test bundle generation under 5 seconds for a 47-page document. If fidelity insufficient, fall back to Puppeteer with a separate render service.

### 8.2 Background jobs
Inngest preferred (built for serverless on Vercel, no Redis dependency). Use for:
- EHO PDF pre-generation when Visit Starts
- Nightly training-cert expiry check
- Weekly cleaning-pattern analysis (detect Sunday gaps)
- 30/14/7/0-day expiry notifications

### 8.3 Real-time updates
Supabase Realtime channels for:
- Multi-user kitchens — when Sam logs a check, Jack's screen updates
- EHO Visit live timer
- Looking Ahead feed updates

### 8.4 File storage
Supabase Storage buckets:
- `safety-certificates/` — uploaded training cert PDFs (RLS: venue members only)
- `safety-haccp/` — generated HACCP plan PDFs
- `safety-eho-exports/` — generated 90-day export bundles

---

## 9. First Five Commits

```
Commit 1: feat(safety): schema + RLS
  - migration 20260515_001_safety_tables.sql
  - migration 20260515_002_menu_versions.sql
  - migration 20260515_003_safety_rls.sql
  - regenerate Supabase types via setup-001-supabase-types.js
  - tests: schema integrity (no missing FKs, RLS enforced on all tables)

Commit 2: feat(safety): shared components + onboarding gate
  - components/safety/LiabilityFooter.tsx
  - components/safety/FsaReferenceStrip.tsx
  - components/safety/SafetyOnboardingModal.tsx
  - lib/safety/fsa-links.ts
  - middleware to redirect users without ack to onboarding modal
  - tests: ack creates row in safety_liability_acks

Commit 3: feat(safety): Safety home page
  - app/(chef)/safety/page.tsx
  - components/safety/OpeningChecksGrid.tsx (6 check cards)
  - components/safety/AutoLoggedGrid.tsx (pulls from Deliveries/Prep/Waste)
  - components/safety/DiaryCalendar.tsx (12-week × 7-day grid)
  - components/safety/QuickActionsPanel.tsx (4 destinations)
  - components/safety/EhoModeCard.tsx (export button + stats)
  - FSA Reference Strip (6 links, fullwidth variant)
  - server actions to log opening checks
  - tests: opening check log flow, diary calendar status computation

Commit 4: feat(safety): Probe Reading page (the dish-linked logger)
  - app/(chef)/safety/probe/page.tsx
  - components/safety/CheckTypePicker.tsx (6 types with FSA targets)
  - components/safety/DishPicker.tsx (3 tabs + free-form, reusable)
  - components/safety/TemperatureInput.tsx (live validation against target)
  - components/safety/TodaysReadingsPanel.tsx
  - server action: insertProbeReading() with menu version snapshot
  - tests: probe reading inserts with menu_version_id; reading validates against check type target

Commit 5: feat(safety): Log an Issue page
  - app/(chef)/safety/issue/page.tsx
  - components/safety/IssueTypePicker.tsx (4 cards)
  - components/safety/SeverityPicker.tsx (3 cards)
  - components/safety/AllergenPills.tsx (14 togglable pills)
  - components/safety/CorrectiveActionsList.tsx (7 standard items)
  - components/safety/RecentIssuesPanel.tsx
  - reuse DishPicker from Commit 4
  - server action: insertIncident()
  - tests: issue logging with allergens array, high-severity routes to Inbox
```

Each commit is sized for one Claude Code session (~2-4 hours of agentic work). After Commit 5, the same pattern repeats for the remaining four Safety pages (Cleaning, Training, HACCP Wizard, EHO Visit).

---

## 10. Conventions for Claude Code

### File creation rule
Every file write through a Node setup script. Pattern: `mise/app/scripts/setup-NNN-thing.js` emits one or more files. Run with `node`.

### Database changes
Always new migration. Never edit existing. Format: `YYYYMMDD_NNN_description.sql` in `mise/app/supabase/migrations/`. Push via `supabase db push`.

### Component organisation
Shared Safety components under `mise/app/components/safety/`. Radix UI primitives only.

### Styling
Tailwind classes only. Design tokens in `mise/app/tailwind.config.ts`. Never inline hex values — reference tokens.

### Type safety
Strict TypeScript. `pnpm typecheck` must pass before commit. Supabase types: `supabase gen types typescript --project-id xbnsytrcvyayzdxezpha` → `mise/app/types/supabase.ts`.

### Testing
Unit tests with Vitest alongside source. Integration tests with Playwright in `mise/app/e2e/safety/`.

### Commits
Conventional commits, branched off `main`, squash merge:
- `feat(safety): ship probe reading page`
- `feat(safety-schema): add safety_probe_readings table`
- `fix(safety): probe form validates target against check type`
- `docs(safety): update CLAUDE.md`

---

## 11. What's NOT in v1 (Safety Backlog)

Real backlog, not abandoned:

- **Natasha's Law allergen label printer + thermal hardware** (Safety v3, 2027)
- **Bluetooth digital probe integration** — Thermapen, ETI, Navitas — Safety v2, 2027
- **Live consultant video link** during EHO visit (out of scope)
- **Direct API to local authority systems** (LAs don't have one)
- **Automatic FHRS score prediction** (legally risky — we don't predict outcomes)
- **AI suggestions during inspection** ("answer this question this way") — chef talks to inspector, we hold records
- **SCORM e-learning courses** (we link to FSA free training)
- **Photo verification of cleaning** (v2)
- **Multi-language interface** (v2 — Spanish, Polish, Romanian top 3 UK kitchen languages)

---

## 12. End Note

Build the Safety module calmly and carefully. The legal framing matters more than the feature velocity. Every page must carry the liability footer. Every page must link to FSA guidance. Every user must acknowledge before entering.

When this is done right, Palatable Safety becomes the most defensible part of the whole product. Owners pay £20/month per site for the EHO Visit page alone, even if they never have an inspection — because they know they're ready if they do.

The cleaning that happens daily, the probe readings during service, the training records auto-updating, the HACCP plan generated from data we already have — all of it converges on the EHO Visit page. One tap, 4 seconds, 47-page bundle. That's the product.

Ship it well.

— end of Safety handoff —
