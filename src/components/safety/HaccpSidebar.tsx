'use client';

import { HACCP_STEPS, type HaccpBody } from '@/lib/safety/haccp';

export function HaccpSidebar({
  currentStep,
  body,
  onStep,
}: {
  currentStep: number;
  body: HaccpBody;
  onStep: (step: number) => void;
}) {
  function hasContent(step: number): boolean {
    const v = body[`step_${step}` as keyof HaccpBody];
    return !!v && Object.keys(v as object).length > 0;
  }

  return (
    <aside className="bg-card border border-rule">
      <div className="px-6 py-4 border-b border-rule">
        <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-ink">
          The nine steps
        </div>
      </div>
      <div>
        {HACCP_STEPS.map((s) => {
          const active = s.num === currentStep;
          const done = hasContent(s.num);
          return (
            <button
              key={s.num}
              type="button"
              onClick={() => onStep(s.num)}
              className={
                'w-full text-left px-6 py-3.5 flex items-start gap-3 border-l-[3px] transition-colors ' +
                (active
                  ? 'border-l-gold bg-gold-bg'
                  : done
                    ? 'border-l-healthy/60 hover:bg-paper-warm'
                    : 'border-l-transparent hover:bg-paper-warm')
              }
            >
              <div
                className={
                  'w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 font-display font-semibold text-sm ' +
                  (active
                    ? 'bg-gold text-paper border-gold'
                    : done
                      ? 'bg-healthy/10 text-healthy border-healthy/40'
                      : 'bg-paper text-muted border-rule')
                }
              >
                {done && !active ? String.fromCharCode(0x2713) : s.num}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-serif font-semibold text-sm text-ink leading-tight">
                  {s.name}
                </div>
                <div className="font-sans text-xs text-muted mt-0.5">{s.meta}</div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
