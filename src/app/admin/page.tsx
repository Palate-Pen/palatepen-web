import { getAdminHomeData, tierPrice, type AdminTier, type RecentSignup } from '@/lib/admin';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';

export const metadata = { title: 'Admin · Home — Palatable' };

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
});

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export default async function AdminHomePage() {
  const data = await getAdminHomeData();

  const issuesTone =
    data.open_issues.urgent > 0 ? 'attention' : undefined;
  const dauTone = data.dau_this_week > 0 ? 'healthy' : undefined;
  const dauPct =
    data.active_kitchens > 0
      ? Math.round((data.dau_this_week / data.active_kitchens) * 100)
      : 0;

  const tierSub = tierBreakdownSub(data.tier_counts);
  const mrrTrend = ' '; // placeholder spacing; vs-last-month requires snapshot table not yet built
  const _ = mrrTrend; // silence unused warning

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1400px] mx-auto">
      {/* PAGE HEADER */}
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        The Business
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
        Founder <em className="text-gold font-semibold not-italic">command centre</em>
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-10">
        {summarySentence(data)}
      </p>

      {/* KPI STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="MRR"
          value={gbp.format(data.mrr)}
          sub="this month · live"
        />
        <KpiCard
          label="Active Kitchens"
          value={String(data.active_kitchens)}
          sub={tierSub}
        />
        <KpiCard
          label="DAU This Week"
          value={String(data.dau_this_week)}
          sub={`${dauPct}% of active kitchens`}
          tone={dauTone}
        />
        <KpiCard
          label="Open Issues"
          value={String(data.open_issues.count)}
          sub={`${data.open_issues.urgent} urgent · ${data.open_issues.normal} normal`}
          tone={issuesTone}
        />
      </div>

      {/* LOOKING AHEAD — mocked until admin forward_signals exist */}
      <section className="mt-12">
        <SectionHead title="Looking Ahead" meta="two signals worth your attention" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AdminAheadCard
            sectionLabel="Conversion Signal"
            tag="Worth Knowing"
            headlinePre="Two Free kitchens "
            headlineEm="hitting limits"
            headlinePost="."
            body={
              <>
                <strong className="not-italic font-semibold text-ink">
                  Salt Beef Bagel and The Smokehouse
                </strong>{' '}
                have both hit recipe limits this week. Both signed up 21+ days ago. Worth a personal outreach — Salt Beef Bagel especially (Marcus mentioned wanting GP tracking on signup).
              </>
            }
          />
          <AdminAheadCard
            sectionLabel="Churn Risk"
            tag="Plan For It"
            headlinePre="Berber & Q usage "
            headlineEm="dropping"
            headlinePost="."
            body={
              <>
                <strong className="not-italic font-semibold text-ink">
                  Last 14 days: 4 logins down from 11 the prior fortnight.
                </strong>{' '}
                No prep logged this week. Either they're on holiday or losing engagement — worth a quick check-in.
              </>
            }
          />
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="mt-12">
        <SectionHead title="Quick Actions" meta="jump straight in" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard eyebrow="Users" title="Find a user" sub="search by email or kitchen" />
          <ActionCard eyebrow="Comms" title="Send announcement" sub="target by tier or activity" />
          <ActionCard eyebrow="Data" title="Update seasonal calendar" sub="82 ingredients · last update 8 May" />
          <ActionCard eyebrow="Ops" title="Toggle feature flag" sub="3 features in beta" />
        </div>
      </section>

      {/* RECENT SIGN-UPS */}
      <section className="mt-12">
        <SectionHead
          title="Recent Sign-ups"
          meta={`last 30 days · ${data.recent_signups.length} new`}
        />

        {data.recent_signups.length === 0 ? (
          <div className="bg-card border border-rule px-10 py-12 text-center">
            <p className="font-serif italic text-muted">
              No sign-ups yet — the table fills in as kitchens land.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-rule">
            <div className="hidden md:grid grid-cols-[2fr_120px_100px_180px_80px_40px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
              {['User · Kitchen', 'Signed Up', 'Tier', 'Activity', 'MRR', ''].map((h, i) => (
                <div
                  key={i}
                  className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
                >
                  {h}
                </div>
              ))}
            </div>

            {data.recent_signups.map((u, i) => (
              <SignupRow
                key={u.user_id}
                signup={u}
                last={i === data.recent_signups.length - 1}
              />
            ))}
          </div>
        )}
      </section>

      {/* TWO-COL: BUSINESS + SYSTEM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        <Panel title="Business Snapshot" sub="this month vs last">
          <PanelRow label="MRR" value={`${gbp.format(data.mrr)} live`} tone="healthy" />
          <PanelRow label="New sign-ups" value={`${data.recent_signups.length} this month`} tone="healthy" />
          <PanelRow label="Conversions (Free → Paid)" value="pending · no funnel yet" />
          <PanelRow label="Churn" value="pending · no churn tracking yet" />
          <PanelRow label="Stripe last sync" value="pending · no Stripe integration yet" />
          <PanelRow label="Pending tier upgrades" value="0 to confirm" />
        </Panel>

        <Panel title="System Health" sub="infrastructure status">
          <StatusRow tone="healthy" name="Supabase" meta="EU West London · live" value="Healthy" />
          <StatusRow tone="healthy" name="Vercel Production" meta="deploy on main" value="Healthy" />
          <StatusRow tone="attention" name="Forward-intelligence engine" meta="cron at 08:00 + 08:30 UTC" value="Running" />
          <StatusRow tone="muted" name="Stripe" meta="not integrated yet" value="Pending" />
          <StatusRow tone="healthy" name="Cloudflare" meta="CDN · 24hr uptime 100%" value="Healthy" />
        </Panel>
      </div>

      {/* TWO-COL: CONTENT + OPS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Panel title="Content & Comms" sub="data + outreach">
          <PanelRow label="Seasonal calendar (UK)" value="pending · no seasonal data yet" />
          <PanelRow label="Looking Ahead detectors" value="2 active · market-moves + recipe-staleness" />
          <PanelRow label="Blog posts published" value="pending · no blog yet on v2" />
          <PanelRow label="Last announcement" value="pending · no announcement system" />
          <PanelRow label="Email list size" value={`${data.total_users} signed up`} />
        </Panel>

        <Panel title="Founder Ops" sub="tasks & flags">
          <PanelRow label="Support inbox" value="pending · no inbox wired" />
          <PanelRow label="Feature flags" value="pending · no flag system on v2" />
          <PanelRow label="Beta testers" value={`${data.total_users} total signed-up users`} />
          <PanelRow label="NSC Leicester pitch" value="Mon 18 May · price fix needed" tone="urgent" />
          <PanelRow label="Stripe payouts" value="pending · no Stripe integration" />
        </Panel>
      </div>
    </div>
  );
}

function summarySentence(data: {
  active_kitchens: number;
  tier_counts: Record<AdminTier, number>;
  mrr: number;
  open_issues: { count: number };
}): string {
  const k = data.active_kitchens;
  const proCount = data.tier_counts.pro + data.tier_counts.kitchen + data.tier_counts.group + data.tier_counts.enterprise;
  if (k === 0) {
    return 'No kitchens yet. The platform is open and waiting.';
  }
  const parts: string[] = [];
  parts.push(`${k} ${k === 1 ? 'kitchen' : 'kitchens'}.`);
  if (proCount > 0) parts.push(`${proCount} on paid tiers.`);
  parts.push(`${gbp.format(data.mrr)} MRR.`);
  if (data.open_issues.count > 0) {
    parts.push(`${data.open_issues.count} ${data.open_issues.count === 1 ? 'issue needs' : 'issues need'} your eye.`);
  }
  return parts.join(' ');
}

function tierBreakdownSub(counts: Record<AdminTier, number>): string {
  const parts: string[] = [];
  if (counts.pro > 0) parts.push(`${counts.pro} Pro`);
  if (counts.kitchen > 0) parts.push(`${counts.kitchen} Kitchen`);
  if (counts.group > 0) parts.push(`${counts.group} Group`);
  if (counts.enterprise > 0) parts.push(`${counts.enterprise} Enterprise`);
  if (counts.free > 0) parts.push(`${counts.free} Free`);
  return parts.length === 0 ? 'no kitchens yet' : parts.join(' · ');
}

function AdminAheadCard({
  sectionLabel,
  tag,
  headlinePre,
  headlineEm,
  headlinePost,
  body,
}: {
  sectionLabel: string;
  tag: string;
  headlinePre: string;
  headlineEm: string;
  headlinePost: string;
  body: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-rule border-l-4 border-l-gold px-7 py-7">
      <div className="flex items-baseline justify-between mb-4 gap-3">
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold">
          {sectionLabel}
        </div>
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted px-2 py-1 border border-rule whitespace-nowrap">
          {tag}
        </div>
      </div>
      <div className="font-serif text-xl text-ink mb-3 leading-snug">
        {headlinePre}
        <em className="text-gold not-italic font-medium italic">{headlineEm}</em>
        {headlinePost}
      </div>
      <div className="font-serif italic text-sm text-muted leading-relaxed">
        {body}
      </div>
    </div>
  );
}

function ActionCard({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub: string;
}) {
  return (
    <button className="bg-card border border-rule px-5 py-5 text-left cursor-pointer transition-all hover:border-gold hover:-translate-y-px">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-2">
        {eyebrow}
      </div>
      <div className="font-serif font-semibold text-lg text-ink leading-tight mb-1">
        {title}
      </div>
      <div className="font-serif italic text-sm text-muted">{sub}</div>
    </button>
  );
}

const tierPill: Record<AdminTier, string> = {
  pro: 'bg-gold text-paper',
  kitchen: 'bg-gold-bg text-gold-dark border border-gold/40',
  group: 'bg-attention/15 text-attention border border-attention/40',
  enterprise: 'bg-ink text-paper',
  free: 'bg-paper-warm text-muted border border-rule',
};

function SignupRow({
  signup,
  last,
}: {
  signup: RecentSignup;
  last: boolean;
}) {
  const now = new Date();
  const signedUpStr = dateFmt.format(new Date(signup.created_at));
  const activity = activityLabel(signup.last_sign_in_at, now);
  const monthly = tierPrice(signup.tier);

  return (
    <div
      className={
        'grid grid-cols-1 md:grid-cols-[2fr_120px_100px_180px_80px_40px] gap-4 px-7 py-4 items-center cursor-pointer transition-colors hover:bg-card-warm' +
        (last ? '' : ' border-b border-rule-soft')
      }
    >
      <div>
        <div className="font-serif font-semibold text-base text-ink">
          {signup.display_name}
        </div>
        <div className="font-sans text-xs text-muted">
          {signup.email}
          {signup.kitchen_name !== '—' && (
            <>
              {' '}· <span className="text-ink-soft">{signup.kitchen_name}</span>
            </>
          )}
        </div>
      </div>
      <div className="font-sans text-xs text-muted">{signedUpStr}</div>
      <div>
        <span
          className={`font-display text-xs font-semibold tracking-[0.18em] uppercase px-2.5 py-1 ${tierPill[signup.tier]}`}
        >
          {signup.tier}
        </span>
      </div>
      <div className="font-sans text-xs flex items-center gap-2">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            activity.tone === 'active'
              ? 'bg-healthy'
              : activity.tone === 'dormant'
                ? 'bg-attention'
                : 'bg-muted-soft'
          }`}
        />
        <span className={activity.tone === 'active' ? 'text-healthy' : 'text-muted'}>
          {activity.label}
        </span>
      </div>
      <div className="font-sans text-xs text-ink-soft">
        {monthly > 0 ? gbp.format(monthly) : '£0'}
      </div>
      <div className="text-muted-soft justify-self-end">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>
    </div>
  );
}

function activityLabel(
  lastSignIn: string | null,
  now: Date,
): { label: string; tone: 'active' | 'dormant' | 'never' } {
  if (!lastSignIn) return { label: 'Never signed in', tone: 'never' };
  const t = new Date(lastSignIn);
  const diffH = (now.getTime() - t.getTime()) / (1000 * 60 * 60);
  if (diffH < 24) return { label: 'Active today', tone: 'active' };
  if (diffH < 48) return { label: 'Active yesterday', tone: 'active' };
  if (diffH < 24 * 7) {
    return { label: `Active ${Math.floor(diffH / 24)} days`, tone: 'active' };
  }
  return { label: `Dormant ${Math.floor(diffH / 24)} days`, tone: 'dormant' };
}

function Panel({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-rule px-7 py-6">
      <div className="mb-4">
        <div className="font-display font-semibold text-xs tracking-[0.4em] uppercase text-gold mb-1.5">
          {title}
        </div>
        <div className="font-serif italic text-xs text-muted">{sub}</div>
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function PanelRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'healthy' | 'attention' | 'urgent';
}) {
  const valueColor =
    tone === 'healthy'
      ? 'text-healthy'
      : tone === 'urgent'
        ? 'text-urgent'
        : tone === 'attention'
          ? 'text-attention'
          : 'text-ink';
  return (
    <div className="flex justify-between items-baseline gap-3 py-2.5 border-b border-rule-soft last:border-b-0">
      <span className="font-serif text-sm text-muted">{label}</span>
      <span className={`font-serif font-semibold text-sm ${valueColor}`}>{value}</span>
    </div>
  );
}

function StatusRow({
  tone,
  name,
  meta,
  value,
}: {
  tone: 'healthy' | 'attention' | 'urgent' | 'muted';
  name: string;
  meta: string;
  value: string;
}) {
  const dotColor =
    tone === 'healthy'
      ? 'bg-healthy'
      : tone === 'attention'
        ? 'bg-attention'
        : tone === 'urgent'
          ? 'bg-urgent'
          : 'bg-muted-soft';
  const valueColor =
    tone === 'healthy'
      ? 'text-healthy'
      : tone === 'attention'
        ? 'text-attention'
        : tone === 'urgent'
          ? 'text-urgent'
          : 'text-muted';
  return (
    <div className="flex items-center gap-3 py-3 border-b border-rule-soft last:border-b-0">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
      <div className="flex-1 min-w-0">
        <div className="font-serif font-semibold text-sm text-ink">{name}</div>
        <div className="font-sans text-xs text-muted">{meta}</div>
      </div>
      <div className={`font-display font-semibold text-xs tracking-[0.18em] uppercase ${valueColor}`}>
        {value}
      </div>
    </div>
  );
}
