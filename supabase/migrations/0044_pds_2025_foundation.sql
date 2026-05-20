begin;

do $$ begin
  create type public.pds_profile_status as enum (
    'not_started',
    'draft',
    'incomplete',
    'ready_for_review',
    'under_hr_review',
    'returned_for_correction',
    'verified',
    'generated'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pds_section_key as enum (
    'overview',
    'personal_information',
    'family_background',
    'educational_background',
    'civil_service_eligibility',
    'work_experience',
    'voluntary_work',
    'learning_development',
    'other_information',
    'references',
    'declaration',
    'review_generate'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pds_issue_severity as enum ('info', 'warning', 'error', 'critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pds_export_file_type as enum ('xlsx', 'pdf');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pds_export_status as enum ('queued', 'generated', 'failed', 'deleted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pds_verification_status as enum ('pending', 'accepted', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.employee_pds_profiles (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  current_version_id uuid null,
  status public.pds_profile_status not null default 'not_started',
  completion_score numeric(5,2) not null default 0 check (completion_score >= 0 and completion_score <= 100),
  validation_summary jsonb not null default '{}'::jsonb,
  submitted_at timestamptz null,
  submitted_by_user_id uuid null references public.app_users(id),
  reviewed_at timestamptz null,
  reviewed_by_user_id uuid null references public.app_users(id),
  verified_at timestamptz null,
  verified_by_user_id uuid null references public.app_users(id),
  returned_at timestamptz null,
  returned_by_user_id uuid null references public.app_users(id),
  return_reason text null,
  created_by_user_id uuid null references public.app_users(id),
  updated_by_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  unique (employee_id),
  constraint employee_pds_profiles_review_fields_chk check (
    (status <> 'returned_for_correction' and return_reason is null)
    or (status = 'returned_for_correction' and return_reason is not null)
  )
);

create index if not exists idx_employee_pds_profiles_scope_status
  on public.employee_pds_profiles(campus_id, office_id, status)
  where deleted_at is null;
create index if not exists idx_employee_pds_profiles_employee
  on public.employee_pds_profiles(employee_id)
  where deleted_at is null;
create index if not exists idx_employee_pds_profiles_updated
  on public.employee_pds_profiles(updated_at desc)
  where deleted_at is null;

drop trigger if exists trg_employee_pds_profiles_updated_at on public.employee_pds_profiles;
create trigger trg_employee_pds_profiles_updated_at
before update on public.employee_pds_profiles
for each row execute function public.set_updated_at();

create table if not exists public.employee_personal_information (
  id uuid primary key default gen_random_uuid(),
  pds_profile_id uuid not null unique references public.employee_pds_profiles(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  surname text null,
  first_name text null,
  middle_name text null,
  name_extension text null,
  birth_date date null,
  birth_place text null,
  sex_at_birth text null,
  civil_status text null,
  height_m numeric(4,2) null check (height_m is null or height_m > 0),
  weight_kg numeric(5,2) null check (weight_kg is null or weight_kg > 0),
  blood_type text null,
  gsis_no text null,
  pagibig_no text null,
  philhealth_no text null,
  sss_no text null,
  tin text null,
  philsys_no text null,
  agency_employee_no text null,
  citizenship text null,
  dual_citizenship_type text null,
  dual_citizenship_country text null,
  residential_address jsonb not null default '{}'::jsonb,
  permanent_address jsonb not null default '{}'::jsonb,
  telephone_no text null,
  mobile_no text null,
  email text null,
  created_by_user_id uuid null references public.app_users(id),
  updated_by_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists idx_employee_personal_information_employee
  on public.employee_personal_information(employee_id)
  where deleted_at is null;

drop trigger if exists trg_employee_personal_information_updated_at on public.employee_personal_information;
create trigger trg_employee_personal_information_updated_at
before update on public.employee_personal_information
for each row execute function public.set_updated_at();

create table if not exists public.employee_family_background (
  id uuid primary key default gen_random_uuid(),
  pds_profile_id uuid not null unique references public.employee_pds_profiles(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  spouse_surname text null,
  spouse_first_name text null,
  spouse_middle_name text null,
  spouse_name_extension text null,
  spouse_occupation text null,
  spouse_employer_business_name text null,
  spouse_business_address text null,
  spouse_telephone_no text null,
  father_surname text null,
  father_first_name text null,
  father_middle_name text null,
  father_name_extension text null,
  mother_maiden_surname text null,
  mother_first_name text null,
  mother_middle_name text null,
  created_by_user_id uuid null references public.app_users(id),
  updated_by_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

drop trigger if exists trg_employee_family_background_updated_at on public.employee_family_background;
create trigger trg_employee_family_background_updated_at
before update on public.employee_family_background
for each row execute function public.set_updated_at();

create table if not exists public.employee_children (
  id uuid primary key default gen_random_uuid(),
  pds_profile_id uuid not null references public.employee_pds_profiles(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  full_name text not null,
  birth_date date null,
  sort_order integer not null default 0,
  created_by_user_id uuid null references public.app_users(id),
  updated_by_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists idx_employee_children_profile_order
  on public.employee_children(pds_profile_id, sort_order)
  where deleted_at is null;

drop trigger if exists trg_employee_children_updated_at on public.employee_children;
create trigger trg_employee_children_updated_at
before update on public.employee_children
for each row execute function public.set_updated_at();

create table if not exists public.employee_education (
  id uuid primary key default gen_random_uuid(),
  pds_profile_id uuid not null references public.employee_pds_profiles(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  level text not null,
  school_name text null,
  degree_course text null,
  period_from_year integer null check (period_from_year is null or period_from_year between 1900 and 2200),
  period_to_year integer null check (period_to_year is null or period_to_year between 1900 and 2200),
  highest_level_units text null,
  year_graduated integer null check (year_graduated is null or year_graduated between 1900 and 2200),
  scholarship_honors text null,
  sort_order integer not null default 0,
  created_by_user_id uuid null references public.app_users(id),
  updated_by_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint employee_education_period_chk check (
    period_from_year is null or period_to_year is null or period_from_year <= period_to_year
  )
);

create index if not exists idx_employee_education_profile_order
  on public.employee_education(pds_profile_id, sort_order)
  where deleted_at is null;

drop trigger if exists trg_employee_education_updated_at on public.employee_education;
create trigger trg_employee_education_updated_at
before update on public.employee_education
for each row execute function public.set_updated_at();

create table if not exists public.employee_eligibilities (
  id uuid primary key default gen_random_uuid(),
  pds_profile_id uuid not null references public.employee_pds_profiles(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  eligibility_name text not null,
  rating text null,
  examination_date date null,
  examination_place text null,
  license_number text null,
  license_valid_until date null,
  sort_order integer not null default 0,
  created_by_user_id uuid null references public.app_users(id),
  updated_by_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists idx_employee_eligibilities_profile_order
  on public.employee_eligibilities(pds_profile_id, sort_order)
  where deleted_at is null;

drop trigger if exists trg_employee_eligibilities_updated_at on public.employee_eligibilities;
create trigger trg_employee_eligibilities_updated_at
before update on public.employee_eligibilities
for each row execute function public.set_updated_at();

create table if not exists public.employee_work_experiences (
  id uuid primary key default gen_random_uuid(),
  pds_profile_id uuid not null references public.employee_pds_profiles(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  date_from date null,
  date_to date null,
  is_current boolean not null default false,
  position_title text not null,
  department_agency_office_company text null,
  monthly_salary numeric(12,2) null check (monthly_salary is null or monthly_salary >= 0),
  salary_grade_step text null,
  appointment_status text null,
  is_government_service boolean null,
  sort_order integer not null default 0,
  created_by_user_id uuid null references public.app_users(id),
  updated_by_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint employee_work_experiences_period_chk check (
    date_from is null or date_to is null or date_from <= date_to
  )
);

create index if not exists idx_employee_work_experiences_employee_dates
  on public.employee_work_experiences(employee_id, date_from desc)
  where deleted_at is null;
create index if not exists idx_employee_work_experiences_profile_order
  on public.employee_work_experiences(pds_profile_id, sort_order)
  where deleted_at is null;

drop trigger if exists trg_employee_work_experiences_updated_at on public.employee_work_experiences;
create trigger trg_employee_work_experiences_updated_at
before update on public.employee_work_experiences
for each row execute function public.set_updated_at();

create table if not exists public.employee_voluntary_work (
  id uuid primary key default gen_random_uuid(),
  pds_profile_id uuid not null references public.employee_pds_profiles(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  organization_name text not null,
  organization_address text null,
  date_from date null,
  date_to date null,
  hours_count numeric(8,2) null check (hours_count is null or hours_count >= 0),
  position_nature_of_work text null,
  sort_order integer not null default 0,
  created_by_user_id uuid null references public.app_users(id),
  updated_by_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint employee_voluntary_work_period_chk check (
    date_from is null or date_to is null or date_from <= date_to
  )
);

create index if not exists idx_employee_voluntary_work_profile_order
  on public.employee_voluntary_work(pds_profile_id, sort_order)
  where deleted_at is null;

drop trigger if exists trg_employee_voluntary_work_updated_at on public.employee_voluntary_work;
create trigger trg_employee_voluntary_work_updated_at
before update on public.employee_voluntary_work
for each row execute function public.set_updated_at();

create table if not exists public.employee_learning_development (
  id uuid primary key default gen_random_uuid(),
  pds_profile_id uuid not null references public.employee_pds_profiles(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  title text not null,
  date_from date null,
  date_to date null,
  hours_count numeric(8,2) null check (hours_count is null or hours_count >= 0),
  learning_type text null,
  conducted_by text null,
  linked_learning_session_id uuid null,
  sort_order integer not null default 0,
  created_by_user_id uuid null references public.app_users(id),
  updated_by_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint employee_learning_development_period_chk check (
    date_from is null or date_to is null or date_from <= date_to
  )
);

create index if not exists idx_employee_learning_development_profile_order
  on public.employee_learning_development(pds_profile_id, sort_order)
  where deleted_at is null;

drop trigger if exists trg_employee_learning_development_updated_at on public.employee_learning_development;
create trigger trg_employee_learning_development_updated_at
before update on public.employee_learning_development
for each row execute function public.set_updated_at();

create table if not exists public.employee_other_skills (
  id uuid primary key default gen_random_uuid(),
  pds_profile_id uuid not null references public.employee_pds_profiles(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  skill_name text not null,
  sort_order integer not null default 0,
  created_by_user_id uuid null references public.app_users(id),
  updated_by_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table if not exists public.employee_recognitions (
  id uuid primary key default gen_random_uuid(),
  pds_profile_id uuid not null references public.employee_pds_profiles(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  recognition_title text not null,
  sort_order integer not null default 0,
  created_by_user_id uuid null references public.app_users(id),
  updated_by_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table if not exists public.employee_memberships (
  id uuid primary key default gen_random_uuid(),
  pds_profile_id uuid not null references public.employee_pds_profiles(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  organization_name text not null,
  sort_order integer not null default 0,
  created_by_user_id uuid null references public.app_users(id),
  updated_by_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists idx_employee_other_skills_profile_order
  on public.employee_other_skills(pds_profile_id, sort_order)
  where deleted_at is null;
create index if not exists idx_employee_recognitions_profile_order
  on public.employee_recognitions(pds_profile_id, sort_order)
  where deleted_at is null;
create index if not exists idx_employee_memberships_profile_order
  on public.employee_memberships(pds_profile_id, sort_order)
  where deleted_at is null;

drop trigger if exists trg_employee_other_skills_updated_at on public.employee_other_skills;
create trigger trg_employee_other_skills_updated_at
before update on public.employee_other_skills
for each row execute function public.set_updated_at();
drop trigger if exists trg_employee_recognitions_updated_at on public.employee_recognitions;
create trigger trg_employee_recognitions_updated_at
before update on public.employee_recognitions
for each row execute function public.set_updated_at();
drop trigger if exists trg_employee_memberships_updated_at on public.employee_memberships;
create trigger trg_employee_memberships_updated_at
before update on public.employee_memberships
for each row execute function public.set_updated_at();

create table if not exists public.employee_references (
  id uuid primary key default gen_random_uuid(),
  pds_profile_id uuid not null references public.employee_pds_profiles(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  full_name text not null,
  address text null,
  telephone_no text null,
  email text null,
  sort_order integer not null default 0,
  created_by_user_id uuid null references public.app_users(id),
  updated_by_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists idx_employee_references_profile_order
  on public.employee_references(pds_profile_id, sort_order)
  where deleted_at is null;

drop trigger if exists trg_employee_references_updated_at on public.employee_references;
create trigger trg_employee_references_updated_at
before update on public.employee_references
for each row execute function public.set_updated_at();

create table if not exists public.employee_government_ids (
  id uuid primary key default gen_random_uuid(),
  pds_profile_id uuid not null references public.employee_pds_profiles(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  id_type text not null,
  id_number text not null,
  issued_at date null,
  issued_place text null,
  issuing_agency text null,
  document_asset_id uuid null references public.document_assets(id),
  is_primary boolean not null default false,
  created_by_user_id uuid null references public.app_users(id),
  updated_by_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists idx_employee_government_ids_profile
  on public.employee_government_ids(pds_profile_id)
  where deleted_at is null;
create unique index if not exists uq_employee_government_ids_primary
  on public.employee_government_ids(pds_profile_id)
  where is_primary = true and deleted_at is null;

drop trigger if exists trg_employee_government_ids_updated_at on public.employee_government_ids;
create trigger trg_employee_government_ids_updated_at
before update on public.employee_government_ids
for each row execute function public.set_updated_at();

create table if not exists public.employee_pds_declarations (
  id uuid primary key default gen_random_uuid(),
  pds_profile_id uuid not null unique references public.employee_pds_profiles(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  answers jsonb not null default '{}'::jsonb,
  explanations jsonb not null default '{}'::jsonb,
  government_id_id uuid null references public.employee_government_ids(id),
  signature_document_asset_id uuid null references public.document_assets(id),
  photo_document_asset_id uuid null references public.document_assets(id),
  declaration_date date null,
  administering_officer text null,
  created_by_user_id uuid null references public.app_users(id),
  updated_by_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

drop trigger if exists trg_employee_pds_declarations_updated_at on public.employee_pds_declarations;
create trigger trg_employee_pds_declarations_updated_at
before update on public.employee_pds_declarations
for each row execute function public.set_updated_at();

create table if not exists public.employee_pds_versions (
  id uuid primary key default gen_random_uuid(),
  pds_profile_id uuid not null references public.employee_pds_profiles(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  version_no integer not null check (version_no >= 1),
  status public.pds_profile_status not null,
  snapshot_hash text null,
  snapshot_metadata jsonb not null default '{}'::jsonb,
  locked_at timestamptz null,
  locked_by_user_id uuid null references public.app_users(id),
  created_by_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now(),
  unique (pds_profile_id, version_no)
);

create index if not exists idx_employee_pds_versions_profile_version
  on public.employee_pds_versions(pds_profile_id, version_no desc);

alter table public.employee_pds_profiles
  drop constraint if exists employee_pds_profiles_current_version_fk;
alter table public.employee_pds_profiles
  add constraint employee_pds_profiles_current_version_fk
  foreign key (current_version_id) references public.employee_pds_versions(id);

create table if not exists public.employee_pds_change_logs (
  id bigserial primary key,
  pds_profile_id uuid not null references public.employee_pds_profiles(id) on delete cascade,
  pds_version_id uuid null references public.employee_pds_versions(id) on delete set null,
  employee_id uuid not null references public.employees(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  section_key public.pds_section_key not null,
  table_name text not null,
  record_id text null,
  field_name text null,
  old_value jsonb null,
  new_value jsonb null,
  action text not null,
  reason text null,
  actor_user_id uuid null references public.app_users(id),
  occurred_at timestamptz not null default now()
);

create index if not exists idx_employee_pds_change_logs_profile_occurred
  on public.employee_pds_change_logs(pds_profile_id, occurred_at desc);
create index if not exists idx_employee_pds_change_logs_employee_occurred
  on public.employee_pds_change_logs(employee_id, occurred_at desc);

create table if not exists public.employee_pds_attachments (
  id uuid primary key default gen_random_uuid(),
  pds_profile_id uuid not null references public.employee_pds_profiles(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  section_key public.pds_section_key not null,
  requirement_key text null,
  document_asset_id uuid not null references public.document_assets(id),
  verification_status public.pds_verification_status not null default 'pending',
  verified_by_user_id uuid null references public.app_users(id),
  verified_at timestamptz null,
  created_by_user_id uuid null references public.app_users(id),
  updated_by_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  unique (pds_profile_id, document_asset_id)
);

create index if not exists idx_employee_pds_attachments_profile_section
  on public.employee_pds_attachments(pds_profile_id, section_key)
  where deleted_at is null;

drop trigger if exists trg_employee_pds_attachments_updated_at on public.employee_pds_attachments;
create trigger trg_employee_pds_attachments_updated_at
before update on public.employee_pds_attachments
for each row execute function public.set_updated_at();

create table if not exists public.generated_pds_exports (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  pds_profile_id uuid not null references public.employee_pds_profiles(id) on delete cascade,
  pds_version_id uuid null references public.employee_pds_versions(id) on delete set null,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  file_type public.pds_export_file_type not null,
  status public.pds_export_status not null default 'queued',
  document_asset_id uuid null references public.document_assets(id),
  storage_bucket text null,
  storage_path text null,
  template_version text null,
  template_hash text null,
  warnings jsonb not null default '[]'::jsonb,
  generated_by_user_id uuid null references public.app_users(id),
  generated_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint generated_pds_exports_storage_chk check (
    (document_asset_id is not null) or (storage_bucket is not null and storage_path is not null) or status in ('queued', 'failed')
  )
);

create index if not exists idx_generated_pds_exports_profile_created
  on public.generated_pds_exports(pds_profile_id, created_at desc)
  where deleted_at is null;
create index if not exists idx_generated_pds_exports_employee_created
  on public.generated_pds_exports(employee_id, created_at desc)
  where deleted_at is null;

drop trigger if exists trg_generated_pds_exports_updated_at on public.generated_pds_exports;
create trigger trg_generated_pds_exports_updated_at
before update on public.generated_pds_exports
for each row execute function public.set_updated_at();

create or replace function public.authz_employee_pds_self_access(p_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users au
    where au.id = public.current_app_user_id()
      and au.employee_id = p_employee_id
      and au.is_active = true
      and au.deleted_at is null
  );
$$;

create or replace function public.authz_employee_pds_profile_select(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employee_pds_profiles p
    where p.id = p_profile_id
      and p.deleted_at is null
      and (
        public.authz_employee_pds_self_access(p.employee_id)
        or public.authz_scoped_campus_office_access(p.campus_id, p.office_id)
      )
  );
$$;

create or replace function public.authz_employee_pds_profile_write(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employee_pds_profiles p
    where p.id = p_profile_id
      and p.deleted_at is null
      and (
        public.authz_campus_hr_office_write(p.campus_id, p.office_id)
        or (
          public.authz_employee_pds_self_access(p.employee_id)
          and p.status in ('not_started', 'draft', 'incomplete', 'returned_for_correction')
        )
      )
  );
$$;

grant execute on function public.authz_employee_pds_self_access(uuid) to authenticated;
grant execute on function public.authz_employee_pds_profile_select(uuid) to authenticated;
grant execute on function public.authz_employee_pds_profile_write(uuid) to authenticated;

alter table public.employee_pds_profiles enable row level security;
alter table public.employee_personal_information enable row level security;
alter table public.employee_family_background enable row level security;
alter table public.employee_children enable row level security;
alter table public.employee_education enable row level security;
alter table public.employee_eligibilities enable row level security;
alter table public.employee_work_experiences enable row level security;
alter table public.employee_voluntary_work enable row level security;
alter table public.employee_learning_development enable row level security;
alter table public.employee_other_skills enable row level security;
alter table public.employee_recognitions enable row level security;
alter table public.employee_memberships enable row level security;
alter table public.employee_references enable row level security;
alter table public.employee_government_ids enable row level security;
alter table public.employee_pds_declarations enable row level security;
alter table public.employee_pds_versions enable row level security;
alter table public.employee_pds_change_logs enable row level security;
alter table public.employee_pds_attachments enable row level security;
alter table public.generated_pds_exports enable row level security;

drop policy if exists employee_pds_profiles_scoped_select on public.employee_pds_profiles;
create policy employee_pds_profiles_scoped_select on public.employee_pds_profiles
for select to authenticated
using (
  deleted_at is null
  and (
    public.authz_employee_pds_self_access(employee_id)
    or public.authz_scoped_campus_office_access(campus_id, office_id)
  )
);

drop policy if exists employee_pds_profiles_scoped_insert on public.employee_pds_profiles;
create policy employee_pds_profiles_scoped_insert on public.employee_pds_profiles
for insert to authenticated
with check (
  public.authz_employee_pds_self_access(employee_id)
  or public.authz_campus_hr_office_write(campus_id, office_id)
);

drop policy if exists employee_pds_profiles_scoped_update on public.employee_pds_profiles;
create policy employee_pds_profiles_scoped_update on public.employee_pds_profiles
for update to authenticated
using (
  public.authz_campus_hr_office_write(campus_id, office_id)
  or (
    public.authz_employee_pds_self_access(employee_id)
    and status in ('not_started', 'draft', 'incomplete', 'returned_for_correction')
  )
)
with check (
  public.authz_campus_hr_office_write(campus_id, office_id)
  or (
    public.authz_employee_pds_self_access(employee_id)
    and status in ('not_started', 'draft', 'incomplete', 'ready_for_review')
  )
);

drop policy if exists employee_pds_profiles_scoped_delete on public.employee_pds_profiles;
create policy employee_pds_profiles_scoped_delete on public.employee_pds_profiles
for delete to authenticated
using (public.authz_campus_hr_office_write(campus_id, office_id));

drop policy if exists employee_personal_information_scoped_select on public.employee_personal_information;
create policy employee_personal_information_scoped_select on public.employee_personal_information
for select to authenticated using (deleted_at is null and public.authz_employee_pds_profile_select(pds_profile_id));
drop policy if exists employee_personal_information_scoped_write on public.employee_personal_information;
create policy employee_personal_information_scoped_write on public.employee_personal_information
for all to authenticated using (public.authz_employee_pds_profile_write(pds_profile_id))
with check (public.authz_employee_pds_profile_write(pds_profile_id));

drop policy if exists employee_family_background_scoped_select on public.employee_family_background;
create policy employee_family_background_scoped_select on public.employee_family_background
for select to authenticated using (deleted_at is null and public.authz_employee_pds_profile_select(pds_profile_id));
drop policy if exists employee_family_background_scoped_write on public.employee_family_background;
create policy employee_family_background_scoped_write on public.employee_family_background
for all to authenticated using (public.authz_employee_pds_profile_write(pds_profile_id))
with check (public.authz_employee_pds_profile_write(pds_profile_id));

drop policy if exists employee_children_scoped_select on public.employee_children;
create policy employee_children_scoped_select on public.employee_children
for select to authenticated using (deleted_at is null and public.authz_employee_pds_profile_select(pds_profile_id));
drop policy if exists employee_children_scoped_write on public.employee_children;
create policy employee_children_scoped_write on public.employee_children
for all to authenticated using (public.authz_employee_pds_profile_write(pds_profile_id))
with check (public.authz_employee_pds_profile_write(pds_profile_id));

drop policy if exists employee_education_scoped_select on public.employee_education;
create policy employee_education_scoped_select on public.employee_education
for select to authenticated using (deleted_at is null and public.authz_employee_pds_profile_select(pds_profile_id));
drop policy if exists employee_education_scoped_write on public.employee_education;
create policy employee_education_scoped_write on public.employee_education
for all to authenticated using (public.authz_employee_pds_profile_write(pds_profile_id))
with check (public.authz_employee_pds_profile_write(pds_profile_id));

drop policy if exists employee_eligibilities_scoped_select on public.employee_eligibilities;
create policy employee_eligibilities_scoped_select on public.employee_eligibilities
for select to authenticated using (deleted_at is null and public.authz_employee_pds_profile_select(pds_profile_id));
drop policy if exists employee_eligibilities_scoped_write on public.employee_eligibilities;
create policy employee_eligibilities_scoped_write on public.employee_eligibilities
for all to authenticated using (public.authz_employee_pds_profile_write(pds_profile_id))
with check (public.authz_employee_pds_profile_write(pds_profile_id));

drop policy if exists employee_work_experiences_scoped_select on public.employee_work_experiences;
create policy employee_work_experiences_scoped_select on public.employee_work_experiences
for select to authenticated using (deleted_at is null and public.authz_employee_pds_profile_select(pds_profile_id));
drop policy if exists employee_work_experiences_scoped_write on public.employee_work_experiences;
create policy employee_work_experiences_scoped_write on public.employee_work_experiences
for all to authenticated using (public.authz_employee_pds_profile_write(pds_profile_id))
with check (public.authz_employee_pds_profile_write(pds_profile_id));

drop policy if exists employee_voluntary_work_scoped_select on public.employee_voluntary_work;
create policy employee_voluntary_work_scoped_select on public.employee_voluntary_work
for select to authenticated using (deleted_at is null and public.authz_employee_pds_profile_select(pds_profile_id));
drop policy if exists employee_voluntary_work_scoped_write on public.employee_voluntary_work;
create policy employee_voluntary_work_scoped_write on public.employee_voluntary_work
for all to authenticated using (public.authz_employee_pds_profile_write(pds_profile_id))
with check (public.authz_employee_pds_profile_write(pds_profile_id));

drop policy if exists employee_learning_development_scoped_select on public.employee_learning_development;
create policy employee_learning_development_scoped_select on public.employee_learning_development
for select to authenticated using (deleted_at is null and public.authz_employee_pds_profile_select(pds_profile_id));
drop policy if exists employee_learning_development_scoped_write on public.employee_learning_development;
create policy employee_learning_development_scoped_write on public.employee_learning_development
for all to authenticated using (public.authz_employee_pds_profile_write(pds_profile_id))
with check (public.authz_employee_pds_profile_write(pds_profile_id));

drop policy if exists employee_other_skills_scoped_select on public.employee_other_skills;
create policy employee_other_skills_scoped_select on public.employee_other_skills
for select to authenticated using (deleted_at is null and public.authz_employee_pds_profile_select(pds_profile_id));
drop policy if exists employee_other_skills_scoped_write on public.employee_other_skills;
create policy employee_other_skills_scoped_write on public.employee_other_skills
for all to authenticated using (public.authz_employee_pds_profile_write(pds_profile_id))
with check (public.authz_employee_pds_profile_write(pds_profile_id));

drop policy if exists employee_recognitions_scoped_select on public.employee_recognitions;
create policy employee_recognitions_scoped_select on public.employee_recognitions
for select to authenticated using (deleted_at is null and public.authz_employee_pds_profile_select(pds_profile_id));
drop policy if exists employee_recognitions_scoped_write on public.employee_recognitions;
create policy employee_recognitions_scoped_write on public.employee_recognitions
for all to authenticated using (public.authz_employee_pds_profile_write(pds_profile_id))
with check (public.authz_employee_pds_profile_write(pds_profile_id));

drop policy if exists employee_memberships_scoped_select on public.employee_memberships;
create policy employee_memberships_scoped_select on public.employee_memberships
for select to authenticated using (deleted_at is null and public.authz_employee_pds_profile_select(pds_profile_id));
drop policy if exists employee_memberships_scoped_write on public.employee_memberships;
create policy employee_memberships_scoped_write on public.employee_memberships
for all to authenticated using (public.authz_employee_pds_profile_write(pds_profile_id))
with check (public.authz_employee_pds_profile_write(pds_profile_id));

drop policy if exists employee_references_scoped_select on public.employee_references;
create policy employee_references_scoped_select on public.employee_references
for select to authenticated using (deleted_at is null and public.authz_employee_pds_profile_select(pds_profile_id));
drop policy if exists employee_references_scoped_write on public.employee_references;
create policy employee_references_scoped_write on public.employee_references
for all to authenticated using (public.authz_employee_pds_profile_write(pds_profile_id))
with check (public.authz_employee_pds_profile_write(pds_profile_id));

drop policy if exists employee_government_ids_scoped_select on public.employee_government_ids;
create policy employee_government_ids_scoped_select on public.employee_government_ids
for select to authenticated using (deleted_at is null and public.authz_employee_pds_profile_select(pds_profile_id));
drop policy if exists employee_government_ids_scoped_write on public.employee_government_ids;
create policy employee_government_ids_scoped_write on public.employee_government_ids
for all to authenticated using (public.authz_employee_pds_profile_write(pds_profile_id))
with check (public.authz_employee_pds_profile_write(pds_profile_id));

drop policy if exists employee_pds_declarations_scoped_select on public.employee_pds_declarations;
create policy employee_pds_declarations_scoped_select on public.employee_pds_declarations
for select to authenticated using (deleted_at is null and public.authz_employee_pds_profile_select(pds_profile_id));
drop policy if exists employee_pds_declarations_scoped_write on public.employee_pds_declarations;
create policy employee_pds_declarations_scoped_write on public.employee_pds_declarations
for all to authenticated using (public.authz_employee_pds_profile_write(pds_profile_id))
with check (public.authz_employee_pds_profile_write(pds_profile_id));

drop policy if exists employee_pds_versions_scoped_select on public.employee_pds_versions;
create policy employee_pds_versions_scoped_select on public.employee_pds_versions
for select to authenticated using (public.authz_employee_pds_profile_select(pds_profile_id));
drop policy if exists employee_pds_versions_scoped_insert on public.employee_pds_versions;
create policy employee_pds_versions_scoped_insert on public.employee_pds_versions
for insert to authenticated with check (public.authz_employee_pds_profile_write(pds_profile_id));

drop policy if exists employee_pds_change_logs_scoped_select on public.employee_pds_change_logs;
create policy employee_pds_change_logs_scoped_select on public.employee_pds_change_logs
for select to authenticated using (public.authz_employee_pds_profile_select(pds_profile_id));
drop policy if exists employee_pds_change_logs_scoped_insert on public.employee_pds_change_logs;
create policy employee_pds_change_logs_scoped_insert on public.employee_pds_change_logs
for insert to authenticated with check (public.authz_employee_pds_profile_write(pds_profile_id));

drop policy if exists employee_pds_attachments_scoped_select on public.employee_pds_attachments;
create policy employee_pds_attachments_scoped_select on public.employee_pds_attachments
for select to authenticated using (deleted_at is null and public.authz_employee_pds_profile_select(pds_profile_id));
drop policy if exists employee_pds_attachments_scoped_write on public.employee_pds_attachments;
create policy employee_pds_attachments_scoped_write on public.employee_pds_attachments
for all to authenticated using (public.authz_employee_pds_profile_write(pds_profile_id))
with check (public.authz_employee_pds_profile_write(pds_profile_id));

drop policy if exists generated_pds_exports_scoped_select on public.generated_pds_exports;
create policy generated_pds_exports_scoped_select on public.generated_pds_exports
for select to authenticated using (deleted_at is null and public.authz_employee_pds_profile_select(pds_profile_id));
drop policy if exists generated_pds_exports_scoped_write on public.generated_pds_exports;
create policy generated_pds_exports_scoped_write on public.generated_pds_exports
for all to authenticated using (public.authz_campus_hr_office_write(campus_id, office_id))
with check (public.authz_campus_hr_office_write(campus_id, office_id));

commit;