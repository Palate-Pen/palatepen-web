/**
 * Industry-standard GP / pour-cost benchmark reference. Static panel —
 * surfaces on chef Margins and bar Margins so chefs can sanity-check
 * their own targets against typical hospitality bands.
 *
 * Numbers from legacy Palate & Pen + standard hospitality finance
 * references. Treat as guidance, not gospel — actual targets depend
 * on local labour + rent + concept.
 */

type Band = {
  segment: string;
  gpRange: string;
  pourCostRange?: string;
  note: string;
};

const FOOD_BANDS: Band[] = [
  {
    segment: 'Fine dining',
    gpRange: '75-80%',
    note: 'High labour, premium produce, concept-led menus.',
  },
  {
    segment: 'Casual / bistro',
    gpRange: '65-70%',
    note: 'Mid-price covers, balanced labour + ingredient cost.',
  },
  {
    segment: 'Fast casual',
    gpRange: '60-65%',
    note: 'High-volume, lower labour, ingredient-led pricing.',
  },
  {
    segment: 'Contract / events',
    gpRange: '68-72%',
    note: 'Predictable covers, bulk buying, tighter waste control.',
  },
];

const BAR_BANDS: Band[] = [
  {
    segment: 'Spirits (neat / mixers)',
    gpRange: '76-82%',
    pourCostRange: '18-24%',
    note: 'Highest margin category. Premium spirits often sit at the top.',
  },
  {
    segment: 'Cocktails',
    gpRange: '78-82%',
    pourCostRange: '18-22%',
    note: 'Component-driven — citrus, ice, garnish all eat into margin.',
  },
  {
    segment: 'Beer',
    gpRange: '78-82%',
    pourCostRange: '18-22%',
    note: 'Tighter band; keg pricing + draft system efficiency drive it.',
  },
  {
    segment: 'Wines by glass',
    gpRange: '68-72%',
    pourCostRange: '28-32%',
    note: 'Lower margin than spirits/cocktails. Bottle yield matters.',
  },
];

export function GPBenchmarkPanel({
  flavour = 'food',
}: {
  flavour?: 'food' | 'bar';
}) {
  const bands = flavour === 'bar' ? BAR_BANDS : FOOD_BANDS;
  const headline =
    flavour === 'bar'
      ? 'Industry pour-cost bands'
      : 'Industry GP bands';
  const subline =
    flavour === 'bar'
      ? 'Where typical UK bars land. Use as a sanity check against your own targets.'
      : 'Where typical UK kitchens land. Compare against your account GP target.';

  return (
    <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-6">
      <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-gold mb-2">
        {headline}
      </div>
      <p className="font-serif italic text-sm text-muted mb-5 leading-relaxed">
        {subline}
      </p>
      <div className="divide-y divide-rule-soft">
        {bands.map((b) => (
          <div
            key={b.segment}
            className="grid grid-cols-1 md:grid-cols-[1.4fr_110px_110px_2fr] gap-4 py-3 items-baseline"
          >
            <div className="font-serif font-semibold text-base text-ink">
              {b.segment}
            </div>
            <div className="font-display font-semibold text-sm tracking-[0.04em] text-healthy">
              {b.gpRange} GP
            </div>
            <div className="font-display font-semibold text-sm tracking-[0.04em] text-muted">
              {b.pourCostRange ?? ''}
            </div>
            <div className="font-serif italic text-sm text-muted leading-relaxed">
              {b.note}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
