import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getHomeRollup } from '@/lib/home';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { LookingAhead } from '@/components/shell/LookingAhead';

export const metadata = { title: 'Home — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});

function timeOfDay(now: Date): { eyebrow: string; greeting: string } {
  const h = now.getHours();
  if (h < 12) return { eyebrow: 'Good Morning', greeting: 'Morning' };
  if (h < 17) return { eyebrow: 'Good Afternoon', greeting: 'Afternoon' };
  return { eyebrow: 'Good Evening', greeting: 'Evening' };
}

export default async function HomePage() {
  const ctx = await getShellContext();
  const rollup = await getHomeRollup(ctx.siteId);
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

      <section className="mb-12">
        <SectionHead title="Today & The Week Ahead" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Panel
            title="Today's Deliveries"
            count={
              rollup.todays_deliveries_due === 0
                ? 'none expected'
                : `${rollup.todays_deliveries_due} ${rollup.todays_deliveries_due === 1 ? 'expected' : 'expected'}`
            }
          >
            {rollup.todays_delivery_suppliers.length === 0 ? (
              <Empty>
                No deliveries on the books for today. Add one from The Walk-in when a supplier ETA lands.
              </Empty>
            ) : (
              <div className="font-serif text-sm text-ink-soft leading-relaxed">
                {rollup.todays_delivery_suppliers.slice(0, 4).join(' · ')}
                {rollup.todays_delivery_suppliers.length > 4 && (
                  <span className="text-muted">
                    {' '}+ {rollup.todays_delivery_suppliers.length - 4} more
                  </span>
                )}
              </div>
            )}
          </Panel>

          <Panel
            title="Today's Prep"
            count={
              rollup.prep_total_today === 0
                ? 'nothing scheduled'
                : `${rollup.prep_done_today} of ${rollup.prep_total_today} done`
            }
          >
            {rollup.prep_total_today === 0 ? (
              <Empty>
                No prep board set for today. Open Prep to start one or carry yesterday's forward.
              </Empty>
            ) : (
              <div className="font-serif text-sm text-ink-soft leading-relaxed">
                {rollup.prep_in_progress_today > 0 && (
                  <>
                    <strong className="not-italic font-semibold text-ink">
                      {rollup.prep_in_progress_today} in progress
                    </strong>
                    {' · '}
                  </>
                )}
                {rollup.prep_total_today -
                  rollup.prep_done_today -
                  rollup.prep_in_progress_today}{' '}
                still to start.
              </div>
            )}
          </Panel>
        </div>
      </section>

      <section className="mb-12">
        <SectionHead title="Kitchen at a Glance" meta="live" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule">
          <KpiCard
            size="hero"
            label="Recipes"
            value={String(rollup.recipes_count)}
            sub={rollup.recipes_count === 0 ? 'add your first dish' : 'on the menu'}
          />
          <KpiCard
            size="hero"
            label="Stock Value"
            value={rollup.stock_value == null ? '—' : gbp.format(rollup.stock_value)}
            sub="stock counting not wired"
          />
          <KpiCard
            size="hero"
            label="Deliveries Due"
            value={String(rollup.todays_deliveries_due)}
            sub="today"
          />
          <KpiCard
            size="hero"
            label="Waste This Week"
            value={
              rollup.waste_this_week > 0
                ? gbp.format(rollup.waste_this_week)
                : '£0'
            }
            sub={rollup.waste_this_week === 0 ? 'nothing logged yet' : 'last 7 days'}
          />
        </div>
      </section>

      <LookingAhead siteId={ctx.siteId} surface="home" />

      <section className="mt-12">
        <SectionHead title="Quick Actions" meta="tap to start" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction
            href="/stock-suppliers"
            label="Scan an invoice"
            sub="AI extract & reconcile"
            icon={
              <>
                <rect x="4" y="3" width="16" height="18" />
                <path d="M8 8h8M8 12h8M8 16h5" />
              </>
            }
          />
          <QuickAction
            href="/prep"
            label="Open today's prep"
            sub={
              rollup.prep_total_today === 0
                ? 'set the board'
                : `${rollup.prep_done_today} done`
            }
            icon={
              <>
                <rect x="4" y="3" width="16" height="18" rx="1" />
                <path d="M8 7h8M8 11h8M8 15h5" />
              </>
            }
          />
          <QuickAction
            href="/recipes"
            label="New recipe"
            sub="Or open a draft"
            icon={
              <path d="M3 5c3 0 6 1 9 3 3-2 6-3 9-3v14c-3 0-6 1-9 3-3-2-6-3-9-3V5z" />
            }
          />
          <QuickAction
            href="/stock-suppliers"
            label="Log waste"
            sub="With photo evidence"
            icon={
              <>
                <circle cx="12" cy="12" r="9" />
                <path d="M9 9l6 6M15 9l-6 6" />
              </>
            }
          />
        </div>
      </section>
    </div>
  );
}

function summarySentence(rollup: Awaited<ReturnType<typeof getHomeRollup>>): string {
  const parts: string[] = [];
  if (rollup.todays_deliveries_due === 0) {
    parts.push('A quiet one — no deliveries scheduled.');
  } else {
    parts.push(
      `${rollup.todays_deliveries_due} ${rollup.todays_deliveries_due === 1 ? 'delivery' : 'deliveries'} expected today.`,
    );
  }
  if (rollup.prep_total_today > 0) {
    const remaining =
      rollup.prep_total_today - rollup.prep_done_today;
    if (remaining > 0) {
      parts.push(`${remaining} prep ${remaining === 1 ? 'item' : 'items'} to clear.`);
    } else {
      parts.push("Prep board's done.");
    }
  }
  return parts.join(' ');
}

function Panel({
  title,
  count,
  children,
}: {
  title: string;
  count: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-rule px-8 py-7">
      <div className="flex items-baseline justify-between mb-5">
        <div className="font-display text-xs font-semibold tracking-[0.45em] uppercase text-gold">
          {title}
        </div>
        <div className="font-serif italic text-sm text-muted">{count}</div>
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-serif italic text-sm text-muted leading-relaxed">
      {children}
    </div>
  );
}

function QuickAction({
  href,
  label,
  sub,
  icon,
}: {
  href: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="bg-card border border-rule px-6 py-5 flex items-center gap-4 hover:border-gold hover:bg-card-warm hover:-translate-y-px hover:shadow-[0_2px_8px_rgba(26,22,18,0.04)] transition-all"
    >
      <div className="w-9 h-9 border border-gold text-gold flex items-center justify-center flex-shrink-0">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {icon}
        </svg>
      </div>
      <div>
        <div className="font-serif font-semibold text-lg tracking-[0.02em] text-ink">
          {label}
        </div>
        <div className="text-xs text-muted tracking-[0.02em] mt-0.5">
          {sub}
        </div>
      </div>
    </Link>
  );
}
