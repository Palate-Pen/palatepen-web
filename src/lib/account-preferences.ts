import { createSupabaseServerClient } from '@/lib/supabase/server';

export type KitchenSize = 'small' | 'medium' | 'large';
export type StockDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type AccountPreferences = {
  /** ISO 4217. GBP only for v1; field exists so multi-currency can land
   *  without a migration. */
  currency: string;
  /** Target GP %, 1–100. Drives Margins target thresholds + cost-spike
   *  detector + what-if slider's "Hit the X% target" suggestion. */
  gp_target_pct: number;
  kitchen_size: KitchenSize | null;
  kitchen_location: string | null;
  stock_day: StockDay | null;
};

export const ACCOUNT_PREFERENCE_DEFAULTS: AccountPreferences = {
  currency: 'GBP',
  gp_target_pct: 72,
  kitchen_size: null,
  kitchen_location: null,
  stock_day: null,
};

const KITCHEN_SIZE_VALUES: KitchenSize[] = ['small', 'medium', 'large'];
const STOCK_DAY_VALUES: StockDay[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export function parseAccountPreferences(raw: unknown): AccountPreferences {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;
  const gp = Number(r.gp_target_pct);
  const size = typeof r.kitchen_size === 'string' ? r.kitchen_size : null;
  const day = typeof r.stock_day === 'string' ? r.stock_day : null;
  return {
    currency:
      typeof r.currency === 'string' && r.currency.trim().length === 3
        ? r.currency.toUpperCase()
        : ACCOUNT_PREFERENCE_DEFAULTS.currency,
    gp_target_pct:
      Number.isFinite(gp) && gp > 0 && gp <= 100
        ? gp
        : ACCOUNT_PREFERENCE_DEFAULTS.gp_target_pct,
    kitchen_size: KITCHEN_SIZE_VALUES.includes(size as KitchenSize)
      ? (size as KitchenSize)
      : null,
    kitchen_location:
      typeof r.kitchen_location === 'string' &&
      r.kitchen_location.trim().length > 0
        ? r.kitchen_location.trim()
        : null,
    stock_day: STOCK_DAY_VALUES.includes(day as StockDay)
      ? (day as StockDay)
      : null,
  };
}

export async function getAccountPreferences(
  accountId: string,
): Promise<AccountPreferences> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('accounts')
    .select('preferences')
    .eq('id', accountId)
    .maybeSingle();
  return parseAccountPreferences(data?.preferences);
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£',
  EUR: '€',
  USD: '$',
};
