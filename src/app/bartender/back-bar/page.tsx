import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getCellarRows } from '@/lib/cellar';
import { countOpenTransfers } from '@/lib/stock-transfers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { LookingAhead } from '@/components/shell/LookingAhead';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';

export const metadata = { title: 'Back Bar — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
});

export default async function BackBarHubPage() {
  const ctx = await getShellContext();
  const supabase = await createSupabaseServerClient();

  const [
    cellar,
    nextAllocation,
    pendingInvoices,
    spillageLast30d,
    lastStockTake,
    transferCounts,
  ] = await Promise.all([
    getCellarRows(ctx.siteId),
    supabase
      .from('allocations')
      .select('id, name, expected_date, received_at')
      .eq('site_id', ctx.siteId)
      .is('received_at', null)
      .gte('expected_date', new Date().toISOString().slice(0, 10))
      .order('expected_date', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', ctx.siteId)
      .in('status', ['scanned', 'flagged']),
    supabase
      .from('waste_entries')
      .select('value')
      .eq('site_id', ctx.siteId)
      .not('spillage_reason', 'is', null)
      .gte(
        'logged_at',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      ),
    supabase
      .from('stock_takes')
      .select('id, conducted_at, variance_total_value, status')
      .eq('site_id', ctx.siteId)
      .order('conducted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    countOpenTransfers(ctx.siteId),
  ]);

  const breachCount = cellar.filter((r) => r.par_status === 'breach').length;
  const lowCount = cellar.filter((r) => r.par_status === 'low').length;
  const stockValue = cellar.reduce(
    (sum, r) =>
      sum + (r.current_stock ?? 0) * (r.current_price ?? 0),
    0,
  );
  const allocation = nextAllocation.data;
  const spillageValue = (spillageLast30d.data ?? []).reduce(
    (sum, w) =>
      sum + Number((w as { value?: number | null }).value ?? 0),
    0,
  );
  const lastTake = lastStockTake.data;
  const lastTakeVariance =
    lastTake?.variance_total_value != null
      ? Number(lastTake.variance_total_value)
      : null;
  const pendingInvoiceCount = pendingInvoices.count ?? 0;

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="flex justify-between items-start gap-8 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            The Bottles, The Books, The Stock
          </div>
          <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] text-ink">
            Back{' '}
            <em className="text-gold font-semibold not-italic">Bar</em>
          </h1>
          <p className="font-serif italic text-lg text-muted mt-3">
            {hubSubtitle(cellar.length, breachCount, stockValue, spillageValue)}
          </p>
        </div>
        <Link
          href="/stock-suppliers/invoices/scan"
          className="bg-card border border-rule px-5 py-4 min-w-[240px] flex items-center gap-3.5 cursor-pointer transition-all hover:border-rule-gold hover:-translate-y-px"
        >
          <div className="w-10 h-10 border border-gold rounded-sm flex items-center justify-center text-gold bg-gold-bg flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h3l1.5-2h7L17 7h3v12H4V7z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          </div>
          <div>
            <div className="font-serif font-semibold text-base text-ink leading-tight">
              Scan an invoice
            </div>
            <div className="font-serif italic text-xs text-muted mt-0.5">
              shared with kitchen
            </div>
          </div>
        </Link>
      </div>

      {/* KPI strip — mirrors The Walk-in pattern */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Bottles On The Books"
          value={String(cellar.length)}
          sub={
            cellar.length > 0
              ? `${gbp.format(stockValue)} stock value`
              : 'add your first bottle'
          }
        />
        <KpiCard
          label="Par Breaches"
          value={String(breachCount)}
          sub={
            breachCount === 0
              ? lowCount > 0
                ? `${lowCount} low`
                : 'all above reorder'
              : 'order before service'
          }
          tone={
            breachCount > 0
              ? 'urgent'
              : lowCount > 0
                ? 'attention'
                : undefined
          }
        />
        <KpiCard
          label="Invoices Pending"
          value={String(pendingInvoiceCount)}
          sub={
            pendingInvoiceCount > 0
              ? 'awaiting confirmation'
              : 'nothing pending'
          }
          tone={pendingInvoiceCount > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Spillage (30d)"
          value={gbp.format(spillageValue)}
          sub={spillageValue > 0 ? 'logged this month' : 'nothing logged'}
          tone={spillageValue > 50 ? 'attention' : undefined}
        />
      </div>

      <section className="mt-12">
        <SectionHead
          title="Open A Workspace"
          meta="six places to go, each with their job"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DestinationCard
            featured
            name="Cellar"
            tagline="live bottle inventory · par levels · cost per pour"
            href="/bartender/back-bar/cellar"
            iconPath={
              <>
                <ellipse cx="12" cy="6" rx="9" ry="3" />
                <path d="M3 6v12c0 1.7 4 3 9 3s9-1.3 9-3V6" />
                <path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
              </>
            }
            linkLabel="Open Cellar →"
            linkMeta={
              cellar.length > 0
                ? `${cellar.length} items · ${gbp.format(stockValue)} value`
                : 'add your first bottle'
            }
          >
            <StateRow label="Items tracked" value={String(cellar.length)} />
            <StateRow
              label="Par breaches"
              value={breachCount > 0 ? String(breachCount) : '—'}
              tone={breachCount > 0 ? 'urgent' : undefined}
            />
            <StateRow label="Stock value" value={gbp.format(stockValue)} />
          </DestinationCard>

          <DestinationCard
            name="Deliveries"
            tagline="orders out · arrivals in"
            href="/stock-suppliers/deliveries"
            iconPath={
              <>
                <path d="M3 7h13l3 4h2v6h-2" />
                <path d="M3 7v10h13V7" />
                <circle cx="7" cy="18" r="1.5" />
                <circle cx="17" cy="18" r="1.5" />
              </>
            }
            linkLabel="Open Deliveries →"
            linkMeta={
              allocation
                ? `next ${dateFmt.format(new Date(allocation.expected_date as string))}`
                : 'no allocations pending'
            }
          >
            <StateRow
              label="Next allocation"
              value={
                allocation
                  ? dateFmt.format(new Date(allocation.expected_date as string))
                  : '—'
              }
              tone={allocation ? 'attention' : undefined}
            />
            <StateRow
              label="Order to place"
              value={breachCount > 0 ? `${breachCount} items` : '—'}
            />
            <StateRow label="Shared with kitchen" value="yes" />
          </DestinationCard>

          <DestinationCard
            name="Invoices"
            tagline="paperwork · price-check · credit notes"
            href="/stock-suppliers/invoices"
            iconPath={
              <>
                <path d="M6 3h10l4 4v14H6V3z" />
                <path d="M16 3v4h4" />
                <path d="M9 11h7M9 14h7M9 17h5" />
              </>
            }
            linkLabel="Open Invoices →"
            linkMeta={
              pendingInvoiceCount > 0
                ? `${pendingInvoiceCount} pending review`
                : 'all caught up'
            }
          >
            <StateRow
              label="Awaiting review"
              value={String(pendingInvoiceCount)}
              tone={pendingInvoiceCount > 0 ? 'attention' : undefined}
            />
            <StateRow label="Shared with kitchen" value="yes" />
            <StateRow label="Credit notes" value="see The Walk-in" />
          </DestinationCard>

          <DestinationCard
            name="Suppliers"
            tagline="who you buy from · reliability · spend"
            href="/stock-suppliers/suppliers"
            iconPath={
              <>
                <path d="M3 21V8l9-5 9 5v13" />
                <path d="M9 21V12h6v9" />
                <circle cx="12" cy="9" r="1.2" />
              </>
            }
            linkLabel="Open Suppliers →"
            linkMeta="shared with kitchen"
          >
            <StateRow label="On the books" value="see Suppliers" />
            <StateRow label="Reliability" value="0–10 per supplier" />
            <StateRow label="Filter to bar" value="from Suppliers" />
          </DestinationCard>

          <DestinationCard
            name="Spillage & Waste"
            tagline="over-pours · breakage · comps · returns"
            href="/bartender/back-bar/spillage"
            iconPath={
              <>
                <path d="M4 7h16" />
                <path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7" />
                <path d="M9 7V4h6v3" />
                <path d="M10 11v6M14 11v6" />
              </>
            }
            linkLabel="Open Spillage →"
            linkMeta={
              spillageValue > 0
                ? `${gbp.format(spillageValue)} last 30 days`
                : 'nothing logged'
            }
          >
            <StateRow
              label="Value (30d)"
              value={gbp.format(spillageValue)}
              tone={spillageValue > 30 ? 'attention' : undefined}
            />
            <StateRow label="Logged entries" value="see Spillage" />
            <StateRow label="Pattern alerts" value="see Inbox" />
          </DestinationCard>

          <DestinationCard
            name="Transfers"
            tagline="move stock to/from kitchen, other sites"
            href="/bartender/back-bar/transfers"
            iconPath={
              <>
                <path d="M3 12h13" />
                <path d="M12 6l6 6-6 6" />
                <path d="M21 6v12" />
              </>
            }
            linkLabel="Open Transfers →"
            linkMeta={
              transferCounts.outbound_in_transit + transferCounts.inbound_awaiting > 0
                ? `${transferCounts.outbound_in_transit + transferCounts.inbound_awaiting} in flight`
                : 'nothing in flight'
            }
          >
            <StateRow
              label="Outbound"
              value={
                transferCounts.outbound_in_transit > 0
                  ? `${transferCounts.outbound_in_transit} in transit`
                  : '—'
              }
              tone={transferCounts.outbound_in_transit > 0 ? 'attention' : undefined}
            />
            <StateRow
              label="Inbound"
              value={
                transferCounts.inbound_awaiting > 0
                  ? `${transferCounts.inbound_awaiting} awaiting receive`
                  : '—'
              }
              tone={transferCounts.inbound_awaiting > 0 ? 'attention' : undefined}
            />
            <StateRow label="Across" value="bar · kitchen · sites" />
          </DestinationCard>

          <DestinationCard
            name="Stock Take"
            tagline="weekly bottle count · variance check"
            href="/bartender/back-bar/stock-take"
            iconPath={
              <>
                <path d="M9 4h6l2 4h3v12H4V8h3l2-4z" />
                <path d="M9 12h6M9 16h6" />
              </>
            }
            linkLabel="Open Stock Take →"
            linkMeta={
              lastTake
                ? `last take ${dateFmt.format(new Date(lastTake.conducted_at as string))}`
                : 'no takes yet'
            }
          >
            <StateRow
              label="Last take"
              value={
                lastTake
                  ? dateFmt.format(new Date(lastTake.conducted_at as string))
                  : '—'
              }
            />
            <StateRow
              label="Variance"
              value={
                lastTakeVariance != null
                  ? `£${lastTakeVariance.toFixed(2)}`
                  : '—'
              }
              tone={
                lastTakeVariance != null && Math.abs(lastTakeVariance) > 50
                  ? 'attention'
                  : undefined
              }
            />
            <StateRow label="Cadence" value="weekly" />
          </DestinationCard>
        </div>
      </section>

      <LookingAhead siteId={ctx.siteId} surface="back_bar" />
    </div>
  );
}

function hubSubtitle(
  cellarCount: number,
  breachCount: number,
  stockValue: number,
  spillageValue: number,
): string {
  if (cellarCount === 0) {
    return 'Cellar is fresh. Start by adding bottles and setting par levels — the rest of the surfaces grow from there.';
  }
  const parts: string[] = [];
  parts.push(
    `${cellarCount} ${cellarCount === 1 ? 'item' : 'items'} on the shelves worth ${gbp.format(stockValue)}`,
  );
  if (breachCount > 0) {
    parts.push(`${breachCount} under par`);
  }
  if (spillageValue > 30) {
    parts.push(`${gbp.format(spillageValue)} in spillage this month`);
  }
  return parts.join(', ') + '.';
}

function DestinationCard({
  featured,
  name,
  tagline,
  iconPath,
  children,
  linkLabel,
  linkMeta,
  href,
}: {
  featured?: boolean;
  name: string;
  tagline: string;
  iconPath: React.ReactNode;
  children: React.ReactNode;
  linkLabel: string;
  linkMeta: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={
        'bg-card border px-7 py-7 flex flex-col cursor-pointer transition-all hover:border-rule-gold hover:-translate-y-px ' +
        (featured ? 'border-rule-gold lg:col-span-2' : 'border-rule')
      }
    >
      <div className="flex items-center gap-4 mb-5">
        <div className="w-10 h-10 border border-gold rounded-sm flex items-center justify-center text-gold bg-gold-bg flex-shrink-0">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {iconPath}
          </svg>
        </div>
        <div>
          <div className="font-serif font-semibold text-xl text-ink leading-tight">
            {name}
          </div>
          <div className="font-serif italic text-sm text-muted mt-0.5">
            {tagline}
          </div>
        </div>
      </div>

      <div className="flex-1 mb-4">{children}</div>

      <div className="flex items-center justify-between pt-3 border-t border-rule">
        <span className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold">
          {linkLabel}
        </span>
        <div className="font-serif italic text-xs text-muted">{linkMeta}</div>
      </div>
    </Link>
  );
}

function StateRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'urgent' | 'attention';
}) {
  const valueColor =
    tone === 'urgent'
      ? 'text-urgent'
      : tone === 'attention'
        ? 'text-attention'
        : 'text-ink';
  return (
    <div className="flex justify-between items-baseline gap-2 py-1.5 border-b border-rule-soft last:border-b-0">
      <span className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted">
        {label}
      </span>
      <span className={`font-serif text-sm ${valueColor}`}>{value}</span>
    </div>
  );
}
