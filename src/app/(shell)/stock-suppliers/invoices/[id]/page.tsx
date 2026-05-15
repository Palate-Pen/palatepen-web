import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getShellContext } from '@/lib/shell/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { confirmInvoiceAction, rejectInvoiceAction } from './actions';
import { FlagLineButton } from './FlagLineButton';
import { createCreditNoteFromInvoiceAction } from '../../credit-notes/actions';
import {
  getCreditNoteForInvoice,
  CREDIT_NOTE_STATUS_LABEL,
} from '@/lib/credit-notes';
import { PrintButton } from '@/components/shell/PrintButton';

export const metadata = { title: 'Invoice — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});
const qtyFmt = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 3 });
const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

type InvoiceRow = {
  id: string;
  site_id: string;
  supplier_id: string | null;
  delivery_id: string | null;
  invoice_number: string | null;
  issued_at: string | null;
  received_at: string;
  subtotal: number | null;
  vat: number | null;
  total: number | null;
  status: 'draft' | 'scanned' | 'confirmed' | 'flagged' | 'rejected';
  source: string;
  delivery_confirmation: string;
  notes: string | null;
};

type LineRow = {
  id: string;
  ingredient_id: string | null;
  raw_name: string;
  qty: number;
  qty_unit: string;
  unit_price: number;
  line_total: number | null;
  vat_rate: number | null;
  discrepancy_qty: number | null;
  discrepancy_note: string | null;
  position: number;
  ingredients: { name: string; current_price: number | null } | null;
};

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ confirmed?: string; error?: string }>;
}) {
  const [{ id: invoiceId }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const ctx = await getShellContext();
  const supabase = await createSupabaseServerClient();

  const { data: invoiceRaw } = await supabase
    .from('invoices')
    .select(
      'id, site_id, supplier_id, delivery_id, invoice_number, issued_at, received_at, subtotal, vat, total, status, source, delivery_confirmation, notes',
    )
    .eq('id', invoiceId)
    .single();
  if (!invoiceRaw) notFound();
  const invoice = invoiceRaw as unknown as InvoiceRow;

  const [{ data: linesRaw }, supplierRes] = await Promise.all([
    supabase
      .from('invoice_lines')
      .select(
        'id, ingredient_id, raw_name, qty, qty_unit, unit_price, line_total, vat_rate, discrepancy_qty, discrepancy_note, position, ingredients:ingredient_id (name, current_price)',
      )
      .eq('invoice_id', invoiceId)
      .order('position', { ascending: true }),
    invoice.supplier_id
      ? supabase
          .from('suppliers')
          .select('id, name')
          .eq('id', invoice.supplier_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);
  const lines = (linesRaw ?? []) as unknown as LineRow[];
  const supplierName =
    (supplierRes.data as { name?: string } | null)?.name ?? null;

  const computedTotal =
    invoice.total ??
    lines.reduce((s, l) => s + (l.line_total ?? l.qty * l.unit_price), 0);
  const matchedCount = lines.filter((l) => l.ingredient_id != null).length;
  const flaggedCount = lines.filter(
    (l) =>
      (l.discrepancy_qty != null && l.discrepancy_qty !== 0) ||
      (l.discrepancy_note != null && l.discrepancy_note !== ''),
  ).length;

  const isReviewable =
    invoice.status === 'scanned' || invoice.status === 'flagged';
  const justConfirmed = resolvedSearchParams?.confirmed === '1';
  void ctx;

  const existingCreditNote =
    invoice.status === 'flagged' || flaggedCount > 0
      ? await getCreditNoteForInvoice(invoice.id)
      : null;

  return (
    <div className="printable px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1200px] mx-auto">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            The Walk-in · Invoice
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
            {supplierName ? supplierName : 'Invoice'}
            {invoice.invoice_number && (
              <span className="text-muted text-2xl ml-3 font-medium normal-case tracking-[0.02em]">
                #{invoice.invoice_number}
              </span>
            )}
          </h1>
          <p className="font-serif italic text-lg text-muted mt-3">
            {subtitleFor(invoice, lines.length, matchedCount, flaggedCount)}
          </p>
        </div>
        <div className="print-hide">
          <PrintButton label="Print invoice" />
        </div>
      </div>

      {justConfirmed && (
        <div className="mb-8 bg-card border border-l-4 border-l-healthy border-rule px-5 py-4">
          <div className="font-display text-xs font-semibold tracking-[0.3em] uppercase text-healthy mb-1">
            Confirmed
          </div>
          <div className="font-serif italic text-sm text-ink-soft">
            {matchedCount} {matchedCount === 1 ? 'price' : 'prices'} banked. Every recipe using those ingredients just picked up the new cost.
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiTile
          label="Status"
          value={statusLabel(invoice.status)}
          tone={statusTone(invoice.status)}
        />
        <KpiTile
          label="Total"
          value={gbp.format(computedTotal)}
          sub={
            invoice.vat != null && invoice.vat > 0
              ? `inc. ${gbp.format(invoice.vat)} VAT`
              : 'net'
          }
        />
        <KpiTile
          label="Lines"
          value={String(lines.length)}
          sub={`${matchedCount} matched to Bank`}
        />
        <KpiTile
          label={invoice.issued_at ? 'Issued' : 'Received'}
          value={dateFmt.format(
            new Date(invoice.issued_at ?? invoice.received_at),
          )}
          sub={
            invoice.issued_at && invoice.issued_at !== invoice.received_at
              ? `received ${dateFmt.format(new Date(invoice.received_at))}`
              : invoice.source
          }
        />
      </div>

      <div className="bg-card border border-rule mb-10">
        <div className="hidden md:grid grid-cols-[2fr_90px_100px_100px_100px_60px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
          {['Line', 'Qty', 'Unit price', 'Line total', 'Bank match', 'Flag'].map(
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

        {lines.length === 0 ? (
          <div className="px-10 py-12 text-center">
            <p className="font-serif italic text-muted">
              No lines extracted.
            </p>
          </div>
        ) : (
          lines.map((l, i) => (
            <LineRow
              key={l.id}
              line={l}
              last={i === lines.length - 1}
              invoiceId={invoice.id}
              invoiceStatus={invoice.status}
            />
          ))
        )}
      </div>

      {flaggedCount > 0 && (
        <CreditNotePrompt
          flaggedCount={flaggedCount}
          existing={existingCreditNote}
          invoiceId={invoice.id}
        />
      )}

      {isReviewable ? (
        <ReviewActions invoiceId={invoice.id} />
      ) : (
        <div className="flex items-center gap-3">
          <Link
            href="/stock-suppliers"
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
          >
            ← Back to The Walk-in
          </Link>
        </div>
      )}
    </div>
  );
}

function CreditNotePrompt({
  flaggedCount,
  existing,
  invoiceId,
}: {
  flaggedCount: number;
  existing: {
    id: string;
    status: 'draft' | 'sent' | 'resolved' | 'cancelled';
    reference: string;
  } | null;
  invoiceId: string;
}) {
  if (existing) {
    return (
      <div className="mb-8 bg-card border border-l-4 border-l-attention border-rule px-5 py-4 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="font-display text-xs font-semibold tracking-[0.3em] uppercase text-attention mb-1">
            Credit note {CREDIT_NOTE_STATUS_LABEL[existing.status]}
          </div>
          <div className="font-serif italic text-sm text-ink-soft">
            {existing.reference} — raised against this invoice.
          </div>
        </div>
        <Link
          href={`/stock-suppliers/credit-notes/${existing.id}`}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-transparent text-attention border border-attention/40 hover:bg-attention/10 transition-colors"
        >
          Open credit note →
        </Link>
      </div>
    );
  }
  return (
    <div className="mb-8 bg-card border border-l-4 border-l-attention border-rule px-5 py-4 flex flex-wrap items-center gap-4">
      <div className="flex-1 min-w-[200px]">
        <div className="font-display text-xs font-semibold tracking-[0.3em] uppercase text-attention mb-1">
          {flaggedCount} {flaggedCount === 1 ? 'line' : 'lines'} flagged
        </div>
        <div className="font-serif italic text-sm text-ink-soft">
          Draft a credit note to claim back from the supplier. The flagged
          lines auto-fill — review and send.
        </div>
      </div>
      <form action={createCreditNoteFromInvoiceAction.bind(null, invoiceId)}>
        <button
          type="submit"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-attention text-paper border border-attention hover:bg-attention/90 transition-colors"
        >
          Draft credit note →
        </button>
      </form>
    </div>
  );
}

function subtitleFor(
  invoice: InvoiceRow,
  lineCount: number,
  matched: number,
  flagged: number,
): string {
  const issued = invoice.issued_at
    ? dateFmt.format(new Date(invoice.issued_at))
    : null;
  switch (invoice.status) {
    case 'scanned':
      return `${lineCount} ${lineCount === 1 ? 'line' : 'lines'} extracted${
        issued ? `, dated ${issued}` : ''
      }. ${matched} matched to The Bank. Review and confirm to bank the prices.`;
    case 'flagged':
      return `${lineCount} ${lineCount === 1 ? 'line' : 'lines'}${
        issued ? `, ${issued}` : ''
      }. ${flagged} flagged for discrepancy — confirm what's real and the rest banks.`;
    case 'confirmed':
      return `Confirmed${issued ? ` on ${issued}` : ''}. ${matched} ${
        matched === 1 ? 'price' : 'prices'
      } banked.`;
    case 'rejected':
      return 'Rejected. Not banked.';
    default:
      return `Draft — ${lineCount} ${lineCount === 1 ? 'line' : 'lines'} pending.`;
  }
}

function statusLabel(s: InvoiceRow['status']): string {
  switch (s) {
    case 'draft':
      return 'Draft';
    case 'scanned':
      return 'Awaiting';
    case 'confirmed':
      return 'Banked';
    case 'flagged':
      return 'Flagged';
    case 'rejected':
      return 'Rejected';
  }
}

function statusTone(s: InvoiceRow['status']): KpiTone {
  if (s === 'confirmed') return 'healthy';
  if (s === 'flagged') return 'attention';
  if (s === 'rejected') return 'urgent';
  return undefined;
}

type KpiTone = 'healthy' | 'attention' | 'urgent' | undefined;

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

function LineRow({
  line,
  last,
  invoiceId,
  invoiceStatus,
}: {
  line: LineRow;
  last: boolean;
  invoiceId: string;
  invoiceStatus: InvoiceRow['status'];
}) {
  const matched = line.ingredient_id != null;
  const flagged =
    (line.discrepancy_qty != null && line.discrepancy_qty !== 0) ||
    (line.discrepancy_note != null && line.discrepancy_note !== '');
  const lineTotal =
    line.line_total != null ? line.line_total : line.qty * line.unit_price;
  return (
    <div
      className={
        'grid grid-cols-1 md:grid-cols-[2fr_90px_100px_100px_100px_60px] gap-4 px-7 py-4 items-center' +
        (last ? '' : ' border-b border-rule-soft')
      }
    >
      <div>
        <div className="font-serif font-semibold text-base text-ink">
          {line.raw_name}
        </div>
        {matched && line.ingredients?.name && line.ingredients.name !== line.raw_name && (
          <div className="font-serif italic text-xs text-muted mt-0.5">
            matched to {line.ingredients.name}
          </div>
        )}
        {flagged && line.discrepancy_note && (
          <div className="font-serif italic text-xs text-attention mt-0.5">
            ⚑ {line.discrepancy_note}
          </div>
        )}
      </div>
      <div className="font-serif text-sm text-ink">
        {qtyFmt.format(line.qty)} {line.qty_unit}
      </div>
      <div className="font-serif text-sm text-ink">
        {gbp.format(line.unit_price)}
      </div>
      <div className="font-serif font-semibold text-sm text-ink">
        {gbp.format(lineTotal)}
      </div>
      <div>
        {matched ? (
          <span className="inline-flex items-center gap-1.5 font-display text-xs font-semibold tracking-[0.18em] uppercase text-healthy">
            <span className="w-1.5 h-1.5 rounded-full bg-healthy" />
            Linked
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-display text-xs font-semibold tracking-[0.18em] uppercase text-muted-soft">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-soft" />
            Unmatched
          </span>
        )}
      </div>
      <div>
        <FlagLineButton
          invoiceId={invoiceId}
          lineId={line.id}
          initialQtyShort={line.discrepancy_qty ?? null}
          initialNote={line.discrepancy_note ?? null}
          disabled={invoiceStatus === 'confirmed' || invoiceStatus === 'rejected'}
        />
      </div>
    </div>
  );
}

function ReviewActions({ invoiceId }: { invoiceId: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <form action={confirmInvoiceAction.bind(null, invoiceId)}>
        <button
          type="submit"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors"
        >
          Confirm &amp; bank prices
        </button>
      </form>
      <form action={rejectInvoiceAction.bind(null, invoiceId)}>
        <button
          type="submit"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-transparent text-urgent border border-urgent/40 hover:bg-urgent/10 transition-colors"
        >
          Reject
        </button>
      </form>
      <Link
        href="/stock-suppliers"
        className="ml-auto font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
      >
        ← Back to The Walk-in
      </Link>
    </div>
  );
}
