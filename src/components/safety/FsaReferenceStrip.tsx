import { FSA_REFERENCES, type SafetySurfaceKey } from '@/lib/safety/legal';

/**
 * Per-surface FSA link strip. Two variants:
 *
 *   - `inline`  small horizontal pill, used inside flow-content pages
 *     (probe / cleaning / incidents / training).
 *   - `full`    full bleed strip with body paragraph + 2-col link grid,
 *     used on the safety home page. Mirrors the
 *     chef-safety-mockup-v1.html `.fsa-strip` design.
 */
export function FsaReferenceStrip({
  surface,
  variant = 'inline',
}: {
  surface: SafetySurfaceKey;
  variant?: 'inline' | 'full';
}) {
  const refs = FSA_REFERENCES[surface];
  if (!refs) return null;

  if (variant === 'inline') {
    return (
      <div className="bg-paper-warm border border-rule px-5 py-3 mb-8 flex items-center gap-4 flex-wrap">
        <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted">
          FSA reference:
        </span>
        {refs.map((r) => (
          <a
            key={r.url}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-serif text-sm text-gold hover:text-gold-dark transition-colors underline-offset-2 hover:underline"
          >
            {r.label} {String.fromCharCode(0x2192)}
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-paper-warm border border-rule border-l-[3px] border-l-gold px-7 py-6 mt-9">
      <div className="flex items-baseline justify-between mb-3.5 flex-wrap gap-2">
        <span className="font-display font-semibold text-[11px] tracking-[0.35em] uppercase text-gold">
          FSA Guidance — Official Source
        </span>
        <span className="font-serif italic text-[13px] text-muted">
          food.gov.uk{' '}
          <strong className="font-display font-semibold not-italic text-ink-soft text-[10px] tracking-[0.25em] uppercase ml-1">
            Authoritative Source
          </strong>
        </span>
      </div>
      <p className="font-serif text-[15px] text-ink-soft leading-[1.6] mb-4 max-w-[760px]">
        Every UK food business is legally required to keep a documented{' '}
        <strong className="font-semibold text-ink">food safety management system based on HACCP principles</strong>.
        Palatable is built around the FSA&apos;s{' '}
        <strong className="font-semibold text-ink">Safer Food, Better Business (SFBB)</strong>{' '}
        framework — the diary, the four Cs (cross-contamination, cleaning, chilling, cooking), and the records you need to show an EHO. The official guidance is always one tap away.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {refs.map((r) => (
          <a
            key={r.url}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-4 py-3 bg-card border border-rule hover:border-gold hover:bg-card-warm transition-colors group"
          >
            <span className="text-gold flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
              </svg>
            </span>
            <span className="flex-1 font-serif text-sm text-ink font-semibold">
              {r.label}
            </span>
            <span className="text-muted-soft group-hover:text-gold transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                <path d="M7 17L17 7M7 7h10v10" />
              </svg>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
