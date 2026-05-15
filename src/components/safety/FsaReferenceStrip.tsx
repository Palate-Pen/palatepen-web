import { FSA_REFERENCES, type SafetySurfaceKey } from '@/lib/safety/legal';

/**
 * Per-surface link strip pointing at fsa.gov.uk. Renders below the page
 * header on every safety surface. We never embed or paraphrase FSA
 * content — only link out.
 */
export function FsaReferenceStrip({ surface }: { surface: SafetySurfaceKey }) {
  const refs = FSA_REFERENCES[surface];
  if (!refs) return null;
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
