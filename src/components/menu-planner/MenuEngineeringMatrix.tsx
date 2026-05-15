import {
  QUADRANT_LABEL,
  QUADRANT_DESCRIPTION,
  type MenuPlanItem,
  type Quadrant,
} from '@/lib/menu-plan-shared';

const QUADRANT_TONE: Record<
  Quadrant,
  { card: string; label: string; chip: string }
> = {
  star: {
    card: 'border-healthy/40 bg-healthy/5',
    label: 'text-healthy',
    chip: 'bg-healthy/10 text-healthy border-healthy/40',
  },
  plowhorse: {
    card: 'border-attention/40 bg-attention/5',
    label: 'text-attention',
    chip: 'bg-attention/10 text-attention border-attention/40',
  },
  puzzle: {
    card: 'border-gold/40 bg-gold-bg',
    label: 'text-gold-dark',
    chip: 'bg-gold-bg text-gold-dark border-gold/40',
  },
  dog: {
    card: 'border-urgent/40 bg-urgent/5',
    label: 'text-urgent',
    chip: 'bg-urgent/10 text-urgent border-urgent/40',
  },
  unrated: {
    card: 'border-rule bg-paper-warm/30',
    label: 'text-muted',
    chip: 'bg-paper-warm text-muted border-rule',
  },
};

/**
 * Classical menu engineering 2x2: popularity on the x-axis, GP% on
 * the y-axis. The four named quadrants come from Kasavana & Smith.
 * We add a fifth "Unrated" tray below to surface items the chef
 * hasn't given a popularity rating yet.
 */
export function MenuEngineeringMatrix({
  items,
}: {
  items: MenuPlanItem[];
}) {
  const buckets: Record<Quadrant, MenuPlanItem[]> = {
    star: [],
    plowhorse: [],
    puzzle: [],
    dog: [],
    unrated: [],
  };
  for (const i of items) {
    if (i.action === 'remove') continue;
    buckets[i.quadrant].push(i);
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <QuadrantCard quadrant="puzzle" items={buckets.puzzle} />
        <QuadrantCard quadrant="star" items={buckets.star} />
        <QuadrantCard quadrant="dog" items={buckets.dog} />
        <QuadrantCard quadrant="plowhorse" items={buckets.plowhorse} />
      </div>
      {buckets.unrated.length > 0 && (
        <div className="mt-3">
          <QuadrantCard quadrant="unrated" items={buckets.unrated} />
        </div>
      )}
    </div>
  );
}

function QuadrantCard({
  quadrant,
  items,
}: {
  quadrant: Quadrant;
  items: MenuPlanItem[];
}) {
  const tone = QUADRANT_TONE[quadrant];
  return (
    <div className={`border ${tone.card} p-5`}>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <div className={`font-display font-semibold text-xs tracking-[0.18em] uppercase ${tone.label}`}>
          {QUADRANT_LABEL[quadrant]}
        </div>
        <div className="font-serif text-xs text-muted">{items.length}</div>
      </div>
      <p className="font-serif italic text-xs text-muted leading-relaxed mb-3">
        {QUADRANT_DESCRIPTION[quadrant]}
      </p>
      {items.length === 0 ? (
        <p className="font-serif italic text-sm text-muted-soft">No dishes here.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((i) => (
            <li
              key={i.id}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="font-serif text-ink truncate">{i.display_name}</span>
              <span className={`font-display font-semibold text-xs tracking-[0.08em] uppercase whitespace-nowrap ${tone.label}`}>
                {i.gp_pct != null ? `${i.gp_pct.toFixed(0)}% GP` : 'unrated'}
                {i.popularity_rating != null && ` · ${'★'.repeat(i.popularity_rating)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
