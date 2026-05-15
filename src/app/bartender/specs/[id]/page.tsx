import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRecipe } from '@/lib/recipes';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { POUR_COST_BANDS } from '@/lib/bar';
import { GPCalculatorButton } from '@/components/gp/GPCalculatorButton';
import { CostSimulatorButton } from '@/components/cost-simulator/CostSimulatorButton';
import { getShellContext } from '@/lib/shell/context';
import { getAccountPreferences } from '@/lib/account-preferences';
import { getNotesForRecipe } from '@/lib/notebook';
import { getGPHistory } from '@/lib/gp-calculations';
import { PrintButton } from '@/components/shell/PrintButton';
import { RecipePrintPage } from '@/app/(shell)/recipes/RecipePrintPage';

export const metadata = { title: 'Spec — Bar — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});
const qtyFmt = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 3 });

const TECHNIQUE_LABEL: Record<string, string> = {
  build: 'Build',
  stir: 'Stir',
  shake: 'Shake',
  throw: 'Throw',
  rolled: 'Rolled',
  blended: 'Blended',
};

export default async function SpecDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const spec = await getRecipe(id);
  if (!spec) notFound();
  const ctx = await getShellContext();
  const accountPrefs = await getAccountPreferences(ctx.accountId);
  const gpTarget = accountPrefs.gp_target_pct ?? 70;
  const linkedNotes = await getNotesForRecipe(spec.id, ctx.siteId);
  const gpHistory = await getGPHistory(ctx.siteId);
  const gpSeed = {
    dishName: spec.name,
    sellPrice: spec.sell_price,
    lines: spec.ingredients.map((i) => ({
      name: i.name,
      qty: i.qty,
      unit: i.unit,
      unitPrice: i.current_price,
    })),
  };
  const simSeed = {
    dishName: spec.name,
    sellPrice: spec.sell_price,
    serves: spec.serves ?? 1,
    lines: spec.ingredients.map((i) => ({
      id: i.id,
      name: i.name,
      qty: i.qty,
      unit: i.unit,
      lineCost: i.line_cost,
    })),
  };

  const band = POUR_COST_BANDS[spec.dish_type] ?? POUR_COST_BANDS.cocktail;
  const pourCostPct =
    spec.cost_per_cover != null && spec.sell_price && spec.sell_price > 0
      ? spec.cost_per_cover / spec.sell_price
      : null;
  const pourCostTone =
    pourCostPct == null
      ? undefined
      : pourCostPct <= band.healthy_max
        ? 'healthy'
        : pourCostPct <= band.attention_max
          ? 'attention'
          : 'urgent';
  const gpPct =
    pourCostPct != null ? (1 - pourCostPct) * 100 : null;
  const matched =
    spec.ingredients.length > 0 &&
    spec.matched_ingredient_count === spec.ingredients.length;
  const unmatched = spec.ingredients.length - spec.matched_ingredient_count;

  return (
    <>
    <div className="print-hide px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5 print-hide">
        Specs · Detail
      </div>
      <div className="flex flex-col md:flex-row gap-6 md:items-start mb-3">
        {spec.photo_url && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={spec.photo_url}
            alt={spec.name}
            className="w-full md:w-[240px] aspect-square object-cover border border-rule flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-4 flex-wrap">
            <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
              {spec.name}
            </h1>
            {spec.menu_section && (
              <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold mt-2">
                {spec.menu_section}
              </span>
            )}
          </div>
        </div>
      </div>
      <p className="font-serif italic text-lg text-muted mt-3 mb-8">
        {subtitleFor(spec, pourCostPct, band, matched, unmatched)}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Cost / Pour"
          value={
            spec.cost_per_cover != null
              ? gbp.format(spec.cost_per_cover)
              : '—'
          }
          sub={
            spec.cost_baseline != null
              ? `baseline ${gbp.format(Number(spec.cost_baseline))}`
              : 'live from Cellar'
          }
        />
        <KpiCard
          label="Sell Price"
          value={
            spec.sell_price != null
              ? gbp.format(spec.sell_price)
              : 'not set'
          }
          sub={
            spec.sell_price != null && pourCostPct != null
              ? `${(pourCostPct * 100).toFixed(0)}% pour cost`
              : 'no margin yet'
          }
        />
        <KpiCard
          label="Pour Cost"
          value={
            pourCostPct != null ? `${(pourCostPct * 100).toFixed(0)}%` : '—'
          }
          sub={
            pourCostPct != null
              ? `band ${(band.healthy_max * 100).toFixed(0)}-${(band.attention_max * 100).toFixed(0)}%`
              : 'set a sell price'
          }
          tone={pourCostTone}
        />
        <KpiCard
          label="GP"
          value={gpPct != null ? `${gpPct.toFixed(0)}%` : '—'}
          sub="gross profit per pour"
          tone={gpPct != null && gpPct >= 70 ? 'healthy' : undefined}
        />
      </div>

      <section className="mb-12">
        <SectionHead title="At The Pass" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <SpecMetaTile
            label="Glass"
            value={spec.glass_type ?? '—'}
          />
          <SpecMetaTile
            label="Ice"
            value={spec.ice_type ?? '—'}
          />
          <SpecMetaTile
            label="Technique"
            value={
              spec.technique
                ? TECHNIQUE_LABEL[spec.technique] ?? spec.technique
                : '—'
            }
          />
          <SpecMetaTile
            label="Pour"
            value={spec.pour_ml != null ? `${spec.pour_ml} ml` : '—'}
          />
        </div>
      </section>

      <section className="mb-12">
        <SectionHead
          title="Build"
          meta={
            spec.ingredients.length === 0
              ? 'no components'
              : `${spec.ingredients.length} ${spec.ingredients.length === 1 ? 'component' : 'components'}`
          }
        />
        {spec.ingredients.length === 0 ? (
          <div className="bg-card border border-rule px-10 py-12 text-center">
            <p className="font-serif italic text-muted">
              No build sheet yet. Add components — link them to the Cellar — and the cost-per-pour computes live.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-rule">
            <div className="hidden md:grid grid-cols-[2fr_120px_120px_100px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
              {['Component', 'Pour', 'Linked', 'Cost'].map((h, i) => (
                <div
                  key={i}
                  className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
                >
                  {h}
                </div>
              ))}
            </div>
            {spec.ingredients.map((ing, i) => (
              <div
                key={ing.id}
                className={
                  'grid grid-cols-1 md:grid-cols-[2fr_120px_120px_100px] gap-4 px-7 py-4 items-center' +
                  (i === spec.ingredients.length - 1
                    ? ''
                    : ' border-b border-rule-soft')
                }
              >
                <div className="font-serif font-semibold text-base text-ink">
                  {ing.sub_recipe_id ? (
                    <Link
                      href={`/bartender/specs/${ing.sub_recipe_id}`}
                      className="hover:text-gold transition-colors"
                    >
                      {ing.name}
                    </Link>
                  ) : (
                    ing.name
                  )}
                </div>
                <div className="font-serif text-sm text-ink">
                  {qtyFmt.format(ing.qty)} {ing.unit}
                </div>
                <div>
                  {ing.sub_recipe_id ? (
                    <span className="inline-flex items-center gap-1.5 font-display text-xs font-semibold tracking-[0.18em] uppercase text-gold">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                      Sub-spec
                    </span>
                  ) : ing.ingredient_id ? (
                    <span className="inline-flex items-center gap-1.5 font-display text-xs font-semibold tracking-[0.18em] uppercase text-healthy">
                      <span className="w-1.5 h-1.5 rounded-full bg-healthy" />
                      Cellar
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-display text-xs font-semibold tracking-[0.18em] uppercase text-muted-soft">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-soft" />
                      Free-text
                    </span>
                  )}
                </div>
                <div
                  className={
                    'font-serif font-semibold text-sm ' +
                    (ing.line_cost != null
                      ? 'text-ink'
                      : 'text-muted-soft italic')
                  }
                >
                  {ing.line_cost != null ? gbp.format(ing.line_cost) : '—'}
                </div>
              </div>
            ))}
            <div className="grid grid-cols-1 md:grid-cols-[2fr_120px_120px_100px] gap-4 px-7 py-4 bg-paper-warm border-t border-rule items-center">
              <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted md:col-span-3 text-right">
                Total pour cost
              </div>
              <div className="font-serif font-semibold text-base text-ink">
                {gbp.format(spec.total_cost)}
              </div>
            </div>
          </div>
        )}
      </section>

      {spec.garnish && (
        <section className="mb-12">
          <SectionHead title="Garnish" />
          <div className="bg-card border border-rule px-7 py-5">
            <p className="font-serif text-base text-ink-soft">
              {spec.garnish}
            </p>
          </div>
        </section>
      )}

      {spec.method.length > 0 && (
        <section className="mb-12">
          <SectionHead title="Method" />
          <div className="bg-card border border-rule">
            {spec.method.map((step, i) => (
              <div
                key={i}
                className={
                  'flex gap-5 px-7 py-5' +
                  (i < spec.method.length - 1 ? ' border-b border-rule-soft' : '')
                }
              >
                <div className="font-display font-semibold text-2xl text-gold leading-none mt-0.5 w-8 flex-shrink-0">
                  {i + 1}
                </div>
                <div className="font-serif text-base text-ink leading-relaxed">
                  {step}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {spec.notes && (
        <section className="mb-12">
          <SectionHead title="Behind The Bar" />
          <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-5">
            <p className="font-serif italic text-base text-ink-soft leading-relaxed">
              {spec.notes}
            </p>
          </div>
        </section>
      )}

      {linkedNotes.length > 0 && (
        <section className="mb-12">
          <SectionHead
            title="Linked Notes"
            meta={`${linkedNotes.length} ${linkedNotes.length === 1 ? 'note' : 'notes'} reference this spec`}
          />
          <div className="bg-card border border-rule">
            {linkedNotes.slice(0, 6).map((n, i) => (
              <Link
                key={n.id}
                href="/bartender/notebook"
                className={
                  'block px-7 py-4 hover:bg-paper-warm transition-colors' +
                  (i < Math.min(5, linkedNotes.length - 1)
                    ? ' border-b border-rule-soft'
                    : '')
                }
              >
                <div className="font-serif font-semibold text-base text-ink">
                  {n.title ?? 'Note'}
                </div>
                {n.body_md && (
                  <div className="font-serif italic text-sm text-muted mt-1 line-clamp-2">
                    {n.body_md}
                  </div>
                )}
              </Link>
            ))}
            {linkedNotes.length > 6 && (
              <div className="px-7 py-3 font-serif italic text-xs text-muted-soft border-t border-rule-soft">
                +{linkedNotes.length - 6} more in Notebook
              </div>
            )}
          </div>
        </section>
      )}

      <div className="flex items-center justify-between gap-3 mt-10 flex-wrap print-hide">
        <Link
          href="/bartender/specs"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
        >
          ← Back to Specs
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <PrintButton label="Print spec" />
          <CostSimulatorButton
            seed={simSeed}
            targetGpPct={gpTarget}
            label="Cost simulator"
          />
          <GPCalculatorButton
            seed={gpSeed}
            targetGpPct={gpTarget}
            label="Pour-cost calculator"
            variant="subtle"
            history={gpHistory}
            costPctLabel="Pour cost"
          />
          <Link
            href={`/bartender/specs/${spec.id}/edit`}
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors"
          >
            Edit spec →
          </Link>
        </div>
      </div>
    </div>
    <div className="printable-book">
      <RecipePrintPage recipe={spec} />
    </div>
    </>
  );
}

function subtitleFor(
  spec: Awaited<ReturnType<typeof getRecipe>>,
  pourCostPct: number | null,
  band: { healthy_max: number; attention_max: number },
  matched: boolean,
  unmatched: number,
): string {
  if (!spec) return '';
  const bits: string[] = [];
  if (spec.ingredients.length === 0) {
    return 'No build sheet yet — add components from the Cellar.';
  }
  if (pourCostPct != null) {
    const pct = (pourCostPct * 100).toFixed(0);
    if (pourCostPct <= band.healthy_max) {
      bits.push(`Pour cost ${pct}% — sitting healthy inside the band`);
    } else if (pourCostPct <= band.attention_max) {
      bits.push(`Pour cost ${pct}% — at the top of the band`);
    } else {
      bits.push(`Pour cost ${pct}% — out of the band`);
    }
  } else if (spec.cost_per_cover != null) {
    bits.push(`Costs ${gbp.format(spec.cost_per_cover)} to make`);
  }
  if (!matched && unmatched > 0) {
    bits.push(
      `${unmatched} ${unmatched === 1 ? 'component' : 'components'} unlinked`,
    );
  }
  return bits.join('. ') + '.';
}

function SpecMetaTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-card border border-rule px-6 py-5">
      <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-muted mb-3">
        {label}
      </div>
      <div className="font-serif text-xl text-ink leading-tight">{value}</div>
    </div>
  );
}
