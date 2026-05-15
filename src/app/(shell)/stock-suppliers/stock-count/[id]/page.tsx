import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStockTake } from '@/lib/stock-takes';
import { StockCountSession } from '@/components/stock-count/StockCountSession';
import { cancelStockCountAction } from '../actions';

export const metadata = { title: 'Stock Count Session — Palatable' };

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default async function ChefStockCountSessionPage({
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

  const readOnly = take.status !== 'in_progress';

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1300px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Stock & Suppliers · Count Session
      </div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
          {dateFmt.format(new Date(take.conducted_at))} ·{' '}
          <em className="text-gold font-semibold not-italic">
            {take.status === 'in_progress' ? 'In Progress' : take.status === 'completed' ? 'Completed' : 'Cancelled'}
          </em>
        </h1>
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
      <p className="font-serif italic text-lg text-muted mt-1 mb-8">
        {subtitleFor(take, justCompleted)}
      </p>

      <StockCountSession
        detail={take}
        readOnly={readOnly}
        onCompleteRedirect="/stock-suppliers/stock-count"
      />

      <div className="mt-10">
        <Link
          href="/stock-suppliers/stock-count"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
        >
          ← Back to Stock Count
        </Link>
      </div>
    </div>
  );
}

function subtitleFor(
  take: Awaited<ReturnType<typeof getStockTake>>,
  justCompleted: boolean,
): string {
  if (!take) return '';
  if (justCompleted) {
    return 'Count saved. Current stock updated to match the floor count for every counted line.';
  }
  if (take.status === 'in_progress') {
    return 'Tap counted quantities as you walk the shelves. Variance computes live in £.';
  }
  if (take.status === 'completed') {
    return `Completed${
      take.completed_at
        ? ` ${dateFmt.format(new Date(take.completed_at))}`
        : ''
    }. ${take.line_count} lines counted, ${
      take.variance_total_value != null
        ? Math.abs(take.variance_total_value).toFixed(2)
        : '0.00'
    }£ of variance.`;
  }
  return 'Cancelled. Nothing was committed to stock.';
}
