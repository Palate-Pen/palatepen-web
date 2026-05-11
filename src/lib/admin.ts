import type { SupabaseClient } from '@supabase/supabase-js';

export const ADMIN_PASSWORD = 'PalatePen2026!';

export function isAuthorized(req: Request): boolean {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return token === ADMIN_PASSWORD;
}

// Best-effort audit insert. Never throws — we don't want logging to fail the action.
export async function audit(
  req: Request,
  supabase: SupabaseClient,
  action: string,
  targetUserId: string | null,
  details: Record<string, unknown> = {},
): Promise<void> {
  try {
    await supabase.from('admin_audit_log').insert({
      action,
      target_user_id: targetUserId,
      details,
      ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null,
      user_agent: req.headers.get('user-agent') || null,
    });
  } catch {
    // swallow
  }
}

// Compute a shallow diff between two profile objects: returns { field: { from, to } }
// for every field whose value differs (string-equality after JSON.stringify).
export function profileDiff(before: any, after: any): Record<string, { from: any; to: any }> {
  const out: Record<string, { from: any; to: any }> = {};
  const b = before && typeof before === 'object' ? before : {};
  const a = after && typeof after === 'object' ? after : {};
  const keys = Array.from(new Set<string>([...Object.keys(b), ...Object.keys(a)]));
  for (const k of keys) {
    if (JSON.stringify(b[k]) !== JSON.stringify(a[k])) {
      out[k] = { from: b[k] ?? null, to: a[k] ?? null };
    }
  }
  return out;
}
