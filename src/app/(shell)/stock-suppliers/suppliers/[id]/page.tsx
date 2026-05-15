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
import { EditSupplierButton } from './EditSupplierButton';

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
      <div className="flex justify-between items-start gap-4 flex-wrap mb-3">
        <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
          {supplier.name}
        </h1>
        <EditSupplierButton
          supplier={{
            id: supplier.id,
            name: supplier.name,
            contact_person: supplier.contact_person,
            phone: supplier.phone,
            email: supplier.email,
            address: supplier.address,
            website: supplier.website,
            payment_terms: supplier.payment_terms,
            credit_limit: supplier.credit_limit,
            account_balance: supplier.account_balance,
            notes_md: supplier.notes_md,
          }}
        />
      </div>
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

      {(supplier.contact_person ||
        supplier.phone ||
        supplier.email ||
        supplier.address ||
        supplier.website ||
        supplier.payment_terms ||
        supplier.credit_limit != null ||
        supplier.account_balance != null ||
        supplier.notes_md) && (
        <section className="mb-10">
          <SectionHead
            title="Contact & Terms"
            meta={supplier.payment_terms ?? ''}
          />
          <div className="bg-card border border-rule">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-rule">
              <div className="px-7 py-5">
                <ContactRow label="Contact" value={supplier.contact_person} />
                <ContactRow label="Phone" value={supplier.phone} mono />
                <ContactRow label="Email" value={supplier.email} mono />
                <ContactRow
                  label="Website"
                  value={supplier.website}
                  mono
                  href={supplier.website ?? undefined}
                />
                <ContactRow
                  label="Address"
                  value={supplier.address}
                  multiline
                />
              </div>
              <div className="px-7 py-5">
                <ContactRow
                  label="Payment terms"
                  value={supplier.payment_terms}
                />
                <ContactRow
                  label="Credit limit"
                  value={
                    supplier.credit_limit != null
                      ? gbp.format(supplier.credit_limit)
                      : null
                  }
                />
                <ContactRow
                  label="Account balance"
                  value={
                    supplier.account_balance != null
                      ? gbp.format(supplier.account_balance)
                      : null
                  }
                  tone={
                    supplier.credit_limit != null &&
                    supplier.account_balance != null &&
                    supplier.account_balance >= supplier.credit_limit * 0.85
                      ? 'attention'
                      : undefined
                  }
                />
                {supplier.credit_limit != null &&
                  supplier.account_balance != null &&
                  supplier.credit_limit > 0 && (
                    <div className="mt-2">
                      <CreditBar
                        used={Math.max(0, supplier.account_balance)}
                        limit={supplier.credit_limit}
                      />
                    </div>
                  )}
              </div>
            </div>
            {supplier.notes_md && (
              <div className="px-7 py-5 border-t border-rule bg-paper-warm/50">
                <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted mb-2">
                  Notes
                </div>
                <p className="font-serif italic text-base text-ink-soft leading-relaxed whitespace-pre-line">
                  {supplier.notes_md}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

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
          <>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {supplier.ingredients.slice(0, 40).map((ing) => (
                <Link
                  key={ing.id}
                  href={`/stock-suppliers/the-bank/${ing.id}`}
                  className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase px-2.5 py-1 border border-rule bg-paper-warm text-ink-soft hover:border-gold hover:text-gold transition-colors"
                >
                  {ing.name}
                </Link>
              ))}
              {supplier.ingredients.length > 40 && (
                <span className="font-serif italic text-xs text-muted-soft self-center ml-1">
                  +{supplier.ingredients.length - 40} more
                </span>
              )}
            </div>
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
          </>
        )}
      </section>

      {supplier.price_changes.length > 0 && (
        <section className="mb-10">
          <SectionHead
            title="Price Changes"
            meta={`${supplier.price_changes.length} in the last 90 days`}
          />
          <div className="bg-card border border-rule">
            <div className="hidden md:grid grid-cols-[140px_2fr_130px_130px_100px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
              {['Date', 'Ingredient', 'From', 'To', 'Change'].map((h) => (
                <div key={h} className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted">
                  {h}
                </div>
              ))}
            </div>
            {supplier.price_changes.map((pc, i) => {
              const tone =
                pc.pct_change == null
                  ? 'text-muted'
                  : pc.pct_change > 5
                    ? 'text-urgent'
                    : pc.pct_change > 0
                      ? 'text-attention'
                      : 'text-healthy';
              return (
                <Link
                  key={`${pc.ingredient_id}-${pc.recorded_at}-${i}`}
                  href={`/stock-suppliers/the-bank/${pc.ingredient_id}`}
                  className={
                    'grid grid-cols-1 md:grid-cols-[140px_2fr_130px_130px_100px] gap-4 px-7 py-3.5 items-center transition-colors hover:bg-paper-warm ' +
                    (i === supplier.price_changes.length - 1
                      ? ''
                      : 'border-b border-rule-soft')
                  }
                >
                  <div className="font-serif text-sm text-muted">
                    {dateShort.format(new Date(pc.recorded_at))}
                  </div>
                  <div className="font-serif text-sm text-ink truncate">
                    {pc.ingredient_name}
                  </div>
                  <div className="font-serif text-sm text-muted">
                    {pc.from_price != null ? gbp.format(pc.from_price) : 'new'}
                  </div>
                  <div className="font-serif font-semibold text-sm text-ink">
                    {gbp.format(pc.to_price)}
                  </div>
                  <div className={`font-display font-semibold text-xs tracking-[0.08em] uppercase ${tone}`}>
                    {pc.pct_change == null
                      ? 'on file'
                      : (pc.pct_change > 0 ? '+' : '') + pc.pct_change.toFixed(1) + '%'}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

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

function ContactRow({
  label,
  value,
  mono,
  multiline,
  href,
  tone,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  multiline?: boolean;
  href?: string;
  tone?: 'attention';
}) {
  if (!value) {
    return (
      <div className="flex items-baseline justify-between gap-3 py-1.5">
        <span className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted-soft">
          {label}
        </span>
        <span className="font-serif italic text-xs text-muted-soft">—</span>
      </div>
    );
  }
  const valueClass =
    (mono ? 'font-mono text-sm' : 'font-serif text-sm') +
    ' ' +
    (tone === 'attention' ? 'text-attention font-semibold' : 'text-ink') +
    (multiline ? ' whitespace-pre-line text-right' : '');
  return (
    <div
      className={
        'flex ' +
        (multiline ? 'flex-col gap-1' : 'items-baseline justify-between gap-3') +
        ' py-1.5'
      }
    >
      <span className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted">
        {label}
      </span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={valueClass + ' hover:text-gold transition-colors'}
        >
          {value}
        </a>
      ) : (
        <span className={valueClass}>{value}</span>
      )}
    </div>
  );
}

function CreditBar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(1, used / limit);
  const tone =
    pct >= 0.85 ? 'urgent' : pct >= 0.7 ? 'attention' : 'healthy';
  const barColor =
    tone === 'urgent'
      ? 'bg-urgent'
      : tone === 'attention'
        ? 'bg-attention'
        : 'bg-healthy';
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted">
          Credit used
        </span>
        <span className="font-serif font-semibold text-xs text-ink">
          {(pct * 100).toFixed(0)}%
        </span>
      </div>
      <div className="h-1.5 bg-paper-warm border border-rule rounded-sm overflow-hidden">
        <div
          className={`h-full transition-all ${barColor}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
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
