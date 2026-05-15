import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getManagerHomeData } from '@/lib/manager-home';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { LookingAhead } from '@/components/shell/LookingAhead';
import { OwnerPageHeader } from '@/components/owner/OwnerScaffold';

export const metadata = { title: 'Owner · Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});

export default async function OwnerHomePage() {
  const ctx = await getShellContext();

  // Fan across every site this owner has membership on so KPIs aggregate
  // the group, not just the chef's primary site.
  const supabase = await createSupabaseServerClient();
  const { data: ownerMemberships } = await supabase
    .from('memberships')
    .select('site_id, sites:site_id (name)')
    .eq('user_id', ctx.userId)
    .eq('role', 'owner');
  const ownedSites = (ownerMemberships ?? []) as unknown as Array<{
    site_id: string;
    sites: { name: string | null } | null;
  }>;

  // Fallback to the primary site if no owner memberships (shouldn't happen
  // in this shell — gated above — but keeps the page resilient).
  const siteIdsToRoll =
    ownedSites.length > 0
      ? ownedSites.map((s) => s.site_id)
      : [ctx.siteId];

  const perSite = await Promise.all(
    siteIdsToRoll.map((id) =>
      getManagerHomeData(id).then((d) => ({ siteId: id, data: d })),
    ),
  );

  // Roll up the cross-site totals
  const data = perSite.reduce<ReturnType<typeof emptyRollup>>((acc, p) => {
    acc.food_cost_7d += p.data.food_cost_7d;
    acc.food_cost_count += p.data.food_cost_count;
    acc.outstanding_invoices_value += p.data.outstanding_invoices_value;
    acc.outstanding_invoices_count += p.data.outstanding_invoices_count;
    acc.waste_7d_value += p.data.waste_7d_value;
    acc.waste_7d_count += p.data.waste_7d_count;
    acc.prep_board.total_items += p.data.prep_board.total_items;
    acc.prep_board.done += p.data.prep_board.done;
    // Take the busiest supplier across the group for the headline tile
    if (p.data.supplier_spend_90d.length > 0) {
      const top = p.data.supplier_spend_90d[0];
      if (top.total > acc._topSupplierTotal) {
        acc._topSupplierTotal = top.total;
        acc.top_supplier_name = top.supplier_name;
        acc.top_supplier_pct = top.pct;
      }
    }
    if (p.data.top_margin_dishes.length > 0) {
      const d = p.data.top_margin_dishes[0];
      if (d.gp_pct > acc._topMarginPct) {
        acc._topMarginPct = d.gp_pct;
        acc.top_margin_name = d.name;
        acc.top_margin_pct = d.gp_pct;
      }
    }
    if (p.data.waste_by_category_90d.length > 0) {
      acc.waste_top_category = p.data.waste_by_category_90d[0].category;
    }
    return acc;
  }, emptyRollup());

  const foodCostPct =
    data.food_cost_7d > 0 ? estimateFoodCostPct(data.food_cost_7d) : null;
  const siteCount = ownedSites.length || 1;

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
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
          value={String(siteCount)}
          sub={siteCount === 1 ? 'single-site mode' : 'group rollup'}
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
            title="Top Supplier"
            value={data.top_supplier_name ?? '—'}
            sub={
              data.top_supplier_name
                ? `${data.top_supplier_pct.toFixed(0)}% of 90-day spend`
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
              data.waste_top_category
                ? `top: ${data.waste_top_category}`
                : 'nothing logged'
            }
            href="/owner/sites"
          />
          <BusinessTile
            title="Top Margin"
            value={
              data.top_margin_name
                ? `${data.top_margin_pct.toFixed(0)}%`
                : '—'
            }
            sub={data.top_margin_name ?? 'no costed dishes yet'}
            href="/owner/margins"
          />
        </div>
      </section>

      <section className="mt-12">
        <SectionHead
          title="Sites"
          meta={
            siteCount === 1
              ? 'single-site for now'
              : `${siteCount} sites in the group`
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {perSite.map((p) => {
            const site = ownedSites.find((s) => s.site_id === p.siteId);
            const name = site?.sites?.name ?? 'Site';
            return (
              <div
                key={p.siteId}
                className="bg-card border border-rule px-7 py-7 flex justify-between items-center flex-wrap gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-serif font-semibold text-xl text-ink">
                    {name}
                  </div>
                  <p className="font-serif italic text-sm text-muted mt-1">
                    {p.data.prep_board.total_items > 0
                      ? `${p.data.prep_board.done}/${p.data.prep_board.total_items} prep done · `
                      : ''}
                    {p.data.outstanding_invoices_count > 0
                      ? `${p.data.outstanding_invoices_count} invoices pending`
                      : 'caught up'}
                  </p>
                </div>
                <Link
                  href="/owner/sites"
                  className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-transparent text-gold border border-gold hover:bg-gold hover:text-paper transition-colors"
                >
                  Drill in →
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      <LookingAhead siteId={ctx.siteId} surface="owner_home" />
    </div>
  );
}

function emptyRollup() {
  return {
    food_cost_7d: 0,
    food_cost_count: 0,
    outstanding_invoices_value: 0,
    outstanding_invoices_count: 0,
    waste_7d_value: 0,
    waste_7d_count: 0,
    prep_board: { total_items: 0, done: 0 },
    top_supplier_name: null as string | null,
    top_supplier_pct: 0,
    _topSupplierTotal: 0,
    top_margin_name: null as string | null,
    top_margin_pct: 0,
    _topMarginPct: 0,
    waste_top_category: null as string | null,
  };
}

function subtitle(data: ReturnType<typeof emptyRollup>): string {
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
      <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold">
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
