/**
 * Date helpers anchored to the user's local timezone, not UTC.
 *
 * Background: JS `toISOString().slice(0, 10)` returns the UTC date. UK
 * runs on BST (UTC+1) for half the year — so after midnight London but
 * before midnight UTC, `toISOString()` returns yesterday. The prep
 * board's "Today" highlight would land on the wrong day, and the chef
 * sees yesterday's data labelled today.
 *
 * Use these helpers when you're rendering / querying by calendar day.
 * Use raw `toISOString()` only when you genuinely want a UTC instant
 * (timestamps, audit rows, etc.).
 */

/** Default timezone for the app. UK-only product for now. */
export const APP_TIMEZONE = 'Europe/London';

/** YYYY-MM-DD in the given (or app default) timezone. */
export function isoDateLocal(d: Date = new Date(), tz: string = APP_TIMEZONE): string {
  // en-CA happens to format dates as YYYY-MM-DD with hyphens.
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: tz,
  }).format(d);
}

/** Returns today's YYYY-MM-DD in the app timezone. */
export function todayIso(tz: string = APP_TIMEZONE): string {
  return isoDateLocal(new Date(), tz);
}

/** Add `n` days to a YYYY-MM-DD string and return the new YYYY-MM-DD.
 *  Operates on the date components only — no timezone arithmetic. */
export function addDaysIso(iso: string, n: number): string {
  // Treat the iso as a UTC midnight, increment, format back via UTC
  // slicing. The day-math is timezone-agnostic since we're shifting
  // by exact 24h multiples between two UTC midnights of the same date.
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Signed day difference between two YYYY-MM-DD strings (a - b). */
export function diffDaysIso(a: string, b: string): number {
  const da = Date.parse(`${a}T00:00:00Z`);
  const db = Date.parse(`${b}T00:00:00Z`);
  return Math.round((da - db) / 86_400_000);
}
