import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { OwnerPageHeader } from '@/components/owner/OwnerScaffold';
import { SectionHead } from '@/components/shell/SectionHead';
import { PrintButton } from '@/components/shell/PrintButton';
import { KpiCard } from '@/components/shell/KpiCard';

export const metadata = { title: 'Sites — Owner — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});

type SiteRow = {
  id: string;
  name: string;
  kind: string;
  ingredient_count: number;
  recipe_count: number;
  priced_count: number;
  avg_gp_pct: number | null;
  food_cost_30d: number;
  par_breach_count: number;
  open_po_count: number;
  waste_30d_value: number;
};

const DRIFT_THRESHOLD = 0.03;

export default async function OwnerSitesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id, role, sites:site_id (id, name, kind)')
    .eq('user_id', user.id)
    .eq('role', 'owner');

  const sites = (memberships ?? [])
    .map(
      (m) =>
        (m.sites as unknown as {
          id: string;
          name: string;
          kind: string;
        } | null) ?? null,
    )
    .filter((s): s is { id: string; name: string; kind: string } => s !== null);

  const thirtyAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const rows: SiteRow[] = await Promise.all(
    sites.map(async (s) => {
      const [
        { count: ingredientCount },
        { count: recipeCount },
        { data: invoices },
        { data: bankRows },
        { count: openPoCount },
        { data: wasteRows },
        { data: pricedRecipes },
      ] = await Promise.all([
        supabase
          .from('ingredients')
          .select('id', { count: 'exact', head: true })
          .eq('site_id', s.id),
        supabase
          .from('recipes')
          .select('id', { count: 'exact', head: true })
          .eq('site_id', s.id)
          .is('archived_at', null),
        supabase
          .from('invoices')
          .select('total, status, received_at')
          .eq('site_id', s.id)
          .eq('status', 'confirmed')
          .gte('received_at', thirtyAgoIso),
        supabase
          .from('ingredients')
          .select('par_level, current_stock')
          .eq('site_id', s.id),
        supabase
          .from('purchase_orders')
          .select('id', { count: 'exact', head: true })
          .eq('site_id', s.id)
          .in('status', ['draft', 'sent', 'confirmed']),
        supabase
          .from('waste_entries')
          .select('value')
          .eq('site_id', s.id)
          .gte('logged_at', thirtyAgoIso),
        supabase
          .from('recipes')
          .select('sell_price, cost_baseline')
          .eq('site_id', s.id)
          .is('archived_at', null)
          .not('sell_price', 'is', null)
          .not('cost_baseline', 'is', null),
      ]);

      const foodCost30d = (invoices ?? []).reduce(
        (sum, i) => sum + (Number(i.total) || 0),
        0,
      );
      const parBreaches = (bankRows ?? []).filter((r) => {
        const par = r.par_level == null ? null : Number(r.par_level);
        const cur = r.current_stock == null ? null : Number(r.current_stock);
        return par != null && cur != null && cur < par;
      }).length;
      const wasteValue = (wasteRows ?? []).reduce(
        (sum, w) =>
          sum + Number((w as { value?: number | null }).value ?? 0),
        0,
      );
      const priced = (pricedRecipes ?? []).map((r) => ({
        sell: Number(r.sell_price),
        cost: Number(r.cost_baseline),
      }));
      const avgGp =
        priced.length === 0
          ? null
          : priced.reduce(
              (acc, r) =>
                acc + (r.sell > 0 ? ((r.sell - r.cost) / r.sell) * 100 : 0),
              0,
            ) / priced.length;

      return {
        id: s.id,
        name: s.name,
        kind: s.kind,
        ingredient_count: ingredientCount ?? 0,
        recipe_count: recipeCount ?? 0,
        priced_count: priced.length,
        avg_gp_pct: avgGp,
        food_cost_30d: foodCost30d,
        par_breach_count: parBreaches,
        open_po_count: openPoCount ?? 0,
        waste_30d_value: wasteValue,
      };
    }),
  );

  // Group totals for the strip
  const totalIngredients = rows.reduce((s, r) => s + r.ingredient_count, 0);
  const totalSpend30d = rows.reduce((s, r) => s + r.food_cost_30d, 0);
  const totalPoBreaches = rows.reduce((s, r) => s + r.par_breach_count, 0);
  const totalOpenPOs = rows.reduce((s, r) => s + r.open_po_count, 0);

  return (
    <div className="printable px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-2">
        <div className="flex-1 min-w-[280px]">
          <OwnerPageHeader
            eyebrow="Every Kitchen You Own"
            title="Sites"
            subtitle={
              rows.length === 1
                ? 'Single-site for now. Add a second site and the cross-site rollups light up.'
                : `${rows.length} sites under one roof. Drill into any one to see it as the Manager would.`
            }
            activeSlug="sites"
          />
        </div>
        <div className="print-hide pt-2">
          {rows.length > 0 && <PrintButton label="Print site list" />}
        </div>
      </div>

      {rows.length > 1 && (
        <div className="flex items-center justify-end mb-4 print-hide">
          <Link
            href="/owner/bank-comparison"
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 border border-gold text-gold hover:bg-gold hover:text-paper transition-colors"
          >
            Cross-site Bank →
          </Link>
        </div>
      )}

      {rows.length > 1 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
          <KpiCard
            label="Group Sites"
            value={String(rows.length)}
            sub={`${totalIngredients} ingredients on file`}
          />
          <KpiCard
            label="Spend · 30d"
            value={gbp.format(totalSpend30d)}
            sub="confirmed invoices, all sites"
          />
          <KpiCard
            label="Par Breaches"
            value={String(totalPoBreaches)}
            sub={
              totalPoBreaches === 0 ? 'all stocked' : 'across the group'
            }
            tone={totalPoBreaches > 0 ? 'attention' : 'healthy'}
          />
          <KpiCard
            label="Open POs"
            value={String(totalOpenPOs)}
            sub={totalOpenPOs === 0 ? 'nothing in flight' : 'group-wide'}
          />
        </div>
      )}

      <section>
        <SectionHead
          title="Active Sites"
          meta={`${rows.length} ${rows.length === 1 ? 'site' : 'sites'}`}
        />
        {rows.length === 0 ? (
          <div className="bg-card border border-rule px-10 py-12 text-center">
            <p className="font-serif italic text-muted">
              No sites yet. Sign up creates the first site automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rows.map((s) => (
              <SiteCard key={s.id} site={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SiteCard({ site }: { site: SiteRow }) {
  const gpTone =
    site.avg_gp_pct == null
      ? undefined
      : site.avg_gp_pct >= 65
        ? 'healthy'
        : site.avg_gp_pct >= 55
          ? 'attention'
          : 'urgent';
  return (
    <div className="bg-card border border-rule px-7 py-6 flex flex-col gap-3">
      <div>
        <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-gold">
          {site.kind}
        </div>
        <div className="font-serif font-semibold text-xl text-ink mt-1">
          {site.name}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px bg-rule border border-rule">
        <Stat label="Ingredients" value={String(site.ingredient_count)} />
        <Stat label="Recipes" value={String(site.recipe_count)} />
        <Stat
          label="Avg GP"
          value={
            site.avg_gp_pct == null
              ? '—'
              : `${site.avg_gp_pct.toFixed(0)}%`
          }
          tone={gpTone}
        />
      </div>

      <div className="grid grid-cols-3 gap-px bg-rule border border-rule">
        <Stat
          label="Spend · 30d"
          value={
            site.food_cost_30d > 0 ? gbp.format(site.food_cost_30d) : '£0'
          }
        />
        <Stat
          label="Par breaches"
          value={String(site.par_breach_count)}
          tone={site.par_breach_count > 0 ? 'attention' : undefined}
        />
        <Stat
          label="Open POs"
          value={String(site.open_po_count)}
          tone={site.open_po_count > 0 ? 'attention' : undefined}
        />
      </div>

      {site.waste_30d_value > 0 && (
        <div className="font-serif italic text-xs text-muted">
          Waste 30d: {gbp.format(site.waste_30d_value)}
        </div>
      )}

      <div className="flex items-center gap-3 mt-2 pt-3 border-t border-rule">
        <Link
          href="/manager"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold hover:text-gold-dark transition-colors"
        >
          Manager view →
        </Link>
        <Link
          href={site.kind === 'bar' ? '/bartender' : '/'}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
        >
          {site.kind === 'bar' ? 'Bar view →' : 'Chef view →'}
        </Link>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'healthy' | 'attention' | 'urgent';
}) {
  const toneClass =
    tone === 'healthy'
      ? 'text-healthy'
      : tone === 'attention'
        ? 'text-attention'
        : tone === 'urgent'
          ? 'text-urgent'
          : 'text-ink';
  return (
    <div className="bg-card px-3 py-2.5">
      <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-muted mb-1">
        {label}
      </div>
      <div className={`font-serif font-semibold text-sm ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

// Avoid unused import warning during build for DRIFT_THRESHOLD
void DRIFT_THRESHOLD;
