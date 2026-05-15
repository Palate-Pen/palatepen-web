import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import {
  getBankRows,
  getBankSummary,
  isFlatMovement,
  sparklineLastPoint,
  sparklinePoints,
  type BankRow,
} from '@/lib/bank';
import { LookingAhead } from '@/components/shell/LookingAhead';
import { KpiCard } from '@/components/shell/KpiCard';

export const metadata = { title: 'The Bank — Palatable' };

const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function relativeDay(iso: string | null, now: Date): string {
  if (!iso) return '—';
  const t = new Date(iso);
  const diffH = (now.getTime() - t.getTime()) / (1000 * 60 * 60);
  if (diffH < 12) return `today ${dateTimeFmt.format(t)}`;
  if (diffH < 36) return `yesterday ${dateTimeFmt.format(t)}`;
  const days = Math.floor(diffH / 24);
  return `${days} days ago`;
}

export default async function TheBankPage() {
  const ctx = await getShellContext();
  const [rows, summary] = await Promise.all([
    getBankRows(ctx.siteId),
    getBankSummary(ctx.siteId),
  ]);

  const now = new Date();
  const lastUpdateLabel =
    summary.last_update_at &&
    new Date(summary.last_update_at).getTime() > now.getTime() - 36 * 60 * 60 * 1000
      ? dateTimeFmt.format(new Date(summary.last_update_at))
      : null;

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-start gap-8 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5 flex items-center gap-3">
            <span>Every Ingredient, Every Price</span>
            {lastUpdateLabel && (
              <span className="font-serif italic text-xs tracking-normal normal-case text-muted inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-healthy animate-pulse" />
                Live · last update {lastUpdateLabel}
              </span>
            )}
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
            <em className="text-gold font-semibold not-italic">The Bank</em>
          </h1>
          <p className="font-serif italic text-lg text-muted mt-3">
            {summary.ingredients_on_file} ingredients on file.{' '}
            {summary.prices_on_the_move > 0 ? (
              <>
                {summary.prices_on_the_move} moving this week.{' '}
                {topMoversCopy(rows)}
              </>
            ) : (
              <>Prices steady — no movement worth flagging yet.</>
            )}
          </p>
        </div>
        <Link
          href="/stock-suppliers/the-bank/new"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors whitespace-nowrap"
        >
          + Add ingredient
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Ingredients On File"
          value={String(summary.ingredients_on_file)}
          sub={`across ${summary.suppliers_active} suppliers`}
        />
        <KpiCard
          label="Prices On The Move"
          value={String(summary.prices_on_the_move)}
          sub={`this week · ${summary.movement_up} up · ${summary.movement_down} down`}
          tone={summary.prices_on_the_move > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Auto-Updated This Week"
          value={String(summary.auto_updated_this_week)}
          sub="from scanned invoices"
        />
        <KpiCard
          label="Multi-Sourced"
          value={String(summary.multi_sourced)}
          sub="ingredients you buy from 2+"
        />
      </div>

      {rows.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-16 text-center">
          <div className="font-serif text-2xl text-ink mb-2">
            The Bank's empty.
          </div>
          <p className="font-serif italic text-muted">
            Scan your first invoice or add an ingredient by hand. The system fills this in from there.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-rule">
          <div className="hidden md:grid grid-cols-[2fr_1.4fr_140px_110px_110px_120px_40px] gap-4 px-6 py-4 border-b border-rule bg-paper-warm">
            {['Ingredient', 'Supplier', '30-day shape', 'Price', 'Movement', 'Stock', ''].map(
              (h, i) => (
                <div
                  key={i}
                  className={
                    'font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted ' +
                    (i === 3 || i === 4 ? 'text-right' : '')
                  }
                >
                  {h}
                </div>
              ),
            )}
          </div>

          {rows.map((r) => (
            <BankRowView key={r.ingredient_id} row={r} now={now} />
          ))}
        </div>
      )}

      <LookingAhead siteId={ctx.siteId} surface="stock-suppliers" />
    </div>
  );
}

function topMoversCopy(rows: BankRow[]): string {
  const movers = rows
    .filter((r) => !isFlatMovement(r.movement_pct))
    .slice(0, 2)
    .map((r) => r.name.toLowerCase());
  if (movers.length === 0) return '';
  if (movers.length === 1) return `${movers[0]} leading the charge.`;
  return `${movers[0]} and ${movers[1]} leading the charge.`;
}


function casualSupplier(name: string | null): string {
  if (!name) return '—';
  const tokens = name.split(/\s+/);
  if (tokens.length === 1) return tokens[0];
  if (tokens[0].toLowerCase() === 'mediterranean') return name;
  return tokens[0];
}

function unitLabel(unit: string | null): string {
  if (!unit) return '';
  if (unit === 'kg' || unit === 'g' || unit === 'L' || unit === 'ml')
    return `per ${unit}`;
  if (unit === '5g' || unit === '5L' || unit === '25kg') return `per ${unit}`;
  return `per ${unit}`;
}

function StockCell({ row }: { row: BankRow }) {
  if (row.current_stock == null && row.par_level == null) {
    return (
      <span className="font-serif italic text-xs text-muted-soft">
        not tracked
      </span>
    );
  }
  if (row.par_level == null || row.par_level === 0) {
    return (
      <span className="font-serif text-sm text-ink">
        {row.current_stock ?? 0} {row.unit ?? ''}
      </span>
    );
  }
  const ratio = Math.max(
    0,
    Math.min(1.3, (row.current_stock ?? 0) / row.par_level),
  );
  const barColor =
    row.par_status === 'breach'
      ? 'bg-urgent'
      : row.par_status === 'low'
        ? 'bg-attention'
        : 'bg-healthy';
  const textColor =
    row.par_status === 'breach'
      ? 'text-urgent'
      : row.par_status === 'low'
        ? 'text-attention'
        : 'text-ink';
  return (
    <div>
      <div className="flex items-baseline justify-between gap-1 mb-1">
        <span className={'font-serif font-semibold text-sm ' + textColor}>
          {row.current_stock ?? 0} / {row.par_level}
        </span>
      </div>
      <div className="h-1 bg-paper-warm border border-rule rounded-sm overflow-hidden">
        <div
          className={`h-full ${barColor}`}
          style={{ width: `${ratio * 76}%` }}
        />
      </div>
    </div>
  );
}

function BankRowView({ row, now }: { row: BankRow; now: Date }) {
  const flat = isFlatMovement(row.movement_pct);
  const up = !flat && row.movement_pct > 0;
  const down = !flat && row.movement_pct < 0;

  const justIn =
    row.last_seen_at &&
    now.getTime() - new Date(row.last_seen_at).getTime() < 6 * 60 * 60 * 1000;

  const movementColor = up
    ? 'text-urgent'
    : down
      ? 'text-healthy'
      : 'text-muted-soft';

  const points = sparklinePoints(row.history);
  const last = sparklineLastPoint(row.history);

  return (
    <Link
      href={`/stock-suppliers/the-bank/${row.ingredient_id}`}
      className={
        'grid grid-cols-1 md:grid-cols-[2fr_1.4fr_140px_110px_110px_120px_40px] gap-4 px-6 py-4 items-center border-b border-rule-soft last:border-b-0 cursor-pointer hover:bg-card-warm transition-colors ' +
        (justIn ? 'bg-gold-bg' : '')
      }
    >
      <div>
        <div className="font-serif font-semibold text-base text-ink flex items-center gap-2">
          {row.name}
          {justIn && (
            <span className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold px-1.5 py-0.5 border border-gold/40 bg-gold-bg">
              just in
            </span>
          )}
        </div>
        {row.spec && (
          <div className="font-serif italic text-xs text-muted mt-0.5">
            {row.spec}
          </div>
        )}
      </div>

      <div>
        <div className="font-serif text-sm text-ink">
          <em className="text-gold not-italic font-medium italic">
            {casualSupplier(row.supplier_name)}
          </em>
        </div>
        <div className="text-xs text-muted mt-0.5">
          {row.multi_supplier_count > 1
            ? `${row.multi_supplier_count} suppliers`
            : 'single source'}
          {row.last_seen_at &&
            now.getTime() - new Date(row.last_seen_at).getTime() < 36 * 60 * 60 * 1000 &&
            ` · updated ${relativeDay(row.last_seen_at, now)}`}
        </div>
      </div>

      <div>
        {row.history.length > 1 ? (
          <svg
            viewBox="0 0 120 36"
            preserveAspectRatio="none"
            className={'w-full h-9 ' + movementColor}
          >
            <polyline
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle cx={last.x} cy={last.y} r="2.5" fill="currentColor" />
          </svg>
        ) : (
          <div className="text-xs text-muted-soft italic">
            not enough history yet
          </div>
        )}
      </div>

      <div className="md:text-right">
        <div className="font-serif font-semibold text-lg text-ink leading-none">
          £{row.current_price.toFixed(2)}
        </div>
        <div className="text-xs text-muted mt-0.5">
          {unitLabel(row.unit)}
        </div>
      </div>

      <div
        className={
          'flex items-center gap-2 md:justify-end font-serif font-semibold text-base ' +
          movementColor
        }
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {up && <path d="M5 14l7-7 7 7" />}
          {down && <path d="M19 10l-7 7-7-7" />}
          {flat && <path d="M5 12h14" />}
        </svg>
        <span>
          {flat
            ? '0.0%'
            : (row.movement_pct > 0 ? '+' : '') +
              row.movement_pct.toFixed(1) +
              '%'}
        </span>
      </div>

      <div className="hidden md:block">
        <StockCell row={row} />
      </div>

      <div className="text-muted-soft justify-self-end hidden md:block">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>
    </Link>
  );
}
