// Single source of truth for the Anthropic model used across server-side AI
// endpoints (recipe import, invoice scan, spec-sheet scan, inbound email).
// Swap once here when moving between Sonnet / Haiku / Opus tiers — there are
// no per-route overrides today.
//
// Pricing context (2026-05): Sonnet 4.6 is roughly $0.005 / call for the
// document-and-vision payloads we send. Haiku is ~4× cheaper but loses
// reliability on multi-page invoice scans; Opus is ~5× more expensive with
// a worthwhile accuracy bump only for messy handwritten spec sheets.

export const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
