import Stripe from 'stripe';

/**
 * Server-side Stripe client. Used by /api/stripe/webhook to validate
 * incoming events and (eventually) by /api/stripe/create-checkout when
 * we wire the upgrade flow. STRIPE_SECRET_KEY is set per-env in Vercel.
 *
 * Lazy-initialised so a missing key during build doesn't take the whole
 * app down — only callers actually using Stripe (webhook receiver +
 * checkout creator) will error at request time.
 */
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  cached = new Stripe(key);
  return cached;
}

/**
 * Maps the price_key Stripe sees on checkout.session.metadata back to
 * the tier the app stores. Enterprise is sales-led (contact_sales) so
 * it never reaches this map — onboarding for that tier is manual after
 * the deal closes.
 */
export const TIER_FROM_PRICE_KEY: Record<string, string> = {
  pro_monthly: 'pro',
  pro_yearly: 'pro',
  kitchen_monthly: 'kitchen',
  kitchen_yearly: 'kitchen',
  group_monthly: 'group',
  group_yearly: 'group',
};

export type SupportedTier = 'free' | 'pro' | 'kitchen' | 'group' | 'enterprise';

const VALID_TIERS = new Set<SupportedTier>([
  'free',
  'pro',
  'kitchen',
  'group',
  'enterprise',
]);

export function isValidTier(value: string): value is SupportedTier {
  return VALID_TIERS.has(value as SupportedTier);
}
