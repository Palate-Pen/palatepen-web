import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getShellContext } from '@/lib/shell/context';
import {
  getSupplierDetail,
  type SupplierIngredientRow,
  type SupplierInvoiceRow,
} from '@/lib/suppliers';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';

export const metadata = { title: 'Supplier — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});
const gbpRound = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});
const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const dateShort = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
});

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getShellContext();
  const supplier = await getSupplierDetail(ctx.siteId, id);
  if (!supplier) notFound();

  const reliabilityTone =
    supplier.reliability_score == null
      ? undefined
      : supplier.reliability_score >= 9
        ? 'healthy'
        : supplier.reliability_score >= 7
          ? 'attention'
          : 'urgent';

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1200px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Stock & Suppliers · Suppliers
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
        {supplier.name}
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-8">
        {subtitle(supplier)}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Reliability"
          value={
            supplier.reliability_score == null
              ? '—'
              : `${supplier.reliability_score.toFixed(1)}/10`
          }
          sub={
            supplier.reliability_score == null
              ? 'no invoice history yet'
              : supplier.reliability_score >= 9
                ? 'rock solid'
                : supplier.reliability_score >= 7
                  ? 'mostly clean'
                  : 'patchy'
          }
          tone={reliabilityTone}
        />
        <KpiCard
          label="Spend · 90d"
          value={
            supplier.total_spend_90d > 0
              ? gbpRound.format(supplier.total_spend_90d)
              : '£0'
          }
          sub="confirmed invoices"
        />
        <KpiCard
          label="Invoices · 90d"
          value={String(supplier.confirmed_count + supplier.flagged_count)}
          sub={
            supplier.flagged_count > 0
              ? `${supplier.flagged_count} flagged`
              : 'clean record'
          }
          tone={supplier.flagged_count > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Ingredients"
          value={String(supplier.ingredients.length)}
          sub="on file from this supplier"
        />
      </div>

      <section className="mb-10">
        <SectionHead
          title="Ingredients Sourced"
          meta={`${supplier.ingredients.length} on file`}
        />
        {supplier.ingredients.length === 0 ? (
          <div className="bg-card border border-rule px-10 py-10 text-center">
            <p className="font-serif italic text-muted">
              No ingredients linked to this supplier yet. Set the supplier on a Bank ingredient and it lands here.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-rule">
            <div className="hidden md:grid grid-cols-[2fr_120px_120px_120px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
              {['Ingredient', 'Unit price', 'Last seen', 'Category'].map((h) => (
                <div key={h} className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted">
                  {h}
                </div>
              ))}
            </div>
            {supplier.ingredients.map((ing, i) => (
              <IngredientRowLine
                key={ing.id}
                ing={ing}
                last={i === supplier.ingredients.length - 1}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <SectionHead
          title="Recent Invoices"
          meta={`${supplier.invoices.length} in the last 90 days`}
        />
        {supplier.invoices.length === 0 ? (
          <div className="bg-card border border-rule px-10 py-10 text-center">
            <p className="font-serif italic text-muted">
              No invoices from this supplier in the last 90 days.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-rule">
            <div className="hidden md:grid grid-cols-[140px_1fr_100px_120px_120px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
              {['Date', '#', 'Source', 'Total', 'Status'].map((h) => (
                <div key={h} className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted">
                  {h}
                </div>
              ))}
            </div>
            {supplier.invoices.map((inv, i) => (
              <InvoiceLineRow
                key={inv.id}
                inv={inv}
                last={i === supplier.invoices.length - 1}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function subtitle(s: Awaited<ReturnType<typeof getSupplierDetail>>): string {
  if (!s) return '';
  const ing = `${s.ingredients.length} ${s.ingredients.length === 1 ? 'ingredient' : 'ingredients'}`;
  const rel =
    s.reliability_score == null
      ? 'No invoice history yet — reliability builds over the first few deliveries.'
      : s.reliability_score >= 9
        ? `${ing} on file, reliability solid at ${s.reliability_score.toFixed(1)}/10.`
        : s.reliability_score >= 7
          ? `${ing} on file. Reliability is ${s.reliability_score.toFixed(1)}/10 — watch the flagged ones.`
          : `${ing} on file. Reliability is patchy (${s.reliability_score.toFixed(1)}/10) — worth a conversation.`;
  return rel;
}

function IngredientRowLine({
  ing,
  last,
}: {
  ing: SupplierIngredientRow;
  last: boolean;
}) {
  return (
    <Link
      href={`/stock-suppliers/the-bank/${ing.id}`}
      className={
        'grid grid-cols-1 md:grid-cols-[2fr_120px_120px_120px] gap-4 px-7 py-4 items-center hover:bg-paper-warm transition-colors ' +
        (last ? '' : 'border-b border-rule-soft')
      }
    >
      <div className="font-serif font-semibold text-base text-ink">
        {ing.name}
      </div>
      <div className="font-serif text-sm text-ink">
        {ing.current_price != null
          ? `${gbp.format(ing.current_price)}${ing.unit ? ` / ${ing.unit}` : ''}`
          : '—'}
      </div>
      <div className="font-serif italic text-xs text-muted">
        {ing.last_seen_at
          ? dateShort.format(new Date(ing.last_seen_at))
          : '—'}
      </div>
      <div className="font-serif italic text-xs text-muted">
        {ing.category ?? '—'}
      </div>
    </Link>
  );
}

function InvoiceLineRow({
  inv,
  last,
}: {
  inv: SupplierInvoiceRow;
  last: boolean;
}) {
  return (
    <Link
      href={`/stock-suppliers/invoices/${inv.id}`}
      className={
        'grid grid-cols-1 md:grid-cols-[140px_1fr_100px_120px_120px] gap-4 px-7 py-4 items-center hover:bg-paper-warm transition-colors ' +
        (last ? '' : 'border-b border-rule-soft')
      }
    >
      <div className="font-serif text-sm text-ink">
        {dateFmt.format(new Date(inv.issued_at ?? inv.received_at))}
      </div>
      <div>
        <div className="font-serif font-semibold text-sm text-ink">
          {inv.invoice_number ? `#${inv.invoice_number}` : 'No number'}
        </div>
        {inv.flagged_lines > 0 && (
          <div className="font-serif italic text-xs text-attention mt-0.5">
            ⚑ {inv.flagged_lines} flagged{' '}
            {inv.flagged_lines === 1 ? 'line' : 'lines'}
          </div>
        )}
      </div>
      <div>
        <SourceBadge source={inv.source} />
      </div>
      <div className="font-serif font-semibold text-sm text-ink">
        {inv.total != null ? gbp.format(inv.total) : '—'}
      </div>
      <div>
        <StatusPill status={inv.status} />
      </div>
    </Link>
  );
}

function SourceBadge({ source }: { source: string }) {
  const meta: Record<string, { label: string; classes: string }> = {
    scanned: {
      label: 'Scanned',
      classes: 'text-gold bg-gold-bg border-gold/40',
    },
    email: {
      label: 'Email',
      classes: 'text-gold bg-gold-bg border-gold/40',
    },
    manual: {
      label: 'Manual',
      classes: 'text-muted bg-paper-warm border-rule',
    },
    api: {
      label: 'API',
      classes: 'text-muted bg-paper-warm border-rule',
    },
  };
  const m = meta[source] ?? meta.manual;
  return (
    <span
      className={
        'inline-flex items-center px-2 py-0.5 border font-display font-semibold text-[10px] tracking-[0.18em] uppercase rounded-sm ' +
        m.classes
      }
    >
      {m.label}
    </span>
  );
}

function StatusPill({
  status,
}: {
  status: SupplierInvoiceRow['status'];
}) {
  const map: Record<
    SupplierInvoiceRow['status'],
    { label: string; classes: string }
  > = {
    draft: { label: 'Draft', classes: 'text-muted bg-paper-warm border-rule' },
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
      className={`inline-flex items-center px-2.5 py-1 border font-display font-semibold text-[10px] tracking-[0.18em] uppercase rounded-sm ${classes}`}
    >
      {label}
    </span>
  );
}
