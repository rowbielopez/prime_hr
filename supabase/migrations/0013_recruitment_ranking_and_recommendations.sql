begin;

do $$ begin
  create type public.recommendation_status as enum ('draft', 'for_review', 'endorsed', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.recruitment_ranking_entries (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.recruitment_vacancies(id) on delete cascade,
  applicant_id uuid not null references public.recruitment_applicants(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  rank_no integer not null check (rank_no > 0),
  score numeric(5,2) null check (score is null or (score >= 0 and score <= 100)),
  remarks text null,
  recommendation_status public.recommendation_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  unique(vacancy_id, applicant_id),
  unique(vacancy_id, rank_no)
);

create index if not exists idx_recruitment_ranking_entries_vacancy on public.recruitment_ranking_entries(vacancy_id);
create index if not exists idx_recruitment_ranking_entries_status on public.recruitment_ranking_entries(recommendation_status);
create index if not exists idx_recruitment_ranking_entries_campus on public.recruitment_ranking_entries(campus_id);

create table if not exists public.recruitment_appointment_recommendations (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.recruitment_vacancies(id) on delete cascade,
  applicant_id uuid not null references public.recruitment_applicants(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  status public.recommendation_status not null default 'draft',
  remarks text null,
  justification text null,
  decided_at date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  unique(vacancy_id, applicant_id)
);

create index if not exists idx_recruitment_recommendations_vacancy on public.recruitment_appointment_recommendations(vacancy_id);
create index if not exists idx_recruitment_recommendations_status on public.recruitment_appointment_recommendations(status);
create index if not exists idx_recruitment_recommendations_campus on public.recruitment_appointment_recommendations(campus_id);

create or replace function public.sync_recruitment_rank_scope()
returns trigger
language plpgsql
as $$
declare
  vacancy_scope record;
begin
  select rv.campus_id, rv.office_id
  into vacancy_scope
  from public.recruitment_vacancies rv
  where rv.id = new.vacancy_id
    and rv.deleted_at is null;

  if vacancy_scope is null then
    raise exception 'vacancy_id does not reference an active vacancy';
  end if;

  new.campus_id := vacancy_scope.campus_id;
  new.office_id := vacancy_scope.office_id;
  return new;
end;
$$;

create or replace function public.sync_recruitment_recommendation_scope()
returns trigger
language plpgsql
as $$
declare
  vacancy_scope record;
begin
  select rv.campus_id, rv.office_id
  into vacancy_scope
  from public.recruitment_vacancies rv
  where rv.id = new.vacancy_id
    and rv.deleted_at is null;

  if vacancy_scope is null then
    raise exception 'vacancy_id does not reference an active vacancy';
  end if;

  new.campus_id := vacancy_scope.campus_id;
  new.office_id := vacancy_scope.office_id;
  return new;
end;
$$;

drop trigger if exists trg_recruitment_ranking_entries_sync_scope on public.recruitment_ranking_entries;
create trigger trg_recruitment_ranking_entries_sync_scope
before insert or update on public.recruitment_ranking_entries
for each row execute function public.sync_recruitment_rank_scope();

drop trigger if exists trg_recruitment_recommendations_sync_scope on public.recruitment_appointment_recommendations;
create trigger trg_recruitment_recommendations_sync_scope
before insert or update on public.recruitment_appointment_recommendations
for each row execute function public.sync_recruitment_recommendation_scope();

drop trigger if exists trg_recruitment_ranking_entries_updated_at on public.recruitment_ranking_entries;
create trigger trg_recruitment_ranking_entries_updated_at
before update on public.recruitment_ranking_entries
for each row execute function public.set_updated_at();

drop trigger if exists trg_recruitment_recommendations_updated_at on public.recruitment_appointment_recommendations;
create trigger trg_recruitment_recommendations_updated_at
before update on public.recruitment_appointment_recommendations
for each row execute function public.set_updated_at();

alter table public.recruitment_ranking_entries enable row level security;
alter table public.recruitment_appointment_recommendations enable row level security;

drop policy if exists recruitment_ranking_entries_scoped_select on public.recruitment_ranking_entries;
create policy recruitment_ranking_entries_scoped_select
on public.recruitment_ranking_entries
for select
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
  or public.has_active_role('office_unit_head', campus_id)
);

drop policy if exists recruitment_ranking_entries_scoped_write on public.recruitment_ranking_entries;
create policy recruitment_ranking_entries_scoped_write
on public.recruitment_ranking_entries
for all
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

drop policy if exists recruitment_recommendations_scoped_select on public.recruitment_appointment_recommendations;
create policy recruitment_recommendations_scoped_select
on public.recruitment_appointment_recommendations
for select
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
  or public.has_active_role('office_unit_head', campus_id)
);

drop policy if exists recruitment_recommendations_scoped_write on public.recruitment_appointment_recommendations;
create policy recruitment_recommendations_scoped_write
on public.recruitment_appointment_recommendations
for all
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
