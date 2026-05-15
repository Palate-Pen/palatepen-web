import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getManagerHomeData } from '@/lib/manager-home';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { LookingAhead } from '@/components/shell/LookingAhead';
import { ForwardCalendar } from '@/components/safety/ForwardCalendar';
import { getForwardCalendar } from '@/lib/safety/forward-calendar';

export const metadata = { title: 'Manager · Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});

const WASTE_CATEGORY_LABEL: Record<string, string> = {
  over_prep: 'Over-prep',
  spoilage: 'Spoilage',
  trim: 'Trim',
  accident: 'Accident',
  customer_return: 'Returned',
  other: 'Other',
};

export default async function ManagerHomePage() {
  const ctx = await getShellContext();
  const [data, calendar] = await Promise.all([
    getManagerHomeData(ctx.siteId),
    getForwardCalendar(ctx.siteId, 14),
  ]);

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="flex justify-between items-start gap-8 flex-wrap mb-8">
        <div className="flex-1 min-w-[280px]">
          <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
            Operations Home
          </div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
            <em className="text-gold font-semibold not-italic">{ctx.kitchenName}</em>
            <span className="text-muted text-xl ml-3 font-medium normal-case tracking-[0.02em]">
              this week
            </span>
          </h1>
          <p className="font-serif italic text-lg text-muted mt-3">
            {subtitle(data)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-12">
        <KpiCard
          label="Food Cost · 7 days"
          value={data.food_cost_7d > 0 ? gbp.format(data.food_cost_7d) : '£0'}
          sub={
            data.food_cost_count === 0
              ? 'no confirmed invoices'
              : `${data.food_cost_count} ${data.food_cost_count === 1 ? 'invoice' : 'invoices'} banked`
          }
        />
        <KpiCard
          label="Outstanding Invoices"
          value={
            data.outstanding_invoices_value > 0
              ? gbp.format(data.outstanding_invoices_value)
              : '£0'
          }
          sub={
            data.outstanding_invoices_count === 0
              ? 'nothing pending'
              : `${data.outstanding_invoices_count} pending${
                  data.outstanding_oldest_days != null && data.outstanding_oldest_days > 7
                    ? ` · oldest ${data.outstanding_oldest_days}d`
                    : ''
                }`
          }
          tone={data.outstanding_invoices_count > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Waste · 7 days"
          value={
            data.waste_7d_value > 0 ? gbp.format(data.waste_7d_value) : '£0'
          }
          sub={
            data.waste_7d_count === 0
              ? 'nothing logged'
              : `${data.waste_7d_count} ${data.waste_7d_count === 1 ? 'entry' : 'entries'}`
          }
          tone={data.waste_7d_value > 200 ? 'attention' : undefined}
        />
        <KpiCard
          label="Covers · 7 days"
          value={data.covers_7d != null ? String(data.covers_7d) : '—'}
          sub={
            data.covers_7d == null
              ? 'covers source pending'
              : 'guests served'
          }
        />
      </div>

      <section className="mt-12">
        <SectionHead
          title="Prep Status · Today"
          meta={`${data.prep_board.done}/${data.prep_board.total_items} done across ${data.prep_stations.length} stations`}
        />
        {data.prep_stations.length === 0 ? (
          <EmptyState
            text="Nothing on the prep board today. The chef can add items from /prep."
            href="/prep"
            cta="Open the prep board →"
          />
        ) : (
          <div className="bg-card border border-rule">
            {data.prep_stations.map((s, i) => (
              <StationRow
                key={s.name}
                station={s}
                last={i === data.prep_stations.length - 1}
              />
            ))}
            <div className="px-7 py-3 bg-paper-warm border-t border-rule flex justify-end">
              <Link
                href="/prep"
                className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold hover:text-gold-dark transition-colors"
              >
                Open the prep board →
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="mt-12">
        <SectionHead
          title="Reporting"
          meta="last 90 days · click a card to drill in"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ReportingCard
            title="Supplier Spend"
            sub="last 90 days · confirmed invoices"
            href="/stock-suppliers/suppliers"
          >
            {data.supplier_spend_90d.length === 0 ? (
              <ReportingEmpty text="No confirmed invoices in the last 90 days." />
            ) : (
              <ReportingList>
                {data.supplier_spend_90d.map((s) => (
                  <ReportingItem
                    key={s.supplier_id ?? s.supplier_name}
                    label={s.supplier_name}
                    value={`${gbp.format(s.total)} · ${s.pct.toFixed(0)}%`}
                  />
                ))}
              </ReportingList>
            )}
          </ReportingCard>

          <ReportingCard
            title="Waste by Category"
            sub="last 90 days"
            href="/stock-suppliers/waste"
          >
            {data.waste_by_category_90d.length === 0 ? (
              <ReportingEmpty text="No waste logged in the last 90 days." />
            ) : (
              <ReportingList>
                {data.waste_by_category_90d.map((w) => (
                  <ReportingItem
                    key={w.category}
                    label={WASTE_CATEGORY_LABEL[w.category] ?? w.category}
                    value={`${gbp.format(w.total)} · ${w.pct.toFixed(0)}%`}
                  />
                ))}
              </ReportingList>
            )}
          </ReportingCard>

          <ReportingCard
            title="Top Margins"
            sub="dishes pulling the heaviest weight"
            href="/margins"
          >
            {data.top_margin_dishes.length === 0 ? (
              <ReportingEmpty text="No costed dishes yet. Set sell prices in Recipes." />
            ) : (
              <ReportingList>
                {data.top_margin_dishes.map((d) => (
                  <ReportingItem
                    key={d.recipe_id}
                    label={d.name}
                    value={
                      <Link
                        href={`/margins/${d.recipe_id}`}
                        className="font-serif font-semibold text-sm text-healthy hover:text-healthy/70 transition-colors"
                      >
                        {d.gp_pct.toFixed(0)}% margin
                      </Link>
                    }
                  />
                ))}
              </ReportingList>
            )}
          </ReportingCard>

          <ReportingCard
            title="Staffing · This Week"
            sub="rota schema pending"
          >
            <div className="font-serif italic text-sm text-muted leading-relaxed">
              Rota, payroll and coverage gaps surface here once the team schema lands. For now the manager works the kitchen — staffing data lives in your head.
            </div>
          </ReportingCard>
        </div>
      </section>

      <section className="mt-12">
        <SectionHead
          title="Manager Surfaces"
          meta={`${LIVE_TAB_COUNT} live${PENDING_TAB_COUNT > 0 ? ` · ${PENDING_TAB_COUNT} pending design` : ''}`}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-rule border border-rule">
          {MANAGER_TABS.map((tab) => (
            <TabCard key={tab.name} tab={tab} />
          ))}
        </div>
      </section>

      <ForwardCalendar days={14} items={calendar} />
      <LookingAhead siteId={ctx.siteId} surface="manager_home" />
    </div>
  );
}

function subtitle(data: ManagerHomeData): string {
  const parts: string[] = [];
  if (data.outstanding_invoices_count > 0) {
    parts.push(
      `${data.outstanding_invoices_count} invoices need attention (${gbp.format(data.outstanding_invoices_value)})`,
    );
  }
  if (data.prep_board.not_started > 0) {
    parts.push(
      `${data.prep_board.not_started} prep items still to start`,
    );
  }
  if (parts.length === 0) {
    return 'The site is operating cleanly. Everything’s where it should be.';
  }
  return parts.join(' · ');
}

type ManagerHomeData = Awaited<ReturnType<typeof getManagerHomeData>>;

function StationRow({
  station,
  last,
}: {
  station: {
    name: string;
    primary_chef: string | null;
    done: number;
    in_progress: number;
    not_started: number;
    total: number;
  };
  last: boolean;
}) {
  const pct =
    station.total === 0
      ? 0
      : Math.round((station.done / station.total) * 100);
  const tone =
    pct === 100
      ? 'text-healthy'
      : pct >= 50
        ? 'text-ink'
        : 'text-attention';

  return (
    <div
      className={
        'grid grid-cols-1 md:grid-cols-[2fr_1fr_120px] gap-4 px-7 py-4 items-center ' +
        (last ? '' : 'border-b border-rule-soft')
      }
    >
      <div>
        <div className="font-serif font-semibold text-base text-ink">
          {station.name}
        </div>
        {station.primary_chef && (
          <div className="font-serif italic text-xs text-muted mt-0.5">
            {station.primary_chef}
          </div>
        )}
      </div>
      <div className={'font-serif font-semibold text-sm ' + tone}>
        {station.done} of {station.total} done · {pct}%
      </div>
      <div className="font-serif italic text-xs text-muted text-right">
        {station.in_progress > 0 && `${station.in_progress} in progress · `}
        {station.not_started > 0 && `${station.not_started} to start`}
        {station.in_progress === 0 && station.not_started === 0 && 'all done'}
      </div>
    </div>
  );
}

function ReportingCard({
  title,
  sub,
  href,
  children,
}: {
  title: string;
  sub: string;
  href?: string;
  children: React.ReactNode;
}) {
  const body = (
    <div className="bg-card border border-rule px-7 py-6 h-full flex flex-col hover:border-rule-gold transition-colors">
      <div className="mb-4">
        <div className="font-serif font-semibold text-xl text-ink leading-tight">
          {title}
        </div>
        <div className="font-serif italic text-sm text-muted mt-1">
          {sub}
        </div>
      </div>
      <div className="flex-1">{children}</div>
      {href && (
        <div className="mt-4 pt-3 border-t border-rule">
          <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
            Open →
          </span>
        </div>
      )}
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="contents">
        {body}
      </Link>
    );
  }
  return body;
}

function ReportingList({ children }: { children: React.ReactNode }) {
  return <ul className="flex flex-col">{children}</ul>;
}

function ReportingItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <li className="flex justify-between items-baseline py-2 border-b border-rule-soft last:border-b-0 gap-3">
      <span className="font-serif text-sm text-ink-soft min-w-0 truncate">
        {label}
      </span>
      <strong className="font-serif font-semibold text-sm text-ink whitespace-nowrap">
        {value}
      </strong>
    </li>
  );
}

function ReportingEmpty({ text }: { text: string }) {
  return (
    <div className="font-serif italic text-sm text-muted leading-relaxed">
      {text}
    </div>
  );
}

function EmptyState({
  text,
  href,
  cta,
}: {
  text: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="bg-card border border-rule px-10 py-10 text-center">
      <p className="font-serif italic text-muted">{text}</p>
      {href && cta && (
        <Link
          href={href}
          className="inline-block mt-4 font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold hover:text-gold-dark transition-colors"
        >
          {cta}
        </Link>
      )}
    </div>
  );
}

const MANAGER_TABS: Array<{
  name: string;
  href: string | null;
  status: 'live' | 'soon';
  description: string;
}> = [
  { name: 'Home', href: null, status: 'live', description: 'this page' },
  {
    name: 'Dishes',
    href: '/manager/dishes',
    status: 'live',
    description: 'every recipe + spec across food and bar in one library',
  },
  {
    name: 'Menu Builder',
    href: '/manager/menu-builder',
    status: 'live',
    description: 'design + cost the menu, planning view too',
  },
  { name: 'Team', href: '/manager/team', status: 'live', description: 'brigade, rotas, permissions' },
  { name: 'P&L', href: '/manager/pl', status: 'live', description: 'GP, food cost, labour, waste' },
  { name: 'Deliveries', href: '/manager/deliveries', status: 'live', description: 'site-level intake oversight' },
  { name: 'Suppliers', href: '/manager/suppliers', status: 'live', description: 'reliability, terms, contracts' },
  { name: 'Service Notes', href: '/manager/service-notes', status: 'live', description: 'what went well, what didn’t' },
  { name: 'Compliance', href: '/manager/compliance', status: 'live', description: 'HACCP, allergens, sign-offs' },
  { name: 'Reports', href: '/manager/reports', status: 'live', description: 'period reports, year-on-year' },
  { name: 'Settings', href: '/manager/settings', status: 'live', description: 'site preferences' },
];

const LIVE_TAB_COUNT = MANAGER_TABS.filter((t) => t.status === 'live').length;
const PENDING_TAB_COUNT = MANAGER_TABS.length - LIVE_TAB_COUNT;

function TabCard({
  tab,
}: {
  tab: { name: string; href: string | null; status: 'live' | 'soon'; description: string };
}) {
  const inner = (
    <div
      className={
        'bg-card px-6 py-5 h-full flex flex-col ' +
        (tab.status === 'soon' ? 'opacity-60' : '')
      }
    >
      <div
        className={
          'font-display font-semibold text-[11px] tracking-[0.3em] uppercase mb-2 ' +
          (tab.status === 'live' ? 'text-gold' : 'text-muted')
        }
      >
        {tab.status === 'live' ? 'Live' : 'Mockup pending'}
      </div>
      <div className="font-serif font-semibold text-base text-ink mb-1">
        {tab.name}
      </div>
      <p className="font-serif italic text-xs text-muted flex-1">
        {tab.description}
      </p>
    </div>
  );
  if (tab.href && tab.status === 'live') {
    return (
      <Link href={tab.href} className="contents">
        <div className="cursor-pointer hover:bg-paper-warm transition-colors">
          {inner}
        </div>
      </Link>
    );
  }
  return <div>{inner}</div>;
}
