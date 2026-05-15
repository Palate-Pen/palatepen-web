import { cachedAnthropicCall, firstText } from '@/lib/anthropic-cache';

/**
 * Haiku-powered "voice" enhancement for forward signals.
 *
 * A detector emits a raw signal with terse default copy. If the site is
 * on Kitchen tier or higher, this helper can rewrite the headline +
 * body in Palatable's sous-chef voice (day-not-time, italic gold em
 * accents, no AI / algorithm language, voice tracks severity).
 *
 * All API calls flow through cachedAnthropicCall: the request payload
 * is hashed, identical re-voice requests hit v2.ai_cache for ~zero
 * cost and ~30ms response. Metering still lands every call (including
 * cache hits with cost_pence = 0 and cache_hit = true) so the admin
 * dashboard sees real spend + savings.
 *
 * Soft fail: returns the raw input unchanged if tier is below Kitchen,
 * if the API key is missing, or if anything errors.
 */

const TIER_RANK: Record<string, number> = {
  free: 0,
  pro: 1,
  kitchen: 2,
  group: 3,
  enterprise: 4,
};

export type RawSignalCopy = {
  section_label: string;
  headline_pre: string | null;
  headline_em: string | null;
  headline_post: string | null;
  body_md: string;
  severity: 'urgent' | 'attention' | 'healthy' | 'info';
};

export type VoicedSignalCopy = RawSignalCopy;

export type VoiceRequest = {
  account_id: string;
  site_id: string | null;
  tier: string;
  raw: RawSignalCopy;
  /** Plain summary of what triggered the signal, for the model to chew on. */
  context: string;
};

export async function enhanceSignalVoice(
  req: VoiceRequest,
): Promise<VoicedSignalCopy> {
  const tierRank = TIER_RANK[(req.tier ?? 'free').toLowerCase()] ?? 0;
  if (tierRank < 2) return req.raw;
  if (!process.env.ANTHROPIC_API_KEY) return req.raw;

  const systemPrompt = [
    'You are the editorial voice of Palatable, a chef-facing kitchen toolkit.',
    'Rewrite a forward signal in this exact voice:',
    "- day-not-time references ('Thursday', not '14:23')",
    '- italic gold accents go in headline_em (one short phrase, 2-5 words)',
    '- headline_pre + headline_em + headline_post concatenate into a single sentence with a soft, observational tone',
    "- never say 'AI', 'algorithm', 'data shows', 'we detected', 'the system'",
    '- voice tracks severity: urgent = direct, attention = noticing, info = casual',
    '- body_md is one sentence in serif italic voice, mentions one concrete next step without commanding it',
    '- preserve all numbers, supplier names, ingredient names verbatim from the context',
    'Output STRICT JSON with keys: section_label, headline_pre, headline_em, headline_post, body_md. No prose outside the JSON.',
  ].join('\n');

  const userPrompt = [
    'Severity: ' + req.raw.severity,
    'Section label: ' + req.raw.section_label,
    '',
    'Original copy:',
    '  pre: ' + (req.raw.headline_pre ?? ''),
    '  em: ' + (req.raw.headline_em ?? ''),
    '  post: ' + (req.raw.headline_post ?? ''),
    '  body_md: ' + req.raw.body_md,
    '',
    'Context: ' + req.context,
  ].join('\n');

  try {
    const res = await cachedAnthropicCall({
      surface: 'signal_voice',
      account_id: req.account_id,
      site_id: req.site_id,
      user_id: null,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: 400,
    });
    const parsed = safeJsonExtract(firstText(res.content));
    if (!parsed) return req.raw;
    return {
      section_label: parsed.section_label ?? req.raw.section_label,
      headline_pre: parsed.headline_pre ?? req.raw.headline_pre,
      headline_em: parsed.headline_em ?? req.raw.headline_em,
      headline_post: parsed.headline_post ?? req.raw.headline_post,
      body_md: parsed.body_md ?? req.raw.body_md,
      severity: req.raw.severity,
    };
  } catch {
    return req.raw;
  }
}

function safeJsonExtract(text: string): Record<string, string> | null {
  const stripped = text.replace(/```(?:json)?/g, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(stripped.slice(start, end + 1));
  } catch {
    return null;
  }
}
