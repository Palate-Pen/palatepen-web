import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';

export const metadata = { title: 'Home — Palatable' };

function timeOfDay(now: Date): { eyebrow: string; greeting: string } {
  const h = now.getHours();
  if (h < 12) return { eyebrow: 'Good Morning', greeting: 'Morning' };
  if (h < 17) return { eyebrow: 'Good Afternoon', greeting: 'Afternoon' };
  return { eyebrow: 'Good Evening', greeting: 'Evening' };
}

export default async function HomePage() {
  const ctx = await getShellContext();
  const tod = timeOfDay(new Date());

  return (
    <div className="px-14 pt-12 pb-20 max-w-[1200px]">
      {/* Greeting */}
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
          A quiet one — no deliveries scheduled and no orders pending.
        </p>
      </div>

      {/* Today & The Week Ahead */}
      <section className="mb-12">
        <SectionHead title="Today & The Week Ahead" meta="empty for now" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Panel title="Today's Deliveries" count="none expected">
            <Empty>
              No deliveries logged yet. Your first scan or supplier link will
              start populating this.
            </Empty>
          </Panel>
          <Panel title="This Week's Menu" count="no changes planned">
            <Empty>
              No menu changes planned. New dishes and removals will show here
              once Menus is wired up.
            </Empty>
          </Panel>
        </div>
      </section>

      {/* Kitchen at a Glance */}
      <section className="mb-12">
        <SectionHead title="Kitchen at a Glance" meta="live" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule">
          <Kpi label="Menu GP" value="—" sub="no costings yet" />
          <Kpi label="Stock Value" value="—" sub="stock not counted yet" />
          <Kpi label="Deliveries Due" value="0" sub="today" />
          <Kpi label="Waste This Week" value="£0" sub="no waste logged yet" />
        </div>
      </section>

      {/* Quick Actions */}
      <section>
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
            href="/stock-suppliers"
            label="Count stock"
            sub="Quick or full count"
            icon={
              <>
                <path d="M3 7l9-4 9 4-9 4-9-4z" />
                <path d="M3 7v10l9 4 9-4V7" />
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

function SectionHead({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-baseline justify-between mb-6 pb-3 border-b border-rule">
      <div className="font-display text-xs font-semibold tracking-[0.5em] uppercase text-gold">
        {title}
      </div>
      <div className="font-serif italic text-sm text-muted">{meta}</div>
    </div>
  );
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

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-card px-7 py-6">
      <div className="font-display text-xs font-semibold tracking-[0.4em] uppercase text-muted mb-3">
        {label}
      </div>
      <div className="font-serif text-3xl font-medium leading-none text-ink">
        {value}
      </div>
      <div className="font-serif italic text-sm text-muted mt-1.5">
        {sub}
      </div>
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
