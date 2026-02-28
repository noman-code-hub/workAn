-- Market jobs cache tables
-- Run this SQL in Supabase SQL Editor before using:
-- - GET /api/jobs/market
-- - POST /api/jobs/market/sync

create table if not exists public.market_jobs (
  id uuid primary key default gen_random_uuid(),
  external_id text not null,
  country text not null default 'us',
  source text not null default 'serpapi',
  role_query text not null,
  title text not null,
  company text not null,
  location text not null,
  description text not null,
  job_type text not null default 'full-time',
  salary_min numeric not null default 0,
  salary_max numeric not null default 0,
  salary_currency text not null default 'USD',
  skills text[] not null default '{}',
  requirements text[] not null default '{}',
  tags text[] not null default '{}',
  apply_url text not null default '#',
  redirect_url text not null default '#',
  logo_url text,
  posted_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists market_jobs_external_country_idx
  on public.market_jobs (external_id, country);

create index if not exists market_jobs_country_posted_idx
  on public.market_jobs (country, posted_at desc);

create index if not exists market_jobs_country_last_seen_idx
  on public.market_jobs (country, last_seen_at);

create table if not exists public.market_job_sync_state (
  country text primary key,
  last_synced_at timestamptz,
  total_queries integer not null default 0,
  successful_queries integer not null default 0,
  failed_queries text[] not null default '{}',
  active_jobs integer not null default 0,
  removed_jobs integer not null default 0,
  updated_at timestamptz not null default now()
);
