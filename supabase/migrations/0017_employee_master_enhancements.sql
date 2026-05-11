begin;

-- Extended master data (nullable; modules can adopt incrementally)
alter table public.employees
  add column if not exists civil_status text null,
  add column if not exists tin text null,
  add column if not exists gsis_no text null,
  add column if not exists philhealth_no text null,
  add column if not exists pagibig_no text null,
  add column if not exists employment_type text null,
  add column if not exists date_separated date null,
  add column if not exists separation_reason text null,
  add column if not exists emergency_contact_name text null,
  add column if not exists emergency_contact_phone text null,
  add column if not exists present_address text null,
  add column if not exists permanent_address text null,
  add column if not exists external_ref text null;

-- One active employee record per normalized email (login / HRIS matching)
create unique index if not exists uq_employees_email_normalized_active
  on public.employees (lower(trim(email)))
  where deleted_at is null
    and email is not null
    and length(trim(email)) > 0;

-- HR can read app user rows linked to employees they manage (super/central already covered)
drop policy if exists app_users_hr_select_linked_employee on public.app_users;
create policy app_users_hr_select_linked_employee
on public.app_users
for select
to authenticated
using (
  employee_id is not null
  and exists (
    select 1
    from public.employees e
    where e.id = app_users.employee_id
      and e.deleted_at is null
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', e.campus_id)
      )
  )
);

commit;
