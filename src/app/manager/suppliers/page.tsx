import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getSuppliers } from '@/lib/suppliers';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { PrintButton } from '@/components/shell/PrintButton';

export const metadata = { title: 'Suppliers — Manager — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});

export default async function ManagerSuppliersPage() {
  const ctx = await getShellContext();
  const data = await getSuppliers(ctx.siteId);

  const lowReliability = data.suppliers.filter(
    (s) => s.reliability_score != null && s.reliability_score < 8,
  ).length;
  const totalBalance = data.suppliers.reduce(
    (s, r) => s + (r.account_balance ?? 0),
    0,
  );

  return (
    <div className="printable px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            Site · Who You Buy From
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
            <em className="text-gold font-semibold not-italic">Suppliers</em>
          </h1>
          <p className="font-serif italic text-lg text-muted">
            Manager oversight. Edit contact + payment terms on the chef
            Suppliers surface.
          </p>
        </div>
        <div className="print-hide">
          {data.total_count > 0 && <PrintButton label="Print suppliers" />}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="On The Books"
          value={String(data.total_count)}
          sub={`${data.active_count} active`}
        />
        <KpiCard
          label="Reliability Watch"
          value={String(lowReliability)}
          sub={lowReliability === 0 ? 'all solid' : 'score < 8/10'}
          tone={lowReliability > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Total Owed"
          value={gbp.format(totalBalance)}
          sub="across all suppliers"
        />
        <KpiCard
          label="Dormant"
          value={String(data.total_count - data.active_count)}
          sub="no recent activity"
        />
      </div>

      <SectionHead title="Active" meta={`${data.active_count} sourcing in 30d`} />
      <div className="bg-card border border-rule mb-8">
        <div className="hidden md:grid grid-cols-[1.6fr_1fr_100px_100px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
          {['Supplier', 'Payment Terms', 'Reliability', 'Balance'].map((h) => (
            <div
              key={h}
              className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
            >
              {h}
            </div>
          ))}
        </div>
        {data.suppliers
          .filter((s) => s.active_in_30d)
          .map((s, i, arr) => (
            <Link
              key={s.id}
              href={`/stock-suppliers/suppliers/${s.id}`}
              className={
                'grid grid-cols-1 md:grid-cols-[1.6fr_1fr_100px_100px] gap-4 px-7 py-4 items-center hover:bg-paper-warm transition-colors' +
                (i < arr.length - 1 ? ' border-b border-rule-soft' : '')
              }
            >
              <div>
                <div className="font-serif font-semibold text-base text-ink">
                  {s.name}
                </div>
                {s.contact_person && (
                  <div className="font-serif italic text-xs text-muted mt-0.5">
                    {s.contact_person}
                    {s.phone ? ` · ${s.phone}` : ''}
                  </div>
                )}
              </div>
              <div className="font-serif text-sm text-ink-soft">
                {s.payment_terms ?? '—'}
              </div>
              <div
                className={
                  'font-serif font-semibold text-sm ' +
                  (s.reliability_score == null
                    ? 'text-muted'
                    : s.reliability_score >= 9
                      ? 'text-healthy'
                      : s.reliability_score >= 7
                        ? 'text-attention'
                        : 'text-urgent')
                }
              >
                {s.reliability_score != null
                  ? s.reliability_score.toFixed(1) + '/10'
                  : '—'}
              </div>
              <div className="font-serif font-semibold text-sm text-ink">
                {s.account_balance != null
                  ? gbp.format(s.account_balance)
                  : '—'}
              </div>
            </Link>
          ))}
      </div>

      <Link
        href="/stock-suppliers/suppliers"
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-transparent text-ink border border-rule hover:border-gold hover:text-gold transition-colors inline-block"
      >
        Open full Suppliers →
      </Link>
    </div>
  );
}
