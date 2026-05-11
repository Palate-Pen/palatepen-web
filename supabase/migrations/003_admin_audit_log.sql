-- Audit log for admin console actions. Service-role only — no RLS policies.

create table if not exists public.admin_audit_log (
  id uuid default gen_random_uuid() primary key,
  action text not null,
  target_user_id uuid,
  details jsonb default '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log(created_at desc);

create index if not exists admin_audit_log_target_idx
  on public.admin_audit_log(target_user_id);

-- RLS on, no policies = anon/authenticated cannot read or write.
-- Service role bypasses RLS.
alter table public.admin_audit_log enable row level security;
