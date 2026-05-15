import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { OwnerPageHeader } from '@/components/owner/OwnerScaffold';
import { getSupplierLedger } from '@/lib/oversight';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { PrintButton } from '@/components/shell/PrintButton';

export const metadata = { title: 'Cash — Owner — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});

export default async function OwnerCashPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id, sites:site_id (name)')
    .eq('user_id', user.id)
    .eq('role', 'owner');
  const sites = (memberships ?? []) as unknown as Array<{
    site_id: string;
    sites: { name: string | null } | null;
  }>;

  const ledgers = await Promise.all(
    sites.map((s) =>
      getSupplierLedger(s.site_id).then((l) => ({
        siteName: s.sites?.name ?? 'Site',
        ...l,
      })),
    ),
  );

  const grandTotalOwed = ledgers.reduce((a, l) => a + l.total_owed, 0);
  const grandTotalCredit = ledgers.reduce((a, l) => a + l.total_credit, 0);
  const grandOver85 = ledgers.reduce((a, l) => a + l.over_85pct_count, 0);
  const totalUtilisation =
    grandTotalCredit > 0
      ? Math.round((grandTotalOwed / grandTotalCredit) * 100)
      : 0;

  return (
    <div className="printable px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1200px] mx-auto">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-2">
        <div className="flex-1 min-w-[280px]">
          <OwnerPageHeader
            eyebrow="The Money In, The Money Out"
            title="Cash"
            subtitle="Supplier balance ledger across every site. Credit usage today; A/R + bank-feed integration land with the cash-flow build."
            activeSlug="cash"
          />
        </div>
        <div className="print-hide pt-2">
          <PrintButton label="Print cash ledger" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Owed To Suppliers"
          value={gbp.format(grandTotalOwed)}
          sub="open account balances"
        />
        <KpiCard
          label="Credit Available"
          value={gbp.format(Math.max(0, grandTotalCredit - grandTotalOwed))}
          sub="of total credit lines"
        />
        <KpiCard
          label="Utilisation"
          value={grandTotalCredit > 0 ? totalUtilisation + '%' : '—'}
          sub={`${grandOver85} supplier${grandOver85 === 1 ? '' : 's'} over 85%`}
          tone={
            totalUtilisation >= 85
              ? 'urgent'
              : totalUtilisation >= 70
                ? 'attention'
                : 'healthy'
          }
        />
        <KpiCard
          label="Total Credit"
          value={gbp.format(grandTotalCredit)}
          sub="lines on file"
        />
      </div>

      <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-5 mb-10">
        <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-gold mb-2">
          Cash flow lens
        </div>
        <p className="font-serif italic text-base text-ink-soft leading-relaxed">
          This shows the static balance ledger right now. The forward
          cash-flow lens — payment due dates + revenue timing + bank
          feed — is the next layer once the supplier_contracts schema
          + POS land. Until then, watch the utilisation %.
        </p>
      </div>

      {ledgers.map((l) => (
        <section key={l.siteName} className="mb-10">
          <SectionHead
            title={l.siteName}
            meta={`${l.rows.length} suppliers · ${gbp.format(l.total_owed)} owed`}
          />
          {l.rows.length === 0 ? (
            <div className="bg-card border border-rule px-10 py-8 text-center">
              <p className="font-serif italic text-muted">
                No supplier accounts on file for {l.siteName}.
              </p>
            </div>
          ) : (
            <div className="bg-card border border-rule">
              <div className="hidden md:grid grid-cols-[1.6fr_1fr_110px_110px_120px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
                {[
                  'Supplier',
                  'Payment terms',
                  'Limit',
                  'Balance',
                  'Utilisation',
                ].map((h) => (
                  <div
                    key={h}
                    className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
                  >
                    {h}
                  </div>
                ))}
              </div>
              {l.rows.slice(0, 15).map((r, i) => {
                const tone =
                  r.utilisation_pct == null
                    ? 'muted'
                    : r.utilisation_pct >= 85
                      ? 'urgent'
                      : r.utilisation_pct >= 70
                        ? 'attention'
                        : 'healthy';
                return (
                  <Link
                    key={r.id}
                    href={`/stock-suppliers/suppliers/${r.id}`}
                    className={
                      'grid grid-cols-1 md:grid-cols-[1.6fr_1fr_110px_110px_120px] gap-4 px-7 py-4 items-center hover:bg-paper-warm transition-colors' +
                      (i < Math.min(14, l.rows.length - 1)
                        ? ' border-b border-rule-soft'
                        : '')
                    }
                  >
                    <div className="font-serif font-semibold text-base text-ink">
                      {r.name}
                    </div>
                    <div className="font-serif text-sm text-ink-soft">
                      {r.payment_terms ?? '—'}
                    </div>
                    <div className="font-serif text-sm text-ink">
                      {r.credit_limit != null
                        ? gbp.format(r.credit_limit)
                        : '—'}
                    </div>
                    <div className="font-serif font-semibold text-sm text-ink">
                      {r.account_balance != null
                        ? gbp.format(r.account_balance)
                        : '—'}
                    </div>
                    <div
                      className={
                        'font-serif font-semibold text-sm ' +
                        (tone === 'urgent'
                          ? 'text-urgent'
                          : tone === 'attention'
                            ? 'text-attention'
                            : tone === 'healthy'
                              ? 'text-healthy'
                              : 'text-muted')
                      }
                    >
                      {r.utilisation_pct != null
                        ? r.utilisation_pct + '%'
                        : '—'}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
