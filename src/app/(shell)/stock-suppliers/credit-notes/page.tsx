import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import {
  listCreditNotes,
  CREDIT_NOTE_STATUS_LABEL,
  type CreditNoteRow,
  type CreditNoteStatus,
} from '@/lib/credit-notes';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';

export const metadata = { title: 'Credit Notes — Palatable' };

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

export default async function CreditNotesListPage() {
  const ctx = await getShellContext();
  const rows = await listCreditNotes(ctx.siteId);

  const drafts = rows.filter((r) => r.status === 'draft');
  const sent = rows.filter((r) => r.status === 'sent');
  const open = [...drafts, ...sent];
  const closed = rows.filter(
    (r) => r.status === 'resolved' || r.status === 'cancelled',
  );
  const openValue = open.reduce((s, r) => s + Number(r.total), 0);
  const resolvedValue = rows
    .filter((r) => r.status === 'resolved')
    .reduce((s, r) => s + Number(r.total), 0);

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-start gap-8 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            The Walk-in
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
            <em className="text-gold font-semibold not-italic">Credit Notes</em>
          </h1>
          <p className="font-serif italic text-lg text-muted mt-3">
            {subtitle(drafts.length, sent.length, resolvedValue)}
          </p>
        </div>
        <Link
          href="/stock-suppliers/invoices?filter=flagged"
          className="bg-card border border-rule px-5 py-4 min-w-[240px] flex items-center gap-3.5 cursor-pointer transition-all hover:border-rule-gold hover:-translate-y-px"
        >
          <div className="w-10 h-10 border border-gold rounded-sm flex items-center justify-center text-gold bg-gold-bg flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4v16M4 4l14 4-14 4" />
            </svg>
          </div>
          <div>
            <div className="font-serif font-semibold text-base text-ink leading-tight">
              Find a flagged invoice
            </div>
            <div className="font-serif italic text-xs text-muted mt-0.5">
              Credit notes start from a flagged invoice
            </div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Drafts"
          value={String(drafts.length)}
          sub={drafts.length === 0 ? 'nothing drafted' : 'not yet sent'}
          tone={drafts.length > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Sent"
          value={String(sent.length)}
          sub={
            sent.length === 0
              ? 'nothing in flight'
              : 'awaiting supplier credit'
          }
          tone={sent.length > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Open Value"
          value={gbp.format(openValue)}
          sub="across drafts + sent"
        />
        <KpiCard
          label="Resolved (all-time)"
          value={gbp.format(resolvedValue)}
          sub="credit recovered"
          tone={resolvedValue > 0 ? 'healthy' : undefined}
        />
      </div>

      <section className="mt-12">
        <SectionHead
          title="Open"
          meta={
            open.length === 0
              ? 'nothing in flight'
              : `${open.length} ${open.length === 1 ? 'in flight' : 'in flight'}`
          }
        />
        {open.length === 0 ? (
          <EmptyState
            title="Nothing open"
            body="Credit notes start from a flagged invoice. Flag the lines, then draft a credit note from the invoice page."
          />
        ) : (
          <CreditNoteTable rows={open} />
        )}
      </section>

      <section className="mt-12">
        <SectionHead
          title="Closed"
          meta={
            closed.length === 0
              ? 'nothing yet'
              : `${closed.length} resolved or cancelled`
          }
        />
        {closed.length === 0 ? (
          <EmptyState
            title="No history yet"
            body="Once you mark sent credit notes as resolved (or cancel them), they show up here."
          />
        ) : (
          <CreditNoteTable rows={closed} muted />
        )}
      </section>
    </div>
  );
}

function subtitle(
  draftCount: number,
  sentCount: number,
  resolvedValue: number,
): string {
  if (draftCount === 0 && sentCount === 0) {
    if (resolvedValue > 0) {
      return `All clear. ${gbp.format(resolvedValue)} recovered through credits historically.`;
    }
    return 'No credit notes in flight. Flag lines on an invoice to start one.';
  }
  const parts: string[] = [];
  if (draftCount > 0)
    parts.push(`${draftCount} ${draftCount === 1 ? 'draft' : 'drafts'}`);
  if (sentCount > 0)
    parts.push(`${sentCount} sent waiting on supplier`);
  return parts.join(', ') + '.';
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-card border border-rule px-10 py-12 text-center">
      <div className="font-display text-xs font-semibold tracking-[0.4em] uppercase text-muted mb-3">
        {title}
      </div>
      <p className="font-serif italic text-muted max-w-md mx-auto">{body}</p>
    </div>
  );
}

function CreditNoteTable({
  rows,
  muted,
}: {
  rows: CreditNoteRow[];
  muted?: boolean;
}) {
  return (
    <div className="bg-card border border-rule">
      <div className="hidden md:grid grid-cols-[1.2fr_1.4fr_90px_110px_110px_90px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
        {['Reference', 'Supplier · Invoice', 'Lines', 'Created', 'Total', 'Status'].map(
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
        <CreditNoteListRow
          key={r.id}
          row={r}
          last={i === rows.length - 1}
          muted={muted}
        />
      ))}
    </div>
  );
}

function CreditNoteListRow({
  row,
  last,
  muted,
}: {
  row: CreditNoteRow;
  last: boolean;
  muted?: boolean;
}) {
  return (
    <Link
      href={`/stock-suppliers/credit-notes/${row.id}`}
      className={
        'grid grid-cols-1 md:grid-cols-[1.2fr_1.4fr_90px_110px_110px_90px] gap-4 px-7 py-4 items-center hover:bg-paper-warm transition-colors' +
        (last ? '' : ' border-b border-rule-soft') +
        (muted ? ' opacity-75' : '')
      }
    >
      <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-ink">
        {row.reference}
      </div>
      <div>
        <div className="font-serif font-semibold text-base text-ink">
          {row.supplier_name ?? 'Unknown supplier'}
        </div>
        {row.invoice_number && (
          <div className="font-serif italic text-xs text-muted mt-0.5">
            against invoice #{row.invoice_number}
          </div>
        )}
      </div>
      <div className="font-serif text-sm text-ink">{row.line_count}</div>
      <div className="font-serif text-sm text-ink">
        {dateFmt.format(new Date(row.created_at))}
      </div>
      <div className="font-serif font-semibold text-sm text-ink">
        {gbp2.format(row.total)}
      </div>
      <div>
        <StatusPill status={row.status} />
      </div>
    </Link>
  );
}

function StatusPill({ status }: { status: CreditNoteStatus }) {
  const map: Record<CreditNoteStatus, string> = {
    draft: 'text-gold bg-gold-bg border-gold/40',
    sent: 'text-attention bg-attention/10 border-attention/40',
    resolved: 'text-healthy bg-healthy/10 border-healthy/40',
    cancelled: 'text-muted bg-paper-warm border-rule',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 border font-display font-semibold text-[10px] tracking-[0.18em] uppercase rounded-sm ${map[status]}`}
    >
      {CREDIT_NOTE_STATUS_LABEL[status]}
    </span>
  );
}
