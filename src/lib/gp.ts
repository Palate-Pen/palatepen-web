/**
 * GP-related pure utilities. Server-free so client components can
 * import. Moved out of margins.ts (which transitively pulls
 * supabase/server.ts) so the menu planner's shared module — which
 * client components consume — can use these without the boundary leak.
 */

export type GpTone = 'healthy' | 'attention' | 'urgent' | null;

/** Target GP per CLAUDE.md profile.gpTarget default: 72%. The thresholds
 *  for tone classification are: ≥ target = healthy, target-7 to target-1
 *  = attention, < target-7 = urgent. */
export const DEFAULT_GP_TARGET = 72;
export const GP_ATTENTION_BAND = 7;

export function gpToneFor(
  gpPct: number | null,
  target: number = DEFAULT_GP_TARGET,
): GpTone {
  if (gpPct == null) return null;
  if (gpPct >= target) return 'healthy';
  if (gpPct >= target - GP_ATTENTION_BAND) return 'attention';
  return 'urgent';
}
