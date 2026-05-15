import Link from 'next/link';
import { startStockCountAction } from '@/app/(shell)/stock-suppliers/stock-count/actions';
import type { StockTakeRow, StockTakeScope } from '@/lib/stock-takes';

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const STATUS_LABEL: Record<StockTakeRow['status'], string> = {
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_TONE: Record<
  StockTakeRow['status'],
  'attention' | 'healthy' | 'muted'
> = {
  in_progress: 'attention',
  completed: 'healthy',
  cancelled: 'muted',
};

const SCOPE_LABEL: Record<StockTakeScope, string> = {
  bar: 'Bar',
  kitchen: 'Kitchen',
  all: 'All',
};

export function StockCountList({
  rows,
  defaultScope,
  basePath,
  detailHref,
}: {
  rows: StockTakeRow[];
  defaultScope: StockTakeScope;
  /** Base path for the list (used as the start-action redirect target). */
  basePath: string;
  /** Function that maps take id → href to drill into. */
  detailHref: (id: string) => string;
}) {
  const inProgress = rows.find((r) => r.status === 'in_progress');
  const completed = rows.filter((r) => r.status === 'completed');
  const recoveredValue = completed.reduce(
    (sum, r) => sum + Math.abs(r.variance_total_value ?? 0),
    0,
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <div className="font-serif italic text-base text-muted">
            {rows.length === 0
              ? 'No counts yet. Start your first to reconcile reality against what the system thinks you have.'
              : inProgress
                ? `One take in progress. Resume to keep counting.`
                : `${completed.length} ${
                    completed.length === 1 ? 'count' : 'counts'
                  } on the books · ${gbp.format(recoveredValue)} variance surfaced historically.`}
          </div>
        </div>
        {inProgress ? (
          <Link
            href={detailHref(inProgress.id)}
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-attention text-paper border border-attention hover:bg-attention/90 transition-colors"
          >
            Resume count →
          </Link>
        ) : (
          <form action={startStockCountAction.bind(null, defaultScope, basePath)}>
            <button
              type="submit"
              className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors"
            >
              + Start a new count
            </button>
          </form>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-12 text-center">
          <p className="font-serif italic text-muted max-w-md mx-auto">
            Counts let you reconcile what's physically on the shelves against the system's expected stock. Variance surfaces as £ in either direction.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-rule">
          <div className="hidden md:grid grid-cols-[1.4fr_90px_90px_120px_110px_90px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
            {['Conducted', 'Scope', 'Lines', 'Variance', 'Status', ''].map(
              (h, i) => (
                <div
                  key={i}
                  className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
                >
                  {h}
                </div>
              ),
            )}
          </div>
          {rows.map((r, i) => {
            const tone = STATUS_TONE[r.status];
            const statusClass =
              tone === 'attention'
                ? 'text-attention bg-attention/10 border-attention/40'
                : tone === 'healthy'
                  ? 'text-healthy bg-healthy/10 border-healthy/40'
                  : 'text-muted bg-paper-warm border-rule';
            const varianceTone =
              r.variance_total_value == null
                ? 'text-muted-soft'
                : Math.abs(r.variance_total_value) > 50
                  ? 'text-urgent'
                  : Math.abs(r.variance_total_value) > 10
                    ? 'text-attention'
                    : 'text-ink';
            return (
              <Link
                key={r.id}
                href={detailHref(r.id)}
                className={
                  'grid grid-cols-1 md:grid-cols-[1.4fr_90px_90px_120px_110px_90px] gap-4 px-7 py-4 items-center hover:bg-paper-warm transition-colors' +
                  (i < rows.length - 1 ? ' border-b border-rule-soft' : '')
                }
              >
                <div>
                  <div className="font-serif font-semibold text-base text-ink">
                    {dateFmt.format(new Date(r.conducted_at))}
                  </div>
                  {r.notes && (
                    <div className="font-serif italic text-xs text-muted mt-0.5 line-clamp-1">
                      {r.notes}
                    </div>
                  )}
                </div>
                <div className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-muted">
                  {SCOPE_LABEL[r.scope]}
                </div>
                <div className="font-serif text-sm text-ink">
                  {r.line_count}
                </div>
                <div
                  className={'font-serif font-semibold text-sm ' + varianceTone}
                >
                  {r.variance_total_value != null
                    ? r.variance_total_value >= 0
                      ? '+£' + r.variance_total_value.toFixed(2)
                      : '−£' + Math.abs(r.variance_total_value).toFixed(2)
                    : '—'}
                </div>
                <div>
                  <span
                    className={
                      'inline-flex items-center px-2.5 py-1 border font-display font-semibold text-[10px] tracking-[0.18em] uppercase rounded-sm ' +
                      statusClass
                    }
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
                <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold text-right">
                  Open →
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
