/**
 * Header bar for a page section — gold Cinzel label on the left,
 * optional italic muted meta on the right, divider underneath.
 *
 * Pages wrap their own <section> around this so they can control
 * the outer spacing (typically mt-12 between major sections, mt-8
 * between minor ones, none for the first section after a hero).
 */
export function SectionHead({
  title,
  meta,
}: {
  title: string;
  meta?: string;
}) {
  return (
    <div className="flex items-baseline justify-between mb-6 pb-3 border-b border-rule">
      <div className="font-display text-xs font-semibold tracking-[0.4em] uppercase text-gold">
        {title}
      </div>
      {meta && (
        <div className="font-serif italic text-sm text-muted">{meta}</div>
      )}
    </div>
  );
}
