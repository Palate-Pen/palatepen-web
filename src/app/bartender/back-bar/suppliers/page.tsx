import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getSuppliers } from '@/lib/suppliers';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';

export const metadata = { title: 'Suppliers — Bar — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});

export default async function BarSuppliersPage() {
  const ctx = await getShellContext();
  const data = await getSuppliers(ctx.siteId);

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-start gap-6 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            Back Bar · Suppliers
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
            Who <em className="text-gold font-semibold not-italic">you buy from</em>
          </h1>
          <p className="font-serif italic text-lg text-muted mt-3">
            Liberty Wines, Speciality Drinks, the rep on WhatsApp — every supplier across the site, with the reliability they've earned.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="On File"
          value={String(data.total_count)}
          sub={`${data.active_count} active`}
        />
        <KpiCard
          label="Active · 30d"
          value={String(data.active_count)}
          sub="delivered recently"
        />
        <KpiCard
          label="With Contact"
          value={String(
            data.suppliers.filter((s) => s.phone || s.email).length,
          )}
          sub="phone or email on file"
        />
        <KpiCard
          label="Top Score"
          value={(() => {
            const top = data.suppliers
              .map((s) => s.reliability_score)
              .filter((s): s is number => s != null)
              .sort((a, b) => b - a)[0];
            return top != null ? `${top.toFixed(1)}/10` : '—';
          })()}
          sub="best reliability"
          tone="healthy"
        />
      </div>

      <section className="mb-10">
        <SectionHead title="Suppliers" meta={`${data.suppliers.length} total`} />
        {data.suppliers.length === 0 ? (
          <div className="bg-card border border-rule px-10 py-16 text-center">
            <p className="font-serif italic text-muted">
              No suppliers on file yet. Add one from chef Suppliers.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-rule">
            <div className="hidden md:grid grid-cols-[2fr_120px_140px_140px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
              {['Supplier', 'Reliability', 'Ingredients', 'Last seen'].map((h) => (
                <div key={h} className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted">
                  {h}
                </div>
              ))}
            </div>
            {data.suppliers.map((s, i) => {
              const tone =
                s.reliability_score == null
                  ? 'text-muted-soft'
                  : s.reliability_score >= 9
                    ? 'text-healthy'
                    : s.reliability_score >= 7
                      ? 'text-attention'
                      : 'text-urgent';
              return (
                <Link
                  key={s.id}
                  href={`/stock-suppliers/suppliers/${s.id}`}
                  className={
                    'grid grid-cols-1 md:grid-cols-[2fr_120px_140px_140px] gap-4 px-7 py-4 items-center transition-colors hover:bg-paper-warm ' +
                    (i === data.suppliers.length - 1 ? '' : 'border-b border-rule-soft')
                  }
                >
                  <div className="font-serif font-semibold text-base text-ink">
                    {s.name}
                  </div>
                  <div className={`font-display font-semibold text-xs tracking-[0.08em] uppercase ${tone}`}>
                    {s.reliability_score != null
                      ? `${s.reliability_score.toFixed(1)}/10`
                      : 'unscored'}
                  </div>
                  <div className="font-serif text-sm text-muted">
                    {s.ingredient_count} on file
                  </div>
                  <div className="font-serif text-sm text-muted">
                    {s.last_seen_at
                      ? new Date(s.last_seen_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })
                      : '—'}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-5">
        <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold mb-2">
          Note
        </div>
        <p className="font-serif italic text-sm text-ink-soft leading-relaxed">
          Suppliers are shared across kitchen + bar. Clicking through opens the full detail view with contact terms, recent invoices, price-change history and items supplied.
        </p>
      </div>
    </div>
  );
}
