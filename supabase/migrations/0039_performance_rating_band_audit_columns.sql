begin;

alter table public.performance_rating_band_config
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by_user_id uuid null references public.app_users(id);

create index if not exists idx_performance_rating_band_config_updated_at
  on public.performance_rating_band_config(updated_at desc);

create index if not exists idx_performance_rating_band_config_updated_by
  on public.performance_rating_band_config(updated_by_user_id);

commit;

