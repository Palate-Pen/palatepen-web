-- Run this in Supabase SQL Editor to add the waitlist table

create table if not exists public.waitlist (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  created_at timestamptz default now()
);

alter table public.waitlist enable row level security;

-- Allow anyone to insert (for the signup form)
create policy "Anyone can join waitlist" on public.waitlist
  for insert with check (true);

-- Only authenticated users can read
create policy "Only admins can read waitlist" on public.waitlist
  for select using (auth.role() = 'authenticated');

create index if not exists waitlist_email_idx on public.waitlist(email);