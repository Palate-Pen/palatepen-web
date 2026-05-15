import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import {
  getStripe,
  TIER_FROM_PRICE_KEY,
  isValidTier,
  type SupportedTier,
} from '@/lib/stripe';

/**
 * Stripe webhook. Listens for checkout success + subscription updates
 * and mirrors the resulting tier onto v2.accounts.
 *
 * Founder contract (per CLAUDE.md): if an account's is_founder = true
 * we never touch tier or write Stripe ids. Jack@ stays enterprise
 * regardless of stray events.
 *
 * Auth: Stripe signs every request. We construct the event with
 * STRIPE_WEBHOOK_SECRET and reject if the signature doesn't match.
 *
 * Events handled:
 *   - checkout.session.completed       upgrade — set tier + ids
 *   - customer.subscription.updated    plan change — re-mirror tier
 *   - customer.subscription.deleted    cancel — revert to free, clear sub id
 *
 * Returns 200 on any handled event so Stripe doesn't retry. Errors are
 * logged + emit a 502 so Stripe retries within its policy.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'no_signature' }, { status: 400 });
  }

  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[stripe-webhook] signature failed:', msg);
    return NextResponse.json(
      { error: 'webhook_error', detail: msg },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServiceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabase, sub);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, sub);
        break;
      }
      default:
        // Other events are interesting in audit but not actionable yet.
        // Return 200 so Stripe doesn't retry them.
        break;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[stripe-webhook]', event.type, 'failed:', msg);
    return NextResponse.json(
      { error: 'handler_failed', detail: msg },
      { status: 502 },
    );
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------

type Svc = ReturnType<typeof createSupabaseServiceClient>;

async function handleCheckoutCompleted(
  supabase: Svc,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = (session.metadata?.user_id as string | undefined) ?? null;
  const priceKey = (session.metadata?.price_key as string | undefined) ?? null;
  const tier: SupportedTier = (priceKey && TIER_FROM_PRICE_KEY[priceKey] && isValidTier(TIER_FROM_PRICE_KEY[priceKey]))
    ? (TIER_FROM_PRICE_KEY[priceKey] as SupportedTier)
    : 'pro';

  if (!userId) {
    console.warn('[stripe-webhook] checkout.completed missing metadata.user_id');
    return;
  }

  // Resolve every account the signing user owns. In v2 the user-account
  // link is the membership table — owner-role memberships fan out to
  // the relevant accounts.
  const { data: ownedMemberships } = await supabase
    .from('memberships')
    .select('site_id, sites:site_id (account_id)')
    .eq('user_id', userId)
    .eq('role', 'owner');

  const accountIds = Array.from(
    new Set(
      (ownedMemberships ?? [])
        .map((m) => (m.sites as unknown as { account_id?: string } | null)?.account_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (accountIds.length === 0) {
    console.warn(
      '[stripe-webhook] no owned accounts for user',
      userId,
      '— Stripe IDs unwired; will reconcile on next event',
    );
    return;
  }

  // Founder short-circuit: never touch tier on is_founder accounts.
  const { data: candidateRows } = await supabase
    .from('accounts')
    .select('id, is_founder')
    .in('id', accountIds);
  const nonFounderIds = (candidateRows ?? [])
    .filter((r) => !r.is_founder)
    .map((r) => r.id as string);

  if (nonFounderIds.length === 0) {
    console.log(
      '[stripe-webhook] all matching accounts are founder accounts — skipping tier update',
    );
    return;
  }

  const { error } = await supabase
    .from('accounts')
    .update({
      tier,
      stripe_customer_id: (session.customer as string | null) ?? null,
      stripe_subscription_id: (session.subscription as string | null) ?? null,
      updated_at: new Date().toISOString(),
    })
    .in('id', nonFounderIds);
  if (error) {
    throw new Error('accounts update failed: ' + error.message);
  }
  console.log(
    '[stripe-webhook] tier=' + tier,
    'mirrored to',
    nonFounderIds.length,
    'account(s)',
  );
}

async function handleSubscriptionUpdated(
  supabase: Svc,
  sub: Stripe.Subscription,
): Promise<void> {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  // Subscription items[0].price.id can map back to a tier via metadata. We
  // also look at status — only active / trialing subs should hold a paid
  // tier; past_due is grace, but unpaid + cancelled drop to free.
  const priceKey =
    (sub.items?.data?.[0]?.price?.metadata?.price_key as string | undefined) ??
    null;

  const tier: SupportedTier =
    sub.status === 'canceled' || sub.status === 'unpaid'
      ? 'free'
      : priceKey && TIER_FROM_PRICE_KEY[priceKey]
        ? (TIER_FROM_PRICE_KEY[priceKey] as SupportedTier)
        : 'pro';

  await applyTierByCustomer(supabase, customerId, tier, sub.id);
}

async function handleSubscriptionDeleted(
  supabase: Svc,
  sub: Stripe.Subscription,
): Promise<void> {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  await applyTierByCustomer(supabase, customerId, 'free', null);
}

async function applyTierByCustomer(
  supabase: Svc,
  customerId: string,
  tier: SupportedTier,
  subscriptionId: string | null,
): Promise<void> {
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, is_founder')
    .eq('stripe_customer_id', customerId);

  const targets = (accounts ?? [])
    .filter((a) => !a.is_founder)
    .map((a) => a.id as string);

  if (targets.length === 0) {
    console.warn(
      '[stripe-webhook] no matching non-founder accounts for customer',
      customerId,
    );
    return;
  }

  const { error } = await supabase
    .from('accounts')
    .update({
      tier,
      stripe_subscription_id: subscriptionId,
      updated_at: new Date().toISOString(),
    })
    .in('id', targets);
  if (error) {
    throw new Error('accounts update failed: ' + error.message);
  }
  console.log(
    '[stripe-webhook] tier=' + tier,
    'applied via customer lookup to',
    targets.length,
    'account(s)',
  );
}
