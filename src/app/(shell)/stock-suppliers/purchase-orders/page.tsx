import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import {
  listPurchaseOrders,
  getReorderSuggestionsBySupplier,
  PO_STATUS_LABEL,
  type PurchaseOrderRow,
  type PurchaseOrderStatus,
} from '@/lib/purchase-orders';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { PrintButton } from '@/components/shell/PrintButton';
import { DraftPOFromSupplierButton } from './DraftPOFromSupplierButton';

export const metadata = { title: 'Purchase Orders — The Walk-in — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});
const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
});

const STATUS_TONE: Record<
  PurchaseOrderStatus,
  'healthy' | 'attention' | 'urgent' | undefined
> = {
  draft: 'attention',
  sent: undefined,
  confirmed: undefined,
  received: 'healthy',
  cancelled: undefined,
};

export default async function PurchaseOrdersPage() {
  const ctx = await getShellContext();
  const [orders, suggestions] = await Promise.all([
    listPurchaseOrders(ctx.siteId),
    getReorderSuggestionsBySupplier(ctx.siteId),
  ]);

  const drafts = orders.filter((o) => o.status === 'draft');
  const sent = orders.filter(
    (o) => o.status === 'sent' || o.status === 'confirmed',
  );
  const received = orders.filter((o) => o.status === 'received');
  const openValue = [...drafts, ...sent].reduce((s, o) => s + o.total, 0);

  return (
    <div className="printable px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-start gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            The Walk-in · Purchase Orders
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
            <em className="text-gold font-semibold not-italic">Orders</em> Out
          </h1>
          <p className="font-serif italic text-lg text-muted mt-3">
            {subtitle(orders, suggestions.reduce((s, x) => s + x.rows.length, 0))}
          </p>
        </div>
        <div className="print-hide">
          {orders.length > 0 && <PrintButton label="Print PO log" />}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Drafts"
          value={String(drafts.length)}
          sub={drafts.length === 0 ? 'all sent' : 'awaiting send'}
          tone={drafts.length > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="In Flight"
          value={String(sent.length)}
          sub={sent.length === 0 ? 'nothing sent' : 'sent / confirmed'}
        />
        <KpiCard
          label="Open Value"
          value={gbp.format(openValue)}
          sub="drafts + sent total"
        />
        <KpiCard
          label="Items Below Par"
          value={String(
            suggestions.reduce((s, x) => s + x.rows.length, 0),
          )}
          sub={
            suggestions.length === 0
              ? 'no reorders suggested'
              : `${suggestions.length} suppliers`
          }
          tone={suggestions.length > 0 ? 'urgent' : 'healthy'}
        />
      </div>

      {suggestions.length > 0 && (
        <section className="mb-12">
          <SectionHead
            title="Reorder Suggestions"
            meta={`${suggestions.length} ${suggestions.length === 1 ? 'supplier' : 'suppliers'} with items below par`}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suggestions.map((s) => (
              <div
                key={s.supplier_id}
                className="bg-card border border-rule border-l-4 border-l-attention px-7 py-6 flex flex-col gap-3"
              >
                <div>
                  <div className="font-serif font-semibold text-lg text-ink">
                    {s.supplier_name}
                  </div>
                  <div className="font-serif italic text-sm text-muted mt-1">
                    {s.rows.length}{' '}
                    {s.rows.length === 1 ? 'item' : 'items'} below par
                    {s.estimated_value > 0
                      ? ` · est. ${gbp.format(s.estimated_value)}`
                      : ''}
                  </div>
                </div>
                <ul className="font-serif text-sm text-ink-soft flex-1">
                  {s.rows.slice(0, 4).map((r) => (
                    <li key={r.ingredient_id} className="py-0.5">
                      · {r.name}{' '}
                      <span className="font-serif italic text-xs text-muted">
                        ({r.current_stock ?? 0} / {r.par_level ?? '—'})
                      </span>
                    </li>
                  ))}
                  {s.rows.length > 4 && (
                    <li className="font-serif italic text-xs text-muted-soft py-0.5">
                      + {s.rows.length - 4} more
                    </li>
                  )}
                </ul>
                <div className="pt-2 mt-auto border-t border-rule-soft print-hide">
                  <DraftPOFromSupplierButton supplierId={s.supplier_id} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {drafts.length > 0 && (
        <section className="mb-10">
          <SectionHead title="Drafts" meta={`${drafts.length} ready to send`} />
          <PoTable rows={drafts} />
        </section>
      )}

      {sent.length > 0 && (
        <section className="mb-10">
          <SectionHead
            title="In Flight"
            meta={`${sent.length} sent or confirmed`}
          />
          <PoTable rows={sent} />
        </section>
      )}

      {received.length > 0 && (
        <section className="mb-10">
          <SectionHead title="Received" meta={`${received.length} closed`} />
          <PoTable rows={received.slice(0, 20)} />
        </section>
      )}

      {orders.length === 0 && suggestions.length === 0 && (
        <div className="bg-card border border-rule px-10 py-16 text-center">
          <div className="font-serif text-2xl text-ink mb-2">
            Nothing on order.
          </div>
          <p className="font-serif italic text-muted">
            When something on The Bank drops below par, it'll show up here as
            a reorder suggestion. You can also draft a blank PO from a
            supplier's detail page.
          </p>
        </div>
      )}
    </div>
  );
}

function subtitle(orders: PurchaseOrderRow[], breachCount: number): string {
  if (orders.length === 0 && breachCount === 0) {
    return 'Nothing on order, nothing below par. Stock holding steady.';
  }
  const parts: string[] = [];
  if (breachCount > 0) {
    parts.push(
      `${breachCount} ${breachCount === 1 ? 'item' : 'items'} below par`,
    );
  }
  const open = orders.filter(
    (o) => o.status === 'draft' || o.status === 'sent' || o.status === 'confirmed',
  ).length;
  if (open > 0) {
    parts.push(`${open} ${open === 1 ? 'PO' : 'POs'} in flight`);
  }
  return parts.join(' · ') + '.';
}

function PoTable({ rows }: { rows: PurchaseOrderRow[] }) {
  return (
    <div className="bg-card border border-rule">
      <div className="hidden md:grid grid-cols-[120px_2fr_120px_120px_110px_110px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
        {['Reference', 'Supplier', 'Lines', 'Total', 'Status', 'Created'].map(
          (h) => (
            <div
              key={h}
              className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
            >
              {h}
            </div>
          ),
        )}
      </div>
      {rows.map((po, i) => {
        const tone = STATUS_TONE[po.status];
        const toneText =
          tone === 'healthy'
            ? 'text-healthy'
            : tone === 'attention'
              ? 'text-attention'
              : tone === 'urgent'
                ? 'text-urgent'
                : 'text-muted';
        return (
          <Link
            key={po.id}
            href={`/stock-suppliers/purchase-orders/${po.id}`}
            className={
              'grid grid-cols-1 md:grid-cols-[120px_2fr_120px_120px_110px_110px] gap-4 px-7 py-4 items-center transition-colors hover:bg-paper-warm ' +
              (i === rows.length - 1 ? '' : 'border-b border-rule-soft')
            }
          >
            <div className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-muted">
              {po.reference}
            </div>
            <div className="font-serif font-semibold text-base text-ink">
              {po.supplier_name ?? 'Unknown supplier'}
            </div>
            <div className="font-serif text-sm text-muted">
              {po.line_count} {po.line_count === 1 ? 'line' : 'lines'}
            </div>
            <div className="font-serif font-semibold text-sm text-ink">
              {gbp.format(po.total)}
            </div>
            <div
              className={`font-display font-semibold text-xs tracking-[0.08em] uppercase ${toneText}`}
            >
              {PO_STATUS_LABEL[po.status]}
            </div>
            <div className="font-serif italic text-xs text-muted">
              {dateFmt.format(new Date(po.created_at))}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
