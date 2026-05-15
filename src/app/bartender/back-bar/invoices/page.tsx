import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getInvoicesList, type InvoiceListRow } from '@/lib/invoices';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { PrintButton } from '@/components/shell/PrintButton';

export const metadata = { title: 'Invoices — Bar — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});
const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
});

export default async function BarInvoicesPage() {
  const ctx = await getShellContext();
  const data = await getInvoicesList(ctx.siteId);

  return (
    <div className="printable px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="flex justify-between items-start gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            Back Bar · Invoices
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
            <em className="text-gold font-semibold not-italic">Paperwork</em>
          </h1>
          <p className="font-serif italic text-lg text-muted mt-3">
            Every invoice scanned, confirmed, flagged — across the whole site. The bar's share is in here.
          </p>
        </div>
        <div className="print-hide">
          {(data.awaiting.length + data.recent.length) > 0 && (
            <PrintButton label="Print invoice register" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Awaiting"
          value={String(data.awaiting.length)}
          sub="need confirmation"
          tone={data.awaiting.length > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Awaiting Value"
          value={gbp.format(data.awaiting_value)}
          sub="sitting open"
        />
        <KpiCard
          label="Flagged Value"
          value={gbp.format(data.awaiting_flagged_value)}
          sub="discrepancies"
          tone={data.awaiting_flagged_value > 0 ? 'urgent' : undefined}
        />
        <KpiCard
          label="Recent · 90d"
          value={String(data.recent.length)}
          sub="processed"
        />
      </div>

      {data.awaiting.length > 0 && (
        <section className="mb-10">
          <SectionHead title="Awaiting" meta="needs your eye" />
          <InvoiceTable rows={data.awaiting} />
        </section>
      )}

      <section className="mb-10">
        <SectionHead title="Recent" meta={`${data.recent.length} in last 90 days`} />
        {data.recent.length === 0 ? (
          <div className="bg-card border border-rule px-10 py-16 text-center">
            <p className="font-serif italic text-muted">
              No invoices processed yet. Scan one from chef Back Bar.
            </p>
          </div>
        ) : (
          <InvoiceTable rows={data.recent.slice(0, 30)} />
        )}
      </section>

      <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-5">
        <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold mb-2">
          Scan a new invoice
        </div>
        <p className="font-serif italic text-sm text-ink-soft leading-relaxed">
          Scanning happens once for both kitchen and bar — drop a PDF or photo on chef Back Bar → Invoices and Claude reads the line items. Bar-relevant ones populate this surface automatically.
        </p>
        <Link
          href="/stock-suppliers/invoices/scan"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold hover:text-gold-dark transition-colors mt-3 inline-block"
        >
          Open scan tool →
        </Link>
      </div>
    </div>
  );
}

function InvoiceTable({ rows }: { rows: InvoiceListRow[] }) {
  return (
    <div className="bg-card border border-rule">
      <div className="hidden md:grid grid-cols-[110px_2fr_120px_120px_110px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
        {['Received', 'Supplier · #', 'Total', 'Status', 'Lines'].map((h) => (
          <div key={h} className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted">
            {h}
          </div>
        ))}
      </div>
      {rows.map((inv, i) => {
        const tone =
          inv.status === 'confirmed'
            ? 'text-healthy'
            : inv.status === 'flagged'
              ? 'text-urgent'
              : inv.status === 'rejected'
                ? 'text-urgent'
                : 'text-attention';
        return (
          <Link
            key={inv.id}
            href={`/stock-suppliers/invoices/${inv.id}`}
            className={
              'grid grid-cols-1 md:grid-cols-[110px_2fr_120px_120px_110px] gap-4 px-7 py-4 items-center transition-colors hover:bg-paper-warm ' +
              (i === rows.length - 1 ? '' : 'border-b border-rule-soft')
            }
          >
            <div className="font-serif text-sm text-muted">
              {dateFmt.format(new Date(inv.received_at))}
            </div>
            <div>
              <div className="font-serif font-semibold text-base text-ink">
                {inv.supplier_name ?? 'Unknown supplier'}
              </div>
              {inv.invoice_number && (
                <div className="font-serif italic text-xs text-muted mt-0.5">
                  #{inv.invoice_number}
                </div>
              )}
            </div>
            <div className="font-serif font-semibold text-sm text-ink">
              {inv.total != null ? gbp.format(inv.total) : '—'}
            </div>
            <div className={`font-display font-semibold text-xs tracking-[0.08em] uppercase ${tone}`}>
              {inv.status}
              {inv.flagged_count > 0 && ` · ${inv.flagged_count}`}
            </div>
            <div className="font-serif text-sm text-muted">
              {inv.line_count} · {inv.matched_count} matched
            </div>
          </Link>
        );
      })}
    </div>
  );
}
