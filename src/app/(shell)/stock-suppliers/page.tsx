import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { LookingAhead } from '@/components/shell/LookingAhead';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import {
  getHubSummary,
  type DeliveryPreview,
  type HubSupplyGraphSignal,
} from '@/lib/hub';
import { getBankSummary } from '@/lib/bank';

export const metadata = { title: 'Stock & Suppliers — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
});

export default async function StockSuppliersPage() {
  const ctx = await getShellContext();
  const [summary, bank] = await Promise.all([
    getHubSummary(ctx.siteId),
    getBankSummary(ctx.siteId),
  ]);

  const todaysSub =
    summary.todays_delivery_suppliers.length > 0
      ? summary.todays_delivery_suppliers.slice(0, 3).join(' · ')
      : summary.todays_deliveries === 0
        ? 'nothing expected today'
        : 'today';

  const wasteTrendSub =
    summary.waste_change_pct == null
      ? summary.waste_this_week_value > 0
        ? 'first week of logging'
        : 'no waste logged'
      : `${summary.waste_change_pct >= 0 ? 'up' : 'down'} ${Math.abs(summary.waste_change_pct).toFixed(0)}% vs last week`;

  return (
    <div className="px-14 pt-12 pb-20 max-w-[1400px]">
      <div className="flex justify-between items-start gap-8 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            The Flow Of Stuff
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
            <em className="text-gold font-semibold not-italic">
              Stock & Suppliers
            </em>
          </h1>
          <p className="font-serif italic text-lg text-muted mt-3">
            {summarySentence(summary)}
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
            <div className="font-serif italic text-xs text-muted mt-0.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="2" width="12" height="20" rx="2" />
                  <path d="M12 18h.01" />
                </svg>
                Use Phone
              </span>
              <span>or upload PDF</span>
            </div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Today's Deliveries"
          value={String(summary.todays_deliveries)}
          sub={todaysSub}
          tone={summary.todays_deliveries > 0 ? 'healthy' : undefined}
        />
        <KpiCard
          label="Suppliers Active"
          value={String(summary.suppliers_active)}
          sub={
            summary.suppliers_with_recent_updates > 0
              ? `${summary.suppliers_with_recent_updates} updated this week`
              : 'on the books'
          }
        />
        <KpiCard
          label="Invoices Pending"
          value={String(summary.invoices_pending)}
          sub={
            summary.invoices_with_discrepancy > 0
              ? `${summary.invoices_with_discrepancy} discrepancy flagged`
              : summary.invoices_pending === 0
                ? 'nothing pending'
                : 'awaiting confirmation'
          }
          tone={summary.invoices_with_discrepancy > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Waste This Week"
          value={
            summary.waste_this_week_value > 0
              ? gbp.format(summary.waste_this_week_value)
              : '£0'
          }
          sub={wasteTrendSub}
          tone={
            summary.waste_change_pct != null && summary.waste_change_pct > 10
              ? 'attention'
              : undefined
          }
        />
      </div>

      <section className="mt-12">
        <SectionHead
          title="Across The Supply Graph"
          meta={supplyGraphMeta(summary.supply_graph_signals)}
        />
        {summary.supply_graph_signals.length === 0 ? (
          <div className="bg-card border border-rule px-10 py-12 text-center">
            <p className="font-serif italic text-muted">
              No current issues across the supply graph. Detectors run daily and will surface anything worth your eye.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {summary.supply_graph_signals.map((s) => (
              <SupplyGraphCard key={s.id} signal={s} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <SectionHead
          title="Open A Workspace"
          meta="five places to go, each with their job"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DestinationCard
            featured
            name="Deliveries"
            tagline="what's arriving today and this week"
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
              summary.upcoming_deliveries.length === 0
                ? 'none in next 7 days'
                : `${summary.upcoming_deliveries.length} in next 7 days`
            }
          >
            {summary.upcoming_deliveries.length === 0 ? (
              <div className="font-serif italic text-sm text-muted py-2">
                Nothing on the books for the next week. Add an expected delivery from the Deliveries tab.
              </div>
            ) : (
              <div className="flex flex-col">
                {summary.upcoming_deliveries.slice(0, 5).map((d, i) => (
                  <DeliveryRow
                    key={d.id}
                    delivery={d}
                    last={i === Math.min(4, summary.upcoming_deliveries.length - 1)}
                  />
                ))}
              </div>
            )}
          </DestinationCard>

          <DestinationCard
            name="Invoices"
            tagline="paperwork, discrepancies, credit notes"
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
              summary.invoices_pending > 0
                ? `${summary.invoices_pending} pending`
                : 'all caught up'
            }
          >
            <StateRow
              label="In the inbox"
              value={String(summary.invoices_pending)}
            />
            <StateRow
              label="Discrepancies flagged"
              value={String(summary.invoices_with_discrepancy)}
              tone={summary.invoices_with_discrepancy > 0 ? 'attention' : undefined}
            />
            <StateRow label="Credit notes in flight" value="—" />
          </DestinationCard>

          <DestinationCard
            name="Suppliers"
            tagline="who you buy from, when, for how much"
            href="/stock-suppliers/suppliers"
            iconPath={
              <>
                <path d="M3 21V8l9-5 9 5v13" />
                <path d="M9 21V12h6v9" />
                <circle cx="12" cy="9" r="1.2" />
              </>
            }
            linkLabel="Open Suppliers →"
            linkMeta={
              summary.suppliers_active > 0
                ? `${summary.suppliers_active} on the books`
                : '+ add new'
            }
          >
            <StateRow
              label="On the books"
              value={String(summary.suppliers_active)}
            />
            <StateRow
              label="With recent updates"
              value={`${summary.suppliers_with_recent_updates} this week`}
            />
            <StateRow
              label="Ordering today"
              value={
                summary.todays_delivery_suppliers.length > 0
                  ? summary.todays_delivery_suppliers[0]
                  : '—'
              }
            />
          </DestinationCard>

          <DestinationCard
            name="The Bank"
            tagline="every ingredient, every price, live"
            href="/stock-suppliers/the-bank"
            iconPath={
              <>
                <ellipse cx="12" cy="6" rx="9" ry="3" />
                <path d="M3 6v12c0 1.7 4 3 9 3s9-1.3 9-3V6" />
                <path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
              </>
            }
            linkLabel="Open The Bank →"
            linkMeta={
              bank.last_update_at
                ? `last update ${dateFmt.format(new Date(bank.last_update_at))}`
                : 'no updates yet'
            }
          >
            <StateRow
              label="Updating in real time"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-healthy animate-pulse" />
                  Live
                </span>
              }
              tone="healthy"
            />
            <StateRow
              label="Ingredients on file"
              value={String(bank.ingredients_on_file)}
            />
            <StateRow
              label="Prices on the move"
              value={
                bank.prices_on_the_move > 0 ? (
                  <>
                    {bank.prices_on_the_move}{' '}
                    <em className="not-italic italic font-serif text-xs text-muted ml-1">
                      this week
                    </em>
                  </>
                ) : (
                  'steady'
                )
              }
              tone={bank.prices_on_the_move > 0 ? 'attention' : undefined}
            />
          </DestinationCard>

          <DestinationCard
            name="Waste"
            tagline="what got binned and why"
            href="/stock-suppliers/waste"
            iconPath={
              <>
                <path d="M4 7h16" />
                <path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7" />
                <path d="M9 7V4h6v3" />
                <path d="M10 11v6M14 11v6" />
              </>
            }
            linkLabel="Open Waste →"
            linkMeta={
              summary.waste_this_week_value > 0
                ? gbp.format(summary.waste_this_week_value)
                : '+ log new'
            }
          >
            <StateRow
              label="This week"
              value={
                summary.waste_this_week_value > 0 ? (
                  <>
                    {gbp.format(summary.waste_this_week_value)}
                    {summary.waste_change_pct != null && (
                      <em className="not-italic italic font-serif text-xs text-muted ml-1">
                        {summary.waste_change_pct >= 0 ? '↑' : '↓'}{' '}
                        {Math.abs(summary.waste_change_pct).toFixed(0)}%
                      </em>
                    )}
                  </>
                ) : (
                  '£0'
                )
              }
              tone={
                summary.waste_change_pct != null && summary.waste_change_pct > 10
                  ? 'attention'
                  : undefined
              }
            />
            <StateRow label="Top category" value="—" />
            <StateRow label="Last logged" value="—" />
          </DestinationCard>
        </div>
      </section>

      <LookingAhead siteId={ctx.siteId} surface="stock-suppliers" />
    </div>
  );
}

function summarySentence(summary: Awaited<ReturnType<typeof getHubSummary>>): string {
  const parts: string[] = [];
  if (summary.todays_deliveries === 0) {
    parts.push('No deliveries today.');
  } else {
    parts.push(
      `${summary.todays_deliveries} ${summary.todays_deliveries === 1 ? 'delivery' : 'deliveries'} today.`,
    );
  }

  const urgentSignals = summary.supply_graph_signals.filter(
    (s) => s.severity === 'urgent',
  );
  if (urgentSignals.length > 0) {
    parts.push(
      `${urgentSignals.length} ${urgentSignals.length === 1 ? 'thing' : 'things'} to deal with.`,
    );
  } else if (summary.supply_graph_signals.length > 0) {
    parts.push('A couple of patterns worth your eye.');
  } else {
    parts.push('Everything moving as it should.');
  }
  return parts.join(' ');
}

function supplyGraphMeta(signals: HubSupplyGraphSignal[]): string {
  if (signals.length === 0) return 'all clear';
  const urgent = signals.filter((s) => s.severity === 'urgent').length;
  const attention = signals.filter((s) => s.severity === 'attention').length;
  const healthy = signals.filter((s) => s.severity === 'healthy').length;
  const parts: string[] = [];
  if (urgent > 0) parts.push(`${urgent} urgent`);
  if (attention > 0) parts.push(`${attention} watch`);
  if (healthy > 0) parts.push(`${healthy} working`);
  return parts.join(' · ');
}

const attentionBorder: Record<HubSupplyGraphSignal['severity'], string> = {
  urgent: 'border-l-4 border-l-urgent',
  attention: 'border-l-4 border-l-attention',
  healthy: 'border-l-4 border-l-healthy',
  info: 'border-l-4 border-l-gold',
};

const attentionLabelColor: Record<HubSupplyGraphSignal['severity'], string> = {
  urgent: 'text-urgent',
  attention: 'text-attention',
  healthy: 'text-healthy',
  info: 'text-gold',
};

function escapeAndBold(md: string): string {
  const escaped = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(
    /\*\*(.+?)\*\*/g,
    '<strong class="not-italic font-semibold text-ink">$1</strong>',
  );
}

function SupplyGraphCard({ signal }: { signal: HubSupplyGraphSignal }) {
  return (
    <div
      className={
        'bg-card border border-rule px-7 py-7 ' + attentionBorder[signal.severity]
      }
    >
      <div className="flex items-baseline justify-between mb-4">
        <div
          className={
            'font-sans font-semibold text-xs tracking-[0.08em] uppercase ' +
            attentionLabelColor[signal.severity]
          }
        >
          {signal.section_label}
        </div>
        <div
          className={
            'font-sans font-semibold text-xs tracking-[0.08em] uppercase ' +
            attentionLabelColor[signal.severity]
          }
        >
          {signal.severity === 'urgent'
            ? 'Urgent'
            : signal.severity === 'attention'
              ? 'Watch'
              : signal.severity === 'healthy'
                ? 'Working'
                : 'Info'}
        </div>
      </div>
      <div className="font-serif text-xl text-ink mb-3 leading-snug">
        {signal.headline_pre}
        {signal.headline_em && (
          <em className="text-gold not-italic font-medium italic">
            {signal.headline_em}
          </em>
        )}
        {signal.headline_post}
      </div>
      <div
        className="font-serif italic text-sm text-muted leading-relaxed mb-4"
        dangerouslySetInnerHTML={{ __html: escapeAndBold(signal.body_md) }}
      />
      {signal.action_label && (
        <div className="flex items-center justify-between pt-3 border-t border-rule">
          <a
            href={signal.action_target ?? '#'}
            className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold hover:text-gold-dark transition-colors"
          >
            {signal.action_label}
          </a>
          {signal.action_context && (
            <div className="font-serif italic text-xs text-muted">
              {signal.action_context}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DeliveryRow({
  delivery,
  last,
}: {
  delivery: DeliveryPreview;
  last: boolean;
}) {
  const statusLabel =
    delivery.status === 'arrived'
      ? 'Arrived'
      : delivery.tone === 'attention'
        ? 'Today'
        : delivery.day_label;
  return (
    <div
      className={
        'flex items-center gap-4 py-3' +
        (last ? '' : ' border-b border-rule-soft')
      }
    >
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted w-8">
        {delivery.day_label}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-serif font-semibold text-sm text-ink">
          {delivery.supplier_name}
        </div>
        <div className="font-serif italic text-xs text-muted">{delivery.sub}</div>
      </div>
      <div
        className={
          'font-sans font-semibold text-xs tracking-[0.08em] uppercase whitespace-nowrap ' +
          (delivery.tone === 'healthy'
            ? 'text-healthy'
            : delivery.tone === 'attention'
              ? 'text-attention'
              : 'text-muted')
        }
      >
        {statusLabel}
      </div>
    </div>
  );
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
  href?: string;
}) {
  const cardBody = (
    <>
      <div className="flex items-center gap-4 mb-5">
        <div className="w-10 h-10 border border-gold rounded-sm flex items-center justify-center text-gold bg-gold-bg flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
    </>
  );

  const className =
    'bg-card border border-rule px-7 py-7 flex flex-col cursor-pointer transition-all hover:border-gold ' +
    (featured ? 'md:col-span-2' : '');

  if (href) {
    return (
      <a href={href} className={className}>
        {cardBody}
      </a>
    );
  }
  return <div className={className}>{cardBody}</div>;
}

function StateRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'healthy' | 'attention';
}) {
  return (
    <div
      className={
        'flex items-baseline justify-between py-2.5 border-b border-rule-soft last:border-b-0'
      }
    >
      <span className="font-serif text-sm text-muted">{label}</span>
      <strong
        className={
          'font-serif font-semibold text-sm ' +
          (tone === 'attention'
            ? 'text-attention'
            : tone === 'healthy'
              ? 'text-healthy'
              : 'text-ink')
        }
      >
        {value}
      </strong>
    </div>
  );
}
