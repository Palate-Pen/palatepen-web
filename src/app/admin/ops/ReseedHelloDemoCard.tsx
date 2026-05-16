'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { reseedHelloDemoAction } from './actions';
import type { DemoReseedResult } from '@/lib/seed/demo-reseed';

/**
 * Founder-only manual trigger for the hello@ customer demo reseed.
 * Mirrors ReseedDemoCard but targets every account flagged is_demo=true
 * (currently just Hello Demo, but the lib walks all of them so we
 * never need to come back here when a second demo lands).
 *
 * Daily cron at /api/cron/reseed-demo does the same thing automatically
 * — this button is for "I'm about to demo right now, make it look like
 * just-this-moment" + verification after deploys.
 */
export function ReseedHelloDemoCard() {
  const router = useRouter();
  const [result, setResult] = useState<DemoReseedResult | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    if (pending) return;
    setResult(null);
    startTransition(async () => {
      const res = await reseedHelloDemoAction();
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  const lastReseed = result?.ok ? new Date(result.timestamp) : null;

  return (
    <div className="bg-card border border-rule">
      <div className="px-7 py-6 border-b border-rule flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold mb-1.5">
            Customer Demo · hello@
          </div>
          <h2 className="font-serif text-2xl font-normal leading-[1.1] tracking-[-0.015em] text-ink">
            Reseed hello@ demo to today
          </h2>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {pending ? 'Reseeding…' : '↻ Reseed hello@ demo'}
        </button>
      </div>

      <div className="px-7 py-6">
        <p className="font-serif text-base text-ink-soft leading-relaxed mb-3">
          Shifts every time-sensitive row across Hello Demo (both Demo
          Kitchen + Demo Bar) plus all safety tables, then regenerates
          forward signals per site. The 30-day shape stays intact —
          ingredients below par on day 24 are still below par on day 24,
          the missing opening check is still on day 24, the failing
          probe readings still land on the same days relative to "now".
        </p>
        <p className="font-serif italic text-sm text-muted">
          Runs daily on the 08:45 UTC cron too — this button is for an
          on-demand refresh right before a live customer walkthrough.
          Safe to spam — second click has delta ≈ 0.
        </p>
      </div>

      {result && result.ok && (
        <div className="px-7 py-6 border-t border-rule bg-paper-warm/50">
          <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-healthy mb-3">
            ✓ Reseeded
          </div>
          {result.accounts.map((acc) => (
            <div key={acc.account_id} className="mb-6 last:mb-0">
              <div className="font-serif text-base text-ink mb-3 leading-relaxed">
                <em className="text-gold not-italic font-medium italic">
                  {acc.account_name}
                </em>{' '}
                · {acc.site_count} site{acc.site_count === 1 ? '' : 's'} shifted
                forward by{' '}
                {humaniseDelta(acc.delta_seconds, acc.delta_days)}.{' '}
                <em className="text-gold not-italic font-medium italic">
                  {acc.signals_generated}
                </em>{' '}
                fresh {acc.signals_generated === 1 ? 'signal' : 'signals'}{' '}
                across the brigade.
              </div>

              <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-muted mb-2">
                Safety tables
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-rule border border-rule mb-5">
                {Object.entries(acc.safety).map(([k, n]) => (
                  <div key={k} className="bg-card px-4 py-3">
                    <div className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted">
                      {k.replace(/_/g, ' ')}
                    </div>
                    <div
                      className={
                        'font-serif font-semibold text-lg leading-none mt-1 ' +
                        (n > 0 ? 'text-ink' : 'text-muted-soft')
                      }
                    >
                      {n > 0 ? n : '—'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-muted mb-2">
                Per-site rows shifted (non-safety)
              </div>
              {acc.per_site_tables.map((ps) => {
                const total = Object.values(ps.tables ?? {}).reduce(
                  (a, b) => a + (Number(b) || 0),
                  0,
                );
                return (
                  <div
                    key={ps.site_id}
                    className="bg-card border border-rule px-4 py-2.5 flex items-baseline justify-between gap-3 mb-1"
                  >
                    <span className="font-mono text-[11px] text-muted-soft">
                      {ps.site_id.slice(0, 8)}
                    </span>
                    <span className="font-serif text-sm text-ink">
                      {total} row{total === 1 ? '' : 's'}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
          {lastReseed && (
            <div className="font-serif italic text-xs text-muted mt-4">
              Completed at{' '}
              {lastReseed.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
              .
            </div>
          )}
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

function humaniseDelta(seconds: number, days: number): string {
  if (Math.abs(seconds) < 60) return 'a few seconds';
  if (Math.abs(seconds) < 3600) {
    const m = Math.round(seconds / 60);
    return `${m} ${m === 1 ? 'minute' : 'minutes'}`;
  }
  if (Math.abs(seconds) < 86400) {
    const h = Math.round(seconds / 3600);
    return `${h} ${h === 1 ? 'hour' : 'hours'}`;
  }
  return `${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'}`;
}
