import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import {
  getCellarRows,
  CELLAR_CATEGORIES,
  CELLAR_CATEGORY_LABEL,
  type CellarCategory,
  type CellarRow,
} from '@/lib/cellar';
import { KpiCard } from '@/components/shell/KpiCard';
import { LookingAhead } from '@/components/shell/LookingAhead';
import { PrintButton } from '@/components/shell/PrintButton';
import { CellarPrint } from './CellarPrint';

export const metadata = { title: 'Cellar — Bar — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
});

const VALID_CATEGORIES: ReadonlyArray<CellarCategory> = CELLAR_CATEGORIES;

export default async function CellarPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; filter?: string }>;
}) {
  const ctx = await getShellContext();
  const sp = await searchParams;
  const allRows = await getCellarRows(ctx.siteId);

  const activeCategory =
    sp.category &&
    (VALID_CATEGORIES as readonly string[]).includes(sp.category)
      ? (sp.category as CellarCategory)
      : null;
  const filterParBreach = sp.filter === 'par-breach';

  let rows = allRows;
  if (activeCategory) {
    rows = rows.filter((r) => r.category === activeCategory);
  }
  if (filterParBreach) {
    rows = rows.filter((r) => r.par_status === 'breach');
  }

  const breachCount = allRows.filter((r) => r.par_status === 'breach').length;
  const totalValue = allRows.reduce(
    (sum, r) =>
      sum + (r.current_stock ?? 0) * (r.current_price ?? 0),
    0,
  );
  const categoryCounts = CELLAR_CATEGORIES.reduce(
    (acc, c) => {
      acc[c] = allRows.filter((r) => r.category === c).length;
      return acc;
    },
    {} as Record<CellarCategory, number>,
  );

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1400px] mx-auto">
      <div className="print-hide">
      <div className="flex justify-between items-start gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            Stock & Suppliers · Live Bottle Inventory
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
            <em className="text-gold font-semibold not-italic">Cellar</em>
          </h1>
          <p className="font-serif italic text-lg text-muted">
            {subtitleFor(allRows.length, breachCount, totalValue)}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {allRows.length > 0 && <PrintButton label="Print Cellar list" />}
          <Link
            href="/stock-suppliers/the-bank/new"
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors whitespace-nowrap"
          >
            + Add to Cellar
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-8">
        <KpiCard
          label="Bottles On The Books"
          value={String(allRows.length)}
          sub={`across ${countCategoriesWithRows(allRows)} categories`}
        />
        <KpiCard
          label="Par Breaches"
          value={String(breachCount)}
          sub={breachCount === 0 ? 'all above reorder' : 'under reorder point'}
          tone={breachCount > 0 ? 'urgent' : undefined}
        />
        <KpiCard
          label="Stock Value"
          value={gbp.format(totalValue)}
          sub="at current cost"
        />
        <KpiCard
          label="Pour-ready"
          value={String(
            allRows.filter(
              (r) => r.pack_volume_ml != null && r.current_price != null,
            ).length,
          )}
          sub="cost-per-pour live"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-6">
        <FilterChip
          href="/bartender/back-bar/cellar"
          active={activeCategory == null && !filterParBreach}
          label="All"
          count={allRows.length}
        />
        {CELLAR_CATEGORIES.map((c) => (
          <FilterChip
            key={c}
            href={`/bartender/back-bar/cellar?category=${c}`}
            active={activeCategory === c}
            label={CELLAR_CATEGORY_LABEL[c]}
            count={categoryCounts[c]}
          />
        ))}
        <div className="flex-1" />
        {breachCount > 0 && (
          <FilterChip
            href="/bartender/back-bar/cellar?filter=par-breach"
            active={filterParBreach}
            label="Par breach"
            count={breachCount}
            tone="urgent"
          />
        )}
      </div>

      {rows.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-12 text-center">
          <p className="font-serif italic text-muted">
            {activeCategory || filterParBreach
              ? 'No items match the current filter.'
              : 'Cellar is empty. Add bottles, wines and beers via The Bank.'}
          </p>
        </div>
      ) : (
        <CellarTable rows={rows} />
      )}

      <LookingAhead siteId={ctx.siteId} surface="cellar" />
      </div>

      <CellarPrint rows={allRows} kitchenName={ctx.kitchenName} />
    </div>
  );
}

function subtitleFor(
  total: number,
  breaches: number,
  stockValue: number,
): string {
  if (total === 0) {
    return 'Cellar is empty. Add bottles, wines, and beers to start tracking par levels.';
  }
  const parts: string[] = [];
  parts.push(`${total} ${total === 1 ? 'item' : 'items'}`);
  if (breaches > 0) {
    parts.push(
      `${breaches} under par — order before service`,
    );
  } else {
    parts.push('all above reorder point');
  }
  parts.push(`${gbp.format(stockValue)} on the shelves`);
  return parts.join('. ') + '.';
}

function countCategoriesWithRows(rows: CellarRow[]): number {
  return new Set(rows.map((r) => r.category).filter(Boolean)).size;
}

function FilterChip({
  href,
  active,
  label,
  count,
  tone,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  tone?: 'urgent';
}) {
  const base =
    'font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 border transition-colors flex items-center gap-2';
  let cls: string;
  if (active) {
    cls = tone === 'urgent'
      ? 'bg-urgent text-paper border-urgent'
      : 'bg-gold text-paper border-gold';
  } else {
    cls = tone === 'urgent'
      ? 'bg-transparent text-urgent border-urgent/40 hover:bg-urgent/10'
      : 'bg-transparent text-ink-soft border-rule hover:border-gold hover:text-gold';
  }
  return (
    <Link href={href} className={base + ' ' + cls}>
      {label}
      <span
        className={
          'text-[10px] tracking-[0.18em] ' +
          (active ? 'text-paper/70' : 'text-muted-soft')
        }
      >
        {count}
      </span>
    </Link>
  );
}

function CellarTable({ rows }: { rows: CellarRow[] }) {
  return (
    <div className="bg-card border border-rule">
      <div className="hidden md:grid grid-cols-[2fr_1fr_1.3fr_110px_100px_90px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
        {['Item', 'Category', 'Stock vs Par', 'Cost / 25ml', 'Bottle £', 'Updated'].map((h, i) => (
          <div
            key={i}
            className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
          >
            {h}
          </div>
        ))}
      </div>
      {rows.map((r, i) => (
        <CellarRowDisplay
          key={r.ingredient_id}
          row={r}
          last={i === rows.length - 1}
        />
      ))}
    </div>
  );
}

function CellarRowDisplay({
  row,
  last,
}: {
  row: CellarRow;
  last: boolean;
}) {
  const ratio =
    row.par_level != null &&
    row.par_level > 0 &&
    row.current_stock != null
      ? Math.max(0, Math.min(1.3, row.current_stock / row.par_level))
      : null;
  const barColor =
    row.par_status === 'breach'
      ? 'bg-urgent'
      : row.par_status === 'low'
        ? 'bg-attention'
        : row.par_status === 'healthy'
          ? 'bg-healthy'
          : 'bg-muted-soft';
  return (
    <Link
      href={`/stock-suppliers/the-bank/${row.ingredient_id}`}
      className={
        'grid grid-cols-1 md:grid-cols-[2fr_1fr_1.3fr_110px_100px_90px] gap-4 px-7 py-4 items-center hover:bg-paper-warm transition-colors' +
        (last ? '' : ' border-b border-rule-soft')
      }
    >
      <div>
        <div className="font-serif font-semibold text-base text-ink">
          {row.name}
        </div>
        {row.supplier_name && (
          <div className="font-serif italic text-xs text-muted mt-0.5">
            {row.supplier_name}
          </div>
        )}
      </div>
      <div className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-muted">
        {row.category ?? '—'}
      </div>
      <div>
        {row.current_stock != null && row.par_level != null ? (
          <>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span
                className={
                  'font-serif font-semibold text-sm ' +
                  (row.par_status === 'breach'
                    ? 'text-urgent'
                    : 'text-ink')
                }
              >
                {row.current_stock} / {row.par_level}
              </span>
              <span className="font-serif italic text-xs text-muted whitespace-nowrap">
                par
              </span>
            </div>
            <div className="h-1.5 bg-paper-warm border border-rule rounded-sm overflow-hidden">
              <div
                className={`h-full transition-all ${barColor}`}
                style={{ width: `${(ratio ?? 0) * 76}%` }}
              />
            </div>
          </>
        ) : (
          <span className="font-serif italic text-sm text-muted-soft">
            not tracked
          </span>
        )}
      </div>
      <div className="font-serif font-semibold text-sm text-ink">
        {row.cost_per_single != null
          ? gbp.format(row.cost_per_single)
          : '—'}
      </div>
      <div className="font-serif text-sm text-ink">
        {row.current_price != null ? gbp.format(row.current_price) : '—'}
      </div>
      <div className="font-serif italic text-xs text-muted">
        {row.last_seen_at
          ? dateFmt.format(new Date(row.last_seen_at))
          : '—'}
      </div>
    </Link>
  );
}
