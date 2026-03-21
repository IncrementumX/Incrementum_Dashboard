grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated;

alter table public.users disable row level security;
alter table public.portfolios disable row level security;
alter table public.portfolio_settings disable row level security;
alter table public.imported_files disable row level security;
alter table public.import_runs disable row level security;
alter table public.transactions disable row level security;
alter table public.cash_flows disable row level security;
alter table public.snapshots disable row level security;
alter table public.benchmark_definitions disable row level security;
alter table public.price_cache disable row level security;
alter table public.fx_rates disable row level security;
alter table public.derived_daily_nav disable row level security;
alter table public.share_links disable row level security;
alter table public.export_jobs disable row level security;
