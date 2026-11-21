-- Applied to project ommccsylnvterlfpqpau as migration "live_price_refresh".
alter table public.offers add column if not exists source text not null default 'sample'
  check (source in ('sample','google_shopping','manual'));

create table if not exists public.price_refreshes (
  id bigint generated always as identity primary key,
  product_id text not null references public.products(id) on delete cascade,
  at timestamptz not null default now(),
  matched int not null default 0
);
create index if not exists price_refreshes_at_idx on public.price_refreshes (at);
create index if not exists price_refreshes_product_at_idx on public.price_refreshes (product_id, at desc);
alter table public.price_refreshes enable row level security; -- no policies: only the Edge Function (service role) uses it
