const DATASETS: Array<{
  key: string;
  label: string;
  sub: string;
}> = [
  {
    key: 'recipes',
    label: 'Recipes',
    sub: 'Name, section, dish type, serves, sell price, cost baseline, lock state, tags.',
  },
  {
    key: 'bank',
    label: 'The Bank',
    sub: 'Every ingredient — spec, unit, category, current price, par/reorder/stock.',
  },
  {
    key: 'stock',
    label: 'Stock at par',
    sub: 'Ingredients with a par level set — for stock-take prep + buy-back analysis.',
  },
  {
    key: 'waste',
    label: 'Waste log',
    sub: 'Every binned line with category + £ value snapshot.',
  },
  {
    key: 'invoices',
    label: 'Invoice history',
    sub: 'One row per scanned invoice — supplier, total, status.',
  },
];

/**
 * Five-link panel that drops CSV downloads to disk. Each link hits
 * /api/export?dataset=... which streams the file straight to the
 * browser. Excel-friendly UTF-8 BOM included.
 */
export function DataExportPanel() {
  return (
    <div className="divide-y divide-rule">
      {DATASETS.map((d) => (
        <a
          key={d.key}
          href={`/api/export?dataset=${d.key}`}
          download
          className="block px-7 py-4 hover:bg-paper-warm transition-colors"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="font-serif text-sm text-ink">{d.label}</div>
              <div className="font-serif italic text-xs text-muted mt-0.5">
                {d.sub}
              </div>
            </div>
            <span className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-gold whitespace-nowrap">
              Download CSV →
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}
