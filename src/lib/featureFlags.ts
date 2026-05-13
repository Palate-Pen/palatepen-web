import { NextResponse } from 'next/server';
import { svc } from './admin';
import { canAccess, requiresTier } from './tierGate';

// Single source of truth for feature flag keys. Mirrors FEATURE_FLAGS_DEF in
// the admin Platform section (src/app/admin/page.tsx). Default for every flag
// is ON — admins toggle features OFF to disable; absence of a stored value
// means "feature is available".

export type FeatureFlagKey =
  | 'aiRecipeImport'
  | 'aiInvoiceScan'
  | 'aiSpecSheet'
  | 'emailForwarding'
  | 'publicMenus'
  | 'apiAccess'
  | 'csvImport'
  | 'csvExport'
  | 'wasteTracking'
  | 'menuBuilder';

// Read a flag from a globalFlags record + optional per-user overrides.
// Resolution: user override wins (true/false), else global value (true/false),
// else default (true).
export function isFeatureEnabled(
  key: FeatureFlagKey,
  globalFlags: Record<string, unknown> | null | undefined,
  userOverrides?: Record<string, unknown> | null,
): boolean {
  const u = userOverrides?.[key];
  if (u === true || u === false) return u;
  const g = globalFlags?.[key];
  if (g === false) return false;
  return true;
}

// Server-side helper — fetches the global flags row from app_settings.
// Returns `{}` if anything goes wrong, so a settings outage never accidentally
// disables features (defaults are all on, so missing data = features enabled).
export async function getGlobalFeatureFlags(): Promise<Record<string, unknown>> {
  try {
    const supabase = svc();
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'global')
      .single();
    const value: any = data?.value || {};
    return value.featureFlags || {};
  } catch {
    return {};
  }
}

// Convenience server gate — returns null if the flag is enabled (caller
// proceeds), or a NextResponse 403 to short-circuit when the admin has
// disabled the feature.
export async function denyIfFlagOff(
  key: FeatureFlagKey,
  userOverrides?: Record<string, unknown> | null,
): Promise<NextResponse | null> {
  const flags = await getGlobalFeatureFlags();
  if (isFeatureEnabled(key, flags, userOverrides)) return null;
  return NextResponse.json(
    { error: 'This feature is currently disabled by the platform admin.' },
    { status: 403 },
  );
}

// Combined gate — tier first, then flag. Use this in any server route that
// previously did `if (!['pro','kitchen','group'].includes(tier))` + a flag
// check, so both gates run through the same code path and any future tier
// change to FEATURE_MIN_TIER propagates everywhere. Returns null when both
// gates pass (caller proceeds); otherwise a 403 NextResponse.
export async function denyIfBlocked(
  tier: string,
  featureKey: string,
  flagKey: FeatureFlagKey,
  userOverrides?: Record<string, unknown> | null,
): Promise<NextResponse | null> {
  if (!canAccess(tier, featureKey)) {
    return NextResponse.json(
      { error: `This feature requires ${requiresTier(featureKey)} tier or higher.` },
      { status: 403 },
    );
  }
  return denyIfFlagOff(flagKey, userOverrides);
}
