import { LiabilityFooter } from '@/components/safety/LiabilityFooter';
import { FsaReferenceStrip } from '@/components/safety/FsaReferenceStrip';
import { SafetyPageHeader } from '@/components/safety/SafetyPageHeader';

export const metadata = { title: 'HACCP Wizard · Safety · Palatable' };

const STEPS: Array<{ num: number; name: string; meta: string }> = [
  { num: 1, name: 'Business profile', meta: '5 min · pre-filled' },
  { num: 2, name: 'Menu & hazard analysis', meta: 'Auto-populated from menu · 10 min' },
  { num: 3, name: 'Critical Control Points', meta: 'Per high-risk dish · 8 min' },
  { num: 4, name: 'Critical limits', meta: 'FSA defaults pre-filled · 4 min' },
  { num: 5, name: 'Monitoring procedures', meta: 'Maps to Safety tab · 5 min' },
  { num: 6, name: 'Corrective actions', meta: 'From the library · 5 min' },
  { num: 7, name: 'Verification & review', meta: 'Schedule + sign-offs · 3 min' },
  { num: 8, name: 'Document generation', meta: 'Auto-formatted PDF · 2 min' },
  { num: 9, name: 'Annual review', meta: 'Reminder for next year · 3 min' },
];

export default async function HaccpPage() {
  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1280px] mx-auto">
      <SafetyPageHeader
        crumb="HACCP Wizard"
        title="Build your"
        titleEm="HACCP plan"
        subtitle="UK food safety law requires a written plan based on HACCP principles. Nine steps, pre-filled from what Palatable already knows about your kitchen."
      />

      <div className="bg-paper-warm border-l-[3px] border-gold px-8 py-6 mb-10 flex flex-wrap items-center justify-between gap-6">
        <div className="flex-1 min-w-[320px]">
          <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-2">
            First-time setup
          </div>
          <div className="font-serif text-xl text-ink leading-tight mb-2">
            A guided plan, not a blank page.
          </div>
          <p className="font-serif text-sm text-ink-soft leading-relaxed max-w-[640px]">
            Most kitchens spend £1,500–£3,000 on a HACCP consultant. The wizard does the equivalent work using your menu, suppliers, and recipes — already in Palatable. You&apos;ll review and confirm each step. The output is a formatted document an EHO will accept.
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono font-medium text-3xl text-gold-dark leading-none">
            ≈ 45 min
          </div>
          <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted mt-2">
            Estimated time
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        <aside className="bg-card border border-rule">
          <div className="px-6 py-4 border-b border-rule">
            <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-ink">
              The nine steps
            </div>
          </div>
          <div>
            {STEPS.map((s) => (
              <div
                key={s.num}
                className={
                  'px-6 py-3.5 flex items-start gap-3 border-l-[3px] ' +
                  (s.num === 1
                    ? 'border-l-gold bg-gold-bg'
                    : 'border-l-transparent')
                }
              >
                <div
                  className={
                    'w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 font-display font-semibold text-sm ' +
                    (s.num === 1
                      ? 'bg-gold text-paper border-gold'
                      : 'bg-paper text-muted border-rule')
                  }
                >
                  {s.num}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-serif font-semibold text-sm text-ink leading-tight">
                    {s.name}
                  </div>
                  <div className="font-sans text-xs text-muted mt-0.5">
                    {s.meta}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div>
          <div className="bg-card border border-rule px-8 py-7 mb-6">
            <div className="flex items-baseline justify-between mb-5 flex-wrap gap-2">
              <div>
                <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-1.5">
                  Step 1
                </div>
                <h2 className="font-display text-2xl font-normal text-ink leading-tight">
                  Your <em className="text-gold italic font-medium">business profile</em>.
                </h2>
              </div>
              <span className="font-display font-semibold text-[11px] tracking-[0.25em] uppercase text-muted">
                Step 1 of 9
              </span>
            </div>

            <div className="bg-paper-warm border border-rule border-l-[3px] border-l-gold px-5 py-4 mb-6 flex items-start gap-3">
              <div className="text-gold flex-shrink-0 mt-0.5">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="w-5 h-5"
                >
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <path d="M22 4L12 14.01l-3-3" />
                </svg>
              </div>
              <p className="font-serif text-sm text-ink-soft leading-relaxed">
                <strong className="font-semibold">We&apos;ll pre-fill what we know.</strong>{' '}
                Trading name, kitchen type, FSA registration, team size — all pulled from your Palatable settings, team roster, and recipes. Anything in gold is pre-filled — review, confirm, or change as needed.
              </p>
            </div>

            <div className="bg-ink/[0.02] border border-dashed border-rule px-6 py-8 text-center">
              <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-muted mb-2">
                Wizard form lands next batch
              </div>
              <p className="font-serif italic text-sm text-muted max-w-[480px] mx-auto">
                Steps 1–9 will read from your existing site preferences, menus, recipes, suppliers, and probe-reading history to draft the plan automatically. You&apos;ll review and sign off each section, then we generate the PDF.
              </p>
            </div>
          </div>

          <FsaReferenceStrip surface="haccp" variant="full" />
        </div>
      </div>

      <LiabilityFooter />
    </div>
  );
}
