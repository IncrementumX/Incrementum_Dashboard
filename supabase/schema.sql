create table if not exists public.users (
  id uuid primary key,
  email text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  base_currency text not null default 'USD',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_settings (
  portfolio_id uuid primary key,
  benchmark_primary text not null default 'SPX',
  benchmark_secondary text,
  selected_time_range text not null default 'ITD',
  selected_currency text not null default 'USD',
  methodology jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.imported_files (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null,
  storage_path text not null,
  file_name text not null,
  file_hash text not null,
  mime_type text,
  uploaded_at timestamptz not null default now(),
  unique (portfolio_id, file_hash)
);

create table if not exists public.import_runs (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null,
  imported_file_id uuid not null,
  status text not null,
  diagnostics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null,
  import_run_id uuid,
  trade_date date not null,
  type text not null,
  ticker text,
  asset_class text,
  quantity numeric,
  price numeric,
  fx_rate numeric,
  currency text not null default 'USD',
  amount numeric not null default 0,
  cash_impact numeric not null default 0,
  notes text,
  source_section text,
  created_at timestamptz not null default now()
);

create table if not exists public.cash_flows (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null,
  transaction_id uuid,
  flow_date date not null,
  type text not null,
  currency text not null,
  amount numeric not null,
  base_amount numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.snapshots (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null,
  import_run_id uuid,
  statement_end_date date,
  summary jsonb not null default '{}'::jsonb,
  statement_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.benchmark_definitions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  benchmark_type text not null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.price_cache (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  price_date date not null,
  currency text not null default 'USD',
  close_price numeric not null,
  source text not null,
  quality text,
  fetched_at timestamptz not null default now(),
  unique (symbol, price_date, currency, source)
);

create table if not exists public.fx_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency text not null,
  quote_currency text not null,
  rate_date date not null,
  rate numeric not null,
  source text not null,
  fetched_at timestamptz not null default now(),
  unique (base_currency, quote_currency, rate_date, source)
);

create table if not exists public.derived_daily_nav (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null,
  nav_date date not null,
  portfolio_value numeric not null,
  cash_value numeric not null,
  invested_value numeric not null,
  net_contributions numeric not null,
  total_pnl numeric not null,
  methodology_version text not null default 'v1',
  confidence text,
  derived_at timestamptz not null default now(),
  unique (portfolio_id, nav_date, methodology_version)
);

create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null,
  token text unique not null,
  scope text not null default 'read_only',
  context jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null,
  requested_by uuid,
  status text not null,
  export_type text not null,
  storage_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
