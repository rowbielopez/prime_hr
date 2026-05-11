begin;

do $$ begin
  create type public.vacancy_status as enum ('draft', 'open', 'for_review', 'filled', 'closed', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.recruitment_vacancies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text null,
  qualification_notes text null,
  plantilla_item_no text null,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  employment_type text null,
  item_count integer not null default 1 check (item_count > 0),
  status public.vacancy_status not null default 'draft',
  posted_at date null,
  closing_at date null,
  remarks text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists idx_recruitment_vacancies_campus_id on public.recruitment_vacancies(campus_id);
create index if not exists idx_recruitment_vacancies_office_id on public.recruitment_vacancies(office_id);
create index if not exists idx_recruitment_vacancies_status on public.recruitment_vacancies(status);
create index if not exists idx_recruitment_vacancies_updated_at on public.recruitment_vacancies(updated_at desc);

drop trigger if exists trg_recruitment_vacancies_updated_at on public.recruitment_vacancies;
create trigger trg_recruitment_vacancies_updated_at
before update on public.recruitment_vacancies
for each row execute function public.set_updated_at();

create or replace function public.validate_vacancy_office_scope()
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
    raise exception 'vacancy office_id campus must match vacancy campus_id';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_recruitment_vacancies_validate_office_scope on public.recruitment_vacancies;
create trigger trg_recruitment_vacancies_validate_office_scope
before insert or update on public.recruitment_vacancies
for each row execute function public.validate_vacancy_office_scope();

alter table public.recruitment_vacancies enable row level security;

drop policy if exists recruitment_vacancies_scoped_select on public.recruitment_vacancies;
create policy recruitment_vacancies_scoped_select
on public.recruitment_vacancies
for select
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
  or public.has_active_role('office_unit_head', campus_id)
  or public.has_active_role('committee_member', campus_id)
);

drop policy if exists recruitment_vacancies_scoped_insert on public.recruitment_vacancies;
create policy recruitment_vacancies_scoped_insert
on public.recruitment_vacancies
for insert
to authenticated
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
);

drop policy if exists recruitment_vacancies_scoped_update on public.recruitment_vacancies;
create policy recruitment_vacancies_scoped_update
on public.recruitment_vacancies
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
