import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  OPENING_CHECK_GROUPS,
  type OpeningCheckDepartment,
  type OpeningCheckGroup,
  type OpeningCheckQuestion,
} from '@/lib/safety/standards';

/**
 * Dynamic opening-checks config, stored on accounts.preferences.opening_check_groups.
 *
 * Falls back to the hardcoded OPENING_CHECK_GROUPS in standards.ts when
 * unset or invalid. The shape mirrors that constant exactly so the UI
 * can swap between defaults and custom without branching.
 *
 * Departments themselves (kitchen / bar / management) are fixed for v1
 * — the user can edit each group's blurb and questions, not add new
 * departments. Old answers stored against removed keys are not deleted;
 * the diary detail just won't surface them as missed items.
 */

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

function defaultGroupFor(dept: OpeningCheckDepartment): OpeningCheckGroup {
  const found = OPENING_CHECK_GROUPS.find((g) => g.department === dept);
  if (found) return found;
  return {
    department: dept,
    label: DEPARTMENT_LABEL[dept],
    blurb: '',
    questions: [],
  };
}

function parseQuestion(raw: unknown): OpeningCheckQuestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const key = typeof r.key === 'string' ? r.key.trim() : '';
  const label = typeof r.label === 'string' ? r.label.trim() : '';
  const detail = typeof r.detail === 'string' ? r.detail.trim() : '';
  if (!key || !label) return null;
  return { key, label, detail };
}

function parseGroup(
  raw: unknown,
  fallback: OpeningCheckGroup,
): OpeningCheckGroup {
  if (!raw || typeof raw !== 'object') return fallback;
  const r = raw as Record<string, unknown>;
  const label =
    typeof r.label === 'string' && r.label.trim().length > 0
      ? r.label.trim()
      : fallback.label;
  const blurb =
    typeof r.blurb === 'string' ? r.blurb.trim() : fallback.blurb;
  const questionsRaw = Array.isArray(r.questions) ? r.questions : null;
  const questions = questionsRaw
    ? questionsRaw
        .map(parseQuestion)
        .filter((q): q is OpeningCheckQuestion => q !== null)
    : fallback.questions;
  return {
    department: fallback.department,
    label,
    blurb,
    questions,
  };
}

export function parseOpeningCheckGroups(raw: unknown): OpeningCheckGroup[] {
  // Build a department-keyed map from the input (if it's an array of
  // groups), so order is always kitchen → bar → management regardless
  // of what was stored.
  const byDept = new Map<OpeningCheckDepartment, unknown>();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item && typeof item === 'object') {
        const dept = (item as { department?: unknown }).department;
        if (
          typeof dept === 'string' &&
          DEPARTMENT_ORDER.includes(dept as OpeningCheckDepartment)
        ) {
          byDept.set(dept as OpeningCheckDepartment, item);
        }
      }
    }
  }
  return DEPARTMENT_ORDER.map((dept) =>
    parseGroup(byDept.get(dept), defaultGroupFor(dept)),
  );
}

export async function getOpeningCheckGroups(
  accountId: string,
): Promise<OpeningCheckGroup[]> {
  if (!accountId) return OPENING_CHECK_GROUPS;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('accounts')
    .select('preferences')
    .eq('id', accountId)
    .maybeSingle();
  const prefs = (data?.preferences ?? {}) as Record<string, unknown>;
  const stored = prefs.opening_check_groups;
  if (!stored) return OPENING_CHECK_GROUPS;
  return parseOpeningCheckGroups(stored);
}

/**
 * Flatten the resolved groups back into the same flat-questions shape
 * the rest of the Safety code expects (e.g. diary-day missed-items
 * detection, where the iteration doesn't care about department).
 */
export function flattenGroups(
  groups: OpeningCheckGroup[],
): Array<OpeningCheckQuestion & { department: OpeningCheckDepartment }> {
  return groups.flatMap((g) =>
    g.questions.map((q) => ({ ...q, department: g.department })),
  );
}
