import Link from 'next/link';

export function SafetyQuickAction({
  href,
  title,
  sub,
  icon,
}: {
  href: string;
  title: string;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="bg-card border border-rule px-5 py-4 mb-2.5 flex items-center gap-3.5 hover:border-gold hover:bg-card-warm transition-colors group"
    >
      <div className="w-9 h-9 bg-gold-bg text-gold-dark flex items-center justify-center flex-shrink-0 rounded-sm">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-serif font-semibold text-[15px] text-ink">
          {title}
        </div>
        <div className="font-sans text-xs text-muted mt-0.5">{sub}</div>
      </div>
      <div className="text-muted-soft group-hover:text-gold transition-colors">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="w-4 h-4"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>
    </Link>
  );
}
