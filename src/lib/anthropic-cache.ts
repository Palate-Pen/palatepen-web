import { createHash } from 'crypto';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import {
  ANTHROPIC_MODEL,
  ANTHROPIC_VERSION,
  ANTHROPIC_MAX_TOKENS,
} from '@/lib/anthropic';

/**
 * Central cache-aware Anthropic client. Every call goes through here
 * so we get:
 *
 *   1. Result caching keyed by sha256 of (model + system + messages +
 *      max_tokens). Hit = no API call, ~30ms response, zero spend.
 *   2. Per-call metering into v2.anthropic_usage with cache_hit set.
 *      Admin Infrastructure dashboard plots realised spend vs cache
 *      savings from this.
 *   3. One place to add Anthropic prompt caching (cache_control blocks
 *      on system prompts >1024 tokens) when system prompts grow large
 *      enough to qualify. Today they don't.
 *
 * The wrapper is intentionally minimal: callers pass model-shaped input
 * (system, messages, max_tokens), get back a content[] array. No magic
 * normalisation. Image content sits inside messages and is part of the
 * hash, so the same uploaded invoice always hits the cache.
 *
 * Soft fail: if the cache table doesn't exist yet, the wrapper falls
 * through to a direct API call so a missing migration doesn't bring
 * the AI features down.
 */

type AnthropicMessage = {
  role: 'user' | 'assistant';
  content:
    | string
    | Array<
        | { type: 'text'; text: string }
        | {
            type: 'image';
            source: { type: 'base64'; media_type: string; data: string };
          }
        | {
            type: 'document';
            source: { type: 'base64'; media_type: string; data: string };
          }
      >;
};

type AnthropicContent = Array<{ type: string; text?: string }>;

export type AnthropicCallRequest = {
  /** Operational surface that triggered the call. Drives metering + cache row attribution. */
  surface:
    | 'scan_invoice'
    | 'import_recipe'
    | 'scan_spec_sheet'
    | 'signal_voice';
  account_id: string | null;
  site_id: string | null;
  user_id: string | null;

  /** Whether to attempt a cache lookup. Default true. Set false for paths that must always re-run (e.g. a 'regenerate' button). */
  use_cache?: boolean;

  /** The model call body. */
  system?: string;
  messages: AnthropicMessage[];
  max_tokens?: number;
  model?: string;
};

export type AnthropicCallResult = {
  content: AnthropicContent;
  in_tokens: number;
  out_tokens: number;
  cost_pence: number;
  cache_hit: boolean;
  cache_key: string;
};

// Haiku 4.5 pricing in GBP pence per 1k tokens. Centralised so the
// dashboard's formula and the wrapper agree.
const INPUT_PENCE_PER_K = 0.072;
const OUTPUT_PENCE_PER_K = 0.36;

function priceCall(inTokens: number, outTokens: number): number {
  return (
    (inTokens / 1000) * INPUT_PENCE_PER_K +
    (outTokens / 1000) * OUTPUT_PENCE_PER_K
  );
}

function hashRequest(req: AnthropicCallRequest): string {
  const model = req.model ?? ANTHROPIC_MODEL;
  const maxTokens = req.max_tokens ?? ANTHROPIC_MAX_TOKENS;
  const canonical = JSON.stringify({
    model,
    system: req.system ?? null,
    messages: req.messages,
    max_tokens: maxTokens,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export async function cachedAnthropicCall(
  req: AnthropicCallRequest,
): Promise<AnthropicCallResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  const model = req.model ?? ANTHROPIC_MODEL;
  const maxTokens = req.max_tokens ?? ANTHROPIC_MAX_TOKENS;
  const cacheKey = hashRequest(req);
  const useCache = req.use_cache !== false;
  const svc = createSupabaseServiceClient();

  // 1. Cache lookup (best-effort; missing table is non-fatal).
  if (useCache) {
    try {
      const { data: cached } = await svc
        .from('ai_cache')
        .select('response_content, response_usage')
        .eq('key', cacheKey)
        .maybeSingle();
      if (cached) {
        const usage =
          (cached.response_usage as { in_tokens?: number; out_tokens?: number } | null) ?? {};
        const inTokens = usage.in_tokens ?? 0;
        const outTokens = usage.out_tokens ?? 0;
        // Update last_hit_at + hit_count in the background.
        await svc
          .from('ai_cache')
          .update({
            last_hit_at: new Date().toISOString(),
            hit_count: (await getHitCount(svc, cacheKey)) + 1,
          })
          .eq('key', cacheKey);

        await meterUsage(svc, {
          ...req,
          model,
          surface: req.surface,
          in_tokens: inTokens,
          out_tokens: outTokens,
          cost_pence: 0, // cache hit costs nothing
          cache_hit: true,
          cache_key: cacheKey,
        });

        return {
          content: cached.response_content as AnthropicContent,
          in_tokens: inTokens,
          out_tokens: outTokens,
          cost_pence: 0,
          cache_hit: true,
          cache_key: cacheKey,
        };
      }
    } catch {
      // Cache table missing or other lookup failure: fall through to API.
    }
  }

  // 2. Live API call.
  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages: req.messages,
  };
  if (req.system) body.system = req.system;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(
      'Anthropic API ' + res.status + ': ' + detail.slice(0, 300),
    );
  }

  const json = (await res.json()) as {
    content?: AnthropicContent;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const content = json.content ?? [];
  const inTokens = json.usage?.input_tokens ?? 0;
  const outTokens = json.usage?.output_tokens ?? 0;
  const cost = priceCall(inTokens, outTokens);

  // 3. Cache the result (best-effort).
  if (useCache && content.length > 0) {
    try {
      await svc.from('ai_cache').upsert(
        {
          key: cacheKey,
          surface: req.surface,
          model,
          response_content: content,
          response_usage: { in_tokens: inTokens, out_tokens: outTokens },
          first_at: new Date().toISOString(),
          last_hit_at: new Date().toISOString(),
          hit_count: 0,
        },
        { onConflict: 'key' },
      );
    } catch {
      // ignore
    }
  }

  // 4. Meter the call.
  await meterUsage(svc, {
    ...req,
    model,
    surface: req.surface,
    in_tokens: inTokens,
    out_tokens: outTokens,
    cost_pence: cost,
    cache_hit: false,
    cache_key: cacheKey,
  });

  return {
    content,
    in_tokens: inTokens,
    out_tokens: outTokens,
    cost_pence: cost,
    cache_hit: false,
    cache_key: cacheKey,
  };
}

async function getHitCount(
  svc: ReturnType<typeof createSupabaseServiceClient>,
  key: string,
): Promise<number> {
  const { data } = await svc
    .from('ai_cache')
    .select('hit_count')
    .eq('key', key)
    .maybeSingle();
  return Number(data?.hit_count ?? 0);
}

async function meterUsage(
  svc: ReturnType<typeof createSupabaseServiceClient>,
  row: AnthropicCallRequest & {
    model: string;
    surface: string;
    in_tokens: number;
    out_tokens: number;
    cost_pence: number;
    cache_hit: boolean;
    cache_key: string;
  },
): Promise<void> {
  try {
    await svc.from('anthropic_usage').insert({
      account_id: row.account_id,
      site_id: row.site_id,
      user_id: row.user_id,
      model: row.model,
      surface: row.surface,
      in_tokens: row.in_tokens,
      out_tokens: row.out_tokens,
      cost_pence: row.cost_pence,
      cache_hit: row.cache_hit,
      cache_key: row.cache_key,
    });
  } catch {
    // Metering failure must not break the API call.
  }
}

/**
 * Convenience helper: returns the first text block from a content[]
 * array, or '' if none. Most callers want a single text body.
 */
export function firstText(content: AnthropicContent): string {
  return content.find((b) => b.type === 'text')?.text ?? '';
}
