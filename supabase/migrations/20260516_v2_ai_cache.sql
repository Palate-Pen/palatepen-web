-- v2 migration: ai_cache
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
