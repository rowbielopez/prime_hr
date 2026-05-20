begin;

-- ============================================================================
-- PDS profile source tracking + legacy linkage
-- ----------------------------------------------------------------------------
-- Adds:
--   - public.pds_profile_source enum ('manual' | 'legacy_migration')
--   - employee_pds_profiles.source / legacy_employee_code / migrated_at / migration_batch_id
--   - employee_pds_change_logs.batch_id (link change log entries to a batch)
-- Used by the legacy HRIS migrator to flag profiles imported from hris.sql.
-- Migrated profiles never auto-promote to 'verified'; HR must explicitly verify.
-- ============================================================================

do $$ begin
  create type public.pds_profile_source as enum (
    'manual',
    'legacy_migration'
  );
exception when duplicate_object then null; end $$;

alter table public.employee_pds_profiles
  add column if not exists source public.pds_profile_source not null default 'manual';

alter table public.employee_pds_profiles
  add column if not exists legacy_employee_code text null;

alter table public.employee_pds_profiles
  add column if not exists migrated_at timestamptz null;

alter table public.employee_pds_profiles
  add column if not exists migration_batch_id uuid null references public.migration_batches(id);

create index if not exists idx_employee_pds_profiles_legacy_code
  on public.employee_pds_profiles(legacy_employee_code)
  where legacy_employee_code is not null;

create index if not exists idx_employee_pds_profiles_source
  on public.employee_pds_profiles(source)
  where deleted_at is null;

alter table public.employee_pds_change_logs
  add column if not exists migration_batch_id uuid null references public.migration_batches(id);

create index if not exists idx_employee_pds_change_logs_batch
  on public.employee_pds_change_logs(migration_batch_id)
  where migration_batch_id is not null;

commit;
