import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getPurchaseOrder,
  PO_STATUS_LABEL,
  type PurchaseOrderStatus,
} from '@/lib/purchase-orders';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getShellContext } from '@/lib/shell/context';
import { SectionHead } from '@/components/shell/SectionHead';
import { PrintButton } from '@/components/shell/PrintButton';
import { PoLineEditor } from './PoLineEditor';
import {
  sendPurchaseOrderAction,
  markConfirmedAction,
  markReceivedAction,
  cancelPurchaseOrderAction,
} from '../actions';

export const metadata = { title: 'Purchase Order — Palatable' };

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

const STATUS_TONE: Record<
  PurchaseOrderStatus,
  'healthy' | 'attention' | 'urgent' | 'muted'
> = {
  draft: 'attention',
  sent: 'muted',
  confirmed: 'muted',
  received: 'healthy',
  cancelled: 'muted',
};

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const po = await getPurchaseOrder(id);
  if (!po) notFound();
  const ctx = await getShellContext();

  // Bank ingredients available for picking on lines
  const supabase = await createSupabaseServerClient();
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name, unit, current_price')
    .eq('site_id', ctx.siteId)
    .order('name', { ascending: true });
  const bankIngredients = (ingredients ?? []).map((i) => ({
    id: i.id as string,
    name: i.name as string,
    unit: (i.unit as string | null) ?? null,
    current_price:
      i.current_price == null ? null : Number(i.current_price),
  }));

  // Supplier email for the mailto: send link
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('email, contact_person')
    .eq('id', po.supplier_id)
    .single();
  const supplierEmail = (supplier?.email as string | null) ?? null;
  const supplierContact = (supplier?.contact_person as string | null) ?? null;

  const tone = STATUS_TONE[po.status];
  const toneText =
    tone === 'healthy'
      ? 'text-healthy'
      : tone === 'attention'
        ? 'text-attention'
        : tone === 'urgent'
          ? 'text-urgent'
          : 'text-muted';

  const isEditable = po.status === 'draft';
  const isSent = po.status === 'sent' || po.status === 'confirmed';

  const mailtoBody = buildEmailBody(po);
  const mailtoSubject = encodeURIComponent(
    `Order ${po.reference} — ${ctx.kitchenName}`,
  );

  return (
    <div className="printable px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        The Walk-in · Purchase Order
      </div>

      <div className="flex justify-between items-start gap-6 flex-wrap mb-3">
        <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
          {po.supplier_name ?? 'Unknown supplier'}
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted">
            {po.reference}
          </div>
          <div className="print-hide">
            <PrintButton label="Print PO" />
          </div>
        </div>
      </div>

      <p className="font-serif italic text-lg text-muted mb-8">
        {subtitle(po)}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiTile label="Status" value={PO_STATUS_LABEL[po.status]} toneText={toneText} />
        <KpiTile label="Lines" value={String(po.line_count)} />
        <KpiTile label="Total (est.)" value={gbp.format(po.total)} />
        <KpiTile
          label={po.received_at ? 'Received' : po.sent_at ? 'Sent' : 'Created'}
          value={dateFmt.format(
            new Date(po.received_at ?? po.sent_at ?? po.created_at),
          )}
          sub={po.expected_at ? `expected ${dateFmt.format(new Date(po.expected_at))}` : undefined}
        />
      </div>

      {/* Action bar — context-sensitive on status */}
      <div className="bg-card border border-rule px-7 py-5 mb-8 flex items-center gap-3 flex-wrap print-hide">
        {po.status === 'draft' && (
          <>
            {supplierEmail ? (
              <a
                href={`mailto:${supplierEmail}?subject=${mailtoSubject}&body=${encodeURIComponent(mailtoBody)}`}
                className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors"
              >
                Compose in mail →
              </a>
            ) : (
              <span className="font-serif italic text-sm text-muted">
                No email on file for this supplier — add one in Suppliers.
              </span>
            )}
            <form action={sendPurchaseOrderAction}>
              <input type="hidden" name="id" value={po.id} />
              <button
                type="submit"
                className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 border border-rule text-ink hover:border-gold hover:text-gold transition-colors"
              >
                Mark as sent
              </button>
            </form>
            <form action={cancelPurchaseOrderAction} className="ml-auto">
              <input type="hidden" name="id" value={po.id} />
              <button
                type="submit"
                className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-3 py-2 text-muted hover:text-urgent transition-colors"
              >
                Cancel draft
              </button>
            </form>
          </>
        )}
        {po.status === 'sent' && (
          <>
            <form action={markConfirmedAction}>
              <input type="hidden" name="id" value={po.id} />
              <button
                type="submit"
                className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 border border-rule text-ink hover:border-gold hover:text-gold transition-colors"
              >
                Mark confirmed
              </button>
            </form>
            <form action={markReceivedAction}>
              <input type="hidden" name="id" value={po.id} />
              <button
                type="submit"
                className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors"
              >
                Mark received
              </button>
            </form>
            <span className="font-serif italic text-sm text-muted ml-auto">
              Sent {po.sent_at ? dateFmt.format(new Date(po.sent_at)) : ''}
            </span>
          </>
        )}
        {po.status === 'confirmed' && (
          <>
            <form action={markReceivedAction}>
              <input type="hidden" name="id" value={po.id} />
              <button
                type="submit"
                className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors"
              >
                Mark received
              </button>
            </form>
            <span className="font-serif italic text-sm text-muted ml-auto">
              Confirmed{' '}
              {po.confirmed_at ? dateFmt.format(new Date(po.confirmed_at)) : ''}
            </span>
          </>
        )}
        {po.status === 'received' && (
          <div className="flex items-center gap-3 w-full justify-between flex-wrap">
            <div>
              <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-healthy mb-1">
                Closed
              </div>
              <p className="font-serif italic text-sm text-ink-soft">
                Received{' '}
                {po.received_at
                  ? dateFmt.format(new Date(po.received_at))
                  : ''}
                . When the invoice scans, line prices update The Bank
                automatically.
              </p>
            </div>
            <Link
              href={`/stock-suppliers/invoices/scan`}
              className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors"
            >
              Scan the invoice →
            </Link>
          </div>
        )}
        {po.status === 'cancelled' && (
          <p className="font-serif italic text-sm text-muted">
            Cancelled{' '}
            {po.cancelled_at ? dateFmt.format(new Date(po.cancelled_at)) : ''}.
          </p>
        )}
      </div>

      {/* Line editor (editable when draft, read-only otherwise) */}
      <SectionHead
        title={isEditable ? 'Lines' : isSent ? 'Order Detail' : 'Lines'}
        meta={`${po.line_count} ${po.line_count === 1 ? 'line' : 'lines'}`}
      />
      <PoLineEditor
        poId={po.id}
        initial={po.lines.map((l) => ({
          key: l.id,
          ingredient_id: l.ingredient_id,
          raw_name: l.raw_name,
          qty: String(l.qty),
          qty_unit: l.qty_unit,
          unit_price: l.unit_price == null ? '' : String(l.unit_price),
          notes: l.notes ?? '',
        }))}
        initialExpectedAt={po.expected_at}
        initialNotes={po.notes ?? ''}
        bankIngredients={bankIngredients}
        readOnly={!isEditable}
      />

      {/* Supplier contact reminder for sent POs */}
      {isSent && supplierContact && (
        <div className="bg-card border border-rule px-7 py-5 mt-10 print-hide">
          <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-muted mb-2">
            Supplier contact
          </div>
          <p className="font-serif text-sm text-ink-soft">
            {supplierContact}
            {supplierEmail ? ` · ${supplierEmail}` : ''}
          </p>
        </div>
      )}

      <div className="mt-10 print-hide">
        <Link
          href="/stock-suppliers/purchase-orders"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
        >
          ← Back to Purchase Orders
        </Link>
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  sub,
  toneText,
}: {
  label: string;
  value: string;
  sub?: string;
  toneText?: string;
}) {
  return (
    <div className="bg-card px-5 py-4">
      <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-muted mb-2">
        {label}
      </div>
      <div className={`font-serif font-medium text-2xl leading-none ${toneText ?? 'text-ink'}`}>
        {value}
      </div>
      {sub && (
        <div className="font-serif italic text-xs text-muted mt-1">{sub}</div>
      )}
    </div>
  );
}

function subtitle(po: {
  status: PurchaseOrderStatus;
  line_count: number;
  expected_at: string | null;
  total: number;
}): string {
  const fmt = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  });
  const parts: string[] = [];
  parts.push(`${po.line_count} ${po.line_count === 1 ? 'line' : 'lines'}`);
  parts.push(fmt.format(po.total));
  if (po.expected_at && po.status !== 'received') {
    parts.push(
      `expected ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(po.expected_at))}`,
    );
  }
  return parts.join(' · ') + '.';
}

function buildEmailBody(po: {
  reference: string;
  lines: Array<{
    raw_name: string;
    qty: number;
    qty_unit: string;
    unit_price: number | null;
  }>;
  expected_at: string | null;
  notes: string | null;
}): string {
  const lines: string[] = [];
  lines.push(`Order ${po.reference}`);
  lines.push('');
  if (po.expected_at) {
    lines.push(
      `Expected delivery: ${new Date(po.expected_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    );
    lines.push('');
  }
  lines.push('Items:');
  for (const l of po.lines) {
    const price = l.unit_price != null ? ` @ £${l.unit_price.toFixed(2)}` : '';
    lines.push(`  - ${l.qty} ${l.qty_unit} × ${l.raw_name}${price}`);
  }
  if (po.notes) {
    lines.push('');
    lines.push('Notes:');
    lines.push(po.notes);
  }
  lines.push('');
  lines.push('Please confirm — thanks.');
  return lines.join('\n');
}
