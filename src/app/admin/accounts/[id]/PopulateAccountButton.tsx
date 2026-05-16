'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  populateAccountAction,
  type PopulateAccountResult,
} from '../actions';

type Props = {
  accountId: string;
  accountName: string;
  isDemo: boolean;
  isFounder: boolean;
};

/**
 * Founder-only button on /admin/accounts/[id] that wipes + reseeds the
 * account with a fresh 30-day populate across every surface.
 *
 * Renders nothing for non-demo / non-founder accounts — the affordance
 * stays off customer accounts entirely (defence in depth on top of the
 * action's own gate).
 *
 * Two-click confirm: first click flips the button into a confirmation
 * state, second click fires. Resets after 6s if no second click.
 */
export function PopulateAccountButton({
  accountId,
  accountName,
  isDemo,
  isFounder,
}: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<PopulateAccountResult | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isDemo && !isFounder) return null;

  function arm() {
    setConfirming(true);
    setResult(null);
    setTimeout(() => setConfirming(false), 6000);
  }

  function run() {
    if (pending) return;
    setConfirming(false);
    startTransition(async () => {
      const res = await populateAccountAction(accountId);
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="bg-card border border-rule mb-8">
      <div className="px-7 py-6 border-b border-rule flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold mb-1.5">
            {isFounder ? 'Founder Account' : 'Demo Account'} · Seed Controls
          </div>
          <h2 className="font-serif text-2xl font-normal leading-[1.1] tracking-[-0.015em] text-ink">
            Wipe &amp; reseed{' '}
            <em className="text-gold font-semibold not-italic">
              {accountName}
            </em>{' '}
            with 30 days
          </h2>
        </div>
        {!confirming && !pending && (
          <button
            type="button"
            onClick={arm}
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors whitespace-nowrap"
          >
            ↻ Populate demo data
          </button>
        )}
        {confirming && !pending && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-3 bg-card text-ink-soft border border-rule hover:bg-paper-warm transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={run}
              className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-urgent text-paper border border-urgent hover:bg-urgent/90 transition-colors whitespace-nowrap"
            >
              Confirm — wipe &amp; reseed
            </button>
          </div>
        )}
        {pending && (
          <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-paper-warm text-muted border border-rule">
            Populating…
          </div>
        )}
      </div>

      <div className="px-7 py-6">
        <p className="font-serif text-base text-ink-soft leading-relaxed mb-3">
          Deletes every per-site v2.* row across every site of this
          account, then inserts a fresh 30-day populate: suppliers,
          ingredients with price history, recipes with linked
          ingredients, prep, invoices &amp; deliveries (one flagged),
          purchase orders, credit notes, stock takes, waste, notebook,
          menu plans, and the full safety stack (opening checks · probe
          readings · cleaning &amp; signoffs · training · incidents).
        </p>
        <p className="font-serif italic text-sm text-muted">
          Detectors run after the populate so Looking Ahead bars are
          live on first paint. Idempotent — second click produces the
          same shape, no drift.
        </p>
      </div>

      {result && result.ok && (
        <div className="px-7 py-6 border-t border-rule bg-paper-warm/50">
          <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-healthy mb-4">
            ✓ Populated
          </div>
          {result.sites.map((s) => (
            <div key={s.site_id} className="mb-6 last:mb-0">
              <div className="font-serif text-base text-ink mb-3 leading-relaxed">
                <em className="text-gold not-italic font-medium italic">
                  {s.site_name}
                </em>{' '}
                <span className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-muted">
                  {s.kind}
                </span>{' '}
                · {s.signals_generated} fresh{' '}
                {s.signals_generated === 1 ? 'signal' : 'signals'}.
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-px bg-rule border border-rule">
                {Object.entries(s.counts)
                  .filter(([, n]) => n > 0)
                  .map(([k, n]) => (
                    <div key={k} className="bg-card px-4 py-3">
                      <div className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted">
                        {k.replace(/_/g, ' ')}
                      </div>
                      <div className="font-serif font-semibold text-lg leading-none mt-1 text-ink">
                        {n}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
          <div className="font-serif italic text-xs text-muted mt-4">
            Completed at{' '}
            {new Date(result.timestamp).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
            . Refresh any open chef / manager / owner tabs to see new data.
          </div>
        </div>
      )}

      {result && !result.ok && (
        <div className="px-7 py-5 border-t border-rule bg-urgent/10">
          <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-urgent mb-2">
            ✗ Failed
          </div>
          <div className="font-serif italic text-sm text-ink-soft">
            {result.error}
          </div>
        </div>
      )}
    </div>
  );
}
