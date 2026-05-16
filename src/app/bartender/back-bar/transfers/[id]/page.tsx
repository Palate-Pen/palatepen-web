import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getTransfer,
  TRANSFER_STATUS_LABEL,
  TRANSFER_POOL_LABEL,
  type TransferStatus,
} from '@/lib/stock-transfers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { TransferLineEditor } from '@/app/(shell)/stock-suppliers/transfers/[id]/TransferLineEditor';
import {
  sendTransferAction,
  receiveTransferAction,
  cancelTransferAction,
} from '@/app/(shell)/stock-suppliers/transfers/actions';

export const metadata = { title: 'Stock Transfer — Back Bar — Palatable' };

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
  TransferStatus,
  'healthy' | 'attention' | 'urgent' | 'muted'
> = {
  draft: 'attention',
  sent: 'attention',
  received: 'healthy',
  cancelled: 'muted',
};

export default async function BarTransferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTransfer(id);
  if (!t) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name, unit, current_price, current_stock')
    .eq('site_id', t.source_site_id)
    .order('name', { ascending: true });
  const sourceIngredients = (ingredients ?? []).map((i) => ({
    id: i.id as string,
    name: i.name as string,
    unit: (i.unit as string | null) ?? null,
    current_price:
      i.current_price == null ? null : Number(i.current_price),
    current_stock:
      i.current_stock == null ? null : Number(i.current_stock),
  }));

  const tone = STATUS_TONE[t.status];
  const toneText =
    tone === 'healthy'
      ? 'text-healthy'
      : tone === 'attention'
        ? 'text-attention'
        : tone === 'urgent'
          ? 'text-urgent'
          : 'text-muted';

  const isEditable = t.status === 'draft';
  const isInTransit = t.status === 'sent';
  const isIntraSite = t.source_site_id === t.dest_site_id;

  const editorLines = t.lines.map((l) => ({
    key: l.id,
    source_ingredient_id: l.source_ingredient_id,
    raw_name: l.raw_name,
    qty: String(l.qty),
    qty_unit: l.qty_unit,
    unit_cost: l.unit_cost != null ? String(l.unit_cost) : '',
    notes: l.notes ?? '',
  }));

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Back Bar · Transfer
      </div>
      <div className="flex items-start justify-between gap-6 flex-wrap mb-6">
        <div>
          <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] text-ink mb-3">
            <em className="text-gold font-semibold not-italic">{t.reference}</em>
          </h1>
          <p className="font-serif text-lg text-ink">
            {t.source_site_name ?? 'Site'} · {TRANSFER_POOL_LABEL[t.source_pool]}
            <span className="mx-2 text-muted">→</span>
            {t.dest_site_name ?? 'Site'} · {TRANSFER_POOL_LABEL[t.dest_pool]}
          </p>
          <p className="font-serif italic text-sm text-muted mt-1">
            Created {dateFmt.format(new Date(t.created_at))}
            {isIntraSite && ' · intra-site (inventory shared)'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div
            className={
              'font-display font-semibold text-xs tracking-[0.18em] uppercase ' +
              toneText
            }
          >
            {TRANSFER_STATUS_LABEL[t.status]}
          </div>
          {t.sent_at && (
            <div className="font-serif italic text-xs text-muted">
              Sent {dateFmt.format(new Date(t.sent_at))}
            </div>
          )}
          {t.received_at && (
            <div className="font-serif italic text-xs text-muted">
              Received {dateFmt.format(new Date(t.received_at))}
            </div>
          )}
          {t.cancelled_at && (
            <div className="font-serif italic text-xs text-muted">
              Cancelled {dateFmt.format(new Date(t.cancelled_at))}
            </div>
          )}
        </div>
      </div>

      <Link
        href="/bartender/back-bar/transfers"
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors inline-block mb-8"
      >
        ← All transfers
      </Link>

      <section className="mb-10">
        <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-4">
          Lines
        </div>
        <TransferLineEditor
          transferId={t.id}
          initial={editorLines}
          initialNotes={t.notes ?? ''}
          sourceIngredients={sourceIngredients}
          readOnly={!isEditable}
        />
      </section>

      {!isEditable && t.notes && (
        <section className="mb-10">
          <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-3">
            Notes
          </div>
          <p className="font-serif italic text-base text-ink-soft leading-relaxed bg-card border border-rule px-7 py-5">
            {t.notes}
          </p>
        </section>
      )}

      <section className="bg-card border border-rule px-7 py-6 flex items-center gap-3 flex-wrap">
        {isEditable && (
          <>
            <form action={sendTransferAction}>
              <input type="hidden" name="id" value={t.id} />
              <button
                type="submit"
                disabled={t.lines.length === 0}
                className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-ink text-paper hover:bg-ink-soft disabled:opacity-50 transition-colors"
              >
                Send transfer →
              </button>
            </form>
            <form action={cancelTransferAction}>
              <input type="hidden" name="id" value={t.id} />
              <button
                type="submit"
                className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-transparent text-muted border border-rule hover:border-urgent hover:text-urgent transition-colors"
              >
                Cancel draft
              </button>
            </form>
            <p className="font-serif italic text-sm text-muted ml-auto">
              {isIntraSite
                ? 'Same-site transfer — recorded but stock figures unchanged.'
                : 'Sending decrements source stock immediately.'}
            </p>
          </>
        )}
        {isInTransit && (
          <>
            <form action={receiveTransferAction}>
              <input type="hidden" name="id" value={t.id} />
              <button
                type="submit"
                className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors"
              >
                Mark received →
              </button>
            </form>
            <p className="font-serif italic text-sm text-muted ml-auto">
              {isIntraSite
                ? 'No stock movement on receipt — pool already shared.'
                : 'On receive, destination stock credits and missing-row lines get flagged for linking.'}
            </p>
          </>
        )}
        {t.status === 'received' && (
          <p className="font-serif italic text-sm text-healthy">
            ✓ Transfer closed.{' '}
            {t.total_value > 0 && (
              <span className="text-muted ml-1">
                {gbp.format(t.total_value)} of stock moved.
              </span>
            )}
          </p>
        )}
        {t.status === 'cancelled' && (
          <p className="font-serif italic text-sm text-muted">
            Cancelled — no stock movement applied.
          </p>
        )}
      </section>
    </div>
  );
}
