import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getCellarRows } from '@/lib/cellar';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { LookingAhead } from '@/components/shell/LookingAhead';
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
  ]);

  const breachCount = cellar.filter((r) => r.par_status === 'breach').length;
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

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-start gap-8 flex-wrap mb-10">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            The Bottles, The Books, The Stock
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
            Back{' '}
            <em className="text-gold font-semibold not-italic">Bar</em>
          </h1>
          <p className="font-serif italic text-lg text-muted mt-3">
            {hubSubtitle(
              cellar.length,
              breachCount,
              stockValue,
              spillageValue,
            )}
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

      <SectionHead title="Destinations" meta="six places to go" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-rule border border-rule mb-12">
        <DestinationCard
          name="Cellar"
          tagline="live bottle inventory · par levels · cost per pour"
          href="/bartender/back-bar/cellar"
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
          linkLabel="Open Deliveries →"
          linkMeta={
            allocation
              ? `next: ${allocation.name as string} on ${dateFmt.format(new Date(allocation.expected_date as string))}`
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
          <StateRow label="Order to place" value={breachCount > 0 ? `${breachCount} items` : '—'} />
          <StateRow label="Confirmed today" value="—" />
        </DestinationCard>

        <DestinationCard
          name="Invoices"
          tagline="paperwork · price-check · credit notes"
          href="/stock-suppliers/invoices"
          linkLabel="Open Invoices →"
          linkMeta={
            (pendingInvoices.count ?? 0) > 0
              ? `${pendingInvoices.count} pending review`
              : 'all caught up'
          }
        >
          <StateRow
            label="Awaiting review"
            value={String(pendingInvoices.count ?? 0)}
            tone={(pendingInvoices.count ?? 0) > 0 ? 'attention' : undefined}
          />
          <StateRow label="Shared with kitchen" value="yes" />
          <StateRow label="Credit notes" value="see Back Bar" />
        </DestinationCard>

        <DestinationCard
          name="Suppliers"
          tagline="who you buy from · reliability · spend"
          href="/stock-suppliers/suppliers"
          linkLabel="Open Suppliers →"
          linkMeta="shared with kitchen"
        >
          <StateRow label="On the books" value="see Suppliers" />
          <StateRow label="With recent updates" value="—" />
          <StateRow label="Filter to bar" value="from Suppliers" />
        </DestinationCard>

        <DestinationCard
          name="Spillage & Waste"
          tagline="over-pours · breakage · comps · returns"
          href="/bartender/back-bar/spillage"
          linkLabel="Open Spillage →"
          linkMeta={
            spillageValue > 0
              ? `${gbp.format(spillageValue)} in last 30 days`
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
          name="Stock Take"
          tagline="weekly bottle count · variance check"
          href="/bartender/back-bar/stock-take"
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
  name,
  tagline,
  href,
  linkLabel,
  linkMeta,
  children,
}: {
  name: string;
  tagline: string;
  href: string;
  linkLabel: string;
  linkMeta: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="bg-card px-7 py-7 cursor-pointer transition-all hover:bg-paper-warm flex flex-col gap-4"
    >
      <div>
        <div className="font-serif font-semibold text-2xl text-ink mb-1">
          {name}
        </div>
        <div className="font-serif italic text-sm text-muted">{tagline}</div>
      </div>
      <div className="flex-1">{children}</div>
      <div className="pt-3 border-t border-rule flex justify-between items-center gap-3">
        <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold whitespace-nowrap">
          {linkLabel}
        </span>
        <span className="font-serif italic text-xs text-muted text-right">
          {linkMeta}
        </span>
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
