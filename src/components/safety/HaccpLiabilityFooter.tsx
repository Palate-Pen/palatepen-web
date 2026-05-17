/**
 * Stronger liability notice rendered at the bottom of /safety/haccp.
 * Differs from the standard LiabilityFooter in two ways:
 *
 *   - Full urgent-red border (not just the top rule) — visual signal
 *     that this surface generates a legal document.
 *   - Label reads "Stronger Notice — HACCP & Legal Documents" and the
 *     body explicitly disclaims certification, legal advice, and the
 *     consultant relationship.
 *
 * Wording is locked per the chef-safety-haccp-mockup-v1 footnote: do
 * not soften, do not paraphrase.
 */
export function HaccpLiabilityFooter() {
  return (
    <div className="mt-9 px-7 py-6 bg-urgent/[0.08] border border-urgent border-l-[3px] border-l-urgent print:bg-transparent">
      <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-urgent mb-2">
        Stronger Notice — HACCP &amp; Legal Documents
      </div>
      <p className="font-serif text-sm text-ink-soft leading-relaxed">
        Palatable generates a{' '}
        <strong className="font-semibold text-urgent">draft HACCP plan</strong>{' '}
        from your data. This wizard does not replace professional food safety
        advice. We strongly recommend you have the generated plan{' '}
        <strong className="font-semibold text-urgent">
          reviewed by a qualified food safety adviser, your local authority
          Environmental Health team, or an accredited consultant
        </strong>{' '}
        before relying on it. Palatable is not a certification body, does not
        provide legal advice, and accepts no liability for the operation of
        your food business. The Food Business Operator named in the plan
        remains fully accountable for compliance with UK food safety law.
      </p>
    </div>
  );
}
