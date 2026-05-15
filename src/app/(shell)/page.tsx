import { getShellContext } from '@/lib/shell/context';
import { getHomeRollup } from '@/lib/home';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { LookingAhead } from '@/components/shell/LookingAhead';
import { ForwardCalendar } from '@/components/safety/ForwardCalendar';
import { getForwardCalendar } from '@/lib/safety/forward-calendar';
import { HomePanel, HomePanelEmpty } from '@/components/home/HomePanel';
import { QuickActions, QUICK_ICONS } from '@/components/home/QuickActions';

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
  // Role-aware default home is handled at sign-in (src/lib/actions/auth.ts).
  // We deliberately don't redirect here — that bounces a manager / owner
  // who clicks "Chef view" in the view-switcher back to their own home,
  // creating a render loop. `/` is the chef shell; users with multi-role
  // access can land here on purpose.
  const ctx = await getShellContext();
  const [rollup, calendar] = await Promise.all([
    getHomeRollup(ctx.siteId),
    getForwardCalendar(ctx.siteId, 14),
  ]);
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
          <HomePanel
            title="Today's Deliveries"
            count={
              rollup.todays_deliveries_due === 0
                ? 'none expected'
                : `${rollup.todays_deliveries_due} expected`
            }
            href="/stock-suppliers/deliveries"
          >
            {rollup.todays_delivery_suppliers.length === 0 ? (
              <HomePanelEmpty>
                No deliveries on the books for today. Add one from The Walk-in when a supplier ETA lands.
              </HomePanelEmpty>
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
          </HomePanel>

          <HomePanel
            title="Today's Prep"
            count={
              rollup.prep_total_today === 0
                ? 'nothing scheduled'
                : `${rollup.prep_done_today} of ${rollup.prep_total_today} done`
            }
            href="/prep"
          >
            {rollup.prep_total_today === 0 ? (
              <HomePanelEmpty>
                No prep board set for today. Open Prep to start one or carry yesterday's forward.
              </HomePanelEmpty>
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
          </HomePanel>
        </div>
      </section>

      <section className="mb-12">
        <SectionHead title="Quick Actions" meta="tap to start" />
        <QuickActions
          actions={[
            { href: '/stock-suppliers/invoices/scan', label: 'Scan invoice', sub: 'AI extract & reconcile', iconPath: QUICK_ICONS.scan },
            { href: '/prep', label: "Today's prep", sub: rollup.prep_total_today === 0 ? 'set the board' : `${rollup.prep_done_today} of ${rollup.prep_total_today} done`, iconPath: QUICK_ICONS.prep },
            { href: '/recipes', label: 'New recipe', sub: 'or open a draft', iconPath: QUICK_ICONS.recipe },
            { href: '/stock-suppliers/waste', label: 'Log waste', sub: 'with photo evidence', iconPath: QUICK_ICONS.waste },
            { href: '/stock-suppliers/the-bank', label: 'Update Bank', sub: 'price + par changes', iconPath: QUICK_ICONS.bank },
            { href: '/notebook', label: 'Open notebook', sub: 'capture a thought', iconPath: QUICK_ICONS.notebook },
            { href: '/safety', label: 'Safety diary', sub: 'opening checks + probes', iconPath: QUICK_ICONS.safety },
            { href: '/margins', label: 'Margins', sub: 'GP drift watch', iconPath: QUICK_ICONS.margins },
          ]}
        />
      </section>

      <ForwardCalendar days={14} items={calendar} />

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

/* Local Panel / Empty / QuickAction helpers removed — replaced by
 * shared HomePanel + QuickActions components in src/components/home/.
 */
