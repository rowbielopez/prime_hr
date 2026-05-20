begin;

-- ============================================================================
-- Move legacy staging tables from `legacy` schema into `public` schema.
--
-- Rationale: PostgREST only exposes schemas listed in its config. Rather than
-- requiring a dashboard change to expose `legacy`, we move the 17 staging
-- tables to `public` using a `legacy_staging_` prefix. The tables are always
-- empty at this point (never successfully loaded), so there is no data loss.
-- RLS + service-role-only access is preserved via explicit policies.
-- ============================================================================

-- Drop all legacy schema staging tables (they are empty, safe to drop).
drop table if exists legacy.employee_profile cascade;
drop table if exists legacy.address cascade;
drop table if exists legacy.contacts cascade;
drop table if exists legacy.family cascade;
drop table if exists legacy.children cascade;
drop table if exists legacy.educational_bg cascade;
drop table if exists legacy.eligibility cascade;
drop table if exists legacy.service_record cascade;
drop table if exists legacy.government_id cascade;
drop table if exists legacy.skills cascade;
drop table if exists legacy.organizations cascade;
drop table if exists legacy.recognition cascade;
drop table if exists legacy.trainings cascade;
drop table if exists legacy.training_participants cascade;
drop table if exists legacy.training_post cascade;
drop table if exists legacy.users cascade;
drop table if exists legacy.logs_tbl cascade;

-- Drop the legacy schema (no longer needed).
drop schema if exists legacy cascade;

-- ============================================================================
-- Re-create staging tables in public schema with legacy_staging_ prefix.
-- Same structure: (_batch_id, _legacy_id) primary key + jsonb payload.
-- ============================================================================

create table if not exists public.legacy_staging_employee_profile (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists public.legacy_staging_address (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists public.legacy_staging_contacts (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists public.legacy_staging_family (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists public.legacy_staging_children (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists public.legacy_staging_educational_bg (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists public.legacy_staging_eligibility (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists public.legacy_staging_service_record (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists public.legacy_staging_government_id (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists public.legacy_staging_skills (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists public.legacy_staging_organizations (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists public.legacy_staging_recognition (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists public.legacy_staging_trainings (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists public.legacy_staging_training_participants (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists public.legacy_staging_training_post (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists public.legacy_staging_users (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists public.legacy_staging_logs_tbl (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

-- RLS: deny to authenticated; service role bypasses RLS automatically.
alter table public.legacy_staging_employee_profile   enable row level security;
alter table public.legacy_staging_address             enable row level security;
alter table public.legacy_staging_contacts            enable row level security;
alter table public.legacy_staging_family              enable row level security;
alter table public.legacy_staging_children            enable row level security;
alter table public.legacy_staging_educational_bg      enable row level security;
alter table public.legacy_staging_eligibility         enable row level security;
alter table public.legacy_staging_service_record      enable row level security;
alter table public.legacy_staging_government_id       enable row level security;
alter table public.legacy_staging_skills              enable row level security;
alter table public.legacy_staging_organizations       enable row level security;
alter table public.legacy_staging_recognition         enable row level security;
alter table public.legacy_staging_trainings           enable row level security;
alter table public.legacy_staging_training_participants enable row level security;
alter table public.legacy_staging_training_post       enable row level security;
alter table public.legacy_staging_users               enable row level security;
alter table public.legacy_staging_logs_tbl            enable row level security;

-- Allow super_admin / central_hr_admin to SELECT for auditing via Supabase Studio.
do $$ 
declare
  tbl text;
begin
  foreach tbl in array array[
    'legacy_staging_employee_profile','legacy_staging_address','legacy_staging_contacts',
    'legacy_staging_family','legacy_staging_children','legacy_staging_educational_bg',
    'legacy_staging_eligibility','legacy_staging_service_record','legacy_staging_government_id',
    'legacy_staging_skills','legacy_staging_organizations','legacy_staging_recognition',
    'legacy_staging_trainings','legacy_staging_training_participants','legacy_staging_training_post',
    'legacy_staging_users','legacy_staging_logs_tbl'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (
         public.has_active_role(''super_admin'') or public.has_active_role(''central_hr_admin'')
       )',
      'legacy_staging_admin_select_' || tbl, tbl
    );
  end loop;
end $$;

commit;
