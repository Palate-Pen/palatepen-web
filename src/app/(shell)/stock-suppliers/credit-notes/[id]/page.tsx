import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCreditNote, CREDIT_NOTE_STATUS_LABEL } from '@/lib/credit-notes';
import { CreditNoteEditor } from './CreditNoteEditor';
import { CreditNoteStateBar } from './CreditNoteStateBar';
import { PrintButton } from '@/components/shell/PrintButton';

export const metadata = { title: 'Credit Note — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default async function CreditNoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const cn = await getCreditNote(id);
  if (!cn) notFound();

  return (
    <div className="printable px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1100px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Stock & Suppliers · Credit Note
      </div>

      <div className="flex justify-between items-start gap-6 flex-wrap mb-3">
        <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
          {cn.supplier_name ?? 'Credit Note'}
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted">
            {cn.reference}
          </div>
          <div className="print-hide">
            <PrintButton label="Print credit note" />
          </div>
        </div>
      </div>

      <p className="font-serif italic text-lg text-muted mb-8">
        {subtitle(cn)}
      </p>

      {sp?.sent === '1' && (
        <div className="mb-8 bg-card border border-l-4 border-l-attention border-rule px-5 py-4">
          <div className="font-display text-xs font-semibold tracking-[0.3em] uppercase text-attention mb-1">
            Marked Sent
          </div>
          <div className="font-serif italic text-sm text-ink-soft">
            Status moved to Sent. Mark resolved when the supplier credits the
            account.
          </div>
        </div>
      )}

      <CreditNoteStateBar
        creditNoteId={cn.id}
        status={cn.status}
        reference={cn.reference}
        supplierName={cn.supplier_name ?? 'supplier'}
        sourceInvoiceId={cn.source_invoice_id}
        invoiceNumber={cn.invoice_number}
        total={cn.total}
        lines={cn.lines.map((l) => ({
          raw_name: l.raw_name,
          qty: l.qty,
          qty_unit: l.qty_unit,
          unit_price: l.unit_price,
          line_total: l.line_total,
          reason: l.reason,
          note: l.note,
        }))}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mt-8 mb-10">
        <KpiTile
          label="Status"
          value={CREDIT_NOTE_STATUS_LABEL[cn.status]}
          tone={statusTone(cn.status)}
        />
        <KpiTile label="Total Claim" value={gbp.format(cn.total)} />
        <KpiTile
          label="Lines"
          value={String(cn.lines.length)}
          sub={cn.invoice_number ? `against #${cn.invoice_number}` : ''}
        />
        <KpiTile
          label="Created"
          value={dateFmt.format(new Date(cn.created_at))}
          sub={
            cn.sent_at
              ? `sent ${dateFmt.format(new Date(cn.sent_at))}`
              : cn.resolved_at
                ? `resolved ${dateFmt.format(new Date(cn.resolved_at))}`
                : 'not yet sent'
          }
        />
      </div>

      <CreditNoteEditor
        creditNoteId={cn.id}
        status={cn.status}
        initialNotes={cn.notes ?? ''}
        initialLines={cn.lines}
      />

      <div className="mt-10 flex items-center gap-3">
        <Link
          href="/stock-suppliers/credit-notes"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
        >
          ← Back to credit notes
        </Link>
        {cn.source_invoice_id && (
          <Link
            href={`/stock-suppliers/invoices/${cn.source_invoice_id}`}
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
          >
            View source invoice →
          </Link>
        )}
      </div>
    </div>
  );
}

function subtitle(cn: Awaited<ReturnType<typeof getCreditNote>>): string {
  if (!cn) return '';
  const invRef = cn.invoice_number
    ? `invoice #${cn.invoice_number}`
    : 'a flagged invoice';
  switch (cn.status) {
    case 'draft':
      return `Drafted against ${invRef}. Review the lines, edit if needed, then send to the supplier.`;
    case 'sent':
      return `Sent to the supplier. Waiting on their credit to land.`;
    case 'resolved':
      return `Supplier credited the account. ${gbp.format(cn.total)} recovered.`;
    case 'cancelled':
      return `Cancelled. No credit was claimed against ${invRef}.`;
  }
}

type KpiTone = 'healthy' | 'attention' | 'urgent' | undefined;
function statusTone(s: 'draft' | 'sent' | 'resolved' | 'cancelled'): KpiTone {
  if (s === 'resolved') return 'healthy';
  if (s === 'sent') return 'attention';
  if (s === 'cancelled') return undefined;
  return 'attention';
}

function KpiTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: KpiTone;
}) {
  const valueColor =
    tone === 'healthy'
      ? 'text-healthy'
      : tone === 'attention'
        ? 'text-attention'
        : tone === 'urgent'
          ? 'text-urgent'
          : 'text-ink';
  return (
    <div className="bg-card px-7 py-6">
      <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-muted mb-3">
        {label}
      </div>
      <div
        className={`font-serif font-medium text-2xl leading-none ${valueColor}`}
      >
        {value}
      </div>
      {sub && (
        <div className="font-serif italic text-sm text-muted mt-2">{sub}</div>
      )}
    </div>
  );
}
