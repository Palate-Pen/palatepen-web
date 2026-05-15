import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getSuppliers, type SupplierRow } from '@/lib/suppliers';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { PrintButton } from '@/components/shell/PrintButton';
import { AddSupplierDialog } from './AddSupplierDialog';

export const metadata = { title: 'Suppliers — Palatable' };

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
});

export default async function SuppliersPage() {
  const ctx = await getShellContext();
  const data = await getSuppliers(ctx.siteId);

  const lowReliability = data.suppliers.filter(
    (s) => s.reliability_score != null && s.reliability_score < 8,
  ).length;
  const totalIngredients = data.suppliers.reduce(
    (s, r) => s + r.ingredient_count,
    0,
  );

  return (
    <div className="printable px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="flex justify-between items-start gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            The Walk-in · Suppliers
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
            <em className="text-gold font-semibold not-italic">Suppliers</em>
          </h1>
          <p className="font-serif italic text-lg text-muted mt-3">
            {subtitle(data, lowReliability)}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap print-hide">
          {data.total_count > 0 && <PrintButton label="Print suppliers list" />}
          <AddSupplierDialog />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="On The Books"
          value={String(data.total_count)}
          sub={`${data.active_count} active in last 30 days`}
        />
        <KpiCard
          label="Ingredients Sourced"
          value={String(totalIngredients)}
          sub="across all suppliers"
        />
        <KpiCard
          label="Reliability Watch"
          value={String(lowReliability)}
          sub={lowReliability === 0 ? 'all rock solid' : 'score below 8/10'}
          tone={lowReliability > 0 ? 'attention' : 'healthy'}
        />
        <KpiCard
          label="Dormant"
          value={String(data.total_count - data.active_count)}
          sub="no recent activity"
        />
      </div>

      <section className="mt-12">
        <SectionHead
          title="Active"
          meta={`${data.active_count} sourcing within 30 days`}
        />
        {data.suppliers.filter((s) => s.active_in_30d).length === 0 ? (
          <EmptyState text="No active suppliers yet. As ingredients are sourced, suppliers show up here." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.suppliers
              .filter((s) => s.active_in_30d)
              .map((s) => (
                <SupplierCard key={s.id} supplier={s} />
              ))}
          </div>
        )}
      </section>

      {data.suppliers.filter((s) => !s.active_in_30d).length > 0 && (
        <section className="mt-12">
          <SectionHead title="Dormant" meta="no recent activity" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75">
            {data.suppliers
              .filter((s) => !s.active_in_30d)
              .map((s) => (
                <SupplierCard key={s.id} supplier={s} />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

function subtitle(
  data: Awaited<ReturnType<typeof getSuppliers>>,
  lowRel: number,
): string {
  if (data.total_count === 0) {
    return 'No suppliers on the books yet. Add one and ingredients can start flowing through.';
  }
  if (lowRel > 0) {
    return `${data.active_count} active suppliers, ${lowRel} on the reliability watch list.`;
  }
  return `${data.active_count} active suppliers, all delivering reliably.`;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-card border border-rule px-10 py-10 text-center">
      <p className="font-serif italic text-muted">{text}</p>
    </div>
  );
}

function SupplierCard({ supplier }: { supplier: SupplierRow }) {
  const reliabilityTone =
    supplier.reliability_score == null
      ? 'muted'
      : supplier.reliability_score >= 9
        ? 'healthy'
        : supplier.reliability_score >= 7
          ? 'attention'
          : 'urgent';
  const toneClass =
    reliabilityTone === 'healthy'
      ? 'text-healthy'
      : reliabilityTone === 'attention'
        ? 'text-attention'
        : reliabilityTone === 'urgent'
          ? 'text-urgent'
          : 'text-muted';

  return (
    <Link
      href={`/stock-suppliers/suppliers/${supplier.id}`}
      className="bg-card border border-rule px-7 py-6 flex flex-col hover:border-rule-gold transition-colors"
    >
      <div className="flex items-baseline justify-between mb-2">
        <div className="font-serif font-semibold text-lg text-ink">
          {supplier.name}
        </div>
        {supplier.reliability_score != null && (
          <div className={`font-serif font-semibold text-base ${toneClass}`}>
            {supplier.reliability_score.toFixed(1)}
            <span className="font-sans font-normal text-xs text-muted">/10</span>
          </div>
        )}
      </div>
      <div className="font-serif italic text-sm text-muted mb-3">
        {supplier.ingredient_count}{' '}
        {supplier.ingredient_count === 1 ? 'ingredient' : 'ingredients'} on file
        {supplier.last_seen_at && (
          <>
            {' · last seen '}
            {dateFmt.format(new Date(supplier.last_seen_at))}
          </>
        )}
      </div>

      {(supplier.contact_person || supplier.phone || supplier.payment_terms) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 pb-3 border-b border-rule-soft">
          {supplier.contact_person && (
            <span className="font-serif text-xs text-ink-soft">
              <span className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted-soft mr-1">
                Contact
              </span>
              {supplier.contact_person}
            </span>
          )}
          {supplier.phone && (
            <span className="font-serif text-xs text-ink-soft">
              <span className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted-soft mr-1">
                Tel
              </span>
              {supplier.phone}
            </span>
          )}
          {supplier.payment_terms && (
            <span className="font-serif text-xs text-ink-soft">
              <span className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted-soft mr-1">
                Terms
              </span>
              {supplier.payment_terms}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-px bg-rule border border-rule mt-auto">
        <Stat label="Confirmed" value={String(supplier.confirmed_count)} />
        <Stat
          label="Flagged"
          value={String(supplier.flagged_count)}
          tone={supplier.flagged_count > 0 ? 'attention' : undefined}
        />
      </div>
    </Link>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'attention';
}) {
  return (
    <div className="bg-card px-4 py-3">
      <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-muted mb-1">
        {label}
      </div>
      <div
        className={
          'font-serif font-semibold text-base ' +
          (tone === 'attention' ? 'text-attention' : 'text-ink')
        }
      >
        {value}
      </div>
    </div>
  );
}
