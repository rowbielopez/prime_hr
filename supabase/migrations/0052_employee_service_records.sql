-- 0052_employee_service_records.sql
-- Adds official HR-controlled employee service records.
-- This is intentionally separate from PDS Work Experience, which remains CSC Form 212 data.

begin;

create table if not exists public.employee_service_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  date_from date not null,
  date_to date null,
  is_current boolean not null default false,
  position_title text not null,
  appointment_status text null,
  employment_type text null,
  station_place text null,
  branch text null,
  monthly_salary numeric(12,2) null check (monthly_salary is null or monthly_salary >= 0),
  salary_grade_step text null,
  movement_type text null,
  separation_date date null,
  separation_cause text null,
  leave_without_pay text null,
  remarks text null,
  source_work_experience_id uuid null references public.employee_work_experiences(id) on delete set null,
  archived_at timestamptz null,
  created_by_user_id uuid null references public.app_users(id),
  updated_by_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint employee_service_records_period_chk check (date_to is null or date_from <= date_to),
  constraint employee_service_records_separation_chk check (separation_date is null or separation_date >= date_from)
);

create index if not exists idx_employee_service_records_employee_dates
  on public.employee_service_records(employee_id, date_from desc)
  where deleted_at is null;

create index if not exists idx_employee_service_records_scope
  on public.employee_service_records(campus_id, office_id)
  where deleted_at is null;

create index if not exists idx_employee_service_records_updated_at
  on public.employee_service_records(updated_at desc)
  where deleted_at is null;

create unique index if not exists uq_employee_service_records_one_current_active
  on public.employee_service_records(employee_id)
  where is_current = true and deleted_at is null and archived_at is null;

drop trigger if exists trg_employee_service_records_updated_at on public.employee_service_records;
create trigger trg_employee_service_records_updated_at
before update on public.employee_service_records
for each row execute function public.set_updated_at();

alter table public.employee_service_records enable row level security;

drop policy if exists employee_service_records_scoped_select on public.employee_service_records;
create policy employee_service_records_scoped_select on public.employee_service_records
for select to authenticated
using (
  deleted_at is null
  and (
    public.has_active_role('super_admin')
    or public.has_active_role('central_hr_admin')
    or exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = public.current_app_user_id()
        and ur.is_active = true
        and (ur.effective_from is null or ur.effective_from <= current_date)
        and (ur.effective_to is null or ur.effective_to >= current_date)
        and ur.campus_id = employee_service_records.campus_id
        and r.code in ('campus_hr_officer', 'office_unit_head')
        and (
          employee_service_records.office_id is null
          or not exists (select 1 from public.user_role_offices uro where uro.user_role_id = ur.id)
          or exists (
            select 1
            from public.user_role_offices uro2
            where uro2.user_role_id = ur.id
              and uro2.office_id = employee_service_records.office_id
          )
        )
    )
    or exists (
      select 1
      from public.app_users au
      where au.id = public.current_app_user_id()
        and au.employee_id = employee_service_records.employee_id
        and au.is_active = true
        and au.deleted_at is null
    )
  )
);

drop policy if exists employee_service_records_hr_insert on public.employee_service_records;
create policy employee_service_records_hr_insert on public.employee_service_records
for insert to authenticated
with check (public.authz_campus_hr_office_write(campus_id, office_id));

drop policy if exists employee_service_records_hr_update on public.employee_service_records;
create policy employee_service_records_hr_update on public.employee_service_records
for update to authenticated
using (public.authz_campus_hr_office_write(campus_id, office_id))
with check (public.authz_campus_hr_office_write(campus_id, office_id));

drop policy if exists employee_service_records_hr_delete on public.employee_service_records;
create policy employee_service_records_hr_delete on public.employee_service_records
for delete to authenticated
using (public.authz_campus_hr_office_write(campus_id, office_id));

commit;