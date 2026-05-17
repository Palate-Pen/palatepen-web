'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ensureHaccpPlanAction,
  saveHaccpStepAction,
  setHaccpStatusAction,
} from '@/lib/safety/actions';
import {
  HACCP_STATUS_LABEL,
  HACCP_STATUS_TONE,
  HACCP_STEPS,
  planCompletePct,
  type HaccpBody,
  type HaccpCcp,
  type HaccpFlowStep,
  type HaccpHazard,
  type HaccpHazardKind,
  type HaccpPlan,
  type HaccpPrefill,
  type HaccpStatus,
  type HaccpStep1,
} from '@/lib/safety/haccp';
import { HaccpSidebar } from './HaccpSidebar';
import { DishPicker, type DishPickerValue } from './DishPicker';
import type { DishPickerBands } from '@/lib/safety/dish-picker';

type ClientProps = {
  siteId: string;
  plan: HaccpPlan | null;
  prefill: HaccpPrefill;
  bands: DishPickerBands;
};

const KITCHEN_TYPES: Array<{ value: string; label: string }> = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'restaurant_with_bar', label: 'Restaurant + bar' },
  { value: 'pub', label: 'Pub kitchen' },
  { value: 'cafe', label: 'Café' },
  { value: 'takeaway', label: 'Takeaway' },
  { value: 'hotel', label: 'Hotel kitchen' },
  { value: 'event_catering', label: 'Event catering' },
  { value: 'other', label: 'Other' },
];

const SERVICE_OPTIONS = ['breakfast', 'brunch', 'lunch', 'afternoon_tea', 'dinner', 'late', 'takeaway', 'delivery'];

const HAZARD_KIND_LABEL: Record<HaccpHazardKind, string> = {
  biological: 'Biological',
  chemical: 'Chemical',
  physical: 'Physical',
  allergen: 'Allergen',
};

const DEFAULT_FLOW_STEPS = [
  { name: 'Receive', description: 'Goods arriving at the back door — checked, temp probed, signed off.' },
  { name: 'Store', description: 'Walk-in, freezer, dry store, bar cellar.' },
  { name: 'Prep', description: 'Cold prep, butchery, mise en place.' },
  { name: 'Cook', description: 'Service cooking — critical temperatures hit.' },
  { name: 'Hold', description: 'Hot hold, chilled hold, ambient.' },
  { name: 'Serve', description: 'Pass, FOH handover, takeaway packaging.' },
];

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 12);
}

export function HaccpWizardClient({
  siteId,
  plan: initialPlan,
  prefill,
  bands,
}: ClientProps) {
  const router = useRouter();
  const [plan, setPlan] = useState<HaccpPlan | null>(initialPlan);
  const [step, setStep] = useState<number>(initialPlan?.current_step ?? 1);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const body: HaccpBody = plan?.body ?? {};
  const status: HaccpStatus = plan?.status ?? 'draft';
  const completePct = useMemo(() => planCompletePct(plan), [plan]);

  // Ensure a plan exists when the wizard mounts. The page fetched the
  // current plan server-side; if it's null we create one on first
  // interaction. This keeps the read path cheap when nobody clicks.
  async function ensurePlan(): Promise<string | null> {
    if (plan?.id) return plan.id;
    const res = await ensureHaccpPlanAction({ siteId });
    if (!res.ok) {
      setError(res.error);
      return null;
    }
    const id = res.data?.id ?? null;
    if (id) {
      setPlan({
        id,
        site_id: siteId,
        status: 'draft',
        body: {},
        current_step: 1,
        signed_off_at: null,
        signed_off_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    return id;
  }

  function saveStep(stepNum: number, content: Record<string, unknown>) {
    setError(null);
    startTransition(async () => {
      const planId = await ensurePlan();
      if (!planId) return;
      const res = await saveHaccpStepAction({ planId, step: stepNum, content });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedAt(
        new Date().toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      );
      setPlan((p) =>
        p
          ? {
              ...p,
              body: { ...p.body, [`step_${stepNum}`]: content },
              current_step: stepNum,
              status: p.status === 'draft' ? 'in_progress' : p.status,
            }
          : p,
      );
      router.refresh();
    });
  }

  function markForReview() {
    if (!plan?.id) return;
    startTransition(async () => {
      const res = await setHaccpStatusAction({ planId: plan.id, status: 'review' });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPlan((p) => (p ? { ...p, status: 'review' } : p));
      router.refresh();
    });
  }

  function signOff() {
    if (!plan?.id) return;
    if (!confirm('Sign off the HACCP plan? This locks the current state and stamps your name on it.'))
      return;
    startTransition(async () => {
      const res = await setHaccpStatusAction({ planId: plan.id, status: 'signed' });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPlan((p) =>
        p ? { ...p, status: 'signed', signed_off_at: new Date().toISOString() } : p,
      );
      router.refresh();
    });
  }

  const stepMeta = HACCP_STEPS.find((s) => s.num === step) ?? HACCP_STEPS[0];

  return (
    <>
      <div className="bg-paper-warm border-l-[3px] border-gold px-8 py-6 mb-10 flex flex-wrap items-center justify-between gap-6">
        <div className="flex-1 min-w-[320px]">
          <div className="flex items-center gap-3 mb-2">
            <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold">
              {plan ? 'In progress' : 'First-time setup'}
            </div>
            <span
              className={
                'inline-flex font-display font-semibold text-[10px] tracking-[0.25em] uppercase px-2 py-0.5 border ' +
                HACCP_STATUS_TONE[status]
              }
            >
              {HACCP_STATUS_LABEL[status]}
            </span>
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
            {completePct}%
          </div>
          <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted mt-2">
            Plan complete
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        <HaccpSidebar currentStep={step} body={body} onStep={setStep} />

        <div>
          <div className="bg-card border border-rule px-8 py-7 mb-6">
            <div className="flex items-baseline justify-between mb-5 flex-wrap gap-2">
              <div>
                <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-1.5">
                  Step {step}
                </div>
                <h2 className="font-serif text-2xl font-normal text-ink leading-tight">
                  {stepMeta.name}.
                </h2>
              </div>
              <span className="font-display font-semibold text-[11px] tracking-[0.25em] uppercase text-muted">
                Step {step} of 9
              </span>
            </div>

            {step === 1 && (
              <Step1
                initial={body.step_1}
                prefill={prefill}
                onSave={(c) => saveStep(1, c)}
                pending={pending}
              />
            )}
            {step === 2 && (
              <Step2
                initial={body.step_2}
                prefill={prefill}
                onSave={(c) => saveStep(2, c)}
                pending={pending}
              />
            )}
            {step === 3 && (
              <Step3
                initial={body.step_3}
                hazards={(body.step_2?.hazards as HaccpHazard[]) ?? []}
                bands={bands}
                onSave={(c) => saveStep(3, c)}
                pending={pending}
              />
            )}
            {step >= 4 && step <= 9 && (
              <StubStep
                stepNum={step}
                onSave={(c) => saveStep(step, c)}
                pending={pending}
              />
            )}

            <div className="mt-6 pt-5 border-t border-rule flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  disabled={step === 1}
                  className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-4 py-2 bg-paper text-ink-soft border border-rule hover:border-gold disabled:opacity-30 transition-colors"
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.min(9, s + 1))}
                  disabled={step === 9}
                  className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-4 py-2 bg-paper text-ink-soft border border-rule hover:border-gold disabled:opacity-30 transition-colors"
                >
                  Next →
                </button>
              </div>
              <div className="flex items-center gap-3">
                {savedAt && (
                  <span className="font-serif italic text-sm text-healthy">
                    Saved at {savedAt}
                  </span>
                )}
                {error && (
                  <span className="font-serif italic text-sm text-urgent">{error}</span>
                )}
                {status === 'in_progress' && completePct >= 70 && (
                  <button
                    type="button"
                    onClick={markForReview}
                    disabled={pending}
                    className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-4 py-2 bg-transparent text-gold border border-gold hover:bg-gold-bg disabled:opacity-50 transition-colors"
                  >
                    Mark for review
                  </button>
                )}
                {status === 'review' && (
                  <button
                    type="button"
                    onClick={signOff}
                    disabled={pending}
                    className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-4 py-2 bg-gold text-paper border border-gold hover:bg-gold-dark disabled:opacity-50 transition-colors"
                  >
                    Sign off
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------
// Step 1 — Business profile
// ---------------------------------------------------------------------
function Step1({
  initial,
  prefill,
  onSave,
  pending,
}: {
  initial: Partial<HaccpStep1> | undefined;
  prefill: HaccpPrefill;
  onSave: (content: Record<string, unknown>) => void;
  pending: boolean;
}) {
  const [tradingName, setTradingName] = useState(
    initial?.trading_name ?? prefill.trading_name,
  );
  const [fsaReg, setFsaReg] = useState(initial?.fsa_registration ?? '');
  const [kitchenType, setKitchenType] = useState(
    initial?.kitchen_type ?? prefill.kitchen_type_hint,
  );
  const [teamSize, setTeamSize] = useState(
    String(initial?.team_size ?? prefill.team_size ?? ''),
  );
  const [services, setServices] = useState<string[]>(
    initial?.services ?? prefill.services_hint,
  );
  const [notes, setNotes] = useState(initial?.notes_md ?? '');

  function toggleService(s: string) {
    setServices((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
    );
  }

  function save() {
    const ts = Number(teamSize);
    onSave({
      trading_name: tradingName.trim(),
      fsa_registration: fsaReg.trim(),
      kitchen_type: kitchenType,
      team_size: Number.isFinite(ts) && ts > 0 ? ts : null,
      services,
      notes_md: notes.trim(),
    });
  }

  return (
    <>
      <PrefillBanner
        text={
          <>
            <strong className="font-semibold">We&apos;ve pre-filled what we know.</strong>{' '}
            Trading name from your site name, kitchen type inferred from your dish mix, team size from your memberships. Anything in gold is a pre-fill — review and adjust.
          </>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Field label="Trading name" prefilled={!!prefill.trading_name && tradingName === prefill.trading_name}>
          <input
            type="text"
            value={tradingName}
            onChange={(e) => setTradingName(e.target.value)}
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          />
        </Field>
        <Field label="FSA registration number">
          <input
            type="text"
            value={fsaReg}
            onChange={(e) => setFsaReg(e.target.value)}
            placeholder="e.g. 1234567"
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Field label="Kitchen type" prefilled={kitchenType === prefill.kitchen_type_hint}>
          <select
            value={kitchenType}
            onChange={(e) => setKitchenType(e.target.value)}
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          >
            {KITCHEN_TYPES.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Team size" prefilled={teamSize === String(prefill.team_size)}>
          <input
            type="number"
            min="1"
            value={teamSize}
            onChange={(e) => setTeamSize(e.target.value)}
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          />
        </Field>
      </div>
      <Field label="Services">
        <div className="flex flex-wrap gap-2 mb-3">
          {SERVICE_OPTIONS.map((s) => {
            const active = services.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleService(s)}
                className={
                  'font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-3 py-1.5 border transition-colors ' +
                  (active
                    ? 'bg-gold text-paper border-gold'
                    : 'bg-paper text-ink-soft border-rule hover:border-gold')
                }
              >
                {s.replace('_', ' ')}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Notes (optional)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Anything else an EHO inspector should know — accreditations, unusual practices, supplier exclusions."
          className="w-full px-3 py-2 border border-rule bg-paper font-serif text-sm text-ink-soft leading-relaxed focus:border-gold focus:outline-none"
        />
      </Field>
      <SaveButton onSave={save} pending={pending} />
    </>
  );
}

// ---------------------------------------------------------------------
// Step 2 — Menu & hazard analysis
// ---------------------------------------------------------------------
function Step2({
  initial,
  prefill,
  onSave,
  pending,
}: {
  initial: Partial<{ flow_steps: HaccpFlowStep[]; hazards: HaccpHazard[] }> | undefined;
  prefill: HaccpPrefill;
  onSave: (content: Record<string, unknown>) => void;
  pending: boolean;
}) {
  const [flowSteps, setFlowSteps] = useState<HaccpFlowStep[]>(
    initial?.flow_steps && initial.flow_steps.length > 0
      ? (initial.flow_steps as HaccpFlowStep[])
      : DEFAULT_FLOW_STEPS.map((f) => ({ ...f, id: newId() })),
  );

  // Build a starter hazard list from prefill — allergens become allergen
  // hazards; protein categories become biological hazards.
  const seedHazards = useMemo<HaccpHazard[]>(() => {
    const seeded: HaccpHazard[] = [];
    for (const a of prefill.allergens) {
      seeded.push({
        id: newId(),
        kind: 'allergen',
        description: `${a.charAt(0).toUpperCase() + a.slice(1)} cross-contact risk`,
        source: 'Listed on a recipe ingredient',
      });
    }
    for (const c of prefill.protein_categories) {
      seeded.push({
        id: newId(),
        kind: 'biological',
        description: `${c.charAt(0).toUpperCase() + c.slice(1)} — pathogen growth between 5°C and 63°C`,
        source: `Recipes using ${c}`,
      });
    }
    if (seeded.length === 0) {
      seeded.push({
        id: newId(),
        kind: 'biological',
        description: 'Generic pathogen growth in the temperature danger zone (5–63°C)',
        source: 'Cooking + chilling steps',
      });
    }
    return seeded;
  }, [prefill]);

  const [hazards, setHazards] = useState<HaccpHazard[]>(
    initial?.hazards && initial.hazards.length > 0
      ? (initial.hazards as HaccpHazard[])
      : seedHazards,
  );

  function updateHazard(id: string, patch: Partial<HaccpHazard>) {
    setHazards((cur) => cur.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  }
  function removeHazard(id: string) {
    setHazards((cur) => cur.filter((h) => h.id !== id));
  }
  function addHazard() {
    setHazards((cur) => [
      ...cur,
      { id: newId(), kind: 'biological', description: '', source: '' },
    ]);
  }
  function updateFlow(id: string, patch: Partial<HaccpFlowStep>) {
    setFlowSteps((cur) => cur.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }
  function removeFlow(id: string) {
    setFlowSteps((cur) => cur.filter((f) => f.id !== id));
  }
  function addFlow() {
    setFlowSteps((cur) => [...cur, { id: newId(), name: '', description: '' }]);
  }

  function save() {
    onSave({ flow_steps: flowSteps, hazards });
  }

  return (
    <>
      <PrefillBanner
        text={
          <>
            <strong className="font-semibold">Hazard list seeded from your menu.</strong>{' '}
            Allergens flagged on your recipes show up here as allergen hazards. Protein categories (meat, fish, dairy, shellfish) seed biological hazards in the temperature danger zone. Add, edit, or remove — this is the working copy.
          </>
        }
      />

      <div className="font-display font-semibold text-[12px] tracking-[0.25em] uppercase text-ink mb-3">
        Flow of food through the kitchen
      </div>
      <div className="bg-paper-warm border border-rule mb-6">
        {flowSteps.map((f, i) => (
          <div
            key={f.id}
            className={
              'grid grid-cols-1 md:grid-cols-[180px_1fr_36px] gap-3 px-5 py-3 items-center ' +
              (i < flowSteps.length - 1 ? 'border-b border-rule-soft' : '')
            }
          >
            <input
              type="text"
              value={f.name}
              onChange={(e) => updateFlow(f.id, { name: e.target.value })}
              placeholder="step"
              className="px-2 py-1.5 border border-rule bg-paper font-serif font-semibold text-sm text-ink focus:border-gold focus:outline-none"
            />
            <input
              type="text"
              value={f.description}
              onChange={(e) => updateFlow(f.id, { description: e.target.value })}
              placeholder="what happens here"
              className="px-2 py-1.5 border border-rule bg-paper font-serif text-sm text-ink focus:border-gold focus:outline-none"
            />
            <button
              type="button"
              onClick={() => removeFlow(f.id)}
              aria-label="Remove flow step"
              className="font-display text-base text-muted hover:text-urgent leading-none"
            >
              {String.fromCharCode(0xd7)}
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addFlow}
        className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-4 py-2 bg-transparent text-gold border border-gold hover:bg-gold-bg transition-colors mb-8"
      >
        + Flow step
      </button>

      <div className="font-display font-semibold text-[12px] tracking-[0.25em] uppercase text-ink mb-3">
        Hazards identified
      </div>
      <div className="space-y-3 mb-3">
        {hazards.map((h) => (
          <div key={h.id} className="bg-paper-warm border border-rule px-5 py-4">
            <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_36px] gap-3 items-start">
              <select
                value={h.kind}
                onChange={(e) =>
                  updateHazard(h.id, { kind: e.target.value as HaccpHazardKind })
                }
                className="px-2 py-1.5 border border-rule bg-paper font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-ink focus:border-gold focus:outline-none"
              >
                {(Object.keys(HAZARD_KIND_LABEL) as HaccpHazardKind[]).map((k) => (
                  <option key={k} value={k}>
                    {HAZARD_KIND_LABEL[k]}
                  </option>
                ))}
              </select>
              <div className="space-y-2">
                <input
                  type="text"
                  value={h.description}
                  onChange={(e) =>
                    updateHazard(h.id, { description: e.target.value })
                  }
                  placeholder="What's the hazard?"
                  className="w-full px-2 py-1.5 border border-rule bg-paper font-serif text-sm text-ink focus:border-gold focus:outline-none"
                />
                <input
                  type="text"
                  value={h.source}
                  onChange={(e) => updateHazard(h.id, { source: e.target.value })}
                  placeholder="Where does it come from?"
                  className="w-full px-2 py-1.5 border border-rule bg-paper font-serif italic text-xs text-ink-soft focus:border-gold focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => removeHazard(h.id)}
                aria-label="Remove hazard"
                className="font-display text-base text-muted hover:text-urgent leading-none"
              >
                {String.fromCharCode(0xd7)}
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addHazard}
        className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-4 py-2 bg-transparent text-gold border border-gold hover:bg-gold-bg transition-colors mb-6"
      >
        + Hazard
      </button>

      <SaveButton onSave={save} pending={pending} />
    </>
  );
}

// ---------------------------------------------------------------------
// Step 3 — Critical Control Points
// ---------------------------------------------------------------------
function Step3({
  initial,
  hazards,
  bands,
  onSave,
  pending,
}: {
  initial: Partial<{ ccps: HaccpCcp[] }> | undefined;
  hazards: HaccpHazard[];
  bands: DishPickerBands;
  onSave: (content: Record<string, unknown>) => void;
  pending: boolean;
}) {
  const [ccps, setCcps] = useState<HaccpCcp[]>(
    initial?.ccps && initial.ccps.length > 0
      ? (initial.ccps as HaccpCcp[])
      : [
          {
            id: newId(),
            name: 'Cooking core temperature',
            hazard_ref: hazards.find((h) => h.kind === 'biological')?.id ?? '',
            critical_limit: 'Core temperature ≥ 75°C for 30 seconds',
            justification: 'FSA-aligned threshold for pathogen reduction (cooking).',
            recipe_ids: [],
          },
          {
            id: newId(),
            name: 'Hot hold',
            hazard_ref: hazards.find((h) => h.kind === 'biological')?.id ?? '',
            critical_limit: 'Held at ≥ 63°C until served',
            justification: 'Prevents pathogen growth in the danger zone.',
            recipe_ids: [],
          },
          {
            id: newId(),
            name: 'Chilled storage',
            hazard_ref: hazards.find((h) => h.kind === 'biological')?.id ?? '',
            critical_limit: 'Walk-in / under-counter ≤ 8°C',
            justification: 'FSA requires ≤ 8°C for chilled food storage.',
            recipe_ids: [],
          },
        ],
  );

  // Per-CCP dish picker state — kept locally to avoid prop churn
  const [pickerOpenId, setPickerOpenId] = useState<string | null>(null);

  function updateCcp(id: string, patch: Partial<HaccpCcp>) {
    setCcps((cur) => cur.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function addCcp() {
    setCcps((cur) => [
      ...cur,
      {
        id: newId(),
        name: '',
        hazard_ref: hazards[0]?.id ?? '',
        critical_limit: '',
        justification: '',
        recipe_ids: [],
      },
    ]);
  }
  function removeCcp(id: string) {
    setCcps((cur) => cur.filter((c) => c.id !== id));
  }

  function addRecipeToCcp(id: string, value: DishPickerValue) {
    if (!value.recipe_id) return;
    const ccp = ccps.find((c) => c.id === id);
    if (!ccp) return;
    if (ccp.recipe_ids.includes(value.recipe_id)) return;
    updateCcp(id, { recipe_ids: [...ccp.recipe_ids, value.recipe_id] });
  }

  function removeRecipeFromCcp(id: string, recipeId: string) {
    const ccp = ccps.find((c) => c.id === id);
    if (!ccp) return;
    updateCcp(id, { recipe_ids: ccp.recipe_ids.filter((r) => r !== recipeId) });
  }

  function recipeName(recipeId: string): string {
    const all = [...bands.library, ...bands.todays_menu, ...bands.prep_items];
    return all.find((d) => d.recipe_id === recipeId)?.name ?? 'unknown';
  }

  function save() {
    onSave({ ccps });
  }

  return (
    <>
      <PrefillBanner
        text={
          <>
            <strong className="font-semibold">Three CCPs seeded from FSA defaults</strong>{' '}
            — cooking, hot hold, chilled storage. Edit the critical limits, justifications, and link the specific dishes each CCP applies to using the dish picker.
          </>
        }
      />
      <div className="space-y-4 mb-3">
        {ccps.map((c) => (
          <div key={c.id} className="bg-paper-warm border border-rule px-5 py-4">
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <input
                type="text"
                value={c.name}
                onChange={(e) => updateCcp(c.id, { name: e.target.value })}
                placeholder="CCP name (e.g. Cooking core temperature)"
                className="flex-1 px-2 py-1.5 border border-rule bg-paper font-serif font-semibold text-base text-ink focus:border-gold focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeCcp(c.id)}
                aria-label="Remove CCP"
                className="font-display text-base text-muted hover:text-urgent leading-none"
              >
                {String.fromCharCode(0xd7)}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <Field label="Linked hazard">
                <select
                  value={c.hazard_ref}
                  onChange={(e) => updateCcp(c.id, { hazard_ref: e.target.value })}
                  className="w-full px-2 py-1.5 border border-rule bg-paper font-serif text-sm text-ink focus:border-gold focus:outline-none"
                >
                  <option value="">— select hazard —</option>
                  {hazards.map((h) => (
                    <option key={h.id} value={h.id}>
                      {HAZARD_KIND_LABEL[h.kind]} · {h.description.slice(0, 60)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Critical limit">
                <input
                  type="text"
                  value={c.critical_limit}
                  onChange={(e) =>
                    updateCcp(c.id, { critical_limit: e.target.value })
                  }
                  placeholder="e.g. Core temp ≥ 75°C / 30s"
                  className="w-full px-2 py-1.5 border border-rule bg-paper font-serif text-sm text-ink focus:border-gold focus:outline-none"
                />
              </Field>
            </div>

            <Field label="Justification">
              <textarea
                value={c.justification}
                onChange={(e) => updateCcp(c.id, { justification: e.target.value })}
                rows={2}
                placeholder="Why this limit, per FSA / SFBB / scientific reference."
                className="w-full px-2 py-1.5 border border-rule bg-paper font-serif text-sm text-ink-soft focus:border-gold focus:outline-none"
              />
            </Field>

            <div className="mt-3">
              <div className="font-display font-semibold text-[11px] tracking-[0.25em] uppercase text-muted mb-2">
                Linked dishes ({c.recipe_ids.length})
              </div>
              {c.recipe_ids.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {c.recipe_ids.map((rid) => (
                    <span
                      key={rid}
                      className="inline-flex items-center gap-1.5 bg-gold-bg border border-gold/40 px-2.5 py-1"
                    >
                      <span className="font-serif text-xs text-gold-dark">
                        {recipeName(rid)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeRecipeFromCcp(c.id, rid)}
                        aria-label="Unlink dish"
                        className="font-display text-xs text-gold-dark hover:text-urgent leading-none"
                      >
                        {String.fromCharCode(0xd7)}
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {pickerOpenId === c.id ? (
                <div>
                  <DishPicker
                    bands={bands}
                    value={{ recipe_id: null, text: '' }}
                    onChange={(v) => {
                      addRecipeToCcp(c.id, v);
                      setPickerOpenId(null);
                    }}
                    label="Pick a dish"
                    meta="search the live menu / prep / library"
                  />
                  <button
                    type="button"
                    onClick={() => setPickerOpenId(null)}
                    className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase px-2 py-1 text-muted hover:text-ink mt-2"
                  >
                    Close picker
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPickerOpenId(c.id)}
                  className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-3 py-1.5 bg-transparent text-gold border border-gold hover:bg-gold-bg transition-colors"
                >
                  + Link a dish
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addCcp}
        className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-4 py-2 bg-transparent text-gold border border-gold hover:bg-gold-bg transition-colors mb-6"
      >
        + Add CCP
      </button>

      <SaveButton onSave={save} pending={pending} />
    </>
  );
}

// ---------------------------------------------------------------------
// Stub step (4–9) — single notes field + save
// ---------------------------------------------------------------------
function StubStep({
  stepNum,
  onSave,
  pending,
}: {
  stepNum: number;
  onSave: (content: Record<string, unknown>) => void;
  pending: boolean;
}) {
  const [notes, setNotes] = useState('');
  const meta = HACCP_STEPS.find((s) => s.num === stepNum);
  return (
    <>
      <div className="bg-ink/[0.02] border border-dashed border-rule px-6 py-6 mb-4">
        <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-muted mb-2">
          Full form lands in the next wizard batch
        </div>
        <p className="font-serif italic text-sm text-muted">
          {meta?.name} ({meta?.meta}) — for now, capture anything you already
          know in the notes field below. The wizard will auto-populate this
          section from your existing data once the form fields land.
        </p>
      </div>
      <Field label="Notes (will auto-migrate when the form lands)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Whatever you already know about this step."
          className="w-full px-3 py-2 border border-rule bg-paper font-serif text-sm text-ink-soft focus:border-gold focus:outline-none"
        />
      </Field>
      <SaveButton onSave={() => onSave({ notes_md: notes })} pending={pending} />
    </>
  );
}

// ---------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------
function Field({
  label,
  prefilled = false,
  children,
}: {
  label: string;
  prefilled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block mb-1.5">
      <span
        className={
          'font-display font-semibold text-[11px] tracking-[0.3em] uppercase mb-1.5 block ' +
          (prefilled ? 'text-gold' : 'text-muted')
        }
      >
        {label}
        {prefilled && (
          <span className="ml-2 normal-case tracking-normal italic font-serif text-[10px] text-gold-dark">
            pre-filled
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

function PrefillBanner({ text }: { text: React.ReactNode }) {
  return (
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
      <p className="font-serif text-sm text-ink-soft leading-relaxed">{text}</p>
    </div>
  );
}

function SaveButton({ onSave, pending }: { onSave: () => void; pending: boolean }) {
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={pending}
      className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark disabled:opacity-50 transition-colors"
    >
      {pending ? 'Saving' + String.fromCharCode(0x2026) : 'Save step'}
    </button>
  );
}
