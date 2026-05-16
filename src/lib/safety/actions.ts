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
