import { getShellContext } from '@/lib/shell/context';
import { getRecentIncidents } from '@/lib/safety/lib';
import { INCIDENT_KIND_LABEL } from '@/lib/safety/standards';
import { LiabilityFooter } from '@/components/safety/LiabilityFooter';
import { FsaReferenceStrip } from '@/components/safety/FsaReferenceStrip';
import {
  SafetyPageHeader,
  SafetySideCard,
} from '@/components/safety/SafetyPageHeader';
import { SafetyLookingAhead } from '@/components/safety/SafetyLookingAhead';
import { IncidentForm } from './IncidentForm';

export const metadata = { title: 'Log an issue · Safety · Palatable' };

export default async function IncidentsPage() {
  const ctx = await getShellContext();
  const incidents = await getRecentIncidents(ctx.siteId);
  const open = incidents.filter((i) => !i.resolved_at);

  // Pattern detection
  const ahead: Array<{
    tag: 'worth_knowing' | 'get_ready' | 'plan_for_it';
    body: string;
  }> = [];
  const last30 = incidents.filter(
    (i) =>
      Date.now() - new Date(i.occurred_at).getTime() <
      30 * 24 * 60 * 60 * 1000,
  );
  const allergenCount = last30.filter((i) => i.kind === 'allergen').length;
  if (allergenCount >= 2) {
    ahead.push({
      tag: 'worth_knowing',
      body: `<em>${allergenCount} allergen incidents</em> in last 30 days. Worth a briefing with FOH before next service.`,
    });
  }
  if (open.length > 0) {
    const oldest = open[open.length - 1];
    const daysOld = Math.floor(
      (Date.now() - new Date(oldest.occurred_at).getTime()) /
        (24 * 60 * 60 * 1000),
    );
    if (daysOld >= 3) {
      ahead.push({
        tag: 'plan_for_it',
        body: `<em>${oldest.summary}</em> has been open ${daysOld} days. Resolve or escalate.`,
      });
    }
  }

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <SafetyPageHeader
        crumb="Log an Issue"
        title="Log an"
        titleEm="issue"
        subtitle="Complaint, allergy, near-miss, illness. Log it honestly — high severity escalates to the right people automatically."
      />

      {ahead.length > 0 && <SafetyLookingAhead items={ahead} />}

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8">
        <div>
          <IncidentForm />
        </div>
        <div>
          <FsaReferenceStrip surface="incidents" variant="full" />

          <SafetySideCard title="Recent issues">
            {incidents.length === 0 ? (
              <div className="px-6 py-6 font-serif italic text-sm text-muted">
                Nothing on file. Hopefully that stays the case.
              </div>
            ) : (
              incidents.slice(0, 6).map((inc) => (
                <div key={inc.id} className="px-6 py-4">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <span
                      className={
                        'inline-flex font-display font-semibold text-[9px] tracking-[0.25em] uppercase px-2 py-1 ' +
                        toneForKind(inc.kind)
                      }
                    >
                      {INCIDENT_KIND_LABEL[inc.kind]}
                    </span>
                    <span className="font-sans text-xs text-muted-soft">
                      {new Date(inc.occurred_at).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  <div className="font-serif text-sm text-ink leading-snug mb-1.5">
                    {inc.summary}
                  </div>
                  <div
                    className={
                      'font-display font-semibold text-[10px] tracking-[0.25em] uppercase ' +
                      (inc.resolved_at ? 'text-healthy' : 'text-attention')
                    }
                  >
                    {inc.resolved_at ? 'Resolved' : 'Open'}
                    {inc.allergens && inc.allergens.length > 0 && (
                      <span className="ml-2 normal-case font-sans text-muted not-italic">
                        · {inc.allergens.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </SafetySideCard>
        </div>
      </div>

      <LiabilityFooter />
    </div>
  );
}

function toneForKind(k: string): string {
  if (k === 'allergen' || k === 'illness') return 'bg-urgent/10 text-urgent';
  if (k === 'complaint') return 'bg-attention/10 text-attention';
  return 'bg-gold-bg text-gold-dark';
}
