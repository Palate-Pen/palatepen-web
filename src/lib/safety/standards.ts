/**
 * FSA-aligned temperature thresholds + allergen reference data. These
 * numbers ship with v1 — they reflect the regulatory baseline as of
 * 2026-05. If the FSA updates a threshold, this file changes; the
 * stored snapshot on each safety_probe_readings.threshold_note keeps
 * historical data interpretable against the rules in force when it
 * was logged.
 */

export type ProbeKind =
  | 'fridge'
  | 'freezer'
  | 'hot_hold'
  | 'cooking'
  | 'cooling'
  | 'reheat'
  | 'delivery'
  | 'core_temp'
  | 'ambient'
  | 'other';

export const PROBE_KIND_LABEL: Record<ProbeKind, string> = {
  fridge: 'Fridge',
  freezer: 'Freezer',
  hot_hold: 'Hot hold',
  cooking: 'Cooking',
  cooling: 'Cooling',
  reheat: 'Reheat',
  delivery: 'Delivery',
  core_temp: 'Core temp',
  ambient: 'Ambient',
  other: 'Other',
};

type Threshold = {
  passes: (temp_c: number) => boolean;
  note: string;
};

/**
 * Returns whether a reading passes FSA-aligned bounds, plus a short
 * note describing the rule. Stored on the probe_readings row so the
 * audit trail stays interpretable even if the rule changes later.
 */
export const PROBE_RULES: Record<ProbeKind, Threshold> = {
  fridge: {
    passes: (t) => t <= 8 && t >= -4,
    note: 'Fridge: FSA requires <= 8 degrees Celsius (8 C).',
  },
  freezer: {
    passes: (t) => t <= -18,
    note: 'Freezer: FSA requires <= -18 degrees Celsius (-18 C).',
  },
  hot_hold: {
    passes: (t) => t >= 63,
    note: 'Hot hold: FSA requires >= 63 degrees Celsius (63 C).',
  },
  cooking: {
    passes: (t) => t >= 75,
    note: 'Cooking: FSA requires core temperature >= 75 degrees Celsius (75 C) for 30 seconds.',
  },
  reheat: {
    passes: (t) => t >= 75,
    note: 'Reheat: FSA requires core temperature >= 75 degrees Celsius (75 C).',
  },
  cooling: {
    passes: (t) => t <= 8,
    note: 'Cooling: must reach <= 8 degrees Celsius (8 C) within 90 minutes.',
  },
  delivery: {
    passes: (t) => t <= 8,
    note: 'Delivery (chilled): <= 8 degrees Celsius (8 C) on arrival.',
  },
  core_temp: {
    passes: (t) => t >= 75 || t <= 8,
    note: 'Core temperature must pass either hot or cold thresholds.',
  },
  ambient: {
    passes: () => true,
    note: 'Ambient reading — no fixed FSA threshold.',
  },
  other: {
    passes: () => true,
    note: 'Free-form reading — operator judges acceptance.',
  },
};

export type AllergenCode =
  | 'celery'
  | 'cereals_with_gluten'
  | 'crustaceans'
  | 'eggs'
  | 'fish'
  | 'lupin'
  | 'milk'
  | 'molluscs'
  | 'mustard'
  | 'peanuts'
  | 'sesame'
  | 'soybeans'
  | 'sulphites'
  | 'tree_nuts';

export const ALLERGEN_LABEL: Record<AllergenCode, string> = {
  celery: 'Celery',
  cereals_with_gluten: 'Cereals (gluten)',
  crustaceans: 'Crustaceans',
  eggs: 'Eggs',
  fish: 'Fish',
  lupin: 'Lupin',
  milk: 'Milk',
  molluscs: 'Molluscs',
  mustard: 'Mustard',
  peanuts: 'Peanuts',
  sesame: 'Sesame',
  soybeans: 'Soybeans',
  sulphites: 'Sulphites',
  tree_nuts: 'Tree nuts',
};

export const ALL_ALLERGENS: AllergenCode[] = Object.keys(
  ALLERGEN_LABEL,
) as AllergenCode[];

export type IncidentKind = 'complaint' | 'allergen' | 'near_miss' | 'illness';

export const INCIDENT_KIND_LABEL: Record<IncidentKind, string> = {
  complaint: 'Customer complaint',
  allergen: 'Allergen incident',
  near_miss: 'Near miss',
  illness: 'Suspected illness',
};

export type CleaningFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'annually';

export const CLEANING_FREQ_LABEL: Record<CleaningFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annual',
};

export const DEFAULT_CLEANING_TEMPLATE: Array<{
  area: string;
  task: string;
  frequency: CleaningFrequency;
}> = [
  { area: 'Kitchen', task: 'Sweep + mop floors', frequency: 'daily' },
  { area: 'Kitchen', task: 'Wipe + sanitise prep surfaces', frequency: 'daily' },
  { area: 'Kitchen', task: 'Clean hot pass + behind', frequency: 'daily' },
  { area: 'Kitchen', task: 'Empty + sanitise bins', frequency: 'daily' },
  { area: 'Kitchen', task: 'Deep-clean canopy + filters', frequency: 'weekly' },
  { area: 'Kitchen', task: 'Defrost + clean walk-in', frequency: 'weekly' },
  { area: 'Kitchen', task: 'Descale dishwasher + glasswasher', frequency: 'monthly' },
  { area: 'Front of house', task: 'Wipe + sanitise tables + bar surfaces', frequency: 'daily' },
  { area: 'Front of house', task: 'Vacuum carpets / mop floors', frequency: 'daily' },
  { area: 'Front of house', task: 'Clean glassware + cutlery polish', frequency: 'daily' },
  { area: 'Bar', task: 'Clean + sanitise drip trays', frequency: 'daily' },
  { area: 'Bar', task: 'Clean beer lines', frequency: 'weekly' },
  { area: 'Storage', task: 'Rotate stock (FIFO check)', frequency: 'weekly' },
  { area: 'Storage', task: 'Pest control sweep', frequency: 'monthly' },
];

export type TrainingKind =
  | 'food_hygiene_l1'
  | 'food_hygiene_l2'
  | 'food_hygiene_l3'
  | 'allergen_awareness'
  | 'haccp'
  | 'first_aid'
  | 'manual_handling'
  | 'fire_safety'
  | 'other';

export const TRAINING_KIND_LABEL: Record<TrainingKind, string> = {
  food_hygiene_l1: 'Food hygiene L1',
  food_hygiene_l2: 'Food hygiene L2',
  food_hygiene_l3: 'Food hygiene L3',
  allergen_awareness: 'Allergen awareness',
  haccp: 'HACCP',
  first_aid: 'First aid',
  manual_handling: 'Manual handling',
  fire_safety: 'Fire safety',
  other: 'Other',
};

/**
 * SFBB opening-check questions, grouped by department.
 *
 * Each group renders as its own side tab in OpeningChecksGrid so the
 * chef / bar / manager only see the checks relevant to them — and the
 * full record sits in one place for the SFBB diary. Answers from all
 * groups merge into a single jsonb on safety_opening_checks so the
 * row count + diary calendar stays unchanged.
 *
 * Adding a new question: extend the relevant group below — no
 * migration needed (answers JSONB tolerates new keys, old rows just
 * won't have them).
 */
export type OpeningCheckDepartment = 'kitchen' | 'bar' | 'management';

export type OpeningCheckQuestion = {
  key: string;
  label: string;
  detail: string;
};

export type OpeningCheckGroup = {
  department: OpeningCheckDepartment;
  label: string;
  blurb: string;
  questions: OpeningCheckQuestion[];
};

export const DEPARTMENT_ORDER: OpeningCheckDepartment[] = [
  'kitchen',
  'bar',
  'management',
];

export const DEPARTMENT_LABEL: Record<OpeningCheckDepartment, string> = {
  kitchen: 'Kitchen',
  bar: 'Bar',
  management: 'Management',
};

export const OPENING_CHECK_GROUPS: OpeningCheckGroup[] = [
  {
    department: 'kitchen',
    label: 'Kitchen',
    blurb: "Pre-service sign-offs — food safety law expects every one of these every day.",
    questions: [
      {
        key: 'fridge_temps',
        label: 'Fridges + freezers',
        detail: 'All units reading safe targets',
      },
      {
        key: 'probes_calibrated',
        label: 'Probes calibrated',
        detail: 'Weekly calibration sign-off',
      },
      {
        key: 'cleaning_signed_off',
        label: 'Cleaning verified',
        detail: "Last night's close-down checked",
      },
      {
        key: 'staff_health',
        label: 'Staff health',
        detail: 'No reported sickness in last 48h',
      },
      {
        key: 'handwash_stocked',
        label: 'Handwash stations',
        detail: 'Soap, blue roll, hot water — every station',
      },
    ],
  },
  {
    department: 'bar',
    label: 'Bar',
    blurb: 'Pre-service bar checks — service standards + the bits an EHO will spot.',
    questions: [
      {
        key: 'bar_glassware_polished',
        label: 'Glassware polished',
        detail: 'Stocked + spot-free at the rail',
      },
      {
        key: 'bar_lines_flushed',
        label: 'Beer + cocktail lines',
        detail: 'Flushed at open · no off-flavours',
      },
      {
        key: 'bar_pourers_clean',
        label: 'Spirit pourers',
        detail: 'Cleaned + free-flowing',
      },
      {
        key: 'bar_ice_quality',
        label: 'Ice machine',
        detail: 'Running clean · scoop dry · stored ice covered',
      },
      {
        key: 'bar_float_counted',
        label: 'Cash + card float',
        detail: 'Counted, signed, in the till',
      },
    ],
  },
  {
    department: 'management',
    label: 'Management',
    blurb: 'Front-of-house sign-offs that knit the kitchen + bar checks together.',
    questions: [
      {
        key: 'mgmt_brief_held',
        label: 'Pre-service brief',
        detail: 'Allergens · 86s · VIPs covered with the team',
      },
      {
        key: 'mgmt_bookings_reviewed',
        label: 'Bookings reviewed',
        detail: 'Covers + notes checked, large parties briefed',
      },
      {
        key: 'mgmt_safety_walk',
        label: 'Safety walkthrough',
        detail: 'FOH + BOH spot-check completed',
      },
      {
        key: 'mgmt_close_signed',
        label: "Last night's close",
        detail: 'Close-down checklist signed by closing manager',
      },
    ],
  },
];

/**
 * Flat list of every question across every department — used by the
 * diary-day detail page's missed-items detector and any other reader
 * that doesn't care about the group structure.
 */
export const OPENING_CHECK_QUESTIONS: Array<
  OpeningCheckQuestion & { department: OpeningCheckDepartment }
> = OPENING_CHECK_GROUPS.flatMap((g) =>
  g.questions.map((q) => ({ ...q, department: g.department })),
);

export const OPENING_CHECK_TOTAL = OPENING_CHECK_QUESTIONS.length;
