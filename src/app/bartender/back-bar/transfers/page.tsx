import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import {
  listTransfers,
  TRANSFER_STATUS_LABEL,
  TRANSFER_POOL_LABEL,
  type TransferStatus,
} from '@/lib/stock-transfers';
import { SectionHead } from '@/components/shell/SectionHead';
import { KpiCard } from '@/components/shell/KpiCard';

export const metadata = { title: 'Stock Transfers — Back Bar — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});
const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const STATUS_TONE: Record<TransferStatus, 'healthy' | 'attention' | 'urgent' | 'muted'> = {
  draft: 'attention',
  sent: 'attention',
  received: 'healthy',
  cancelled: 'muted',
};

export default async function BarTransfersListPage() {
  const ctx = await getShellContext();
  const rows = await listTransfers(ctx.siteId, 'all');

  const outboundInTransit = rows.filter(
    (r) => r.status === 'sent' && r.source_site_id === ctx.siteId,
  ).length;
  const inboundAwaiting = rows.filter(
    (r) => r.status === 'sent' && r.dest_site_id === ctx.siteId,
  ).length;
  const drafts = rows.filter((r) => r.status === 'draft').length;
  const last30d = rows.filter((r) => {
    const d = new Date(r.created_at);
    return Date.now() - d.getTime() < 30 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            Back Bar · Movement Log
          </div>
          <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] text-ink mb-3">
            <em className="text-gold font-semibold not-italic">Stock</em> Transfers
          </h1>
          <p className="font-serif italic text-lg text-muted">
            Move stock to or from the bar — kitchen, other sites, whoever needs it. Drafted here, decremented on send, credited on receive.
          </p>
        </div>
        <Link
          href="/bartender/back-bar/transfers/new"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-ink text-paper hover:bg-ink-soft transition-colors"
        >
          + New Transfer
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Outbound In Transit"
          value={String(outboundInTransit)}
          sub={outboundInTransit === 0 ? 'nothing on the road' : 'awaiting receive'}
          tone={outboundInTransit > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Inbound Awaiting"
          value={String(inboundAwaiting)}
          sub={inboundAwaiting === 0 ? 'all received' : 'confirm on arrival'}
          tone={inboundAwaiting > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Drafts"
          value={String(drafts)}
          sub={drafts === 0 ? 'no open drafts' : 'awaiting send'}
        />
        <KpiCard
          label="Last 30 Days"
          value={String(last30d)}
          sub="across all states"
        />
      </div>

      <SectionHead
        title="All Transfers"
        meta={rows.length === 0 ? 'none yet' : `${rows.length} on record`}
      />
      {rows.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-12 text-center">
          <p className="font-serif italic text-muted mb-4">
            No transfers on record yet. Drafts start with the New Transfer button — pick where stock is moving from and to, then add lines.
          </p>
          <Link
            href="/bartender/back-bar/transfers/new"
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold hover:text-gold-dark transition-colors"
          >
            Draft the first one →
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-rule">
          <div className="hidden md:grid grid-cols-[120px_1.4fr_1fr_100px_120px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
            {['Reference', 'Route', 'Lines / Value', 'Status', 'Created'].map(
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
          {rows.map((r, i) => {
            const tone = STATUS_TONE[r.status];
            const direction = r.source_site_id === ctx.siteId ? 'out' : 'in';
            return (
              <Link
                key={r.id}
                href={`/bartender/back-bar/transfers/${r.id}`}
                className={
                  'grid grid-cols-1 md:grid-cols-[120px_1.4fr_1fr_100px_120px] gap-4 px-7 py-4 items-center hover:bg-paper-warm transition-colors' +
                  (i < rows.length - 1 ? ' border-b border-rule-soft' : '')
                }
              >
                <div className="font-mono text-xs text-ink">{r.reference}</div>
                <div>
                  <div className="font-serif text-sm text-ink">
                    {r.source_site_name ?? 'Site'} · {TRANSFER_POOL_LABEL[r.source_pool]}
                    <span className="mx-2 text-muted">→</span>
                    {r.dest_site_name ?? 'Site'} · {TRANSFER_POOL_LABEL[r.dest_pool]}
                  </div>
                  <div className="font-serif italic text-xs text-muted mt-0.5">
                    {direction === 'out' ? 'Outbound' : 'Inbound'}
                    {r.source_site_id === r.dest_site_id && ' · intra-site'}
                  </div>
                </div>
                <div className="font-serif text-sm text-ink">
                  {r.line_count} {r.line_count === 1 ? 'line' : 'lines'}
                  {r.total_value > 0 && (
                    <span className="text-muted ml-2">
                      · {gbp.format(r.total_value)}
                    </span>
                  )}
                </div>
                <div
                  className={
                    'font-display font-semibold text-xs tracking-[0.18em] uppercase ' +
                    (tone === 'healthy'
                      ? 'text-healthy'
                      : tone === 'attention'
                        ? 'text-attention'
                        : tone === 'urgent'
                          ? 'text-urgent'
                          : 'text-muted')
                  }
                >
                  {TRANSFER_STATUS_LABEL[r.status]}
                </div>
                <div className="font-serif italic text-xs text-muted">
                  {dateFmt.format(new Date(r.created_at))}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
