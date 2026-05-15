import Link from 'next/link';

/**
 * Shared breadcrumb + title + sub block used by every safety sub-page
 * (probe / incidents / cleaning / training / haccp / eho). Mirrors the
 * locked chef-safety-*-mockup-v1.html header pattern verbatim.
 */
export function SafetyPageHeader({
  crumb,
  title,
  titleEm,
  subtitle,
}: {
  crumb: string;
  title: string;
  titleEm: string;
  subtitle: string;
}) {
  return (
    <>
      <div className="flex items-center gap-2 mb-3 font-sans text-sm">
        <Link
          href="/safety"
          className="text-muted hover:text-gold transition-colors"
        >
          Safety
        </Link>
        <span className="text-muted-soft">›</span>
        <span className="text-ink">{crumb}</span>
      </div>
      <h1 className="font-display text-4xl font-normal text-ink leading-[1.1] tracking-[-0.015em] mb-1.5">
        {title}{' '}
        <em className="text-gold italic font-medium">{titleEm}</em>
        {title.endsWith('?') ? '' : '.'}
      </h1>
      <p className="font-serif italic text-base text-muted mb-8">{subtitle}</p>
    </>
  );
}

export function SafetySideCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-rule mb-5">
      <div className="px-6 py-4 border-b border-rule">
        <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-ink">
          {title}
        </div>
      </div>
      <div className="divide-y divide-rule-soft">{children}</div>
    </div>
  );
}
