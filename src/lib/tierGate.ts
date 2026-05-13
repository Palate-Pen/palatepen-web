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

// Hard limits per tier. `Infinity` means no cap. Group is intentionally
// capped at 5 outlets + 25 users (5 users per outlet maximum) — upgrade
// to Enterprise for unlimited outlets and users. maxScans is invoice
// scans per calendar month — Free is 0 (AI-gated to Pro+).
export const TIER_LIMITS = {
  free:       { maxRecipes: 5,        maxNotebook: 10,       maxUsers: 1,        maxOutlets: 1,        maxScans: 0 },
  pro:        { maxRecipes: Infinity, maxNotebook: Infinity, maxUsers: 1,        maxOutlets: 1,        maxScans: 80 },
  kitchen:    { maxRecipes: Infinity, maxNotebook: Infinity, maxUsers: 5,        maxOutlets: 1,        maxScans: 200 },
  group:      { maxRecipes: Infinity, maxNotebook: Infinity, maxUsers: 25,       maxOutlets: 5,        maxScans: 500 },
  enterprise: { maxRecipes: Infinity, maxNotebook: Infinity, maxUsers: Infinity, maxOutlets: Infinity, maxScans: Infinity },
}
