// Client-safe types + constants for the HACCP wizard. Server-only
// reads (getHaccpPlan, getHaccpPrefill) live in haccp-server.ts so
// client components can import constants without pulling in
// next/headers via supabase/server.

export type HaccpStatus =
  | 'draft'
  | 'in_progress'
  | 'review'
  | 'signed'
  | 'active'
  | 'archived';

export const HACCP_STATUS_LABEL: Record<HaccpStatus, string> = {
  draft: 'Draft',
  in_progress: 'In progress',
  review: 'Review',
  signed: 'Signed',
  active: 'Active',
  archived: 'Archived',
};

export const HACCP_STATUS_TONE: Record<HaccpStatus, string> = {
  draft: 'bg-paper-warm text-muted border-rule',
  in_progress: 'bg-attention/10 text-attention border-attention/40',
  review: 'bg-gold-bg text-gold-dark border-gold/40',
  signed: 'bg-healthy/10 text-healthy border-healthy/40',
  active: 'bg-healthy/10 text-healthy border-healthy/40',
  archived: 'bg-rule text-muted-soft border-rule',
};

// ---------------------------------------------------------------------
// Step body shapes
// ---------------------------------------------------------------------
export type HaccpStep1 = {
  trading_name: string;
  legal_entity: string;
  fsa_registration: string;
  kitchen_type: string;
  team_size: number | null;
  team_size_band: '1-3' | '4-10' | '11-25' | '26+';
  services: string[];
  person_responsible: string;
  notes_md: string;
};

export type HaccpHazardKind = 'biological' | 'chemical' | 'physical' | 'allergen';

export type HaccpHazard = {
  id: string;
  kind: HaccpHazardKind;
  description: string;
  source: string;
};

export type HaccpFlowStep = {
  id: string;
  name: string;
  description: string;
};

export type HaccpStep2 = {
  flow_steps: HaccpFlowStep[];
  hazards: HaccpHazard[];
};

export type HaccpCcp = {
  id: string;
  name: string;
  hazard_ref: string; // id of the hazard from step_2
  critical_limit: string;
  justification: string;
  recipe_ids: string[];
};

export type HaccpStep3 = {
  ccps: HaccpCcp[];
};

export type HaccpStep4 = {
  /** Per-CCP critical limit. Pre-filled from FSA defaults where the
   *  CCP name maps to a known PROBE_RULES entry. */
  critical_limits: Array<{
    ccp_id: string;
    parameter: 'temperature' | 'time' | 'ph' | 'visual' | 'other';
    operator: '>=' | '<=' | 'between' | 'visual';
    min_value: string;
    max_value: string;
    unit: string;
    reference: string;
  }>;
};

/** Where in the Safety tab a CCP is actually monitored day-to-day. */
export type HaccpMonitorSource =
  | 'probe'
  | 'cleaning'
  | 'opening_check'
  | 'training'
  | 'incident'
  | 'manual';

export const MONITOR_SOURCE_LABEL: Record<HaccpMonitorSource, string> = {
  probe: 'Probe reading',
  cleaning: 'Cleaning signoff',
  opening_check: 'Opening check',
  training: 'Training record',
  incident: 'Incident log',
  manual: 'Manual record',
};

export type HaccpStep5 = {
  monitoring: Array<{
    ccp_id: string;
    source: HaccpMonitorSource;
    what: string;
    who: string;
    how: string;
    frequency: string;
  }>;
};

/** Pre-built corrective action templates surfaced as a picker library
 *  on Step 6. Chef can pick one (or more) per CCP and/or add custom. */
export type CorrectiveActionTemplate = {
  id: string;
  label: string;
  body: string;
  applies_to: string[]; // CCP name keywords this template matches
};

export const CORRECTIVE_ACTION_LIBRARY: CorrectiveActionTemplate[] = [
  {
    id: 'recook',
    label: 'Re-cook to target',
    body: 'Return the affected portion to the heat until core temperature reaches the critical limit. Verify with probe before plating.',
    applies_to: ['cook', 'reheat', 'core'],
  },
  {
    id: 'reject_delivery',
    label: 'Reject the delivery',
    body: 'Refuse to sign for goods, log the discrepancy with the supplier, raise a credit note. Bin nothing without the supplier seeing the temperature first.',
    applies_to: ['delivery', 'receive'],
  },
  {
    id: 'isolate_stock',
    label: 'Isolate affected stock',
    body: 'Move the item out of service, label it "DO NOT USE" with date and signer, and quarantine until a manager has decided whether to discard or recover.',
    applies_to: ['chilled', 'fridge', 'freezer'],
  },
  {
    id: 'discard',
    label: 'Discard',
    body: 'Bin the item. Log it on Waste with category "spoilage" so the cost is captured.',
    applies_to: ['chilled', 'freezer', 'fridge', 'spoilage'],
  },
  {
    id: 'maintenance_flag',
    label: 'Raise a maintenance flag',
    body: 'Equipment failed — flag for engineer attention. Do not use the unit until tested. Move stock to a working unit.',
    applies_to: ['fridge', 'freezer', 'hot hold', 'equipment'],
  },
  {
    id: 'foh_brief',
    label: 'Brief FOH before next service',
    body: 'Pull FOH together pre-service, flag the dish/issue, confirm allergen comms and 86 list. Sign off completed.',
    applies_to: ['allergen', 'allergy', 'incident', 'complaint'],
  },
  {
    id: 'eho_notify',
    label: 'Notify the local authority',
    body: 'Contact the council EHO team within 24 hours. Provide incident log, customer details if known, and a copy of the relevant HACCP plan section.',
    applies_to: ['allergen', 'illness', 'serious'],
  },
  {
    id: 'insurer_notify',
    label: 'Notify the insurer',
    body: 'Email a copy of the incident log + corrective action to the insurance broker. Retain confirmation of receipt.',
    applies_to: ['allergen', 'illness'],
  },
  {
    id: 'retrain',
    label: 'Retrain the team member',
    body: 'Schedule a same-shift retraining with the section head. Log it in Training Records when complete.',
    applies_to: ['training', 'allergen', 'allergy'],
  },
  {
    id: 'review_haccp',
    label: 'Review this HACCP step',
    body: 'If the limit was breached because the procedure itself is wrong, raise an annual-review-ahead-of-schedule entry. Adjust the CCP, monitoring, or corrective action.',
    applies_to: ['repeat', 'pattern'],
  },
  {
    id: 'deep_clean',
    label: 'Deep clean the area',
    body: 'Stop production in the affected area. Deep clean, sanitise, and verify before reopening. Log it on the Cleaning Schedule.',
    applies_to: ['cleaning', 'contamination', 'pest'],
  },
];

export type HaccpStep6 = {
  /** Per CCP: which library templates apply + any free-form additions. */
  corrective_actions: Array<{
    ccp_id: string;
    template_ids: string[];
    custom_md: string;
    who_decides: string;
  }>;
};

export type HaccpReviewCadence = 'monthly' | 'quarterly' | 'biannual' | 'annual';

export const REVIEW_CADENCE_LABEL: Record<HaccpReviewCadence, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  biannual: 'Twice a year',
  annual: 'Annual',
};

export type HaccpStep7 = {
  verification: {
    cadence: HaccpReviewCadence;
    who: string;
    last_review: string | null;
    next_review: string | null;
    notes_md: string;
  };
};

export type HaccpStep8 = {
  doc_generated_at: string | null;
  doc_url: string | null;
  preview_acknowledged: boolean;
};

export type HaccpStep9 = {
  next_review_date: string | null;
  reminder_set: boolean;
  notes_md: string;
};

export type HaccpBody = {
  step_1?: Partial<HaccpStep1>;
  step_2?: Partial<HaccpStep2>;
  step_3?: Partial<HaccpStep3>;
  step_4?: Partial<HaccpStep4>;
  step_5?: Partial<HaccpStep5>;
  step_6?: Partial<HaccpStep6>;
  step_7?: Partial<HaccpStep7>;
  step_8?: Partial<HaccpStep8>;
  step_9?: Partial<HaccpStep9>;
};

export type HaccpPlan = {
  id: string;
  site_id: string;
  status: HaccpStatus;
  body: HaccpBody;
  current_step: number;
  signed_off_at: string | null;
  signed_off_by: string | null;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------
// Auto-population shape (populated by haccp-server.ts)
// ---------------------------------------------------------------------

export type HaccpPrefill = {
  trading_name: string;
  team_size: number;
  team_size_band: '1-3' | '4-10' | '11-25' | '26+';
  kitchen_type_hint: string;
  services_hint: string[];
  recipe_count: number;
  has_bar: boolean;
  allergens: string[];
  protein_categories: string[];
  /** Pulled from safety_training: highest-tier food safety cert holder
   *  on the site. Empty string if no eligible training record. */
  person_responsible: string;
};

// ---------------------------------------------------------------------
// Step list (used by sidebar + page)
// ---------------------------------------------------------------------

export const HACCP_STEPS: Array<{
  num: number;
  name: string;
  meta: string;
}> = [
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

/** Estimate plan completeness as a 0-100 percentage based on which steps
 *  have any user content in body. Steps 1-7 carry the bulk of the plan;
 *  step 8 (doc generation) and step 9 (annual review reminder) count too
 *  but are weighted equally for now. */
export function planCompletePct(plan: HaccpPlan | null): number {
  if (!plan) return 0;
  const stepKeys: Array<keyof HaccpBody> = [
    'step_1',
    'step_2',
    'step_3',
    'step_4',
    'step_5',
    'step_6',
    'step_7',
    'step_8',
    'step_9',
  ];
  let done = 0;
  for (const k of stepKeys) {
    const v = plan.body[k];
    if (v && Object.keys(v as object).length > 0) done += 1;
  }
  return Math.round((done / stepKeys.length) * 100);
}
