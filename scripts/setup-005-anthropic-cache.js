/* eslint-disable no-console */
/*
 * setup-005-anthropic-cache.js
 *
 * Writes:
 *   - supabase/migrations/20260516_v2_ai_cache.sql
 *   - src/lib/anthropic-cache.ts   (cachedAnthropicCall wrapper)
 *
 * The wrapper hashes the request payload (model + system + messages),
 * looks up v2.ai_cache, returns cached content on hit, calls the API on
 * miss + caches the response. Cost-meters every call (hit or miss) so
 * we still see real spend in the admin Infrastructure dashboard, with
 * cache_hit boolean letting the dashboard plot savings.
 *
 * Image content is part of the hash (base64 in the message content
 * already), so re-uploading the same invoice file hits the cache.
 * Same with re-running a URL import — the URL is in the messages.
 *
 * Permanence: no TTL on cache rows. Content is deterministic per input;
 * the only invalidation is a model upgrade, which we handle by changing
 * ANTHROPIC_MODEL in src/lib/anthropic.ts (the model name is in the
 * hash, so a new model produces fresh keys, old rows go untouched).
 *
 * Run with: node scripts/setup-005-anthropic-cache.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function write(rel, body) {
  const out = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, body, { encoding: 'utf8' });
  console.log('wrote', out);
}

// ---------------------------------------------------------------------
// 1. v2.ai_cache migration
// ---------------------------------------------------------------------
const cacheMigration = `-- v2 migration: ai_cache
-- Date: 2026-05-16
--
-- Result cache for Anthropic API calls. Keyed by sha256 of the full
-- request payload (model + system + messages + max_tokens). Re-running
-- the same invoice scan, recipe URL import, or signal voice request
-- returns the cached content array and skips the API call entirely.
--
-- Why permanent, not TTL'd: outputs are deterministic given input +
-- model. The only way a result goes stale is if the model itself
-- changes, and the model name is part of the hash, so a model bump
-- in src/lib/anthropic.ts produces fresh keys and leaves the old rows
-- inert.
--
-- Storage cost: a typical row is ~5kB JSONB (extracted invoice). At
-- 1000 cached invoices per site that's ~5MB/site. Negligible at Pro
-- volumes; budget a quarterly sweep for rows with hit_count = 0 + age
-- > 1 year if storage grows uncomfortable.
--
-- Concurrency: two simultaneous misses for the same key both call the
-- API and the second one's INSERT loses on conflict. That double-spend
-- is bounded by request rate (one user uploading the same file twice in
-- a second). Cheap enough that we accept it rather than locking.

create table v2.ai_cache (
  key text primary key,                -- sha256 hex of request payload
  surface text not null,               -- 'scan_invoice' | 'import_recipe' | etc.
  model text not null,                 -- redundant but lets us audit by model

  response_content jsonb not null,     -- Anthropic content[] array
  response_usage jsonb not null default '{}'::jsonb,  -- in_tokens, out_tokens

  -- Diagnostics
  first_at timestamptz not null default now(),
  last_hit_at timestamptz not null default now(),
  hit_count integer not null default 0
);

create index ai_cache_surface_idx on v2.ai_cache(surface, last_hit_at desc);

-- RLS: the cache is internal infrastructure, not user-facing. The
-- service-role client bypasses RLS for read/write; no policy is needed
-- for application use. Enable RLS without a policy so an authed client
-- mistakenly hitting the table sees an empty result rather than data.
alter table v2.ai_cache enable row level security;

comment on table v2.ai_cache is
  'Result cache for Anthropic API calls. Keyed by sha256 of payload + model.';

-- ---------------------------------------------------------------------
-- anthropic_usage: extend with cache_hit boolean so the admin dashboard
-- can show "spent vs would-have-spent" comparison.
-- ---------------------------------------------------------------------
alter table v2.anthropic_usage
  add column if not exists cache_hit boolean not null default false,
  add column if not exists cache_key text;

create index if not exists anthropic_usage_cache_hit_idx
  on v2.anthropic_usage(cache_hit, recorded_at desc);
`;

// ---------------------------------------------------------------------
// 2. src/lib/anthropic-cache.ts
// ---------------------------------------------------------------------
const cacheLib = `import { createHash } from 'crypto';
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
`;

write('supabase/migrations/20260516_v2_ai_cache.sql', cacheMigration);
write('src/lib/anthropic-cache.ts', cacheLib);

console.log('\ndone');
