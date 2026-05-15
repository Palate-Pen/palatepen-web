# Palatable Safety v1 — Design Bundle

**Date:** Friday 15 May 2026  
**Scope:** Safety module only (SFBB digital diary + 6 supporting surfaces)  
**For:** Claude Code · `Palate-Pen/palatepen-web` repo

---

## What's in here

Seven HTML mockups and one comprehensive Claude Code handoff document. Everything needed to build Palatable Safety v1 from scratch.

```
palatable-safety-2026-05-15/
├── README.md                                  ← you are here
│
├── 01-mockups/                                7 self-contained HTML files
│   ├── chef-safety-mockup-v1.html             # Safety home (SFBB diary)
│   ├── chef-safety-probe-mockup-v1.html       # Probe Reading
│   ├── chef-safety-issue-mockup-v1.html       # Log an Issue
│   ├── chef-safety-cleaning-mockup-v1.html    # Cleaning Schedule
│   ├── chef-safety-training-mockup-v1.html    # Training Records
│   ├── chef-safety-haccp-mockup-v1.html       # HACCP Wizard
│   └── chef-safety-eho-mockup-v1.html         # EHO Visit (the killer page)
│
└── 02-handoff/
    └── CLAUDE-CODE-SAFETY-HANDOFF.md          ← START HERE
```

## Start here

Read **`02-handoff/CLAUDE-CODE-SAFETY-HANDOFF.md`** first. It contains the full build plan, schema, RLS policies, route map, shared component spec, first five commits, and three-week build sequence.

Then open each HTML mockup in a browser — they're fully self-contained and include design notes at the bottom of each page explaining the rationale.

## Reference order

The handoff doc walks the build in this sequence:

| Week | Build |
|---|---|
| **Week 1** | Schema + RLS + shared components (LiabilityFooter, FsaReferenceStrip, SafetyOnboardingModal) |
| **Week 2** | Daily-use pages: Safety home → Probe Reading → Log an Issue → Cleaning Schedule → Training Records |
| **Week 3** | HACCP Wizard (Steps 1-9) + EHO Visit (the strategic killer) |

## Three things to lock before first commit

1. **Liability framing is non-negotiable.** Exact footer wording on every page. Onboarding modal blocks Safety tab access until acknowledged. HACCP Wizard has a stronger version.

2. **FSA Reference Strip on every page.** Six FSA URLs are the canonical links. Live in `lib/safety/fsa-links.ts`.

3. **Menu version snapshots.** Every probe reading and incident references the menu version that was live at the time. The `menu_versions` table + auto-snapshot trigger must be in place before probe readings ship.

## What's NOT in this bundle

- Chef shell (Prep, Notebook, Seasonal, Margins, Stock & Suppliers, Recipes, etc) — separate bundle
- Manager shell + Menu Builder v2 — separate bundle
- Founder admin — separate bundle
- Design system v7 — separate bundle (Safety inherits)
- Market research strategy docs — separate

This is purely the Safety module.

---

Build well. Ship calmly. Stay weird.
