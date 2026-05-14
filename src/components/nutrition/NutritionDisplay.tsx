import {
  FOP_LABEL,
  FOP_LIGHT_CLASS,
  NUTRITION_FIELDS,
  trafficLight,
  type RecipeNutritionSummary,
} from '@/lib/nutrition';

const fmt = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 });

/**
 * Recipe-detail nutrition section. Shows per-portion + per-100g side
 * by side, with FoP traffic-light badges on the fields that have a
 * rule (fat / saturates / sugars / salt). Renders nothing useful when
 * no contributing ingredient has nutrition declared — coverage % +
 * call-to-action surfaces instead.
 */
export function NutritionDisplay({
  summary,
}: {
  summary: RecipeNutritionSummary;
}) {
  if (!summary.hasData) {
    return (
      <div className="bg-card border border-rule px-7 py-6 text-center">
        <p className="font-serif italic text-muted leading-relaxed">
          No nutrition data yet. Add per-100g values on the Bank
          ingredients (Bank → ingredient detail) — once any ingredient has
          numbers, this section computes per-portion totals automatically.
        </p>
      </div>
    );
  }

  const coverageTone =
    summary.coveragePct >= 99
      ? 'text-healthy'
      : summary.coveragePct >= 60
        ? 'text-attention'
        : 'text-urgent';

  return (
    <div className="bg-card border border-rule">
      <div className="hidden md:grid grid-cols-[2fr_120px_120px_90px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
        {['Nutrient', 'Per portion', 'Per 100g', 'FoP'].map((h) => (
          <div
            key={h}
            className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
          >
            {h}
          </div>
        ))}
      </div>

      {NUTRITION_FIELDS.map((f, i) => {
        const perPortion = summary.perPortion[f.key];
        const per100g = summary.per100g[f.key];
        const tl =
          typeof per100g === 'number' && Number.isFinite(per100g)
            ? trafficLight(f.key, per100g)
            : null;
        const hasValue =
          typeof perPortion === 'number' || typeof per100g === 'number';

        return (
          <div
            key={f.key}
            className={
              'grid grid-cols-1 md:grid-cols-[2fr_120px_120px_90px] gap-4 px-7 py-3 items-center ' +
              (i === NUTRITION_FIELDS.length - 1 ? '' : 'border-b border-rule-soft') +
              (hasValue ? '' : ' opacity-50')
            }
          >
            <div className={f.indent ? 'pl-4' : ''}>
              <span
                className={
                  'font-serif text-sm ' +
                  (f.indent ? 'italic text-muted' : 'text-ink')
                }
              >
                {f.label}
              </span>
            </div>
            <div className="font-serif text-sm text-ink">
              {typeof perPortion === 'number' ? (
                <>
                  {fmt.format(perPortion)}{' '}
                  <span className="text-muted text-xs">{f.unit}</span>
                </>
              ) : (
                <span className="text-muted-soft">—</span>
              )}
            </div>
            <div className="font-serif text-sm text-ink">
              {typeof per100g === 'number' ? (
                <>
                  {fmt.format(per100g)}{' '}
                  <span className="text-muted text-xs">{f.unit}</span>
                </>
              ) : (
                <span className="text-muted-soft">—</span>
              )}
            </div>
            <div>
              {tl ? (
                <span
                  className={
                    'inline-flex items-center font-display font-semibold text-[10px] tracking-[0.18em] uppercase px-2 py-1 border rounded-sm ' +
                    FOP_LIGHT_CLASS[tl]
                  }
                >
                  {FOP_LABEL[tl]}
                </span>
              ) : (
                <span className="text-muted-soft text-xs">—</span>
              )}
            </div>
          </div>
        );
      })}

      <div className="px-7 py-3 bg-paper-warm border-t border-rule font-serif italic text-xs text-muted leading-relaxed">
        {summary.coveragePct >= 99 ? (
          <>Every contributing ingredient has nutrition data on file.</>
        ) : (
          <>
            <strong className={'not-italic font-semibold ' + coverageTone}>
              {fmt.format(summary.coveragePct)}% coverage
            </strong>
            {' — '}
            only the ingredients with declared per-100g values count toward these totals. Add nutrition to more Bank ingredients to tighten the numbers.
          </>
        )}
        <span className="text-muted-soft block mt-1">
          FoP thresholds per UK DH 2013 guidance · always verify with your EHO before printing labels.
        </span>
      </div>
    </div>
  );
}
