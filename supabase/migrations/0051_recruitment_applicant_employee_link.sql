-- 0051_recruitment_applicant_employee_link.sql
-- Adds a nullable link from a recruitment applicant to the employee record
-- created when that applicant is hired. Additive, reversible, no destructive ops.

begin;

-- 1. Column: nullable FK from applicants -> employees
alter table public.recruitment_applicants
  add column if not exists converted_employee_id uuid null
    references public.employees(id) on delete set null;

-- 2. Lookup index (reverse lookup: did this employee come from an applicant?)
create index if not exists idx_recruitment_applicants_converted_employee_id
  on public.recruitment_applicants(converted_employee_id);

-- 3. Prevent the same employee from being linked to two applicant rows
create unique index if not exists uq_recruitment_applicants_converted_employee_id_active
  on public.recruitment_applicants(converted_employee_id)
  where converted_employee_id is not null and deleted_at is null;

commit;
