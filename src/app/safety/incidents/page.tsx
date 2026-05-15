import Link from 'next/link';
import { getShellContext } from '@/lib/shell/context';
import { getRecentIncidents } from '@/lib/safety/lib';
import { INCIDENT_KIND_LABEL } from '@/lib/safety/standards';
import { SectionHead } from '@/components/shell/SectionHead';
import { KpiCard } from '@/components/shell/KpiCard';
import { LiabilityFooter } from '@/components/safety/LiabilityFooter';
import { FsaReferenceStrip } from '@/components/safety/FsaReferenceStrip';
import { IncidentForm } from './IncidentForm';

export const metadata = { title: 'Incidents \u00b7 Safety \u00b7 Palatable' };

export default async function IncidentsPage() {
  const ctx = await getShellContext();
  const incidents = await getRecentIncidents(ctx.siteId);
  const open = incidents.filter((i) => !i.resolved_at);

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Safety \u00b7 Incidents
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
        <em className="text-gold font-semibold not-italic">Log</em> an Incident
      </h1>
      <p className="font-serif italic text-lg text-muted mb-8">
        Complaints, allergens, near-misses, suspected illness. Log it now, resolve it later, keep the record either way.
      </p>

      <FsaReferenceStrip surface="incidents" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="Open"
          value={String(open.length)}
          sub="awaiting resolution"
          tone={open.length > 0 ? 'attention' : 'healthy'}
        />
        <KpiCard
          label="Allergens"
          value={String(incidents.filter((i) => i.kind === 'allergen').length)}
          sub="of last 50"
          tone={incidents.filter((i) => i.kind === 'allergen').length > 0 ? 'urgent' : undefined}
        />
        <KpiCard
          label="Complaints"
          value={String(incidents.filter((i) => i.kind === 'complaint').length)}
          sub="of last 50"
        />
        <KpiCard
          label="Near misses"
          value={String(incidents.filter((i) => i.kind === 'near_miss').length)}
          sub="of last 50"
        />
      </div>

      <SectionHead title="New incident" />
      <IncidentForm />

      <SectionHead title="Recent" meta={incidents.length + ' on file'} />
      {incidents.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-12 text-center">
          <p className="font-serif italic text-muted">
            Nothing on file. Hopefully that stays the case.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-rule mb-10">
          {incidents.map((inc, i) => (
            <div
              key={inc.id}
              className={
                'px-7 py-5 ' +
                (i < incidents.length - 1 ? 'border-b border-rule-soft' : '')
              }
            >
              <div className="flex items-baseline justify-between gap-4 mb-2 flex-wrap">
                <div className="font-serif font-semibold text-base text-ink">
                  {inc.summary}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold">
                    {INCIDENT_KIND_LABEL[inc.kind]}
                  </span>
                  <span
                    className={
                      'font-display font-semibold text-xs tracking-[0.18em] uppercase ' +
                      (inc.resolved_at ? 'text-healthy' : 'text-attention')
                    }
                  >
                    {inc.resolved_at ? 'Resolved' : 'Open'}
                  </span>
                </div>
              </div>
              <div className="font-serif italic text-xs text-muted mb-2">
                {new Date(inc.occurred_at).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {inc.allergens && inc.allergens.length > 0 && (
                  <> \u00b7 {inc.allergens.join(', ')}</>
                )}
              </div>
              {inc.body_md && (
                <p className="font-serif text-sm text-ink-soft leading-relaxed whitespace-pre-line">
                  {inc.body_md}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <LiabilityFooter />
    </div>
  );
}
