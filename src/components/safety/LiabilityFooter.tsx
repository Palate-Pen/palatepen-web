import { LIABILITY_FOOTER } from '@/lib/safety/legal';

/**
 * Locked liability footer. Rendered at the bottom of every safety page.
 * Wording lives in src/lib/safety/legal.ts and is reviewed for v1
 * launch — do not soften, do not paraphrase.
 */
export function LiabilityFooter() {
  return (
    <footer className="mt-16 pt-8 border-t-2 border-rule bg-paper-warm/40 px-7 py-7 print:bg-transparent print:border-t">
      <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-urgent mb-3">
        {LIABILITY_FOOTER.heading}
      </div>
      <p className="font-serif text-sm text-ink leading-relaxed mb-3">
        {LIABILITY_FOOTER.body}
      </p>
      <p className="font-serif italic text-xs text-muted">
        {LIABILITY_FOOTER.emergencyLine}
      </p>
    </footer>
  );
}
