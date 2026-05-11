-- CSU PRIME-HR local development seed
-- Idempotent inserts for baseline data used in development/testing.

begin;

-- ---------------------------------------
-- campuses
-- ---------------------------------------
insert into public.campuses (code, name, is_active)
values
  ('AND', 'Andrews', true),
  ('APR', 'Aparri', true),
  ('CAR', 'Carig', true),
  ('GON', 'Gonzaga', true),
  ('LAL', 'Lal-lo', true),
  ('LAS', 'Lasam', true),
  ('PIA', 'Piat', true),
  ('SMR', 'Sanchez Mira', true),
  ('SOL', 'Solana', true)
on conflict (code) do update
set
  name = excluded.name,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------
-- offices (minimal per campus)
-- ---------------------------------------
with office_seed as (
  select c.id as campus_id, c.code as campus_code, 'HR'::text as office_code, 'Campus HR Office'::text as office_name
  from public.campuses c
  union all
  select c.id, c.code, 'ADM'::text, 'Administration Office'::text
  from public.campuses c
)
insert into public.offices (campus_id, code, name, is_active)
select os.campus_id, os.office_code, os.office_name, true
from office_seed os
on conflict (campus_id, code) do update
set
  name = excluded.name,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------
-- roles (baseline RBAC)
-- ---------------------------------------
insert into public.roles (code, name, description, is_system, is_active)
values
  ('super_admin', 'Super Admin', 'Platform-wide administration access.', true, true),
  ('central_hr_admin', 'Central HR Admin', 'University-level HR administration and oversight.', true, true),
  ('campus_hr_officer', 'Campus HR Officer', 'Campus-level HR operations and compliance handling.', true, true),
  ('office_unit_head', 'Office/Unit Head', 'Unit-level reviewer/approver for HR and compliance workflows.', true, true),
  ('committee_member', 'Committee Member', 'Assigned reviewer for committee workflows.', true, true),
  ('employee', 'Employee', 'Employee-level access for personal records and submissions.', true, true)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  is_system = excluded.is_system,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------
-- employees (minimal development records)
-- ---------------------------------------
insert into public.employees (
  employee_no,
  first_name,
  middle_name,
  last_name,
  suffix,
  email,
  mobile_no,
  campus_id,
  office_id,
  position_title,
  employment_status,
  date_hired
)
values
  (
    'DEV-001',
    'Test',
    'A',
    'Employee',
    null,
    'dev-employee-001@localhost.test',
    null,
    (select id from public.campuses where code = 'AND'),
    (select o.id from public.offices o join public.campuses c on c.id = o.campus_id where c.code = 'AND' and o.code = 'HR'),
    'HR Staff I',
    'active',
    date '2023-01-15'
  ),
  (
    'DEV-002',
    'Sample',
    'B',
    'User',
    null,
    'dev-employee-002@localhost.test',
    null,
    (select id from public.campuses where code = 'APR'),
    (select o.id from public.offices o join public.campuses c on c.id = o.campus_id where c.code = 'APR' and o.code = 'ADM'),
    'Administrative Aide',
    'active',
    date '2022-06-01'
  ),
  (
    'DEV-003',
    'Local',
    null,
    'Tester',
    null,
    'dev-employee-003@localhost.test',
    null,
    (select id from public.campuses where code = 'CAR'),
    (select o.id from public.offices o join public.campuses c on c.id = o.campus_id where c.code = 'CAR' and o.code = 'HR'),
    'HR Officer',
    'on_leave',
    date '2021-09-10'
  )
on conflict (employee_no) do update
set
  first_name = excluded.first_name,
  middle_name = excluded.middle_name,
  last_name = excluded.last_name,
  suffix = excluded.suffix,
  email = excluded.email,
  mobile_no = excluded.mobile_no,
  campus_id = excluded.campus_id,
  office_id = excluded.office_id,
  position_title = excluded.position_title,
  employment_status = excluded.employment_status,
  date_hired = excluded.date_hired,
  updated_at = now();

-- ---------------------------------------
-- compliance (PRIME-HR areas & indicators)
-- ---------------------------------------
insert into public.compliance_areas (code, name, description, is_active)
values
  ('A1', 'Strategic Human Resource Management', 'PRIME-HR Area A1 — strategic alignment.', true),
  ('A2', 'Recruitment, Selection, and Placement', 'PRIME-HR Area A2 — talent acquisition.', true),
  ('A3', 'HR Development and Performance', 'PRIME-HR Area A3 — development and performance.', true)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.compliance_indicators (area_id, code, title, description, is_active)
select a.id, v.code, v.title, v.description, true
from (
  values
    ('A1'::text, 'A1.1'::text, 'HR strategic plan is documented and periodically reviewed.'::text, 'Strategic documentation.'::text),
    ('A1', 'A1.2', 'HR metrics and monitoring mechanisms are in place.', null::text),
    ('A2', 'A2.1', 'Recruitment policies and procedures align with CSC rules.', null::text),
    ('A2', 'A2.2', 'Selection tools and documentation are maintained.', null::text),
    ('A3', 'A3.1', 'Employee development plans exist for key roles.', null::text)
) as v(area_code, code, title, description)
join public.compliance_areas a on a.code = v.area_code
on conflict (area_id, code) do update
set
  title = excluded.title,
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = now();

commit;

