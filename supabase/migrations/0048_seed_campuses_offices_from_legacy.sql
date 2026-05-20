-- 0048_seed_campuses_offices_from_legacy.sql
-- Idempotent seed: 10 CSU campuses + 58 standard offices (one set per campus)
-- sourced from the legacy HRIS departments table (public/hris.sql).
-- Safe to re-run: uses ON CONFLICT DO UPDATE.

begin;

-- -------------------------------------------------------
-- 1. CAMPUSES  (10 CSU campuses)
-- -------------------------------------------------------
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
  set name       = excluded.name,
      short_name = excluded.short_name,
      sort_order = excluded.sort_order,
      is_active  = excluded.is_active,
      updated_at = now();

-- -------------------------------------------------------
-- 2. OFFICES  (58 standard offices × every campus)
-- Each campus receives the same base set of offices.
-- HR staff may deactivate offices that do not exist at
-- their campus.
-- -------------------------------------------------------
with office_templates (code, name, office_type, sort_order) as (
  values
    -- Administrative offices
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
    -- Academic offices / colleges
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
    -- Student services
    ('CLINIC',   'Clinic',                                                         'student_services', 510),
    ('CULTARTS', 'Culture and Arts',                                               'student_services', 520),
    ('GUIDANCE', 'Guidance Office',                                                'student_services', 530),
    ('LIB',      'Library',                                                        'student_services', 540),
    ('UNILIB',   'University Library',                                             'student_services', 550),
    ('OSSWD',    'OSSWD',                                                          'student_services', 560),
    ('SOCIOCUL', 'Socio Cultural',                                                 'student_services', 570),
    -- Other
    ('ODI',      'ODI',                                                            'other', 610),
    ('IMC',      'IMC',                                                            'other', 620),
    ('HOTEL',    'CSU Hotel',                                                      'other', 630),
    ('SPECPROJ', 'Special Project',                                                'other', 640),
    ('NPRIC',    'NPRIC',                                                          'other', 650),
    ('CALAB',    'CALAB',                                                          'other', 660),
    ('OTHERS',   'Others',                                                         'other', 999)
)
insert into public.offices (campus_id, code, name, office_type, sort_order, is_active)
select
  c.id,
  ot.code,
  ot.name,
  ot.office_type,
  ot.sort_order,
  true
from public.campuses c
cross join office_templates ot
where c.deleted_at is null
on conflict (campus_id, code) do update
  set name        = excluded.name,
      office_type = excluded.office_type,
      sort_order  = excluded.sort_order,
      is_active   = excluded.is_active,
      updated_at  = now();

commit;
