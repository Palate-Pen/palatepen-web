-- v2 migration: anthropic_usage
-- Date: 2026-05-16
-- Applied: 2026-05-16 (manual run via Supabase SQL editor)
--
-- Per-call metering for Anthropic API spend. The legacy public.anthropic_usage
-- table was moved to legacy_archive on 2026-05-14 because the v1 admin
-- read paths went away; the v2 admin Infrastructure dashboard plus the
-- ai-voice helper need it back so customer-level cost attribution works.
--
-- Each row: one API call, attributed to an account so multi-site owners
-- see one bill. surface tells us which feature triggered it (invoice scan
-- / signal voice / recipe import / spec OCR / etc.).

create table v2.anthropic_usage (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references v2.accounts(id) on delete set null,
  site_id uuid references v2.sites(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,

  model text not null,
  surface text not null,

  in_tokens integer not null default 0,
  out_tokens integer not null default 0,

  -- GBP pence. Computed in app code from token counts + the centralised
  -- per-1k rates in src/lib/ai-voice.ts (and any future caller). Storing
  -- it here means the admin dashboard doesn't need to know rates.
  cost_pence numeric(10, 4) not null default 0,

  recorded_at timestamptz not null default now()
);

create index anthropic_usage_account_recorded_idx
  on v2.anthropic_usage(account_id, recorded_at desc);
create index anthropic_usage_surface_idx
  on v2.anthropic_usage(surface, recorded_at desc);

-- RLS: only owner / manager of the account can see their own usage.
-- Inserts come from server actions running with the service role and
-- bypass RLS.
alter table v2.anthropic_usage enable row level security;

create policy anthropic_usage_select on v2.anthropic_usage
  for select using (
    account_id in (
      select a.id from v2.accounts a
      join v2.sites s on s.account_id = a.id
      join v2.memberships m on m.site_id = s.id
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  );

comment on table v2.anthropic_usage is
  'Per-call Anthropic API metering. Drives admin Infrastructure dashboard + per-account usage attribution.';
