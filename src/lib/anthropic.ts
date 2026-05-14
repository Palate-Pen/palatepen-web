/**
 * Central Anthropic model config. Swap once here when changing tiers.
 *
 * Currently: Haiku 4.5 — ~13× cheaper than Sonnet 4.6 on the
 * document-and-vision payloads we send (invoice scanning, recipe
 * import). Haiku handles structured-extraction-from-images well
 * enough that the quality cost is negligible for these use cases.
 */
export const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
export const ANTHROPIC_MODEL_FAMILY = 'haiku-4.5';
export const ANTHROPIC_VERSION = '2023-06-01';
export const ANTHROPIC_MAX_TOKENS = 4096;
