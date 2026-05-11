begin;

do $$ begin
  create type public.applicant_status as enum ('new', 'screening', 'shortlisted', 'hired', 'rejected', 'withdrawn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.application_status as enum ('submitted', 'screening', 'interview', 'for_offer', 'hired', 'rejected', 'withdrawn');
exception when duplicate_object then null; end $$;

create table if not exists public.recruitment_applicants (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  middle_name text null,
  last_name text not null,
  suffix text null,
  email text null,
  mobile_no text null,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  status public.applicant_status not null default 'new',
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists idx_recruitment_applicants_campus_id on public.recruitment_applicants(campus_id);
create index if not exists idx_recruitment_applicants_office_id on public.recruitment_applicants(office_id);
create index if not exists idx_recruitment_applicants_status on public.recruitment_applicants(status);
create index if not exists idx_recruitment_applicants_updated_at on public.recruitment_applicants(updated_at desc);

drop trigger if exists trg_recruitment_applicants_updated_at on public.recruitment_applicants;
create trigger trg_recruitment_applicants_updated_at
before update on public.recruitment_applicants
for each row execute function public.set_updated_at();

create table if not exists public.recruitment_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.recruitment_applicants(id),
  vacancy_id uuid not null references public.recruitment_vacancies(id),
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  status public.application_status not null default 'submitted',
  applied_at date null,
  remarks text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists idx_recruitment_applications_applicant_id on public.recruitment_applications(applicant_id);
create index if not exists idx_recruitment_applications_vacancy_id on public.recruitment_applications(vacancy_id);
create index if not exists idx_recruitment_applications_campus_id on public.recruitment_applications(campus_id);
create index if not exists idx_recruitment_applications_office_id on public.recruitment_applications(office_id);
create index if not exists idx_recruitment_applications_status on public.recruitment_applications(status);
create index if not exists idx_recruitment_applications_updated_at on public.recruitment_applications(updated_at desc);
create unique index if not exists idx_recruitment_applications_unique_active
on public.recruitment_applications(applicant_id, vacancy_id)
where deleted_at is null;

drop trigger if exists trg_recruitment_applications_updated_at on public.recruitment_applications;
create trigger trg_recruitment_applications_updated_at
before update on public.recruitment_applications
for each row execute function public.set_updated_at();

create or replace function public.validate_applicant_office_scope()
returns trigger
language plpgsql
as $$
declare
  office_campus_id uuid;
begin
  if new.office_id is null then
    return new;
  end if;

  select o.campus_id into office_campus_id
  from public.offices o
  where o.id = new.office_id;

  if office_campus_id is null then
    raise exception 'office_id does not reference a valid office';
  end if;

  if office_campus_id <> new.campus_id then
    raise exception 'applicant office_id campus must match applicant campus_id';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_recruitment_applicants_validate_office_scope on public.recruitment_applicants;
create trigger trg_recruitment_applicants_validate_office_scope
before insert or update on public.recruitment_applicants
for each row execute function public.validate_applicant_office_scope();

create or replace function public.sync_and_validate_application_scope()
returns trigger
language plpgsql
as $$
declare
  applicant_campus_id uuid;
  applicant_office_id uuid;
  vacancy_campus_id uuid;
  vacancy_office_id uuid;
begin
  select ra.campus_id, ra.office_id
  into applicant_campus_id, applicant_office_id
  from public.recruitment_applicants ra
  where ra.id = new.applicant_id
    and ra.deleted_at is null;

  if applicant_campus_id is null then
    raise exception 'applicant_id does not reference a valid applicant';
  end if;

  select rv.campus_id, rv.office_id
  into vacancy_campus_id, vacancy_office_id
  from public.recruitment_vacancies rv
  where rv.id = new.vacancy_id
    and rv.deleted_at is null;

  if vacancy_campus_id is null then
    raise exception 'vacancy_id does not reference a valid vacancy';
  end if;

  if applicant_campus_id <> vacancy_campus_id then
    raise exception 'application applicant campus must match vacancy campus';
  end if;

  if vacancy_office_id is not null and applicant_office_id is not null and vacancy_office_id <> applicant_office_id then
    raise exception 'application applicant office must match vacancy office when both are set';
  end if;

  new.campus_id := vacancy_campus_id;
  new.office_id := coalesce(vacancy_office_id, applicant_office_id, new.office_id);

  return new;
end;
$$;

drop trigger if exists trg_recruitment_applications_sync_scope on public.recruitment_applications;
create trigger trg_recruitment_applications_sync_scope
before insert or update on public.recruitment_applications
for each row execute function public.sync_and_validate_application_scope();

alter table public.recruitment_applicants enable row level security;
alter table public.recruitment_applications enable row level security;

drop policy if exists recruitment_applicants_scoped_select on public.recruitment_applicants;
create policy recruitment_applicants_scoped_select
on public.recruitment_applicants
for select
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
  or public.has_active_role('office_unit_head', campus_id)
);

drop policy if exists recruitment_applicants_scoped_insert on public.recruitment_applicants;
create policy recruitment_applicants_scoped_insert
on public.recruitment_applicants
for insert
to authenticated
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
);

drop policy if exists recruitment_applicants_scoped_update on public.recruitment_applicants;
create policy recruitment_applicants_scoped_update
on public.recruitment_applicants
for update
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
)
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
);

drop policy if exists recruitment_applications_scoped_select on public.recruitment_applications;
create policy recruitment_applications_scoped_select
on public.recruitment_applications
for select
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
  or public.has_active_role('office_unit_head', campus_id)
);

drop policy if exists recruitment_applications_scoped_insert on public.recruitment_applications;
create policy recruitment_applications_scoped_insert
on public.recruitment_applications
for insert
to authenticated
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
);

drop policy if exists recruitment_applications_scoped_update on public.recruitment_applications;
create policy recruitment_applications_scoped_update
on public.recruitment_applications
for update
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
)
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
);

commit;
