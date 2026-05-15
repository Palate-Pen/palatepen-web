import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getRecipes, type Recipe } from '@/lib/recipes';
import { BAR_DISH_TYPES } from '@/lib/bar';
import { KpiCard } from '@/components/shell/KpiCard';
import { LookingAhead } from '@/components/shell/LookingAhead';
import { PlannerView } from '@/components/menu-planner/PlannerView';
import { ModeTabs } from '@/components/menu-planner/ModeTabs';
import { PrintButton } from '@/components/shell/PrintButton';
import { MenuPrint } from '@/components/menus/MenuPrint';

export const metadata = { title: 'The Drinks List — Bar — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

const SECTION_ORDER = [
  'classics',
  'signatures',
  'tonight',
  'wines-by-glass',
  'on-draught',
  'beer',
  'wine',
  'spirits',
  'soft',
];

const SECTION_LABEL: Record<string, string> = {
  classics: 'Classics',
  signatures: 'Signatures',
  tonight: 'Tonight Only',
  'wines-by-glass': 'Wines by the Glass',
  'on-draught': 'On Draught',
  beer: 'Beer',
  wine: 'Wine',
  spirits: 'Spirits',
  soft: 'Soft',
};

export default async function BarMenusPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string }>;
}) {
  const ctx = await getShellContext();
  const sp = searchParams ? await searchParams : {};
  const mode = sp?.mode === 'planning' ? 'planning' : 'live';

  if (mode === 'planning') {
    return (
      <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
        <ModeTabs current="planning" basePath="/bartender/menus" />
        <PlannerView
          siteId={ctx.siteId}
          surface="bar"
          revalidatePathname="/bartender/menus"
        />
      </div>
    );
  }

  const specs = await getRecipes(ctx.siteId, { dishTypes: BAR_DISH_TYPES });
  const onMenu = specs.filter((r) => r.sell_price != null && r.sell_price > 0);
  const sections = groupBySection(onMenu);

  const totalDrinks = sections.reduce((s, sec) => s + sec.dishes.length, 0);
  const blendedCost = onMenu.reduce((s, r) => s + (r.cost_per_cover ?? 0), 0);
  const blendedSell = onMenu.reduce((s, r) => s + (r.sell_price ?? 0), 0);
  const menuGpPct =
    blendedSell > 0 ? ((blendedSell - blendedCost) / blendedSell) * 100 : null;

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="print-hide">
      <ModeTabs current="live" basePath="/bartender/menus" />
      <div className="flex justify-between items-start mb-8 gap-6 flex-wrap">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            Behind The Bar Tonight
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-2">
            The <em className="text-gold not-italic font-semibold">Drinks List</em>
          </h1>
          <p className="font-serif italic text-lg text-muted">
            {totalDrinks > 0
              ? `${totalDrinks} ${totalDrinks === 1 ? 'drink' : 'drinks'} across ${sections.length} ${sections.length === 1 ? 'section' : 'sections'} · costing live from the Cellar`
              : 'No drinks on the list yet. Set sell prices on your specs to populate this surface.'}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          {totalDrinks > 0 && <PrintButton label="Print drinks list" />}
          <Link
            href="/manager/menu-builder"
            className="font-sans font-semibold text-xs tracking-[0.08em] uppercase px-5 py-2.5 border border-gold bg-transparent text-gold hover:bg-gold hover:text-paper transition-colors"
          >
            Edit list →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Pour cost"
          value={blendedCost > 0 ? gbp.format(blendedCost) : '—'}
          sub={totalDrinks > 0 ? 'blended across the list' : 'no costed specs'}
        />
        <KpiCard
          label="Cover spend (est.)"
          value={blendedSell > 0 ? gbp.format(blendedSell) : '—'}
          sub="every drink, every section"
        />
        <KpiCard
          label="Bar GP"
          value={menuGpPct != null ? `${menuGpPct.toFixed(0)}%` : '—'}
          sub={
            menuGpPct == null
              ? 'set sell prices to compute'
              : menuGpPct >= 78
                ? 'healthy'
                : menuGpPct >= 70
                  ? 'workable'
                  : 'thin'
          }
          tone={
            menuGpPct != null && menuGpPct >= 78
              ? 'healthy'
              : menuGpPct != null && menuGpPct < 70
                ? 'urgent'
                : menuGpPct != null
                  ? 'attention'
                  : undefined
          }
        />
        <KpiCard
          label="Drinks on list"
          value={String(totalDrinks)}
          sub={`${sections.length} ${sections.length === 1 ? 'section' : 'sections'}`}
        />
      </div>

      {sections.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-16 text-center">
          <div className="font-serif text-2xl text-ink mb-2">
            The bar's quiet.
          </div>
          <p className="font-serif italic text-muted">
            Add sell prices to your specs in /bartender/specs and they'll appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {sections.map((s) => (
            <SectionCard key={s.name} section={s} />
          ))}
        </div>
      )}

      <LookingAhead siteId={ctx.siteId} surface="bar_menus" />
      </div>

      <MenuPrint
        sections={sections}
        kitchenName={ctx.kitchenName}
        menuTitle="Tonight's drinks list"
      />
    </div>
  );
}

type Section = { name: string; label: string; dishes: Recipe[] };

function groupBySection(recipes: Recipe[]): Section[] {
  const grouped = new Map<string, Recipe[]>();
  for (const r of recipes) {
    const key = r.menu_section ?? 'signatures';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }
  return Array.from(grouped.entries())
    .sort((a, b) => {
      const ai = SECTION_ORDER.indexOf(a[0]);
      const bi = SECTION_ORDER.indexOf(b[0]);
      if (ai === -1 && bi === -1) return a[0].localeCompare(b[0]);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    })
    .map(([name, dishes]) => ({
      name,
      label: SECTION_LABEL[name] ?? name,
      dishes,
    }));
}

function SectionCard({ section }: { section: Section }) {
  return (
    <div className="bg-card border border-rule">
      <div className="px-6 py-5 border-b border-rule">
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold">
          {section.label}
        </div>
        <div className="text-xs text-muted mt-1">
          {section.dishes.length} {section.dishes.length === 1 ? 'drink' : 'drinks'}
        </div>
      </div>
      <div className="px-6 py-4">
        {section.dishes.map((d, i) => (
          <Link
            key={d.id}
            href={`/bartender/specs/${d.id}`}
            className={
              'block py-3 transition-colors hover:bg-paper-warm -mx-2 px-2 ' +
              (i === section.dishes.length - 1 ? '' : 'border-b border-rule-soft')
            }
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-serif font-medium text-sm text-ink">{d.name}</span>
              {d.sell_price != null && (
                <span className="font-serif font-semibold text-sm text-ink whitespace-nowrap">
                  {gbp.format(d.sell_price)}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
