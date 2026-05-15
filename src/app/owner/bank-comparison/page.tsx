import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { OwnerPageHeader } from '@/components/owner/OwnerScaffold';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { PrintButton } from '@/components/shell/PrintButton';

export const metadata = { title: 'Bank Comparison — Owner — Palatable' };

const gbp4 = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 4,
});

const SPREAD_THRESHOLD = 0.05; // ≥5% variance flags the row

/**
 * Cross-site Bank comparison: same ingredient name (case-insensitive,
 * trimmed) compared across every site the owner has. Surfaces "where
 * the group is paying different prices for the same thing".
 *
 * Phase 3 Roadmap closes: Group-level reporting across sites,
 * cross-outlet stock view.
 */
export default async function OwnerBankComparisonPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id, sites:site_id (id, name)')
    .eq('user_id', user.id)
    .eq('role', 'owner');
  const sites = (memberships ?? [])
    .map((m) => m.sites as unknown as { id: string; name: string } | null)
    .filter((s): s is { id: string; name: string } => s !== null);

  if (sites.length === 0) {
    redirect('/owner');
  }

  // Pull every ingredient across every owner site
  const siteIds = sites.map((s) => s.id);
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, site_id, name, unit, current_price, category')
    .in('site_id', siteIds)
    .order('name', { ascending: true });

  // Group by lowercased trimmed name. Each entry has prices keyed by site.
  type ComparisonRow = {
    name: string;
    category: string | null;
    unit: string | null;
    prices: Map<string, number | null>;
    /** Highest minus lowest as a % of the lowest. */
    spreadPct: number | null;
    presentInCount: number;
  };
  const grouped = new Map<string, ComparisonRow>();
  for (const i of ingredients ?? []) {
    const key = (i.name as string).trim().toLowerCase();
    const entry: ComparisonRow = grouped.get(key) ?? {
      name: i.name as string,
      category: (i.category as string | null) ?? null,
      unit: (i.unit as string | null) ?? null,
      prices: new Map<string, number | null>(),
      spreadPct: null,
      presentInCount: 0,
    };
    entry.prices.set(
      i.site_id as string,
      i.current_price == null ? null : Number(i.current_price),
    );
    entry.presentInCount = entry.prices.size;
    grouped.set(key, entry);
  }

  // Compute spread per row
  for (const row of grouped.values()) {
    const numericPrices = Array.from(row.prices.values()).filter(
      (p): p is number => p != null,
    );
    if (numericPrices.length >= 2) {
      const lo = Math.min(...numericPrices);
      const hi = Math.max(...numericPrices);
      row.spreadPct = lo > 0 ? (hi - lo) / lo : null;
    }
  }

  // Sort: shared-across-sites first (descending spread), then single-site
  const allRows = Array.from(grouped.values()).sort((a, b) => {
    if (a.presentInCount !== b.presentInCount)
      return b.presentInCount - a.presentInCount;
    return (b.spreadPct ?? -1) - (a.spreadPct ?? -1);
  });

  const sharedRows = allRows.filter((r) => r.presentInCount >= 2);
  const flaggedRows = sharedRows.filter(
    (r) => r.spreadPct != null && r.spreadPct >= SPREAD_THRESHOLD,
  );

  return (
    <div className="printable px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-2">
        <div className="flex-1 min-w-[280px]">
          <OwnerPageHeader
            eyebrow="Same Thing, Different Price"
            title="Bank"
            italic="Comparison"
            subtitle="Where the group is paying different prices for the same ingredient. Lowest in healthy green, highest in attention orange when the spread is ≥5%."
            activeSlug="sites"
          />
        </div>
        <div className="print-hide pt-2">
          {sharedRows.length > 0 && (
            <PrintButton label="Print comparison" />
          )}
        </div>
      </div>

      {sites.length < 2 ? (
        <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-6">
          <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-gold mb-2">
            Single-site account
          </div>
          <p className="font-serif italic text-sm text-ink-soft">
            This comparison lights up once you have two or more sites in
            the group. Today this account has just one.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
            <KpiCard
              label="Sites Compared"
              value={String(sites.length)}
              sub={sites.map((s) => s.name).join(' · ')}
            />
            <KpiCard
              label="Ingredients Tracked"
              value={String(allRows.length)}
              sub={`${sharedRows.length} on more than one site`}
            />
            <KpiCard
              label="Flagged Spreads"
              value={String(flaggedRows.length)}
              sub={`≥${(SPREAD_THRESHOLD * 100).toFixed(0)}% price variance`}
              tone={flaggedRows.length > 0 ? 'attention' : 'healthy'}
            />
            <KpiCard
              label="Single-Site"
              value={String(allRows.length - sharedRows.length)}
              sub="not on the comparison"
            />
          </div>

          {sharedRows.length === 0 ? (
            <div className="bg-card border border-rule px-10 py-12 text-center">
              <p className="font-serif italic text-muted">
                No ingredients are on more than one site yet. Once two sites
                stock the same item, the comparison lights up here.
              </p>
            </div>
          ) : (
            <>
              <SectionHead
                title="Cross-Site Ingredients"
                meta={`${sharedRows.length} ${sharedRows.length === 1 ? 'item' : 'items'} on 2+ sites`}
              />
              <ComparisonTable rows={sharedRows} sites={sites} />
            </>
          )}
        </>
      )}

      <div className="mt-10 print-hide">
        <Link
          href="/owner/sites"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
        >
          ← Back to Sites
        </Link>
      </div>
    </div>
  );
}

function ComparisonTable({
  rows,
  sites,
}: {
  rows: {
    name: string;
    category: string | null;
    unit: string | null;
    prices: Map<string, number | null>;
    spreadPct: number | null;
    presentInCount: number;
  }[];
  sites: { id: string; name: string }[];
}) {
  const gridCols = `2fr 90px ${sites.map(() => '110px').join(' ')} 100px`;

  return (
    <div className="bg-card border border-rule overflow-x-auto">
      <div
        className="hidden md:grid gap-3 px-7 py-3.5 bg-paper-warm border-b border-rule"
        style={{ gridTemplateColumns: gridCols }}
      >
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted">
          Ingredient
        </div>
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted">
          Unit
        </div>
        {sites.map((s) => (
          <div
            key={s.id}
            className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted truncate"
            title={s.name}
          >
            {s.name}
          </div>
        ))}
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted text-right">
          Spread
        </div>
      </div>
      {rows.map((row, i) => {
        const numericPrices = Array.from(row.prices.values()).filter(
          (p): p is number => p != null,
        );
        const lo = numericPrices.length > 0 ? Math.min(...numericPrices) : null;
        const hi = numericPrices.length > 0 ? Math.max(...numericPrices) : null;
        const flagged = row.spreadPct != null && row.spreadPct >= SPREAD_THRESHOLD;
        return (
          <div
            key={`${row.name}-${i}`}
            className={
              'grid gap-3 px-7 py-3 items-center ' +
              (i < rows.length - 1 ? 'border-b border-rule-soft' : '')
            }
            style={{ gridTemplateColumns: gridCols }}
          >
            <div>
              <div className="font-serif font-semibold text-sm text-ink">
                {row.name}
              </div>
              {row.category && (
                <div className="font-serif italic text-xs text-muted">
                  {row.category}
                </div>
              )}
            </div>
            <div className="font-serif text-xs text-muted">
              {row.unit ?? '—'}
            </div>
            {sites.map((s) => {
              const p = row.prices.get(s.id);
              if (p == null) {
                return (
                  <div
                    key={s.id}
                    className="font-serif italic text-xs text-muted-soft"
                  >
                    —
                  </div>
                );
              }
              const isLo = flagged && lo != null && p === lo;
              const isHi = flagged && hi != null && p === hi;
              const cellClass = isLo
                ? 'text-healthy font-semibold'
                : isHi
                  ? 'text-attention font-semibold'
                  : 'text-ink';
              return (
                <div
                  key={s.id}
                  className={`font-serif text-sm ${cellClass}`}
                >
                  {gbp4.format(p)}
                </div>
              );
            })}
            <div
              className={
                'font-serif font-semibold text-sm text-right ' +
                (flagged
                  ? 'text-attention'
                  : row.spreadPct == null
                    ? 'text-muted-soft'
                    : 'text-muted')
              }
            >
              {row.spreadPct == null
                ? '—'
                : `${(row.spreadPct * 100).toFixed(0)}%`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
