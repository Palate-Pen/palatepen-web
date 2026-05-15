import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getBarHomeRollup } from '@/lib/bar';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { LookingAhead } from '@/components/shell/LookingAhead';

export const metadata = { title: 'Bar — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});

function timeOfDay(now: Date): { eyebrow: string; greeting: string } {
  const h = now.getHours();
  if (h < 12) return { eyebrow: 'Behind The Bar', greeting: 'Morning' };
  if (h < 17) return { eyebrow: 'Service Coming', greeting: 'Afternoon' };
  return { eyebrow: 'Service Tonight', greeting: 'Evening' };
}

export default async function BartenderHomePage() {
  const ctx = await getShellContext();
  const rollup = await getBarHomeRollup(ctx.siteId);
  const tod = timeOfDay(new Date());

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="mb-12">
        <div className="font-display text-xs font-semibold tracking-[0.5em] uppercase text-gold mb-3.5">
          {tod.eyebrow}
        </div>
        <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] md:text-4xl text-ink">
          {tod.greeting},{' '}
          <em className="text-gold font-medium">{ctx.firstName}</em>
          .
        </h1>
        <p className="font-serif italic text-lg text-muted mt-3.5 tracking-[0.01em]">
          {summarySentence(rollup)}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-12">
        <KpiCard
          label="Specs"
          value={String(rollup.specs_total)}
          sub={
            rollup.specs_total === 0
              ? 'add your first drink'
              : specsSub(rollup.specs_by_type)
          }
        />
        <KpiCard
          label="Par Breaches"
          value={String(rollup.par_breaches)}
          sub={
            rollup.par_breaches === 0
              ? 'cellar is stocked'
              : rollup.par_breach_names.slice(0, 2).join(' · ')
          }
          tone={rollup.par_breaches > 0 ? 'urgent' : undefined}
        />
        <KpiCard
          label="Cellar Value"
          value={gbp.format(rollup.cellar_stock_value)}
          sub="stock at hand"
        />
        <KpiCard
          label="Spillage (7d)"
          value={gbp.format(rollup.spillage_value_this_week)}
          sub={
            rollup.spillage_value_this_week === 0
              ? 'no spillage logged'
              : 'over-pours, breakage, comps'
          }
          tone={rollup.spillage_value_this_week > 20 ? 'attention' : undefined}
        />
      </div>

      <section className="mb-12">
        <SectionHead
          title="Tonight's Bar"
          meta={
            rollup.specs_total === 0
              ? 'specs not set up yet'
              : `${rollup.specs_total} on the list`
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Panel
            title="Cocktails"
            count={
              rollup.specs_by_type.cocktail
                ? `${rollup.specs_by_type.cocktail} live`
                : 'none yet'
            }
            href="/bartender/specs?type=cocktail"
          />
          <Panel
            title="Wines"
            count={
              rollup.specs_by_type.wine
                ? `${rollup.specs_by_type.wine} on the list`
                : 'none yet'
            }
            href="/bartender/specs?type=wine"
          />
          <Panel
            title="Beers"
            count={
              rollup.specs_by_type.beer
                ? `${rollup.specs_by_type.beer} on tap & bottle`
                : 'none yet'
            }
            href="/bartender/specs?type=beer"
          />
        </div>
      </section>

      <section className="mb-12">
        <SectionHead
          title="Cellar Watch"
          meta={
            rollup.par_breaches === 0
              ? 'nothing under par'
              : `${rollup.par_breaches} ${rollup.par_breaches === 1 ? 'bottle' : 'bottles'} under par`
          }
        />
        {rollup.par_breaches === 0 ? (
          <Empty>
            Every bottle is above its reorder point. Set par levels on cellar items so the system flags low stock automatically.
          </Empty>
        ) : (
          <div className="bg-card border border-rule border-l-4 border-l-urgent px-7 py-6">
            <div className="font-serif text-base text-ink leading-relaxed">
              Running low on{' '}
              {rollup.par_breach_names.map((n, i) => (
                <span key={n}>
                  <em className="text-gold not-italic font-medium italic">
                    {n}
                  </em>
                  {i < rollup.par_breach_names.length - 1 &&
                    (i === rollup.par_breach_names.length - 2 ? ' and ' : ', ')}
                </span>
              ))}
              {rollup.par_breaches > rollup.par_breach_names.length && (
                <span className="text-muted">
                  {' '}+ {rollup.par_breaches - rollup.par_breach_names.length} more
                </span>
              )}
              .
            </div>
            <Link
              href="/bartender/back-bar/cellar?filter=par-breach"
              className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mt-4 inline-block"
            >
              Open Cellar →
            </Link>
          </div>
        )}
      </section>

      <LookingAhead siteId={ctx.siteId} surface="bar_home" />
    </div>
  );
}

function summarySentence(rollup: Awaited<ReturnType<typeof getBarHomeRollup>>) {
  const parts: string[] = [];
  if (rollup.specs_total === 0) {
    return 'Bar surface is fresh. Add your first cocktail spec from the Specs tab to start tracking pours, costs, and margins.';
  }
  if (rollup.par_breaches > 0) {
    parts.push(
      `${rollup.par_breaches} ${rollup.par_breaches === 1 ? 'bottle' : 'bottles'} sliding below par`,
    );
  }
  if (rollup.active_allocations > 0) {
    parts.push(
      `${rollup.active_allocations} ${rollup.active_allocations === 1 ? 'allocation' : 'allocations'} due in`,
    );
  }
  if (rollup.spillage_value_this_week > 0) {
    parts.push(
      `${new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(rollup.spillage_value_this_week)} in spillage this week`,
    );
  }
  if (parts.length === 0) {
    return `${rollup.specs_total} specs on the list, cellar is sound. Service should run clean.`;
  }
  return parts.join(', ') + '.';
}

function specsSub(by: Partial<Record<string, number>>): string {
  const bits: string[] = [];
  if (by.cocktail) bits.push(`${by.cocktail} cocktails`);
  if (by.wine) bits.push(`${by.wine} wines`);
  if (by.beer) bits.push(`${by.beer} beers`);
  if (bits.length === 0) return 'across types';
  return bits.join(' · ');
}

function Panel({
  title,
  count,
  href,
}: {
  title: string;
  count: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-card border border-rule px-6 py-5 hover:border-rule-gold transition-colors"
    >
      <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-muted mb-3">
        {title}
      </div>
      <div className="font-serif font-medium text-2xl leading-none text-ink">
        {count}
      </div>
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card border border-rule px-10 py-12 text-center">
      <p className="font-serif italic text-muted max-w-md mx-auto">
        {children}
      </p>
    </div>
  );
}
