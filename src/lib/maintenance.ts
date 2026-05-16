/**
 * Maintenance mode — global kill-switch the founder can flip from the
 * Vercel dashboard without a redeploy. Set `MAINTENANCE_MODE=true` in
 * the environment and every customer request is routed to /maintenance.
 *
 * Optional knobs:
 *   - `MAINTENANCE_MESSAGE` — custom message shown on the page.
 *   - `MAINTENANCE_BYPASS_TOKEN` — secret query token (`?bypass=…`)
 *     that drops a cookie so the founder + designated testers can
 *     still reach the app while customers see the maintenance page.
 *
 * Webhooks (Stripe + inbound email + cron) are exempt — they must
 * always return 200 so providers don't disable the endpoint or rack up
 * retries while we're down. See PASSTHROUGH_PREFIXES below.
 */

export const MAINTENANCE_COOKIE = 'palatable_maint_bypass';

/** Paths that must keep serving even when maintenance mode is on. */
export const PASSTHROUGH_PREFIXES = [
  '/maintenance',
  '/api/stripe/',
  '/api/inbound-email',
  '/api/cron/',
  '/_next/',
  '/favicon',
];

export function isMaintenanceEnabled(): boolean {
  const v = (process.env.MAINTENANCE_MODE ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export function maintenanceMessage(): string {
  const m = (process.env.MAINTENANCE_MESSAGE ?? '').trim();
  if (m) return m;
  return "We're making a quick repair to the kitchen — back online shortly.";
}

/** True when this path should bypass the maintenance redirect. */
export function isPassthroughPath(pathname: string): boolean {
  return PASSTHROUGH_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * Check the bypass token from a query string. Returns true if the token
 * matches the env-configured secret. Use this in middleware to set the
 * bypass cookie before the maintenance check kicks in.
 */
export function bypassTokenValid(token: string | null): boolean {
  if (!token) return false;
  const expected = (process.env.MAINTENANCE_BYPASS_TOKEN ?? '').trim();
  if (!expected) return false;
  return token === expected;
}
