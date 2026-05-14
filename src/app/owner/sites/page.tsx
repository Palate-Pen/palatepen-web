import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { OwnerPageHeader } from '@/components/owner/OwnerScaffold';
import { SectionHead } from '@/components/shell/SectionHead';

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
  food_cost_30d: number;
};

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
      const [{ count: ingredientCount }, { count: recipeCount }, { data: invoices }] =
        await Promise.all([
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
        ]);
      const foodCost30d = (invoices ?? []).reduce(
        (sum, i) => sum + (Number(i.total) || 0),
        0,
      );
      return {
        id: s.id,
        name: s.name,
        kind: s.kind,
        ingredient_count: ingredientCount ?? 0,
        recipe_count: recipeCount ?? 0,
        food_cost_30d: foodCost30d,
      };
    }),
  );

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1400px] mx-auto">
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
  return (
    <div className="bg-card border border-rule px-7 py-6 flex flex-col gap-3">
      <div>
        <div className="font-display font-semibold text-[10px] tracking-[0.4em] uppercase text-gold">
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
          label="Spend · 30d"
          value={
            site.food_cost_30d > 0
              ? gbp.format(site.food_cost_30d)
              : '£0'
          }
        />
      </div>
      <div className="flex items-center gap-3 mt-2 pt-3 border-t border-rule">
        <Link
          href="/manager"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold hover:text-gold-dark transition-colors"
        >
          Manager view →
        </Link>
        <Link
          href="/"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
        >
          Chef view →
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-3 py-2.5">
      <div className="font-display font-semibold text-[9px] tracking-[0.3em] uppercase text-muted mb-1">
        {label}
      </div>
      <div className="font-serif font-semibold text-sm text-ink">{value}</div>
    </div>
  );
}
