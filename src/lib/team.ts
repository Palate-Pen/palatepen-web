import { svc } from './admin';
import type { SupabaseClient } from '@supabase/supabase-js';

export type Role = 'owner' | 'manager' | 'chef' | 'viewer';
export const ROLE_ORDER: Record<Role, number> = { viewer: 1, chef: 2, manager: 3, owner: 4 };
export function roleAtLeast(role: Role | null | undefined, min: Role): boolean {
  if (!role) return false;
  return ROLE_ORDER[role] >= ROLE_ORDER[min];
}

// Tier seat limits — undefined = unlimited.
export const SEAT_LIMITS: Record<string, number | undefined> = {
  free: 1,
  pro: 1,
  kitchen: 10,
  group: undefined,
};

export interface SeatUsage {
  used: number;          // current members + pending invites
  limit: number | null;  // null = unlimited
  hasRoom: boolean;
}

export async function seatUsage(supabase: SupabaseClient, accountId: string, tier: string): Promise<SeatUsage> {
  const [{ count: members }, { count: invites }] = await Promise.all([
    supabase.from('account_members').select('*', { count: 'exact', head: true }).eq('account_id', accountId),
    supabase.from('account_invites').select('*', { count: 'exact', head: true }).eq('account_id', accountId).is('accepted_at', null).gt('expires_at', new Date().toISOString()),
  ]);
  const used = (members || 0) + (invites || 0);
  const cap = SEAT_LIMITS[tier];
  return { used, limit: cap ?? null, hasRoom: cap === undefined ? true : used < cap };
}

// Verify bearer token, look up user + role on the account. Returns 401/403
// shapes that route handlers can return directly.
export async function verifyMember(
  req: Request,
  accountId: string,
  minRole: Role = 'viewer',
): Promise<
  | { ok: true; userId: string; role: Role; supabase: SupabaseClient }
  | { ok: false; status: number; error: string }
> {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return { ok: false, status: 401, error: 'Missing bearer token' };

  const supabase = svc();
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData.user) return { ok: false, status: 401, error: 'Invalid token' };

  const { data: member, error: memberErr } = await supabase
    .from('account_members')
    .select('role')
    .eq('account_id', accountId)
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (memberErr) return { ok: false, status: 500, error: memberErr.message };
  if (!member) return { ok: false, status: 403, error: 'Not a member of this account' };
  if (!roleAtLeast(member.role as Role, minRole)) {
    return { ok: false, status: 403, error: `Requires ${minRole} role or higher` };
  }
  return { ok: true, userId: userData.user.id, role: member.role as Role, supabase };
}

// Verify a bearer token without an account check (used by /api/invites/[token]/accept).
export async function verifyAuthed(
  req: Request,
): Promise<
  | { ok: true; userId: string; email: string | null; supabase: SupabaseClient }
  | { ok: false; status: number; error: string }
> {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return { ok: false, status: 401, error: 'Missing bearer token' };
  const supabase = svc();
  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData.user) return { ok: false, status: 401, error: 'Invalid token' };
  return { ok: true, userId: userData.user.id, email: userData.user.email || null, supabase };
}

export function genInviteToken(): string {
  // 32 bytes of url-safe random — good enough for an invite secret
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
