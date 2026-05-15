/* eslint-disable no-console */
/*
 * setup-007-safety-components.js
 *
 * Shared library + UI for Safety v1:
 *
 *   src/lib/safety/legal.ts        — locked liability copy + FSA reference urls
 *   src/lib/safety/standards.ts    — FSA temperature thresholds, allergen list
 *   src/lib/safety/lib.ts          — server-side getters (opening-check status, expiring certs, etc.)
 *   src/lib/safety/actions.ts      — server actions for ack + writes
 *   src/components/safety/LiabilityFooter.tsx
 *   src/components/safety/FsaReferenceStrip.tsx
 *   src/components/safety/SafetyOnboardingModal.tsx
 *   src/components/safety/SafetyShellGate.tsx
 *
 * Run: node scripts/setup-007-safety-components.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function write(rel, body) {
  const out = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, body, { encoding: 'utf8' });
  console.log('wrote', out);
}

// ---------------------------------------------------------------------
// src/lib/safety/legal.ts
// ---------------------------------------------------------------------
const legal = `/**
 * Locked legal wording for the Palatable Safety module. Every safety
 * page renders LIABILITY_FOOTER verbatim. The copy below was reviewed
 * for v1 launch and must not be softened in marketing rewrites.
 *
 * Strategic context: Palatable holds the records; the operator is the
 * legal record-keeper. We are not the inspector, we are not the
 * advisor, we are not the substitute for due diligence. Hospitality
 * software competitors in this space (Food Alert / Alert65 / Navitas)
 * make implicit claims of "compliance" via white-glove consultancy
 * pricing. Palatable does not. The difference is the wedge — and the
 * wedge depends on this wording staying honest.
 */

export const LIABILITY_FOOTER = {
  heading: 'Records held by you',
  body: \`Palatable holds these records on your behalf. You remain the legal record-keeper for food safety compliance under the Food Safety Act 1990 and the Food Information Regulations 2014. Palatable is not a substitute for an EHO inspection, a Level 3 Food Hygiene qualification, or professional safety consultancy.\`,
  emergencyLine: 'In an active food safety emergency, contact your local Environmental Health Officer directly.',
};

/**
 * Onboarding modal wording — shown the first time an owner enters the
 * Safety section. Must be acknowledged before any safety_* writes go
 * through.
 */
export const ONBOARDING_COPY = {
  title: 'About Palatable Safety',
  body_md: \`Palatable Safety is a **record-keeping tool**. It replaces the FSA's paper diary. It is **not** certification, it is **not** legal advice, and it is **not** a substitute for an EHO inspection.

You remain the legal record-keeper. Palatable holds the data, scoped to your site, on servers in the EU. You can export it at any time.

The features inside Safety are aligned with the FSA's Safer Food, Better Business (SFBB) pack and UK Food Safety Act 1990. They do **not** make you compliant on their own. Compliance requires you to **use them honestly + consistently** and to act on what they show you.

By continuing you confirm you've read this, that you understand the records are yours, and that you take responsibility for the food safety operation at this site.\`,
  ackLabel: 'I understand · let me in',
};

/**
 * Per-page FSA references. Each safety surface renders a strip linking
 * to fsa.gov.uk pages relevant to that surface. Links are external —
 * we never embed inspector content inside Palatable.
 */
export const FSA_REFERENCES = {
  opening_checks: [
    {
      label: 'SFBB pack (free)',
      url: 'https://www.food.gov.uk/business-guidance/safer-food-better-business-sfbb',
    },
    {
      label: 'Food hygiene regulations',
      url: 'https://www.food.gov.uk/business-guidance/food-hygiene-regulations',
    },
  ],
  probe_readings: [
    {
      label: 'Temperature controls',
      url: 'https://www.food.gov.uk/business-guidance/temperature-control',
    },
    {
      label: 'Cooking temperatures',
      url: 'https://www.food.gov.uk/business-guidance/safer-food-better-business-for-caterers',
    },
  ],
  incidents: [
    {
      label: 'Reporting incidents',
      url: 'https://www.food.gov.uk/business-guidance/reporting-food-incidents',
    },
    {
      label: 'Allergen guidance',
      url: 'https://www.food.gov.uk/business-guidance/allergen-guidance-for-food-businesses',
    },
  ],
  cleaning: [
    {
      label: 'Cleaning effectively',
      url: 'https://www.food.gov.uk/business-guidance/cleaning-effectively-in-your-business',
    },
  ],
  training: [
    {
      label: 'Staff training',
      url: 'https://www.food.gov.uk/business-guidance/staff-training-for-food-businesses',
    },
  ],
  haccp: [
    {
      label: 'HACCP guidance',
      url: 'https://www.food.gov.uk/business-guidance/hazard-analysis-and-critical-control-point-haccp',
    },
  ],
  eho: [
    {
      label: 'Food hygiene inspections',
      url: 'https://www.food.gov.uk/business-guidance/food-hygiene-inspections',
    },
    {
      label: 'Right of appeal',
      url: 'https://www.food.gov.uk/business-guidance/your-right-of-appeal',
    },
  ],
} as const;

export type SafetySurfaceKey = keyof typeof FSA_REFERENCES;
`;

// ---------------------------------------------------------------------
// src/lib/safety/standards.ts
// ---------------------------------------------------------------------
const standards = `/**
 * FSA-aligned temperature thresholds + allergen reference data. These
 * numbers ship with v1 — they reflect the regulatory baseline as of
 * 2026-05. If the FSA updates a threshold, this file changes; the
 * stored snapshot on each safety_probe_readings.threshold_note keeps
 * historical data interpretable against the rules in force when it
 * was logged.
 */

import type { Database } from '@/types/database';

void undefined as unknown as Database;

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
`;

// ---------------------------------------------------------------------
// src/lib/safety/lib.ts
// ---------------------------------------------------------------------
const safetyLib = `import { createSupabaseServerClient } from '@/lib/supabase/server';

export type OpeningCheckRow = {
  id: string;
  site_id: string;
  check_date: string;
  answers: Record<string, unknown>;
  notes: string | null;
  completed_by: string | null;
  created_at: string;
};

export async function getOpeningCheckForToday(
  siteId: string,
): Promise<OpeningCheckRow | null> {
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('safety_opening_checks')
    .select('id, site_id, check_date, answers, notes, completed_by, created_at')
    .eq('site_id', siteId)
    .eq('check_date', today)
    .maybeSingle();
  return data as OpeningCheckRow | null;
}

export async function getRecentOpeningChecks(
  siteId: string,
  days = 84,
): Promise<OpeningCheckRow[]> {
  const supabase = await createSupabaseServerClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const { data } = await supabase
    .from('safety_opening_checks')
    .select('id, site_id, check_date, answers, notes, completed_by, created_at')
    .eq('site_id', siteId)
    .gte('check_date', since)
    .order('check_date', { ascending: false });
  return (data ?? []) as OpeningCheckRow[];
}

export type ProbeReadingRow = {
  id: string;
  site_id: string;
  kind: string;
  location: string;
  temperature_c: number;
  passed: boolean;
  threshold_note: string | null;
  logged_at: string;
  logged_by: string | null;
  recipe_id: string | null;
  menu_version_id: string | null;
  notes: string | null;
};

export async function getRecentProbeReadings(
  siteId: string,
  limit = 50,
): Promise<ProbeReadingRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('safety_probe_readings')
    .select(
      'id, site_id, kind, location, temperature_c, passed, threshold_note, logged_at, logged_by, recipe_id, menu_version_id, notes',
    )
    .eq('site_id', siteId)
    .order('logged_at', { ascending: false })
    .limit(limit);
  return ((data ?? []) as unknown as ProbeReadingRow[]).map((r) => ({
    ...r,
    temperature_c: Number(r.temperature_c),
  }));
}

export type IncidentRow = {
  id: string;
  site_id: string;
  kind: 'complaint' | 'allergen' | 'near_miss' | 'illness';
  summary: string;
  body_md: string | null;
  occurred_at: string;
  resolved_at: string | null;
  resolution_md: string | null;
  recipe_id: string | null;
  menu_version_id: string | null;
  allergens: string[] | null;
  customer_name: string | null;
  customer_contact: string | null;
};

export async function getRecentIncidents(
  siteId: string,
  options?: { unresolvedOnly?: boolean; limit?: number },
): Promise<IncidentRow[]> {
  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from('safety_incidents')
    .select(
      'id, site_id, kind, summary, body_md, occurred_at, resolved_at, resolution_md, recipe_id, menu_version_id, allergens, customer_name, customer_contact',
    )
    .eq('site_id', siteId)
    .is('archived_at', null)
    .order('occurred_at', { ascending: false });
  if (options?.unresolvedOnly) q = q.is('resolved_at', null);
  if (options?.limit) q = q.limit(options.limit);
  const { data } = await q;
  return (data ?? []) as IncidentRow[];
}

export type CleaningTaskRow = {
  id: string;
  site_id: string;
  area: string;
  task: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  notes_md: string | null;
  /** Most recent signoff timestamp, if any */
  last_completed_at: string | null;
};

export async function getCleaningSchedule(
  siteId: string,
): Promise<CleaningTaskRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data: tasks } = await supabase
    .from('safety_cleaning_tasks')
    .select('id, site_id, area, task, frequency, notes_md')
    .eq('site_id', siteId)
    .is('archived_at', null)
    .order('area', { ascending: true })
    .order('frequency', { ascending: true });
  if (!tasks || tasks.length === 0) return [];

  const taskIds = tasks.map((t) => t.id as string);
  const { data: signoffs } = await supabase
    .from('safety_cleaning_signoffs')
    .select('task_id, completed_at')
    .in('task_id', taskIds)
    .order('completed_at', { ascending: false });
  const latestByTask = new Map<string, string>();
  for (const s of signoffs ?? []) {
    const tid = s.task_id as string;
    if (!latestByTask.has(tid)) latestByTask.set(tid, s.completed_at as string);
  }

  return tasks.map((t) => ({
    id: t.id as string,
    site_id: t.site_id as string,
    area: t.area as string,
    task: t.task as string,
    frequency: t.frequency as CleaningTaskRow['frequency'],
    notes_md: (t.notes_md as string | null) ?? null,
    last_completed_at: latestByTask.get(t.id as string) ?? null,
  }));
}

export type TrainingRow = {
  id: string;
  site_id: string;
  staff_name: string;
  kind: string;
  certificate_name: string | null;
  awarding_body: string | null;
  awarded_on: string;
  expires_on: string | null;
  /** Days until expiry — negative if already expired, null if no expiry. */
  days_until_expiry: number | null;
  /** Ladder bucket per the cert expiry ladder spec (30 / 14 / 7 / 0 days). */
  expiry_band: 'expired' | 'today' | 'this_week' | 'two_weeks' | 'month' | 'safe' | 'no_expiry';
};

export async function getTrainingRecords(
  siteId: string,
): Promise<TrainingRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('safety_training')
    .select(
      'id, site_id, staff_name, kind, certificate_name, awarding_body, awarded_on, expires_on',
    )
    .eq('site_id', siteId)
    .is('archived_at', null)
    .order('expires_on', { ascending: true, nullsFirst: false });

  const now = Date.now();
  return ((data ?? []) as unknown as Array<{
    id: string;
    site_id: string;
    staff_name: string;
    kind: string;
    certificate_name: string | null;
    awarding_body: string | null;
    awarded_on: string;
    expires_on: string | null;
  }>).map((r) => {
    let days: number | null = null;
    let band: TrainingRow['expiry_band'] = 'no_expiry';
    if (r.expires_on) {
      const ms = new Date(r.expires_on).getTime() - now;
      days = Math.ceil(ms / (24 * 60 * 60 * 1000));
      if (days < 0) band = 'expired';
      else if (days === 0) band = 'today';
      else if (days <= 7) band = 'this_week';
      else if (days <= 14) band = 'two_weeks';
      else if (days <= 30) band = 'month';
      else band = 'safe';
    }
    return { ...r, days_until_expiry: days, expiry_band: band };
  });
}

export type SafetyHomeData = {
  todays_check: OpeningCheckRow | null;
  recent_checks: OpeningCheckRow[];        // last 12 weeks
  expiring_certs_30d: TrainingRow[];
  unresolved_incidents: IncidentRow[];
  recent_failing_probes: ProbeReadingRow[];
};

export async function getSafetyHomeData(
  siteId: string,
): Promise<SafetyHomeData> {
  const [todays, recent, training, incidents, probes] = await Promise.all([
    getOpeningCheckForToday(siteId),
    getRecentOpeningChecks(siteId, 84),
    getTrainingRecords(siteId),
    getRecentIncidents(siteId, { unresolvedOnly: true, limit: 5 }),
    getRecentProbeReadings(siteId, 30),
  ]);
  return {
    todays_check: todays,
    recent_checks: recent,
    expiring_certs_30d: training.filter(
      (t) =>
        t.expiry_band !== 'safe' && t.expiry_band !== 'no_expiry',
    ),
    unresolved_incidents: incidents,
    recent_failing_probes: probes.filter((p) => !p.passed),
  };
}
`;

// ---------------------------------------------------------------------
// src/lib/safety/actions.ts
// ---------------------------------------------------------------------
const actions = `'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PROBE_RULES, type ProbeKind } from '@/lib/safety/standards';

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/** Marks the account's liability ack as completed by the calling owner. */
export async function ackLiabilityAction(): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const { data: membership } = await supabase
    .from('memberships')
    .select('site_id, role, sites:site_id (account_id)')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle();
  if (!membership) {
    return { ok: false, error: 'Only owners can acknowledge liability' };
  }
  const accountId =
    (membership.sites as unknown as { account_id?: string } | null)
      ?.account_id ?? null;
  if (!accountId) return { ok: false, error: 'No account found' };

  const { error } = await supabase
    .from('accounts')
    .update({
      safety_liability_acked_at: new Date().toISOString(),
      safety_liability_acked_by: user.id,
    })
    .eq('id', accountId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/safety');
  return { ok: true };
}

/** Submit today's opening check. Either creates or updates. */
export async function submitOpeningCheckAction(input: {
  answers: Record<string, boolean | string>;
  notes: string | null;
}): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const { data: membership } = await supabase
    .from('memberships')
    .select('site_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) return { ok: false, error: 'No site membership' };

  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from('safety_opening_checks')
    .upsert(
      {
        site_id: membership.site_id,
        completed_by: user.id,
        check_date: today,
        answers: input.answers,
        notes: input.notes,
      },
      { onConflict: 'site_id,check_date' },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath('/safety');
  return { ok: true };
}

/** Log a probe reading. Pass/fail is derived from FSA-aligned thresholds. */
export async function logProbeReadingAction(input: {
  kind: ProbeKind;
  location: string;
  temperature_c: number;
  recipe_id?: string | null;
  notes?: string | null;
}): Promise<ActionResult<{ id: string; passed: boolean }>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const { data: membership } = await supabase
    .from('memberships')
    .select('site_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) return { ok: false, error: 'No site membership' };

  const rule = PROBE_RULES[input.kind];
  const passed = rule.passes(Number(input.temperature_c));

  const { data, error } = await supabase
    .from('safety_probe_readings')
    .insert({
      site_id: membership.site_id,
      logged_by: user.id,
      kind: input.kind,
      location: input.location,
      temperature_c: input.temperature_c,
      passed,
      threshold_note: rule.note,
      recipe_id: input.recipe_id ?? null,
      notes: input.notes ?? null,
    })
    .select('id')
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Insert failed' };
  }

  revalidatePath('/safety/probe');
  revalidatePath('/safety');
  return { ok: true, data: { id: data.id as string, passed } };
}

/** Create an incident. */
export async function logIncidentAction(input: {
  kind: 'complaint' | 'allergen' | 'near_miss' | 'illness';
  summary: string;
  body_md?: string | null;
  occurred_at?: string | null;
  recipe_id?: string | null;
  allergens?: string[] | null;
  customer_name?: string | null;
  customer_contact?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const { data: membership } = await supabase
    .from('memberships')
    .select('site_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) return { ok: false, error: 'No site membership' };

  const { data, error } = await supabase
    .from('safety_incidents')
    .insert({
      site_id: membership.site_id,
      logged_by: user.id,
      kind: input.kind,
      summary: input.summary,
      body_md: input.body_md ?? null,
      occurred_at: input.occurred_at ?? new Date().toISOString(),
      recipe_id: input.recipe_id ?? null,
      allergens: input.allergens ?? null,
      customer_name: input.customer_name ?? null,
      customer_contact: input.customer_contact ?? null,
    })
    .select('id')
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Insert failed' };
  }

  revalidatePath('/safety/incidents');
  revalidatePath('/safety');
  return { ok: true, data: { id: data.id as string } };
}

/** Tick a cleaning task as done now. */
export async function signoffCleaningTaskAction(
  taskId: string,
  notes?: string | null,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const { data: task } = await supabase
    .from('safety_cleaning_tasks')
    .select('site_id')
    .eq('id', taskId)
    .maybeSingle();
  if (!task) return { ok: false, error: 'Task not found' };

  const { error } = await supabase.from('safety_cleaning_signoffs').insert({
    site_id: task.site_id,
    task_id: taskId,
    completed_by: user.id,
    notes: notes ?? null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/safety/cleaning');
  revalidatePath('/safety');
  return { ok: true };
}

/** Seed the default SFBB-aligned cleaning schedule. Idempotent — if any
 *  tasks exist it does nothing. */
export async function seedDefaultCleaningTasksAction(): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const { data: membership } = await supabase
    .from('memberships')
    .select('site_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) return { ok: false, error: 'No site membership' };
  if (!['owner', 'manager', 'chef'].includes(membership.role as string)) {
    return { ok: false, error: 'Not authorised' };
  }

  const { count } = await supabase
    .from('safety_cleaning_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', membership.site_id);
  if ((count ?? 0) > 0) {
    return { ok: false, error: 'Tasks already exist' };
  }

  const { DEFAULT_CLEANING_TEMPLATE } = await import('@/lib/safety/standards');
  const rows = DEFAULT_CLEANING_TEMPLATE.map((t) => ({
    site_id: membership.site_id,
    area: t.area,
    task: t.task,
    frequency: t.frequency,
  }));
  const { error } = await supabase.from('safety_cleaning_tasks').insert(rows);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/safety/cleaning');
  return { ok: true };
}

/** Add a training record. */
export async function addTrainingAction(input: {
  staff_name: string;
  user_id?: string | null;
  kind: string;
  certificate_name?: string | null;
  awarding_body?: string | null;
  certificate_number?: string | null;
  awarded_on: string;
  expires_on?: string | null;
}): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const { data: membership } = await supabase
    .from('memberships')
    .select('site_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) return { ok: false, error: 'No site membership' };
  if (!['owner', 'manager'].includes(membership.role as string)) {
    return { ok: false, error: 'Not authorised' };
  }

  const { error } = await supabase.from('safety_training').insert({
    site_id: membership.site_id,
    staff_name: input.staff_name,
    user_id: input.user_id ?? null,
    kind: input.kind,
    certificate_name: input.certificate_name ?? null,
    awarding_body: input.awarding_body ?? null,
    certificate_number: input.certificate_number ?? null,
    awarded_on: input.awarded_on,
    expires_on: input.expires_on ?? null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/safety/training');
  revalidatePath('/safety');
  return { ok: true };
}
`;

// ---------------------------------------------------------------------
// LiabilityFooter
// ---------------------------------------------------------------------
const liabilityFooter = `import { LIABILITY_FOOTER } from '@/lib/safety/legal';

/**
 * Locked liability footer. Rendered at the bottom of every safety page.
 * Wording lives in src/lib/safety/legal.ts and is reviewed for v1
 * launch — do not soften, do not paraphrase.
 */
export function LiabilityFooter() {
  return (
    <footer className="mt-16 pt-8 border-t-2 border-rule bg-paper-warm/40 px-7 py-7 print:bg-transparent print:border-t">
      <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-urgent mb-3">
        {LIABILITY_FOOTER.heading}
      </div>
      <p className="font-serif text-sm text-ink leading-relaxed mb-3">
        {LIABILITY_FOOTER.body}
      </p>
      <p className="font-serif italic text-xs text-muted">
        {LIABILITY_FOOTER.emergencyLine}
      </p>
    </footer>
  );
}
`;

// ---------------------------------------------------------------------
// FsaReferenceStrip
// ---------------------------------------------------------------------
const fsaStrip = `import { FSA_REFERENCES, type SafetySurfaceKey } from '@/lib/safety/legal';

/**
 * Per-surface link strip pointing at fsa.gov.uk. Renders below the page
 * header on every safety surface. We never embed or paraphrase FSA
 * content — only link out.
 */
export function FsaReferenceStrip({ surface }: { surface: SafetySurfaceKey }) {
  const refs = FSA_REFERENCES[surface];
  if (!refs || refs.length === 0) return null;
  return (
    <div className="bg-paper-warm border border-rule px-5 py-3 mb-8 flex items-center gap-4 flex-wrap">
      <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted">
        FSA reference:
      </span>
      {refs.map((r) => (
        <a
          key={r.url}
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-serif text-sm text-gold hover:text-gold-dark transition-colors underline-offset-2 hover:underline"
        >
          {r.label} {String.fromCharCode(0x2192)}
        </a>
      ))}
    </div>
  );
}
`;

// ---------------------------------------------------------------------
// SafetyOnboardingModal
// ---------------------------------------------------------------------
const onboardingModal = `'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ONBOARDING_COPY } from '@/lib/safety/legal';
import { ackLiabilityAction } from '@/lib/safety/actions';

/**
 * Liability acknowledgement gate. The Safety layout renders this when
 * the current account has safety_liability_acked_at = null and the
 * caller is an owner. The modal is non-dismissable — accept or leave.
 *
 * Once accepted, the layout re-fetches the account state and unblocks
 * the safety surfaces.
 */
export function SafetyOnboardingModal({
  showSeedCleaning,
}: {
  /** When true, the modal explains the cleaning-schedule seed in the
   *  same flow. The seed action runs after liability ack on the server. */
  showSeedCleaning?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function accept() {
    setError(null);
    startTransition(async () => {
      const res = await ackLiabilityAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/70 flex items-center justify-center px-4 print-hide">
      <div className="bg-paper border-2 border-urgent max-w-[640px] w-full">
        <div className="bg-urgent text-paper px-7 py-4 font-display font-semibold text-xs tracking-[0.3em] uppercase">
          {ONBOARDING_COPY.title}
        </div>
        <div className="px-7 py-7">
          <div
            className="font-serif text-base text-ink leading-relaxed space-y-3"
            dangerouslySetInnerHTML={{
              __html: renderOnboarding(ONBOARDING_COPY.body_md),
            }}
          />
          {showSeedCleaning && (
            <p className="font-serif italic text-sm text-muted mt-5">
              We'll seed a default SFBB-aligned cleaning schedule for you on
              accept. You can change every task afterwards.
            </p>
          )}
          {error && (
            <p className="font-serif italic text-sm text-urgent mt-5">
              {error}
            </p>
          )}
          <div className="mt-7 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={accept}
              disabled={pending}
              className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-urgent text-paper border border-urgent hover:bg-urgent/90 disabled:opacity-50 transition-colors"
            >
              {pending ? 'Saving' + String.fromCharCode(0x2026) : ONBOARDING_COPY.ackLabel}
            </button>
            <a
              href="/"
              className="font-serif italic text-sm text-muted hover:text-ink"
            >
              Leave Safety
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderOnboarding(md: string): string {
  return md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .split(/\\n\\n+/)
    .map(
      (p) =>
        '<p>' +
        p.replace(
          /\\*\\*(.+?)\\*\\*/g,
          '<strong class="font-semibold not-italic">$1</strong>',
        ) +
        '</p>',
    )
    .join('');
}
`;

// ---------------------------------------------------------------------
// SafetyShellGate — the layout-level access guard
// ---------------------------------------------------------------------
const shellGate = `import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SafetyOnboardingModal } from './SafetyOnboardingModal';

/**
 * Renders one of three states:
 *
 *   1. children — Safety is enabled + liability acked. Normal pass-through.
 *   2. tier upsell card — account does not have safety_enabled = true.
 *   3. onboarding modal — owner has not acked liability yet.
 *
 * Used by src/app/(shell)/safety/layout.tsx to gate every safety route.
 */
export async function SafetyShellGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: membership } = await supabase
    .from('memberships')
    .select('role, site_id, sites:site_id (account_id, name)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) redirect('/onboarding');

  const accountId =
    (membership.sites as unknown as {
      account_id?: string;
      name?: string;
    } | null)?.account_id ?? null;
  const siteName =
    (membership.sites as unknown as { name?: string } | null)?.name ??
    'this site';

  if (!accountId) {
    return <NotEnabled siteName={siteName} />;
  }

  const { data: account } = await supabase
    .from('accounts')
    .select(
      'safety_enabled, safety_liability_acked_at, is_founder',
    )
    .eq('id', accountId)
    .maybeSingle();
  const safetyEnabled = Boolean(account?.safety_enabled);
  const isFounder = Boolean(account?.is_founder);
  const ackedAt = (account?.safety_liability_acked_at as string | null) ?? null;

  if (!safetyEnabled && !isFounder) {
    return <NotEnabled siteName={siteName} />;
  }

  const isOwner = membership.role === 'owner';

  if (!ackedAt) {
    if (isOwner) {
      return (
        <>
          <div className="filter blur-sm pointer-events-none">{children}</div>
          <SafetyOnboardingModal />
        </>
      );
    }
    return <AwaitingOwnerAck />;
  }

  return <>{children}</>;
}

function NotEnabled({ siteName }: { siteName: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-[560px] text-center">
        <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-gold mb-3">
          Palatable Safety
        </div>
        <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
          Not turned on
        </h1>
        <p className="font-serif italic text-lg text-muted mb-6">
          Safety is the £20/site uplift on the Kitchen tier — digital SFBB
          diary, probe + temperature log, incident records, training expiry,
          HACCP wizard, EHO Visit mode. {siteName} doesn't have it switched
          on yet.
        </p>
        <Link
          href="/owner/settings#safety"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors inline-block"
        >
          Enable Safety
        </Link>
      </div>
    </div>
  );
}

function AwaitingOwnerAck() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-[520px] text-center">
        <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-urgent mb-3">
          Liability ack required
        </div>
        <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-3">
          Owner has to open this first
        </h1>
        <p className="font-serif italic text-lg text-muted">
          An owner needs to open Safety once and accept the legal wording
          before kitchen + bar staff can record entries. Ask them to sign
          in and visit /safety.
        </p>
      </div>
    </div>
  );
}
`;

write('src/lib/safety/legal.ts', legal);
write('src/lib/safety/standards.ts', standards);
write('src/lib/safety/lib.ts', safetyLib);
write('src/lib/safety/actions.ts', actions);
write('src/components/safety/LiabilityFooter.tsx', liabilityFooter);
write('src/components/safety/FsaReferenceStrip.tsx', fsaStrip);
write('src/components/safety/SafetyOnboardingModal.tsx', onboardingModal);
write('src/components/safety/SafetyShellGate.tsx', shellGate);

console.log('\ndone');
