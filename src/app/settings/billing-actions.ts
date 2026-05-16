'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { getStripe } from '@/lib/stripe';
import { isTopRoleOnAccount } from '@/lib/roles';

export type BillingPortalResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Create a Stripe Customer Portal session for the account's billing.
 * Gated to the top role on the account (per the settings hierarchy
 * spec). Founder accounts and accounts without a stripe_customer_id
 * are short-circuited with a friendly message — billing for those
 * tiers is handled outside the portal.
 */
export async function createBillingPortalSessionAction(input: {
  accountId: string;
  returnPath?: string;
}): Promise<BillingPortalResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  // Top-role gate. Uses the cookie-bound client so RLS is enforced on
  // the role lookup — non-members can't probe an account they don't
  // belong to.
  const isTop = await isTopRoleOnAccount(supabase, user.id, input.accountId);
  if (!isTop) {
    return {
      ok: false,
      error: 'Only the lead person on the account can manage billing.',
    };
  }

  // Pull the Stripe customer id via the service client — RLS forbids
  // chefs reading the stripe_* columns even though we just verified
  // the caller is top role on the account.
  const svc = createSupabaseServiceClient();
  const { data: account } = await svc
    .from('accounts')
    .select('tier, is_founder, stripe_customer_id, name')
    .eq('id', input.accountId)
    .maybeSingle();
  if (!account) return { ok: false, error: 'Account not found.' };

  if (account.is_founder) {
    return {
      ok: false,
      error:
        'Founder accounts are zero-cost and bypass billing — no portal session.',
    };
  }

  if (!account.stripe_customer_id) {
    return {
      ok: false,
      error:
        account.tier === 'free'
          ? 'You’re on the free tier — pick a paid tier first.'
          : 'No Stripe customer on file for this account. Email hello@palateandpen.co.uk to reconnect billing.',
    };
  }

  if (account.tier === 'enterprise') {
    return {
      ok: false,
      error:
        'Enterprise billing is handled directly — email hello@palateandpen.co.uk.',
    };
  }

  let appHost = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appHost) appHost = 'https://app.palateandpen.co.uk';
  const returnPath = (input.returnPath ?? '/settings').replace(/^[^/]/, '/');
  const returnUrl = appHost.replace(/\/$/, '') + returnPath;

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: account.stripe_customer_id as string,
      return_url: returnUrl,
    });
    return { ok: true, url: session.url };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : 'Could not start billing portal session.',
    };
  }
}
