'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ensureHaccpPlanAction,
  saveHaccpStepAction,
  setHaccpStatusAction,
} from '@/lib/safety/actions';
import {
  CORRECTIVE_ACTION_LIBRARY,
  HACCP_STATUS_LABEL,
  HACCP_STATUS_TONE,
  HACCP_STEPS,
  MONITOR_SOURCE_LABEL,
  REVIEW_CADENCE_LABEL,
  planCompletePct,
  type HaccpBody,
  type HaccpCcp,
  type HaccpFlowStep,
  type HaccpHazard,
  type HaccpHazardKind,
  type HaccpMonitorSource,
  type HaccpPlan,
  type HaccpPrefill,
  type HaccpReviewCadence,
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

// ---------------------------------------------------------------------
// Step 1 option lists (mockup-aligned)
// ---------------------------------------------------------------------
const KITCHEN_TYPES: Array<{ value: string; name: string; desc: string }> = [
  { value: 'restaurant', name: 'Restaurant', desc: 'Table service, fixed menu, dine-in' },
  { value: 'gastropub', name: 'Gastropub', desc: 'Bar-led with kitchen service' },
  { value: 'cafe', name: 'Café / Coffee', desc: 'Counter, light cooking, pastries' },
  { value: 'takeaway', name: 'Takeaway / Delivery', desc: 'No dine-in, food packed to go' },
  { value: 'catering', name: 'Catering / Events', desc: 'Off-site preparation & service' },
  { value: 'food_truck', name: 'Food Truck / Stall', desc: 'Mobile or market trading' },
];

const SERVICE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'a_la_carte', label: 'Dine-in à la carte' },
  { value: 'events', label: 'Pre-booked group / events' },
  { value: 'bar_cocktails', label: 'Bar / cocktails' },
  { value: 'takeaway', label: 'Takeaway from premises' },
  { value: 'delivery', label: 'Delivery (in-house or Deliveroo)' },
  { value: 'ppds', label: 'Pre-packed for direct sale (PPDS)' },
  { value: 'outdoor', label: 'Outdoor / al fresco service' },
  { value: 'vulnerable', label: 'Vulnerable groups (care, school)' },
];

const TEAM_SIZE_BANDS: Array<{ value: string; name: string; desc?: string }> = [
  { value: '1-3', name: '1–3 people' },
  { value: '4-10', name: '4–10 people' },
  { value: '11-25', name: '11–25 people' },
  { value: '26+', name: '26+ people' },
];

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

// FSA-default critical limits keyed by CCP name keywords. Returned by
// derivedLimitFor when Step 4 first renders so each CCP gets a sensible
// pre-fill the chef can override.
function derivedLimitFor(ccpName: string): {
  parameter: 'temperature' | 'time' | 'ph' | 'visual' | 'other';
  operator: '>=' | '<=' | 'between' | 'visual';
  min_value: string;
  max_value: string;
  unit: string;
  reference: string;
} {
  const n = ccpName.toLowerCase();
  if (n.includes('cook') || n.includes('reheat') || n.includes('core')) {
    return {
      parameter: 'temperature',
      operator: '>=',
      min_value: '75',
      max_value: '',
      unit: '°C',
      reference: 'FSA — cooking 75°C / 30s',
    };
  }
  if (n.includes('hot hold')) {
    return {
      parameter: 'temperature',
      operator: '>=',
      min_value: '63',
      max_value: '',
      unit: '°C',
      reference: 'FSA — hot hold ≥63°C',
    };
  }
  if (n.includes('chill') || n.includes('fridge') || n.includes('store')) {
    return {
      parameter: 'temperature',
      operator: '<=',
      min_value: '',
      max_value: '8',
      unit: '°C',
      reference: 'FSA — chilled storage ≤8°C',
    };
  }
  if (n.includes('freezer')) {
    return {
      parameter: 'temperature',
      operator: '<=',
      min_value: '',
      max_value: '-18',
      unit: '°C',
      reference: 'FSA — freezer ≤−18°C',
    };
  }
  if (n.includes('cool')) {
    return {
      parameter: 'temperature',
      operator: 'between',
      min_value: '5',
      max_value: '63',
      unit: '°C / 90 min',
      reference: 'FSA — cool 63°C → 8°C within 90 min',
    };
  }
  return {
    parameter: 'visual',
    operator: 'visual',
    min_value: '',
    max_value: '',
    unit: '',
    reference: 'Operator-defined limit',
  };
}

function suggestedMonitorSource(ccpName: string): HaccpMonitorSource {
  const n = ccpName.toLowerCase();
  if (n.includes('clean')) return 'cleaning';
  if (n.includes('open')) return 'opening_check';
  if (n.includes('allergen') || n.includes('train')) return 'training';
  return 'probe';
}

// =====================================================================
// Main client
// =====================================================================
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

  function saveStep(stepNum: number, content: Record<string, unknown>, advance: boolean = false) {
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
      if (advance && stepNum < 9) setStep(stepNum + 1);
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

  function saveAndExit() {
    router.push('/safety');
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
            Most kitchens spend <strong className="font-semibold">£1,500–£3,000</strong> on a HACCP consultant. The wizard does the equivalent work using your menu, suppliers, and recipes — already in Palatable. You&apos;ll review and confirm each step. The output is a formatted document an EHO will accept.
          </p>
        </div>
        <div className="text-right pl-6 border-l border-rule">
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
            <div className="flex items-baseline justify-between pb-5 border-b border-rule mb-7 flex-wrap gap-2">
              <div>
                <div className="font-display font-semibold text-[10px] tracking-[0.35em] uppercase text-gold mb-1.5">
                  Step {step}
                </div>
                <h2 className="font-serif text-[28px] font-normal text-ink leading-tight">
                  {stepMeta.name}.
                </h2>
              </div>
              <span className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-muted">
                Step {step} of 9
              </span>
            </div>

            {step === 1 && (
              <Step1
                initial={body.step_1}
                prefill={prefill}
                onSave={(c, advance) => saveStep(1, c, advance)}
                pending={pending}
              />
            )}
            {step === 2 && (
              <Step2
                initial={body.step_2}
                prefill={prefill}
                onSave={(c, advance) => saveStep(2, c, advance)}
                pending={pending}
              />
            )}
            {step === 3 && (
              <Step3
                initial={body.step_3}
                hazards={(body.step_2?.hazards as HaccpHazard[]) ?? []}
                bands={bands}
                onSave={(c, advance) => saveStep(3, c, advance)}
                pending={pending}
              />
            )}
            {step === 4 && (
              <Step4
                initial={body.step_4}
                ccps={(body.step_3?.ccps as HaccpCcp[]) ?? []}
                onSave={(c, advance) => saveStep(4, c, advance)}
                pending={pending}
              />
            )}
            {step === 5 && (
              <Step5
                initial={body.step_5}
                ccps={(body.step_3?.ccps as HaccpCcp[]) ?? []}
                onSave={(c, advance) => saveStep(5, c, advance)}
                pending={pending}
              />
            )}
            {step === 6 && (
              <Step6
                initial={body.step_6}
                ccps={(body.step_3?.ccps as HaccpCcp[]) ?? []}
                onSave={(c, advance) => saveStep(6, c, advance)}
                pending={pending}
              />
            )}
            {step === 7 && (
              <Step7
                initial={body.step_7}
                prefill={prefill}
                onSave={(c, advance) => saveStep(7, c, advance)}
                pending={pending}
              />
            )}
            {step === 8 && (
              <Step8
                initial={body.step_8}
                body={body}
                onSave={(c, advance) => saveStep(8, c, advance)}
                pending={pending}
              />
            )}
            {step === 9 && (
              <Step9
                initial={body.step_9}
                onSave={(c, advance) => saveStep(9, c, advance)}
                pending={pending}
              />
            )}

            <div className="mt-9 pt-6 border-t border-rule flex items-center justify-between flex-wrap gap-3">
              <SaveStatus savedAt={savedAt} error={error} status={status} />
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  disabled={step === 1 || pending}
                  className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase px-4 py-2.5 bg-paper text-ink-soft border border-rule hover:border-gold disabled:opacity-30 transition-colors"
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  onClick={saveAndExit}
                  disabled={pending}
                  className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase px-4 py-2.5 bg-paper text-ink-soft border border-rule hover:border-gold disabled:opacity-30 transition-colors"
                >
                  Save &amp; exit
                </button>
                {status === 'in_progress' && completePct >= 70 && (
                  <button
                    type="button"
                    onClick={markForReview}
                    disabled={pending}
                    className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase px-4 py-2.5 bg-transparent text-gold border border-gold hover:bg-gold-bg disabled:opacity-50 transition-colors"
                  >
                    Mark for review
                  </button>
                )}
                {status === 'review' && (
                  <button
                    type="button"
                    onClick={signOff}
                    disabled={pending}
                    className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase px-4 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark disabled:opacity-50 transition-colors"
                  >
                    Sign off
                  </button>
                )}
                {step < 9 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.min(9, s + 1))}
                    disabled={pending}
                    className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase px-4 py-2.5 bg-ink text-paper border border-ink hover:bg-gold hover:border-gold disabled:opacity-50 transition-colors inline-flex items-center gap-2"
                  >
                    Continue to step {step + 1}
                    <span className="font-mono text-sm">→</span>
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

// =====================================================================
// Step 1 — Business profile (mockup-aligned)
// =====================================================================
function Step1({
  initial,
  prefill,
  onSave,
  pending,
}: {
  initial: Partial<HaccpStep1> | undefined;
  prefill: HaccpPrefill;
  onSave: (content: Record<string, unknown>, advance: boolean) => void;
  pending: boolean;
}) {
  const initialTrading = initial?.trading_name ?? prefill.trading_name;
  const initialKitchen = initial?.kitchen_type ?? prefill.kitchen_type_hint;
  const initialServices = initial?.services ?? prefill.services_hint;
  const initialTeamBand =
    (initial as Partial<HaccpStep1> & { team_size_band?: string })?.team_size_band ??
    prefill.team_size_band;
  const initialPerson =
    (initial as Partial<HaccpStep1> & { person_responsible?: string })?.person_responsible ??
    prefill.person_responsible;

  const [tradingName, setTradingName] = useState(initialTrading);
  const [legalEntity, setLegalEntity] = useState(
    (initial as Partial<HaccpStep1> & { legal_entity?: string })?.legal_entity ?? '',
  );
  const [fsaReg, setFsaReg] = useState(initial?.fsa_registration ?? '');
  const [kitchenType, setKitchenType] = useState(initialKitchen);
  const [services, setServices] = useState<string[]>(initialServices);
  const [teamBand, setTeamBand] = useState(initialTeamBand);
  const [personResponsible, setPersonResponsible] = useState(initialPerson);
  const [notes, setNotes] = useState(initial?.notes_md ?? '');

  function toggleService(s: string) {
    setServices((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
    );
  }

  function buildContent() {
    return {
      trading_name: tradingName.trim(),
      legal_entity: legalEntity.trim(),
      fsa_registration: fsaReg.trim(),
      kitchen_type: kitchenType,
      team_size: prefill.team_size,
      team_size_band: teamBand,
      services,
      person_responsible: personResponsible.trim(),
      notes_md: notes.trim(),
    };
  }

  return (
    <>
      <PrefillBanner>
        <strong className="font-semibold text-gold-dark">We&apos;ve pre-filled what we know.</strong>{' '}
        Trading name from your site, kitchen type inferred from your dish mix, team size from your memberships, person responsible from your training records. Anything in gold is pre-filled — review, confirm, or change as needed.
      </PrefillBanner>

      <Field
        label="Trading Name"
        hint={
          <>
            As registered with your local authority.{' '}
            <strong className="not-italic font-semibold text-ink-soft">Pulled from Settings.</strong>
          </>
        }
      >
        <TextInput
          value={tradingName}
          onChange={setTradingName}
          prefilled={tradingName === prefill.trading_name && tradingName.length > 0}
        />
      </Field>

      <Field
        label="Legal Entity &amp; FSA Registration"
        hint="Required on the HACCP document."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextInput
            value={legalEntity}
            onChange={setLegalEntity}
            placeholder="Legal entity name (e.g. Berber & Q Limited)"
          />
          <TextInput
            value={fsaReg}
            onChange={setFsaReg}
            placeholder="FSA registration number"
          />
        </div>
      </Field>

      <Field
        label="Kitchen Type"
        hint="This sets the template baseline and the questions in later steps. Pick the closest match."
      >
        <PickerGrid>
          {KITCHEN_TYPES.map((k) => (
            <PickerCard
              key={k.value}
              name={k.name}
              desc={k.desc}
              selected={kitchenType === k.value}
              onClick={() => setKitchenType(k.value)}
            />
          ))}
        </PickerGrid>
      </Field>

      <Field
        label="Services Offered"
        hint="Tick all that apply. Each adds relevant hazard controls in later steps."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {SERVICE_OPTIONS.map((s) => (
            <CheckCard
              key={s.value}
              label={s.label}
              checked={services.includes(s.value)}
              onClick={() => toggleService(s.value)}
            />
          ))}
        </div>
      </Field>

      <Field
        label="Team Size"
        hint={
          <>
            Affects training requirements and corrective action ownership.{' '}
            <strong className="not-italic font-semibold text-ink-soft">Pulled from Memberships.</strong>
          </>
        }
      >
        <PickerGrid minWidth={140}>
          {TEAM_SIZE_BANDS.map((b) => (
            <PickerCard
              key={b.value}
              name={b.name}
              desc={
                b.value === prefill.team_size_band
                  ? `${prefill.team_size} staff currently — from Memberships`
                  : undefined
              }
              selected={teamBand === b.value}
              onClick={() => setTeamBand(b.value as HaccpPrefill['team_size_band'])}
            />
          ))}
        </PickerGrid>
      </Field>

      <Field
        label="Person Responsible for Food Safety"
        hint={
          <>
            The &ldquo;FBO&rdquo; (Food Business Operator) — legally accountable. Must hold appropriate training.{' '}
            {prefill.person_responsible && (
              <strong className="not-italic font-semibold text-ink-soft">Pulled from Training Records.</strong>
            )}
          </>
        }
      >
        <TextInput
          value={personResponsible}
          onChange={setPersonResponsible}
          placeholder={
            prefill.person_responsible
              ? prefill.person_responsible
              : 'Name · role · cert (e.g. Jack Harrison · Head Chef · Level 3 Food Hygiene + HACCP)'
          }
          prefilled={
            personResponsible.length > 0 &&
            personResponsible === prefill.person_responsible
          }
        />
      </Field>

      <Field label="Notes (optional)" hint="Anything else an EHO inspector should know — accreditations, unusual practices, supplier exclusions.">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Free-form."
          className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-sm text-ink-soft leading-relaxed focus:border-gold focus:outline-none"
        />
      </Field>

      <SaveRow onSave={() => onSave(buildContent(), false)} onSaveAndContinue={() => onSave(buildContent(), true)} pending={pending} />
    </>
  );
}

// =====================================================================
// Step 2 — Menu & hazard analysis (kept from earlier batch)
// =====================================================================
function Step2({
  initial,
  prefill,
  onSave,
  pending,
}: {
  initial: Partial<{ flow_steps: HaccpFlowStep[]; hazards: HaccpHazard[] }> | undefined;
  prefill: HaccpPrefill;
  onSave: (content: Record<string, unknown>, advance: boolean) => void;
  pending: boolean;
}) {
  const [flowSteps, setFlowSteps] = useState<HaccpFlowStep[]>(
    initial?.flow_steps && initial.flow_steps.length > 0
      ? (initial.flow_steps as HaccpFlowStep[])
      : DEFAULT_FLOW_STEPS.map((f) => ({ ...f, id: newId() })),
  );

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

  function buildContent() {
    return { flow_steps: flowSteps, hazards };
  }

  return (
    <>
      <PrefillBanner>
        <strong className="font-semibold text-gold-dark">Hazard list seeded from your menu.</strong>{' '}
        Allergens flagged on your recipes become allergen hazards. Protein categories (meat, fish, dairy, shellfish) seed biological hazards in the temperature danger zone. Edit, add, or remove — this is the working copy.
      </PrefillBanner>

      <Field label="Flow of food through the kitchen" hint="Receive → Store → Prep → Cook → Hold → Serve. Add or rename steps that don't match your operation.">
        <div className="bg-paper-warm border border-rule">
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
          className="mt-3 font-display font-semibold text-[11px] tracking-[0.3em] uppercase px-4 py-2 bg-transparent text-gold border border-gold hover:bg-gold-bg transition-colors"
        >
          + Flow step
        </button>
      </Field>

      <Field label="Hazards identified" hint="Every CCP in Step 3 links back to one of these hazards.">
        <div className="space-y-3">
          {hazards.map((h) => (
            <div key={h.id} className="bg-paper-warm border border-rule px-5 py-4">
              <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_36px] gap-3 items-start">
                <select
                  value={h.kind}
                  onChange={(e) =>
                    updateHazard(h.id, { kind: e.target.value as HaccpHazardKind })
                  }
                  className="px-2 py-1.5 border border-rule bg-paper font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-ink focus:border-gold focus:outline-none"
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
          className="mt-3 font-display font-semibold text-[11px] tracking-[0.3em] uppercase px-4 py-2 bg-transparent text-gold border border-gold hover:bg-gold-bg transition-colors"
        >
          + Hazard
        </button>
      </Field>

      <SaveRow onSave={() => onSave(buildContent(), false)} onSaveAndContinue={() => onSave(buildContent(), true)} pending={pending} />
    </>
  );
}

// =====================================================================
// Step 3 — Critical Control Points (kept from earlier batch)
// =====================================================================
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
  onSave: (content: Record<string, unknown>, advance: boolean) => void;
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

  return (
    <>
      <PrefillBanner>
        <strong className="font-semibold text-gold-dark">Three CCPs seeded from FSA defaults</strong>{' '}
        — cooking, hot hold, chilled storage. Edit the critical limits, justifications, and link the specific dishes each CCP applies to using the dish picker.
      </PrefillBanner>
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
              <Field label="Critical limit (short form)">
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
              <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-muted mb-2">
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
                  className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase px-3 py-1.5 bg-transparent text-gold border border-gold hover:bg-gold-bg transition-colors"
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
        className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase px-4 py-2 bg-transparent text-gold border border-gold hover:bg-gold-bg transition-colors mb-6"
      >
        + Add CCP
      </button>
      <SaveRow onSave={() => onSave({ ccps }, false)} onSaveAndContinue={() => onSave({ ccps }, true)} pending={pending} />
    </>
  );
}

// =====================================================================
// Step 4 — Critical limits
// =====================================================================
function Step4({
  initial,
  ccps,
  onSave,
  pending,
}: {
  initial: Partial<{ critical_limits: Array<{ ccp_id: string; parameter: 'temperature' | 'time' | 'ph' | 'visual' | 'other'; operator: '>=' | '<=' | 'between' | 'visual'; min_value: string; max_value: string; unit: string; reference: string }> }> | undefined;
  ccps: HaccpCcp[];
  onSave: (content: Record<string, unknown>, advance: boolean) => void;
  pending: boolean;
}) {
  type Limit = {
    ccp_id: string;
    parameter: 'temperature' | 'time' | 'ph' | 'visual' | 'other';
    operator: '>=' | '<=' | 'between' | 'visual';
    min_value: string;
    max_value: string;
    unit: string;
    reference: string;
  };

  const seeded = useMemo<Limit[]>(() => {
    if (initial?.critical_limits && initial.critical_limits.length > 0) {
      return initial.critical_limits as Limit[];
    }
    return ccps.map((c) => ({ ccp_id: c.id, ...derivedLimitFor(c.name) }));
  }, [initial, ccps]);

  const [limits, setLimits] = useState<Limit[]>(seeded);

  function update(ccpId: string, patch: Partial<Limit>) {
    setLimits((cur) => cur.map((l) => (l.ccp_id === ccpId ? { ...l, ...patch } : l)));
  }

  if (ccps.length === 0) {
    return (
      <EmptyDependency
        message="Add at least one CCP in Step 3 before setting critical limits."
      />
    );
  }

  return (
    <>
      <PrefillBanner>
        <strong className="font-semibold text-gold-dark">FSA defaults pre-filled.</strong>{' '}
        Each CCP from Step 3 gets the matching limit from the FSA guidance — cooking ≥75°C, hot hold ≥63°C, chilled ≤8°C, freezer ≤−18°C. Adjust the operator, value, and unit if your operation runs to a tighter spec.
      </PrefillBanner>

      <div className="space-y-4">
        {ccps.map((c) => {
          const l = limits.find((x) => x.ccp_id === c.id) ?? {
            ccp_id: c.id,
            ...derivedLimitFor(c.name),
          };
          return (
            <div key={c.id} className="bg-paper-warm border border-rule px-5 py-4">
              <div className="font-serif font-semibold text-base text-ink mb-2">
                {c.name || 'Unnamed CCP'}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
                <select
                  value={l.parameter}
                  onChange={(e) =>
                    update(c.id, { parameter: e.target.value as Limit['parameter'] })
                  }
                  className="px-2 py-1.5 border border-rule bg-paper font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-ink focus:border-gold focus:outline-none"
                >
                  <option value="temperature">Temperature</option>
                  <option value="time">Time</option>
                  <option value="ph">pH</option>
                  <option value="visual">Visual</option>
                  <option value="other">Other</option>
                </select>
                <select
                  value={l.operator}
                  onChange={(e) =>
                    update(c.id, { operator: e.target.value as Limit['operator'] })
                  }
                  className="px-2 py-1.5 border border-rule bg-paper font-mono text-sm text-ink focus:border-gold focus:outline-none"
                >
                  <option value=">=">≥</option>
                  <option value="<=">≤</option>
                  <option value="between">between</option>
                  <option value="visual">visual</option>
                </select>
                <input
                  type="text"
                  value={l.min_value}
                  onChange={(e) => update(c.id, { min_value: e.target.value })}
                  placeholder="min"
                  className="px-2 py-1.5 border border-rule bg-paper font-mono text-sm text-ink focus:border-gold focus:outline-none"
                />
                <input
                  type="text"
                  value={l.max_value}
                  onChange={(e) => update(c.id, { max_value: e.target.value })}
                  placeholder="max"
                  className="px-2 py-1.5 border border-rule bg-paper font-mono text-sm text-ink focus:border-gold focus:outline-none"
                />
                <input
                  type="text"
                  value={l.unit}
                  onChange={(e) => update(c.id, { unit: e.target.value })}
                  placeholder="unit"
                  className="px-2 py-1.5 border border-rule bg-paper font-mono text-sm text-ink focus:border-gold focus:outline-none"
                />
              </div>
              <input
                type="text"
                value={l.reference}
                onChange={(e) => update(c.id, { reference: e.target.value })}
                placeholder="FSA / SFBB / scientific reference"
                className="w-full px-2 py-1.5 border border-rule bg-paper font-serif italic text-xs text-ink-soft focus:border-gold focus:outline-none"
              />
            </div>
          );
        })}
      </div>

      <SaveRow onSave={() => onSave({ critical_limits: limits }, false)} onSaveAndContinue={() => onSave({ critical_limits: limits }, true)} pending={pending} />
    </>
  );
}

// =====================================================================
// Step 5 — Monitoring procedures (maps to Safety tab)
// =====================================================================
function Step5({
  initial,
  ccps,
  onSave,
  pending,
}: {
  initial: Partial<{ monitoring: Array<{ ccp_id: string; source: HaccpMonitorSource; what: string; who: string; how: string; frequency: string }> }> | undefined;
  ccps: HaccpCcp[];
  onSave: (content: Record<string, unknown>, advance: boolean) => void;
  pending: boolean;
}) {
  type Monitor = {
    ccp_id: string;
    source: HaccpMonitorSource;
    what: string;
    who: string;
    how: string;
    frequency: string;
  };

  const seeded = useMemo<Monitor[]>(() => {
    if (initial?.monitoring && initial.monitoring.length > 0) {
      return initial.monitoring as Monitor[];
    }
    return ccps.map((c) => ({
      ccp_id: c.id,
      source: suggestedMonitorSource(c.name),
      what: c.critical_limit || c.name,
      who: 'Section head on shift',
      how: 'Probe + log on Safety tab',
      frequency: 'Every service · per dish',
    }));
  }, [initial, ccps]);

  const [monitors, setMonitors] = useState<Monitor[]>(seeded);

  function update(ccpId: string, patch: Partial<Monitor>) {
    setMonitors((cur) => cur.map((m) => (m.ccp_id === ccpId ? { ...m, ...patch } : m)));
  }

  if (ccps.length === 0) {
    return (
      <EmptyDependency
        message="Add at least one CCP in Step 3 before defining monitoring procedures."
      />
    );
  }

  return (
    <>
      <PrefillBanner>
        <strong className="font-semibold text-gold-dark">Each CCP maps to a Safety tab check.</strong>{' '}
        The wizard suggests where to record monitoring data — probe readings, cleaning sign-offs, opening checks — so the day-to-day record automatically satisfies the HACCP plan.
      </PrefillBanner>

      <div className="space-y-4">
        {ccps.map((c) => {
          const m = monitors.find((x) => x.ccp_id === c.id);
          if (!m) return null;
          return (
            <div key={c.id} className="bg-paper-warm border border-rule px-5 py-4">
              <div className="font-serif font-semibold text-base text-ink mb-3">
                {c.name || 'Unnamed CCP'}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                <Field label="Maps to" hint="Where in the Safety tab this is monitored.">
                  <select
                    value={m.source}
                    onChange={(e) =>
                      update(c.id, { source: e.target.value as HaccpMonitorSource })
                    }
                    className="w-full px-2 py-1.5 border border-rule bg-paper font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-ink focus:border-gold focus:outline-none"
                  >
                    {(Object.keys(MONITOR_SOURCE_LABEL) as HaccpMonitorSource[]).map((s) => (
                      <option key={s} value={s}>
                        {MONITOR_SOURCE_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Frequency">
                  <input
                    type="text"
                    value={m.frequency}
                    onChange={(e) => update(c.id, { frequency: e.target.value })}
                    placeholder="e.g. Every service · per dish"
                    className="w-full px-2 py-1.5 border border-rule bg-paper font-serif text-sm text-ink focus:border-gold focus:outline-none"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="What's measured">
                  <input
                    type="text"
                    value={m.what}
                    onChange={(e) => update(c.id, { what: e.target.value })}
                    placeholder="What's being checked"
                    className="w-full px-2 py-1.5 border border-rule bg-paper font-serif text-sm text-ink focus:border-gold focus:outline-none"
                  />
                </Field>
                <Field label="Who">
                  <input
                    type="text"
                    value={m.who}
                    onChange={(e) => update(c.id, { who: e.target.value })}
                    placeholder="Role on shift"
                    className="w-full px-2 py-1.5 border border-rule bg-paper font-serif text-sm text-ink focus:border-gold focus:outline-none"
                  />
                </Field>
                <Field label="How">
                  <input
                    type="text"
                    value={m.how}
                    onChange={(e) => update(c.id, { how: e.target.value })}
                    placeholder="Method / equipment"
                    className="w-full px-2 py-1.5 border border-rule bg-paper font-serif text-sm text-ink focus:border-gold focus:outline-none"
                  />
                </Field>
              </div>
            </div>
          );
        })}
      </div>

      <SaveRow onSave={() => onSave({ monitoring: monitors }, false)} onSaveAndContinue={() => onSave({ monitoring: monitors }, true)} pending={pending} />
    </>
  );
}

// =====================================================================
// Step 6 — Corrective actions from the library
// =====================================================================
function Step6({
  initial,
  ccps,
  onSave,
  pending,
}: {
  initial: Partial<{ corrective_actions: Array<{ ccp_id: string; template_ids: string[]; custom_md: string; who_decides: string }> }> | undefined;
  ccps: HaccpCcp[];
  onSave: (content: Record<string, unknown>, advance: boolean) => void;
  pending: boolean;
}) {
  type Corrective = {
    ccp_id: string;
    template_ids: string[];
    custom_md: string;
    who_decides: string;
  };

  const seeded = useMemo<Corrective[]>(() => {
    if (initial?.corrective_actions && initial.corrective_actions.length > 0) {
      return initial.corrective_actions as Corrective[];
    }
    return ccps.map((c) => {
      const nameKey = c.name.toLowerCase();
      const matches = CORRECTIVE_ACTION_LIBRARY.filter((t) =>
        t.applies_to.some((kw) => nameKey.includes(kw)),
      );
      return {
        ccp_id: c.id,
        template_ids: matches.slice(0, 3).map((t) => t.id),
        custom_md: '',
        who_decides: 'Head chef or duty manager',
      };
    });
  }, [initial, ccps]);

  const [actions, setActions] = useState<Corrective[]>(seeded);

  function update(ccpId: string, patch: Partial<Corrective>) {
    setActions((cur) => cur.map((a) => (a.ccp_id === ccpId ? { ...a, ...patch } : a)));
  }
  function toggleTemplate(ccpId: string, templateId: string) {
    const a = actions.find((x) => x.ccp_id === ccpId);
    if (!a) return;
    const has = a.template_ids.includes(templateId);
    update(ccpId, {
      template_ids: has
        ? a.template_ids.filter((id) => id !== templateId)
        : [...a.template_ids, templateId],
    });
  }

  if (ccps.length === 0) {
    return (
      <EmptyDependency
        message="Add at least one CCP in Step 3 before defining corrective actions."
      />
    );
  }

  return (
    <>
      <PrefillBanner>
        <strong className="font-semibold text-gold-dark">{CORRECTIVE_ACTION_LIBRARY.length}-item corrective action library.</strong>{' '}
        For each CCP, pick the actions that apply when the critical limit is breached. The wizard pre-selects matches based on the CCP name (cooking → re-cook, allergen → FOH brief + EHO notify, etc.). Add custom actions in the notes field below each CCP.
      </PrefillBanner>

      <div className="space-y-5">
        {ccps.map((c) => {
          const a = actions.find((x) => x.ccp_id === c.id);
          if (!a) return null;
          return (
            <div key={c.id} className="bg-paper-warm border border-rule px-5 py-4">
              <div className="font-serif font-semibold text-base text-ink mb-3">
                {c.name || 'Unnamed CCP'}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mb-3">
                {CORRECTIVE_ACTION_LIBRARY.map((t) => (
                  <CheckCard
                    key={t.id}
                    label={t.label}
                    sub={t.body}
                    checked={a.template_ids.includes(t.id)}
                    onClick={() => toggleTemplate(c.id, t.id)}
                  />
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
                <Field label="Custom action (optional)">
                  <textarea
                    value={a.custom_md}
                    onChange={(e) => update(c.id, { custom_md: e.target.value })}
                    rows={2}
                    placeholder="Anything specific to your kitchen."
                    className="w-full px-2 py-1.5 border border-rule bg-paper font-serif text-sm text-ink-soft focus:border-gold focus:outline-none"
                  />
                </Field>
                <Field label="Who decides">
                  <input
                    type="text"
                    value={a.who_decides}
                    onChange={(e) => update(c.id, { who_decides: e.target.value })}
                    placeholder="Role with authority to act"
                    className="w-full px-2 py-1.5 border border-rule bg-paper font-serif text-sm text-ink focus:border-gold focus:outline-none"
                  />
                </Field>
              </div>
            </div>
          );
        })}
      </div>

      <SaveRow onSave={() => onSave({ corrective_actions: actions }, false)} onSaveAndContinue={() => onSave({ corrective_actions: actions }, true)} pending={pending} />
    </>
  );
}

// =====================================================================
// Step 7 — Verification & review
// =====================================================================
function Step7({
  initial,
  prefill,
  onSave,
  pending,
}: {
  initial: Partial<{ verification: { cadence: HaccpReviewCadence; who: string; last_review: string | null; next_review: string | null; notes_md: string } }> | undefined;
  prefill: HaccpPrefill;
  onSave: (content: Record<string, unknown>, advance: boolean) => void;
  pending: boolean;
}) {
  const v = initial?.verification ?? {
    cadence: 'quarterly' as HaccpReviewCadence,
    who: prefill.person_responsible || '',
    last_review: null as string | null,
    next_review: null as string | null,
    notes_md: '',
  };

  const [cadence, setCadence] = useState<HaccpReviewCadence>(v.cadence ?? 'quarterly');
  const [who, setWho] = useState(v.who ?? '');
  const [lastReview, setLastReview] = useState(v.last_review ?? '');
  const [nextReview, setNextReview] = useState(v.next_review ?? '');
  const [notes, setNotes] = useState(v.notes_md ?? '');

  function buildContent() {
    return {
      verification: {
        cadence,
        who: who.trim(),
        last_review: lastReview || null,
        next_review: nextReview || null,
        notes_md: notes.trim(),
      },
    };
  }

  return (
    <>
      <PrefillBanner>
        <strong className="font-semibold text-gold-dark">Schedule the review.</strong>{' '}
        FSA recommends reviewing your HACCP plan at least annually, and after any significant menu / process / supplier change. Quarterly is a sensible cadence for most kitchens.
      </PrefillBanner>

      <Field label="Review cadence" hint="How often you formally review the whole plan.">
        <PickerGrid minWidth={140}>
          {(Object.keys(REVIEW_CADENCE_LABEL) as HaccpReviewCadence[]).map((c) => (
            <PickerCard
              key={c}
              name={REVIEW_CADENCE_LABEL[c]}
              selected={cadence === c}
              onClick={() => setCadence(c)}
            />
          ))}
        </PickerGrid>
      </Field>

      <Field label="Who reviews" hint="The signatory on each review cycle. Usually the Food Business Operator.">
        <TextInput
          value={who}
          onChange={setWho}
          placeholder="Name · role"
          prefilled={who === prefill.person_responsible && who.length > 0}
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-7">
        <Field label="Last review (optional)">
          <input
            type="date"
            value={lastReview}
            onChange={(e) => setLastReview(e.target.value)}
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          />
        </Field>
        <Field label="Next review">
          <input
            type="date"
            value={nextReview}
            onChange={(e) => setNextReview(e.target.value)}
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          />
        </Field>
      </div>

      <Field label="Notes (optional)" hint="Trigger events that should prompt an ahead-of-schedule review.">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="e.g. New menu launch, supplier change, EHO visit findings."
          className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-sm text-ink-soft focus:border-gold focus:outline-none"
        />
      </Field>

      <SaveRow onSave={() => onSave(buildContent(), false)} onSaveAndContinue={() => onSave(buildContent(), true)} pending={pending} />
    </>
  );
}

// =====================================================================
// Step 8 — Document generation preview
// =====================================================================
function Step8({
  initial,
  body,
  onSave,
  pending,
}: {
  initial: Partial<{ doc_generated_at: string | null; doc_url: string | null; preview_acknowledged: boolean }> | undefined;
  body: HaccpBody;
  onSave: (content: Record<string, unknown>, advance: boolean) => void;
  pending: boolean;
}) {
  const [ack, setAck] = useState<boolean>(initial?.preview_acknowledged ?? false);
  const ccpCount = ((body.step_3?.ccps as HaccpCcp[]) ?? []).length;
  const hazardCount = ((body.step_2?.hazards as HaccpHazard[]) ?? []).length;
  const tradingName = (body.step_1?.trading_name as string | undefined) ?? '(not set yet)';

  function buildContent() {
    return {
      doc_generated_at: null,
      doc_url: null,
      preview_acknowledged: ack,
    };
  }

  return (
    <>
      <PrefillBanner>
        <strong className="font-semibold text-gold-dark">Three artefacts generated from your plan.</strong>{' '}
        The full HACCP document for the EHO file, a chef&apos;s reference card for the kitchen wall, and a set of cross-references back into the Safety tab so daily checks line up with HACCP CCPs.
      </PrefillBanner>

      <div className="space-y-3 mb-6">
        <DocArtefact
          title="HACCP plan document"
          desc={`Formatted PDF — ${hazardCount} hazards · ${ccpCount} CCPs · review schedule · sign-offs. Goes in the EHO file for ${tradingName}.`}
          disabled
          disabledNote="PDF export pending react-pdf wiring"
        />
        <DocArtefact
          title="Chef's reference card"
          desc="Printable wall card — CCPs and critical limits at a glance for service."
          disabled
          disabledNote="PDF export pending"
        />
        <DocArtefact
          title="Safety tab cross-references"
          desc="Each CCP links to its monitoring source on the Safety tab so daily checks satisfy the plan."
          disabled
          disabledNote="Live link generation pending — the data exists in body.step_5."
        />
      </div>

      <label className="flex items-start gap-3 cursor-pointer mb-6">
        <input
          type="checkbox"
          checked={ack}
          onChange={(e) => setAck(e.target.checked)}
          className="w-4 h-4 mt-0.5 accent-gold"
        />
        <span className="font-serif text-sm text-ink-soft leading-relaxed">
          I&apos;ve reviewed the plan and am ready to mark it for sign-off. (You can still edit later — sign-off creates a snapshot version for the EHO file.)
        </span>
      </label>

      <SaveRow onSave={() => onSave(buildContent(), false)} onSaveAndContinue={() => onSave(buildContent(), true)} pending={pending} />
    </>
  );
}

function DocArtefact({
  title,
  desc,
  disabled,
  disabledNote,
}: {
  title: string;
  desc: string;
  disabled?: boolean;
  disabledNote?: string;
}) {
  return (
    <div className="bg-paper-warm border border-rule px-5 py-4 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="font-serif font-semibold text-base text-ink leading-tight mb-1">
          {title}
        </div>
        <div className="font-sans text-xs text-muted">{desc}</div>
      </div>
      <button
        type="button"
        disabled={disabled}
        className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase px-4 py-2 bg-paper text-ink border border-rule hover:border-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title={disabledNote}
      >
        Generate
      </button>
    </div>
  );
}

// =====================================================================
// Step 9 — Annual review reminder
// =====================================================================
function Step9({
  initial,
  onSave,
  pending,
}: {
  initial: Partial<{ next_review_date: string | null; reminder_set: boolean; notes_md: string }> | undefined;
  onSave: (content: Record<string, unknown>, advance: boolean) => void;
  pending: boolean;
}) {
  // Default to ~12 months from today
  const defaultDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const [date, setDate] = useState(initial?.next_review_date ?? defaultDate);
  const [reminderSet, setReminderSet] = useState(initial?.reminder_set ?? true);
  const [notes, setNotes] = useState(initial?.notes_md ?? '');

  function buildContent() {
    return {
      next_review_date: date,
      reminder_set: reminderSet,
      notes_md: notes.trim(),
    };
  }

  return (
    <>
      <PrefillBanner>
        <strong className="font-semibold text-gold-dark">Set a reminder for next year.</strong>{' '}
        UK food safety law requires the plan to stay current. The wizard nudges you ahead of time so it never lapses — and the daily Safety tab keeps the underlying records flowing in between.
      </PrefillBanner>

      <Field label="Next full review date" hint="Default is twelve months from today. Adjust if your insurer / EHO has stipulated something tighter.">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full md:w-[260px] px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
        />
      </Field>

      <label className="flex items-start gap-3 cursor-pointer mb-7">
        <input
          type="checkbox"
          checked={reminderSet}
          onChange={(e) => setReminderSet(e.target.checked)}
          className="w-4 h-4 mt-0.5 accent-gold"
        />
        <span className="font-serif text-sm text-ink-soft leading-relaxed">
          Surface the review on Looking Ahead 30 days out, then 14, 7, 1.
        </span>
      </label>

      <Field label="Notes (optional)" hint="Anything to keep in mind for next year's review.">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="e.g. menu refresh due Q1, supplier under review."
          className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-sm text-ink-soft focus:border-gold focus:outline-none"
        />
      </Field>

      <SaveRow onSave={() => onSave(buildContent(), false)} onSaveAndContinue={() => onSave(buildContent(), false)} pending={pending} />
    </>
  );
}

// =====================================================================
// Shared bits
// =====================================================================
function Field({
  label,
  hint,
  children,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-7">
      <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-1">
        {label}
      </div>
      {hint && (
        <div className="font-serif italic text-[13px] text-muted leading-relaxed mb-3 max-w-[680px]">
          {hint}
        </div>
      )}
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  prefilled = false,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  prefilled?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={
        'w-full px-4 py-3 border font-serif text-base text-ink focus:outline-none focus:border-gold transition-colors ' +
        (prefilled
          ? 'bg-gold-bg border-gold'
          : 'bg-paper border-rule')
      }
    />
  );
}

function PickerGrid({
  minWidth = 180,
  children,
}: {
  minWidth?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="grid gap-2"
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
      }}
    >
      {children}
    </div>
  );
}

function PickerCard({
  name,
  desc,
  selected,
  onClick,
}: {
  name: string;
  desc?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'text-left px-4 py-3 border transition-colors ' +
        (selected
          ? 'bg-gold-bg border-gold border-2'
          : 'bg-paper border-rule hover:border-gold')
      }
    >
      <div className="font-serif font-medium text-[15px] text-ink leading-tight">
        {name}
      </div>
      {desc && (
        <div className="font-sans text-xs text-muted mt-1 leading-relaxed">
          {desc}
        </div>
      )}
    </button>
  );
}

function CheckCard({
  label,
  sub,
  checked,
  onClick,
}: {
  label: string;
  sub?: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex items-start gap-2.5 px-3.5 py-2.5 border text-left transition-colors ' +
        (checked
          ? 'bg-gold-bg border-gold'
          : 'bg-paper border-rule hover:border-gold')
      }
    >
      <div
        className={
          'w-4 h-4 border flex items-center justify-center flex-shrink-0 mt-0.5 ' +
          (checked ? 'bg-gold border-gold text-paper' : 'bg-paper border-rule')
        }
      >
        {checked && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="w-2.5 h-2.5"
          >
            <path d="M5 12l5 5L20 7" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-serif text-sm text-ink leading-tight">{label}</div>
        {sub && (
          <div className="font-sans text-[11px] text-muted mt-1 leading-relaxed">
            {sub}
          </div>
        )}
      </div>
    </button>
  );
}

function PrefillBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gold-bg border border-gold px-5 py-4 mb-6 flex items-start gap-3">
      <div className="text-gold-dark flex-shrink-0 mt-0.5">
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
      <p className="font-serif text-sm text-ink-soft leading-relaxed">{children}</p>
    </div>
  );
}

function SaveRow({
  onSave,
  onSaveAndContinue,
  pending,
}: {
  onSave: () => void;
  onSaveAndContinue: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <button
        type="button"
        onClick={onSave}
        disabled={pending}
        className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase px-5 py-2.5 bg-paper text-ink border border-rule hover:border-gold disabled:opacity-50 transition-colors"
      >
        {pending ? 'Saving' + String.fromCharCode(0x2026) : 'Save step'}
      </button>
      <button
        type="button"
        onClick={onSaveAndContinue}
        disabled={pending}
        className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark disabled:opacity-50 transition-colors"
      >
        Save &amp; continue
      </button>
    </div>
  );
}

function SaveStatus({
  savedAt,
  error,
  status,
}: {
  savedAt: string | null;
  error: string | null;
  status: HaccpStatus;
}) {
  if (error) {
    return <span className="font-serif italic text-sm text-urgent">{error}</span>;
  }
  if (savedAt) {
    return (
      <span className="font-serif italic text-sm text-muted inline-flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-healthy" />
        Saved as draft · {savedAt}
      </span>
    );
  }
  return (
    <span className="font-serif italic text-sm text-muted inline-flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-soft" />
      {status === 'draft' ? 'Not saved yet' : 'Up to date'}
    </span>
  );
}

function EmptyDependency({ message }: { message: string }) {
  return (
    <div className="bg-paper-warm border border-l-[3px] border-l-attention px-5 py-5 font-serif italic text-sm text-attention">
      {message}
    </div>
  );
}
