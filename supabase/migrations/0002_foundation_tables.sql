begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  create type public.user_status as enum ('active', 'inactive', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.employment_status as enum ('active', 'on_leave', 'separated', 'retired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.document_status as enum ('draft', 'submitted', 'verified', 'rejected', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.audit_severity as enum ('info', 'warning', 'critical');
exception when duplicate_object then null; end $$;

create table if not exists public.campuses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

drop trigger if exists trg_campuses_updated_at on public.campuses;
create trigger trg_campuses_updated_at
before update on public.campuses
for each row execute function public.set_updated_at();

create table if not exists public.offices (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses(id),
  code text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  unique (campus_id, code),
  unique (campus_id, name)
);

create index if not exists idx_offices_campus_id on public.offices(campus_id);

drop trigger if exists trg_offices_updated_at on public.offices;
create trigger trg_offices_updated_at
before update on public.offices
for each row execute function public.set_updated_at();

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  description text null,
  is_system boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_roles_updated_at on public.roles;
create trigger trg_roles_updated_at
before update on public.roles
for each row execute function public.set_updated_at();

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  first_name text null,
  middle_name text null,
  last_name text null,
  suffix text null,
  status public.user_status not null default 'active',
  primary_campus_id uuid null references public.campuses(id),
  primary_office_id uuid null references public.offices(id),
  is_active boolean not null default true,
  last_login_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists idx_app_users_primary_campus on public.app_users(primary_campus_id);
create index if not exists idx_app_users_primary_office on public.app_users(primary_office_id);

drop trigger if exists trg_app_users_updated_at on public.app_users;
create trigger trg_app_users_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  role_id uuid not null references public.roles(id),
  campus_id uuid null references public.campuses(id),
  is_active boolean not null default true,
  effective_from date null,
  effective_to date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role_id, campus_id)
);

create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_user_roles_role_id on public.user_roles(role_id);
create index if not exists idx_user_roles_campus_id on public.user_roles(campus_id);

drop trigger if exists trg_user_roles_updated_at on public.user_roles;
create trigger trg_user_roles_updated_at
before update on public.user_roles
for each row execute function public.set_updated_at();

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_no text not null unique,
  first_name text not null,
  middle_name text null,
  last_name text not null,
  suffix text null,
  birth_date date null,
  sex text null,
  email text null,
  mobile_no text null,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  position_title text null,
  plantilla_item_no text null,
  employment_status public.employment_status not null default 'active',
  date_hired date null,
  created_by_user_id uuid null references public.app_users(id),
  updated_by_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists idx_employees_campus_id on public.employees(campus_id);
create index if not exists idx_employees_office_id on public.employees(office_id);
create index if not exists idx_employees_last_name on public.employees(last_name);

drop trigger if exists trg_employees_updated_at on public.employees;
create trigger trg_employees_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

create table if not exists public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  document_type text not null,
  title text not null,
  description text null,
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text null,
  file_size_bytes bigint null check (file_size_bytes is null or file_size_bytes >= 0),
  checksum_sha256 text null,
  status public.document_status not null default 'draft',
  issued_at date null,
  expires_at date null,
  uploaded_by_user_id uuid null references public.app_users(id),
  verified_by_user_id uuid null references public.app_users(id),
  verified_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  deleted_at timestamptz null,
  unique (storage_bucket, storage_path)
);

create index if not exists idx_employee_documents_employee_id on public.employee_documents(employee_id);
create index if not exists idx_employee_documents_campus_id on public.employee_documents(campus_id);
create index if not exists idx_employee_documents_status on public.employee_documents(status);

drop trigger if exists trg_employee_documents_updated_at on public.employee_documents;
create trigger trg_employee_documents_updated_at
before update on public.employee_documents
for each row execute function public.set_updated_at();

create table if not exists public.audit_logs (
  id bigserial primary key,
  occurred_at timestamptz not null default now(),
  severity public.audit_severity not null default 'info',
  event_type text not null,
  action text not null,
  actor_user_id uuid null references public.app_users(id),
  campus_id uuid null references public.campuses(id),
  entity_type text not null,
  entity_id text null,
  entity_label text null,
  ip_address inet null,
  user_agent text null,
  request_id text null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_audit_logs_occurred_at on public.audit_logs(occurred_at desc);
create index if not exists idx_audit_logs_actor_user_id on public.audit_logs(actor_user_id);
create index if not exists idx_audit_logs_campus_id on public.audit_logs(campus_id);
create index if not exists idx_audit_logs_event_type on public.audit_logs(event_type);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);

commit;
