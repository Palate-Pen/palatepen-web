/**
 * Placeholder body for unbuilt bar surfaces. Sidebar already handles
 * navigation — this is the body of pending tabs.
 */
export function BarComingSoon({
  eyebrow,
  title,
  italic,
  subtitle,
  body,
  reads,
}: {
  eyebrow: string;
  title: string;
  italic?: string;
  subtitle: string;
  body: string;
  reads: string[];
}) {
  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1100px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        {eyebrow}
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
        {italic ? (
          <>
            {title}{' '}
            <em className="text-gold font-semibold not-italic">{italic}</em>
          </>
        ) : (
          <em className="text-gold font-semibold not-italic">{title}</em>
        )}
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-8">
        {subtitle}
      </p>

      <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-7">
        <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-gold mb-3">
          Pending design
        </div>
        <p className="font-serif italic text-base text-ink-soft leading-relaxed mb-5">
          {body}
        </p>
        <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-muted mb-2">
          Will read from
        </div>
        <ul className="font-serif text-sm text-ink-soft leading-relaxed">
          {reads.map((r) => (
            <li key={r}>· {r}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
