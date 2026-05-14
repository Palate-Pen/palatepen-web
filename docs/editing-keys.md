# Editing-key vocabulary

Shared shorthand for pointing at specific UI elements in conversation. Reference material — loaded on demand, not on every session start.

Use these dotted keys when pointing at a specific surface so we both know exactly which view, tab, or component is meant. Add a new row to the relevant table as new features land.

## Top-level (sidebar nav)

| Key       | Surface     |
|-----------|-------------|
| `DASH`    | Dashboard   |
| `REC`     | Recipes     |
| `NOTE`    | Notebook    |
| `COST`    | Costing     |
| `MENU`    | Menus       |
| `INV`     | Invoices    |
| `STK`     | Stock       |
| `SUP`     | Suppliers   |
| `BANK`    | Bank        |
| `WASTE`   | Waste       |
| `REP`     | Reports     |
| `TEAM`    | My Team     |
| `SET`     | Settings    |
| `ADMIN`   | /admin panel |

## Invoices · `INV`

| Key                                  | What it refers to |
|--------------------------------------|-------------------|
| `INV.topbar`                         | Title row + Forward email / Scan invoice buttons |
| `INV.nav`                            | Pill strip: Ingredients bank / History / Suppliers / Reports |
| `INV.tiles`                          | 4-tile summary row above the body |
| `INV.banner`                         | Amber 30-day discrepancy banner (bank + history) |
| `INV.bank`                           | Ingredients bank tab body (default) |
| `INV.bank.scan`                      | Big dashed scan/upload card |
| `INV.bank.search`                    | Search input + ingredient list |
| `INV.history`                        | History tab body |
| `INV.history.row`                    | One invoice card in the history list |
| `INV.detail`                         | Drill-in detail page from a history row |
| `INV.detail.priceChanges`            | Red-tinted price-change table on detail |
| `INV.detail.items`                   | All-items grid on detail |
| `INV.detail.discrepancies`           | Flagged-discrepancies card on detail |
| `INV.review`                         | Review screen after scan (pick items, name supplier) |
| `INV.delivery.check`                 | Delivery check initial Yes / Flag / Skip |
| `INV.delivery.flag`                  | Per-line flag editor (qty, toggle, note) |
| `INV.suppliers`                      | Suppliers tab body |
| `INV.suppliers.tiles`                | 4 stat tiles at top of Suppliers |
| `INV.suppliers.help`                 | Gold-bordered help card |
| `INV.suppliers.row`                  | Collapsed supplier card |
| `INV.suppliers.expand`               | Expanded supplier panel |
| `INV.suppliers.expand.stats`         | 4 stat tiles inside expanded |
| `INV.suppliers.expand.issue`         | Most-common-issue callout |
| `INV.suppliers.expand.priceHistory`  | Price-change history list |
| `INV.suppliers.expand.items`         | Items-supplied chips |
| `INV.suppliers.expand.contact`       | Rep / phone / email / notes form |
| `INV.suppliers.expand.actions`       | Action buttons (PO / Call / Email / History) |
| `INV.reports`                        | Reports tab body (period nav + spend) |

## Stock · `STK`

| Key                       | What it refers to |
|---------------------------|-------------------|
| `STK.topbar`              | Title + From bank / Add item / Start count |
| `STK.info`                | "Next stock take" + "Total value" strip |
| `STK.list`                | Main list view (default) |
| `STK.list.filterTiles`    | 4 status tiles (Total / Good / Low / Critical) |
| `STK.list.search`         | Search + category dropdown + auto-categorise row |
| `STK.list.alerts`         | Red critical-items banner |
| `STK.list.row`            | One stock item card |
| `STK.list.edit`           | Inline edit panel on a stock row |
| `STK.add`                 | Add Stock Item modal |
| `STK.bankPicker`          | From Bank modal |
| `STK.count`               | Count view (data entry) |
| `STK.report`              | Report view after a count |
| `STK.report.tiles`        | 4 summary tiles in report |
| `STK.report.byCat`        | By-category table |
| `STK.report.variances`    | Variances & flags section |
| `STK.report.lineDetail`   | Collapsible full line detail |

## Suppliers · `SUP`

Promoted from a sub-tab of Invoices to a top-level workspace 2026-05-13. Lives in `src/app/app/components/SuppliersView.tsx`. Master/detail split-pane (240px left + right detail). Mobile collapses to single-pane with a back button.

| Key                                  | What it refers to |
|--------------------------------------|-------------------|
| `SUP.topbar`                         | Title + sort toggle + Add supplier button |
| `SUP.list`                           | Left panel — supplier list |
| `SUP.list.search`                    | Search input at top of left panel |
| `SUP.list.row`                       | One supplier row (avatar + name + last-invoice + score chip) |
| `SUP.list.addBtn`                    | Dashed "+ Add supplier" button at the bottom of the list |
| `SUP.detail`                         | Right panel — selected supplier detail |
| `SUP.detail.header`                  | Avatar + name + meta + phone/email/PO action buttons |
| `SUP.detail.stats`                   | 4 stat tiles (Score 45d, Prior 45d, Discrepancy £, Accuracy %) |
| `SUP.detail.issue`                   | "Most common issue" gold callout |
| `SUP.detail.priceHistory`            | Price-change history list |
| `SUP.detail.contact`                 | Editable rep / phone / email / delivery days / notes form |
| `SUP.detail.items`                   | Items-supplied chip cloud |
| `SUP.detail.actions`                 | Bottom action row (PO / View history / Full history) |
| `SUP.detail.empty`                   | Empty-state shown when no supplier is selected (desktop) |
| `SUP.add`                            | Add supplier modal |

The old `INV.suppliers.*` keys are deprecated. Their bullets are intentionally retained below for historical reference but the routes/components don't exist anymore.

## Recipes · `REC`

| Key                       | What it refers to |
|---------------------------|-------------------|
| `REC.library`             | Recipe library grid (default) |
| `REC.library.topbar`      | Title + Print Book / Scan Spec / Add Recipe buttons |
| `REC.add`                 | Add Recipe modal (with AI import) |
| `REC.scanSpec`            | Scan Spec Sheet modal |
| `REC.detail`              | Recipe detail page |
| `REC.detail.edit`         | Edit-recipe mode within detail |
| `REC.detail.cost`         | Linked costing panel |
| `REC.detail.allergens`    | Allergen grid + sub-type pills |
| `REC.detail.nutrition`    | Nutrition table + FOP traffic lights |
| `REC.detail.compliance`   | Compliance check modal |
| `REC.detail.spec`         | Printable spec sheet overlay |
| `REC.detail.simulator`    | Cost simulator modal |
| `REC.detail.lock`         | Lock / unlock controls |
| `REC.detail.photo`        | Photo dropzone / replace controls |
| `REC.detail.usedIn`       | "Used in" sub-recipe consumer list |

## Menus · `MENU`

| Key                          | What it refers to |
|------------------------------|-------------------|
| `MENU.list`                  | All-menus list (default) |
| `MENU.detail`                | Single-menu detail |
| `MENU.detail.dishes`         | Dish list with GP summary |
| `MENU.detail.publish`        | Publish card (live URL + QR) |
| `MENU.detail.engineering`    | Engineering section (table + 2×2 quadrants) |
| `MENU.designer`              | Menu Designer overlay |

## Costing · `COST`

| Key             | What it refers to |
|-----------------|-------------------|
| `COST.builder`  | Main costing builder (default) |
| `COST.history`  | Saved costings list |

## Reports · `REP`

| Key              | What it refers to |
|------------------|-------------------|
| `REP.gp`         | GP performance section |
| `REP.waste`      | Waste cost section |
| `REP.stock`      | Stock value by category |
| `REP.menus`      | Menu engineering rollup |
| `REP.benchmark`  | Ingredient price benchmarking |
| `REP.suppliers`  | Supplier performance (Reports-side, separate from `INV.suppliers`) |
| `REP.prices`     | Price changes table |

## Settings · `SET`

| Key                | What it refers to |
|--------------------|-------------------|
| `SET.profile`      | Profile section |
| `SET.preferences`  | Preferences section |
| `SET.data`         | Data export + import |
| `SET.integrations` | Integrations section |
| `SET.email`        | Invoice email forwarding card |
| `SET.api`          | API access card |
| `SET.help`         | Help / Quick start guide |
| `SET.account`     | Account actions (upgrade, delete) |

## Team · `TEAM`

| Key              | What it refers to |
|------------------|-------------------|
| `TEAM.list`      | Member tile grid |
| `TEAM.member`    | Member detail modal |
| `TEAM.invite`    | Invite member modal |

## Notebook / Bank / Waste / Dashboard

| Key              | What it refers to |
|------------------|-------------------|
| `NOTE.list`      | Notes feed |
| `BANK.list`      | Bank ingredient list (`INV.bank` renders the same data inside Invoices) |
| `WASTE.log`      | Waste log list |
| `WASTE.add`      | Log waste form |
| `DASH.tiles`     | Top stat tiles |
| `DASH.alerts`    | Alerts section |
| `DASH.recent`    | Recent activity |

## Admin · `ADMIN`

| Key                    | What it refers to |
|------------------------|-------------------|
| `ADMIN.overview`       | Overview tab |
| `ADMIN.users`          | Users tab |
| `ADMIN.user`           | User detail slideout |
| `ADMIN.user.demoTools` | Demo tools section (Seed showcase button) |
| `ADMIN.user.danger`    | Danger zone |
| `ADMIN.audit`          | Audit tab |
| `ADMIN.platform`       | Platform settings (flags, maintenance, announcement) |
| `ADMIN.orphans`        | Orphan auth-users list (top of Overview) |

## Conventions

- Suffixes: `.modal` for overlays, `.row` for repeating items, `.actions` for button clusters.
- Drill further when needed: e.g. `INV.suppliers.expand.contact.phone` for the phone input specifically.
- When a feature is pre-launch or only seeded, the key still applies — it describes the spot, not the data.
