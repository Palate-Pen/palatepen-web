import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import {
  getInvoicesList,
  type InvoiceListRow,
  type InvoiceListStatus,
} from '@/lib/invoices';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';

export const metadata = { title: 'Invoices — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});

const gbp2 = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
});

export default async function InvoicesListPage() {
  const ctx = await getShellContext();
  const list = await getInvoicesList(ctx.siteId);

  const flaggedCount = list.awaiting.filter(
    (r) => r.status === 'flagged',
  ).length;
  const scannedCount = list.awaiting.filter(
    (r) => r.status === 'scanned',
  ).length;

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="flex justify-between items-start gap-8 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            The Walk-in
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
            <em className="text-gold font-semibold not-italic">Invoices</em>
          </h1>
          <p className="font-serif italic text-lg text-muted mt-3">
            {subtitle(list.awaiting.length, flaggedCount)}
          </p>
        </div>

        <Link
          href="/stock-suppliers/invoices/scan"
          className="bg-gold text-paper border border-gold px-6 py-4 min-w-[200px] flex items-center gap-3.5 cursor-pointer transition-all hover:bg-gold-dark hover:-translate-y-px"
        >
          <div className="w-9 h-9 border border-paper/40 rounded-sm flex items-center justify-center text-paper flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h3l1.5-2h7L17 7h3v12H4V7z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          </div>
          <div>
            <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-paper leading-tight">
              Scan an invoice
            </div>
            <div className="font-serif italic text-xs text-paper/80 mt-0.5">
              photo or PDF · 5 seconds
            </div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Awaiting Review"
          value={String(list.awaiting.length)}
          sub={
            list.awaiting.length === 0
              ? 'nothing pending'
              : `${gbp.format(list.awaiting_value)} pending`
          }
          tone={list.awaiting.length > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Flagged"
          value={String(flaggedCount)}
          sub={
            flaggedCount === 0
              ? 'nothing flagged'
              : `${gbp.format(list.awaiting_flagged_value)} in dispute`
          }
          tone={flaggedCount > 0 ? 'urgent' : undefined}
        />
        <KpiCard
          label="Scanned"
          value={String(scannedCount)}
          sub={scannedCount === 0 ? 'nothing scanned' : 'ready to confirm'}
        />
        <KpiCard
          label="Recent (30d)"
          value={String(list.recent.length)}
          sub={list.recent.length === 0 ? 'no activity' : 'banked & rejected'}
        />
      </div>

      <section className="mt-12">
        <SectionHead
          title="Awaiting Your Review"
          meta={
            list.awaiting.length === 0
              ? 'all caught up'
              : `${list.awaiting.length} to deal with`
          }
        />
        {list.awaiting.length === 0 ? (
          <EmptyState
            title="Inbox empty"
            body="Nothing waiting for your eyes. Scan an invoice and the lines land here for review."
            cta
          />
        ) : (
          <InvoiceTable rows={list.awaiting} />
        )}
      </section>

      <section className="mt-12">
        <SectionHead
          title="Recent Activity"
          meta={
            list.recent.length === 0
              ? 'last 30 days'
              : `${list.recent.length} in last 30 days`
          }
        />
        {list.recent.length === 0 ? (
          <EmptyState
            title="No recent activity"
            body="Confirmed and rejected invoices from the last 30 days show up here."
          />
        ) : (
          <InvoiceTable rows={list.recent} muted />
        )}
      </section>
    </div>
  );
}

function subtitle(awaitingCount: number, flaggedCount: number): string {
  if (awaitingCount === 0) {
    return 'All clear. Nothing waiting for review.';
  }
  if (flaggedCount > 0) {
    return `${awaitingCount} ${awaitingCount === 1 ? 'invoice' : 'invoices'} awaiting review, ${flaggedCount} flagged for discrepancy.`;
  }
  return `${awaitingCount} ${awaitingCount === 1 ? 'invoice' : 'invoices'} waiting to be banked.`;
}

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: boolean;
}) {
  return (
    <div className="bg-card border border-rule px-10 py-12 text-center">
      <div className="font-display text-xs font-semibold tracking-[0.4em] uppercase text-muted mb-3">
        {title}
      </div>
      <p className="font-serif italic text-muted max-w-md mx-auto">{body}</p>
      {cta && (
        <Link
          href="/stock-suppliers/invoices/scan"
          className="inline-block mt-6 font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors"
        >
          Scan an invoice →
        </Link>
      )}
    </div>
  );
}

function InvoiceTable({
  rows,
  muted,
}: {
  rows: InvoiceListRow[];
  muted?: boolean;
}) {
  return (
    <div className="bg-card border border-rule">
      <div className="hidden md:grid grid-cols-[2fr_1fr_90px_110px_110px_90px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
        {['Supplier', 'Issued', 'Lines', 'Match', 'Total', 'Status'].map(
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
      {rows.map((r, i) => (
        <InvoiceRow
          key={r.id}
          row={r}
          last={i === rows.length - 1}
          muted={muted}
        />
      ))}
    </div>
  );
}

function InvoiceRow({
  row,
  last,
  muted,
}: {
  row: InvoiceListRow;
  last: boolean;
  muted?: boolean;
}) {
  const issued = row.issued_at ?? row.received_at;
  const matchPct =
    row.line_count > 0
      ? Math.round((row.matched_count / row.line_count) * 100)
      : 0;
  return (
    <Link
      href={`/stock-suppliers/invoices/${row.id}`}
      className={
        'grid grid-cols-1 md:grid-cols-[2fr_1fr_90px_110px_110px_90px] gap-4 px-7 py-4 items-center hover:bg-paper-warm transition-colors' +
        (last ? '' : ' border-b border-rule-soft') +
        (muted ? ' opacity-75' : '')
      }
    >
      <div>
        <div className="font-serif font-semibold text-base text-ink flex items-center gap-2 flex-wrap">
          {row.supplier_name ?? 'Unknown supplier'}
          {row.source === 'email' && (
            <span
              title="Forwarded from supplier email"
              className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-1.5 py-0.5 bg-gold-bg text-gold-dark border border-gold/40"
            >
              ✉ Email
            </span>
          )}
        </div>
        {row.invoice_number && (
          <div className="font-serif italic text-xs text-muted mt-0.5">
            #{row.invoice_number}
          </div>
        )}
      </div>
      <div className="font-serif text-sm text-ink">
        {dateFmt.format(new Date(issued))}
      </div>
      <div className="font-serif text-sm text-ink">
        {row.line_count}
        {row.flagged_count > 0 && (
          <span className="font-serif italic text-xs text-attention ml-1.5">
            ⚑ {row.flagged_count}
          </span>
        )}
      </div>
      <div className="font-serif text-sm text-ink">
        {row.line_count === 0 ? (
          '—'
        ) : (
          <span
            className={
              matchPct === 100
                ? 'text-healthy'
                : matchPct >= 60
                  ? 'text-ink'
                  : 'text-attention'
            }
          >
            {row.matched_count}/{row.line_count}
          </span>
        )}
      </div>
      <div className="font-serif font-semibold text-sm text-ink">
        {row.total != null ? gbp2.format(row.total) : '—'}
      </div>
      <div>
        <StatusPill status={row.status} />
      </div>
    </Link>
  );
}

function StatusPill({ status }: { status: InvoiceListStatus }) {
  const map: Record<
    InvoiceListStatus,
    { label: string; classes: string }
  > = {
    draft: {
      label: 'Draft',
      classes: 'text-muted bg-paper-warm border-rule',
    },
    scanned: {
      label: 'Awaiting',
      classes: 'text-gold bg-gold-bg border-gold/40',
    },
    flagged: {
      label: 'Flagged',
      classes: 'text-attention bg-attention/10 border-attention/40',
    },
    confirmed: {
      label: 'Banked',
      classes: 'text-healthy bg-healthy/10 border-healthy/40',
    },
    rejected: {
      label: 'Rejected',
      classes: 'text-urgent bg-urgent/10 border-urgent/40',
    },
  };
  const { label, classes } = map[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 border font-display font-semibold text-[11px] tracking-[0.18em] uppercase rounded-sm ${classes}`}
    >
      {label}
    </span>
  );
}
