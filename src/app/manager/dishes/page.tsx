import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getRecipes, type Recipe } from '@/lib/recipes';
import { BAR_DISH_TYPES, FOOD_DISH_TYPES } from '@/lib/bar';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { PrintButton } from '@/components/shell/PrintButton';
import { AllergenChips } from '@/components/allergens/AllergenPanel';

export const metadata = { title: 'Dishes — Manager — Palatable' };

const DRIFT_THRESHOLD = 0.03;

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

type DishFilter =
  | 'all'
  | 'food'
  | 'bar'
  | 'on-menu'
  | 'off-menu'
  | 'drifting'
  | 'locked';

const VALID_FILTERS: DishFilter[] = [
  'all',
  'food',
  'bar',
  'on-menu',
  'off-menu',
  'drifting',
  'locked',
];

function isBar(r: Recipe): boolean {
  return (BAR_DISH_TYPES as string[]).includes(r.dish_type);
}
function isFood(r: Recipe): boolean {
  return (FOOD_DISH_TYPES as string[]).includes(r.dish_type);
}
function isDrifting(r: Recipe): boolean {
  if (r.cost_baseline == null || r.cost_baseline <= 0 || r.cost_per_cover == null)
    return false;
  return (
    Math.abs((r.cost_per_cover - r.cost_baseline) / r.cost_baseline) >
    DRIFT_THRESHOLD
  );
}

export default async function ManagerDishesPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string; q?: string }>;
}) {
  const ctx = await getShellContext();
  const sp = searchParams ? await searchParams : {};
  const rawFilter = sp?.filter ?? 'all';
  const activeFilter: DishFilter = (VALID_FILTERS as string[]).includes(rawFilter)
    ? (rawFilter as DishFilter)
    : 'all';
  const search = (sp?.q ?? '').trim().toLowerCase();

  // Pull everything — no dish_type filter. Manager sees the full library.
  const all = await getRecipes(ctx.siteId);

  // Filter
  let rows = all;
  if (activeFilter === 'food') rows = rows.filter(isFood);
  if (activeFilter === 'bar') rows = rows.filter(isBar);
  if (activeFilter === 'on-menu')
    rows = rows.filter((r) => r.sell_price != null && r.sell_price > 0);
  if (activeFilter === 'off-menu')
    rows = rows.filter((r) => !(r.sell_price != null && r.sell_price > 0));
  if (activeFilter === 'drifting') rows = rows.filter(isDrifting);
  if (activeFilter === 'locked') rows = rows.filter((r) => r.locked);

  if (search) {
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(search) ||
        r.tags.some((t) => t.toLowerCase().includes(search)),
    );
  }

  // KPIs across the whole library (not the filtered slice)
  const costed = all.filter((r) => r.cost_per_cover != null);
  const drifting = all.filter(isDrifting);
  const priced = all.filter(
    (r) =>
      r.sell_price != null &&
      r.sell_price > 0 &&
      r.cost_per_cover != null,
  );
  const avgGp =
    priced.length === 0
      ? null
      : priced.reduce(
          (s, r) =>
            s + ((r.sell_price! - r.cost_per_cover!) / r.sell_price!) * 100,
          0,
        ) / priced.length;

  const counts = {
    all: all.length,
    food: all.filter(isFood).length,
    bar: all.filter(isBar).length,
    onMenu: all.filter((r) => r.sell_price != null && r.sell_price > 0)
      .length,
    offMenu: all.filter(
      (r) => !(r.sell_price != null && r.sell_price > 0),
    ).length,
    drifting: drifting.length,
    locked: all.filter((r) => r.locked).length,
  };

  return (
    <div className="printable px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            Site · The Whole Book
          </div>
          <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] text-ink mb-3">
            <em className="text-gold font-semibold not-italic">Dishes</em>
          </h1>
          <p className="font-serif italic text-lg text-muted">
            Every recipe and every spec across the brigade. Click any tile
            to land on the chef or bar detail page where it lives.
          </p>
        </div>
        <div className="print-hide">
          {all.length > 0 && <PrintButton label="Print dish list" />}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-8">
        <KpiCard
          label="On The Books"
          value={String(counts.all)}
          sub={`${counts.food} food · ${counts.bar} bar`}
        />
        <KpiCard
          label="Costed"
          value={String(costed.length)}
          sub={`of ${counts.all}`}
        />
        <KpiCard
          label="Drifting"
          value={String(counts.drifting)}
          sub="cost moved >3% since saved"
          tone={counts.drifting > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Avg GP"
          value={avgGp == null ? '—' : `${avgGp.toFixed(0)}%`}
          sub={`${priced.length} priced`}
          tone={
            avgGp == null
              ? undefined
              : avgGp >= 65
                ? 'healthy'
                : avgGp >= 55
                  ? 'attention'
                  : 'urgent'
          }
        />
      </div>

      {/* Filter chips + search */}
      <div className="flex items-center gap-2 flex-wrap mb-6 print-hide">
        <FilterChip
          active={activeFilter === 'all'}
          href={search ? `?q=${encodeURIComponent(search)}` : '/manager/dishes'}
          label="All"
          count={counts.all}
        />
        <FilterChip
          active={activeFilter === 'food'}
          href={chipHref('food', search)}
          label="Food"
          count={counts.food}
        />
        <FilterChip
          active={activeFilter === 'bar'}
          href={chipHref('bar', search)}
          label="Bar"
          count={counts.bar}
        />
        <span className="w-px h-5 bg-rule mx-1" />
        <FilterChip
          active={activeFilter === 'on-menu'}
          href={chipHref('on-menu', search)}
          label="On menu"
          count={counts.onMenu}
        />
        <FilterChip
          active={activeFilter === 'off-menu'}
          href={chipHref('off-menu', search)}
          label="Off menu"
          count={counts.offMenu}
        />
        <FilterChip
          active={activeFilter === 'drifting'}
          href={chipHref('drifting', search)}
          label="Drifting"
          count={counts.drifting}
          tone={counts.drifting > 0 ? 'attention' : undefined}
        />
        <FilterChip
          active={activeFilter === 'locked'}
          href={chipHref('locked', search)}
          label="Locked"
          count={counts.locked}
        />
        <form
          method="get"
          action="/manager/dishes"
          className="ml-auto flex items-center gap-2"
        >
          {activeFilter !== 'all' && (
            <input type="hidden" name="filter" value={activeFilter} />
          )}
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Search by name or tag…"
            className="px-3 py-1.5 border border-rule bg-card font-serif text-sm text-ink focus:outline-none focus:border-gold w-64"
          />
        </form>
      </div>

      <SectionHead
        title={titleFor(activeFilter)}
        meta={`${rows.length} of ${counts.all}`}
      />

      {rows.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-16 text-center">
          <p className="font-serif italic text-muted">
            {search
              ? `Nothing matches "${search}".`
              : 'No dishes match this filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rows.map((r) => (
            <DishTile key={r.id} recipe={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function chipHref(filter: DishFilter | 'all', q: string): string {
  const parts: string[] = [];
  if (filter !== 'all') parts.push(`filter=${filter}`);
  if (q) parts.push(`q=${encodeURIComponent(q)}`);
  return parts.length === 0
    ? '/manager/dishes'
    : `/manager/dishes?${parts.join('&')}`;
}

function titleFor(filter: DishFilter): string {
  switch (filter) {
    case 'food':
      return 'Food';
    case 'bar':
      return 'Bar';
    case 'on-menu':
      return 'On the live menu';
    case 'off-menu':
      return 'Off menu (no sell price)';
    case 'drifting':
      return 'Drifting';
    case 'locked':
      return 'Locked';
    default:
      return 'All dishes';
  }
}

function FilterChip({
  active,
  href,
  label,
  count,
  tone,
}: {
  active: boolean;
  href: string;
  label: string;
  count: number;
  tone?: 'attention';
}) {
  const base =
    'font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 border transition-colors flex items-center gap-2';
  let cls: string;
  if (active) {
    cls =
      tone === 'attention'
        ? 'bg-attention text-paper border-attention'
        : 'bg-gold text-paper border-gold';
  } else {
    cls =
      tone === 'attention' && count > 0
        ? 'bg-transparent text-attention border-attention/40 hover:bg-attention/10'
        : 'bg-transparent text-ink-soft border-rule hover:border-gold hover:text-gold';
  }
  return (
    <Link href={href} className={base + ' ' + cls}>
      {label}
      <span
        className={
          'text-[11px] tracking-[0.18em] ' +
          (active ? 'text-paper/70' : 'text-muted-soft')
        }
      >
        {count}
      </span>
    </Link>
  );
}

function DishTile({ recipe }: { recipe: Recipe }) {
  const surface: 'food' | 'bar' = isBar(recipe) ? 'bar' : 'food';
  const href =
    surface === 'bar'
      ? `/bartender/specs/${recipe.id}`
      : `/recipes/${recipe.id}`;

  const sell = recipe.sell_price;
  const cost = recipe.cost_per_cover;
  const baseline = recipe.cost_baseline;
  const gpPct =
    sell != null && sell > 0 && cost != null
      ? ((sell - cost) / sell) * 100
      : null;
  const baselineGp =
    sell != null && sell > 0 && baseline != null
      ? ((sell - baseline) / sell) * 100
      : null;
  const deltaPt =
    gpPct != null && baselineGp != null ? gpPct - baselineGp : null;

  let tone: 'healthy' | 'attention' | 'urgent' | 'muted' = 'muted';
  if (deltaPt != null) {
    if (deltaPt > 0.5) tone = 'healthy';
    else if (deltaPt < -8) tone = 'urgent';
    else if (deltaPt < -0.5) tone = 'attention';
  }
  const toneText =
    tone === 'healthy'
      ? 'text-healthy'
      : tone === 'attention'
        ? 'text-attention'
        : tone === 'urgent'
          ? 'text-urgent'
          : 'text-ink-soft';

  return (
    <Link
      href={href}
      className="bg-card border border-rule cursor-pointer transition-all hover:border-gold hover:shadow-[0_4px_16px_rgba(26,22,18,0.08)] flex flex-col overflow-hidden"
    >
      {recipe.photo_url && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={recipe.photo_url}
          alt={recipe.name}
          className="w-full aspect-[16/10] object-cover border-b border-rule"
        />
      )}
      <div className="px-6 py-5 flex-1">
        <div className="flex items-baseline justify-between gap-3 mb-1.5">
          <div className="font-serif font-semibold text-lg text-ink leading-tight">
            {recipe.name}
            {recipe.locked && (
              <span
                className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-gold ml-2"
                title="Locked"
              >
                🔒
              </span>
            )}
          </div>
          <SurfaceBadge surface={surface} />
        </div>
        <div className="font-serif italic text-xs text-muted mb-3">
          {recipe.dish_type}
          {recipe.menu_section ? ` · ${recipe.menu_section}` : ''}
        </div>
        {(recipe.allergens.contains.length > 0 ||
          recipe.allergens.mayContain.length > 0) && (
          <div className="mb-3">
            <AllergenChips value={recipe.allergens} size="sm" />
          </div>
        )}
      </div>

      <div className="px-6 py-3 border-t border-rule bg-gradient-to-r from-[rgba(93,127,79,0.04)] to-transparent flex justify-between items-baseline gap-3">
        <div className="font-sans font-semibold text-[11px] tracking-[0.18em] uppercase text-muted">
          {surface === 'bar' ? 'Pour cost' : 'Dish GP'}
        </div>
        <div className="text-right">
          {sell == null || sell === 0 ? (
            <div className="font-serif italic text-xs text-muted">
              no sell price
            </div>
          ) : cost == null ? (
            <div className="font-serif italic text-xs text-muted">
              cost pending
            </div>
          ) : (
            <>
              <div className={'font-serif font-semibold text-base ' + toneText}>
                {gpPct!.toFixed(0)}%
                <span className="font-serif italic text-[11px] text-muted ml-1">
                  · {gbp.format(cost)}
                </span>
              </div>
              {deltaPt != null && Math.abs(deltaPt) >= 0.5 && (
                <div className={'font-serif italic text-[11px] ' + toneText}>
                  {deltaPt > 0 ? '+' : ''}
                  {deltaPt.toFixed(1)}pt since costed
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

function SurfaceBadge({ surface }: { surface: 'food' | 'bar' }) {
  return (
    <span
      className={
        'font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-2 py-0.5 border whitespace-nowrap ' +
        (surface === 'bar'
          ? 'bg-paper-warm text-gold-dark border-gold/40'
          : 'bg-gold-bg text-gold-dark border-gold/40')
      }
    >
      {surface === 'bar' ? 'Bar' : 'Food'}
    </span>
  );
}
