-- 010 · Anthropic API call metering
--
-- Captures every Anthropic API call the platform makes so the admin
-- Infrastructure dashboard can show real spend vs the formula-based
-- estimate. Written from server-side routes only — service role inserts,
-- no public RLS policy. Per-call cost stored as integer pence to avoid
-- floating point.
--
-- Aggregations (7d / 30d totals) happen at read time in the admin
-- /api/admin/anthropic-usage endpoint. At current volumes a full scan
-- of the last 30 days is < a few hundred rows.
--
-- Re-runnable — uses `if not exists` everywhere.

create table if not exists public.anthropic_usage (
  id uuid primary key default gen_random_uuid(),
  called_at timestamptz not null default now(),
  kind text not null,
  cost_pence integer not null check (cost_pence >= 0),
  user_id uuid references auth.users(id) on delete set null
);

create index if not exists anthropic_usage_called_at_idx
  on public.anthropic_usage (called_at desc);

alter table public.anthropic_usage enable row level security;

-- No SELECT/INSERT policies for authenticated users — writes happen via
-- service role from the server, reads happen via service role from the
-- admin API. Locking RLS down keeps the table invisible to the app.
