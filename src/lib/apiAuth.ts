import { NextRequest, NextResponse } from 'next/server';
import { svc } from './admin';
import { getGlobalFeatureFlags, isFeatureEnabled } from './featureFlags';
import { canAccess, requiresTier } from './tierGate';

// Authenticates an incoming public-API request using its Bearer key.
// - Looks the key up on `user_data.profile.apiKey` via service-role Supabase
//   (bypasses RLS since we authorise via the key, not a Supabase session).
// - Tier-gates via canAccess(tier, 'integrations_api') — Group-only per the
//   tier schema. If the user downgrades, their key stops working until they
//   upgrade again.
// Returns `{ data, account }` on success or `{ error }` (a NextResponse) on
// failure — callers do `if ('error' in r) return r.error;` to short-circuit.

export interface ApiAccountSummary {
  id: string;
  tier: string;
  name: string | null;
}

export interface ApiUserData {
  account_id: string;
  profile: any;
  recipes: any[];
  gp_history: any[];
  ingredients_bank: any[];
  stock_items: any[];
  menus: any[];
  notes?: any[];
  waste_log?: any[];
  invoices?: any[];
}

export type ApiAuthResult =
  | { error: NextResponse }
  | { data: ApiUserData; account: ApiAccountSummary };

export async function authenticateApi(req: NextRequest): Promise<ApiAuthResult> {
  // Platform-level kill switch — admin can disable all /api/v1/* in one shot.
  const flags = await getGlobalFeatureFlags();
  if (!isFeatureEnabled('apiAccess', flags)) {
    return { error: NextResponse.json({ error: 'Public API is currently disabled by the platform admin.' }, { status: 403 }) };
  }

  const auth = req.headers.get('authorization') || '';
  if (!auth.toLowerCase().startsWith('bearer ')) {
    return { error: NextResponse.json({ error: 'Missing Authorization: Bearer <key>' }, { status: 401 }) };
  }
  const key = auth.slice(7).trim();
  if (!key.startsWith('pk_') || key.length < 16) {
    return { error: NextResponse.json({ error: 'Invalid API key' }, { status: 401 }) };
  }
  const supabase = svc();
  const { data: rows, error } = await supabase
    .from('user_data')
    .select('account_id, profile, recipes, gp_history, ingredients_bank, stock_items, menus, notes, waste_log, invoices')
    .contains('profile', { apiKey: key })
    .limit(1);
  if (error) return { error: NextResponse.json({ error: 'Lookup failed' }, { status: 500 }) };
  if (!rows || rows.length === 0) {
    return { error: NextResponse.json({ error: 'Invalid API key' }, { status: 401 }) };
  }
  const row = rows[0] as any;
  const { data: account } = await supabase
    .from('accounts')
    .select('id, tier, name')
    .eq('id', row.account_id)
    .single();
  if (!account || !canAccess(account.tier, 'integrations_api')) {
    return { error: NextResponse.json({ error: `API access requires ${requiresTier('integrations_api')} tier or higher.` }, { status: 403 }) };
  }
  return { data: row as ApiUserData, account: account as ApiAccountSummary };
}
