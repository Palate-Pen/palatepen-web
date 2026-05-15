import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { OwnerPageHeader } from '@/components/owner/OwnerScaffold';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';

export const metadata = { title: 'Alerts — Owner — Palatable' };

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

type Severity = 'urgent' | 'attention' | 'healthy' | 'info';

type Alert = {
  id: string;
  site_id: string;
  site_name: string | null;
  target_surface: string;
  severity: Severity;
  section_label: string;
  headline_pre: string | null;
  headline_em: string | null;
  headline_post: string | null;
  body_md: string;
  action_label: string | null;
  action_target: string | null;
  emitted_at: string;
};

const SEVERITY_BORDER: Record<Severity, string> = {
  urgent: 'border-l-4 border-l-urgent',
  attention: 'border-l-4 border-l-attention',
  healthy: 'border-l-4 border-l-healthy',
  info: 'border-l-4 border-l-gold',
};

const SEVERITY_TONE: Record<Severity, string> = {
  urgent: 'text-urgent',
  attention: 'text-attention',
  healthy: 'text-healthy',
  info: 'text-gold',
};

const SEVERITY_LABEL: Record<Severity, string> = {
  urgent: 'Urgent',
  attention: 'Watch',
  healthy: 'Working',
  info: 'Info',
};

function escapeAndBold(md: string): string {
  const escaped = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(
    /\*\*(.+?)\*\*/g,
    '<strong class="not-italic font-semibold text-ink">$1</strong>',
  );
}

export default async function OwnerAlertsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id, sites:site_id (name)')
    .eq('user_id', user.id)
    .eq('role', 'owner');
  const sites = (memberships ?? []) as unknown as Array<{
    site_id: string;
    sites: { name: string | null } | null;
  }>;

  const siteNames = new Map<string, string>();
  for (const s of sites) {
    siteNames.set(s.site_id, s.sites?.name ?? 'Site');
  }

  const siteIds = sites.map((s) => s.site_id);
  if (siteIds.length === 0) {
    return (
      <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
        <OwnerPageHeader
          eyebrow="Group Alerts"
          title="Alerts"
          subtitle="Forward signals across every site. Nothing to roll up yet — owner memberships first."
          activeSlug="alerts"
        />
      </div>
    );
  }

  const { data: rows } = await supabase
    .from('forward_signals')
    .select(
      'id, site_id, target_surface, severity, section_label, headline_pre, headline_em, headline_post, body_md, action_label, action_target, emitted_at, dismissed_at, acted_at',
    )
    .in('site_id', siteIds)
    .is('dismissed_at', null)
    .is('acted_at', null)
    .order('emitted_at', { ascending: false })
    .limit(80);

  const alerts: Alert[] = (rows ?? []).map(
    (r): Alert => ({
      id: r.id as string,
      site_id: r.site_id as string,
      site_name: siteNames.get(r.site_id as string) ?? 'Site',
      target_surface: r.target_surface as string,
      severity: r.severity as Severity,
      section_label: r.section_label as string,
      headline_pre: (r.headline_pre as string | null) ?? null,
      headline_em: (r.headline_em as string | null) ?? null,
      headline_post: (r.headline_post as string | null) ?? null,
      body_md: r.body_md as string,
      action_label: (r.action_label as string | null) ?? null,
      action_target: (r.action_target as string | null) ?? null,
      emitted_at: r.emitted_at as string,
    }),
  );

  const urgent = alerts.filter((a) => a.severity === 'urgent').length;
  const watch = alerts.filter((a) => a.severity === 'attention').length;
  const healthy = alerts.filter((a) => a.severity === 'healthy').length;
  const info = alerts.filter((a) => a.severity === 'info').length;

  // Group by site for the body — most operators want "what's wrong at each address"
  const bySite = new Map<string, Alert[]>();
  for (const a of alerts) {
    const key = a.site_id;
    if (!bySite.has(key)) bySite.set(key, []);
    bySite.get(key)!.push(a);
  }

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <OwnerPageHeader
        eyebrow="Group Alerts"
        title="Alerts"
        subtitle="Every active forward signal across every site you own. Grouped by address; severity-ordered."
        activeSlug="alerts"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Urgent"
          value={String(urgent)}
          sub={urgent === 0 ? 'nothing critical' : 'action required'}
          tone={urgent > 0 ? 'urgent' : undefined}
        />
        <KpiCard
          label="Watch"
          value={String(watch)}
          sub={watch === 0 ? 'no warnings' : 'keep an eye on these'}
          tone={watch > 0 ? 'attention' : undefined}
        />
        <KpiCard
          label="Working"
          value={String(healthy)}
          sub="good news worth seeing"
        />
        <KpiCard
          label="Info"
          value={String(info)}
          sub="context · market moves"
        />
      </div>

      {alerts.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-12 text-center">
          <p className="font-serif italic text-muted">
            Nothing live across the group. Detectors run daily and emit when something is worth your eye.
          </p>
        </div>
      ) : (
        <>
          {Array.from(bySite.entries()).map(([siteId, list]) => (
            <section key={siteId} className="mb-10">
              <SectionHead
                title={siteNames.get(siteId) ?? 'Site'}
                meta={`${list.length} active`}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {list.map((a) => (
                  <AlertCard key={a.id} alert={a} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function AlertCard({ alert: a }: { alert: Alert }) {
  return (
    <div className={'bg-card border border-rule px-7 py-6 ' + SEVERITY_BORDER[a.severity]}>
      <div className="flex items-baseline justify-between mb-3">
        <div
          className={
            'font-sans font-semibold text-xs tracking-[0.08em] uppercase ' +
            SEVERITY_TONE[a.severity]
          }
        >
          {a.section_label}
        </div>
        <div
          className={
            'font-sans font-semibold text-xs tracking-[0.08em] uppercase ' +
            SEVERITY_TONE[a.severity]
          }
        >
          {SEVERITY_LABEL[a.severity]}
        </div>
      </div>
      <div className="font-serif text-lg text-ink mb-3 leading-snug">
        {a.headline_pre}
        {a.headline_em && (
          <em className="text-gold not-italic font-medium italic">
            {a.headline_em}
          </em>
        )}
        {a.headline_post}
      </div>
      <div
        className="font-serif italic text-sm text-muted leading-relaxed mb-3"
        dangerouslySetInnerHTML={{ __html: escapeAndBold(a.body_md) }}
      />
      <div className="flex items-center justify-between pt-3 border-t border-rule">
        {a.action_label && a.action_target ? (
          <Link
            href={a.action_target}
            className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold hover:text-gold-dark transition-colors"
          >
            {a.action_label}
          </Link>
        ) : (
          <span className="font-serif italic text-xs text-muted">
            {a.target_surface}
          </span>
        )}
        <div className="font-serif italic text-xs text-muted">
          {dateFmt.format(new Date(a.emitted_at))}
        </div>
      </div>
    </div>
  );
}
