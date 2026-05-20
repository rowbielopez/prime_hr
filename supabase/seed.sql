-- CSU PRIME-HR local development seed
-- Idempotent inserts for baseline data used in development/testing.

begin;

-- ---------------------------------------
-- campuses (10 CSU campuses from legacy HRIS)
-- ---------------------------------------
insert into public.campuses (code, name, short_name, sort_order, is_active)
values
  ('AND', 'Andrews',      'Andrews',   1,  true),
  ('APR', 'Aparri',       'Aparri',    2,  true),
  ('CAR', 'Carig',        'Carig',     3,  true),
  ('GON', 'Gonzaga',      'Gonzaga',   4,  true),
  ('LAL', 'Lal-lo',       'Lal-lo',    5,  true),
  ('LAS', 'Lasam',        'Lasam',     6,  true),
  ('PIA', 'Piat',         'Piat',      7,  true),
  ('SMR', 'Sanchez Mira', 'San. Mira', 8,  true),
  ('SOL', 'Solana',       'Solana',    9,  true),
  ('CEN', 'Central',      'Central',   10, true)
on conflict (code) do update
set
  name       = excluded.name,
  short_name = excluded.short_name,
  sort_order = excluded.sort_order,
  is_active  = excluded.is_active,
  updated_at = now();

-- ---------------------------------------
-- offices (58 standard offices × every campus, sourced from legacy HRIS departments)
-- ---------------------------------------
with office_templates (code, name, office_type, sort_order) as (
  values
    ('ACCTG',    'Accounting Office',                                              'administrative', 10),
    ('ADMISSN',  'Admission Office',                                               'administrative', 20),
    ('AUX',      'Auxiliary Office',                                               'administrative', 30),
    ('BAC',      'BAC Office',                                                     'administrative', 40),
    ('BDSEC',    'Board Secretary Office',                                         'administrative', 50),
    ('BUDGET',   'Budget Office',                                                  'administrative', 60),
    ('BUS',      'Business Office',                                                'administrative', 70),
    ('OCEO',     'Campus Executive Officer',                                       'administrative', 80),
    ('CMIS',     'Campus MIS Office',                                              'administrative', 90),
    ('CASH',     'Cashier''s Office',                                              'administrative', 100),
    ('GAD',      'Gender and Development Office',                                  'administrative', 110),
    ('GSO',      'General Services Office',                                        'administrative', 120),
    ('HRMO',     'Human Resource Management Office',                               'administrative', 130),
    ('INFRA',    'Infrastructure Office',                                          'administrative', 140),
    ('IAS',      'Internal Audit Services Office',                                 'administrative', 150),
    ('OCFMO',    'Office of the Chief Finance Management Officer',                 'administrative', 160),
    ('OP',       'Office of the President',                                        'administrative', 170),
    ('OVPAA',    'Office of the Vice President for Academic Affairs',              'administrative', 180),
    ('OVPAF',    'Office of the Vice President for Administration and Finance',    'administrative', 190),
    ('OVPPRM',   'Office of the Vice President for Partnership and Resource Mobilisation', 'administrative', 200),
    ('OVPRDE',   'Office of the Vice President for Research, Development and Extension',   'administrative', 210),
    ('PLAN',     'Planning Office',                                                'administrative', 220),
    ('RECORD',   'Record Office',                                                  'administrative', 230),
    ('SUPPLY',   'Supply Office',                                                  'administrative', 240),
    ('TRAINING', 'Training Office',                                                'administrative', 250),
    ('UMIS',     'University MIS Office',                                          'administrative', 260),
    ('REGR',     'University Registrar''s Office',                                 'administrative', 270),
    ('UPDO',     'University Project Development Office',                          'administrative', 280),
    ('UIO',      'University Information Office',                                  'administrative', 290),
    ('GRADSCH',  'Graduate School Office',                                         'academic', 310),
    ('COA',      'College of Agriculture',                                         'academic', 320),
    ('CAHS',     'College of Allied Health and Sciences',                          'academic', 330),
    ('CAS',      'College of Arts and Sciences',                                   'academic', 340),
    ('CBEA',     'College of Business, Entrepreneurship and Accountancy',          'academic', 350),
    ('COE',      'College of Engineering',                                         'academic', 360),
    ('COF',      'College of Fisheries',                                           'academic', 370),
    ('CHIM',     'College of Hospitality Industry Management',                     'academic', 380),
    ('CIT',      'College of Information Technology',                              'academic', 390),
    ('COL',      'College of Law',                                                 'academic', 400),
    ('CTE',      'College of Teacher Education',                                   'academic', 410),
    ('CTED',     'CTED',                                                           'academic', 420),
    ('TVET',     'Technical-Vocational Education and Training',                    'academic', 430),
    ('RESEARCH', 'Research Office',                                                'academic', 440),
    ('EXTENSION','Extension Office',                                               'academic', 450),
    ('CLINIC',   'Clinic',                                                         'student_services', 510),
    ('CULTARTS', 'Culture and Arts',                                               'student_services', 520),
    ('GUIDANCE', 'Guidance Office',                                                'student_services', 530),
    ('LIB',      'Library',                                                        'student_services', 540),
    ('UNILIB',   'University Library',                                             'student_services', 550),
    ('OSSWD',    'OSSWD',                                                          'student_services', 560),
    ('SOCIOCUL', 'Socio Cultural',                                                 'student_services', 570),
    ('ODI',      'ODI',                                                            'other', 610),
    ('IMC',      'IMC',                                                            'other', 620),
    ('HOTEL',    'CSU Hotel',                                                      'other', 630),
    ('SPECPROJ', 'Special Project',                                                'other', 640),
    ('NPRIC',    'NPRIC',                                                          'other', 650),
    ('CALAB',    'CALAB',                                                          'other', 660),
    ('OTHERS',   'Others',                                                         'other', 999)
)
insert into public.offices (campus_id, code, name, office_type, sort_order, is_active)
select c.id, ot.code, ot.name, ot.office_type, ot.sort_order, true
from public.campuses c
cross join office_templates ot
where c.deleted_at is null
on conflict (campus_id, code) do update
set
  name        = excluded.name,
  office_type = excluded.office_type,
  sort_order  = excluded.sort_order,
  is_active   = excluded.is_active,
  updated_at  = now();

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
    (select o.id from public.offices o join public.campuses c on c.id = o.campus_id where c.code = 'AND' and o.code = 'HRMO'),
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
    (select o.id from public.offices o join public.campuses c on c.id = o.campus_id where c.code = 'APR' and o.code = 'ACCTG'),
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
    (select o.id from public.offices o join public.campuses c on c.id = o.campus_id where c.code = 'CAR' and o.code = 'HRMO'),
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

