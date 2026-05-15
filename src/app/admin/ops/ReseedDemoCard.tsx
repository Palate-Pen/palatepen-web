'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { reseedFounderDemoAction, type ReseedResult } from './actions';

export function ReseedDemoCard() {
  const router = useRouter();
  const [result, setResult] = useState<ReseedResult | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    if (pending) return;
    setResult(null);
    startTransition(async () => {
      const res = await reseedFounderDemoAction();
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
            Founder Demo
          </div>
          <h2 className="font-display text-2xl font-semibold uppercase tracking-[0.04em] text-ink">
            Reseed to today
          </h2>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {pending ? 'Reseeding…' : '↻ Reseed demo data'}
        </button>
      </div>

      <div className="px-7 py-6">
        <p className="font-serif text-base text-ink-soft leading-relaxed mb-4">
          Shifts every time-sensitive table on the founder site forward by
          the delta between the most-recent record and right now, then
          regenerates fresh forward signals from the new state by running
          eight detectors (par breach, allocations arriving, flagged
          invoices, recipe drift, spillage patterns, stock variance,
          today's deliveries, tonight's prep).
        </p>
        <p className="font-serif italic text-sm text-muted leading-relaxed mb-2">
          Internal cadence stays intact (Friday stock take 3 days before
          today's signals, etc.) — everything slides as a block. Manual
          signals re-anchor via the shift; detector signals get wiped +
          re-emitted from current state.
        </p>
        <p className="font-serif italic text-sm text-muted">
          Safe to spam — second click has delta ≈ 0 and only re-runs the
          detectors against unchanged state.
        </p>
      </div>

      {result && result.ok && (
        <div className="px-7 py-6 border-t border-rule bg-paper-warm/50">
          <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-healthy mb-3">
            ✓ Reseeded
          </div>
          <div className="font-serif text-base text-ink mb-4 leading-relaxed">
            Shifted data on{' '}
            <em className="text-gold not-italic font-medium italic">
              {result.site_name}
            </em>{' '}
            forward by {humaniseDelta(result.delta_seconds, result.delta_days)}
            .{' '}
            <em className="text-gold not-italic font-medium italic">
              {result.signals_generated}
            </em>{' '}
            fresh {result.signals_generated === 1 ? 'signal' : 'signals'}{' '}
            emitted from current state.
          </div>

          <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-muted mb-2">
            Detector output
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-6">
            {Object.entries(result.signal_breakdown).map(([k, n]) => (
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
            Tables shifted
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-rule border border-rule">
            {result.tables.map((t) => (
              <div key={t.name} className="bg-card px-4 py-3">
                <div className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted">
                  {t.name.replace(/_/g, ' ')}
                </div>
                <div className="font-serif font-semibold text-lg text-ink leading-none mt-1">
                  {t.rows_shifted}
                </div>
              </div>
            ))}
          </div>
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
