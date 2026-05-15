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

/** Form-compatible wrapper — returns void so `<form action={...}>` type-checks. */
export async function seedDefaultCleaningTasksFormAction(): Promise<void> {
  await seedDefaultCleaningTasksAction();
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
