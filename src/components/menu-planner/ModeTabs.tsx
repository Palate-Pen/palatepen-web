import Link from 'next/link';

export function ModeTabs({
  current,
  basePath,
}: {
  current: 'live' | 'planning';
  basePath: string;
}) {
  const tabClass = (active: boolean) =>
    'font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 border-b-2 transition-colors ' +
    (active
      ? 'border-gold text-ink'
      : 'border-transparent text-muted hover:text-ink hover:border-rule');
  return (
    <div className="flex gap-1 border-b border-rule mb-6">
      <Link href={basePath} className={tabClass(current === 'live')}>
        Live menu
      </Link>
      <Link
        href={`${basePath}?mode=planning`}
        className={tabClass(current === 'planning')}
      >
        Planning next
      </Link>
    </div>
  );
}
