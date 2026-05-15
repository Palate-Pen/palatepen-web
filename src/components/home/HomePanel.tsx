import Link from 'next/link';

/**
 * The chef-home "Today's Deliveries / Today's Prep" panel pattern,
 * extracted so every shell's home renders the same tile/detail style.
 *
 * Layout:
 *   - gold display-cased eyebrow title on the left
 *   - italic muted count line on the right (one-liner status)
 *   - children render inside the body slot (free-form)
 *   - optional href turns the entire panel into a Link
 */
export function HomePanel({
  title,
  count,
  href,
  children,
}: {
  title: string;
  count: string;
  href?: string;
  children: React.ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-baseline justify-between mb-5 gap-4">
        <div className="font-display text-xs font-semibold tracking-[0.45em] uppercase text-gold">
          {title}
        </div>
        <div className="font-serif italic text-sm text-muted whitespace-nowrap">
          {count}
        </div>
      </div>
      {children}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="bg-card border border-rule px-8 py-7 hover:border-gold transition-colors block"
      >
        {body}
      </Link>
    );
  }
  return <div className="bg-card border border-rule px-8 py-7">{body}</div>;
}

/** Empty-state copy inside a HomePanel. Same italic muted treatment everywhere. */
export function HomePanelEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-serif italic text-sm text-muted leading-relaxed">
      {children}
    </div>
  );
}
