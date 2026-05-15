import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getSafetyHomeData } from '@/lib/safety/lib';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { LiabilityFooter } from '@/components/safety/LiabilityFooter';
import { FsaReferenceStrip } from '@/components/safety/FsaReferenceStrip';
import { OpeningCheckForm } from '@/components/safety/OpeningCheckForm';
import { DiaryCalendar } from '@/components/safety/DiaryCalendar';
import { ForwardCalendar } from '@/components/safety/ForwardCalendar';
import { getForwardCalendar } from '@/lib/safety/forward-calendar';

export const metadata = { title: 'Safety \u00b7 Palatable' };

export default async function SafetyHomePage() {
  const ctx = await getShellContext();
  const [data, calendar] = await Promise.all([
    getSafetyHomeData(ctx.siteId),
    getForwardCalendar(ctx.siteId, 14),
  ]);

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        SFBB Diary \u00b7 The Inspector's First Question
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
        <em className="text-gold font-semibold not-italic">Safety</em>
      </h1>
      <p className="font-serif italic text-lg text-muted mb-8">
        Daily-use diary, not a compliance shield. Use it consistently and the records build themselves.
      </p>

      <FsaReferenceStrip surface="opening_checks" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Today's check"
          value={data.todays_check ? 'Done' : 'Pending'}
          sub={data.todays_check ? 'submitted' : 'opening checks not signed off'}
          tone={data.todays_check ? 'healthy' : 'attention'}
        />
        <KpiCard
          label="Failing probes"
          value={String(data.recent_failing_probes.length)}
          sub="in last 30 days"
          tone={data.recent_failing_probes.length > 0 ? 'urgent' : 'healthy'}
        />
        <KpiCard
          label="Unresolved"
          value={String(data.unresolved_incidents.length)}
          sub="open incidents"
          tone={data.unresolved_incidents.length > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Certs expiring"
          value={String(data.expiring_certs_30d.length)}
          sub="within 30 days"
          tone={data.expiring_certs_30d.length > 0 ? 'attention' : undefined}
        />
      </div>

      <ForwardCalendar days={14} items={calendar} />

      <SectionHead
        title="Today's opening checks"
        meta={data.todays_check ? 'submitted earlier today' : 'awaiting sign-off'}
      />
      <OpeningCheckForm initial={data.todays_check} />

      <SectionHead title="Diary calendar" meta="last 12 weeks" />
      <DiaryCalendar weeks={12} entries={data.recent_checks} />

      <SectionHead title="Open a workspace" meta="four daily-use surfaces" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SafetyTile
          name="Probe"
          tagline="log temperature readings"
          href="/safety/probe"
        />
        <SafetyTile
          name="Incidents"
          tagline="complaint / allergen / near-miss / illness"
          href="/safety/incidents"
        />
        <SafetyTile
          name="Cleaning"
          tagline="tick off SFBB-aligned tasks"
          href="/safety/cleaning"
        />
        <SafetyTile
          name="Training"
          tagline="staff certifications + expiry"
          href="/safety/training"
        />
      </div>

      <LiabilityFooter />
    </div>
  );
}

function SafetyTile({
  name,
  tagline,
  href,
}: {
  name: string;
  tagline: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-card border border-rule px-7 py-7 flex flex-col gap-2 hover:border-gold transition-colors"
    >
      <div className="font-serif font-semibold text-xl text-ink leading-tight">
        {name}
      </div>
      <div className="font-serif italic text-sm text-muted">{tagline}</div>
      <div className="mt-3 pt-3 border-t border-rule">
        <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
          Open {String.fromCharCode(0x2192)}
        </span>
      </div>
    </Link>
  );
}
