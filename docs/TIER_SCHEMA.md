# Tier Schema

Source of truth for what each tier unlocks. Mirrored in code as
`src/types/tiers.ts` (DB shapes) and `src/lib/tierGate.ts` (the
per-feature minimum-tier map + access helpers + per-tier hard limits).

When adding a feature, also add a `FEATURE_MIN_TIER` entry — gating starts
there, not at the call site.

## Tier ladder

### Free · £0/mo
- 5 recipes
- 10 notebook entries
- 1 user
- 1 outlet
- No AI features
- No stock
- No invoices

### Pro · £25/mo
- Unlimited recipes
- 1 user
- 1 outlet
- All AI features (recipe import, invoice scanning, spec-sheet scanning)
- Stock counting + par levels
- Invoices (manual + AI scan)
- Menus
- Waste tracking
- Suppliers (view + reliability scores)

### Kitchen · £59/mo
- Everything in Pro
- Up to 5 users
- 1 outlet
- Team permissions
- Activity log
- Shared notebook
- Supplier ordering
- Purchase orders
- CSV import/export
- Business logo
- Reports tab

### Group · £129/mo
- Everything in Kitchen
- Unlimited users
- Unlimited outlets
- Multi-outlet management
- Central kitchen
- Per-outlet dashboards
- Group reporting
- Inter-site stock transfer
- Flash reporting
- Live digital menus
- QR codes
- POS integration
- Xero integration
- API access
- Demand forecasting

### Enterprise · Price on request
- Everything in Group
- White label
- SSO
- Dedicated account manager
- SLA
- Custom integrations
- Unlimited API calls

## Type definitions — `src/types/tiers.ts`

```ts
export type Tier = 'free' | 'pro' | 'kitchen' | 'group' | 'enterprise'
// Roles match what account_members.role stores (migration 007). Owner =
// billing + admin; Manager edits everything + invites; Chef edits content
// (recipes/notes/waste/stock counts) but not menus or pricing; Viewer is
// read-only. Reconciled with the live schema 2026-05-13.
export type Role = 'owner' | 'manager' | 'chef' | 'viewer'
export type OutletType = 'restaurant' | 'pub' | 'cafe' | 'bar' | 'hotel' | 'central_kitchen' | 'other'

export interface Account {
  id: string
  name: string
  tier: Tier
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  logoUrl?: string
  createdAt: string
  updatedAt: string
}

export interface Outlet {
  id: string
  accountId: string
  name: string
  type: OutletType
  address?: string
  timezone?: string
  isCentralKitchen: boolean
  createdAt: string
  updatedAt: string
}

export interface Membership {
  id: string
  accountId: string
  userId: string
  outletId?: string
  role: Role
  invitedBy: string
  invitedAt: string
  acceptedAt?: string
}
```

## Tier gate — `src/lib/tierGate.ts`

```ts
import type { Tier } from '@/types/tiers'
export type { Tier }

const TIER_ORDER: Tier[] = ['free', 'pro', 'kitchen', 'group', 'enterprise']

export const FEATURE_MIN_TIER: Record<string, Tier> = {
  recipes_unlimited: 'pro',
  recipes_url_import: 'pro',
  recipes_photo_upload: 'pro',
  recipes_sub_recipes: 'pro',
  recipes_allergens: 'pro',
  recipes_nutrition: 'pro',
  recipes_spec_sheet: 'pro',
  recipes_recipe_book: 'pro',
  recipes_cost_simulator: 'pro',
  recipes_locked_specs: 'kitchen',
  recipes_templates: 'kitchen',
  notebook_unlimited: 'pro',
  notebook_shared: 'kitchen',
  costing_full: 'pro',
  costing_ingredients_bank: 'pro',
  costing_menu_builder: 'pro',
  costing_menu_engineering: 'pro',
  costing_price_benchmarking: 'pro',
  invoices_view: 'pro',
  invoices_ai_scan: 'pro',
  invoices_email_forwarding: 'pro',
  invoices_price_alerts: 'pro',
  invoices_supplier_scores: 'pro',
  invoices_delivery_check: 'pro',
  suppliers_view: 'pro',
  suppliers_ordering: 'kitchen',
  suppliers_po_tracking: 'kitchen',
  suppliers_consolidated_ordering: 'group',
  stock_view: 'pro',
  stock_waste_tracking: 'pro',
  stock_reorder_alerts: 'kitchen',
  stock_inter_site_transfer: 'group',
  menus_builder: 'pro',
  menus_engineering: 'pro',
  menus_live_digital: 'group',
  menus_qr_codes: 'group',
  waste_view: 'pro',
  waste_dashboard: 'kitchen',
  reports_view: 'kitchen',
  reports_flash_pl: 'group',
  reports_group_level: 'group',
  reports_demand_forecasting: 'group',
  team_view: 'kitchen',
  team_invite: 'kitchen',
  team_roles: 'kitchen',
  team_activity_log: 'kitchen',
  team_unlimited_users: 'group',
  outlets_multi: 'group',
  outlets_central_kitchen: 'group',
  outlets_group_reporting: 'group',
  integrations_csv_import: 'kitchen',
  integrations_csv_export: 'kitchen',
  integrations_api: 'group',
  integrations_pos: 'group',
  integrations_xero: 'group',
  branding_logo: 'kitchen',
  white_label: 'enterprise',
  sso: 'enterprise',
  support_dedicated: 'enterprise',
}

export function canAccess(userTier: string, feature: string): boolean {
  const minTier = FEATURE_MIN_TIER[feature]
  if (!minTier) return true
  return TIER_ORDER.indexOf(userTier as Tier) >= TIER_ORDER.indexOf(minTier)
}

export function requiresTier(feature: string): Tier {
  return FEATURE_MIN_TIER[feature] ?? 'free'
}

export const TIER_LIMITS = {
  free:       { maxRecipes: 5, maxNotebook: 10, maxUsers: 1, maxOutlets: 1 },
  pro:        { maxRecipes: Infinity, maxNotebook: Infinity, maxUsers: 1, maxOutlets: 1 },
  kitchen:    { maxRecipes: Infinity, maxNotebook: Infinity, maxUsers: 5, maxOutlets: 1 },
  group:      { maxRecipes: Infinity, maxNotebook: Infinity, maxUsers: Infinity, maxOutlets: Infinity },
  enterprise: { maxRecipes: Infinity, maxNotebook: Infinity, maxUsers: Infinity, maxOutlets: Infinity },
}
```
