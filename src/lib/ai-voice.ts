import { createSupabaseServiceClient } from '@/lib/supabase/service';

/**
 * Haiku-powered "voice" enhancement for forward signals.
 *
 * A detector emits a raw signal with terse default copy. If the site is
 * on Kitchen tier or higher, this helper can rewrite the headline +
 * body in Palatable's sous-chef voice (day-not-time, italic gold em
 * accents, no AI / algorithm language, voice tracks severity).
 *
 * Every call is metered to v2.anthropic_usage so the admin Infrastructure
 * dashboard reads actual spend. Callers must pass account_id so the
 * usage row attributes correctly. Soft fail: if the API call errors or
 * tier is too low, we return the raw input unchanged so the signal
 * still ships.
 *
 * Model: claude-haiku-4-5-20251001 (the central model id from
 * src/lib/anthropic.ts; swap here only when the central id changes).
 *
 * Pricing (Anthropic, 2026-05): Haiku 4.5 is roughly
 *   input: GBP 0.00072 / 1k tokens
 *   output: GBP 0.0036 / 1k tokens
 * Per signal we use ~400 input + ~80 output tokens, so a re-voiced
 * signal costs around 0.06p. Effectively free at single-site volumes,
 * but still metered.
 */

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

// Approximate GBP per 1k tokens. Centralised here so the meter agrees
// with the admin dashboard's formula.
const INPUT_PENCE_PER_K = 0.072;
const OUTPUT_PENCE_PER_K = 0.36;

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
  tier: string;
  raw: RawSignalCopy;
  /** Plain summary of what triggered the signal, for the model to chew on. */
  context: string;
};

/**
 * Returns the input unchanged if:
 *   - tier is below Kitchen
 *   - ANTHROPIC_API_KEY is not set
 *   - the API call fails (logged but not thrown)
 *
 * Otherwise: returns a re-voiced copy of the signal text.
 */
export async function enhanceSignalVoice(
  req: VoiceRequest,
): Promise<VoicedSignalCopy> {
  const tierRank = TIER_RANK[(req.tier ?? 'free').toLowerCase()] ?? 0;
  if (tierRank < 2) return req.raw; // Pro and below stay on default voice

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return req.raw;

  const systemPrompt = [
    "You are the editorial voice of Palatable, a chef-facing kitchen toolkit.",
    "Rewrite a forward signal in this exact voice:",
    "- day-not-time references ('Thursday', not '14:23')",
    "- italic gold accents go in headline_em (one short phrase, 2-5 words)",
    "- headline_pre + headline_em + headline_post concatenate into a single sentence with a soft, observational tone",
    "- never say 'AI', 'algorithm', 'data shows', 'we detected', 'the system'",
    "- voice tracks severity: urgent = direct, attention = noticing, info = casual",
    "- body_md is one sentence in serif italic voice, mentions one concrete next step without commanding it",
    "- preserve all numbers, supplier names, ingredient names verbatim from the context",
    "Output STRICT JSON with keys: section_label, headline_pre, headline_em, headline_post, body_md. No prose outside the JSON.",
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
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    if (!res.ok) {
      return req.raw;
    }
    const j = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = (j.content ?? []).find((c) => c.type === 'text')?.text ?? '';
    const parsed = safeJsonExtract(text);
    if (!parsed) return req.raw;

    // Meter the call against the account.
    const inTok = j.usage?.input_tokens ?? 0;
    const outTok = j.usage?.output_tokens ?? 0;
    const costPence =
      (inTok / 1000) * INPUT_PENCE_PER_K +
      (outTok / 1000) * OUTPUT_PENCE_PER_K;
    await meterUsage({
      account_id: req.account_id,
      model: HAIKU_MODEL,
      surface: 'signal_voice',
      in_tokens: inTok,
      out_tokens: outTok,
      cost_pence: costPence,
    });

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
  // Models occasionally wrap JSON in code fences or trailing prose. Strip
  // both and try to parse the first {...} block.
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

async function meterUsage(row: {
  account_id: string;
  model: string;
  surface: string;
  in_tokens: number;
  out_tokens: number;
  cost_pence: number;
}): Promise<void> {
  try {
    const svc = createSupabaseServiceClient();
    await svc.from('anthropic_usage').insert({
      account_id: row.account_id,
      model: row.model,
      surface: row.surface,
      in_tokens: row.in_tokens,
      out_tokens: row.out_tokens,
      cost_pence: row.cost_pence,
    });
  } catch {
    // Metering failure must not break the signal pipeline.
  }
}
