import { getShellContext } from '@/lib/shell/context';
import { getTrainingRecords } from '@/lib/safety/lib';
import { TRAINING_KIND_LABEL } from '@/lib/safety/standards';
import { SectionHead } from '@/components/shell/SectionHead';
import { KpiCard } from '@/components/shell/KpiCard';
import { LiabilityFooter } from '@/components/safety/LiabilityFooter';
import { FsaReferenceStrip } from '@/components/safety/FsaReferenceStrip';
import { TrainingForm } from './TrainingForm';

export const metadata = { title: 'Training \u00b7 Safety \u00b7 Palatable' };

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const BAND_LABEL: Record<string, string> = {
  expired: 'Expired',
  today: 'Expires today',
  this_week: 'This week',
  two_weeks: 'Next two weeks',
  month: 'This month',
  safe: 'Current',
  no_expiry: 'No expiry on file',
};

const BAND_TONE: Record<string, string> = {
  expired: 'text-urgent',
  today: 'text-urgent',
  this_week: 'text-urgent',
  two_weeks: 'text-attention',
  month: 'text-attention',
  safe: 'text-healthy',
  no_expiry: 'text-muted',
};

export default async function TrainingPage() {
  const ctx = await getShellContext();
  const rows = await getTrainingRecords(ctx.siteId);

  const expired = rows.filter((r) => r.expiry_band === 'expired').length;
  const within30 = rows.filter((r) =>
    ['today', 'this_week', 'two_weeks', 'month'].includes(r.expiry_band),
  ).length;

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Safety \u00b7 Training
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
        <em className="text-gold font-semibold not-italic">Training</em> Records
      </h1>
      <p className="font-serif italic text-lg text-muted mb-8">
        Staff certifications and their expiry dates. The Looking Ahead engine flags 30 / 14 / 7 / 0 days out.
      </p>

      <FsaReferenceStrip surface="training" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-10">
        <KpiCard
          label="On file"
          value={String(rows.length)}
          sub="across all staff"
        />
        <KpiCard
          label="Expired"
          value={String(expired)}
          sub="needs renewal"
          tone={expired > 0 ? 'urgent' : 'healthy'}
        />
        <KpiCard
          label="Within 30 days"
          value={String(within30)}
          sub="action this month"
          tone={within30 > 0 ? 'attention' : 'healthy'}
        />
        <KpiCard
          label="Staff covered"
          value={String(new Set(rows.map((r) => r.staff_name)).size)}
          sub="distinct names"
        />
      </div>

      <SectionHead title="Add training" />
      <TrainingForm />

      <SectionHead title="Current records" meta={rows.length + ' on file'} />
      {rows.length === 0 ? (
        <div className="bg-card border border-rule px-10 py-12 text-center">
          <p className="font-serif italic text-muted">
            No training records yet. Add the first above.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-rule">
          <div className="hidden md:grid grid-cols-[1.4fr_1.2fr_140px_140px_130px] gap-4 px-7 py-3.5 bg-paper-warm border-b border-rule">
            {['Staff', 'Certification', 'Awarded', 'Expires', 'Status'].map(
              (h) => (
                <div
                  key={h}
                  className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted"
                >
                  {h}
                </div>
              ),
            )}
          </div>
          {rows.map((r, i) => (
            <div
              key={r.id}
              className={
                'grid grid-cols-1 md:grid-cols-[1.4fr_1.2fr_140px_140px_130px] gap-4 px-7 py-4 items-center' +
                (i < rows.length - 1 ? ' border-b border-rule-soft' : '')
              }
            >
              <div className="font-serif font-semibold text-base text-ink">
                {r.staff_name}
              </div>
              <div className="font-serif text-sm text-ink-soft">
                {r.certificate_name ||
                  TRAINING_KIND_LABEL[
                    r.kind as keyof typeof TRAINING_KIND_LABEL
                  ] ||
                  r.kind}
                {r.awarding_body && (
                  <span className="text-muted-soft"> \u00b7 {r.awarding_body}</span>
                )}
              </div>
              <div className="font-serif italic text-xs text-muted">
                {dateFmt.format(new Date(r.awarded_on))}
              </div>
              <div className="font-serif italic text-xs text-muted">
                {r.expires_on ? dateFmt.format(new Date(r.expires_on)) : '\u2014'}
              </div>
              <div
                className={
                  'font-display font-semibold text-xs tracking-[0.18em] uppercase ' +
                  BAND_TONE[r.expiry_band]
                }
              >
                {BAND_LABEL[r.expiry_band]}
                {r.days_until_expiry != null &&
                  r.expiry_band !== 'safe' &&
                  r.expiry_band !== 'no_expiry' && (
                    <span className="ml-1 text-muted-soft">
                      ({r.days_until_expiry}d)
                    </span>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}

      <LiabilityFooter />
    </div>
  );
}
