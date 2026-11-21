-- Applied to project ommccsylnvterlfpqpau as migration "google_shopping_catalog_import".
alter table public.products
  add column if not exists source text not null default 'sample' check (source in ('sample','google_shopping','manual')),
  add column if not exists external_ref text unique;

alter table public.retailers add column if not exists source text not null default 'manual';

create table if not exists public.import_jobs (
  id bigint generated always as identity primary key,
  query text not null check (length(query) between 2 and 80),
  category text not null check (category in ('electronics','clothing','beauty')),
  max_products int not null default 4 check (max_products between 1 and 8),
  status text not null default 'pending' check (status in ('pending','running','done','error')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  result jsonb
);
alter table public.import_jobs enable row level security; -- no policies: only the service role reads or writes it

create or replace function public.claim_import_job()
returns public.import_jobs
language plpgsql security definer set search_path = ''
as $$
declare j public.import_jobs;
begin
  select * into j from public.import_jobs
   where status = 'pending' or (status = 'running' and started_at < now() - interval '10 minutes')
   order by id limit 1 for update skip locked;
  if j.id is null then return null; end if;
  update public.import_jobs set status = 'running', started_at = now() where id = j.id returning * into j;
  return j;
end $$;
revoke all on function public.claim_import_job() from public, anon, authenticated;
grant execute on function public.claim_import_job() to service_role;
