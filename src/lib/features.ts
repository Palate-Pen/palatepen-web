import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * The Palatable feature registry. Every gateable feature lives here.
 * Each entry specifies which roles have it ON by default and which tier
 * is required for the feature to exist at all. Per-user overrides via
 * v2.feature_flags overlay on top.
 *
 * Adding a feature: add an entry here, then surface a toggle row in the
 * /owner/team or /manager/team matrix. RLS still applies independently;
 * feature flags are a UX-level lock, not a security boundary.
 */

export type FeatureKey =
  | 'recipes.edit'
  | 'recipes.create'
  | 'recipes.archive'
  | 'bank.edit_prices'
  | 'bank.add_ingredients'
  | 'invoices.scan'
  | 'invoices.flag'
  | 'invoices.confirm'
  | 'credit_notes.draft'
  | 'credit_notes.send'
  | 'purchase_orders.draft'
  | 'purchase_orders.send'
  | 'stock_transfers.draft'
  | 'stock_transfers.send'
  | 'menus.publish'
  | 'menu_plans.create'
  | 'waste.log'
  | 'team.manage'
  | 'connections.manage'
  | 'safety.opening_checks'
  | 'safety.probe_readings'
  | 'safety.incidents'
  | 'safety.cleaning'
  | 'safety.training_records'
  | 'safety.haccp'
  | 'safety.eho_visit';

type ShellRole =
  | 'owner'
  | 'manager'
  | 'chef'
  | 'sous_chef'
  | 'commis'
  | 'bartender'
  | 'head_bartender'
  | 'bar_back'
  | 'viewer';

type TierKey = 'free' | 'pro' | 'kitchen' | 'group' | 'enterprise';

type FeatureDef = {
  key: FeatureKey;
  label: string;
  description: string;
  group: 'kitchen' | 'bar' | 'finance' | 'safety' | 'admin';
  /** Tier at which the feature becomes available. */
  min_tier: TierKey;
  /** Roles that have the feature ON by default. */
  default_roles: ShellRole[];
};

const TIER_RANK: Record<TierKey, number> = {
  free: 0,
  pro: 1,
  kitchen: 2,
  group: 3,
  enterprise: 4,
};

const FEATURE_REGISTRY: Record<FeatureKey, FeatureDef> = {
  'recipes.edit': {
    key: 'recipes.edit',
    label: 'Edit recipes',
    description: 'Change name, method, sell price, ingredients.',
    group: 'kitchen',
    min_tier: 'pro',
    default_roles: ['owner', 'manager', 'chef', 'sous_chef'],
  },
  'recipes.create': {
    key: 'recipes.create',
    label: 'Create recipes',
    description: 'Add new dishes to the book.',
    group: 'kitchen',
    min_tier: 'pro',
    default_roles: ['owner', 'manager', 'chef', 'sous_chef'],
  },
  'recipes.archive': {
    key: 'recipes.archive',
    label: 'Archive recipes',
    description: 'Remove dishes from the live book.',
    group: 'kitchen',
    min_tier: 'pro',
    default_roles: ['owner', 'manager', 'chef'],
  },
  'bank.edit_prices': {
    key: 'bank.edit_prices',
    label: 'Edit Bank prices',
    description: 'Manually adjust ingredient current_price.',
    group: 'finance',
    min_tier: 'pro',
    default_roles: ['owner', 'manager', 'chef'],
  },
  'bank.add_ingredients': {
    key: 'bank.add_ingredients',
    label: 'Add Bank ingredients',
    description: 'Create new ingredient rows.',
    group: 'kitchen',
    min_tier: 'pro',
    default_roles: ['owner', 'manager', 'chef', 'sous_chef'],
  },
  'invoices.scan': {
    key: 'invoices.scan',
    label: 'Scan invoices',
    description: 'Use the AI vision pipeline to extract invoice lines.',
    group: 'finance',
    min_tier: 'pro',
    default_roles: ['owner', 'manager', 'chef'],
  },
  'invoices.flag': {
    key: 'invoices.flag',
    label: 'Flag invoice discrepancies',
    description: 'Mark received-vs-ordered mismatches.',
    group: 'finance',
    min_tier: 'pro',
    default_roles: ['owner', 'manager', 'chef'],
  },
  'invoices.confirm': {
    key: 'invoices.confirm',
    label: 'Confirm invoices',
    description: 'Bank a scanned invoice into the cost-side ledger.',
    group: 'finance',
    min_tier: 'pro',
    default_roles: ['owner', 'manager', 'chef'],
  },
  'credit_notes.draft': {
    key: 'credit_notes.draft',
    label: 'Draft credit notes',
    description: 'Compose a credit-note from a flagged invoice.',
    group: 'finance',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager'],
  },
  'credit_notes.send': {
    key: 'credit_notes.send',
    label: 'Send credit notes',
    description: 'Mail a draft credit note to the supplier.',
    group: 'finance',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager'],
  },
  'purchase_orders.draft': {
    key: 'purchase_orders.draft',
    label: 'Draft purchase orders',
    description: 'Start a PO from below-par suggestions.',
    group: 'finance',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager', 'chef'],
  },
  'purchase_orders.send': {
    key: 'purchase_orders.send',
    label: 'Send purchase orders',
    description: 'Lock a PO and mail it to the supplier.',
    group: 'finance',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager'],
  },
  'stock_transfers.draft': {
    key: 'stock_transfers.draft',
    label: 'Draft stock transfers',
    description: 'Start a stock transfer between pools or sites.',
    group: 'kitchen',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager', 'chef', 'sous_chef', 'head_bartender', 'bartender'],
  },
  'stock_transfers.send': {
    key: 'stock_transfers.send',
    label: 'Send stock transfers',
    description: 'Commit a transfer (source stock decrements).',
    group: 'kitchen',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager', 'chef', 'head_bartender'],
  },
  'menus.publish': {
    key: 'menus.publish',
    label: 'Publish menus',
    description: 'Push a menu version live on the public reader.',
    group: 'kitchen',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager', 'chef'],
  },
  'menu_plans.create': {
    key: 'menu_plans.create',
    label: 'Create menu plans',
    description: 'Build a forward menu plan with the Kasavana matrix.',
    group: 'kitchen',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager', 'chef'],
  },
  'waste.log': {
    key: 'waste.log',
    label: 'Log waste',
    description: 'Record binned items + value into the waste ledger.',
    group: 'kitchen',
    min_tier: 'pro',
    default_roles: ['owner', 'manager', 'chef', 'sous_chef', 'commis', 'head_bartender', 'bartender'],
  },
  'team.manage': {
    key: 'team.manage',
    label: 'Manage team',
    description: 'Invite, remove, change role + feature flags for team members.',
    group: 'admin',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager'],
  },
  'connections.manage': {
    key: 'connections.manage',
    label: 'Manage integrations',
    description: 'Wire up POS, accountant, inbound email keys.',
    group: 'admin',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager'],
  },
  'safety.opening_checks': {
    key: 'safety.opening_checks',
    label: 'Opening checks',
    description: 'Complete the daily opening-checks SFBB diary entry.',
    group: 'safety',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager', 'chef', 'sous_chef'],
  },
  'safety.probe_readings': {
    key: 'safety.probe_readings',
    label: 'Probe readings',
    description: 'Log temperature probe readings.',
    group: 'safety',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager', 'chef', 'sous_chef', 'commis'],
  },
  'safety.incidents': {
    key: 'safety.incidents',
    label: 'Log incidents',
    description: 'Record complaints, allergens, near-misses, illness.',
    group: 'safety',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager', 'chef', 'sous_chef'],
  },
  'safety.cleaning': {
    key: 'safety.cleaning',
    label: 'Cleaning sign-off',
    description: 'Tick off the cleaning schedule.',
    group: 'safety',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager', 'chef', 'sous_chef', 'commis'],
  },
  'safety.training_records': {
    key: 'safety.training_records',
    label: 'Training records',
    description: 'Maintain staff certification + expiry tracking.',
    group: 'safety',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager'],
  },
  'safety.haccp': {
    key: 'safety.haccp',
    label: 'HACCP wizard',
    description: 'Build + maintain HACCP plans.',
    group: 'safety',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager', 'chef'],
  },
  'safety.eho_visit': {
    key: 'safety.eho_visit',
    label: 'EHO Visit mode',
    description: 'Run the inspection control desk + export the audit bundle.',
    group: 'safety',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager'],
  },
};

export { FEATURE_REGISTRY };

export type FeatureFlagOverride = {
  membership_id: string;
  feature_key: FeatureKey;
  enabled: boolean;
};

export function isFeatureAvailableAtTier(
  feature: FeatureKey,
  tier: string,
): boolean {
  const def = FEATURE_REGISTRY[feature];
  if (!def) return false;
  const userTierRank = TIER_RANK[tier.toLowerCase() as TierKey] ?? 0;
  const requiredRank = TIER_RANK[def.min_tier];
  return userTierRank >= requiredRank;
}

export function isFeatureOnByDefault(
  feature: FeatureKey,
  role: ShellRole,
): boolean {
  const def = FEATURE_REGISTRY[feature];
  if (!def) return false;
  return def.default_roles.includes(role);
}

/**
 * Resolve effective access for one user at one site:
 *   1. If tier doesn't include the feature, return false.
 *   2. If an override row exists, use it.
 *   3. Otherwise use the role default.
 */
export async function userHasFeature(
  userId: string,
  siteId: string,
  feature: FeatureKey,
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();

  const { data: site } = await supabase
    .from('sites')
    .select('account_id')
    .eq('id', siteId)
    .maybeSingle();
  if (!site) return false;

  const { data: account } = await supabase
    .from('accounts')
    .select('tier')
    .eq('id', site.account_id)
    .maybeSingle();
  const tier = (account?.tier as string | undefined) ?? 'free';
  if (!isFeatureAvailableAtTier(feature, tier)) return false;

  const { data: membership } = await supabase
    .from('memberships')
    .select('id, role')
    .eq('user_id', userId)
    .eq('site_id', siteId)
    .maybeSingle();
  if (!membership) return false;

  const { data: override } = await supabase
    .from('feature_flags')
    .select('enabled')
    .eq('membership_id', membership.id)
    .eq('feature_key', feature)
    .maybeSingle();

  if (override) return Boolean(override.enabled);
  return isFeatureOnByDefault(feature, membership.role as ShellRole);
}

export type FeatureMatrixCell = {
  feature: FeatureKey;
  enabled: boolean;
  source: 'role' | 'override';
};

/**
 * Resolve every feature for a single membership in one pass. Used by
 * /owner/team + /manager/team to render the toggle matrix.
 */
export async function resolveFeatureMatrix(
  membershipId: string,
): Promise<FeatureMatrixCell[]> {
  const supabase = await createSupabaseServerClient();
  const { data: m } = await supabase
    .from('memberships')
    .select('role, site_id, sites:site_id (account_id)')
    .eq('id', membershipId)
    .maybeSingle();
  if (!m) return [];
  const role = m.role as ShellRole;
  const accountId =
    (m.sites as unknown as { account_id: string } | null)?.account_id;
  let tier: string = 'free';
  if (accountId) {
    const { data: a } = await supabase
      .from('accounts')
      .select('tier')
      .eq('id', accountId)
      .maybeSingle();
    tier = (a?.tier as string | undefined) ?? 'free';
  }

  const { data: overrides } = await supabase
    .from('feature_flags')
    .select('feature_key, enabled')
    .eq('membership_id', membershipId);
  const overrideMap = new Map<string, boolean>();
  for (const o of overrides ?? []) {
    overrideMap.set(o.feature_key as string, Boolean(o.enabled));
  }

  const out: FeatureMatrixCell[] = [];
  for (const def of Object.values(FEATURE_REGISTRY)) {
    if (!isFeatureAvailableAtTier(def.key, tier)) continue;
    const override = overrideMap.get(def.key);
    if (override !== undefined) {
      out.push({ feature: def.key, enabled: override, source: 'override' });
    } else {
      out.push({
        feature: def.key,
        enabled: isFeatureOnByDefault(def.key, role),
        source: 'role',
      });
    }
  }
  return out;
}
