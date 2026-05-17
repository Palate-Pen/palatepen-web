'use server';

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

/**
 * Submit today's opening check.
 *
 * Attribution: per-question who/when is stored under `answers._meta` so
 * the safety home can render "✓ Jack at 08:42" against each check
 * without a schema change. The existing `completed_by` column still
 * captures the most-recent toggler for backwards compat.
 *
 * Diff-aware: only stamps `_meta` for questions whose value changed
 * since the previous saved row, so chained autosaves don't overwrite
 * the original sign-off timestamp.
 */
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

  const { data: existing } = await supabase
    .from('safety_opening_checks')
    .select('answers')
    .eq('site_id', membership.site_id)
    .eq('check_date', today)
    .maybeSingle();

  const prev = ((existing?.answers ?? {}) as Record<string, unknown>) || {};
  const prevMeta =
    (prev._meta as Record<string, { by: string; at: string }> | undefined) ??
    {};

  const display = await resolveDisplayName(supabase, user.id, user.email);
  const nowIso = new Date().toISOString();

  const nextMeta: Record<string, { by: string; at: string }> = { ...prevMeta };
  for (const [key, val] of Object.entries(input.answers)) {
    if (key === '_meta') continue;
    if (prev[key] !== val) {
      nextMeta[key] = { by: display, at: nowIso };
    }
  }

  const answersWithMeta: Record<string, unknown> = { ...input.answers };
  answersWithMeta._meta = nextMeta;

  const { error } = await supabase
    .from('safety_opening_checks')
    .upsert(
      {
        site_id: membership.site_id,
        completed_by: user.id,
        check_date: today,
        answers: answersWithMeta,
        notes: input.notes,
      },
      { onConflict: 'site_id,check_date' },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath('/safety');
  return { ok: true };
}

async function resolveDisplayName(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  fallbackEmail: string | undefined,
): Promise<string> {
  void supabase;
  void userId;
  if (!fallbackEmail) return 'team';
  const local = fallbackEmail.split('@')[0] ?? 'team';
  // Capitalise first letter for display
  return local.charAt(0).toUpperCase() + local.slice(1);
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
  options?: { notes?: string | null; recipe_id?: string | null },
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
    notes: options?.notes ?? null,
    recipe_id: options?.recipe_id ?? null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/safety/cleaning');
  revalidatePath('/safety');
  return { ok: true };
}

/**
 * Seed the default SFBB-aligned cleaning schedule for a given site.
 *
 * Scoped to a specific `siteId` rather than the user's first
 * membership — chefs with multi-site access (founder jack@, group
 * tier owners) need the seed to land on the site they're currently
 * looking at, not whichever site Postgres returns first.
 *
 * Idempotent — if any tasks already exist for that site we bail with
 * a friendly error instead of duplicating the template.
 */
export async function seedDefaultCleaningTasksAction(input: {
  siteId: string;
}): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('site_id', input.siteId)
    .maybeSingle();
  if (!membership) {
    return { ok: false, error: 'No membership on this site' };
  }
  if (!['owner', 'manager', 'chef'].includes(membership.role as string)) {
    return { ok: false, error: 'Not authorised — owner, manager or chef role required' };
  }

  const { count } = await supabase
    .from('safety_cleaning_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', input.siteId);
  if ((count ?? 0) > 0) {
    return { ok: false, error: 'A schedule already exists for this site' };
  }

  const { DEFAULT_CLEANING_TEMPLATE } = await import('@/lib/safety/standards');
  const rows = DEFAULT_CLEANING_TEMPLATE.map((t) => ({
    site_id: input.siteId,
    area: t.area,
    task: t.task,
    frequency: t.frequency,
  }));
  const { error } = await supabase.from('safety_cleaning_tasks').insert(rows);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/safety/cleaning');
  revalidatePath('/safety');
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
  recipe_id?: string | null;
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
    recipe_id: input.recipe_id ?? null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/safety/training');
  revalidatePath('/safety');
  return { ok: true };
}

// ---------- Cleaning task CRUD ----------
//
// "Manage your schedule" — add, edit, archive rows in
// v2.safety_cleaning_tasks. Authorisation: owner / manager / chef on
// the task's site (matches the seed action). Archive is a soft delete
// via archived_at so historical signoffs still resolve to a label.

const VALID_FREQUENCIES = [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'annually',
] as const;
type CleaningFrequency = (typeof VALID_FREQUENCIES)[number];

async function requireCleaningRole(siteId: string): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('site_id', siteId)
    .maybeSingle();
  if (!membership) {
    return { ok: false, error: 'No membership on this site' };
  }
  if (!['owner', 'manager', 'chef'].includes(membership.role as string)) {
    return { ok: false, error: 'Owner, manager or chef role required' };
  }
  return { ok: true, userId: user.id };
}

export async function createCleaningTaskAction(input: {
  siteId: string;
  area: string;
  task: string;
  frequency: string;
  notes_md?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  const gate = await requireCleaningRole(input.siteId);
  if (!gate.ok) return gate;

  const area = input.area.trim();
  const task = input.task.trim();
  if (!area || !task) {
    return { ok: false, error: 'Area and task are required.' };
  }
  if (!VALID_FREQUENCIES.includes(input.frequency as CleaningFrequency)) {
    return { ok: false, error: 'Invalid frequency.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('safety_cleaning_tasks')
    .insert({
      site_id: input.siteId,
      area,
      task,
      frequency: input.frequency,
      notes_md: input.notes_md ?? null,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath('/safety/cleaning');
  revalidatePath('/safety');
  return { ok: true, data: { id: data.id as string } };
}

export async function updateCleaningTaskAction(input: {
  taskId: string;
  area?: string;
  task?: string;
  frequency?: string;
  notes_md?: string | null;
}): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from('safety_cleaning_tasks')
    .select('site_id')
    .eq('id', input.taskId)
    .maybeSingle();
  if (!existing) return { ok: false, error: 'Task not found' };
  const gate = await requireCleaningRole(existing.site_id as string);
  if (!gate.ok) return gate;

  const patch: Record<string, unknown> = {};
  if (input.area !== undefined) {
    const a = input.area.trim();
    if (!a) return { ok: false, error: 'Area cannot be empty.' };
    patch.area = a;
  }
  if (input.task !== undefined) {
    const t = input.task.trim();
    if (!t) return { ok: false, error: 'Task cannot be empty.' };
    patch.task = t;
  }
  if (input.frequency !== undefined) {
    if (!VALID_FREQUENCIES.includes(input.frequency as CleaningFrequency)) {
      return { ok: false, error: 'Invalid frequency.' };
    }
    patch.frequency = input.frequency;
  }
  if (input.notes_md !== undefined) patch.notes_md = input.notes_md;
  if (Object.keys(patch).length === 0) {
    return { ok: false, error: 'Nothing to update.' };
  }

  const { error } = await supabase
    .from('safety_cleaning_tasks')
    .update(patch)
    .eq('id', input.taskId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/safety/cleaning');
  revalidatePath('/safety');
  return { ok: true };
}

/**
 * Atomic full-replace of the account's opening-checks config. Owner or
 * manager only (it's an account-wide setting, not a per-shift one).
 * Validates each question has a key + label before saving.
 *
 * Storage: accounts.preferences.opening_check_groups (JSONB), so no
 * migration — we merge into whatever else lives on preferences.
 */
export async function setOpeningCheckGroupsAction(input: {
  accountId: string;
  groups: Array<{
    department: 'kitchen' | 'bar' | 'management';
    label: string;
    blurb: string;
    questions: Array<{ key: string; label: string; detail: string }>;
  }>;
}): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  // Authorisation: caller must be owner or manager on a site under
  // this account.
  const { data: ownedSites } = await supabase
    .from('memberships')
    .select('role, sites:site_id (account_id)')
    .eq('user_id', user.id);
  type Row = { role: string; sites: { account_id: string } | null };
  const rows = (ownedSites ?? []) as unknown as Row[];
  const authorised = rows.some(
    (r) =>
      r.sites?.account_id === input.accountId &&
      ['owner', 'manager'].includes(r.role),
  );
  if (!authorised) {
    return { ok: false, error: 'Owner or manager role required.' };
  }

  // Shape validation — bail before clobbering preferences.
  const cleaned = input.groups.map((g) => {
    const label = (g.label ?? '').trim() || g.department;
    const blurb = (g.blurb ?? '').trim();
    const questions = (g.questions ?? [])
      .map((q) => ({
        key: (q.key ?? '').trim(),
        label: (q.label ?? '').trim(),
        detail: (q.detail ?? '').trim(),
      }))
      .filter((q) => q.key && q.label);
    return { department: g.department, label, blurb, questions };
  });

  // Catch dupe keys across the whole config — they'd corrupt the
  // answers JSONB lookup. Flag the first duplicate found.
  const seen = new Set<string>();
  for (const g of cleaned) {
    for (const q of g.questions) {
      if (seen.has(q.key)) {
        return {
          ok: false,
          error: `Duplicate question key "${q.key}" — every question must be unique.`,
        };
      }
      seen.add(q.key);
    }
  }

  // Merge into existing preferences (don't clobber currency, gp_target,
  // kitchen_size, etc.).
  const { data: account } = await supabase
    .from('accounts')
    .select('preferences')
    .eq('id', input.accountId)
    .maybeSingle();
  const prev = (account?.preferences ?? {}) as Record<string, unknown>;
  const nextPrefs = { ...prev, opening_check_groups: cleaned };

  const { error } = await supabase
    .from('accounts')
    .update({ preferences: nextPrefs })
    .eq('id', input.accountId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/safety');
  revalidatePath('/safety/diary', 'layout');
  return { ok: true };
}

// ---------- HACCP wizard ----------
//
// One plan per site (active). Authorisation: owner / manager /
// deputy_manager / head_chef / sous_chef can read + write the plan
// body. Other roles see read-only. Sign-off is reserved to owner +
// manager only.

async function requireHaccpRole(
  siteId: string,
  signOff: boolean = false,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('site_id', siteId)
    .maybeSingle();
  if (!membership) return { ok: false, error: 'No membership on this site' };
  const role = membership.role as string;
  const allowed = signOff
    ? ['owner', 'manager']
    : ['owner', 'manager', 'deputy_manager', 'head_chef', 'sous_chef'];
  if (!allowed.includes(role)) {
    return {
      ok: false,
      error: signOff
        ? 'Owner or manager required to sign off the HACCP plan.'
        : 'Owner, manager, head chef or sous chef required to edit the HACCP plan.',
    };
  }
  return { ok: true, userId: user.id };
}

/** Create or fetch the active HACCP plan for the calling user's site. */
export async function ensureHaccpPlanAction(input: {
  siteId: string;
}): Promise<ActionResult<{ id: string }>> {
  const gate = await requireHaccpRole(input.siteId);
  if (!gate.ok) return gate;

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from('safety_haccp_plans')
    .select('id')
    .eq('site_id', input.siteId)
    .neq('status', 'archived')
    .maybeSingle();
  if (existing) {
    return { ok: true, data: { id: existing.id as string } };
  }

  const { data, error } = await supabase
    .from('safety_haccp_plans')
    .insert({
      site_id: input.siteId,
      status: 'draft',
      body: {},
      current_step: 1,
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? 'Insert failed' };

  revalidatePath('/safety/haccp');
  return { ok: true, data: { id: data.id as string } };
}

/** Save a single step's content to the plan body. Merges with existing
 *  body content so partial updates don't clobber other steps. */
export async function saveHaccpStepAction(input: {
  planId: string;
  step: number;
  content: Record<string, unknown>;
  status?: 'draft' | 'in_progress' | 'review';
}): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data: plan } = await supabase
    .from('safety_haccp_plans')
    .select('site_id, body, status')
    .eq('id', input.planId)
    .maybeSingle();
  if (!plan) return { ok: false, error: 'Plan not found' };
  const gate = await requireHaccpRole(plan.site_id as string);
  if (!gate.ok) return gate;

  const prevBody = (plan.body as Record<string, unknown>) ?? {};
  const nextBody = { ...prevBody, [`step_${input.step}`]: input.content };

  const patch: Record<string, unknown> = {
    body: nextBody,
    current_step: input.step,
  };
  if (input.status) patch.status = input.status;
  else if ((plan.status as string) === 'draft') patch.status = 'in_progress';

  const { error } = await supabase
    .from('safety_haccp_plans')
    .update(patch)
    .eq('id', input.planId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/safety/haccp');
  revalidatePath('/safety');
  return { ok: true };
}

/** Mark the plan as ready for review or signed off. Sign-off is restricted to owner + manager. */
export async function setHaccpStatusAction(input: {
  planId: string;
  status: 'review' | 'signed';
}): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data: plan } = await supabase
    .from('safety_haccp_plans')
    .select('site_id')
    .eq('id', input.planId)
    .maybeSingle();
  if (!plan) return { ok: false, error: 'Plan not found' };
  const gate = await requireHaccpRole(
    plan.site_id as string,
    input.status === 'signed',
  );
  if (!gate.ok) return gate;

  const patch: Record<string, unknown> = { status: input.status };
  if (input.status === 'signed') {
    patch.signed_off_at = new Date().toISOString();
    patch.signed_off_by = gate.userId;
  }
  const { error } = await supabase
    .from('safety_haccp_plans')
    .update(patch)
    .eq('id', input.planId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/safety/haccp');
  revalidatePath('/safety');
  return { ok: true };
}

// ---------- EHO Visit Mode ----------
//
// One active visit per site at a time. Start/end gated to owner /
// manager / deputy_manager (matches the RLS insert policy added by
// 20260517000010). Log entries open to every active role so the chef
// at the pass can capture observations during the inspection.

type EhoVisitTagInternal =
  | 'arrival' | 'note' | 'observed' | 'requested' | 'action';
type EhoVisitTypeInternal =
  | 'routine' | 'follow_up' | 'complaint' | 'spot_check' | 'other';

async function requireEhoVisitRole(
  siteId: string,
  startOrEnd: boolean = false,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('site_id', siteId)
    .maybeSingle();
  if (!membership) return { ok: false, error: 'No membership on this site' };
  const role = membership.role as string;
  const allowed = startOrEnd
    ? ['owner', 'manager', 'deputy_manager']
    : [
        'owner', 'manager', 'deputy_manager',
        'head_chef', 'sous_chef', 'chef',
        'head_bartender', 'bartender', 'supervisor',
      ];
  if (!allowed.includes(role)) {
    return {
      ok: false,
      error: startOrEnd
        ? 'Owner, manager or deputy manager required to start/end the visit.'
        : 'No permission to log visit entries.',
    };
  }
  return { ok: true, userId: user.id };
}

/** Start a new EHO visit. Fails if there's already an unfinished one. */
export async function startEhoVisitAction(input: {
  siteId: string;
  inspectorName?: string | null;
  inspectorAuthority?: string | null;
  inspectorIdShown?: string | null;
  visitType?: EhoVisitTypeInternal | null;
}): Promise<ActionResult<{ id: string }>> {
  const gate = await requireEhoVisitRole(input.siteId, true);
  if (!gate.ok) return gate;

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from('safety_eho_visits')
    .select('id')
    .eq('site_id', input.siteId)
    .is('visit_end_at', null)
    .is('archived_at', null)
    .maybeSingle();
  if (existing) {
    return {
      ok: false,
      error: 'A visit is already in progress for this site.',
    };
  }

  const nowIso = new Date().toISOString();
  const initialLog = [
    {
      at: nowIso,
      tag: 'arrival',
      body: input.inspectorName
        ? `EHO arrived — ${input.inspectorName}${
            input.inspectorAuthority ? ' · ' + input.inspectorAuthority : ''
          }${input.inspectorIdShown ? ' · ID ' + input.inspectorIdShown : ''}.`
        : 'EHO arrived.',
      by: gate.userId,
    },
  ];

  const { data, error } = await supabase
    .from('safety_eho_visits')
    .insert({
      site_id: input.siteId,
      visit_start_at: nowIso,
      inspector_name: input.inspectorName ?? null,
      inspector_authority: input.inspectorAuthority ?? null,
      inspector_id_shown: input.inspectorIdShown ?? null,
      visit_type: input.visitType ?? null,
      visit_log: initialLog,
    })
    .select('id')
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Insert failed' };
  }

  revalidatePath('/safety/eho');
  revalidatePath('/safety');
  return { ok: true, data: { id: data.id as string } };
}

/** End the active visit. Captures outcome, rating, and a closing note. */
export async function endEhoVisitAction(input: {
  visitId: string;
  outcome?: 'pass' | 'improvements_required' | 'failed' | null;
  ratingAfter?: number | null;
  notesMd?: string | null;
}): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data: visit } = await supabase
    .from('safety_eho_visits')
    .select('site_id, visit_log')
    .eq('id', input.visitId)
    .maybeSingle();
  if (!visit) return { ok: false, error: 'Visit not found' };
  const gate = await requireEhoVisitRole(visit.site_id as string, true);
  if (!gate.ok) return gate;

  const nowIso = new Date().toISOString();
  const prevLog = Array.isArray(visit.visit_log)
    ? (visit.visit_log as Array<Record<string, unknown>>)
    : [];
  const nextLog = [
    ...prevLog,
    {
      at: nowIso,
      tag: 'note',
      body: `Visit ended${
        input.outcome ? ' · ' + input.outcome.replace('_', ' ') : ''
      }${input.ratingAfter != null ? ` · FHRS ${input.ratingAfter}` : ''}.`,
      by: gate.userId,
    },
  ];

  const { error } = await supabase
    .from('safety_eho_visits')
    .update({
      visit_end_at: nowIso,
      outcome: input.outcome ?? null,
      rating_after: input.ratingAfter ?? null,
      notes_md: input.notesMd ?? null,
      visit_log: nextLog,
    })
    .eq('id', input.visitId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/safety/eho');
  revalidatePath('/safety');
  return { ok: true };
}

/** Append a single log entry to the active visit. Open to chef + bar
 *  roles so the team at the pass can capture observations live. */
export async function addEhoLogEntryAction(input: {
  visitId: string;
  tag: EhoVisitTagInternal;
  body: string;
}): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data: visit } = await supabase
    .from('safety_eho_visits')
    .select('site_id, visit_end_at, visit_log')
    .eq('id', input.visitId)
    .maybeSingle();
  if (!visit) return { ok: false, error: 'Visit not found' };
  if (visit.visit_end_at) {
    return { ok: false, error: 'This visit has already ended.' };
  }
  const gate = await requireEhoVisitRole(visit.site_id as string, false);
  if (!gate.ok) return gate;

  const trimmed = input.body.trim();
  if (!trimmed) return { ok: false, error: 'Log entry cannot be empty.' };

  const prev = Array.isArray(visit.visit_log)
    ? (visit.visit_log as Array<Record<string, unknown>>)
    : [];
  const next = [
    ...prev,
    {
      at: new Date().toISOString(),
      tag: input.tag,
      body: trimmed,
      by: gate.userId,
    },
  ];

  const { error } = await supabase
    .from('safety_eho_visits')
    .update({ visit_log: next })
    .eq('id', input.visitId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/safety/eho');
  return { ok: true };
}

/** Update the inspector details on an in-progress visit. */
export async function updateEhoVisitInspectorAction(input: {
  visitId: string;
  inspectorName?: string | null;
  inspectorAuthority?: string | null;
  inspectorIdShown?: string | null;
  visitType?: EhoVisitTypeInternal | null;
}): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data: visit } = await supabase
    .from('safety_eho_visits')
    .select('site_id')
    .eq('id', input.visitId)
    .maybeSingle();
  if (!visit) return { ok: false, error: 'Visit not found' };
  const gate = await requireEhoVisitRole(visit.site_id as string, false);
  if (!gate.ok) return gate;

  const patch: Record<string, unknown> = {};
  if (input.inspectorName !== undefined) patch.inspector_name = input.inspectorName;
  if (input.inspectorAuthority !== undefined) patch.inspector_authority = input.inspectorAuthority;
  if (input.inspectorIdShown !== undefined) patch.inspector_id_shown = input.inspectorIdShown;
  if (input.visitType !== undefined) patch.visit_type = input.visitType;
  if (Object.keys(patch).length === 0) {
    return { ok: false, error: 'Nothing to update.' };
  }

  const { error } = await supabase
    .from('safety_eho_visits')
    .update(patch)
    .eq('id', input.visitId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/safety/eho');
  return { ok: true };
}

export async function archiveCleaningTaskAction(input: {
  taskId: string;
}): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from('safety_cleaning_tasks')
    .select('site_id')
    .eq('id', input.taskId)
    .maybeSingle();
  if (!existing) return { ok: false, error: 'Task not found' };
  const gate = await requireCleaningRole(existing.site_id as string);
  if (!gate.ok) return gate;

  const { error } = await supabase
    .from('safety_cleaning_tasks')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', input.taskId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/safety/cleaning');
  revalidatePath('/safety');
  return { ok: true };
}
