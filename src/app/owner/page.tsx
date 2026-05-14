import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getManagerHomeData } from '@/lib/manager-home';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { OwnerPageHeader } from '@/components/owner/OwnerScaffold';

export const metadata = { title: 'Owner · Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});

export default async function OwnerHomePage() {
  const ctx = await getShellContext();
  // First-pass owner home: jack@ has one site, so we lean on
  // manager-home data and re-frame it through the business-pulse lens.
  // When real multi-site owners onboard, this resolves to a cross-site
  // rollup that fans across every site the owner has membership on.
  const data = await getManagerHomeData(ctx.siteId);

  const foodCostPct =
    data.food_cost_7d > 0 ? estimateFoodCostPct(data.food_cost_7d) : null;

  return (
    <div className="px-14 pt-12 pb-20 max-w-[1400px]">
      <OwnerPageHeader
        eyebrow="The Whole Business"
        title="Owner"
        italic="lens"
        subtitle={subtitle(data)}
        activeSlug="home"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-12">
        <KpiCard
          label="Food Spend · 7d"
          value={data.food_cost_7d > 0 ? gbp.format(data.food_cost_7d) : '£0'}
          sub={`${data.food_cost_count} confirmed`}
        />
        <KpiCard
          label="Outstanding"
          value={
            data.outstanding_invoices_value > 0
              ? gbp.format(data.outstanding_invoices_value)
              : '£0'
          }
          sub={`${data.outstanding_invoices_count} pending`}
          tone={data.outstanding_invoices_count > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Sites"
          value="1"
          sub="single-site mode"
        />
        <KpiCard
          label="Food Cost %"
          value={foodCostPct == null ? '—' : `${foodCostPct.toFixed(0)}%`}
          sub={
            foodCostPct == null
              ? 'covers source pending'
              : foodCostPct > 35
                ? 'above 35% target'
                : 'inside target'
          }
          tone={foodCostPct != null && foodCostPct > 35 ? 'attention' : undefined}
        />
      </div>

      <section className="mt-12">
        <SectionHead
          title="This Week"
          meta="business pulse · drill into any tab"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BusinessTile
            title="Suppliers"
            value={
              data.supplier_spend_90d.length > 0
                ? data.supplier_spend_90d[0].supplier_name
                : '—'
            }
            sub={
              data.supplier_spend_90d.length > 0
                ? `${data.supplier_spend_90d[0].pct.toFixed(0)}% of 90-day spend`
                : 'no confirmed invoices yet'
            }
            href="/owner/suppliers"
          />
          <BusinessTile
            title="Waste"
            value={
              data.waste_7d_value > 0
                ? gbp.format(data.waste_7d_value)
                : '£0'
            }
            sub={
              data.waste_by_category_90d.length > 0
                ? `top: ${data.waste_by_category_90d[0].category}`
                : 'nothing logged'
            }
            href="/owner/sites"
          />
          <BusinessTile
            title="Top Margin"
            value={
              data.top_margin_dishes.length > 0
                ? `${data.top_margin_dishes[0].gp_pct.toFixed(0)}%`
                : '—'
            }
            sub={
              data.top_margin_dishes.length > 0
                ? data.top_margin_dishes[0].name
                : 'no costed dishes yet'
            }
            href="/owner/margins"
          />
        </div>
      </section>

      <section className="mt-12">
        <SectionHead
          title="Sites"
          meta="single-site for now · multi-site rollup once a second site lands"
        />
        <div className="bg-card border border-rule px-7 py-7 flex justify-between items-center flex-wrap gap-4">
          <div>
            <div className="font-serif font-semibold text-xl text-ink">
              {ctx.kitchenName}
            </div>
            <p className="font-serif italic text-sm text-muted mt-1">
              {data.prep_board.total_items > 0
                ? `${data.prep_board.done}/${data.prep_board.total_items} prep done · `
                : ''}
              {data.outstanding_invoices_count > 0
                ? `${data.outstanding_invoices_count} invoices pending`
                : 'caught up'}
            </p>
          </div>
          <Link
            href="/manager"
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-transparent text-gold border border-gold hover:bg-gold hover:text-paper transition-colors"
          >
            Open Manager view →
          </Link>
        </div>
      </section>
    </div>
  );
}

function subtitle(data: Awaited<ReturnType<typeof getManagerHomeData>>): string {
  if (
    data.outstanding_invoices_count === 0 &&
    data.waste_7d_value < 100 &&
    data.food_cost_7d > 0
  ) {
    return 'The business is humming. Food cost banked, nothing pending, waste contained.';
  }
  if (data.outstanding_invoices_count > 0) {
    return `${data.outstanding_invoices_count} invoices need attention. Food cost banked: ${gbp.format(data.food_cost_7d)}.`;
  }
  if (data.food_cost_7d === 0) {
    return 'No invoices banked yet. Scan one and the week starts to take shape.';
  }
  return `${gbp.format(data.food_cost_7d)} food cost banked · ${gbp.format(data.waste_7d_value)} waste this week.`;
}

/**
 * Crude estimate when revenue isn't tracked yet: assume 70% margin
 * target → revenue ≈ food cost / 0.30 → food cost % ≈ 30. We don't
 * actually have revenue input, so this returns null today and will be
 * replaced when a revenue source (POS integration / manual entry)
 * lands. Keeping the function here as the obvious wiring point.
 */
function estimateFoodCostPct(_foodCost: number): number | null {
  void _foodCost;
  return null;
}

function BusinessTile({
  title,
  value,
  sub,
  href,
}: {
  title: string;
  value: string;
  sub: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-card border border-rule px-7 py-6 flex flex-col gap-2 hover:border-rule-gold transition-colors"
    >
      <div className="font-display font-semibold text-[10px] tracking-[0.4em] uppercase text-gold">
        {title}
      </div>
      <div className="font-serif font-medium text-2xl text-ink leading-none">
        {value}
      </div>
      <div className="font-serif italic text-sm text-muted">{sub}</div>
      <div className="mt-2 pt-2 border-t border-rule">
        <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
          Open →
        </span>
      </div>
    </Link>
  );
}
