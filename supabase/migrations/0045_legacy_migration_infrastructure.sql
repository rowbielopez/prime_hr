begin;

-- ============================================================================
-- Legacy HRIS migration infrastructure
-- ----------------------------------------------------------------------------
-- Isolates raw legacy data in a dedicated `legacy` schema with permissive
-- text-typed columns. Public-facing tracking lives in two tables:
--   - public.migration_batches: one row per migrate run
--   - public.legacy_record_map: maps each migrated legacy row to its target
-- RLS denies all access to `legacy.*` from `authenticated`; only the service
-- role (used by migration scripts) can read or write these rows.
-- ============================================================================

create schema if not exists legacy;

revoke all on schema legacy from public;
grant usage on schema legacy to postgres, service_role;

do $$ begin
  create type public.migration_batch_status as enum (
    'pending',
    'running',
    'completed',
    'failed',
    'rolled_back'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.migration_batches (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status public.migration_batch_status not null default 'pending',
  dry_run boolean not null default true,
  started_at timestamptz null,
  finished_at timestamptz null,
  initiated_by_user_id uuid null references public.app_users(id),
  summary jsonb not null default '{}'::jsonb,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_migration_batches_status_created
  on public.migration_batches(status, created_at desc);

drop trigger if exists trg_migration_batches_updated_at on public.migration_batches;
create trigger trg_migration_batches_updated_at
before update on public.migration_batches
for each row execute function public.set_updated_at();

create table if not exists public.legacy_record_map (
  id bigserial primary key,
  batch_id uuid not null references public.migration_batches(id) on delete cascade,
  legacy_table text not null,
  legacy_id text not null,
  target_table text not null,
  target_id uuid null,
  action text not null default 'inserted',
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (legacy_table, legacy_id, target_table)
);

create index if not exists idx_legacy_record_map_batch
  on public.legacy_record_map(batch_id);
create index if not exists idx_legacy_record_map_target
  on public.legacy_record_map(target_table, target_id);

alter table public.migration_batches enable row level security;
alter table public.legacy_record_map enable row level security;

drop policy if exists migration_batches_admin_select on public.migration_batches;
create policy migration_batches_admin_select on public.migration_batches
for select to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
);

drop policy if exists legacy_record_map_admin_select on public.legacy_record_map;
create policy legacy_record_map_admin_select on public.legacy_record_map
for select to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
);

-- ============================================================================
-- Legacy staging tables — one per source table from public/hris.sql.
-- All columns are nullable text to preserve raw data exactly as dumped.
-- Composite key (_batch_id, _legacy_id) ensures idempotent loads per batch.
-- ============================================================================

create table if not exists legacy.employee_profile (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists legacy.address (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists legacy.contacts (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists legacy.family (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists legacy.children (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists legacy.educational_bg (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists legacy.eligibility (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists legacy.service_record (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists legacy.government_id (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists legacy.skills (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists legacy.organizations (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists legacy.recognition (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists legacy.trainings (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists legacy.training_participants (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists legacy.training_post (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists legacy.users (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

create table if not exists legacy.logs_tbl (
  _batch_id uuid not null references public.migration_batches(id) on delete cascade,
  _legacy_id text not null,
  _loaded_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (_batch_id, _legacy_id)
);

-- RLS: deny everything to authenticated; service role bypasses RLS by default.
alter table legacy.employee_profile enable row level security;
alter table legacy.address enable row level security;
alter table legacy.contacts enable row level security;
alter table legacy.family enable row level security;
alter table legacy.children enable row level security;
alter table legacy.educational_bg enable row level security;
alter table legacy.eligibility enable row level security;
alter table legacy.service_record enable row level security;
alter table legacy.government_id enable row level security;
alter table legacy.skills enable row level security;
alter table legacy.organizations enable row level security;
alter table legacy.recognition enable row level security;
alter table legacy.trainings enable row level security;
alter table legacy.training_participants enable row level security;
alter table legacy.training_post enable row level security;
alter table legacy.users enable row level security;
alter table legacy.logs_tbl enable row level security;

-- Restrict direct schema access; service-role bypasses RLS.
revoke all on all tables in schema legacy from public, authenticated, anon;

commit;
