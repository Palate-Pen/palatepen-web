'use client';

import { useState, useTransition } from 'react';
import { createBillingPortalSessionAction } from '@/app/settings/billing-actions';

type Tier = 'free' | 'pro' | 'kitchen' | 'group' | 'enterprise';

const TIER_LABEL: Record<Tier, string> = {
  free: 'Free',
  pro: 'Pro',
  kitchen: 'Kitchen',
  group: 'Group',
  enterprise: 'Enterprise',
};

const TIER_BLURB: Record<Tier, string> = {
  free:
    'Free tier — chef-only kitchen tools. Upgrade to invite a team or add a second outlet.',
  pro:
    'Pro tier — single chef, single outlet. Invoice scanning, recipes, margins, and prep.',
  kitchen:
    'Kitchen tier — full brigade up to 5 users, single outlet. Manager + bar surfaces unlocked.',
  group:
    'Group tier — multi-site, up to 25 users across 5 outlets. Owner cross-site lens unlocked.',
  enterprise:
    'Enterprise — bespoke arrangement. Billed direct via hello@palateandpen.co.uk.',
};

/**
 * Tier & Billing section visible only to the top role on the account.
 * Renders the current tier + a button that opens the Stripe Customer
 * Portal for self-serve billing changes. Free / enterprise / founder
 * accounts get a tailored message instead of the portal button.
 *
 * Non-top users don't see this — the parent gates rendering.
 */
export function TierBillingSection({
  accountId,
  tier,
  isFounder,
  hasStripeCustomer,
  returnPath = '/settings',
}: {
  accountId: string;
  tier: Tier | string;
  isFounder: boolean;
  hasStripeCustomer: boolean;
  /** Where the Stripe portal sends the user back to. */
  returnPath?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const t = (tier as Tier) in TIER_LABEL ? (tier as Tier) : 'free';

  function openPortal() {
    setError(null);
    startTransition(async () => {
      const res = await createBillingPortalSessionAction({
        accountId,
        returnPath,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      window.location.href = res.url;
    });
  }

  const canPortal =
    !isFounder &&
    hasStripeCustomer &&
    t !== 'free' &&
    t !== 'enterprise';

  const upgradeNeeded = !isFounder && t === 'free';
  const enterprise = !isFounder && t === 'enterprise';

  return (
    <div className="bg-card border border-rule mb-6">
      <div className="px-7 py-5 border-b border-rule font-display font-semibold text-xs tracking-[0.3em] uppercase text-ink">
        Tier &amp; Billing
      </div>

      <div className="px-7 py-5 flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap mb-1">
            <span className="font-serif font-semibold text-2xl text-ink">
              {TIER_LABEL[t]}
            </span>
            {isFounder && (
              <span className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase px-2 py-0.5 bg-gold-bg border border-gold/40 text-gold-dark">
                Founder · zero cost
              </span>
            )}
          </div>
          <p className="font-serif italic text-sm text-muted leading-snug max-w-[560px]">
            {TIER_BLURB[t]}
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 min-w-[180px]">
          {isFounder ? (
            <div className="font-serif italic text-xs text-muted text-right">
              Billing bypassed for founder accounts.
            </div>
          ) : canPortal ? (
            <button
              type="button"
              onClick={openPortal}
              disabled={pending}
              className="font-display font-semibold text-[11px] tracking-[0.25em] uppercase px-5 py-2.5 bg-ink text-paper border border-ink hover:bg-gold hover:border-gold transition-colors disabled:opacity-50"
            >
              {pending ? 'Opening portal…' : 'Manage in Stripe portal'}
            </button>
          ) : upgradeNeeded ? (
            <a
              href="/landing#pricing"
              className="font-display font-semibold text-[11px] tracking-[0.25em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors text-center"
            >
              See plans
            </a>
          ) : enterprise ? (
            <a
              href="mailto:hello@palateandpen.co.uk?subject=Palatable%20Enterprise%20billing"
              className="font-display font-semibold text-[11px] tracking-[0.25em] uppercase px-5 py-2.5 bg-ink text-paper border border-ink hover:bg-gold hover:border-gold transition-colors text-center"
            >
              Email hello@
            </a>
          ) : (
            <div className="font-serif italic text-xs text-muted text-right">
              Stripe customer not linked yet. Email hello@palateandpen.co.uk.
            </div>
          )}
          {error && (
            <p className="font-serif italic text-xs text-urgent text-right leading-snug">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="px-7 py-4 bg-paper-warm border-t border-rule font-sans text-[11px] text-muted leading-relaxed">
        Tier changes — upgrade, downgrade, payment method, invoices — all happen
        in the Stripe portal. Webhooks reflect the new tier back into the app
        within seconds. Only the lead person on the account sees this control.
      </div>
    </div>
  );
}
