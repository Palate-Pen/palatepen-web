import Link from 'next/link';
import type { SafetyEhoRollup } from '@/lib/safety/home';

/**
 * Dark "EHO Mode" card — sits on the right column of the safety home
 * and links into /safety/eho where the real 90-day record export will
 * live. The stats are read from getSafetyEhoRollup() so the chef sees
 * how strong their last-90-day record actually is.
 */
export function SafetyEhoExport({ rollup }: { rollup: SafetyEhoRollup }) {
  return (
    <div className="bg-ink text-paper border-l-[3px] border-l-gold px-7 py-6 mt-5">
      <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold-light mb-2.5">
        EHO Mode
      </div>
      <div className="font-serif text-[22px] font-normal text-paper leading-[1.3] mb-2">
        Inspector at the door?{' '}
        <em className="text-gold-light italic font-medium">One tap</em>, you&apos;re ready.
      </div>
      <p className="font-serif italic text-sm text-paper/75 mb-5 leading-relaxed">
        Bundles last {rollup.total_days} days of records — opening checks, deliveries, probe readings, cleaning, waste, training — into a clean PDF.
      </p>
      <div className="flex gap-6 mb-5 py-3.5 border-t border-paper/10 border-b">
        <div>
          <div className="font-serif font-medium text-[26px] text-paper leading-none">
            {rollup.days_logged}
          </div>
          <div className="font-display font-semibold text-[9px] tracking-[0.25em] uppercase text-gold-light mt-1">
            Days Logged
          </div>
        </div>
        <div>
          <div className="font-serif font-medium text-[26px] text-paper leading-none">
            {rollup.days_partial}
          </div>
          <div className="font-display font-semibold text-[9px] tracking-[0.25em] uppercase text-gold-light mt-1">
            Days Partial
          </div>
        </div>
        <div>
          <div className="font-serif font-medium text-[26px] text-paper leading-none">
            {rollup.deliveries_logged_pct}%
          </div>
          <div className="font-display font-semibold text-[9px] tracking-[0.25em] uppercase text-gold-light mt-1">
            Deliveries
          </div>
        </div>
      </div>
      <Link
        href="/safety/eho"
        className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors inline-block"
      >
        Export {rollup.total_days}-day Record
      </Link>
    </div>
  );
}
