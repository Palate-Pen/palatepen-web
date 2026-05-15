/**
 * Central Anthropic model config. Swap once here when changing tiers.
 *
 * Currently: Haiku 4.5. Handles structured extraction from invoice +
 * spec-sheet images well enough that the chef-facing reliability we
 * care about is met. Routed through the cache wrapper in
 * src/lib/anthropic-cache.ts so identical inputs hit the cache.
 */
export const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
export const ANTHROPIC_MODEL_FAMILY = 'haiku-4.5';
export const ANTHROPIC_VERSION = '2023-06-01';
export const ANTHROPIC_MAX_TOKENS = 4096;
