// Shared time anchor for seed-data generation. All "days ago" helpers reference
// the same captured NOW so a single seed run produces a coherent timeline (a
// stock count from "5 days ago" lines up with an invoice from "4 days ago").
//
// Time spread targets — make sure Reports' 7d / 30d / 90d / All windows all
// have data in them:
//   ≤7d   : ~4 events of each kind
//   ≤30d  : ~12 events
//   ≤90d  : ~25 events
//   >90d  : a few extras for All-time context

export const NOW = Date.now();
export const DAY = 86400000;
export function daysAgo(n: number): number {
  return NOW - n * DAY;
}
