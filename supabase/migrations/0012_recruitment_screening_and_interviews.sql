begin;

do $$ begin
  create type public.screening_result as enum ('pass', 'fail', 'hold');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.interview_mode as enum ('in_person', 'online', 'phone');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.interview_outcome as enum ('pending', 'pass', 'fail', 'no_show');
exception when duplicate_object then null; end $$;

create table if not exists public.recruitment_screening_results (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.recruitment_applicants(id) on delete cascade,
  result public.screening_result not null,
  remarks text null,
  screened_at date not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_recruitment_screening_results_applicant on public.recruitment_screening_results(applicant_id);
create index if not exists idx_recruitment_screening_results_screened_at on public.recruitment_screening_results(screened_at desc);

create table if not exists public.recruitment_interviews (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.recruitment_applicants(id) on delete cascade,
  application_id uuid null references public.recruitment_applications(id) on delete set null,
  scheduled_at timestamptz not null,
  interview_mode public.interview_mode not null,
  panel_remarks text null,
  outcome public.interview_outcome not null default 'pending',
  decided_at date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_recruitment_interviews_applicant on public.recruitment_interviews(applicant_id);
create index if not exists idx_recruitment_interviews_application on public.recruitment_interviews(application_id);
create index if not exists idx_recruitment_interviews_scheduled_at on public.recruitment_interviews(scheduled_at desc);

drop trigger if exists trg_recruitment_interviews_updated_at on public.recruitment_interviews;
create trigger trg_recruitment_interviews_updated_at
before update on public.recruitment_interviews
for each row execute function public.set_updated_at();

create table if not exists public.recruitment_application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.recruitment_applications(id) on delete cascade,
  from_status public.application_status null,
  to_status public.application_status not null,
  remarks text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_recruitment_application_status_history_application on public.recruitment_application_status_history(application_id);
create index if not exists idx_recruitment_application_status_history_created_at on public.recruitment_application_status_history(created_at desc);

create or replace function public.validate_interview_applicant_application_match()
returns trigger
language plpgsql
as $$
declare
  linked_applicant_id uuid;
begin
  if new.application_id is null then
    return new;
  end if;

  select ra.applicant_id into linked_applicant_id
  from public.recruitment_applications ra
  where ra.id = new.application_id
    and ra.deleted_at is null;

  if linked_applicant_id is null then
    raise exception 'application_id does not reference a valid application';
  end if;

  if linked_applicant_id <> new.applicant_id then
    raise exception 'interview application must belong to the same applicant';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_recruitment_interviews_validate_application on public.recruitment_interviews;
create trigger trg_recruitment_interviews_validate_application
before insert or update on public.recruitment_interviews
for each row execute function public.validate_interview_applicant_application_match();

alter table public.recruitment_screening_results enable row level security;
alter table public.recruitment_interviews enable row level security;
alter table public.recruitment_application_status_history enable row level security;

drop policy if exists recruitment_screening_results_scoped_select on public.recruitment_screening_results;
create policy recruitment_screening_results_scoped_select
on public.recruitment_screening_results
for select
to authenticated
using (
  exists (
    select 1
    from public.recruitment_applicants a
    where a.id = applicant_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', a.campus_id)
        or public.has_active_role('office_unit_head', a.campus_id)
      )
  )
);

drop policy if exists recruitment_screening_results_scoped_write on public.recruitment_screening_results;
create policy recruitment_screening_results_scoped_write
on public.recruitment_screening_results
for all
to authenticated
using (
  exists (
    select 1
    from public.recruitment_applicants a
    where a.id = applicant_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', a.campus_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.recruitment_applicants a
    where a.id = applicant_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', a.campus_id)
      )
  )
);

drop policy if exists recruitment_interviews_scoped_select on public.recruitment_interviews;
create policy recruitment_interviews_scoped_select
on public.recruitment_interviews
for select
to authenticated
using (
  exists (
    select 1
    from public.recruitment_applicants a
    where a.id = applicant_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', a.campus_id)
        or public.has_active_role('office_unit_head', a.campus_id)
      )
  )
);

drop policy if exists recruitment_interviews_scoped_write on public.recruitment_interviews;
create policy recruitment_interviews_scoped_write
on public.recruitment_interviews
for all
to authenticated
using (
  exists (
    select 1
    from public.recruitment_applicants a
    where a.id = applicant_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', a.campus_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.recruitment_applicants a
    where a.id = applicant_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', a.campus_id)
      )
  )
);

drop policy if exists recruitment_application_status_history_scoped_select on public.recruitment_application_status_history;
create policy recruitment_application_status_history_scoped_select
on public.recruitment_application_status_history
for select
to authenticated
using (
  exists (
    select 1
    from public.recruitment_applications ra
    where ra.id = application_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', ra.campus_id)
        or public.has_active_role('office_unit_head', ra.campus_id)
      )
  )
);

drop policy if exists recruitment_application_status_history_scoped_insert on public.recruitment_application_status_history;
create policy recruitment_application_status_history_scoped_insert
on public.recruitment_application_status_history
for insert
to authenticated
with check (
  exists (
    select 1
    from public.recruitment_applications ra
    where ra.id = application_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', ra.campus_id)
      )
  )
);

commit;
