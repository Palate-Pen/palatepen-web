import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStockTake } from '@/lib/stock-takes';
import { getShellContext } from '@/lib/shell/context';
import { StockCountSession } from '@/components/stock-count/StockCountSession';
import { cancelStockCountAction } from '@/app/(shell)/stock-suppliers/stock-count/actions';
import { PrintButton } from '@/components/shell/PrintButton';
import { StockCountPrint } from '@/app/(shell)/stock-suppliers/stock-count/[id]/StockCountPrint';

export const metadata = { title: 'Stock Take Session — Bar — Palatable' };

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default async function BarStockTakeSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ completed?: string }>;
}) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const justCompleted = sp?.completed === '1';
  const take = await getStockTake(id);
  if (!take) notFound();
  const ctx = await getShellContext();

  const readOnly = take.status !== 'in_progress';

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="print-hide">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Back Bar · Take Session
      </div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] text-ink">
          {dateFmt.format(new Date(take.conducted_at))} ·{' '}
          <em className="text-gold font-semibold not-italic">
            {take.status === 'in_progress'
              ? 'In Progress'
              : take.status === 'completed'
                ? 'Completed'
                : 'Cancelled'}
          </em>
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {take.lines.length > 0 && (
            <PrintButton
              label={
                take.status === 'in_progress'
                  ? 'Print tick sheet'
                  : 'Print summary'
              }
            />
          )}
          {take.status === 'in_progress' && (
            <form action={cancelStockCountAction.bind(null, take.id)}>
              <button
                type="submit"
                className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 bg-transparent text-muted border border-rule hover:border-urgent hover:text-urgent transition-colors"
              >
                Cancel count
              </button>
            </form>
          )}
        </div>
      </div>
      <p className="font-serif italic text-lg text-muted mt-1 mb-8">
        {subtitleFor(take, justCompleted)}
      </p>

      <StockCountSession
        detail={take}
        readOnly={readOnly}
        onCompleteRedirect="/bartender/back-bar/stock-take"
      />

      <div className="mt-10">
        <Link
          href="/bartender/back-bar/stock-take"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
        >
          ← Back to Stock Take
        </Link>
      </div>
      </div>

      <StockCountPrint take={take} kitchenName={ctx.kitchenName} />
    </div>
  );
}

function subtitleFor(
  take: Awaited<ReturnType<typeof getStockTake>>,
  justCompleted: boolean,
): string {
  if (!take) return '';
  if (justCompleted) {
    return 'Take saved. Cellar stock updated to match the floor count for every counted bottle.';
  }
  if (take.status === 'in_progress') {
    return 'Tap counted quantities as you walk the cellar. Variance computes live in £ — Tanqueray etc.';
  }
  if (take.status === 'completed') {
    return `Completed${
      take.completed_at
        ? ` ${dateFmt.format(new Date(take.completed_at))}`
        : ''
    }. ${take.line_count} bottles counted, £${
      take.variance_total_value != null
        ? Math.abs(take.variance_total_value).toFixed(2)
        : '0.00'
    } of variance.`;
  }
  return 'Cancelled. Nothing was committed to cellar stock.';
}
