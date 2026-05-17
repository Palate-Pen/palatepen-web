import { getShellContext } from '@/lib/shell/context';
import { getTrainingRecords, type TrainingRow } from '@/lib/safety/lib';
import { TRAINING_KIND_LABEL } from '@/lib/safety/standards';
import { getDishPickerBands } from '@/lib/safety/dish-picker';
import { LiabilityFooter } from '@/components/safety/LiabilityFooter';
import { FsaReferenceStrip } from '@/components/safety/FsaReferenceStrip';
import {
  SafetyPageHeader,
  SafetySideCard,
} from '@/components/safety/SafetyPageHeader';
import { SafetyLookingAhead } from '@/components/safety/SafetyLookingAhead';
import { TrainingForm } from './TrainingForm';

export const metadata = { title: 'Training records · Safety · Palatable' };

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const BAND_LABEL: Record<TrainingRow['expiry_band'], string> = {
  expired: 'Expired',
  today: 'Expires today',
  this_week: 'This week',
  two_weeks: 'In 2 weeks',
  month: 'This month',
  safe: 'Valid',
  no_expiry: 'No expiry',
};

const BAND_TONE: Record<TrainingRow['expiry_band'], string> = {
  expired: 'bg-urgent/10 text-urgent border-urgent/40',
  today: 'bg-urgent/10 text-urgent border-urgent/40',
  this_week: 'bg-urgent/10 text-urgent border-urgent/40',
  two_weeks: 'bg-attention/10 text-attention border-attention/40',
  month: 'bg-attention/10 text-attention border-attention/40',
  safe: 'bg-healthy/10 text-healthy border-healthy/40',
  no_expiry: 'bg-paper-warm text-muted border-rule',
};

export default async function TrainingPage() {
  const ctx = await getShellContext();
  const [rows, bands] = await Promise.all([
    getTrainingRecords(ctx.siteId),
    getDishPickerBands(ctx.siteId, 'all'),
  ]);

  // Group by staff
  const byStaff = new Map<string, TrainingRow[]>();
  for (const r of rows) {
    if (!byStaff.has(r.staff_name)) byStaff.set(r.staff_name, []);
    byStaff.get(r.staff_name)!.push(r);
  }

  const expired = rows.filter((r) => r.expiry_band === 'expired');
  const within30 = rows.filter((r) =>
    ['today', 'this_week', 'two_weeks', 'month'].includes(r.expiry_band),
  );

  const ahead: Array<{
    tag: 'worth_knowing' | 'get_ready' | 'plan_for_it';
    body: string;
  }> = [];
  if (expired.length > 0) {
    ahead.push({
      tag: 'plan_for_it',
      body: `<em>${expired[0].staff_name}'s ${expired[0].certificate_name ?? expired[0].kind}</em> expired ${Math.abs(expired[0].days_until_expiry ?? 0)} day${Math.abs(expired[0].days_until_expiry ?? 0) === 1 ? '' : 's'} ago. Book the refresher or hold them off floor work.`,
    });
  }
  if (within30.length > 0 && expired.length === 0) {
    ahead.push({
      tag: 'get_ready',
      body: `${within30.length} certificate${within30.length === 1 ? '' : 's'} expiring this month. Earlier you book, easier it is.`,
    });
  }

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <SafetyPageHeader
        crumb="Training Records"
        title="Staff"
        titleEm="training"
        subtitle="Certifications, awarding body, expiry. The expiry ladder flags 30 / 14 / 7 / 0 days out — no surprises."
      />

      {ahead.length > 0 && <SafetyLookingAhead items={ahead} />}

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8">
        <div>
          {byStaff.size === 0 ? (
            <div className="bg-card border border-rule px-10 py-12 text-center mb-6">
              <p className="font-serif italic text-muted">
                No training records yet. Add the first one to the right.
              </p>
            </div>
          ) : (
            Array.from(byStaff.entries()).map(([staff, certs]) => (
              <StaffCard key={staff} staff={staff} certs={certs} />
            ))
          )}

          <div className="mt-6">
            <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
              <h2 className="font-display font-semibold text-[13px] tracking-[0.35em] uppercase text-gold">
                Add training
              </h2>
              <span className="font-serif italic text-sm text-muted">
                certificate or refresher
              </span>
            </div>
            <TrainingForm bands={bands} />
          </div>
        </div>

        <div>
          <FsaReferenceStrip surface="training" variant="full" />

          <SafetySideCard title="Expiring soon">
            {within30.length === 0 && expired.length === 0 ? (
              <div className="px-6 py-6 font-serif italic text-sm text-muted">
                Everything is in date.
              </div>
            ) : (
              [...expired, ...within30].slice(0, 6).map((r) => (
                <div key={r.id} className="px-6 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-serif font-semibold text-sm text-ink">
                      {r.staff_name}
                    </span>
                    <span
                      className={
                        'inline-flex font-display font-semibold text-[9px] tracking-[0.25em] uppercase px-2 py-0.5 border ' +
                        BAND_TONE[r.expiry_band]
                      }
                    >
                      {BAND_LABEL[r.expiry_band]}
                    </span>
                  </div>
                  <div className="font-sans text-xs text-muted">
                    {r.certificate_name ?? r.kind}
                    {r.expires_on && (
                      <> · {dateFmt.format(new Date(r.expires_on))}</>
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

function StaffCard({
  staff,
  certs,
}: {
  staff: string;
  certs: TrainingRow[];
}) {
  const initials = staff
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const status: { label: string; tone: string } = (() => {
    if (certs.some((c) => c.expiry_band === 'expired')) {
      return { label: 'Expired', tone: 'bg-urgent/10 text-urgent border-urgent/40' };
    }
    if (
      certs.some((c) =>
        ['today', 'this_week', 'two_weeks', 'month'].includes(c.expiry_band),
      )
    ) {
      return {
        label: 'Action Needed',
        tone: 'bg-attention/10 text-attention border-attention/40',
      };
    }
    return {
      label: 'Compliant',
      tone: 'bg-healthy/10 text-healthy border-healthy/40',
    };
  })();

  return (
    <div className="bg-card border border-rule mb-4">
      <div className="px-6 py-4 border-b border-rule flex items-center gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-full bg-gold-bg text-gold-dark font-display font-semibold text-sm tracking-wider flex items-center justify-center flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-serif font-semibold text-base text-ink leading-tight">
            {staff}
          </div>
          <div className="font-sans text-xs text-muted mt-0.5">
            {certs.length} cert{certs.length === 1 ? '' : 's'} on file
          </div>
        </div>
        <span
          className={
            'inline-flex font-display font-semibold text-[10px] tracking-[0.25em] uppercase px-3 py-1 border ' +
            status.tone
          }
        >
          {status.label}
        </span>
      </div>
      <div className="divide-y divide-rule-soft">
        {certs.map((c) => (
          <div key={c.id} className="px-6 py-3.5 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-serif text-sm text-ink leading-snug">
                {c.certificate_name ??
                  TRAINING_KIND_LABEL[c.kind as keyof typeof TRAINING_KIND_LABEL] ??
                  c.kind}
              </div>
              <div className="font-sans text-xs text-muted mt-0.5">
                {c.awarding_body ?? 'Internal'}
                {' · awarded '}
                {dateFmt.format(new Date(c.awarded_on))}
              </div>
            </div>
            <div className="text-right">
              <div
                className={
                  'inline-flex font-display font-semibold text-[10px] tracking-[0.25em] uppercase px-2.5 py-1 border mb-1 ' +
                  BAND_TONE[c.expiry_band]
                }
              >
                {BAND_LABEL[c.expiry_band]}
              </div>
              <div className="font-sans text-xs text-muted-soft">
                {c.expires_on ? `Expires ${dateFmt.format(new Date(c.expires_on))}` : 'No expiry'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
