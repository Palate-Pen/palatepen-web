import Link from 'next/link';

export type TagCount = { tag: string; count: number };

/**
 * Build a tag-count array from a list of taggable items, sorted by
 * frequency desc. Used by chef /recipes + bar /bartender/specs +
 * (eventually) /notebook.
 */
export function buildTagCloud<T extends { tags: string[] }>(
  items: T[],
): TagCount[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const t of item.tags) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * Tag filter row. Each chip is a Link that swaps the `tag` search param
 * on the current page. The basePath needs to be the route this list is
 * rendered at; activeTag highlights the currently selected one.
 */
export function TagCloud({
  cloud,
  basePath,
  activeTag,
  emptyLabel = 'no tags yet',
}: {
  cloud: TagCount[];
  basePath: string;
  activeTag: string | null;
  emptyLabel?: string;
}) {
  if (cloud.length === 0) {
    return (
      <div className="font-serif italic text-sm text-muted-soft">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Link
        href={basePath}
        className={
          'font-display font-semibold text-[10px] tracking-[0.18em] uppercase px-2.5 py-1 border transition-colors ' +
          (activeTag == null
            ? 'bg-ink text-paper border-ink'
            : 'bg-transparent text-muted border-rule hover:border-gold hover:text-gold')
        }
      >
        All
      </Link>
      {cloud.map(({ tag, count }) => {
        const active = activeTag === tag;
        return (
          <Link
            key={tag}
            href={`${basePath}?tag=${encodeURIComponent(tag)}`}
            className={
              'font-display font-semibold text-[10px] tracking-[0.18em] uppercase px-2.5 py-1 border transition-colors inline-flex items-center gap-1.5 ' +
              (active
                ? 'bg-gold text-paper border-gold'
                : 'bg-transparent text-ink-soft border-rule hover:border-gold hover:text-gold')
            }
          >
            {tag}
            <span
              className={
                'text-[8px] tracking-[0.18em] ' +
                (active ? 'text-paper/70' : 'text-muted-soft')
              }
            >
              {count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
