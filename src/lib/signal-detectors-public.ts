/**
 * Public re-exports of the detector functions defined in
 * signal-detectors.ts. The original module keeps the detectors private
 * because they are only called by regenerateSignalsForSite. The drainer
 * now needs to call them individually per event-kind, so this shim adds
 * the export surface without touching the closed module.
 *
 * Once the event bus is fully bedded in, the original module's
 * detectors can move here and signal-detectors.ts becomes the public
 * surface.
 */

// Re-imports happen via a barrel file edit — the function bodies live
// in signal-detectors.ts. To minimise churn, this file imports the
// module with a side-effect-free dynamic import pattern that resolves
// to the same functions through TS module merging at the source.
//
// Step 1 of this batch keeps both: signal-detectors.ts still exports
// only regenerateSignalsForSite, but we ALSO add named exports for the
// detectors. The trade-off: a tiny edit to signal-detectors.ts adding
// "export" in front of each detector function. That edit is performed
// by setup-004-export-detectors.js — running this re-export then
// becomes a plain re-export.
//
// This file is the consumer-facing surface; consumers (event-drain.ts)
// import from signal-detectors-public, never from signal-detectors.

export {
  detectParBreaches,
  detectAllocationsArriving,
  detectFlaggedInvoicesNeedingCreditNotes,
  detectRecipeCostDrift,
  detectSpillagePatterns,
  detectStockTakeVariance,
  detectTodaysDeliveries,
  detectTonightsPrep,
  detectIdleRecipes,
  detectStaleCostBaseline,
  detectPrepPatternLag,
  detectMenuGpDrag,
  detectNotebookLinkDrift,
} from './signal-detectors';
