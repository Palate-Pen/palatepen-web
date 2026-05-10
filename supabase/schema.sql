-- Run this in your Supabase SQL editor to set up the database

-- User data table (stores all app data per user)
create table if not exists public.user_data (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  recipes jsonb default '[]'::jsonb,
  notes jsonb default '[]'::jsonb,
  gp_history jsonb default '[]'::jsonb,
  ingredients_bank jsonb default '[]'::jsonb,
  invoices jsonb default '[]'::jsonb,
  price_alerts jsonb default '[]'::jsonb,
  stock_items jsonb default '[]'::jsonb,
  profile jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.user_data enable row level security;

-- Users can only read and write their own data
create policy "Users can read own data" on public.user_data
  for select using (auth.uid() = user_id);

create policy "Users can insert own data" on public.user_data
  for insert with check (auth.uid() = user_id);

create policy "Users can update own data" on public.user_data
  for update using (auth.uid() = user_id);

-- Blog posts table
create table if not exists public.blog_posts (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  title text not null,
  excerpt text,
  content text,
  category text,
  published boolean default false,
  published_at timestamptz,
  created_at timestamptz default now()
);

-- Blog posts are public to read
alter table public.blog_posts enable row level security;
create policy "Blog posts are publicly readable" on public.blog_posts
  for select using (published = true);

-- Indexes
create index if not exists user_data_user_id_idx on public.user_data(user_id);
create index if not exists blog_posts_slug_idx on public.blog_posts(slug);
create index if not exists blog_posts_published_idx on public.blog_posts(published);