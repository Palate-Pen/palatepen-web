import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getRecipes, type Recipe } from '@/lib/recipes';
import { KpiCard } from '@/components/shell/KpiCard';
import { LookingAhead } from '@/components/shell/LookingAhead';
import {
  dietaryTagFull,
  dietaryTagsFor,
  shouldRenderDietary,
  type DietaryTag,
} from '@/lib/dietary';

export const metadata = { title: 'Menus — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

const SECTION_ORDER = [
  'starters',
  'mains',
  'grill',
  'sides',
  'desserts',
  'drinks',
];

const SECTION_LABEL: Record<string, string> = {
  starters: 'Starters',
  mains: 'Mains',
  grill: 'From the Grill',
  sides: 'Sides',
  desserts: 'Desserts',
  drinks: 'Drinks',
};

const DIETARY_CHIP_CLASS: Record<DietaryTag, string> = {
  V: 'bg-healthy/10 text-healthy border-healthy/40',
  VG: 'bg-healthy/10 text-healthy border-healthy/40',
  GF: 'bg-gold-bg text-gold-dark border-gold/40',
  DF: 'bg-gold-bg text-gold-dark border-gold/40',
  NF: 'bg-paper-warm text-ink-soft border-rule',
};

export default async function MenusPage() {
  const ctx = await getShellContext();
  const recipes = await getRecipes(ctx.siteId);

  // Group by menu_section; only include recipes that have a sell price
  // (they're "on the menu" — others are kitchen-only prep).
  const onMenu = recipes.filter((r) => r.sell_price != null && r.sell_price > 0);
  const sections = groupBySection(onMenu);

  const totalDishes = sections.reduce((s, sec) => s + sec.dishes.length, 0);
  const blendedCost = onMenu.reduce(
    (s, r) => s + (r.cost_per_cover ?? 0),
    0,
  );
  const blendedSell = onMenu.reduce(
    (s, r) => s + (r.sell_price ?? 0),
    0,
  );
  const menuGpPct =
    blendedSell > 0 ? ((blendedSell - blendedCost) / blendedSell) * 100 : null;

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-start mb-8 gap-6 flex-wrap">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            Today's Service
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-2">
            Today's <em className="text-gold not-italic font-semibold">Menu</em>
          </h1>
          <p className="font-serif italic text-lg text-muted">
            {totalDishes > 0
              ? `${totalDishes} ${totalDishes === 1 ? 'dish' : 'dishes'} across ${sections.length} ${sections.length === 1 ? 'section' : 'sections'} · costing live from The Bank`
              : 'No dishes on the menu yet. Set sell prices on your recipes to populate this surface.'}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <Link
            href="/manager/menu-builder"
            className="font-sans font-semibold text-xs tracking-[0.08em] uppercase px-5 py-2.5 border border-gold bg-transparent text-gold hover:bg-gold hover:text-paper transition-colors"
          >
            Edit menu →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Cost per cover"
          value={
            blendedCost > 0 ? gbp.format(blendedCost) : '—'
          }
          sub={
            totalDishes > 0 ? 'blended across the menu' : 'no costed dishes'
          }
        />
        <KpiCard
          label="Cover spend (est.)"
          value={blendedSell > 0 ? gbp.format(blendedSell) : '—'}
          sub="every dish, every section"
        />
        <KpiCard
          label="Menu GP"
          value={menuGpPct != null ? `${menuGpPct.toFixed(0)}%` : '—'}
          sub={
            menuGpPct == null
              ? 'set sell prices to compute'
              : menuGpPct >= 65
                ? 'healthy'
                : menuGpPct >= 55
                  ? 'workable'
                  : 'thin'
          }
          tone={
            menuGpPct != null && menuGpPct >= 65
              ? 'healthy'
              : menuGpPct != null && menuGpPct < 55
                ? 'urgent'
                : menuGpPct != null
                  ? 'attention'
                  : undefined
          }
        />
        <KpiCard
          label="Dishes on menu"
          value={String(totalDishes)}
          sub={`${sections.length} ${sections.length === 1 ? 'section' : 'sections'}`}
        />
      </div>

      {sections.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-16 text-center">
          <div className="font-serif text-2xl text-ink mb-2">
            No menu set yet.
          </div>
          <p className="font-serif italic text-muted">
            Add a sell price to each recipe and they show up here, grouped by section.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {sections.map((s) => (
            <MenuSectionCard key={s.name} section={s} />
          ))}
        </div>
      )}

      <LookingAhead siteId={ctx.siteId} surface="menus" />
    </div>
  );
}

type Section = { name: string; label: string; dishes: Recipe[] };

function groupBySection(recipes: Recipe[]): Section[] {
  const map = new Map<string, Recipe[]>();
  for (const r of recipes) {
    const key = r.menu_section ?? 'mains';
    const arr = map.get(key) ?? [];
    arr.push(r);
    map.set(key, arr);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => {
      const ai = SECTION_ORDER.indexOf(a);
      const bi = SECTION_ORDER.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    })
    .map(([name, dishes]) => ({
      name,
      label: SECTION_LABEL[name] ?? name,
      dishes,
    }));
}

function MenuSectionCard({ section }: { section: Section }) {
  return (
    <div className="bg-card border border-rule flex flex-col">
      <div className="px-6 py-5 border-b border-rule">
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold">
          {section.label}
        </div>
        <div className="text-xs text-muted mt-1">
          {section.dishes.length} {section.dishes.length === 1 ? 'dish' : 'dishes'}
        </div>
      </div>
      <div className="px-6 py-4 flex-1">
        {section.dishes.map((d, i) => (
          <DishLine
            key={d.id}
            recipe={d}
            last={i === section.dishes.length - 1}
          />
        ))}
      </div>
      <div className="px-6 py-3 border-t border-rule bg-card-warm">
        <Link
          href="/manager/menu-builder"
          className="block text-center w-full py-2 font-sans font-semibold text-xs tracking-[0.08em] uppercase bg-transparent border border-dashed border-gold text-gold hover:bg-gold hover:text-paper transition-colors"
        >
          Edit in Menu Builder →
        </Link>
      </div>
    </div>
  );
}

function DishLine({ recipe, last }: { recipe: Recipe; last: boolean }) {
  const tags = shouldRenderDietary(recipe.allergens)
    ? dietaryTagsFor(recipe.allergens)
    : [];

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className={
        'block py-3 transition-colors hover:bg-paper-warm -mx-2 px-2 rounded-sm ' +
        (last ? '' : 'border-b border-rule')
      }
    >
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <span className="font-serif font-medium text-sm text-ink">
          {recipe.name}
        </span>
        {recipe.sell_price != null && (
          <span className="font-serif font-semibold text-sm text-ink whitespace-nowrap">
            {gbp.format(recipe.sell_price)}
          </span>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-1.5">
          {tags.length > 0 ? (
            tags.map((t) => (
              <span
                key={t}
                title={dietaryTagFull(t)}
                className={
                  'font-display font-semibold text-[9px] tracking-[0.18em] uppercase px-1.5 py-[1px] border ' +
                  DIETARY_CHIP_CLASS[t]
                }
              >
                {t}
              </span>
            ))
          ) : recipe.allergens.contains.length === 0 &&
            recipe.allergens.mayContain.length === 0 ? (
            <span className="font-serif italic text-[11px] text-muted-soft">
              no allergens declared
            </span>
          ) : null}
        </div>
        <div className="text-xs text-muted whitespace-nowrap">
          {recipe.cost_per_cover != null
            ? `${gbp.format(recipe.cost_per_cover)} cost`
            : 'cost pending'}
        </div>
      </div>
    </Link>
  );
}
